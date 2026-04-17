"use client";

import { useState, useEffect } from "react";

const THEMES = [
  {
    id: "clinical-sand",
    label: "Clinical Sand",
    bg: "#f7f4ee",
    panel: "#fffefb",
    text: "#1f2521",
    muted: "#4f5a53",
    border: "#d8d7cf",
    primary: "#166534",
    secondary: "#0f766e",
    glowA: "rgba(22,101,52,0.15)",
    glowB: "rgba(15,118,110,0.13)",
  },
  {
    id: "mist-blue",
    label: "Mist Blue",
    bg: "#eef6fb",
    panel: "#f9fdff",
    text: "#112033",
    muted: "#3b4f66",
    border: "#c8d9e8",
    primary: "#0e7490",
    secondary: "#1d4ed8",
    glowA: "rgba(14,116,144,0.16)",
    glowB: "rgba(29,78,216,0.12)",
  },
  {
    id: "sunrise-coral",
    label: "Sunrise Coral",
    bg: "#fff3ec",
    panel: "#fffdfa",
    text: "#2c1d1a",
    muted: "#6f4d44",
    border: "#efcfbf",
    primary: "#c2410c",
    secondary: "#b91c1c",
    glowA: "rgba(194,65,12,0.16)",
    glowB: "rgba(185,28,28,0.12)",
  },
];

const ENTRY_ZONES = [
  {
    title: "Psychometric Suite",
    description: "Open Assess with full psychometric instruments and screening tracks.",
    icon: "🧠",
    view: "assess",
    assessPreset: "clinical",
  },
  {
    title: "Resilience Discovery",
    description: "Start with scenario-based archetype assessment for quick baseline mapping.",
    icon: "🧬",
    view: "assess",
    assessPreset: "resilience",
  },
  {
    title: "AI Guru Allocation",
    description: "Enter mentor workspace and continue with your assigned AI guide.",
    icon: "🦊",
    view: "mentor",
  },
  {
    title: "Guardian Controls",
    description: "Open guardian oversight controls with alerts and family-facing safeguards.",
    icon: "🛡️",
    view: "guardian",
  },
  {
    title: "MedPod Command",
    description: "Access fleet map, telemetry, and dispatch operations.",
    icon: "🏥",
    view: "medpod",
  },
  {
    title: "Journey Dashboard",
    description: "Track score history, patterns, and progression signals.",
    icon: "📈",
    view: "dashboard",
  },
];

