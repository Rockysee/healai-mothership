"use client";
/**
 * SiloShell — minimal chrome wrapper for standalone silo pages.
 * Each silo (Assess, AI Guru, Vijnana, etc.) can run at its own URL
 * wrapped in this shell: dark background + AIrJun logo back-link.
 */

import Link from "next/link";

interface SiloShellProps {
  title: string;
  accent?: string;       // hex colour for the active-dot indicator
  children: React.ReactNode;
}

export default function SiloShell({ title, accent = "#22c55e", children }: SiloShellProps) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#020205",
        color: "#fff",
        fontFamily: "'Inter', system-ui, sans-serif",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      {/* ── Ambient glow ── */}
      <div
        style={{
          position: "fixed", top: "-80px", left: "-80px",
          width: "320px", height: "320px",
          background: `${accent}18`,
          borderRadius: "50%", filter: "blur(90px)",
          pointerEvents: "none",
        }}
      />

      {/* ── Top bar — safe-area aware ── */}
      <div
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 40,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          paddingTop:    "calc(12px + env(safe-area-inset-top, 0px))",
          paddingBottom: "10px",
          paddingLeft:   "calc(16px + env(safe-area-inset-left, 0px))",
          paddingRight:  "calc(16px + env(safe-area-inset-right, 0px))",
          background: "linear-gradient(180deg, rgba(2,2,5,0.97) 0%, transparent 100%)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}
      >
        {/* Logo + back to full platform */}
        <Link
          href="/"
          style={{
            display: "flex", alignItems: "center", gap: "8px",
            textDecoration: "none",
          }}
        >
          <div
            style={{
              width: "28px", height: "28px", borderRadius: "8px",
              background: "linear-gradient(135deg, #22c55e, #16a34a)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "13px", color: "#fff", fontWeight: 800,
              boxShadow: "0 2px 10px rgba(34,197,94,0.4)",
            }}
          >✦</div>
          <span style={{ fontSize: "14px", fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: "-0.01em" }}>
            AIrJun
          </span>
        </Link>

        {/* Active silo name */}
        <div
          style={{
            display: "flex", alignItems: "center", gap: "7px",
            padding: "5px 12px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: "20px",
          }}
        >
          <div
            style={{
              width: "6px", height: "6px", borderRadius: "50%",
              background: accent,
              boxShadow: `0 0 8px ${accent}`,
            }}
          />
          <span style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            {title}
          </span>
        </div>

        {/* Back to full platform — min 44px touch target */}
        <Link
          href="/"
          style={{
            fontSize: "11px", fontWeight: 600,
            color: "rgba(255,255,255,0.35)",
            textDecoration: "none",
            padding: "11px 12px",
            borderRadius: "10px",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
            letterSpacing: "0.04em",
            whiteSpace: "nowrap",
            minHeight: "44px",
            display: "flex", alignItems: "center",
          }}
        >
          ← Full Platform
        </Link>
      </div>

      {/* ── Silo content — pushed below notch-aware top bar ── */}
      <div
        style={{
          paddingTop:    "calc(56px + env(safe-area-inset-top, 0px))",
          paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
          paddingLeft:   "env(safe-area-inset-left, 0px)",
          paddingRight:  "env(safe-area-inset-right, 0px)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
