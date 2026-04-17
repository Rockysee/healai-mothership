"use client";
import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// EINSTEIN AVATAR v2 — Large-Scale 2D Canvas Animated Portrait
// High-detail rendering: layered skin shading, depth-mapped features,
// fluid idle animations, advanced lip-sync with 6 viseme shapes,
// particle-based aura system, and cinematic lighting.
// Goldenhour Systems Pvt Ltd
// ═══════════════════════════════════════════════════════════════════════════════

// Viseme sequence: 0=closed, 1=slightly open, 2=open, 3=wide(AH), 4=round(O/U), 5=ee/smile
const VISEME_SEQ = [0, 1, 2, 3, 2, 4, 1, 5, 3, 2, 4, 1, 5, 2, 3, 1, 0];

// Mentor aura colors with extended palette
const MENTOR_AURAS = {
  ontological: { primary: "#a855f7", glow: "rgba(168,85,247,0.3)",  secondary: "#c084fc", iris: "#7c3aed", particle: "#d8b4fe" },
  spiritual:   { primary: "#10b981", glow: "rgba(16,185,129,0.3)",  secondary: "#34d399", iris: "#059669", particle: "#6ee7b7" },
  peak:        { primary: "#f59e0b", glow: "rgba(245,158,11,0.3)",  secondary: "#fbbf24", iris: "#d97706", particle: "#fde68a" },
  somatic:     { primary: "#3b82f6", glow: "rgba(59,130,246,0.3)",  secondary: "#60a5fa", iris: "#2563eb", particle: "#93c5fd" },
  fox:         { primary: "#fb923c", glow: "rgba(251,146,60,0.3)",  secondary: "#fdba74", iris: "#ea580c", particle: "#fed7aa" },
};
const DEFAULT_AURA = { primary: "#22c55e", glow: "rgba(34,197,94,0.25)", secondary: "#4ade80", iris: "#166534", particle: "#86efac" };