export default function HealthLandingPage({ onBegin, onEnterZone, onStartCuratedProgram }) {
  const [visible, setVisible] = useState(false);
  const [themeId, setThemeId] = useState(THEMES[0].id);

  useEffect(() => {
    setVisible(true);
    try {
      const savedTheme = localStorage.getItem("healai_theme_template");
      if (savedTheme && THEMES.some((theme) => theme.id === savedTheme)) {
        setThemeId(savedTheme);
      }
    } catch {
      // no-op
    }
  }, []);

  const activeTheme = THEMES.find((theme) => theme.id === themeId) || THEMES[0];

  const selectTheme = (selectedThemeId) => {
    setThemeId(selectedThemeId);
    try {
      localStorage.setItem("healai_theme_template", selectedThemeId);
    } catch {
      // no-op
    }
  };

  const enterZone = (zone) => {
    const payload = zone.assessPreset ? { assessPreset: zone.assessPreset } : undefined;
    if (typeof onEnterZone === "function") {
      onEnterZone(zone.view, payload);
      return;
    }
    if (typeof onBegin === "function") onBegin();
  };

  return (
    <main className="min-h-dvh relative overflow-x-hidden flex flex-col" style={{ background: activeTheme.bg, color: activeTheme.text }}>
      <style>{`
        .healai-title {
          font-family: "Space Grotesk", "Sora", "Manrope", sans-serif;
          letter-spacing: -0.04em;
        }
        .healai-copy {
          font-family: "Manrope", "Sora", sans-serif;
        }
        @keyframes riseIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            `radial-gradient(circle at 15% 10%, ${activeTheme.glowA}, transparent 35%), radial-gradient(circle at 85% 22%, ${activeTheme.glowB}, transparent 36%), radial-gradient(circle at 50% 100%, rgba(255,255,255,0.10), transparent 42%)`,
        }}
      />

      {/* Content */}
      <div className="flex-1 flex flex-col justify-between px-4 py-8 relative z-10" style={{
        paddingTop: 'calc(2rem + env(safe-area-inset-top, 0px))',
        paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))',
      }}>
        {/* Header */}
        <div className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ animation: visible ? "riseIn 640ms ease" : "none" }}>
          <div className="flex items-center gap-2 mb-6">
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: `linear-gradient(135deg, ${activeTheme.primary}, ${activeTheme.secondary})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              color: "#fff",
              fontWeight: 800,
              boxShadow: `0 2px 16px ${activeTheme.glowA}`,
            }}>
              ✦
            </div>
            <h1 className="text-2xl font-bold tracking-tight healai-title">Healai</h1>
          </div>

          <h2 className="healai-title text-4xl md:text-5xl font-black mb-4 leading-tight" style={{ color: activeTheme.text }}>
            Silo Entry Studio
          </h2>

          <p className="healai-copy text-lg max-w-2xl leading-relaxed" style={{ color: activeTheme.muted }}>
            Designed using CDO direction and templator patterns. Enter specific silos directly,
            or run the curated sequence: assessment, AI guru allocation, and guardian controls.
          </p>
        </div>

        {/* Theme selector */}
        <div className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: "140ms" }}>
          <p className="healai-copy text-xs font-semibold tracking-[0.14em] uppercase mb-3" style={{ color: activeTheme.muted }}>
            Template Themes
          </p>
          <div className="flex gap-2 flex-wrap">
            {THEMES.map((theme) => {
              const active = theme.id === activeTheme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => selectTheme(theme.id)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    border: `1px solid ${active ? theme.primary : activeTheme.border}`,
                    background: active ? `${theme.primary}18` : activeTheme.panel,
                    color: active ? theme.primary : activeTheme.muted,
                  }}
                >
                  {theme.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Entry Zones */}
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 my-8 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
          style={{ transitionDelay: "200ms" }}>
          {ENTRY_ZONES.map((zone, idx) => (
            <button
              key={idx}
              onClick={() => enterZone(zone)}
              className="rounded-2xl p-6 border transition-all duration-300 text-left"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(16px)",
                transition: `all 0.7s cubic-bezier(0.16,1,0.3,1) ${300 + idx * 100}ms`,
                borderColor: activeTheme.border,
                background: activeTheme.panel,
                boxShadow: `0 8px 26px rgba(0,0,0,0.06)`,
              }}
            >
              <div className="text-4xl mb-3">{zone.icon}</div>
              <h3 className="text-lg font-semibold mb-1 healai-title" style={{ color: activeTheme.text }}>{zone.title}</h3>
              <p className="text-sm healai-copy" style={{ color: activeTheme.muted }}>{zone.description}</p>
              <div className="mt-4 text-xs font-semibold tracking-[0.08em]" style={{ color: activeTheme.primary }}>
                ENTER ZONE
              </div>
            </button>
          ))}
        </div>

        {/* Curated Program */}
        <div
          className={`rounded-2xl p-5 border transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
          style={{
            transitionDelay: "460ms",
            borderColor: activeTheme.border,
            background: activeTheme.panel,
          }}
        >
          <p className="text-xs font-semibold tracking-[0.13em] uppercase mb-2 healai-copy" style={{ color: activeTheme.muted }}>
            Curated Program
          </p>
          <h3 className="text-xl font-bold mb-2 healai-title" style={{ color: activeTheme.text }}>
            Assess → Allocate AI Guru → Guardian Controls
          </h3>
          <p className="text-sm mb-4 healai-copy" style={{ color: activeTheme.muted }}>
            This sequence keeps psychometric assessment and mentor assignment synchronized with guardian oversight.
          </p>
          <button
            onClick={() => {
              if (typeof onStartCuratedProgram === "function") {
                onStartCuratedProgram();
                return;
              }
              if (typeof onBegin === "function") onBegin();
            }}
            className="px-5 py-3 rounded-xl text-sm font-semibold healai-title"
            style={{
              background: `linear-gradient(135deg, ${activeTheme.primary}, ${activeTheme.secondary})`,
              color: "#fff",
            }}
          >
            Start Curated Program
          </button>
        </div>

        {/* CTA Button */}
        <div className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
          style={{ transitionDelay: "600ms" }}>
          <button
            onClick={onBegin}
            className="w-full md:w-auto px-8 py-4 rounded-xl font-semibold text-white text-lg transition-all duration-300 relative overflow-hidden group healai-title"
            style={{
              background: `linear-gradient(135deg, ${activeTheme.primary}, ${activeTheme.secondary})`,
              boxShadow: `0 6px 28px ${activeTheme.glowA}`,
            }}
            onMouseEnter={(e) => {
              e.target.style.boxShadow = `0 8px 38px ${activeTheme.glowA}`;
              e.target.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.target.style.boxShadow = `0 6px 28px ${activeTheme.glowA}`;
              e.target.style.transform = "translateY(0)";
            }}
          >
            Open Default Workspace
          </button>

          <p className="text-xs mt-4 healai-copy" style={{ color: activeTheme.muted }}>
            CDO and templator are used as design/template inputs; landing is now focused on silo entry and program flow.
          </p>
        </div>
      </div>

      {/* Footer gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none" style={{ background: `linear-gradient(to top, ${activeTheme.bg}, transparent)` }} />
    </main>
  );
}
