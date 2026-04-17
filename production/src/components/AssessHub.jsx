"use client";
import { useState, useCallback, useEffect } from "react";
import GamifiedAssessment from "./GamifiedAssessment";
import PsyTestSuite from "./PsyTestSuite";

// ═══════════════════════════════════════════════════════════════════════════════
// ASSESS HUB — Unified Assessment Navigation
// Shows all available tests as separate cards in the ASSESS tab
// Goldenhour Systems Pvt Ltd
// ═══════════════════════════════════════════════════════════════════════════════

const CLINICAL_TESTS = [
  { id: "GAD7",     name: "GAD-7",        full: "Generalised Anxiety Disorder",       icon: "😰", cat: "anxiety",     color: "#3b82f6", time: "2–3 min",  items: 7  },
  { id: "PHQ9",     name: "PHQ-9",        full: "Patient Health Questionnaire",        icon: "😔", cat: "depression",  color: "#8b5cf6", time: "2–3 min",  items: 9  },
  { id: "SCARED",   name: "SCARED",       full: "Child Anxiety Related Disorders",     icon: "😨", cat: "anxiety",     color: "#3b82f6", time: "8–12 min", items: 41 },
  { id: "CONNERS3", name: "Conners-3",    full: "ADHD Rating Scale",                   icon: "⚡", cat: "adhd",        color: "#f59e0b", time: "5–8 min",  items: 27 },
  { id: "NEO",      name: "NEO-PI-3",     full: "Big Five Personality Inventory",      icon: "🧬", cat: "personality", color: "#22c55e", time: "5–8 min",  items: 30 },
  { id: "BDI2",     name: "BDI-II",       full: "Depression Inventory",                icon: "🌧️", cat: "depression",  color: "#8b5cf6", time: "5–8 min",  items: 21 },
  { id: "BAI",      name: "BAI",          full: "Anxiety Inventory",                   icon: "💭", cat: "anxiety",     color: "#3b82f6", time: "5–8 min",  items: 21 },
  { id: "CDI2",     name: "CDI-2",        full: "Child Depression Inventory",           icon: "🧒", cat: "depression",  color: "#8b5cf6", time: "5–8 min",  items: 20 },
  { id: "BRIEF2",   name: "BRIEF-2",      full: "Executive Function Rating",           icon: "🧩", cat: "executive",   color: "#a855f7", time: "5–8 min",  items: 18 },
  { id: "MMPI3",    name: "MMPI-3",       full: "Psychopathology Screening",            icon: "🔬", cat: "personality", color: "#22c55e", time: "5–8 min",  items: 24 },
];

const CATEGORIES = [
  { id: "all",         label: "All",          color: "#fff" },
  { id: "anxiety",     label: "Anxiety",      color: "#3b82f6" },
  { id: "depression",  label: "Depression",   color: "#8b5cf6" },
  { id: "adhd",        label: "ADHD",         color: "#f59e0b" },
  { id: "personality", label: "Personality",  color: "#22c55e" },
  { id: "executive",   label: "Executive",    color: "#a855f7" },
];

/**
 * @param {{
 *   onComplete?: (...args: unknown[]) => void,
 *   assessKey?: number,
 *   preferredPath?: "resilience" | "clinical" | null,
 * }} props
 */