// Floating particle system
class Particle {
  constructor(cx, cy, radius, color) {
    this.reset(cx, cy, radius, color);
  }
  reset(cx, cy, radius, color) {
    const angle = Math.random() * Math.PI * 2;
    const dist = radius * (0.85 + Math.random() * 0.3);
    this.x = cx + Math.cos(angle) * dist;
    this.y = cy + Math.sin(angle) * dist;
    this.baseX = this.x;
    this.baseY = this.y;
    this.size = 1 + Math.random() * 2.5;
    this.alpha = 0.1 + Math.random() * 0.4;
    this.speed = 0.3 + Math.random() * 0.7;
    this.angle = Math.random() * Math.PI * 2;
    this.color = color;
    this.life = 1;
    this.decay = 0.002 + Math.random() * 0.005;
  }
  update(dt) {
    this.angle += this.speed * dt;
    this.x = this.baseX + Math.sin(this.angle) * 6;
    this.y = this.baseY + Math.cos(this.angle * 0.7) * 4;
    this.life -= this.decay;
  }
  draw(ctx) {
    if (this.life <= 0) return;
    ctx.globalAlpha = this.alpha * this.life;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

const EinsteinAvatar = forwardRef(function EinsteinAvatar(
  { size = 420, mentorId = null, speaking: externalSpeaking = false, mini = false, onClick },
  ref
) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const particlesRef = useRef([]);
  const stateRef = useRef({
    // Idle
    blinkTimer: 2 + Math.random() * 2,
    blinkState: 0,
    breathPhase: 0,
    headTilt: 0, headTiltTarget: 0, headTiltTimer: 3,
    eyeWander: { x: 0, y: 0 }, eyeWanderTarget: { x: 0, y: 0 }, eyeWanderTimer: 2,
    microExprTimer: 0,
    // Lip sync
    mouthOpen: 0, mouthTarget: 0,
    mouthShape: 0, visemeIdx: 0, visemeTimer: 0,
    jawDrop: 0, jawTarget: 0,
    // Expression
    browRaise: 0, browTarget: 0,
    smileAmount: 0.05, smileTarget: 0.05,
    // Expression mode (for pondering, CTA, etc.)
    expression: "neutral", // neutral | pondering | excited | concerned | greeting | listening
    exprIntensity: 0, exprIntensityTarget: 0,
    ponderAngle: 0, // slow gaze drift for pondering
    // Ambient
    time: 0,
    auraPulse: 0,
  });

  const [isSpeaking, setIsSpeaking] = useState(false);
  const aura = MENTOR_AURAS[mentorId] || DEFAULT_AURA;

  // ── Expression presets (drives brow, smile, gaze, head tilt) ──
  const EXPRESSIONS = {
    neutral:   { browTarget: 0, smileTarget: 0.05, headTiltTarget: 0, gazeY: 0 },
    pondering: { browTarget: 0.35, smileTarget: 0.02, headTiltTarget: -4, gazeY: -2 },
    excited:   { browTarget: 0.5, smileTarget: 0.4, headTiltTarget: 3, gazeY: 0 },
    concerned: { browTarget: -0.2, smileTarget: -0.05, headTiltTarget: -2, gazeY: 1 },
    greeting:  { browTarget: 0.3, smileTarget: 0.3, headTiltTarget: 5, gazeY: 0 },
    listening: { browTarget: 0.15, smileTarget: 0.08, headTiltTarget: -3, gazeY: 1 },
  };

  useImperativeHandle(ref, () => ({
    startSpeaking: () => setIsSpeaking(true),
    stopSpeaking: () => setIsSpeaking(false),
    setExpression: (expr) => {
      const s = stateRef.current;
      s.expression = expr;
      s.exprIntensityTarget = 1;
      const preset = EXPRESSIONS[expr] || EXPRESSIONS.neutral;
      if (!isSpeaking) {
        s.browTarget = preset.browTarget;
        s.smileTarget = preset.smileTarget;
        s.headTiltTarget = preset.headTiltTarget;
        s.eyeWanderTarget.y = preset.gazeY;
      }
    },
  }));

  useEffect(() => { setIsSpeaking(externalSpeaking); }, [externalSpeaking]);

  // ── Main animation loop ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const renderSize = mini ? Math.max(size, 80) : size;
    canvas.width = renderSize * dpr;
    canvas.height = renderSize * dpr;
    ctx.scale(dpr, dpr);

    // Init particles
    const cx = renderSize / 2, cy = renderSize / 2;
    const pRadius = renderSize * 0.46;
    particlesRef.current = [];
    for (let i = 0; i < 40; i++) {
      particlesRef.current.push(new Particle(cx, cy, pRadius, aura.particle));
    }

    let running = true;
    let lastTime = performance.now();

    function frame(now) {
      if (!running) return;
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      const s = stateRef.current;
      s.time += dt;

      // ── Blink system ──
      s.blinkTimer -= dt;
      if (s.blinkTimer <= 0 && s.blinkState === 0) { s.blinkState = 1; s.blinkTimer = 0.07; }
      if (s.blinkState === 1) { s.blinkTimer -= dt; if (s.blinkTimer <= 0) { s.blinkState = 2; s.blinkTimer = 0.05; } }
      if (s.blinkState === 2) { s.blinkTimer -= dt; if (s.blinkTimer <= 0) { s.blinkState = 3; s.blinkTimer = 0.07; } }
      if (s.blinkState === 3) { s.blinkTimer -= dt; if (s.blinkTimer <= 0) { s.blinkState = 0; s.blinkTimer = 2 + Math.random() * 4; } }

      // Breathing
      s.breathPhase += dt * 0.9;

      // Head micro-movements
      s.headTiltTimer -= dt;
      if (s.headTiltTimer <= 0) {
        s.headTiltTarget = (Math.random() - 0.5) * 4;
        s.headTiltTimer = 2.5 + Math.random() * 3.5;
      }
      s.headTilt += (s.headTiltTarget - s.headTilt) * dt * 1.5;

      // Eye wander — expression-aware
      s.eyeWanderTimer -= dt;
      if (s.expression === "pondering") {
        // Slow deliberate gaze drift (looks up-left as if thinking)
        s.ponderAngle += dt * 0.4;
        s.eyeWanderTarget = { x: Math.sin(s.ponderAngle) * 4, y: -2 + Math.cos(s.ponderAngle * 0.7) * 1.5 };
        s.eyeWanderTimer = 0.5; // Override timer so it stays smooth
      } else if (s.expression === "listening") {
        // Focused forward gaze with tiny saccades
        s.eyeWanderTarget = { x: (Math.random() - 0.5) * 1.5, y: 0.5 + Math.random() * 0.5 };
        if (s.eyeWanderTimer <= 0) s.eyeWanderTimer = 0.8 + Math.random() * 1;
      } else if (s.eyeWanderTimer <= 0) {
        s.eyeWanderTarget = { x: (Math.random() - 0.5) * 5, y: (Math.random() - 0.5) * 3 };
        s.eyeWanderTimer = 1 + Math.random() * 3;
      }
      s.eyeWander.x += (s.eyeWanderTarget.x - s.eyeWander.x) * dt * 2.5;
      s.eyeWander.y += (s.eyeWanderTarget.y - s.eyeWander.y) * dt * 2.5;

      // Expression intensity smooth transition
      s.exprIntensity += (s.exprIntensityTarget - s.exprIntensity) * dt * 3;

      // Micro expression timer (subtle brow and smile shifts when idle/expression)
      s.microExprTimer -= dt;
      if (s.microExprTimer <= 0 && !isSpeaking) {
        if (s.expression === "neutral") {
          s.browTarget = (Math.random() - 0.3) * 0.15;
          s.smileTarget = 0.02 + Math.random() * 0.08;
        } else if (s.expression === "pondering") {
          s.browTarget = 0.25 + Math.random() * 0.15;
          s.smileTarget = 0.0 + Math.random() * 0.04;
          s.headTiltTarget = -3 + Math.random() * 2;
        } else if (s.expression === "excited") {
          s.browTarget = 0.4 + Math.random() * 0.15;
          s.smileTarget = 0.3 + Math.random() * 0.15;
        }
        s.microExprTimer = 3 + Math.random() * 4;
      }

      // ── Lip-sync engine ──
      if (isSpeaking) {
        s.visemeTimer -= dt;
        if (s.visemeTimer <= 0) {
          s.visemeIdx = (s.visemeIdx + 1) % VISEME_SEQ.length;
          const v = VISEME_SEQ[s.visemeIdx];
          s.mouthTarget = v / 5;
          s.mouthShape = v;
          s.jawTarget = v >= 2 ? (v / 5) * 0.7 : 0.1;
          s.visemeTimer = 0.06 + Math.random() * 0.07;
          s.browTarget = 0.05 + Math.random() * 0.25;
          s.smileTarget = v === 5 ? 0.35 : v === 0 ? 0.05 : 0.1;
        }
        s.auraPulse = 0.5 + Math.sin(s.time * 4) * 0.3;
      } else {
        s.mouthTarget = 0;
        s.mouthShape = 0;
        s.jawTarget = 0;
        s.auraPulse += (0 - s.auraPulse) * dt * 3;
      }

      // Smooth interpolation
      s.mouthOpen += (s.mouthTarget - s.mouthOpen) * dt * 20;
      s.jawDrop += (s.jawTarget - s.jawDrop) * dt * 14;
      s.browRaise += (s.browTarget - s.browRaise) * dt * 8;
      s.smileAmount += (s.smileTarget - s.smileAmount) * dt * 5;

      // ── Update particles ──
      particlesRef.current.forEach(p => {
        p.update(dt);
        if (p.life <= 0) p.reset(cx, cy, pRadius, aura.particle);
      });

      // ── DRAW ──
      drawEinsteinV2(ctx, renderSize, s, aura, isSpeaking, mini, particlesRef.current);

      animRef.current = requestAnimationFrame(frame);
    }

    animRef.current = requestAnimationFrame(frame);
    return () => { running = false; cancelAnimationFrame(animRef.current); };
  }, [size, aura, isSpeaking, mini]);

  const displayW = mini ? 64 : size;
  const displayH = mini ? 64 : size;

  return (
    <div
      onClick={onClick}
      style={{
        width: displayW, height: displayH,
        borderRadius: "50%",
        overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        position: "relative",
        flexShrink: 0,
      }}
    >
      {/* Aura outer glow */}
      <div style={{
        position: "absolute", inset: -8, borderRadius: "50%",
        background: `radial-gradient(circle, ${aura.glow} 0%, transparent 70%)`,
        opacity: isSpeaking ? 0.9 : 0.25,
        transition: "opacity 0.6s ease",
        animation: isSpeaking ? "einstein-aura-pulse 2s ease-in-out infinite" : "none",
      }} />
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block", borderRadius: "50%" }}
      />
      {/* Speaking EQ visualizer */}
      {isSpeaking && !mini && (
        <div style={{
          position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)",
          display: "flex", gap: 3, alignItems: "flex-end",
          background: "rgba(0,0,0,0.4)", borderRadius: 12, padding: "4px 8px",
        }}>
          {[0, 1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} style={{
              width: 3, background: aura.primary, borderRadius: 2, opacity: 0.8,
              animationName: 'einstein-eq',
              animationDuration: `${0.4 + i * 0.08}s`,
              animationTimingFunction: 'ease-in-out',
              animationIterationCount: 'infinite',
              animationDirection: 'alternate',
              animationDelay: `${i * 0.07}s`,
            }} />
          ))}
        </div>
      )}
      <style>{`
        @keyframes einstein-eq {
          0% { height: 3px; }
          100% { height: 16px; }
        }
        @keyframes einstein-aura-pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.04); }
        }
      `}</style>
    </div>
  );
});

