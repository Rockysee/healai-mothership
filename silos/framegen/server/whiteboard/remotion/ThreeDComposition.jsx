/**
 * Framegen — Phase 1: Three.js / React-Three-Fiber 3D composition
 *
 * Replaces AI-video calls for visualStyle === "3d".
 * Driven entirely by blueprint JSON fields:
 *   model3d  : "atom" | "dna" | "solar_system" | "wave" | "crystal" | "molecule_3d" | "default"
 *   title    : string
 *   narration: string
 *
 * All animation is derived from useCurrentFrame() — zero real-time loops.
 * Renders to 1280×720 @ 30 fps, white-overlay title + narration caption.
 */
import React, { useMemo, useRef } from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";

// ── Shared helpers ────────────────────────────────────────────────────────────

function lerp(a, b, t) { return a + (b - a) * t; }

// ── 1. Bohr Atom Model ────────────────────────────────────────────────────────
function AtomModel({ frame }) {
  const t = frame / 30; // seconds elapsed
  // Nucleus
  const nucleus = (
    <mesh position={[0, 0, 0]}>
      <sphereGeometry args={[0.38, 32, 32]} />
      <meshStandardMaterial color="#e63946" emissive="#c62828" emissiveIntensity={0.6} />
    </mesh>
  );

  // Three electron orbits at different tilt angles + speeds
  const orbits = [
    { radius: 1.3, speed: 1.0,  tiltX: 0,     tiltZ: 0,     color: "#00bcd4" },
    { radius: 1.3, speed: 1.6,  tiltX: 1.05,  tiltZ: 0.4,   color: "#69f0ae" },
    { radius: 1.3, speed: 0.7,  tiltX: -0.6,  tiltZ: 1.05,  color: "#ffcc02" },
  ];

  const electrons = orbits.map((o, i) => {
    const angle = t * o.speed * Math.PI * 2 + i * (Math.PI * 2 / 3);
    const ex = Math.cos(angle) * o.radius;
    const ey = Math.sin(angle) * o.radius * Math.cos(o.tiltX);
    const ez = Math.sin(angle) * o.radius * Math.sin(o.tiltX);
    return (
      <group key={i} rotation={[o.tiltX, 0, o.tiltZ]}>
        {/* Orbit ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[o.radius, 0.016, 8, 64]} />
          <meshBasicMaterial color={o.color} opacity={0.35} transparent />
        </mesh>
        {/* Electron sphere */}
        <mesh position={[ex, ey, 0]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color={o.color} emissive={o.color} emissiveIntensity={0.8} />
        </mesh>
      </group>
    );
  });

  return (
    <group rotation={[0.3, t * 0.25, 0]}>
      <ambientLight intensity={0.5} />
      <pointLight position={[4, 4, 4]} intensity={1.8} />
      {nucleus}
      {electrons}
    </group>
  );
}

// ── 2. DNA Double Helix ───────────────────────────────────────────────────────
function DNAHelix({ frame }) {
  const t = frame / 30;
  const points = useMemo(() => {
    const pts = [];
    for (let i = 0; i < 60; i++) {
      const frac = i / 59;
      const y = (frac - 0.5) * 6;
      const angle = frac * Math.PI * 6;
      pts.push({
        a: [Math.cos(angle) * 0.9, y, Math.sin(angle) * 0.9],
        b: [Math.cos(angle + Math.PI) * 0.9, y, Math.sin(angle + Math.PI) * 0.9],
        showRung: i % 5 === 0,
      });
    }
    return pts;
  }, []);

  const rotY = t * 0.6;
  return (
    <group rotation={[0, rotY, 0]}>
      <ambientLight intensity={0.6} />
      <pointLight position={[3, 5, 3]} intensity={2} />
      {points.map((p, i) => (
        <group key={i}>
          <mesh position={p.a}>
            <sphereGeometry args={[0.09, 12, 12]} />
            <meshStandardMaterial color="#e63946" emissive="#c62828" emissiveIntensity={0.4} />
          </mesh>
          <mesh position={p.b}>
            <sphereGeometry args={[0.09, 12, 12]} />
            <meshStandardMaterial color="#1565c0" emissive="#0d47a1" emissiveIntensity={0.4} />
          </mesh>
          {p.showRung && (
            <mesh
              position={[(p.a[0] + p.b[0]) / 2, p.a[1], (p.a[2] + p.b[2]) / 2]}
              rotation={[
                0,
                Math.atan2(p.b[2] - p.a[2], p.b[0] - p.a[0]),
                Math.PI / 2,
              ]}
            >
              <cylinderGeometry args={[0.03, 0.03, 1.8, 8]} />
              <meshStandardMaterial color="#69f0ae" opacity={0.7} transparent />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

// ── 3. Solar System ───────────────────────────────────────────────────────────
const PLANETS = [
  { name: "Mercury", radius: 0.11, orbit: 1.4, speed: 4.1,  color: "#b0bec5" },
  { name: "Venus",   radius: 0.18, orbit: 2.0, speed: 1.6,  color: "#ffcc80" },
  { name: "Earth",   radius: 0.19, orbit: 2.7, speed: 1.0,  color: "#42a5f5" },
  { name: "Mars",    radius: 0.14, orbit: 3.5, speed: 0.53, color: "#ef5350" },
];

function SolarSystem({ frame }) {
  const t = frame / 30;
  return (
    <group rotation={[0.45, t * 0.08, 0]}>
      <ambientLight intensity={0.2} />
      <pointLight position={[0, 0, 0]} intensity={4} color="#fff9e6" />
      {/* Sun */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color="#ffd54f" emissive="#ff8f00" emissiveIntensity={1.2} />
      </mesh>
      {PLANETS.map((p, i) => {
        const angle = t * p.speed;
        const x = Math.cos(angle) * p.orbit;
        const z = Math.sin(angle) * p.orbit;
        return (
          <group key={i}>
            {/* Orbit trail */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[p.orbit, 0.012, 6, 96]} />
              <meshBasicMaterial color="#ffffff" opacity={0.15} transparent />
            </mesh>
            {/* Planet */}
            <mesh position={[x, 0, z]}>
              <sphereGeometry args={[p.radius, 20, 20]} />
              <meshStandardMaterial color={p.color} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// ── 4. Transverse Wave ────────────────────────────────────────────────────────
function WaveModel({ frame }) {
  const t = frame / 30;
  const COUNT = 28;
  const particles = Array.from({ length: COUNT }, (_, i) => {
    const x = (i / (COUNT - 1) - 0.5) * 8;
    const phase = (i / COUNT) * Math.PI * 4;
    const y = Math.sin(phase - t * 3) * 1.1;
    return { x, y };
  });

  return (
    <group>
      <ambientLight intensity={0.7} />
      <pointLight position={[0, 4, 4]} intensity={2} />
      {/* Equilibrium line */}
      <mesh position={[0, 0, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[8.4, 0.02, 0.02]} />
        <meshBasicMaterial color="#ccc" opacity={0.4} transparent />
      </mesh>
      {particles.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, 0]}>
          <sphereGeometry args={[0.17, 14, 14]} />
          <meshStandardMaterial
            color={`hsl(${200 + i * 4}, 80%, 60%)`}
            emissive={`hsl(${200 + i * 4}, 80%, 40%)`}
            emissiveIntensity={0.3}
          />
        </mesh>
      ))}
      {/* Connect neighbours */}
      {particles.slice(0, -1).map((p, i) => {
        const q = particles[i + 1];
        const mx = (p.x + q.x) / 2;
        const my = (p.y + q.y) / 2;
        const len = Math.hypot(q.x - p.x, q.y - p.y);
        const angle = Math.atan2(q.y - p.y, q.x - p.x);
        return (
          <mesh key={`l${i}`} position={[mx, my, 0]} rotation={[0, 0, angle]}>
            <boxGeometry args={[len, 0.04, 0.04]} />
            <meshBasicMaterial color="#78909c" opacity={0.5} transparent />
          </mesh>
        );
      })}
    </group>
  );
}

// ── 5. Crystal Lattice ────────────────────────────────────────────────────────
function CrystalLattice({ frame }) {
  const t = frame / 30;
  const SIZE = 3; // 3×3×3
  const SPACING = 1.0;
  const nodes = [];
  const bonds = [];
  for (let x = 0; x < SIZE; x++) {
    for (let y = 0; y < SIZE; y++) {
      for (let z = 0; z < SIZE; z++) {
        const px = (x - 1) * SPACING;
        const py = (y - 1) * SPACING;
        const pz = (z - 1) * SPACING;
        nodes.push({ pos: [px, py, pz], type: (x + y + z) % 2 });
        if (x < SIZE - 1) bonds.push([[px, py, pz], [px + SPACING, py, pz]]);
        if (y < SIZE - 1) bonds.push([[px, py, pz], [px, py + SPACING, pz]]);
        if (z < SIZE - 1) bonds.push([[px, py, pz], [px, py, pz + SPACING]]);
      }
    }
  }
  return (
    <group rotation={[t * 0.3, t * 0.45, t * 0.1]}>
      <ambientLight intensity={0.6} />
      <pointLight position={[3, 4, 3]} intensity={2} />
      {nodes.map((n, i) => (
        <mesh key={i} position={n.pos}>
          <sphereGeometry args={[0.18, 14, 14]} />
          <meshStandardMaterial
            color={n.type === 0 ? "#e63946" : "#42a5f5"}
            emissive={n.type === 0 ? "#b71c1c" : "#0d47a1"}
            emissiveIntensity={0.3}
          />
        </mesh>
      ))}
      {bonds.map(([a, b], i) => {
        const mx = (a[0] + b[0]) / 2;
        const my = (a[1] + b[1]) / 2;
        const mz = (a[2] + b[2]) / 2;
        const len = Math.hypot(b[0]-a[0], b[1]-a[1], b[2]-a[2]);
        const dir = new THREE.Vector3(b[0]-a[0], b[1]-a[1], b[2]-a[2]).normalize();
        const quat = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0), dir,
        );
        return (
          <mesh key={`b${i}`} position={[mx, my, mz]} quaternion={quat}>
            <cylinderGeometry args={[0.04, 0.04, len, 6]} />
            <meshBasicMaterial color="#90a4ae" opacity={0.55} transparent />
          </mesh>
        );
      })}
    </group>
  );
}

// ── 6. 3D Molecule (tetrahedral / default) ────────────────────────────────────
function Molecule3D({ frame }) {
  const t = frame / 30;
  // Tetrahedral CH4-like: central atom + 4 around it
  const BONDS = [
    [0, 0, 1.2],
    [1.13, 0, -0.4],
    [-1.13, 0, -0.4],
    [0, 1.13, -0.4],
    [0, -1.13, -0.4],
  ];
  return (
    <group rotation={[t * 0.4, t * 0.6, 0]}>
      <ambientLight intensity={0.6} />
      <pointLight position={[3, 4, 3]} intensity={2.5} />
      {/* Central atom */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.35, 24, 24]} />
        <meshStandardMaterial color="#ff7043" emissive="#bf360c" emissiveIntensity={0.5} />
      </mesh>
      {BONDS.map((pos, i) => (
        <group key={i}>
          {/* Outer atom */}
          <mesh position={pos}>
            <sphereGeometry args={[0.22, 18, 18]} />
            <meshStandardMaterial color="#42a5f5" emissive="#0d47a1" emissiveIntensity={0.3} />
          </mesh>
          {/* Bond cylinder */}
          {(() => {
            const mx = pos[0] / 2, my = pos[1] / 2, mz = pos[2] / 2;
            const len = Math.hypot(...pos) / 2;
            const dir = new THREE.Vector3(...pos).normalize();
            const quat = new THREE.Quaternion().setFromUnitVectors(
              new THREE.Vector3(0, 1, 0), dir,
            );
            return (
              <mesh position={[mx, my, mz]} quaternion={quat}>
                <cylinderGeometry args={[0.06, 0.06, len, 8]} />
                <meshBasicMaterial color="#cfd8dc" opacity={0.8} transparent />
              </mesh>
            );
          })()}
        </group>
      ))}
    </group>
  );
}

// ── Model dispatcher ──────────────────────────────────────────────────────────
function SceneModel({ model3d, frame }) {
  switch ((model3d || "atom").toLowerCase()) {
    case "dna":          return <DNAHelix frame={frame} />;
    case "solar_system": return <SolarSystem frame={frame} />;
    case "wave":         return <WaveModel frame={frame} />;
    case "crystal":      return <CrystalLattice frame={frame} />;
    case "molecule_3d":  return <Molecule3D frame={frame} />;
    default:             return <AtomModel frame={frame} />;
  }
}

// ── Camera positions per model ────────────────────────────────────────────────
const CAMERAS = {
  dna:          [0, 0, 5.5],
  solar_system: [0, 3.5, 8],
  wave:         [0, 2, 8],
  crystal:      [3, 3, 4.5],
  molecule_3d:  [0, 0, 4.5],
  default:      [0, 0, 4.5],
};

// ── Animated word caption ─────────────────────────────────────────────────────
function AnimatedWords({ text, startFrame, color = "#e0e0e0", size = 20 }) {
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

// ── Main export ───────────────────────────────────────────────────────────────
export const ThreeDComposition = ({
  title         = "",
  narration     = "",
  model3d       = "atom",
  durationFrames = 300,
  fps           = 30,
}) => {
  const frame = useCurrentFrame();
  const { fps: cfps } = useVideoConfig();

  const cam = CAMERAS[model3d] || CAMERAS.default;

  const titleOpacity = spring({ frame, fps: cfps, config: { stiffness: 60, damping: 14 } });
  const titleY = interpolate(titleOpacity, [0, 1], [-18, 0]);

  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, #0d1b2a 0%, #010813 100%)" }}>

      {/* Three.js canvas — full bleed */}
      <div style={{ position: "absolute", inset: 0 }}>
        <Canvas
          frameloop="demand"
          camera={{ position: cam, fov: 55 }}
          gl={{ preserveDrawingBuffer: true, antialias: true }}
          style={{ width: "100%", height: "100%" }}
        >
          <SceneModel model3d={model3d} frame={frame} />
        </Canvas>
      </div>

      {/* Gradient overlay — keeps text readable */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, rgba(1,8,19,0.6) 0%, transparent 28%, transparent 68%, rgba(1,8,19,0.75) 100%)",
        pointerEvents: "none",
      }} />

      {/* Title */}
      <div style={{
        position: "absolute", top: 42, left: 60, right: 60,
        opacity: titleOpacity, transform: `translateY(${titleY}px)`,
      }}>
        <div style={{ fontSize: 40, fontWeight: 800, color: "#ffffff", lineHeight: 1.2, fontFamily: "'Segoe UI', system-ui, sans-serif", textShadow: "0 2px 12px rgba(0,0,0,0.7)" }}>
          {title}
        </div>
        <div style={{
          marginTop: 8, height: 3,
          background: "linear-gradient(90deg, #00bcd4, #69f0ae)",
          width: interpolate(frame, [10, 40], [0, 340], { extrapolateRight: "clamp" }),
          borderRadius: 2,
        }} />
      </div>

      {/* Narration caption */}
      <div style={{
        position: "absolute", bottom: 44, left: 60, right: 60,
        borderTop: "1px solid rgba(255,255,255,0.18)",
        paddingTop: 12,
      }}>
        <AnimatedWords text={narration} startFrame={70} color="#cfd8dc" size={21} />
      </div>
    </AbsoluteFill>
  );
};
