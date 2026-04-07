'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, Focus, Thermometer, Wind, Activity } from 'lucide-react';

export default function FlowStateEngine() {
  const [focusScore, setFocusScore] = useState(82);
  const [environmentalStatus, setEnvironmentalStatus] = useState('Optimal');

  const getRating = () => {
    if (focusScore >= 90) return { label: 'EXCELLENT', color: 'text-emerald-400', icon: '🏆', sub: 'You are a Legend!' };
    if (focusScore >= 70) return { label: 'GOOD', color: 'text-blue-400', icon: '✅', sub: 'Keep it 💯' };
    return { label: 'NEEDS ATTENTION', color: 'text-rose-400', icon: '⚠️', sub: 'Take a break, Bestie' };
  };

  const rating = getRating();

  return (
    <div className="space-y-8 max-w-4xl mx-auto p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/5 p-8 rounded-[2.5rem] border border-white/10 backdrop-blur-3xl shadow-2xl">
        <div className="space-y-1">
          <h3 className="text-4xl font-black flex items-center gap-3 tracking-tighter italic text-amber-400">
            <Zap className="w-10 h-10 drop-shadow-[0_0_15px_rgba(251,191,36,0.4)]" />
            FLOW ENABLER
          </h3>
          <p className="text-amber-400/60 font-bold uppercase tracking-[0.3em] text-[10px]">Empowering Your Focus · Silo 3</p>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-[10px] text-white/40 block font-black uppercase tracking-widest mb-1">Current State</span>
            <span className={`text-4xl font-black tracking-tighter ${rating.color}`}>{rating.label}</span>
          </div>
          <div className="w-20 h-20 rounded-full bg-white/5 border-2 border-amber-500/20 flex items-center justify-center relative shadow-inner">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border-4 border-t-amber-500 rounded-full"
            />
            <span className="text-3xl">{rating.icon}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Thermometer, label: "Temp", value: "22.5°C", color: "text-blue-400" },
          { icon: Wind, label: "CO2", value: "450 ppm", color: "text-emerald-400" },
          { icon: Activity, label: "HRV Check", value: "Strong", color: "text-rose-400" },
          { icon: Zap, label: "Brain Power", value: "High Alpha", color: "text-amber-400" }
        ].map((stat, i) => (
          <motion.div 
            key={i}
            whileHover={{ scale: 1.05 }}
            className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-md transition-all hover:bg-white/10"
          >
            <stat.icon className={`w-5 h-5 ${stat.color} mb-3`} />
            <span className="text-[10px] text-white/30 block uppercase font-black tracking-[0.2em] mb-1">{stat.label}</span>
            <span className="text-sm font-black text-white">{stat.value}</span>
          </motion.div>
        ))}
      </div>

      <div className="bg-amber-500/5 border border-amber-500/10 rounded-[3rem] p-10 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row gap-10 items-center">
          <div className="flex-1 space-y-4">
            <h4 className="text-2xl font-black text-amber-400 italic tracking-tighter flex items-center gap-3">
              <Focus className="w-6 h-6" />
              THE GOD MODE PATHWAY
            </h4>
            <p className="text-white/50 text-sm font-medium uppercase tracking-[0.1em] leading-relaxed">
              3 simple steps to lock in and slay your goals. No cap.
            </p>
          </div>
          
          <div className="flex-1 space-y-3 w-full">
            {[
              { id: "01", task: "Take 3 Deep Breaths", status: "Done" },
              { id: "02", task: "Yeet Your Phone (Silence it)", status: "Pending" },
              { id: "03", task: "Hit the One-Tap Start", status: "Locked" }
            ].map((step, i) => (
              <div key={i} className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${
                step.status === 'Done' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-white/5 border-white/10 text-white/60'
              }`}>
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black border ${
                    step.status === 'Done' ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-white/10 text-white/40 border-white/5'
                  }`}>{step.id}</div>
                  <span className="text-sm font-black uppercase tracking-tight">{step.task}</span>
                </div>
                <div className="text-[10px] font-black opacity-50 uppercase tracking-widest">{step.status}</div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Apple Style background glow */}
        <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-br from-amber-500/10 to-transparent pointer-events-none" />
      </div>

      <div className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] backdrop-blur-2xl flex items-start gap-4 shadow-xl">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-2xl">💡</div>
        <div>
          <span className="text-[10px] text-amber-400 font-black uppercase tracking-[0.3em] mb-1 block">Conscious Nudge</span>
          <p className="text-sm text-white/70 font-medium leading-relaxed italic">
            "No cap, your brain is in prime focus mode right now. The environmental CO2 is literal perfection. Slay your task within the next 45 minutes for maximum legend status."
          </p>
        </div>
      </div>
    </div>
  );
}