export default EinsteinAvatar;

// ═══════════════════════════════════════════════════════════════════════════════
// V2 DRAWING ENGINE — Rich 2D Einstein Portrait
// ═══════════════════════════════════════════════════════════════════════════════

function drawEinsteinV2(ctx, size, s, aura, speaking, mini, particles) {
  const cx = size / 2;
  const cy = size / 2;
  const sc = size / 420; // Reference = 420px

  ctx.clearRect(0, 0, size, size);
  ctx.save();

  // ── Background ──
  const bgGrad = ctx.createRadialGradient(cx, cy - 20 * sc, size * 0.05, cx, cy, size * 0.5);
  bgGrad.addColorStop(0, "#302820");
  bgGrad.addColorStop(0.4, "#1e1a14");
  bgGrad.addColorStop(0.8, "#121010");
  bgGrad.addColorStop(1, "#0a0908");
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.5, 0, Math.PI * 2);
  ctx.fillStyle = bgGrad;
  ctx.fill();

  // ── Aura ring (animated) ──
  if (speaking) {
    const aGrad = ctx.createRadialGradient(cx, cy, size * 0.42, cx, cy, size * 0.5);
    aGrad.addColorStop(0, "transparent");
    aGrad.addColorStop(0.5, aura.primary + "18");
    aGrad.addColorStop(1, aura.primary + "08");
    ctx.fillStyle = aGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Glowing ring
    ctx.strokeStyle = aura.primary + "60";
    ctx.lineWidth = 2.5 * sc;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.465, 0, Math.PI * 2);
    ctx.stroke();
  }

  // ── Particles ──
  if (speaking) {
    particles.forEach(p => p.draw(ctx));
  }

  // Apply head transform
  const breathY = Math.sin(s.breathPhase) * 2 * sc;
  const breathScale = 1 + Math.sin(s.breathPhase) * 0.003;
  ctx.translate(cx, cy);
  ctx.rotate((s.headTilt * Math.PI) / 180);
  ctx.scale(breathScale, breathScale);
  ctx.translate(-cx, -cy + breathY);

  // ── NECK + SHOULDERS ──
  drawNeck(ctx, cx, cy, sc);

  // ── FACE ──
  drawFace(ctx, cx, cy, sc, s, aura);

  // ── EARS ──
  drawDetailedEar(ctx, cx - 72 * sc, cy + 8 * sc, sc, false);
  drawDetailedEar(ctx, cx + 72 * sc, cy + 8 * sc, sc, true);

  // ── FOREHEAD WRINKLES ──
  drawWrinkles(ctx, cx, cy, sc, s);

  // ── EYEBROWS ──
  const browY = cy - 32 * sc - s.browRaise * 8 * sc;
  drawEinsteinBrow(ctx, cx - 42 * sc, browY, 36 * sc, sc, false);
  drawEinsteinBrow(ctx, cx + 6 * sc, browY, 36 * sc, sc, true);

  // ── EYES ──
  const blinkAmt = s.blinkState === 0 ? 1 :
    s.blinkState === 1 ? Math.max(0, s.blinkTimer / 0.07) :
    s.blinkState === 2 ? 0 :
    1 - Math.max(0, s.blinkTimer / 0.07);
  drawDetailedEye(ctx, cx - 30 * sc, cy - 12 * sc, sc, blinkAmt, s.eyeWander, aura.iris, false);
  drawDetailedEye(ctx, cx + 30 * sc, cy - 12 * sc, sc, blinkAmt, s.eyeWander, aura.iris, true);

  // ── NOSE ──
  drawDetailedNose(ctx, cx, cy + 18 * sc, sc);

  // ── NASOLABIAL FOLDS ──
  drawNasolabialFolds(ctx, cx, cy, sc, s);

  // ── MUSTACHE ──
  drawDetailedMustache(ctx, cx, cy + 34 * sc, sc, s.mouthOpen);

  // ── MOUTH ──
  drawDetailedMouth(ctx, cx, cy + 48 * sc + s.jawDrop * 6 * sc, sc, s.mouthOpen, s.mouthShape, s.smileAmount);

  // ── CHIN ──
  drawChin(ctx, cx, cy, sc);

  // ── HAIR ──
  drawEinsteinHairV2(ctx, cx, cy, sc, s.breathPhase, s.time);

  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-DRAWING FUNCTIONS — High Detail
// ═══════════════════════════════════════════════════════════════════════════════

function drawNeck(ctx, cx, cy, sc) {
  // Neck
  const neckGrad = ctx.createLinearGradient(cx - 30 * sc, cy + 80 * sc, cx + 30 * sc, cy + 80 * sc);
  neckGrad.addColorStop(0, "#c08850");
  neckGrad.addColorStop(0.5, "#d4a574");
  neckGrad.addColorStop(1, "#c08850");
  ctx.fillStyle = neckGrad;
  ctx.beginPath();
  ctx.moveTo(cx - 30 * sc, cy + 80 * sc);
  ctx.quadraticCurveTo(cx - 28 * sc, cy + 100 * sc, cx - 35 * sc, cy + 140 * sc);
  ctx.lineTo(cx + 35 * sc, cy + 140 * sc);
  ctx.quadraticCurveTo(cx + 28 * sc, cy + 100 * sc, cx + 30 * sc, cy + 80 * sc);
  ctx.closePath();
  ctx.fill();

  // Neck shadow
  const neckShadow = ctx.createLinearGradient(cx, cy + 75 * sc, cx, cy + 95 * sc);
  neckShadow.addColorStop(0, "rgba(0,0,0,0.35)");
  neckShadow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = neckShadow;
  ctx.fillRect(cx - 30 * sc, cy + 75 * sc, 60 * sc, 20 * sc);

  // Collar
  ctx.fillStyle = "#f0ebe3";
  ctx.beginPath();
  ctx.moveTo(cx - 65 * sc, cy + 130 * sc);
  ctx.quadraticCurveTo(cx - 40 * sc, cy + 100 * sc, cx, cy + 110 * sc);
  ctx.quadraticCurveTo(cx + 40 * sc, cy + 100 * sc, cx + 65 * sc, cy + 130 * sc);
  ctx.lineTo(cx + 80 * sc, cy + 200 * sc);
  ctx.lineTo(cx - 80 * sc, cy + 200 * sc);
  ctx.closePath();
  ctx.fill();
  // Collar fold line
  ctx.strokeStyle = "rgba(180,170,160,0.4)";
  ctx.lineWidth = 1 * sc;
  ctx.beginPath();
  ctx.moveTo(cx - 5 * sc, cy + 108 * sc);
  ctx.lineTo(cx - 15 * sc, cy + 145 * sc);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + 5 * sc, cy + 108 * sc);
  ctx.lineTo(cx + 15 * sc, cy + 145 * sc);
  ctx.stroke();
}

