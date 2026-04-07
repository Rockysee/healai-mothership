'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Eye, Heart, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';

interface MoodCheck {
  id: string;
  timestamp: string;
  mood: 'focused' | 'anxious' | 'tired' | 'excited';
  score: number;
}

export default function GuardianShield() {
  const [moods, setMoods] = useState<MoodCheck[]>([]);
  const [status, setStatus] = useState<'safe' | 'alert' | 'distress'>('safe');
  const [isWatchdogActive, setIsWatchdogActive] = useState(true);

  // Mock data for initial view
  useEffect(() => {
    const historicalMoods: MoodCheck[] = [
      { id: '1', timestamp: '2026-03-20T10:00:00Z', mood: 'focused', score: 85 },
      { id: '2', timestamp: '2026-03-21T10:00:00Z', mood: 'excited', score: 90 },
      { id: '3', timestamp: '2026-03-22T10:00:00Z', mood: 'tired', score: 60 },
      { id: '4', timestamp: '2026-03-23T10:00:00Z', mood: 'focused', score: 82 },
      { id: '5', timestamp: '2026-03-24T10:00:00Z', mood: 'anxious', score: 45 },
    ];
    setMoods(historicalMoods);
  }, []);

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
          <p className="text-[10px] text-white/30 uppercase font-black tracking-tighter leading-none">Last sync: 2 min ago</p>
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
            {[
              { time: "10:45 AM", flag: "Screentime Overflow", reason: "Video Games", status: "Nudge Sent" },
              { time: "01:20 PM", flag: "Anxiety Spike", reason: "Math Homework", status: "Flow Suggested" },
              { time: "03:15 PM", flag: "Restricted App", reason: "Social Media", status: "BLOCKED" }
            ].map((f, i) => (
              <div key={i} className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
                <div className="flex items-center gap-5">
                  <div className="text-white/20 font-mono text-[10px]">{f.time}</div>
                  <div>
                    <div className="text-sm font-black text-white leading-none mb-1">{f.flag}</div>
                    <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{f.reason}</div>
                  </div>
                </div>
                <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] px-3 py-1 bg-indigo-500/10 rounded-lg">{f.status}</div>
              </div>
            ))}
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
