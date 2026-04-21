"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Dna,
  Brain,
  Mic,
  TrendingUp,
  ShieldCheck,
  Heart,
  Activity
} from "lucide-react";

import AssessHub           from "@/components/AssessHub";
import AIMentorChat       from "@/components/AIMentorChat";
import VoiceMoodCheck     from "@/components/VoiceMoodCheck";
import ResilienceTracker  from "@/components/ResilienceTracker";
import GuardianShield     from "@/components/GuardianShield";
import ParentalDashboard  from "@/components/ParentalDashboard";
import LongevityOS        from "@/components/LongevityOS";
import HealthLandingPage  from "@/components/HealthLandingPage";
import SettingsPanel      from "@/components/SettingsPanel";
import MedPodNexus        from "@/components/MedPodNexus";
import EinsteinProvider   from "@/components/EinsteinProvider";
import UyireMark          from "@/components/UyireMark";

// ═══════════════════════════════════════════════════════════════════════════════
// THE MOTHERSHIP — Main App Shell v3.0 (Healthcare + MedPod Edition)
// ═══════════════════════════════════════════════════════════════════════════════

// core = primary healthcare pillars
const NAV_ITEMS = [
  { id: "assess",    label: "assess",   icon: Dna,         core: true  },
  { id: "mentor",    label: "mentor",   icon: Brain,       core: true  },
  { id: "voice",     label: "voice",    icon: Mic,         core: true  },
  { id: "dashboard", label: "dashboard",icon: TrendingUp,  core: true  },
  { id: "guardian",  label: "guardian", icon: ShieldCheck, core: true  },
  { id: "longevity", label: "longevity",icon: Heart,       core: true  },
  { id: "medpod",    label: "medpod",   icon: Activity,    core: true  },
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
  const [assessKey,     setAssessKey]     = useState(0);
  const [showSettings,  setShowSettings]  = useState(false);
  const [state, setState] = useState({
    view:      null as string | null,   // null = loading; resolved in useEffect
    user_id:   "",
    archetype: null as any,
    lead:      null as any,
    scores:    [] as any,
    assessPreset: null as ("resilience" | "clinical" | null),
  });

  // Resolve initial view: first-time visitors see the landing page
  useEffect(() => {
    const visited = localStorage.getItem("healai_visited");
    setState(s => ({
      ...s,
      view:    visited ? "assess" : "home",
      user_id: getUserId(),
      scores:  loadScores(),
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

  // Listen for settings panel navigation events (e.g. "Go to Assessment" from settings)
  useEffect(() => {
    const handler = (e: any) => navigate(e.detail);
    window.addEventListener('healai-navigate', handler);
    return () => window.removeEventListener('healai-navigate', handler);
  }, []);

  const navigate = useCallback((view: string, options?: { assessPreset?: "resilience" | "clinical" | null }) => {
    // Re-tapping the active ASSESS tab resets AssessSection to TestSelectionView
    if (view === "assess") setAssessKey(k => k + 1);
    setState((s) => ({
      ...s,
      view,
      assessPreset: view === "assess" ? (options?.assessPreset ?? s.assessPreset ?? null) : s.assessPreset,
    }));
  }, []);

  const goHome = useCallback(() => {
    setState((s) => ({ ...s, view: "home" }));
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

  // While resolving localStorage on client — render nothing briefly
  if (state.view === null) return null;

  // First-run landing page (full-screen, no nav bar)
  // Settings gear still available so users can configure their profile before starting
  if (state.view === "home") {
    return (
      <>
        <HealthLandingPage
          onBegin={() => {
            localStorage.setItem("healai_visited", "1");
            navigate("assess");
          }}
          onStartCuratedProgram={() => {
            localStorage.setItem("healai_visited", "1");
            navigate("assess", { assessPreset: "resilience" });
          }}
          onEnterZone={(view: string, options?: { assessPreset?: "resilience" | "clinical" | null }) => {
            localStorage.setItem("healai_visited", "1");
            navigate(view, options);
          }}
        />
        {/* Settings gear — overlaid on landing page */}
        {/* Settings gear — 44×44 touch target, safe-area-aware top */}
        <button
          onClick={() => setShowSettings(true)}
          style={{
            position: 'fixed',
            top: 'calc(14px + env(safe-area-inset-top, 0px))',
            right: 'calc(16px + env(safe-area-inset-right, 0px))',
            zIndex: 50,
            pointerEvents: 'all',
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: '18px',
            WebkitTapHighlightColor: 'transparent',
          }}
          title="Settings"
        >⚙️</button>
        {showSettings && (
          <SettingsPanel
            onClose={() => setShowSettings(false)}
            onResetAll={() => setShowSettings(false)}
          />
        )}
      </>
    );
  }

  // Uyire cream surface — unified across every silo.
  // (Earlier this was gated by state.view === 'medpod'; now all pages share
  //  the same brand palette for consistency.)

  return (
    <EinsteinProvider currentView={state.view} onNavigateToMentor={() => navigate("mentor")}>
    <main
      className="uyire-surface min-h-dvh font-sans relative overflow-x-hidden text-[#2a2320] selection:bg-[rgba(46,123,196,0.25)]"
      style={{ background: '#faf6f1' }}
    >
      {/* Aurora decorative glows removed — editorial calm is the brand direction
          (see UYIRE_DESIGN_DIRECTION.md · principle #5 "Generous, not lavish"). */}

      {/* ── Persistent top bar — logo + settings gear ── */}
      <div
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          /* safe-area-inset-top: pushes content below notch / Dynamic Island */
          paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
          paddingBottom: '8px',
          paddingLeft: 'calc(16px + env(safe-area-inset-left, 0px))',
          paddingRight: 'calc(16px + env(safe-area-inset-right, 0px))',
          background: 'linear-gradient(180deg, rgba(250,246,241,0.95) 0%, rgba(250,246,241,0) 100%)',
          pointerEvents: 'none',
        }}
      >
        {/* Uyire wordmark — tap to go home */}
        <button
          onClick={goHome}
          style={{
            display: 'flex', alignItems: 'center', gap: '0',
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '4px 8px 4px 4px',
            borderRadius: '10px',
            pointerEvents: 'all',
            WebkitTapHighlightColor: 'transparent',
          }}
          aria-label="Uyire — go home"
        >
          <UyireMark size={42} variant="full" wordmarkColor="#2a2320" />
        </button>

        {/* Settings gear — 44×44 touch target */}
        <button
          onClick={() => setShowSettings(true)}
          style={{
            pointerEvents: 'all',
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'rgba(42,35,32,0.04)',
            border: '1px solid rgba(42,35,32,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: '18px',
            WebkitTapHighlightColor: 'transparent',
            transition: 'background 0.15s',
            flexShrink: 0,
            color: '#2a2320',
          }}
          title="Settings"
          aria-label="Settings"
        >
          ⚙
        </button>
      </div>

      {/* ── Settings panel (slide-over) ── */}
      {showSettings && (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
          onResetAll={() => {
            setShowSettings(false);
            // Navigate to landing after data clear
            setTimeout(() => setState(s => ({ ...s, view: 'home' })), 400);
          }}
        />
      )}

      {/* ── Bottom Navigation ──────────────────────────────────────── */}
      {/* bottom nav — cream-glass, floats above iOS home indicator. */}
      <nav
        className="fixed left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-2xl rounded-3xl p-1.5"
        style={{
          bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(42,35,32,0.08)',
          boxShadow: '0 8px 32px -12px rgba(42,35,32,0.12), 0 1px 0 rgba(42,35,32,0.04)',
        }}
      >
        <div className="flex justify-around items-center">
          {NAV_ITEMS.map((item) => {
            const Icon  = item.icon;
            const active = state.view === item.id;
            const isCore = (item as any).core !== false;
            const cls = active
              ? "text-[#2e7bc4] bg-[#2e7bc41a] py-3"
              : isCore
                ? "text-[#8a7e70] hover:text-[#2a2320] py-3"
                : "text-[#8a7e7099] hover:text-[#2a2320] py-2";
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={`relative flex-1 flex flex-col items-center gap-0.5 transition-all duration-300 rounded-2xl ${cls}`}
              >
                <Icon className={`transition-transform duration-300 ${
                  active ? "w-5 h-5 scale-110" : isCore ? "w-5 h-5" : "w-4 h-4"
                }`} />
                <span className={`font-mono tracking-[0.09em] uppercase font-bold ${
                  active ? "text-[9px]" : isCore ? "text-[9px]" : "text-[8px]"
                }`}>{item.label}</span>
                {active && (
                  <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-[#d24b3a] shadow-[0_0_10px_rgba(210,75,58,0.8)]" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── Views ───────────────────────────────────────────────────── */}
      <div
        style={{
          paddingTop:    'calc(3.5rem + env(safe-area-inset-top, 0px))',
          paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {state.view === "assess" && (
          <AssessHub
            key={assessKey}
            assessKey={assessKey}
            onComplete={onAssessmentComplete}
            preferredPath={state.assessPreset}
          />
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
        {state.view === "guardian" && (
          <>
            <GuardianShield />
            <ParentalDashboard />
          </>
        )}
        {state.view === "longevity" && (
          <LongevityOS />
        )}
        {state.view === "medpod" && (
          <MedPodNexus />
        )}
      </div>
    </main>
    </EinsteinProvider>
  );
}