function drawFace(ctx, cx, cy, sc, s, aura) {
  // Multi-layer skin shading for depth
  // Base
  const faceBase = ctx.createRadialGradient(cx - 8 * sc, cy - 15 * sc, 15 * sc, cx, cy + 5 * sc, 85 * sc);
  faceBase.addColorStop(0, "#ecd3af");
  faceBase.addColorStop(0.3, "#e0c49a");
  faceBase.addColorStop(0.6, "#d4a574");
  faceBase.addColorStop(0.9, "#c08850");
  faceBase.addColorStop(1, "#a87040");

  ctx.beginPath();
  ctx.ellipse(cx, cy + 8 * sc, 72 * sc, 82 * sc, 0, 0, Math.PI * 2);
  ctx.fillStyle = faceBase;
  ctx.fill();

  // Subtle jaw definition
  ctx.beginPath();
  ctx.ellipse(cx, cy + 8 * sc, 72 * sc, 82 * sc, 0, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(140,95,55,0.25)";
  ctx.lineWidth = 1.5 * sc;
  ctx.stroke();

  // Cheek warmth
  const cheekL = ctx.createRadialGradient(cx - 38 * sc, cy + 18 * sc, 2 * sc, cx - 38 * sc, cy + 18 * sc, 22 * sc);
  cheekL.addColorStop(0, "rgba(200,140,110,0.2)");
  cheekL.addColorStop(1, "rgba(200,140,110,0)");
  ctx.fillStyle = cheekL;
  ctx.fillRect(cx - 60 * sc, cy, 45 * sc, 40 * sc);

  const cheekR = ctx.createRadialGradient(cx + 38 * sc, cy + 18 * sc, 2 * sc, cx + 38 * sc, cy + 18 * sc, 22 * sc);
  cheekR.addColorStop(0, "rgba(200,140,110,0.2)");
  cheekR.addColorStop(1, "rgba(200,140,110,0)");
  ctx.fillStyle = cheekR;
  ctx.fillRect(cx + 15 * sc, cy, 45 * sc, 40 * sc);

  // Forehead highlight
  const fhLight = ctx.createRadialGradient(cx, cy - 40 * sc, 5 * sc, cx, cy - 40 * sc, 35 * sc);
  fhLight.addColorStop(0, "rgba(255,245,230,0.12)");
  fhLight.addColorStop(1, "rgba(255,245,230,0)");
  ctx.fillStyle = fhLight;
  ctx.fillRect(cx - 40 * sc, cy - 70 * sc, 80 * sc, 50 * sc);

  // Temple shadows
  const tempL = ctx.createLinearGradient(cx - 72 * sc, cy - 20 * sc, cx - 50 * sc, cy - 20 * sc);
  tempL.addColorStop(0, "rgba(100,70,40,0.2)");
  tempL.addColorStop(1, "rgba(100,70,40,0)");
  ctx.fillStyle = tempL;
  ctx.fillRect(cx - 72 * sc, cy - 40 * sc, 25 * sc, 50 * sc);

  const tempR = ctx.createLinearGradient(cx + 72 * sc, cy - 20 * sc, cx + 50 * sc, cy - 20 * sc);
  tempR.addColorStop(0, "rgba(100,70,40,0.2)");
  tempR.addColorStop(1, "rgba(100,70,40,0)");
  ctx.fillStyle = tempR;
  ctx.fillRect(cx + 47 * sc, cy - 40 * sc, 25 * sc, 50 * sc);
}

function drawDetailedEar(ctx, x, y, sc, flip) {
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);

  // Outer ear
  const earGrad = ctx.createRadialGradient(0, 0, 2 * sc, 0, 0, 14 * sc);
  earGrad.addColorStop(0, "#ddb68a");
  earGrad.addColorStop(1, "#c09060");
  ctx.fillStyle = earGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, 10 * sc, 18 * sc, 0.15, 0, Math.PI * 2);
  ctx.fill();

  // Inner ear detail
  ctx.strokeStyle = "rgba(140,100,60,0.35)";
  ctx.lineWidth = 0.8 * sc;
  ctx.beginPath();
  ctx.ellipse(-2 * sc, -1 * sc, 5 * sc, 12 * sc, 0.15, 0, Math.PI * 2);
  ctx.stroke();

  // Ear lobe
  ctx.fillStyle = "rgba(210,170,130,0.5)";
  ctx.beginPath();
  ctx.ellipse(-1 * sc, 14 * sc, 5 * sc, 5 * sc, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawWrinkles(ctx, cx, cy, sc, s) {
  ctx.strokeStyle = "rgba(150,110,70,0.18)";
  ctx.lineWidth = 0.9 * sc;

  // Forehead wrinkles (4 lines, responsive to brow)
  for (let i = 0; i < 4; i++) {
    const wy = cy - 48 * sc + i * 8 * sc - s.browRaise * 6 * sc;
    const waviness = Math.sin(i * 1.2) * 1.5 * sc;
    ctx.beginPath();
    ctx.moveTo(cx - 35 * sc, wy + waviness);
    ctx.bezierCurveTo(
      cx - 15 * sc, wy - 2 * sc + waviness,
      cx + 15 * sc, wy + 1 * sc - waviness,
      cx + 35 * sc, wy + waviness
    );
    ctx.stroke();
  }

  // Glabellar lines (between brows)
  ctx.strokeStyle = "rgba(150,110,70,0.12)";
  ctx.beginPath();
  ctx.moveTo(cx - 6 * sc, cy - 30 * sc - s.browRaise * 4 * sc);
  ctx.lineTo(cx - 4 * sc, cy - 38 * sc - s.browRaise * 5 * sc);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + 6 * sc, cy - 30 * sc - s.browRaise * 4 * sc);
  ctx.lineTo(cx + 4 * sc, cy - 38 * sc - s.browRaise * 5 * sc);
  ctx.stroke();
}

