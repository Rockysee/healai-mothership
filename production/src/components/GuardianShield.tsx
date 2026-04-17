'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Eye, Heart, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import useAegis from '../hooks/useAegis';
import useRetinaIntelligence from '../hooks/useRetinaIntelligence';

interface MoodCheck {
  id: string;
  timestamp: string;
  mood: 'focused' | 'anxious' | 'tired' | 'excited';
  score: number;
}

interface AegisAnalysis {
  status?: 'thriving' | 'stable' | 'watch' | 'alert' | 'critical';
  fusion_score?: number;
  active_alerts?: AegisAlert[];
}

interface AegisAlert {
  alert_id: string;
  timestamp?: string;
  title?: string;
  category?: string;
  severity?: 'info' | 'nudge' | 'watch' | 'alert' | 'critical';
  child_message?: string;
  parent_message?: string;
  resolved?: boolean;
  acknowledged_by_child?: boolean;
  acknowledged_by_parent?: boolean;
}

interface WeeklyDay {
  date: string;
  screen_minutes: number;
  learning: number;
  gaming: number;
  social: number;
  creative: number;
}

interface WeeklySummary {
  days?: WeeklyDay[];
}

interface ParentalShare {
  transparency_note?: string;
  focus_profile?: {
    avg_focus?: number;
    total_snapshots?: number;
  } | null;
  profanity?: {
    total?: number;
    recent?: Array<{ severity?: string; platform?: string; timestamp?: string }>;
  };
}

function mapAegisMood(mood: string): MoodCheck['mood'] {
  if (mood === 'joy') return 'excited';
  if (mood === 'distress' || mood === 'frustration') return 'anxious';
  if (mood === 'fatigue' || mood === 'boredom') return 'tired';
  return 'focused';
}

function mapShieldStatus(status: AegisAnalysis['status']): 'safe' | 'alert' | 'distress' {
  if (status === 'critical' || status === 'alert') return 'distress';
  if (status === 'watch') return 'alert';
  return 'safe';
}

function scoreFromMood(mood: string): number {
  if (mood === 'joy') return 90;
  if (mood === 'distress' || mood === 'frustration') return 45;
  if (mood === 'fatigue' || mood === 'boredom') return 60;
  return 82;
}

