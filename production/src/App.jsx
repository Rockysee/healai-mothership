import { useState, useCallback, useEffect } from "react";
import GamifiedAssessment from "./components/GamifiedAssessment";
import AIMentorChat      from "./components/AIMentorChat";
import VoiceMoodCheck    from "./components/VoiceMoodCheck";
import ResilienceTracker from "./components/ResilienceTracker";
import LongevityOS       from "./components/LongevityOS";
import FramegenStudio    from "./silos/framegen/App";
import GuardianShield    from "./components/GuardianShield";
import ParentalDashboard from "./components/ParentalDashboard";
import FlowStateEngine        from "./components/FlowStateEngine";
import CrisisFloater          from "./components/CrisisFloater";
import FramegenControlRoom    from "./components/FramegenControlRoom";
import ConsciousGuruReport    from "./components/ConsciousGuruReport";

// ═══════════════════════════════════════════════════════════════════════════════
// THE MOTHERSHIP — Main App Shell v2.2
// Tabs: Assess · AI Guru · Voice · Journey · Longevity
// Goldenhour Systems Pvt Ltd · ambulance.run
// ═══════════════════════════════════════════════════════════════════════════════

const NAV_ITEMS = [
  { id: "assessment", label: "Assess",    icon: "🧠" },
  { id: "mentor",     label: "AI Guru",   icon: "🧘" },
  { id: "guardian",   label: "Guardian", icon: "🛡️" },
  { id: "flow",       label: "Flow",     icon: "⚡" },
  { id: "studio",     label: "Control",   icon: "⚙️" },
];

function loadScores() {
  try { return JSON.parse(localStorage.getItem("ms_scores") || "[]"); } catch { return []; }
}