function drawEinsteinBrow(ctx, x, y, w, sc, flip) {
  ctx.save();
  if (flip) { ctx.translate(x + w, y); ctx.scale(-1, 1); }
  else { ctx.translate(x, y); }

  // Multi-stroke bushy brows
  for (let i = 0; i < 7; i++) {
    const offY = (i - 3) * 1.8 * sc;
    const offX = (i - 3) * 0.6 * sc;
    const thick = (3 - Math.abs(i - 3) * 0.6) * sc;
    ctx.strokeStyle = `rgba(210,210,205,${0.35 + (i % 3) * 0.12})`;
    ctx.lineWidth = thick;
    ctx.beginPath();
    ctx.moveTo(offX, offY + 3 * sc);
    ctx.bezierCurveTo(w * 0.2 + offX, offY - 5 * sc, w * 0.6 + offX, offY - 3 * sc, w + offX, offY + 2 * sc);
    ctx.stroke();
  }

  // Wispy tips
  ctx.strokeStyle = "rgba(220,220,215,0.2)";
  ctx.lineWidth = 0.7 * sc;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(w * (0.7 + i * 0.1), -3 * sc + i * 2 * sc);
    ctx.lineTo(w + 5 * sc + i * 3 * sc, -5 * sc + i * 3 * sc);
    ctx.stroke();
  }

  ctx.restore();
}