function formatTime(iso?: string): string {
  if (!iso) return '--';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const EMPTY_ALERT: AegisAlert = {
  alert_id: 'none',
  timestamp: new Date().toISOString(),
  title: 'No active alerts',
  category: 'guardian',
  severity: 'info',
};

export default function GuardianShield() {
  const userId = 'default';
  const aegis = useAegis(userId);
  const [retinaEnabled, setRetinaEnabled] = useState(false);
  const retina = useRetinaIntelligence(retinaEnabled);

  const [moods, setMoods] = useState<MoodCheck[]>([]);
  const [dailyFlags, setDailyFlags] = useState<AegisAlert[]>([]);
  const [analysis, setAnalysis] = useState<AegisAnalysis | null>(null);
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null);
  const [parentalShare, setParentalShare] = useState<ParentalShare | null>(null);
  const [isAcknowledging, setIsAcknowledging] = useState<string | null>(null);
  const [status, setStatus] = useState<'safe' | 'alert' | 'distress'>('safe');
  const [lastSync, setLastSync] = useState<string>('Waiting for first sync...');

  const refreshAnalysis = React.useCallback(async () => {
    const [analysisRes, alertRes, moodRes, weeklyRes, shareRes] = await Promise.all([
      aegis.getFullAnalysis(),
      aegis.getAlerts({ unresolvedOnly: true }),
      aegis.getMoodTimeline(24),
      aegis.getWeeklySummary(),
      aegis.getParentalShare(),
    ]);

    const typedAnalysis = (analysisRes || {}) as AegisAnalysis;
    setAnalysis(typedAnalysis);
    setStatus(mapShieldStatus(typedAnalysis.status));

    const typedAlerts = (alertRes || []) as AegisAlert[];
    setDailyFlags(typedAlerts.slice(-7).reverse());
    setWeeklySummary((weeklyRes || {}) as WeeklySummary);
    setParentalShare((shareRes || {}) as ParentalShare);

    const moodRows = ((moodRes || []) as Array<{ timestamp: string; dominant_mood: string }>).slice(-5).map((r, i) => ({
      id: `${i}-${r.timestamp}`,
      timestamp: r.timestamp,
      mood: mapAegisMood(r.dominant_mood),
      score: scoreFromMood(r.dominant_mood),
    }));

    if (moodRows.length) {
      setMoods(moodRows);
    }

    setLastSync(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  }, [aegis]);

  useEffect(() => {
    refreshAnalysis();
    const timer = setInterval(refreshAnalysis, 30000);
    return () => clearInterval(timer);
  }, [refreshAnalysis]);

  useEffect(() => {
    // Push retina focus and facial signals to AEGIS every 30s.
    if (!retina.isActive) return;

    const loop = setInterval(() => {
      if (retina.currentFocus) {
        aegis.recordFocus(
          retina.currentFocus.focusDepth,
          retina.currentFocus.attentionIntensity,
          retina.currentFocus.gazeOnScreenPct,
          retina.blinkRate,
          retina.currentFocus.headTiltDeg,
          Math.round(retina.getSessionDuration()),
          'healai_app'
        );
      }

      if (retina.currentEmotions) {
        aegis.recordFacialExpression({
          ...retina.currentEmotions,
          confidence: 0.75,
          sessionApp: 'healai_app',
        });
      }
    }, 30000);

    return () => clearInterval(loop);
  }, [retina.isActive, retina.currentFocus, retina.currentEmotions, retina.blinkRate, retina, aegis]);

  const acknowledge = async (alertId: string, by: 'child' | 'parent') => {
    setIsAcknowledging(`${alertId}-${by}`);
    await aegis.acknowledgeAlert(alertId, by);
    await refreshAnalysis();
    setIsAcknowledging(null);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto p-4">
      {/* Header with Watchdog Pulse */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/5 p-8 rounded-[2.5rem] border border-white/10 backdrop-blur-3xl shadow-2xl">
        <div className="space-y-1">
          <h2 className="text-4xl font-black flex items-center gap-3 tracking-tighter italic">
            <Shield className="w-10 h-10 text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.4)]" />
            GUARDIAN SHIELD
          </h2>
          <p className="text-emerald-400 font-bold uppercase tracking-[0.3em] text-[10px]">Digital Bodyguard & Vibe Monitor</p>
        </div>
        
        <div className="flex flex-col items-end gap-2 text-right">
          <button
            onClick={() => setRetinaEnabled((v) => !v)}
            className={`px-4 py-2 rounded-xl border text-[10px] uppercase font-black tracking-widest transition-all flex items-center gap-2 ${
              retinaEnabled ? 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10' : 'text-white/70 border-white/20 bg-white/5'
            }`}
          >
            <Eye className="w-3 h-3" />
            Retina {retinaEnabled ? 'On' : 'Off'}
          </button>
          <div className={`px-6 py-3 rounded-2xl border-2 font-black text-sm uppercase tracking-widest flex items-center gap-3 shadow-xl ${
            status === 'safe' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5' :
            status === 'alert' ? 'text-amber-400 border-amber-500/30 bg-amber-500/5' :
            'text-rose-400 border-rose-500/30 bg-rose-500/5'
          }`}>
            <motion.div 
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className={`w-3 h-3 rounded-full ${status === 'safe' ? 'bg-emerald-500' : status === 'alert' ? 'bg-amber-500' : 'bg-rose-500'}`}
            />
            WATCHDOG: {status === 'safe' ? 'ON GOD (SAFE)' : status === 'alert' ? 'NO CAP (ALERT)' : 'SOS TRIGGER'}
          </div>
          <p className="text-[10px] text-white/30 uppercase font-black tracking-tighter leading-none">Last sync: {lastSync}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Pictorial Mood Robot (Extraordinary UX) */}
        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] relative overflow-hidden group shadow-xl"
        >
          <div className="relative z-10 flex flex-col items-center text-center">
            <motion.div 
              animate={status === 'safe' ? { rotate: [0, 5, -5, 0] } : { y: [0, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="text-8xl mb-6 grayscale group-hover:grayscale-0 transition-all duration-500"
            >
              {status === 'safe' ? '🤖' : '🦾'}
            </motion.div>
            <h3 className="text-xl font-black mb-2 tracking-tight">MOOD ROBOT</h3>
            <p className="text-sm text-white/40 mb-6 uppercase font-bold tracking-widest italic">"Your brain's bestie"</p>

            {moods.length > 0 && (
              <p className="text-[10px] text-white/40 mb-4 uppercase tracking-widest font-black">
                Latest mood: {moods[moods.length - 1].mood} · score {moods[moods.length - 1].score}
              </p>
            )}
            
            <div className={`w-full py-4 rounded-2xl border-2 font-black text-xs uppercase tracking-widest ${
              status === 'safe' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}>
              {status === 'safe' ? 'Slaying & Focused' : 'Needs a Break, Bestie'}
            </div>
          </div>
          <div className="absolute top-0 right-0 p-6 opacity-20"><Heart className="w-12 h-12 text-rose-500" /></div>
        </motion.div>

        {/* Daily Flag Analysis (New Requirement) */}
        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] shadow-xl md:col-span-1 lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-black italic flex items-center gap-3 tracking-tighter">
              <TrendingUp className="w-6 h-6 text-indigo-400" />
              DAILY FLAG ANALYSIS
            </h3>
            <div className="text-[10px] font-black uppercase tracking-widest text-white/20">7-Day Distress Window</div>
          </div>
          
          <div className="space-y-4">
            {(dailyFlags.length ? dailyFlags : [EMPTY_ALERT]).map((f, i) => (
              <div key={i} className="p-5 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-5">
                    <div className="text-white/20 font-mono text-[10px]">{formatTime(f.timestamp)}</div>
                    <div>
                      <div className="text-sm font-black text-white leading-none mb-1">{f.title || 'Alert'}</div>
                      <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{f.category || 'general'}</div>
                    </div>
                  </div>
                  <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] px-3 py-1 bg-indigo-500/10 rounded-lg">{f.severity || 'info'}</div>
                </div>

                {f.alert_id !== 'none' && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => acknowledge(f.alert_id, 'child')}
                      disabled={!!f.acknowledged_by_child || isAcknowledging === `${f.alert_id}-child`}
                      className="px-3 py-2 text-[10px] uppercase font-black tracking-widest rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 disabled:opacity-50"
                    >
                      Child Ack
                    </button>
                    <button
                      onClick={() => acknowledge(f.alert_id, 'parent')}
                      disabled={!!f.acknowledged_by_parent || isAcknowledging === `${f.alert_id}-parent`}
                      className="px-3 py-2 text-[10px] uppercase font-black tracking-widest rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-300 disabled:opacity-50"
                    >
                      Parent Ack
                    </button>
                    {f.acknowledged_by_child && f.acknowledged_by_parent && (
                      <span className="text-[10px] uppercase font-black tracking-widest text-emerald-300 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Resolved
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          whileHover={{ y: -5 }}
          className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] shadow-xl"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-black italic flex items-center gap-3 tracking-tighter">
              <TrendingUp className="w-6 h-6 text-cyan-300" />
              WEEKLY SUMMARY
            </h3>
            <div className="text-[10px] uppercase tracking-widest font-black text-white/30">7 Days</div>
          </div>

          <div className="space-y-3">
            {(weeklySummary?.days || []).slice(-3).reverse().map((d) => (
              <div key={d.date} className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black uppercase tracking-widest text-white/70">{d.date}</span>
                  <span className="text-xs font-black text-cyan-300">{d.screen_minutes} min</span>
                </div>
                <div className="text-[10px] uppercase tracking-widest text-white/40">
                  Learn {d.learning} · Social {d.social} · Game {d.gaming} · Creative {d.creative}
                </div>
              </div>
            ))}
            {!weeklySummary?.days?.length && (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-[11px] text-white/50 uppercase tracking-widest font-black">
                Weekly data will appear after tracked activity.
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -5 }}
          className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] shadow-xl"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-black italic flex items-center gap-3 tracking-tighter">
              <Shield className="w-6 h-6 text-emerald-300" />
              PARENTAL SHARE
            </h3>
            <div className="text-[10px] uppercase tracking-widest font-black text-white/30">Transparent View</div>
          </div>

          <p className="text-xs text-white/60 leading-relaxed mb-4">
            {parentalShare?.transparency_note || 'Parent and child see the same guardian insights.'}
          </p>

          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs">
              <div className="text-white/40 uppercase font-black tracking-widest text-[10px] mb-1">Focus Profile</div>
              <div className="text-white/80 font-semibold">
                Avg focus: {parentalShare?.focus_profile?.avg_focus != null ? parentalShare.focus_profile.avg_focus.toFixed(2) : '--'}
                {' '}· snapshots: {parentalShare?.focus_profile?.total_snapshots ?? 0}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs">
              <div className="text-white/40 uppercase font-black tracking-widest text-[10px] mb-1">Language Safety</div>
              <div className="text-white/80 font-semibold">
                Total flagged events: {parentalShare?.profanity?.total ?? 0}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* SOS & Photo Sharing Safety (New Requirement) */}
      <div className="bg-rose-500/5 border border-rose-500/10 rounded-[2.5rem] p-10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent" />
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10 relative z-10">
          <div className="space-y-4">
            <h3 className="text-3xl font-black italic flex items-center gap-4 tracking-tighter text-rose-400">
              <AlertTriangle className="w-8 h-8" />
              SOS SAFETY SHIELD
            </h3>
            <p className="text-white/60 max-w-xl font-medium text-sm leading-relaxed">
              Monitoring for unauthorized photo sharing and cross-platform risks. 
              <span className="block mt-2 font-bold text-rose-300 uppercase tracking-widest text-[10px]">
                🚨 Photo sharing happens only after parental confirmation on remote devices.
              </span>
            </p>
          </div>
          
          <div className="flex gap-4 w-full lg:w-auto">
            <button className="flex-1 lg:flex-none px-8 py-5 bg-rose-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-rose-900/30 hover:bg-rose-700 active:scale-95 transition-all">
              Request Confirmation
            </button>
            <button className="flex-1 lg:flex-none px-8 py-5 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-white/10 transition-all">
              Security Logs
            </button>
          </div>
        </div>
        
        {/* Apple Style visual flair */}
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-rose-500/10 blur-[60px] rounded-full pointer-events-none" />
      </div>
    </div>
  );
}
