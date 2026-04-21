"use client";

/**
 * HealthLandingPage — Uyire platform landing.
 *
 * The first page a visitor sees. Introduces the Uyire umbrella brand
 * (not Healai — Healai is the product brand for MedPod only) and lets
 * the user enter one of the product silos.
 *
 * Design direction: cream editorial, Newsreader italic masthead, single
 * hero "⟁ Uyire" mark + wordmark, entry cards on warm white.
 * Brand source of truth: logo design/Uyire Brand Book.html.
 */

import { useState, useEffect } from "react";
import UyireMark from "./UyireMark";

// ── Uyire palette (mirror of medpod-brand.css) ───────────────────────
const UYIRE = {
  cream: "#faf6f1",
  warm:  "#f3ece0",
  ink:   "#2a2320",
  muted: "#8a7e70",
  health:"#2e7bc4",
  life:  "#d24b3a",
};

// Kept for the "change theme" affordance but default is always Uyire.
const THEMES = [
  {
    id: "uyire",
    label: "Uyire",
    bg:    UYIRE.cream,
    panel: "#ffffff",
    text:  UYIRE.ink,
    muted: UYIRE.muted,
    border: UYIRE.warm,
    primary: UYIRE.health,
    secondary: UYIRE.life,
    glowA: "rgba(46,123,196,0.08)",
    glowB: "rgba(210,75,58,0.06)",
  },
  {
    id: "ink-night",
    label: "Ink night",
    bg:    "#131014",
    panel: "#1c1820",
    text:  "#f1ece5",
    muted: "#928a82",
    border: "#2d2731",
    primary: "#8db6e6",
    secondary: "#e48979",
    glowA: "rgba(141,182,230,0.12)",
    glowB: "rgba(228,137,121,0.10)",
  },
];