export default function AssessHub({ onComplete, assessKey, preferredPath = null }) {
  const [mode, setMode] = useState("hub"); // hub | resilience | clinical
  const [selectedTest, setSelectedTest] = useState(null);
  const [catFilter, setCatFilter] = useState("all");

  useEffect(() => {
    if (preferredPath === "resilience") {
      setMode("resilience");
      setSelectedTest(null);
      return;
    }
    if (preferredPath === "clinical") {
      setMode("clinical");
      setSelectedTest(null);
    }
  }, [preferredPath]);

  const goHub = useCallback(() => {
    setMode("hub");
    setSelectedTest(null);
  }, []);

  const filtered = catFilter === "all"
    ? CLINICAL_TESTS
    : CLINICAL_TESTS.filter(t => t.cat === catFilter);

  // ── Resilience Archetype Mode ──
  if (mode === "resilience") {
    return (
      <GamifiedAssessment key={assessKey} onComplete={onComplete} />
    );
  }

  // ── Clinical PsyTest Mode ──
  if (mode === "clinical") {
    return (
      <PsyTestSuite onBack={goHub} initialTestId={selectedTest} />
    );
  }

  // ── HUB: Test Selection ──
  return (
    <div className="min-h-screen text-white font-['Inter'] antialiased">
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Header */}
        <header className="text-center mb-6">
          <div className="inline-flex items-center gap-2 text-[10px] tracking-[0.2em] text-white/30 font-mono uppercase mb-3">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Assessment Suite
          </div>
          <h1 className="text-2xl font-black tracking-tight mb-2 bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent">
            Choose Your Assessment
          </h1>
          <p className="text-white/35 text-sm">Clinical screenings and self-discovery tools</p>
        </header>

        {/* ── RESILIENCE ARCHETYPE (Primary) ── */}
        <button
          onClick={() => setMode("resilience")}
          className="w-full text-left mb-6 glass-card rounded-3xl p-6 relative overflow-hidden group btn-premium"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 opacity-60 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10 flex items-start gap-4">
            <div className="text-4xl animate-float">🏛️</div>
            <div className="flex-1">
              <div className="text-[9px] font-mono tracking-[0.15em] text-emerald-400/60 uppercase mb-1">Wellbeing Assessment</div>
              <div className="text-lg font-bold text-white/90 mb-1">Resilience Archetype</div>
              <div className="text-xs text-white/40 leading-relaxed">
                7 scenarios · 3 minutes · Discover your mental resilience profile using the Dual-Continua model
              </div>
              <div className="flex gap-2 mt-3">
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400/70">Scenario-Based</span>
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/40">Non-Clinical</span>
              </div>
            </div>
            <div className="text-white/20 text-xl group-hover:text-emerald-400/60 transition-colors">→</div>
          </div>
        </button>

        {/* ── FULL PSYTEST SUITE ── */}
        <button
          onClick={() => { setSelectedTest(null); setMode("clinical"); }}
          className="w-full text-left mb-6 glass-card rounded-3xl p-6 relative overflow-hidden group btn-premium"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-500/5 opacity-60 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10 flex items-start gap-4">
            <div
              className="text-4xl"
              style={{
                animationName: 'float',
                animationDuration: '6s',
                animationTimingFunction: 'ease-in-out',
                animationIterationCount: 'infinite',
                animationDelay: '0.5s',
              }}
            >
              🧠
            </div>
            <div className="flex-1">
              <div className="text-[9px] font-mono tracking-[0.15em] text-blue-400/60 uppercase mb-1">Full Test Suite</div>
              <div className="text-lg font-bold text-white/90 mb-1">PsyTest Suite — Clinical Edition</div>
              <div className="text-xs text-white/40 leading-relaxed">
                10 validated instruments · 218 items · Full scoring + decision profiles · APA | WHO endorsed
              </div>
              <div className="flex gap-2 mt-3">
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400/70">Clinical Screening</span>
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/40">10 Tests</span>
              </div>
            </div>
            <div className="text-white/20 text-xl group-hover:text-blue-400/60 transition-colors">→</div>
          </div>
        </button>

        {/* ── DIVIDER ── */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-white/8" />
          <span className="text-[10px] font-mono tracking-[0.15em] text-white/20 uppercase">or pick a specific test</span>
          <div className="flex-1 h-px bg-white/8" />
        </div>

        {/* ── CATEGORY FILTERS ── */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => setCatFilter(c.id)}
              className="shrink-0 transition-all duration-200"
              style={{
                padding: "5px 12px",
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 600,
                textTransform: "capitalize",
                background: catFilter === c.id ? `${c.color}15` : "rgba(255,255,255,0.03)",
                border: `1px solid ${catFilter === c.id ? `${c.color}40` : "rgba(255,255,255,0.06)"}`,
                color: catFilter === c.id ? c.color : "rgba(255,255,255,0.35)",
                cursor: "pointer",
              }}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* ── INDIVIDUAL TEST CARDS ── */}
        <div className="grid grid-cols-2 gap-3">
          {filtered.map(test => (
            <button
              key={test.id}
              onClick={() => { setSelectedTest(test.id); setMode("clinical"); }}
              className="text-left glass-card rounded-2xl p-4 relative overflow-hidden group btn-premium transition-all duration-200"
            >
              <div
                className="absolute top-0 right-0 w-20 h-20 blur-3xl opacity-10 group-hover:opacity-25 transition-opacity"
                style={{ background: test.color }}
              />
              <div className="relative z-10">
                <div className="text-2xl mb-2">{test.icon}</div>
                <div className="text-sm font-bold text-white/85 mb-0.5">{test.name}</div>
                <div className="text-[10px] text-white/30 leading-snug mb-2 line-clamp-1">{test.full}</div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-[9px] font-mono px-2 py-0.5 rounded-full"
                    style={{
                      background: `${test.color}12`,
                      border: `1px solid ${test.color}30`,
                      color: test.color,
                    }}
                  >
                    {test.cat}
                  </span>
                  <span className="text-[9px] text-white/25">{test.items} items · {test.time}</span>
                </div>
              </div>
            </button>
          ))}

          {/* Digit Span card */}
          <button
            onClick={() => { setSelectedTest(null); setMode("clinical"); }}
            className="text-left glass-card rounded-2xl p-4 relative overflow-hidden group btn-premium transition-all duration-200"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500 blur-3xl opacity-10 group-hover:opacity-25 transition-opacity" />
            <div className="relative z-10">
              <div className="text-2xl mb-2">🔢</div>
              <div className="text-sm font-bold text-white/85 mb-0.5">Digit Span</div>
              <div className="text-[10px] text-white/30 leading-snug mb-2">Working Memory Task</div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/12 border border-cyan-500/30 text-cyan-400">cognitive</span>
                <span className="text-[9px] text-white/25">20 trials · 5 min</span>
              </div>
            </div>
          </button>
        </div>

        {/* Disclaimer */}
        <p className="text-[10px] text-white/15 text-center mt-6 max-w-sm mx-auto leading-relaxed">
          Not a diagnosis. Screening tools for educational and wellness purposes.
          Clinical tests marked "Training" use illustrative items.
          Crisis? Call 14416 (Tele-MANAS, 24/7).
        </p>
      </div>
    </div>
  );
}
