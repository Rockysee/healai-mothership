/**
 * Framegen — Phase 2: Mafs animated math graph composition
 *
 * Used when blueprint scenes have graphType set (Maths / Physics equations).
 * The graph traces from left to right over durationFrames.
 *
 * Props:
 *   graphType : "sin" | "cos" | "tan" | "linear" | "quadratic" | "exp" | "inverse"
 *   equations : string[]   — displayed as styled text boxes alongside the graph
 *   keyFacts  : string[]
 *   title     : string
 *   narration : string
 *   durationFrames : number
 *   fps       : number
 *
 * NOTE: mafs renders pure SVG so it is fully compatible with Remotion's
 * Puppeteer-based headless renderer — no WebGL required.
 */
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";
import { Mafs, Coordinates, Plot, Theme } from "mafs";

// ── Graph function map ─────────────────────────────────────────────────────────
const GRAPH_FNS = {
  sin:       (x) => Math.sin(x),
  cos:       (x) => Math.cos(x),
  tan:       (x) => {
    const v = Math.tan(x);
    return Math.abs(v) > 8 ? NaN : v;   // clip near asymptotes
  },
  linear:    (x) => 0.8 * x,
  quadratic: (x) => 0.35 * x * x,
  cubic:     (x) => 0.15 * x * x * x,
  exp:       (x) => Math.exp(0.5 * x) - 2,
  inverse:   (x) => (Math.abs(x) < 0.15 ? NaN : 1 / x),
  sqrt:      (x) => (x < 0 ? NaN : Math.sqrt(x)),
};

const GRAPH_LABELS = {
  sin:       "y = sin(x)",
  cos:       "y = cos(x)",
  tan:       "y = tan(x)",
  linear:    "y = mx",
  quadratic: "y = x²",
  cubic:     "y = x³",
  exp:       "y = eˣ",
  inverse:   "y = 1/x",
  sqrt:      "y = √x",
};

const COLORS = {
  sin: "#e63946", cos: "#1565c0", tan: "#7b1fa2",
  linear: "#1b5e20", quadratic: "#e65100", cubic: "#880e4f",
  exp: "#006064", inverse: "#bf360c", sqrt: "#1a237e",
};

// ── Word-by-word animated caption ─────────────────────────────────────────────
function AnimatedWords({ text, startFrame, color = "#555", size = 21 }) {
  const frame = useCurrentFrame();
  return (
    <span>
      {(text || "").split(" ").filter(Boolean).map((word, i) => {
        const sf = startFrame + i * 4;
        const opacity = interpolate(frame, [sf, sf + 10], [0, 1], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
          easing: Easing.out(Easing.quad),
        });
        return (
          <span key={i} style={{ opacity, display: "inline-block", marginRight: "0.3em", fontSize: size, color, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
            {word}
          </span>
        );
      })}
    </span>
  );
}

// ── Equation badge ─────────────────────────────────────────────────────────────
function EqBadge({ text, delay, color = "#c0392b" }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: frame - delay, fps, config: { stiffness: 110, damping: 13 } });
  return (
    <div style={{
      opacity: Math.min(1, progress),
      transform: `scale(${interpolate(progress, [0, 1], [0.85, 1])})`,
      display: "inline-block",
      background: "#fff8e1",
      border: `2px solid ${color}`,
      borderRadius: 8,
      padding: "8px 22px",
      marginBottom: 12,
      fontSize: 28,
      fontFamily: "'Courier New', monospace",
      color,
      fontWeight: 700,
      letterSpacing: "0.05em",
    }}>
      {text}
    </div>
  );
}

