"use client";

import { useState, useCallback, useEffect } from "react";
import { 
  Dna, 
  Brain, 
  Mic, 
  TrendingUp, 
  ShieldCheck, 
  Clapperboard 
} from "lucide-react";

import GamifiedAssessment from "@/components/GamifiedAssessment";
import AIMentorChat      from "@/components/AIMentorChat";
import VoiceMoodCheck    from "@/components/VoiceMoodCheck";
import ResilienceTracker from "@/components/ResilienceTracker";
import LongevityOS       from "@/components/LongevityOS";
import GuardianShield     from "@/components/GuardianShield";
import ParentalDashboard  from "@/components/ParentalDashboard";
import FramegenStudio    from "@/silos/framegen/App";

// ═══════════════════════════════════════════════════════════════════════════════
// THE MOTHERSHIP — Main App Shell v3.0 (Next.js Edition)
// ═══════════════════════════════════════════════════════════════════════════════

const NAV_ITEMS = [
  { id: "assess",    label: "Assess",    icon: Dna },
  { id: "mentor",    label: "AI Guru",   icon: Brain },
  { id: "voice",     label: "Voice",     icon: Mic },
  { id: "dashboard", label: "Journey",   icon: TrendingUp },
  { id: "guardian",  label: "Guardian",  icon: ShieldCheck },
  { id: "longevity", label: "Protocol",  icon: Dna },
  { id: "studio",    label: "Studio",    icon: Clapperboard },
];

function loadScores() {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem("ms_scores") || "[]"); } catch { return []; }
}

function getUserId() {
  if (typeof window === "undefined") return "";
  let uid = localStorage.getItem("ms_user_id");
  if (!uid) {
    uid = `user_${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem("ms_user_id", uid);
  }
  return uid;
}

function saveScore(entry: any) {
  try {
    const prev = loadScores();
    const updated = [...prev, entry].slice(-30);
    localStorage.setItem("ms_scores", JSON.stringify(updated));
    return updated;
  } catch { return []; }
}

async function postLead(archetype: any, lead: any) {
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
  } catch { /* non-blocking */ }
}

export default function MothershipPage() {
  const [state, setState] = useState({
    view:      "assess",
    user_id:   "",
    archetype: null as any,
    lead:      null as any,
    scores:    [] as any,
  });

  // Init state from localstorage
  useEffect(() => {
    setState(s => ({
      ...s,
      user_id: getUserId(),
      scores: loadScores(),
    }));
  }, []);

  // Load profile on mount
  useEffect(() => {
    if (!state.user_id) return;
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

  const navigate = useCallback((view: string) => {
    setState((s) => ({ ...s, view }));
  }, []);

  const onAssessmentComplete = useCallback((archetype: any, lead: any) => {
    const updated = saveScore({
      ts:             Date.now(),
      score:          archetype.healthScore ?? 50,
      archetypeId:    archetype.id,
      archetypeTitle: archetype.title,
    });
    setState((s) => ({ ...s, archetype, lead, scores: updated }));
    postLead(archetype, lead);
    
    fetch(`/api/profile?user_id=${state.user_id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archetype, lead, last_assessed: Date.now() })
    });

    setTimeout(() => setState((s) => ({ ...s, view: "mentor" })), 500);
  }, [state.user_id]);

  const onVoiceScore = useCallback((stressScore: number) => {
    const updated = saveScore({
      ts:             Date.now(),
      score:          Math.round((1 - stressScore) * 100),
      archetypeId:    "VOICE",
      archetypeTitle: "Voice Check-in",
    });
    setState((s) => ({ ...s, scores: updated }));
  }, []);

  return (
    <main className="min-h-screen bg-[#020205] text-white font-sans relative overflow-hidden selection:bg-emerald-500/30">
      {/* Decorative Aurora Glows */}
      <div className="fixed -top-24 -left-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] animate-pulse-glow pointer-events-none" />
      <div className="fixed top-1/2 -right-24 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] animate-pulse-glow pointer-events-none" style={{ animationDelay: '2s' }} />

      {/* ── Bottom Navigation ──────────────────────────────────────── */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-2xl glass-panel rounded-3xl p-1.5 shadow-2xl border-white/5">
        <div className="flex justify-around items-center">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = state.view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={`relative flex-1 py-3 flex flex-col items-center gap-1 transition-all duration-300 rounded-2xl ${
                  active
                    ? "text-emerald-400 bg-white/5 shadow-inner"
                    : "text-white/30 hover:text-white/50"
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform duration-300 ${active ? "scale-110" : ""}`} />
                <span className="text-[9px] font-mono tracking-[0.1em] uppercase font-bold">{item.label}</span>
                {active && (
                  <span className="absolute -bottom-1 w-1 h-1 bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── Views ───────────────────────────────────────────────────── */}
      <div className="pb-28">
        {state.view === "assess" && (
          <GamifiedAssessment onComplete={onAssessmentComplete} />
        )}
        {state.view === "mentor" && (
          <AIMentorChat archetype={state.archetype} lead={state.lead} userId={state.user_id} />
        )}
        {state.view === "voice" && (
          <VoiceMoodCheck onScore={onVoiceScore} archetype={state.archetype} />
        )}
        {state.view === "dashboard" && (
          <ResilienceTracker scores={state.scores} archetype={state.archetype} />
        )}
        {state.view === "longevity" && (
          <LongevityOS />
        )}
        {state.view === "guardian" && (
          <div className="p-6 max-w-4xl mx-auto space-y-12">
            <GuardianShield />
            <div className="pt-8 border-t border-slate-800">
              <ParentalDashboard />
            </div>
          </div>
        )}
        {state.view === "studio" && (
          <FramegenStudio />
        )}
      </div>
    </main>
  );
}
