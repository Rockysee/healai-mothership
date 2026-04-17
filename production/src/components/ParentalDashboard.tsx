'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, Users, BookOpen, Clock, BarChart2, Bell } from 'lucide-react';

export default function ParentalDashboard() {
  const stats = [
    { label: 'Today\'s Focus', value: '4.2 hrs', icon: Clock, color: 'text-indigo-400' },
    { label: 'Syllabus Progress', value: '68%', icon: BookOpen, color: 'text-emerald-400' },
    { label: 'Mood Stability', value: 'High', icon: BarChart2, color: 'text-amber-400' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-indigo-400" />
            Intelligence Dashboard
          </h2>
          <p className="text-slate-400 text-sm">Parental Control & Cross-Silo Analytics</p>
        </div>
        <button className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Settings
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl flex items-center gap-4"
          >
            <div className={`p-3 rounded-xl bg-slate-800/50 ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block">{stat.label}</span>
              <span className="text-xl font-bold text-slate-200">{stat.value}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Learning Journey Timeline */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            Learning Journey (24h)
          </h3>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2" />
                <div className="w-0.5 h-full bg-slate-800 mt-2" />
              </div>
              <div className="pb-4">
                <span className="text-[10px] text-slate-500 font-mono">10:15 AM</span>
                <p className="text-sm text-slate-200 font-medium">Completed ICSE Biology: Cell Structure</p>
                <div className="mt-2 flex gap-2">
                  <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20">Silo 3: Framegen</span>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">Quiz: 95%</span>
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-2 h-2 rounded-full bg-amber-500 mt-2" />
                <div className="w-0.5 h-full bg-slate-800 mt-2" />
              </div>
              <div className="pb-4">
                <span className="text-[10px] text-slate-500 font-mono">01:30 PM</span>
                <p className="text-sm text-slate-200 font-medium">High Focus / Flow State Detected</p>
                <div className="mt-2 flex gap-2">
                  <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded border border-amber-500/20">Duration: 45 min</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Intelligence Settings & Overrides */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Parental Controls</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-800/20 rounded-xl border border-slate-700/50">
              <div>
                <span className="text-sm font-medium text-slate-200 block">AI Mentor Autonomy</span>
                <p className="text-[10px] text-slate-500">Allow AI to auto-route curriculum based on interest.</p>
              </div>
              <div className="w-10 h-5 bg-indigo-500 rounded-full relative">
                <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-800/20 rounded-xl border border-slate-700/50">
              <div>
                <span className="text-sm font-medium text-slate-200 block">Crisis Webhook (Make.com)</span>
                <p className="text-[10px] text-slate-500">Escalate critical distress to Tele-MANAS.</p>
              </div>
              <div className="w-10 h-5 bg-emerald-500 rounded-full relative">
                <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
              </div>
            </div>
            <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
              <span className="text-xs text-indigo-400 font-semibold block mb-2">Cross-Silo Recommendation</span>
              <p className="text-xs text-slate-400 italic">"Based on recent Biology interest, I've unlocked a 3D Anatomy module in the Sandbox."</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