function drawDetailedEye(ctx, x, y, sc, openness, wander, irisColor, isRight) {
  const eyeH = 12 * sc * openness;

  if (eyeH < 0.5) {
    // Closed
    ctx.strokeStyle = "rgba(80,50,30,0.5)";
    ctx.lineWidth = 1.8 * sc;
    ctx.beginPath();
    ctx.moveTo(x - 15 * sc, y);
    ctx.bezierCurveTo(x - 5 * sc, y - 1.5 * sc, x + 5 * sc, y - 1.5 * sc, x + 15 * sc, y);
    ctx.stroke();
    // Lashes when closed
    ctx.strokeStyle = "rgba(60,40,20,0.3)";
    ctx.lineWidth = 0.6 * sc;
    for (let i = 0; i < 5; i++) {
      const lx = x - 10 * sc + i * 5 * sc;
      ctx.beginPath();
      ctx.moveTo(lx, y);
      ctx.lineTo(lx, y - 3 * sc);
      ctx.stroke();
    }
    return;
  }

  // Eye socket shadow
  const socketShadow = ctx.createRadialGradient(x, y, 5 * sc, x, y, 18 * sc);
  socketShadow.addColorStop(0, "rgba(100,70,40,0)");
  socketShadow.addColorStop(1, "rgba(100,70,40,0.12)");
  ctx.fillStyle = socketShadow;
  ctx.beginPath();
  ctx.ellipse(x, y, 18 * sc, 14 * sc, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sclera
  const scleraGrad = ctx.createRadialGradient(x, y, 3 * sc, x, y, 15 * sc);
  scleraGrad.addColorStop(0, "#f8f3ec");
  scleraGrad.addColorStop(0.8, "#ede6db");
  scleraGrad.addColorStop(1, "#ddd5c8");
  ctx.fillStyle = scleraGrad;
  ctx.beginPath();
  ctx.ellipse(x, y, 15 * sc, eyeH, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eye outline
  ctx.strokeStyle = "rgba(80,55,30,0.4)";
  ctx.lineWidth = 1.2 * sc;
  ctx.beginPath();
  ctx.ellipse(x, y, 15 * sc, eyeH, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Iris + pupil (clipped)
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, 15 * sc, eyeH, 0, 0, Math.PI * 2);
  ctx.clip();

  const ix = x + wander.x * sc;
  const iy = y + wander.y * sc;

  // Iris
  const irisGrad = ctx.createRadialGradient(ix - 1 * sc, iy - 1 * sc, 1 * sc, ix, iy, 9 * sc);
  irisGrad.addColorStop(0, irisColor);
  irisGrad.addColorStop(0.6, irisColor);
  irisGrad.addColorStop(0.85, shadeColor(irisColor, -30));
  irisGrad.addColorStop(1, "rgba(30,20,10,0.4)");
  ctx.fillStyle = irisGrad;
  ctx.beginPath();
  ctx.arc(ix, iy, 9 * sc, 0, Math.PI * 2);
  ctx.fill();

  // Iris detail ring
  ctx.strokeStyle = shadeColor(irisColor, -40) + "40";
  ctx.lineWidth = 0.5 * sc;
  ctx.beginPath();
  ctx.arc(ix, iy, 7 * sc, 0, Math.PI * 2);
  ctx.stroke();

  // Pupil
  ctx.fillStyle = "#080808";
  ctx.beginPath();
  ctx.arc(ix, iy, 4.5 * sc, 0, Math.PI * 2);
  ctx.fill();

  // Specular highlights
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.arc(ix - 3 * sc, iy - 3 * sc, 2 * sc, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.arc(ix + 2 * sc, iy + 1.5 * sc, 1 * sc, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Crow's feet
  ctx.strokeStyle = "rgba(150,110,70,0.13)";
  ctx.lineWidth = 0.6 * sc;
  const side = isRight ? 1 : -1;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(x + side * 16 * sc, y + (i - 1.5) * 3.5 * sc);
    ctx.lineTo(x + side * 24 * sc, y + (i - 1.5) * 5 * sc);
    ctx.stroke();
  }

  // Upper eyelid crease
  ctx.strokeStyle = "rgba(140,100,60,0.22)";
  ctx.lineWidth = 0.8 * sc;
  ctx.beginPath();
  ctx.ellipse(x, y - 6 * sc, 16 * sc, 6 * sc, 0, Math.PI + 0.3, -0.3);
  ctx.stroke();

  // Eye bags
  ctx.strokeStyle = "rgba(140,100,60,0.1)";
  ctx.lineWidth = 0.7 * sc;
  ctx.beginPath();
  ctx.ellipse(x, y + 9 * sc, 13 * sc, 4 * sc, 0, 0.3, Math.PI - 0.3);
  ctx.stroke();

  // Slight eyelash thickness on upper lid
  ctx.strokeStyle = "rgba(60,40,20,0.3)";
  ctx.lineWidth = 1.5 * sc;
  ctx.beginPath();
  ctx.ellipse(x, y, 15 * sc, eyeH, 0, Math.PI + 0.15, -0.15);
  ctx.stroke();
}

function drawDetailedNose(ctx, x, y, sc) {
  // Bridge
  ctx.strokeStyle = "rgba(150,110,70,0.18)";
  ctx.lineWidth = 1.2 * sc;
  ctx.beginPath();
  ctx.moveTo(x - 3 * sc, y - 30 * sc);
  ctx.bezierCurveTo(x - 5 * sc, y - 12 * sc, x - 8 * sc, y - 2 * sc, x - 11 * sc, y + 4 * sc);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 3 * sc, y - 30 * sc);
  ctx.bezierCurveTo(x + 5 * sc, y - 12 * sc, x + 8 * sc, y - 2 * sc, x + 11 * sc, y + 4 * sc);
  ctx.stroke();

  // Nose tip
  const noseTip = ctx.createRadialGradient(x, y + 3 * sc, 2 * sc, x, y + 3 * sc, 11 * sc);
  noseTip.addColorStop(0, "rgba(210,170,130,0.35)");
  noseTip.addColorStop(1, "rgba(210,170,130,0)");
  ctx.fillStyle = noseTip;
  ctx.beginPath();
  ctx.ellipse(x, y + 3 * sc, 11 * sc, 7 * sc, 0, 0, Math.PI * 2);
  ctx.fill();

  // Nostrils
  ctx.fillStyle = "rgba(90,55,25,0.4)";
  ctx.beginPath();
  ctx.ellipse(x - 6 * sc, y + 7 * sc, 4 * sc, 2.5 * sc, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + 6 * sc, y + 7 * sc, 4 * sc, 2.5 * sc, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Bridge highlight
  ctx.fillStyle = "rgba(255,245,225,0.1)";
  ctx.beginPath();
  ctx.ellipse(x + 1 * sc, y - 8 * sc, 3.5 * sc, 12 * sc, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawNasolabialFolds(ctx, cx, cy, sc, s) {
  const smOff = s.smileAmount * 4 * sc;
  ctx.strokeStyle = "rgba(150,110,70,0.16)";
  ctx.lineWidth = 1 * sc;

  // Left fold
  ctx.beginPath();
  ctx.moveTo(cx - 24 * sc, cy + 10 * sc);
  ctx.bezierCurveTo(
    cx - 28 * sc, cy + 25 * sc,
    cx - 26 * sc, cy + 38 * sc,
    cx - 22 * sc - smOff, cy + 50 * sc
  );
  ctx.stroke();

  // Right fold
  ctx.beginPath();
  ctx.moveTo(cx + 24 * sc, cy + 10 * sc);
  ctx.bezierCurveTo(
    cx + 28 * sc, cy + 25 * sc,
    cx + 26 * sc, cy + 38 * sc,
    cx + 22 * sc + smOff, cy + 50 * sc
  );
  ctx.stroke();
}

function drawDetailedMustache(ctx, x, y, sc, mouthOpen) {
  const spread = 1 + mouthOpen * 0.12;

  // Shadow under mustache
  ctx.fillStyle = "rgba(0,0,0,0.1)";
  ctx.beginPath();
  ctx.ellipse(x, y + 4 * sc, 38 * sc, 6 * sc, 0, 0, Math.PI);
  ctx.fill();

  // Main mustache body — left
  const mustGrad = ctx.createLinearGradient(x - 40 * sc, y, x + 40 * sc, y);
  mustGrad.addColorStop(0, "#c5c0b5");
  mustGrad.addColorStop(0.3, "#d8d4cc");
  mustGrad.addColorStop(0.5, "#e0dcd5");
  mustGrad.addColorStop(0.7, "#d8d4cc");
  mustGrad.addColorStop(1, "#c5c0b5");
  ctx.fillStyle = mustGrad;

  // Left half
  ctx.beginPath();
  ctx.moveTo(x - 3 * sc, y - 4 * sc);
  ctx.bezierCurveTo(x - 12 * sc, y - 10 * sc * spread, x - 28 * sc, y - 9 * sc * spread, x - 40 * sc, y - 2 * sc);
  ctx.quadraticCurveTo(x - 42 * sc, y + 4 * sc, x - 34 * sc, y + 7 * sc);
  ctx.quadraticCurveTo(x - 16 * sc, y + 3 * sc, x - 3 * sc, y + 3 * sc);
  ctx.closePath();
  ctx.fill();

  // Right half
  ctx.beginPath();
  ctx.moveTo(x + 3 * sc, y - 4 * sc);
  ctx.bezierCurveTo(x + 12 * sc, y - 10 * sc * spread, x + 28 * sc, y - 9 * sc * spread, x + 40 * sc, y - 2 * sc);
  ctx.quadraticCurveTo(x + 42 * sc, y + 4 * sc, x + 34 * sc, y + 7 * sc);
  ctx.quadraticCurveTo(x + 16 * sc, y + 3 * sc, x + 3 * sc, y + 3 * sc);
  ctx.closePath();
  ctx.fill();

  // Mustache hair texture
  ctx.strokeStyle = "rgba(170,165,155,0.22)";
  ctx.lineWidth = 0.5 * sc;
  for (let i = 0; i < 12; i++) {
    const startX = x + (i - 6) * 6 * sc;
    const dir = i < 6 ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(startX, y - 5 * sc);
    ctx.bezierCurveTo(startX + dir * 4 * sc, y - 2 * sc, startX + dir * 6 * sc, y + 1 * sc, startX + dir * 8 * sc, y + 5 * sc);
    ctx.stroke();
  }

  // Mustache outline
  ctx.strokeStyle = "rgba(160,155,145,0.25)";
  ctx.lineWidth = 0.6 * sc;
  ctx.beginPath();
  ctx.moveTo(x - 40 * sc, y - 2 * sc);
  ctx.quadraticCurveTo(x, y - 10 * sc * spread, x + 40 * sc, y - 2 * sc);
  ctx.stroke();
}

function drawDetailedMouth(ctx, x, y, sc, openness, shape, smile) {
  const openH = openness * 16 * sc;
  const smileOff = smile * 5 * sc;
  const w = 24 * sc;

  if (openH < 1) {
    // Closed
    ctx.strokeStyle = "rgba(170,110,90,0.55)";
    ctx.lineWidth = 1.8 * sc;
    ctx.beginPath();
    ctx.moveTo(x - w, y);
    ctx.bezierCurveTo(x - w * 0.5, y + smileOff + 1 * sc, x + w * 0.5, y + smileOff + 1 * sc, x + w, y);
    ctx.stroke();

    // Upper lip definition
    ctx.strokeStyle = "rgba(170,110,90,0.2)";
    ctx.lineWidth = 0.8 * sc;
    ctx.beginPath();
    ctx.moveTo(x - w * 0.8, y - 1 * sc);
    ctx.bezierCurveTo(x - w * 0.3, y - 3 * sc, x + w * 0.3, y - 3 * sc, x + w * 0.8, y - 1 * sc);
    ctx.stroke();
    return;
  }

  // Open mouth cavity
  const roundness = shape === 4 ? 0.8 : 0;
  const mw = w * (1 - roundness * 0.3);

  // Mouth shadow
  ctx.fillStyle = "#2a1008";
  ctx.beginPath();
  ctx.moveTo(x - mw, y);
  ctx.bezierCurveTo(x - mw * 0.5, y - 3 * sc, x + mw * 0.5, y - 3 * sc, x + mw, y);
  ctx.bezierCurveTo(x + mw * 0.6, y + openH * 0.6 + smileOff, x - mw * 0.6, y + openH * 0.6 + smileOff, x - mw, y);
  ctx.closePath();
  ctx.fill();

  // Inner mouth
  const mouthGrad = ctx.createLinearGradient(x, y, x, y + openH);
  mouthGrad.addColorStop(0, "#3a1a10");
  mouthGrad.addColorStop(1, "#501818");
  ctx.fillStyle = mouthGrad;
  ctx.beginPath();
  ctx.moveTo(x - mw, y);
  ctx.bezierCurveTo(x - mw * 0.5, y - 2 * sc, x + mw * 0.5, y - 2 * sc, x + mw, y);
  ctx.bezierCurveTo(x + mw * 0.6, y + openH + smileOff, x - mw * 0.6, y + openH + smileOff, x - mw, y);
  ctx.closePath();
  ctx.fill();

  // Teeth
  if (openH > 5 * sc) {
    ctx.fillStyle = "rgba(245,240,232,0.88)";
    const teethH = Math.min(openH * 0.35, 7 * sc);
    ctx.beginPath();
    // Manual rounded rect for browser compat
    const tx = x - mw * 0.55, ty = y + 0.5 * sc, tw = mw * 1.1, th = teethH, tr = 2 * sc;
    ctx.moveTo(tx + tr, ty);
    ctx.lineTo(tx + tw - tr, ty);
    ctx.arcTo(tx + tw, ty, tx + tw, ty + tr, tr);
    ctx.lineTo(tx + tw, ty + th - tr);
    ctx.arcTo(tx + tw, ty + th, tx + tw - tr, ty + th, tr);
    ctx.lineTo(tx + tr, ty + th);
    ctx.arcTo(tx, ty + th, tx, ty + th - tr, tr);
    ctx.lineTo(tx, ty + tr);
    ctx.arcTo(tx, ty, tx + tr, ty, tr);
    ctx.fill();

    // Tooth line
    ctx.strokeStyle = "rgba(200,195,185,0.3)";
    ctx.lineWidth = 0.4 * sc;
    ctx.beginPath();
    ctx.moveTo(x, y + 1 * sc);
    ctx.lineTo(x, y + teethH);
    ctx.stroke();
  }

  // Tongue
  if (openH > 9 * sc) {
    const tongueGrad = ctx.createRadialGradient(x, y + openH * 0.6, 2 * sc, x, y + openH * 0.6, mw * 0.4);
    tongueGrad.addColorStop(0, "#d06060");
    tongueGrad.addColorStop(1, "#a04040");
    ctx.fillStyle = tongueGrad;
    ctx.beginPath();
    ctx.ellipse(x, y + openH * 0.62, mw * 0.4, openH * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Upper lip
  ctx.strokeStyle = "rgba(190,130,110,0.45)";
  ctx.lineWidth = 1.4 * sc;
  ctx.beginPath();
  ctx.moveTo(x - mw, y);
  ctx.bezierCurveTo(x - mw * 0.3, y - 4 * sc, x + mw * 0.3, y - 4 * sc, x + mw, y);
  ctx.stroke();

  // Lower lip
  ctx.strokeStyle = "rgba(190,130,110,0.25)";
  ctx.lineWidth = 1.2 * sc;
  ctx.beginPath();
  ctx.moveTo(x - mw * 0.7, y + openH + smileOff);
  ctx.bezierCurveTo(x, y + openH + smileOff + 4 * sc, x, y + openH + smileOff + 4 * sc, x + mw * 0.7, y + openH + smileOff);
  ctx.stroke();
}

function drawChin(ctx, cx, cy, sc) {
  // Chin dimple / definition
  ctx.strokeStyle = "rgba(150,110,70,0.12)";
  ctx.lineWidth = 0.9 * sc;
  ctx.beginPath();
  ctx.arc(cx, cy + 72 * sc, 16 * sc, 0.25, Math.PI - 0.25);
  ctx.stroke();

  // Subtle chin highlight
  const chinHL = ctx.createRadialGradient(cx, cy + 68 * sc, 2 * sc, cx, cy + 68 * sc, 12 * sc);
  chinHL.addColorStop(0, "rgba(255,245,230,0.06)");
  chinHL.addColorStop(1, "rgba(255,245,230,0)");
  ctx.fillStyle = chinHL;
  ctx.beginPath();
  ctx.arc(cx, cy + 68 * sc, 12 * sc, 0, Math.PI * 2);
  ctx.fill();
}

function drawEinsteinHairV2(ctx, cx, cy, sc, breathPhase, time) {
  const colors = ["#e8e4df", "#d5d0c8", "#c8c2b8", "#bab4a8"];
  const wave = Math.sin(breathPhase * 0.4) * 2.5 * sc;
  const wave2 = Math.cos(time * 0.3) * 1.5 * sc;

  ctx.save();

  // ── Layer 1: Deep back volume ──
  ctx.fillStyle = colors[3];
  ctx.beginPath();
  ctx.moveTo(cx - 76 * sc, cy - 10 * sc);
  ctx.bezierCurveTo(cx - 90 * sc + wave, cy - 50 * sc, cx - 78 * sc, cy - 85 * sc, cx - 50 * sc, cy - 95 * sc);
  ctx.bezierCurveTo(cx - 20 * sc, cy - 108 * sc - wave2, cx + 20 * sc, cy - 108 * sc + wave2, cx + 50 * sc, cy - 95 * sc);
  ctx.bezierCurveTo(cx + 78 * sc, cy - 85 * sc, cx + 90 * sc - wave, cy - 50 * sc, cx + 76 * sc, cy - 10 * sc);
  ctx.quadraticCurveTo(cx + 78 * sc, cy + 5 * sc, cx + 72 * sc, cy + 12 * sc);
  ctx.lineTo(cx + 68 * sc, cy + 5 * sc);
  ctx.bezierCurveTo(cx + 65 * sc, cy - 25 * sc, cx + 50 * sc, cy - 50 * sc, cx, cy - 62 * sc);
  ctx.bezierCurveTo(cx - 50 * sc, cy - 50 * sc, cx - 65 * sc, cy - 25 * sc, cx - 68 * sc, cy + 5 * sc);
  ctx.lineTo(cx - 72 * sc, cy + 12 * sc);
  ctx.quadraticCurveTo(cx - 78 * sc, cy + 5 * sc, cx - 76 * sc, cy - 10 * sc);
  ctx.closePath();
  ctx.fill();

  // ── Layer 2: Mid volume ──
  ctx.fillStyle = colors[2];
  ctx.beginPath();
  ctx.moveTo(cx - 72 * sc, cy - 5 * sc);
  ctx.bezierCurveTo(cx - 84 * sc + wave * 0.7, cy - 45 * sc, cx - 70 * sc, cy - 78 * sc, cx - 45 * sc, cy - 90 * sc);
  ctx.bezierCurveTo(cx - 15 * sc, cy - 102 * sc - wave2 * 0.7, cx + 15 * sc, cy - 102 * sc + wave2 * 0.7, cx + 45 * sc, cy - 90 * sc);
  ctx.bezierCurveTo(cx + 70 * sc, cy - 78 * sc, cx + 84 * sc - wave * 0.7, cy - 45 * sc, cx + 72 * sc, cy - 5 * sc);
  ctx.bezierCurveTo(cx + 60 * sc, cy - 30 * sc, cx + 42 * sc, cy - 52 * sc, cx, cy - 58 * sc);
  ctx.bezierCurveTo(cx - 42 * sc, cy - 52 * sc, cx - 60 * sc, cy - 30 * sc, cx - 72 * sc, cy - 5 * sc);
  ctx.closePath();
  ctx.fill();

  // ── Layer 3: Top highlight ──
  ctx.fillStyle = colors[1];
  ctx.beginPath();
  ctx.moveTo(cx - 60 * sc, cy - 35 * sc);
  ctx.bezierCurveTo(cx - 68 * sc + wave * 0.5, cy - 60 * sc, cx - 52 * sc, cy - 80 * sc, cx - 35 * sc, cy - 88 * sc);
  ctx.bezierCurveTo(cx - 8 * sc, cy - 98 * sc, cx + 8 * sc, cy - 97 * sc, cx + 35 * sc, cy - 86 * sc);
  ctx.bezierCurveTo(cx + 52 * sc, cy - 78 * sc, cx + 68 * sc - wave * 0.5, cy - 58 * sc, cx + 58 * sc, cy - 38 * sc);
  ctx.bezierCurveTo(cx + 42 * sc, cy - 52 * sc, cx + 20 * sc, cy - 56 * sc, cx, cy - 55 * sc);
  ctx.bezierCurveTo(cx - 20 * sc, cy - 56 * sc, cx - 42 * sc, cy - 52 * sc, cx - 60 * sc, cy - 35 * sc);
  ctx.closePath();
  ctx.fill();

  // ── Layer 4: Top bright highlight ──
  ctx.fillStyle = colors[0];
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.moveTo(cx - 40 * sc, cy - 55 * sc);
  ctx.bezierCurveTo(cx - 45 * sc, cy - 72 * sc, cx - 25 * sc, cy - 88 * sc, cx, cy - 90 * sc);
  ctx.bezierCurveTo(cx + 25 * sc, cy - 88 * sc, cx + 45 * sc, cy - 72 * sc, cx + 40 * sc, cy - 55 * sc);
  ctx.bezierCurveTo(cx + 25 * sc, cy - 62 * sc, cx, cy - 60 * sc, cx - 25 * sc, cy - 62 * sc);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // ── Wild strands ──
  ctx.strokeStyle = "rgba(240,238,232,0.28)";
  ctx.lineWidth = 1.4 * sc;

  const strands = [
    { sx: -68, sy: -25, c1x: -88 + wave, c1y: -55, c2x: -80, c2y: -75, ex: -72, ey: -88 },
    { sx: -55, sy: -50, c1x: -72 + wave * 0.8, c1y: -75, c2x: -65, c2y: -90, ex: -55, ey: -100 },
    { sx: -35, sy: -60, c1x: -40 - wave * 0.5, c1y: -85, c2x: -38, c2y: -95, ex: -42, ey: -105 },
    { sx: -10, sy: -62, c1x: -5 + wave * 0.3, c1y: -92, c2x: -8, c2y: -100, ex: -12, ey: -108 },
    { sx: 15, sy: -60, c1x: 20 - wave * 0.3, c1y: -88, c2x: 22, c2y: -98, ex: 18, ey: -106 },
    { sx: 40, sy: -55, c1x: 55 + wave * 0.6, c1y: -78, c2x: 52, c2y: -90, ex: 48, ey: -100 },
    { sx: 62, sy: -35, c1x: 82 - wave * 0.8, c1y: -55, c2x: 78, c2y: -72, ex: 70, ey: -85 },
    { sx: 70, sy: -15, c1x: 90 - wave, c1y: -35, c2x: 85, c2y: -55, ex: 78, ey: -65 },
    { sx: -72, sy: 0, c1x: -92 + wave, c1y: -20, c2x: -88, c2y: -42, ex: -80, ey: -55 },
    // Side wisps
    { sx: -74, sy: 10, c1x: -90 + wave * 0.5, c1y: -5, c2x: -88, c2y: -18, ex: -82, ey: -30 },
    { sx: 74, sy: 10, c1x: 90 - wave * 0.5, c1y: -5, c2x: 88, c2y: -18, ex: 82, ey: -30 },
    // Flyaway top strands
    { sx: -20, sy: -65, c1x: -25, c1y: -95 - wave2, c2x: -15, c2y: -105, ex: -20, ey: -112 },
    { sx: 5, sy: -64, c1x: 3, c1y: -96 + wave2, c2x: 8, c2y: -106, ex: 5, ey: -112 },
  ];

  strands.forEach(st => {
    ctx.beginPath();
    ctx.moveTo(cx + st.sx * sc, cy + st.sy * sc);
    ctx.bezierCurveTo(
      cx + st.c1x * sc, cy + st.c1y * sc,
      cx + st.c2x * sc, cy + st.c2y * sc,
      cx + st.ex * sc, cy + st.ey * sc
    );
    ctx.stroke();
  });

  // ── Flyaway wisps ──
  ctx.strokeStyle = "rgba(255,255,250,0.12)";
  ctx.lineWidth = 0.7 * sc;
  for (let i = 0; i < 10; i++) {
    const angle = -1.2 + i * 0.25 + wave * 0.005;
    const r1 = 62 * sc;
    const r2 = (78 + Math.sin(i * 2.1) * 10) * sc;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * r1, cy - 45 * sc + Math.sin(angle) * r1 * 0.35);
    ctx.lineTo(cx + Math.cos(angle) * r2, cy - 45 * sc + Math.sin(angle) * r2 * 0.35);
    ctx.stroke();
  }

  ctx.restore();
}

// Utility: darken/lighten a hex color
function shadeColor(color, percent) {
  let num = parseInt(color.replace("#", ""), 16);
  let r = Math.min(255, Math.max(0, (num >> 16) + percent));
  let g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + percent));
  let b = Math.min(255, Math.max(0, (num & 0x0000FF) + percent));
  return "#" + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
}
