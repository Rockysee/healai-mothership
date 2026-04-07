import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Star, TrendingUp, Sparkles, MessageSquare } from 'lucide-react';

export default function ConsciousGuruReport({ scores = [] }) {
  // Mock analysis result
  const analysis = {
    eq: 82,
    iq: 145,
    style: "Visionary Leader",
    archetype: "The Navigator",
    triggers: ["Deep focus", "Creative blocks", "Visual learning"],
    slang: "Big W",
    vibe: "Sigma"
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-12">
      {/* Anime Intro Section */}
      <section className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-white/10 rounded-[3rem] p-10 backdrop-blur-3xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
          <motion.div 
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 5, repeat: Infinity }}
            className="w-48 h-48 bg-white/10 rounded-full flex items-center justify-center text-8xl shadow-2xl"
          >
            🦊
          </motion.div>
          <div className="flex-1 space-y-4">
            <h2 className="text-4xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-white/40">
              "YOU ARE THE MAIN CHARACTER"
            </h2>
            <p className="text-white/60 text-lg font-medium leading-relaxed uppercase tracking-wider">
              Your data has evolved. I am Gen-AI Fox, your digital twin. We just leveled up together. 
              <span className="block mt-2 text-emerald-400 font-black tracking-[0.2em] text-xs">STATUS: NO CAP SLAYING</span>
            </p>
          </div>
        </div>
        <div className="absolute top-0 right-0 p-8 opacity-10"><Brain className="w-32 h-32" /></div>
      </section>

      {/* Pictorial Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white/5 border border-white/10 p-8 rounded-[3rem] shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black italic flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
              EQ / IQ RADIAR
            </h3>
            <span className="text-[10px] text-white/20 font-black uppercase tracking-widest leading-none text-right">Corporate Grade<br/>Assessment</span>
          </div>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-black uppercase tracking-widest text-white/60">
                <span>Emotional Intelligence (EQ)</span>
                <span>{analysis.eq}%</span>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden p-0.5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${analysis.eq}%` }}
                  className="h-full bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/50"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-black uppercase tracking-widest text-white/60">
                <span>Problem Solving (IQ)</span>
                <span>{analysis.iq}</span>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden p-0.5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '90%' }}
                  className="h-full bg-blue-500 rounded-full shadow-lg shadow-blue-500/50"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 p-8 rounded-[3rem] shadow-xl flex flex-col items-center justify-center text-center group">
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl flex items-center justify-center text-4xl shadow-2xl mb-6"
          >
            👑
          </motion.div>
          <h3 className="text-2xl font-black text-white italic tracking-tighter mb-2">{analysis.style}</h3>
          <p className="text-xs text-white/40 font-bold uppercase tracking-[0.2em] mb-6">Your Leadership Style</p>
          <div className="px-6 py-2 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-amber-400">
            Big W Energy
          </div>
        </div>
      </div>

      {/* Trigger Word Analysis */}
      <section className="bg-white/5 border border-white/10 rounded-[3rem] p-10">
        <div className="flex items-center gap-4 mb-10">
          <Sparkles className="w-8 h-8 text-purple-400" />
          <h3 className="text-2xl font-black italic tracking-tighter">TRIGGER WORD CLOUD</h3>
        </div>
        
        <div className="flex flex-wrap gap-4">
          {analysis.triggers.map((trigger, i) => (
            <div key={i} className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-indigo-500/20 hover:border-indigo-500/30 transition-all cursor-default group">
              <span className="text-sm font-black text-white group-hover:text-indigo-400 transition-colors uppercase tracking-widest">{trigger}</span>
            </div>
          ))}
          <div className="px-8 py-4 bg-white/10 rounded-2xl border border-white/20">
            <span className="text-sm font-black text-white uppercase tracking-widest animate-pulse">Analyzing...</span>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <div className="flex justify-center pt-8">
        <button 
          onClick={onStartChat}
          className="px-12 py-6 bg-white text-black rounded-[2rem] font-black uppercase tracking-[0.2em] text-sm shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4"
        >
          <MessageSquare className="w-5 h-5" />
          CHAT WITH GEN-AI FOX
        </button>
      </div>
    </div>
  );
}