const ENTRY_ZONES = [
  {
    title: "Healai · MedPod",
    description: "Emergency-management platform for hospitals & operators. Live dispatch, PCR, AI triage, 9-year India coverage.",
    icon: "🏥",
    view: "medpod",
    tag: "A UYIRE PRODUCT",
  },
  {
    title: "Assess",
    description: "Psychometric & wellbeing screening. 10 validated clinical instruments + gamified resilience assessment.",
    icon: "🧠",
    view: "assess",
    assessPreset: "clinical",
  },
  {
    title: "Mentor",
    description: "AI guide assignment and ongoing conversation workspace.",
    icon: "🦊",
    view: "mentor",
  },
  {
    title: "Guardian",
    description: "Oversight controls, alert routing, family-facing safeguards.",
    icon: "🛡️",
    view: "guardian",
  },
  {
    title: "Longevity OS",
    description: "Protocol tracks, biomarker monitoring, recomposition plan.",
    icon: "❤️",
    view: "longevity",
  },
  {
    title: "Dashboard",
    description: "Score trajectory, patterns, personal trendlines.",
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
      const savedTheme = localStorage.getItem("uyire_theme");
      if (savedTheme && THEMES.some((theme) => theme.id === savedTheme)) {
        setThemeId(savedTheme);
      }
    } catch { /* no-op */ }
  }, []);

  const activeTheme = THEMES.find((theme) => theme.id === themeId) || THEMES[0];

  const selectTheme = (selectedThemeId) => {
    setThemeId(selectedThemeId);
    try { localStorage.setItem("uyire_theme", selectedThemeId); } catch {}
  };

  const enterZone = (zone) => {
    const payload = zone.assessPreset ? { assessPreset: zone.assessPreset } : undefined;
    if (typeof onEnterZone === "function") {
      onEnterZone(zone.view, payload);
      return;
    }
    if (typeof onBegin === "function") onBegin();
  };

  // Load Uyire brand fonts (Newsreader + DM Sans + JetBrains Mono) for this page
  useEffect(() => {
    if (document.getElementById("uyire-landing-fonts")) return;
    const link = document.createElement("link");
    link.id = "uyire-landing-fonts";
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400;1,6..72,500&family=JetBrains+Mono:wght@400;500;600&display=swap";
    document.head.appendChild(link);
  }, []);

  return (
    <main
      className="min-h-dvh relative overflow-x-hidden flex flex-col"
      style={{
        background: activeTheme.bg,
        color: activeTheme.text,
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <style>{`
        /* Uyire display — handwriting (Caveat / Kalam).
         * Weight bumped to 700 for a darker, more confident mark. */
        .uyire-serif {
          font-family: var(--font-caveat, 'Caveat'),
                       var(--font-kalam, 'Kalam'),
                       'Segoe Script', cursive;
          font-weight: 700;
          letter-spacing: -0.005em;
          line-height: 1.05;
        }
        .uyire-mono {
          font-family: var(--font-jet-mono, 'JetBrains Mono'), ui-monospace, monospace;
        }
        @keyframes riseIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Soft brand glows — one red, one blue */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            `radial-gradient(circle at 15% 10%, ${activeTheme.glowA}, transparent 38%),` +
            `radial-gradient(circle at 85% 22%, ${activeTheme.glowB}, transparent 36%)`,
        }}
      />

      {/* Content */}
      <div
        className="flex-1 flex flex-col justify-between px-4 sm:px-6 md:px-10 py-8 md:py-12 relative z-10 max-w-6xl w-full mx-auto"
        style={{
          paddingTop: 'calc(2rem + env(safe-area-inset-top, 0px))',
          paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {/* Masthead */}
        <div
          className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
          style={{ animation: visible ? "riseIn 640ms ease" : "none" }}
        >
          <div className="flex items-center gap-3 mb-5">
            <UyireMark size={40} wordmarkColor={activeTheme.text} />
            <span
              className="uyire-mono"
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.16em",
                color: activeTheme.muted,
                textTransform: "uppercase",
                marginLeft: 8,
              }}
            >
              · O Life
            </span>
          </div>

          <h1
            className="uyire-serif"
            style={{
              /* Caveat is already slanted — no italic; larger size to compensate
                 for handwriting's smaller x-height. */
              fontSize: "clamp(56px, 9vw, 120px)",
              lineHeight: 1.02,
              letterSpacing: "-0.005em",
              color: activeTheme.text,
              margin: "8px 0 14px",
              maxWidth: 900,
            }}
          >
            Healthcare that meets life where it is.
          </h1>

          {/* Brand Hero Line — from Uyire Brand Book v1.0 */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              borderRadius: 999,
              background: "rgba(210,75,58,0.08)",
              border: "1px solid rgba(210,75,58,0.22)",
              color: "#d24b3a",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.02em",
              marginBottom: 18,
            }}
          >
            <span style={{ fontWeight: 900 }}>3 Easy Clicks.</span>
            <span>Save a Life.</span>
          </div>

          <p
            style={{
              fontSize: 17,
              color: activeTheme.muted,
              maxWidth: 640,
              lineHeight: 1.55,
              margin: 0,
            }}
          >
            Uyire is an umbrella of human-centered health products. <strong style={{ color: activeTheme.text, fontWeight: 600 }}>Healai · MedPod</strong> is our
            emergency-management platform — MARS-proven, NABH-aligned, ready for hospital-scale deployment.
            Enter a silo below, or begin the curated path.
          </p>
        </div>

        {/* Theme switcher — kept but demoted */}
        <div
          className={`mt-7 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
          style={{ transitionDelay: "140ms" }}
        >
          <p
            className="uyire-mono"
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.16em",
              color: activeTheme.muted,
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Surface
          </p>
          <div className="flex gap-2 flex-wrap">
            {THEMES.map((theme) => {
              const active = theme.id === activeTheme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => selectTheme(theme.id)}
                  className="transition-all"
                  style={{
                    padding: "6px 14px",
                    borderRadius: 999,
                    border: `1px solid ${active ? activeTheme.primary : activeTheme.border}`,
                    background: active ? `${activeTheme.primary}14` : "transparent",
                    color: active ? activeTheme.primary : activeTheme.muted,
                    fontSize: 12,
                    fontWeight: active ? 700 : 500,
                    fontFamily: "'DM Sans', sans-serif",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {theme.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Entry Zones */}
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-6 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
          style={{ transitionDelay: "200ms" }}
        >
          {ENTRY_ZONES.map((zone, idx) => (
            <button
              key={idx}
              onClick={() => enterZone(zone)}
              className="text-left transition-all duration-300 group"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(16px)",
                transition: `all 0.7s cubic-bezier(0.16,1,0.3,1) ${300 + idx * 70}ms`,
                background: activeTheme.panel,
                border: `1px solid ${activeTheme.border}`,
                borderRadius: 16,
                padding: "22px 22px 20px",
                boxShadow: "0 1px 0 rgba(42,35,32,0.02), 0 6px 22px -14px rgba(42,35,32,0.10)",
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 10 }}>{zone.icon}</div>
              {zone.tag && (
                <div
                  className="uyire-mono"
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    color: activeTheme.primary,
                    textTransform: "uppercase",
                    marginBottom: 4,
                  }}
                >
                  {zone.tag}
                </div>
              )}
              <h3
                className="uyire-serif"
                style={{
                  fontSize: 26,
                  fontWeight: 600,
                  color: activeTheme.text,
                  margin: "2px 0 6px",
                  letterSpacing: "-0.005em",
                }}
              >
                {zone.title}
              </h3>
              <p
                style={{
                  fontSize: 13,
                  color: activeTheme.muted,
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {zone.description}
              </p>
              <div
                className="uyire-mono"
                style={{
                  marginTop: 14,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: activeTheme.primary,
                  textTransform: "uppercase",
                }}
              >
                ENTER →
              </div>
            </button>
          ))}
        </div>

        {/* Curated Program + CTA — bottom row */}
        <div
          className={`mt-6 grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
          style={{ transitionDelay: "460ms" }}
        >
          <div
            style={{
              background: activeTheme.panel,
              border: `1px solid ${activeTheme.border}`,
              borderRadius: 16,
              padding: "20px 22px",
            }}
          >
            <p
              className="uyire-mono"
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.14em",
                color: activeTheme.muted,
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Curated program
            </p>
            <h3
              className="uyire-serif"
              style={{
                fontSize: 28,
                color: activeTheme.text,
                margin: "0 0 8px",
                letterSpacing: "-0.005em",
              }}
            >
              Assess → AI Mentor → Guardian
            </h3>
            <p
              style={{
                fontSize: 13,
                color: activeTheme.muted,
                lineHeight: 1.55,
                margin: "0 0 14px",
                maxWidth: 580,
              }}
            >
              The sequenced path. Psychometric assessment flows into mentor allocation, then into guardian oversight —
              one joined-up journey across the Uyire platform.
            </p>
            <button
              onClick={() => {
                if (typeof onStartCuratedProgram === "function") {
                  onStartCuratedProgram();
                  return;
                }
                if (typeof onBegin === "function") onBegin();
              }}
              style={{
                padding: "10px 18px",
                borderRadius: 999,
                background: activeTheme.primary,
                color: "#ffffff",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                letterSpacing: "0.02em",
              }}
            >
              Begin curated path →
            </button>
          </div>

          <div
            style={{
              background: activeTheme.panel,
              border: `1px solid ${activeTheme.border}`,
              borderRadius: 16,
              padding: "20px 22px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <p
                className="uyire-mono"
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  color: activeTheme.muted,
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                Default workspace
              </p>
              <p
                style={{
                  fontSize: 13,
                  color: activeTheme.muted,
                  lineHeight: 1.5,
                  margin: "0 0 14px",
                }}
              >
                Skip the entry grid. Go straight to your assessment surface.
              </p>
            </div>
            <button
              onClick={onBegin}
              style={{
                padding: "10px 18px",
                borderRadius: 999,
                background: "transparent",
                color: activeTheme.text,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                fontWeight: 600,
                border: `1px solid ${activeTheme.border}`,
                cursor: "pointer",
              }}
            >
              Open default workspace
            </button>
          </div>
        </div>

        {/* Footer line */}
        <div
          className="uyire-mono"
          style={{
            marginTop: 32,
            fontSize: 10,
            color: activeTheme.muted,
            letterSpacing: "0.1em",
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <span>உயிரே · Uyire · Goldenhour Systems Pvt Ltd</span>
          <span>uyire.co.in</span>
        </div>
      </div>
    </main>
  );
}
