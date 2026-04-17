import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Play, Image, Palette, ShieldCheck, Zap } from 'lucide-react';

export default function FramegenControlRoom() {
  const [activeTheme, setActiveTheme] = useState('Anime (High Quality)');
  const [generationMode, setGenerationMode] = useState('Safe Mode');

  const themes = [
    { name: 'Anime (High Quality)', icon: '🌸', color: 'bg-pink-500' },
    { name: 'Cyberpunk', icon: '🌃', color: 'bg-purple-500' },
    { name: 'Modern Minimal', icon: '⚪', color: 'bg-slate-400' },
    { name: 'Watercolor', icon: '🎨', color: 'bg-blue-400' }
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <header className="flex items-center justify-between mb-12">
        <div className="space-y-1">
          <h2 className="text-4xl font-black italic tracking-tighter flex items-center gap-4">
            <Settings className="w-10 h-10 text-indigo-400" />
            CONTROL ROOM
          </h2>
          <p className="text-indigo-400 font-bold uppercase tracking-[0.3em] text-[10px]">Framegen Pipeline Management · V.1.0</p>
        </div>
        
        <div className="flex items-center gap-4">
          <button className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-900/30 hover:bg-indigo-700 transition-all">
            Deploy Changes
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Theme Selector */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white/5 border border-white/10 p-8 rounded-[3rem] backdrop-blur-3xl">
            <h3 className="text-xl font-black mb-8 flex items-center gap-3">
              <Palette className="w-6 h-6 text-pink-400" />
              VISUAL THEME ENGINE
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              {themes.map((theme) => (
                <button
                  key={theme.name}
                  onClick={() => setActiveTheme(theme.name)}
                  className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-start gap-4 ${
                    activeTheme === theme.name 
                      ? "bg-white/10 border-indigo-500 shadow-2xl" 
                      : "bg-white/5 border-white/5 hover:border-white/20"
                  }`}
                >
                  <span className="text-4xl">{theme.icon}</span>
                  <div>
                    <span className="text-sm font-black text-white block">{theme.name}</span>
                    <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Active Visual Style</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-8 rounded-[3rem] backdrop-blur-3xl">
            <h3 className="text-xl font-black mb-8 flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              CONTENT GUARDRAILS
            </h3>
            
            <div className="space-y-4">
              {[
                { label: 'Deepfake Prevention', status: 'Active', color: 'emerald' },
                { label: 'Inappropriate Content Filtering', status: 'Active', color: 'emerald' },
                { label: 'Parental Approval for Storyboards', status: 'Required', color: 'amber' }
              ].map((guard, i) => (
                <div key={i} className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/10">
                  <span className="text-sm font-black text-white/80">{guard.label}</span>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-${guard.color}-500/10 text-${guard.color}-400 rounded-lg border border-${guard.color}-500/20`}>
                    {guard.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Status Radar */}
        <div className="space-y-6">
          <div className="bg-indigo-600/10 border border-indigo-500/20 p-8 rounded-[3rem] backdrop-blur-3xl relative overflow-hidden">
            <h3 className="text-xl font-black mb-6 text-indigo-400">PIPELINE STATUS</h3>
            <div className="space-y-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Play className="w-6 h-6 fill-current" />
                </div>
                <div>
                  <span className="text-xs font-black text-white block">Awaiting Ingestion</span>
                  <span className="text-[10px] text-white/40 uppercase font-black tracking-widest">1,000 Storyboards</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/40">
                  <span>Sync Progress</span>
                  <span>42%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    animate={{ width: '42%' }}
                    className="h-full bg-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <p className="text-[10px] text-white/40 italic leading-relaxed">
                  * Automatic updates occur every 24 hours. Manual sync can be triggered from the terminal.
                </p>
              </div>
            </div>
            
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-500/10 blur-[60px] rounded-full" />
          </div>

          <button className="w-full p-8 bg-white/5 border border-white/10 rounded-[3rem] hover:bg-white/10 transition-all flex flex-col items-center text-center group">
            <Zap className="w-10 h-10 text-amber-400 mb-4 group-hover:scale-110 transition-transform" />
            <h4 className="text-sm font-black text-white mb-2 uppercase tracking-widest">Trigger Manual Update</h4>
            <p className="text-[10px] text-white/40 font-medium">Clear cache and re-ingest all storyboards from source logs.</p>
          </button>
        </div>
      </div>
    </div>
  );
}
