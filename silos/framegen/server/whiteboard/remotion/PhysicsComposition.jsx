/**
 * Framegen — Phase 3: Matter.js physics simulation composition
 *
 * Renders real physics simulations driven by blueprint JSON.
 * All engine steps are pre-computed in useMemo — deterministic,
 * safe for Remotion's multi-pass frame rendering.
 *
 * Props:
 *   simulation : "pendulum" | "projectile" | "collision" | "spring" | "incline" | "wave_particle"
 *   simParams  : object   — simulation-specific params (see below)
 *   title      : string
 *   narration  : string
 *   keyFacts   : string[]
 *   durationFrames : number
 *   fps        : number
 *
 * simParams examples:
 *   pendulum     : { length: 1.5, angle: 45, mass: 1 }
 *   projectile   : { v0: 18, angle: 45, g: 9.8 }
 *   collision    : { m1: 2, m2: 1, v1: 5, v2: 0 }
 *   spring       : { k: 3, mass: 1, amplitude: 80 }
 *   incline      : { angle: 30, mu: 0.25 }
 *   wave_particle: { wavelength: 2, amplitude: 60 }
 */
import React, { useMemo } from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";
import Matter from "matter-js";

// ── Viewport constants ────────────────────────────────────────────────────────
const W = 640;   // simulation canvas width (px)
const H = 420;   // simulation canvas height (px)

// ── Pre-compute pendulum positions ────────────────────────────────────────────
function usePendulumFrames(params, totalFrames) {
  return useMemo(() => {
    const len = (params?.length ?? 1.5) * 100;          // pixels
    const a0  = ((params?.angle ?? 40) * Math.PI) / 180; // rad
    const g   = 9.81 * 60;                               // px/s² (scaled)
    const dt  = 1 / 30;

    let theta = a0, omega = 0;
    const frames = [];
    for (let i = 0; i < totalFrames; i++) {
      omega += -(g / len) * Math.sin(theta) * dt;
      omega *= 0.9995;                                   // tiny damping
      theta += omega * dt;
      const px = W / 2 + Math.sin(theta) * len;
      const py = 60     + Math.cos(theta) * len;
      frames.push({ px, py, theta });
    }
    return frames;
  }, [params?.length, params?.angle, totalFrames]);
}

// ── Pre-compute projectile positions ──────────────────────────────────────────
function useProjectileFrames(params, totalFrames) {
  return useMemo(() => {
    const v0    = (params?.v0    ?? 18);
    const angle = ((params?.angle ?? 40) * Math.PI) / 180;
    const g     = (params?.g     ?? 9.8);
    const scale = 18;                  // 1 m = 18 px
    const ox    = 60;
    const oy    = H - 60;
    const vx    = v0 * Math.cos(angle);
    const vy    = v0 * Math.sin(angle);

    const frames = [];
    let landed = false;
    for (let i = 0; i < totalFrames; i++) {
      const t  = i / 30;
      const x  = ox + vx * t * scale;
      const y  = oy - (vy * t - 0.5 * g * t * t) * scale;
      if (y > oy && i > 0) { landed = true; }
      frames.push({ x: Math.min(x, W - 40), y: Math.min(y, oy), landed: y >= oy && i > 5, t });
    }
    return frames;
  }, [params?.v0, params?.angle, params?.g, totalFrames]);
}

// ── Pre-compute elastic collision ─────────────────────────────────────────────
function useCollisionFrames(params, totalFrames) {
  return useMemo(() => {
    const m1 = params?.m1 ?? 2;
    const m2 = params?.m2 ?? 1;
    let v1   = params?.v1 ?? 5;
    let v2   = params?.v2 ?? 0;
    const r1 = Math.sqrt(m1) * 22;
    const r2 = Math.sqrt(m2) * 22;
    const y  = H / 2;
    const speed = 2.2;

    let x1 = 120, x2 = W - 140;
    let collided = false;
    const frames = [];

    for (let i = 0; i < totalFrames; i++) {
      // Check collision
      if (!collided && x1 + r1 >= x2 - r2) {
        collided = true;
        // 1D elastic collision velocities
        const newV1 = ((m1 - m2) / (m1 + m2)) * v1 + ((2 * m2) / (m1 + m2)) * v2;
        const newV2 = ((2 * m1) / (m1 + m2)) * v1 + ((m2 - m1) / (m1 + m2)) * v2;
        v1 = newV1; v2 = newV2;
      }
      x1 = Math.max(r1, Math.min(W - r1, x1 + v1 * speed * (1 / 30)));
      x2 = Math.max(r2, Math.min(W - r2, x2 + v2 * speed * (1 / 30)));
      frames.push({ x1, x2, y, r1, r2, collided });
    }
    return frames;
  }, [params?.m1, params?.m2, params?.v1, params?.v2, totalFrames]);
}