// ── Fact line ─────────────────────────────────────────────────────────────────
function FactLine({ text, startFrame }) {
  const frame = useCurrentFrame();
  const tx = interpolate(frame, [startFrame, startFrame + 18], [-40, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const opacity = interpolate(frame, [startFrame, startFrame + 18], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  return (
    <div style={{ opacity, transform: `translateX(${tx}px)`, display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 11 }}>
      <div style={{ width: 4, minHeight: 24, background: "#1565c0", borderRadius: 2, flexShrink: 0, marginTop: 3 }} />
      <div style={{ fontSize: 21, color: "#2c3e50", fontFamily: "'Segoe UI', system-ui, sans-serif", lineHeight: 1.45 }}>
        {text}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export const GraphComposition = ({
  title         = "",
  narration     = "",
  graphType     = "sin",
  equations     = [],
  keyFacts      = [],
  accent        = "#1565c0",
  durationFrames = 300,
  fps           = 30,
}) => {
  const frame    = useCurrentFrame();
  const { fps: cfps } = useVideoConfig();

  const type   = (graphType || "sin").toLowerCase();
  const fn     = GRAPH_FNS[type] || GRAPH_FNS.sin;
  const label  = GRAPH_LABELS[type] || "y = f(x)";
  const color  = COLORS[type] || "#e63946";

  // The plot traces in from the left over the first 70% of the scene
  const progress  = interpolate(frame, [20, Math.floor(durationFrames * 0.75)], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const xMax = interpolate(progress, [0, 1], [-4.5, 4.5]);

  const titleProg = spring({ frame, fps: cfps, config: { stiffness: 65, damping: 14 } });
  const titleY    = interpolate(titleProg, [0, 1], [-18, 0]);
  const barW      = interpolate(frame, [12, 38], [0, 100], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#f8f8f8", padding: "48px 0 0 0", boxSizing: "border-box", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* Title */}
      <div style={{ paddingLeft: 48, paddingRight: 48, opacity: titleProg, transform: `translateY(${titleY}px)`, marginBottom: 10 }}>
        <div style={{ fontSize: 40, fontWeight: 800, color: "#1a1a1a", lineHeight: 1.2 }}>{title}</div>
        <div style={{ marginTop: 8, height: 3, background: accent, width: `${barW}%`, borderRadius: 2 }} />
      </div>

      {/* Two-column layout: graph left, sidebar right */}
      <div style={{ display: "flex", flex: 1, paddingLeft: 24, paddingRight: 48, gap: 32, marginTop: 8 }}>

        {/* Graph panel */}
        <div style={{ flex: "0 0 560px", height: 360, position: "relative" }}>
          <Mafs
            viewBox={{ x: [-5, 5], y: [-4, 4] }}
            preserveAspectRatio={false}
            height={360}
            width={560}
          >
            <Coordinates.Cartesian
              xAxis={{ lines: 1, labels: (n) => n }}
              yAxis={{ lines: 1, labels: (n) => n }}
            />
            <Plot.OfX
              y={fn}
              color={color}
              minSamplingDepth={6}
              maxSamplingDepth={10}
              svgPathProps={{ strokeWidth: 3 }}
              domain={[-4.5, xMax]}
            />
          </Mafs>

          {/* Graph type label badge */}
          <div style={{
            position: "absolute", top: 8, left: 8,
            background: color, color: "#fff",
            borderRadius: 6, padding: "4px 14px",
            fontSize: 17, fontWeight: 700, fontFamily: "'Courier New', monospace",
            opacity: interpolate(frame, [15, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}>
            {label}
          </div>
        </div>

        {/* Sidebar: equations + facts */}
        <div style={{ flex: 1, paddingTop: 8 }}>
          {equations.slice(0, 2).map((eq, i) => (
            <div key={i}><EqBadge text={eq} delay={18 + i * 22} color={color} /></div>
          ))}
          <div style={{ marginTop: equations.length ? 10 : 0 }}>
            {keyFacts.slice(0, 3).map((fact, i) => (
              <FactLine key={i} text={fact} startFrame={45 + i * 22} />
            ))}
          </div>
        </div>
      </div>

      {/* Narration caption */}
      <div style={{
        position: "absolute", bottom: 44, left: 48, right: 48,
        borderTop: "1px solid #ddd", paddingTop: 12,
      }}>
        <AnimatedWords text={narration} startFrame={80} color="#666" size={21} />
      </div>
    </AbsoluteFill>
  );
};