function getUserId() {
  let uid = localStorage.getItem("ms_user_id");
  if (!uid) {
    uid = `user_${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem("ms_user_id", uid);
  }
  return uid;
}

function saveScore(entry) {
  try {
    const prev = loadScores();
    const updated = [...prev, entry].slice(-30);
    localStorage.setItem("ms_scores", JSON.stringify(updated));
    return updated;
  } catch { return []; }
}

async function postLead(archetype, lead) {
  if (!lead?.name || !lead?.whatsapp) return;
  try {
    await fetch("/api/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name:           lead.name,
        whatsapp:       lead.whatsapp,
        archetypeId:    archetype.id,
        archetypeTitle: archetype.title,
        healthScore:    archetype.healthScore ?? 50,
      }),
    });
  } catch { /* non-blocking — lead capture failure must not break the UX */ }
}

export default function App() {
  const [state, setState] = useState({
    view:           'assessment',
    user_id:        getUserId(),
    archetype:      null,
    lead:           null,
    scores:         [],
    isWatchdogActive: false,
    mode:           'gen-z', // 'kids' | 'gen-z' | 'pro'
    mentorView:     'report' // 'report' | 'chat'
  });

  // Load profile on mount
  useEffect(() => {
    async function fetchProfile() {
      try {
        const r = await fetch(`/api/profile/${state.user_id}`);
        if (r.ok) {
          const profile = await r.json();
          setState(s => ({ ...s, archetype: profile.archetype, lead: profile.lead }));
        }
      } catch {}
    }
    fetchProfile();
  }, [state.user_id]);

  const navigate = useCallback((view) => {
    setState((s) => ({ ...s, view, mentorView: 'report' }));
  }, []);

  // Assessment complete → save score, fire lead webhook, auto-nav to suggested view
  const onAssessmentComplete = useCallback((archetype, lead) => {
    const updated = saveScore({
      ts:             Date.now(),
      score:          archetype.healthScore ?? 50,
      archetypeId:    archetype.id,
      archetypeTitle: archetype.title,
    });
    setState((s) => ({ ...s, archetype, lead, scores: updated }));
    postLead(archetype, lead); // fire-and-forget
    
    // Save to profile persistence
    fetch(`/api/profile?user_id=${state.user_id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archetype, lead, last_assessed: Date.now() })
    });

    // Auto-navigate to suggested view (Guardian, Flow, or default to AI Guru)
    const targetView = archetype.view || "mentor";
    setTimeout(() => setState((s) => ({ ...s, view: targetView })), 500);
  }, [state.user_id]);

  // Voice check-in → append score to journey
  const onVoiceScore = useCallback((stressScore) => {
    const updated = saveScore({
      ts:             Date.now(),
      score:          Math.round((1 - stressScore) * 100),
      archetypeId:    "VOICE",
      archetypeTitle: "Voice Check-in",
    });
    setState((s) => ({ ...s, scores: updated }));
  }, []);

  return (
    <div className="min-h-screen bg-[#020205] text-white font-['Inter'] relative overflow-hidden">
      {/* Conscious Guru Ambient Layer (Apple Style) */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <motion.div 
          animate={{ 
            opacity: [0.05, 0.12, 0.05],
            scale: [1, 1.2, 1],
            x: [0, 20, 0],
            y: [0, -30, 0]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 w-[60vw] h-[60vh] bg-emerald-500/20 blur-[140px] rounded-full"
        />
        <motion.div 
          animate={{ 
            opacity: [0.03, 0.09, 0.03],
            scale: [1.3, 1, 1.3],
            x: [0, -40, 0],
            y: [0, 50, 0]
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-1/4 right-1/4 w-[70vw] h-[70vh] bg-blue-500/15 blur-[160px] rounded-full"
        />
        <motion.div 
          animate={{ 
            opacity: [0, 0.05, 0],
            scale: [0.8, 1.1, 0.8]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-tr from-purple-500/5 to-transparent blur-[100px]"
        />
      </div>

      {/* ── Bottom Navigation ──────────────────────────────────────── */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-2xl glass-panel rounded-3xl p-1.5 shadow-2xl">
        <div className="flex justify-around items-center">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={`relative flex-1 py-3.5 flex flex-col items-center gap-1.5 transition-all duration-300 rounded-2xl ${
                state.view === item.id
                  ? "text-white bg-white/5 shadow-inner"
                  : "text-white/30 hover:text-white/50"
              }`}
            >
              <span className={`text-xl transition-transform duration-300 ${state.view === item.id ? "scale-110" : ""}`}>{item.icon}</span>
              <span className="text-[8px] font-mono tracking-[0.15em] uppercase font-bold">{item.label}</span>
              {state.view === item.id && (
                <span className="absolute -bottom-1 w-1 h-1 bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Views ───────────────────────────────────────────────────── */}
      <div className="pb-24">
        {state.view === "assessment" && (
          <GamifiedAssessment onComplete={onAssessmentComplete} />
        )}
        {state.view === "mentor" && (
          state.mentorView === 'report' ? (
            <ConsciousGuruReport 
              scores={state.scores} 
              onStartChat={() => setState(s => ({ ...s, mentorView: 'chat' }))} 
            />
          ) : (
            <div className="relative">
              <button 
                onClick={() => setState(s => ({ ...s, mentorView: 'report' }))}
                className="fixed top-8 left-8 z-[60] px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-xs font-black uppercase tracking-widest backdrop-blur-xl transition-all"
              >
                ← Back to Report
              </button>
              <AIMentorChat 
                archetype={state.archetype} 
                lead={state.lead} 
                userId={state.user_id} 
              />
            </div>
          )
        )}
        {state.view === "guardian" && (
          <GuardianShield />
        )}
        {state.view === "flow" && (
          <FlowStateEngine />
        )}
        {state.view === "longevity" && (
          <LongevityOS />
        )}
        {state.view === "studio" && (
          <FramegenControlRoom />
        )}
      </div>

      {/* Global Emergency Floater (MedPod Crisis Shield) */}
      <CrisisFloater />
    </div>
  );
}