// ── Pre-compute spring-mass ───────────────────────────────────────────────────
function useSpringFrames(params, totalFrames) {
  return useMemo(() => {
    const k   = params?.k         ?? 3;
    const m   = params?.mass      ?? 1;
    const amp = params?.amplitude ?? 80;
    const omega = Math.sqrt(k / m);
    const frames = [];
    for (let i = 0; i < totalFrames; i++) {
      const t   = i / 30;
      const disp = amp * Math.cos(omega * t) * Math.exp(-0.05 * t);
      const anchorX = 80;
      const equilibX = W / 2 - 20;
      const massX   = equilibX + disp;
      frames.push({ anchorX, equilibX, massX, disp });
    }
    return frames;
  }, [params?.k, params?.mass, params?.amplitude, totalFrames]);
}

// ── Pre-compute inclined plane ────────────────────────────────────────────────
function useInclineFrames(params, totalFrames) {
  return useMemo(() => {
    const theta = ((params?.angle ?? 30) * Math.PI) / 180;
    const mu    = params?.mu ?? 0.25;
    const g     = 9.8;
    const a     = g * (Math.sin(theta) - mu * Math.cos(theta));
    const scale = 35;
    const frames = [];
    let s = 0, v = 0;
    let offplane = false;
    for (let i = 0; i < totalFrames; i++) {
      if (!offplane) {
        v += a / 30;
        s += v / 30;
        if (s < 0) { s = 0; v = 0; }           // block stays if friction > gravity component
        if (s * scale > 220) offplane = true;  // fell off
      }
      frames.push({ s: Math.min(s, 7), offplane });
    }
    return frames;
  }, [params?.angle, params?.mu, totalFrames]);
}

// ── SVG simulation renderers ──────────────────────────────────────────────────

function PendulumSVG({ frames, frame }) {
  const f = frames[Math.min(frame, frames.length - 1)] || frames[0];
  const pivotX = W / 2, pivotY = 60;
  return (
    <svg width={W} height={H} style={{ display: "block" }}>
      {/* Background grid */}
      {Array.from({ length: 7 }, (_, i) => (
        <line key={i} x1={i * 110} y1={0} x2={i * 110} y2={H} stroke="#e8eaf0" strokeWidth={1} />
      ))}
      {/* Ceiling support */}
      <rect x={pivotX - 28} y={0} width={56} height={14} fill="#90a4ae" rx={3} />
      {/* String */}
      <line x1={pivotX} y1={14} x2={f.px} y2={f.py} stroke="#546e7a" strokeWidth={2.5} />
      {/* Pivot */}
      <circle cx={pivotX} cy={14} r={6} fill="#455a64" />
      {/* Bob */}
      <circle cx={f.px} cy={f.py} r={22} fill="#1565c0" stroke="#0d47a1" strokeWidth={2.5} />
      {/* Angle arc indicator */}
      <path
        d={`M ${pivotX} 14 L ${pivotX} 80`}
        stroke="#cfd8dc" strokeWidth={1} strokeDasharray="4 4"
      />
    </svg>
  );
}

function ProjectileSVG({ frames, frame }) {
  const f   = frames[Math.min(frame, frames.length - 1)] || frames[0];
  const oy  = H - 60;
  const arc = frames.filter((_, i) => i <= frame && i % 3 === 0);
  return (
    <svg width={W} height={H} style={{ display: "block" }}>
      {/* Ground */}
      <rect x={0} y={oy} width={W} height={60} fill="#e8f5e9" />
      <line x1={0} y1={oy} x2={W} y2={oy} stroke="#4caf50" strokeWidth={2} />
      {/* Trajectory trail */}
      <polyline
        points={arc.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="none"
        stroke="#e63946"
        strokeWidth={2}
        strokeDasharray="6 3"
        opacity={0.6}
      />
      {/* Ball */}
      {!f.landed && (
        <circle cx={f.x} cy={f.y} r={14} fill="#e63946" stroke="#b71c1c" strokeWidth={2} />
      )}
      {f.landed && (
        <circle cx={f.x} cy={oy} r={14} fill="#b71c1c" />
      )}
      {/* Launch point */}
      <circle cx={60} cy={oy} r={6} fill="#1565c0" />
    </svg>
  );
}

function CollisionSVG({ frames, frame }) {
  const f = frames[Math.min(frame, frames.length - 1)] || frames[0];
  return (
    <svg width={W} height={H} style={{ display: "block" }}>
      {/* Track */}
      <line x1={40} y1={f.y} x2={W - 40} y2={f.y} stroke="#b0bec5" strokeWidth={3} />
      {/* Mass 1 */}
      <circle cx={f.x1} cy={f.y} r={f.r1} fill="#1565c0" stroke="#0d47a1" strokeWidth={2} opacity={0.9} />
      <text x={f.x1} y={f.y + 5} textAnchor="middle" fill="white" fontSize={14} fontWeight="bold">m₁</text>
      {/* Mass 2 */}
      <circle cx={f.x2} cy={f.y} r={f.r2} fill="#e63946" stroke="#b71c1c" strokeWidth={2} opacity={0.9} />
      <text x={f.x2} y={f.y + 5} textAnchor="middle" fill="white" fontSize={14} fontWeight="bold">m₂</text>
      {/* Collision flash */}
      {f.collided && frame > 0 && (
        <circle
          cx={(f.x1 + f.x2) / 2}
          cy={f.y}
          r={interpolate(frame % 12, [0, 6, 11], [0, 28, 0], { extrapolateRight: "clamp" })}
          fill="#fff176"
          opacity={0.7}
        />
      )}
    </svg>
  );
}

function SpringSVG({ frames, frame }) {
  const f = frames[Math.min(frame, frames.length - 1)] || frames[0];
  const coils = 12;
  const coilPts = [];
  const len = f.massX - f.anchorX;
  for (let i = 0; i <= coils * 4; i++) {
    const t   = i / (coils * 4);
    const x   = f.anchorX + t * len;
    const y   = H / 2 + (i % 2 === 0 ? 0 : (i % 4 < 2 ? -18 : 18));
    coilPts.push(`${x},${y}`);
  }
  return (
    <svg width={W} height={H} style={{ display: "block" }}>
      {/* Wall */}
      <rect x={0} y={H / 2 - 50} width={f.anchorX} height={100} fill="#cfd8dc" />
      <line x1={f.anchorX} y1={H / 2 - 50} x2={f.anchorX} y2={H / 2 + 50} stroke="#90a4ae" strokeWidth={3} />
      {/* Spring */}
      <polyline points={coilPts.join(" ")} fill="none" stroke="#546e7a" strokeWidth={3} strokeLinejoin="round" />
      {/* Equilibrium marker */}
      <line x1={f.equilibX} y1={H / 2 - 60} x2={f.equilibX} y2={H / 2 + 60} stroke="#a5d6a7" strokeWidth={2} strokeDasharray="6 4" />
      {/* Mass */}
      <rect x={f.massX - 28} y={H / 2 - 28} width={56} height={56} rx={6} fill="#1565c0" stroke="#0d47a1" strokeWidth={2} />
      <text x={f.massX} y={H / 2 + 6} textAnchor="middle" fill="white" fontSize={15} fontWeight="bold">m</text>
      {/* Track */}
      <line x1={f.anchorX} y1={H / 2 + 29} x2={W - 40} y2={H / 2 + 29} stroke="#b0bec5" strokeWidth={2} />
    </svg>
  );
}

function InclineSVG({ frames, frame, angle }) {
  const f     = frames[Math.min(frame, frames.length - 1)] || frames[0];
  const theta = ((angle ?? 30) * Math.PI) / 180;
  const scale = 35;
  const bx    = 100, by = H - 60;
  const tx    = bx + Math.cos(theta) * 240;
  const ty    = by - Math.sin(theta) * 240;
  // Block position along slope
  const d     = Math.min(f.s * scale, 210);
  const bkX   = bx + Math.cos(theta) * d;
  const bkY   = by - Math.sin(theta) * d;
  // Block rect rotated with slope
  const deg   = -(angle ?? 30);
  return (
    <svg width={W} height={H} style={{ display: "block" }}>
      {/* Ground */}
      <rect x={0} y={by} width={W} height={60} fill="#e8f5e9" />
      <line x1={0} y1={by} x2={W} y2={by} stroke="#4caf50" strokeWidth={2} />
      {/* Inclined surface */}
      <polygon
        points={`${bx},${by} ${tx},${ty} ${tx},${by}`}
        fill="#e3f2fd"
        stroke="#90a4ae"
        strokeWidth={2}
      />
      {/* Angle arc */}
      <path
        d={`M ${bx + 44} ${by} A 44 44 0 0 0 ${bx + 44 * Math.cos(theta)} ${by - 44 * Math.sin(theta)}`}
        fill="none" stroke="#1565c0" strokeWidth={1.5}
      />
      <text x={bx + 52} y={by - 12} fill="#1565c0" fontSize={13}>{angle ?? 30}°</text>
      {/* Block */}
      {!f.offplane && (
        <rect
          x={bkX - 22} y={bkY - 22}
          width={44} height={44}
          rx={4}
          fill="#e63946"
          stroke="#b71c1c"
          strokeWidth={2}
          transform={`rotate(${deg}, ${bkX}, ${bkY})`}
        />
      )}
    </svg>
  );
}

// ── Word-by-word caption ──────────────────────────────────────────────────────
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

function FactLine({ text, startFrame }) {
  const frame = useCurrentFrame();
  const tx = interpolate(frame, [startFrame, startFrame + 18], [-40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const op = interpolate(frame, [startFrame, startFrame + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ opacity: op, transform: `translateX(${tx}px)`, display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 11 }}>
      <div style={{ width: 4, minHeight: 24, background: "#1565c0", borderRadius: 2, flexShrink: 0, marginTop: 3 }} />
      <div style={{ fontSize: 21, color: "#2c3e50", fontFamily: "'Segoe UI', system-ui, sans-serif", lineHeight: 1.45 }}>{text}</div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export const PhysicsComposition = ({
  title          = "",
  narration      = "",
  simulation     = "pendulum",
  simParams      = {},
  keyFacts       = [],
  accent         = "#1565c0",
  durationFrames = 300,
  fps            = 30,
}) => {
  const frame = useCurrentFrame();
  const { fps: cfps } = useVideoConfig();

  const type = (simulation || "pendulum").toLowerCase();

  // Pre-compute all frames for the chosen simulation
  const pendFrames = usePendulumFrames(simParams, durationFrames);
  const projFrames = useProjectileFrames(simParams, durationFrames);
  const collFrames = useCollisionFrames(simParams, durationFrames);
  const springFrames = useSpringFrames(simParams, durationFrames);
  const inclineFrames = useInclineFrames(simParams, durationFrames);

  const titleProg = spring({ frame, fps: cfps, config: { stiffness: 65, damping: 14 } });
  const titleY    = interpolate(titleProg, [0, 1], [-18, 0]);
  const barW      = interpolate(frame, [12, 38], [0, 100], { extrapolateRight: "clamp" });

  const SIM_LABELS = {
    pendulum:  "Simple Pendulum",
    projectile:"Projectile Motion",
    collision: "Elastic Collision",
    spring:    "Spring-Mass System",
    incline:   "Inclined Plane",
  };

  return (
    <AbsoluteFill style={{ backgroundColor: "#f8f9fa", padding: "44px 48px 0 48px", boxSizing: "border-box", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* Title */}
      <div style={{ opacity: titleProg, transform: `translateY(${titleY}px)`, marginBottom: 12 }}>
        <div style={{ fontSize: 40, fontWeight: 800, color: "#1a1a1a", lineHeight: 1.2 }}>{title}</div>
        <div style={{ marginTop: 8, height: 3, background: accent, width: `${barW}%`, borderRadius: 2 }} />
      </div>

      {/* Two-column: simulation left, info right */}
      <div style={{ display: "flex", gap: 32, alignItems: "flex-start" }}>

        {/* Simulation panel */}
        <div style={{
          flex: "0 0 540px",
          background: "#ffffff",
          borderRadius: 12,
          border: "1.5px solid #e0e0e0",
          overflow: "hidden",
          boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
        }}>
          {/* Sim type chip */}
          <div style={{ background: accent, color: "#fff", padding: "5px 16px", fontSize: 13, fontWeight: 700 }}>
            {SIM_LABELS[type] || simulation}
          </div>
          <div style={{ width: W, height: H, overflow: "hidden" }}>
            {type === "pendulum"   && <PendulumSVG   frames={pendFrames}   frame={frame} />}
            {type === "projectile" && <ProjectileSVG frames={projFrames}   frame={frame} />}
            {type === "collision"  && <CollisionSVG  frames={collFrames}   frame={frame} />}
            {type === "spring"     && <SpringSVG     frames={springFrames} frame={frame} />}
            {type === "incline"    && <InclineSVG    frames={inclineFrames} frame={frame} angle={simParams?.angle} />}
          </div>
        </div>

        {/* Info sidebar */}
        <div style={{ flex: 1, paddingTop: 8 }}>
          {keyFacts.slice(0, 4).map((fact, i) => (
            <FactLine key={i} text={fact} startFrame={20 + i * 22} />
          ))}
        </div>
      </div>

      {/* Narration */}
      <div style={{ position: "absolute", bottom: 44, left: 48, right: 48, borderTop: "1px solid #ddd", paddingTop: 12 }}>
        <AnimatedWords text={narration} startFrame={75} color="#666" size={21} />
      </div>
    </AbsoluteFill>
  );
};
