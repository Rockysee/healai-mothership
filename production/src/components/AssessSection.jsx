"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  EQ_QUESTIONS  as EQ_BANK,
  IQ_QUESTIONS  as IQ_BANK,
  PERSONALITY_QUESTIONS as PERSONALITY_BANK,
  PERSONALITY_TYPES,
  getAgeGroup,
} from '@/data/QuestionBank';

const DESIGN = {
  bg: '#0a0a0b',
  surface: 'rgba(255,255,255,0.04)',
  surfaceHover: 'rgba(255,255,255,0.07)',
  border: 'rgba(255,255,255,0.08)',
  borderHover: 'rgba(255,255,255,0.16)',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.5)',
  textMuted: 'rgba(255,255,255,0.25)',
  green: '#22c55e',
  greenGlow: 'rgba(34,197,94,0.15)',
  fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
};

// Age-aware question selector — returns flat array for the student's grade
function getQuestions(type, grade) {
  const ag = getAgeGroup(grade);
  if (type === 'eq')          return EQ_BANK[ag]          || EQ_BANK.teen;
  if (type === 'iq')          return IQ_BANK[ag]          || IQ_BANK.teen;
  if (type === 'personality') return PERSONALITY_BANK[ag] || PERSONALITY_BANK.teen;
  return [];
}

const STRENGTH_CHALLENGES = {
  'Empathy': [
    { topic: 'Biology', subtopic: 'Neural communication', q: 'How do neurons transmit empathy signals?', diff: 'B-Rank', xp: 250 },
    { topic: 'Biology', subtopic: 'Nervous system', q: 'How does the autonomic nervous system mirror social connection?', diff: 'B-Rank', xp: 250 },
  ],
  'Self-Awareness': [
    { topic: 'Psychology', subtopic: 'Metacognition', q: 'What brain regions activate during self-reflection?', diff: 'B-Rank', xp: 250 },
  ],
  'Self-Regulation': [
    { topic: 'Physics', subtopic: 'Equilibrium', q: 'How does dynamic equilibrium mirror emotional balance?', diff: 'S-Rank', xp: 600 },
  ],
  'Motivation': [
    { topic: 'Physics', subtopic: 'Momentum', q: 'How does momentum model unstoppable drive?', diff: 'D-Rank', xp: 100 },
  ],
  'Social Skills': [
    { topic: 'Chemistry', subtopic: 'Catalysts', q: 'How do catalysts mirror social connectors?', diff: 'B-Rank', xp: 250 },
  ],
  'Pattern': [
    { topic: 'Mathematics', subtopic: 'Sequences', q: 'Find the pattern in the Fibonacci spiral.', diff: 'B-Rank', xp: 250 },
  ],
  'Spatial': [
    { topic: 'Physics', subtopic: '3D geometry', q: 'How does spatial reasoning help in optics problems?', diff: 'S-Rank', xp: 600 },
  ],
  'Memory': [
    { topic: 'Biology', subtopic: 'Memory formation', q: 'What strengthens long-term potentiation?', diff: 'D-Rank', xp: 100 },
  ],
  'Logic': [
    { topic: 'Mathematics', subtopic: 'Proof theory', q: 'Construct a logical proof for the AM-GM inequality.', diff: 'S-Rank', xp: 600 },
  ],
};

const STRENGTH_TITLES = {
  'Empathy+Pattern': 'Empathic Analyst',
  'Empathy+Spatial': 'Spatial Empath',
  'Empathy+Memory': 'Empathic Archivist',
  'Empathy+Logic': 'Empathic Strategist',
  'Self-Awareness+Pattern': 'Reflective Analyst',
  'Self-Awareness+Spatial': 'Introspective Visionary',
  'Self-Awareness+Logic': 'Philosophical Mind',
  'Motivation+Pattern': 'Driven Innovator',
  'Motivation+Logic': 'Strategic Commander',
  'Social Skills+Pattern': 'Social Architect',
  'Social Skills+Logic': 'Collaborative Leader',
  'Self-Regulation+Logic': 'Disciplined Thinker',
  'Self-Regulation+Memory': 'Precise Practitioner',
};

const DOMAIN_AFFIRMATIONS = {
  'Empathy': '🌊 Your emotional attunement is your superpower.',
  'Self-Awareness': '🔍 You see yourself clearly — that clarity leads.',
  'Self-Regulation': '⚖️ Your balance is your competitive edge.',
  'Social Skills': '🤝 You connect where others miss the moment.',
  'Motivation': '⚡ Your drive compounds every single day.',
  'Pattern': '🎨 You see patterns others overlook entirely.',
  'Spatial': '🔭 You navigate dimensions with natural ease.',
  'Memory': '📖 You archive knowledge with precision.',
  'Logic': '⚙️ Your reasoning cuts through complexity.',
};

function normCDF(x) {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
  return 0.5 * (1.0 + sign * y);
}

function computeEQScoreAndDomains(responses, questions) {
  const domains = { 'Self-Awareness': 0, 'Self-Regulation': 0, Empathy: 0, 'Social Skills': 0, Motivation: 0 };
  const domainCounts = { 'Self-Awareness': 0, 'Self-Regulation': 0, Empathy: 0, 'Social Skills': 0, Motivation: 0 };

  responses.forEach((resp) => {
    const q = questions[resp.qIdx];
    if (!q) return;
    domains[q.domain] += resp.chosen === q.correct ? q.pts[q.correct] : (resp.chosen < q.pts.length ? q.pts[resp.chosen] : 0);
    domainCounts[q.domain]++;
  });

  const domainAvgs = Object.keys(domains).map((d) => ({
    domain: d,
    score: domainCounts[d] > 0 ? Math.round((domains[d] / (domainCounts[d] * 3)) * 100) : 0,
  }));

  const avgScore = Math.round(domainAvgs.reduce((s, d) => s + d.score, 0) / domainAvgs.length);
  const band = avgScore >= 80 ? 'EXCEPTIONAL' : avgScore >= 60 ? 'CAPABLE' : 'DEVELOPING';

  return { score: avgScore, band, domains: domainAvgs };
}

function computeIQScoreAndDomains(responses, questions) {
  const domains = { Pattern: 0, Spatial: 0, Memory: 0, Logic: 0 };
  const domainPts = { Pattern: 0, Spatial: 0, Memory: 0, Logic: 0 };

  responses.forEach((resp) => {
    const q = questions[resp.qIdx];
    if (!q) return;
    const pts = resp.chosen === q.correct ? q.pts[q.correct] : 0;
    domains[q.domain] += pts;
    domainPts[q.domain] += q.pts[q.correct] || q.pts[0] || 10;
  });

  const totalPts = Object.values(domainPts).reduce((a, b) => a + b, 0);
  const rawScore = Object.values(domains).reduce((a, b) => a + b, 0);
  const percentile = Math.round(normCDF((rawScore - totalPts * 0.5) / Math.sqrt(totalPts * 0.25)) * 100);
  const ss = 100 + (percentile - 50) * 0.5;
  const band = ss >= 115 ? 'SUPERIOR' : ss >= 100 ? 'AVERAGE' : 'DEVELOPING';

  const domainAvgs = Object.keys(domains).map((d) => ({
    domain: d,
    score: domainPts[d] > 0 ? Math.round((domains[d] / domainPts[d]) * 100) : 0,
  }));

  return { score: Math.round(ss), band, percentile, domains: domainAvgs };
}

// Personality scoring — tally E/B/C/A, return dominant type
function computePersonalityScore(responses, questions) {
  const tally = { E: 0, B: 0, C: 0, A: 0 };
  responses.forEach((resp) => {
    const q = questions[resp.qIdx];
    if (!q) return;
    const typeCode = q.types[resp.chosen];
    if (typeCode && tally[typeCode] !== undefined) tally[typeCode]++;
  });
  const dominant = Object.keys(tally).reduce((a, b) => tally[a] >= tally[b] ? a : b, 'E');
  const total = responses.length || 1;
  const pct   = Math.round((tally[dominant] / total) * 100);
  return {
    type:        dominant,
    typeProfile: PERSONALITY_TYPES[dominant],
    tally,
    score:       pct,
    band:        pct >= 60 ? 'STRONG' : pct >= 40 ? 'MODERATE' : 'MIXED',
  };
}

function CanvasStrengthRipples({ domain, frameRef }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let frame = 0;
    const animate = () => {
      ctx.fillStyle = DESIGN.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2, cy = canvas.height / 2;
      for (let i = 0; i < 4; i++) {
        const progress = ((frame + i * 25) % 150) / 150;
        const alpha = 1 - progress;
        ctx.strokeStyle = `rgba(34, 197, 94, ${alpha * 0.6})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 30 + progress * 80, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = `rgba(34, 197, 94, 0.15)`;
      ctx.beginPath();
      ctx.arc(cx, cy, 20, 0, Math.PI * 2);
      ctx.fill();
      frame++;
      if (frameRef) frameRef.current = frame;
      requestAnimationFrame(animate);
    };
    animate();
  }, [domain, frameRef]);
  return <canvas ref={canvasRef} width={300} height={300} style={{ maxWidth: '100%', height: 'auto' }} />;
}

function ArchetypeScenarioCanvas({ scenarioIndex }) {
  const canvasRef = useRef(null);

  // Visual themes per scenario (0-indexed, 7 scenarios)
  const themes = [
    { label: 'Under Pressure', color: '#ef4444', symbol: '⚡' },   // scenario 1
    { label: 'Team Conflict',  color: '#f59e0b', symbol: '🤝' },   // scenario 2
    { label: 'New Challenge',  color: '#22c55e', symbol: '🎯' },   // scenario 3
    { label: 'Setback',        color: '#8b5cf6', symbol: '↑' },    // scenario 4
    { label: 'Decision Point', color: '#06b6d4', symbol: '◆' },    // scenario 5
    { label: 'Helping Others', color: '#ec4899', symbol: '◉' },    // scenario 6
    { label: 'Long-term Goal', color: '#22c55e', symbol: '★' },    // scenario 7
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const theme = themes[scenarioIndex % themes.length];
    let frame = 0, rafId;

    const hexColor = theme.color;
    const r = parseInt(hexColor.slice(1,3),16);
    const g = parseInt(hexColor.slice(3,5),16);
    const b = parseInt(hexColor.slice(5,7),16);

    const animate = () => {
      ctx.fillStyle = '#0a0a0b';
      ctx.fillRect(0, 0, W, H);

      // Pulsing outer ring
      const pulse = 0.5 + 0.5 * Math.sin(frame * 0.05);
      for (let i = 3; i >= 1; i--) {
        const alpha = (0.08 + 0.05 * pulse) * (i / 3);
        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.lineWidth = i * 3;
        ctx.beginPath();
        ctx.arc(W / 2, H / 2, 28 + i * 8, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Inner filled circle
      ctx.fillStyle = `rgba(${r},${g},${b},${0.15 + 0.08 * pulse})`;
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, 26, 0, Math.PI * 2);
      ctx.fill();

      // Symbol
      ctx.font = 'bold 22px Inter, sans-serif';
      ctx.fillStyle = `rgba(${r},${g},${b},${0.7 + 0.3 * pulse})`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(theme.symbol, W / 2, H / 2);

      // Scenario label
      ctx.font = '10px Inter, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.textAlign = 'center';
      ctx.fillText(theme.label.toUpperCase(), W / 2, H - 8);

      // Orbiting dot
      const angle = frame * 0.04;
      const dotX = W / 2 + 38 * Math.cos(angle);
      const dotY = H / 2 + 38 * Math.sin(angle);
      ctx.fillStyle = `rgba(${r},${g},${b},${0.6})`;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
      ctx.fill();

      frame++;
      rafId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(rafId);
  }, [scenarioIndex]);

  return (
    <canvas
      ref={canvasRef}
      width={110}
      height={80}
      style={{
        display: 'block',
        margin: '0 auto 12px',
        borderRadius: '8px',
      }}
    />
  );
}

function CanvasScoreArc({ score, frameRef }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const cx = w / 2, cy = h / 2, r = 50;
    let currentArc = 0;
    const targetArc = (score / 100) * Math.PI * 2;
    const animate = () => {
      ctx.fillStyle = DESIGN.bg;
      ctx.fillRect(0, 0, w, h);
      currentArc += (targetArc - currentArc) * 0.02;
      ctx.strokeStyle = DESIGN.border;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = DESIGN.green;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + currentArc);
      ctx.stroke();
      ctx.fillStyle = DESIGN.textPrimary;
      ctx.font = `bold 32px ${DESIGN.fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(score, cx, cy);
      frame++;
      if (frameRef) frameRef.current = frame;
      if (Math.abs(currentArc - targetArc) > 0.01) requestAnimationFrame(animate);
    };
    let frame = 0;
    animate();
  }, [score, frameRef]);
  return <canvas ref={canvasRef} width={120} height={120} style={{ maxWidth: '100%' }} />;
}

function DomainBar({ domain, score, animated }) {
  const [displayScore, setDisplayScore] = useState(animated ? 0 : score);
  useEffect(() => {
    if (!animated) return;
    let current = 0;
    const timer = setInterval(() => {
      current += (score - current) * 0.15;
      if (Math.abs(current - score) < 1) {
        setDisplayScore(score);
        clearInterval(timer);
      } else {
        setDisplayScore(current);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [score, animated]);

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ fontSize: '12px', color: DESIGN.textSecondary, fontWeight: '500', letterSpacing: '0.5px' }}>
          {domain}
        </span>
        <span style={{ fontSize: '11px', color: DESIGN.green, fontWeight: '600' }}>
          {Math.round(displayScore)}%
        </span>
      </div>
      <div style={{ height: '6px', backgroundColor: DESIGN.border, borderRadius: '3px', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            backgroundColor: DESIGN.green,
            width: `${displayScore}%`,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
}

// ── Tarot card question system ─────────────────────────────────────────────

const CARD_THEMES = {
  dharma: { label: 'Dharma', accent: '#22c55e', glow: 'rgba(34,197,94,0.45)'   },
  battle: { label: 'Battle', accent: '#f87171', glow: 'rgba(248,113,113,0.45)' },
  cosmos: { label: 'Cosmos', accent: '#818cf8', glow: 'rgba(129,140,248,0.45)' },
  forge:  { label: 'Forge',  accent: '#fbbf24', glow: 'rgba(251,191,36,0.45)'  },
};

// Rich card designs — SVG art + holographic foil palette
const TAROT_CARD_ART = [
  {
    gradient: 'linear-gradient(155deg, #2d0057 0%, #6b21a8 50%, #a855f7 100%)',
    foil:     'linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.07) 40%, rgba(168,85,247,0.18) 50%, rgba(255,255,255,0.07) 60%, transparent 100%)',
    glow:     'rgba(168,85,247,0.8)',
    accent:   '#e9d5ff',
    symbol:   'eye',     // SVG key
    label:    'WISDOM',
  },
  {
    gradient: 'linear-gradient(155deg, #082040 0%, #0369a1 50%, #38bdf8 100%)',
    foil:     'linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.07) 40%, rgba(56,189,248,0.18) 50%, rgba(255,255,255,0.07) 60%, transparent 100%)',
    glow:     'rgba(56,189,248,0.8)',
    accent:   '#bae6fd',
    symbol:   'moon',
    label:    'FLOW',
  },
  {
    gradient: 'linear-gradient(155deg, #052e16 0%, #15803d 50%, #4ade80 100%)',
    foil:     'linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.07) 40%, rgba(74,222,128,0.18) 50%, rgba(255,255,255,0.07) 60%, transparent 100%)',
    glow:     'rgba(74,222,128,0.8)',
    accent:   '#bbf7d0',
    symbol:   'lotus',
    label:    'GROWTH',
  },
  {
    gradient: 'linear-gradient(155deg, #431407 0%, #c2410c 50%, #fb923c 100%)',
    foil:     'linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.07) 40%, rgba(251,146,60,0.18) 50%, rgba(255,255,255,0.07) 60%, transparent 100%)',
    glow:     'rgba(251,146,60,0.8)',
    accent:   '#fed7aa',
    symbol:   'flame',
    label:    'POWER',
  },
];

// SVG art for each card symbol — detailed mystical illustrations
function CardSymbolSVG({ symbol, color, size = 48 }) {
  const s = size;
  if (symbol === 'eye') return (
    <svg width={s} height={s} viewBox="0 0 80 80" fill="none">
      {/* Outer arcane ring */}
      <circle cx="40" cy="40" r="36" stroke={color} strokeWidth="0.8" strokeDasharray="4 3" opacity="0.3"/>
      <circle cx="40" cy="40" r="30" stroke={color} strokeWidth="0.5" opacity="0.15"/>
      {/* Sacred triangle */}
      <polygon points="40,10 68,58 12,58" stroke={color} strokeWidth="1.2" fill="none" opacity="0.45"/>
      {/* Radiating sunburst lines */}
      {[0,30,60,90,120,150,180,210,240,270,300,330].map((deg, i) => {
        const r1 = 18, r2 = 24;
        const a = (deg * Math.PI) / 180;
        return <line key={i} x1={40 + r1*Math.cos(a)} y1={40 + r1*Math.sin(a)} x2={40 + r2*Math.cos(a)} y2={40 + r2*Math.sin(a)} stroke={color} strokeWidth="1" opacity="0.35"/>;
      })}
      {/* Iris rings */}
      <circle cx="40" cy="40" r="14" stroke={color} strokeWidth="1.5" opacity="0.6"/>
      <circle cx="40" cy="40" r="9"  fill={color} opacity="0.75"/>
      {/* Pupil */}
      <circle cx="40" cy="40" r="4.5" fill="rgba(0,0,0,0.7)"/>
      {/* Eye outline */}
      <path d="M12,40 Q26,22 40,22 Q54,22 68,40 Q54,58 40,58 Q26,58 12,40Z" stroke={color} strokeWidth="2" fill="none" opacity="0.8"/>
      {/* Eyelashes */}
      <line x1="12" y1="40" x2="6"  y2="36" stroke={color} strokeWidth="1" opacity="0.5"/>
      <line x1="12" y1="40" x2="6"  y2="44" stroke={color} strokeWidth="1" opacity="0.5"/>
      <line x1="68" y1="40" x2="74" y2="36" stroke={color} strokeWidth="1" opacity="0.5"/>
      <line x1="68" y1="40" x2="74" y2="44" stroke={color} strokeWidth="1" opacity="0.5"/>
      {/* Corner star glyphs */}
      <text x="18" y="22" textAnchor="middle" fill={color} fontSize="8" opacity="0.55">✦</text>
      <text x="62" y="22" textAnchor="middle" fill={color} fontSize="8" opacity="0.55">✦</text>
      <text x="40" y="76" textAnchor="middle" fill={color} fontSize="8" opacity="0.55">✦</text>
    </svg>
  );
  if (symbol === 'moon') return (
    <svg width={s} height={s} viewBox="0 0 80 80" fill="none">
      {/* Outer star field ring */}
      <circle cx="40" cy="40" r="36" stroke={color} strokeWidth="0.6" opacity="0.2"/>
      {/* Constellation lines */}
      <line x1="58" y1="16" x2="65" y2="28" stroke={color} strokeWidth="0.8" opacity="0.35"/>
      <line x1="65" y1="28" x2="60" y2="38" stroke={color} strokeWidth="0.8" opacity="0.35"/>
      <line x1="60" y1="38" x2="68" y2="50" stroke={color} strokeWidth="0.8" opacity="0.35"/>
      {/* Crescent moon — main body */}
      <path d="M44 12 A24 24 0 1 0 44 68 A18 18 0 0 1 44 12Z" fill={color} opacity="0.9"/>
      {/* Moon surface craters */}
      <circle cx="30" cy="38" r="3.5" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="1.5"/>
      <circle cx="36" cy="52" r="2"   fill="none" stroke="rgba(0,0,0,0.2)"  strokeWidth="1.2"/>
      <circle cx="26" cy="50" r="2.5" fill="none" stroke="rgba(0,0,0,0.2)"  strokeWidth="1.2"/>
      {/* Stars */}
      <circle cx="58" cy="16" r="2.5" fill={color} opacity="0.9"/>
      <circle cx="65" cy="28" r="1.8" fill={color} opacity="0.75"/>
      <circle cx="60" cy="38" r="2"   fill={color} opacity="0.8"/>
      <circle cx="68" cy="50" r="1.5" fill={color} opacity="0.6"/>
      <circle cx="62" cy="62" r="1.8" fill={color} opacity="0.55"/>
      <circle cx="14" cy="20" r="1.5" fill={color} opacity="0.4"/>
      <circle cx="10" cy="58" r="1.2" fill={color} opacity="0.35"/>
      {/* Phase dots */}
      {[20,30,40,50,60].map((y,i) => (
        <circle key={i} cx="72" cy={y} r="1" fill={color} opacity={0.2 + i * 0.07}/>
      ))}
    </svg>
  );
  if (symbol === 'lotus') return (
    <svg width={s} height={s} viewBox="0 0 80 80" fill="none">
      {/* Outer sacred ring */}
      <circle cx="40" cy="38" r="34" stroke={color} strokeWidth="0.7" strokeDasharray="3 4" opacity="0.25"/>
      {/* Fibonacci spiral hint */}
      <path d="M40 38 Q48 30 48 22 Q48 14 40 14 Q32 14 32 22 Q32 30 40 38 Q52 38 52 26" stroke={color} strokeWidth="0.8" fill="none" opacity="0.3"/>
      {/* Lotus side petals (back) */}
      <path d="M40 52 C28 52 16 42 18 30 C20 22 30 20 40 30" fill={color} opacity="0.3"/>
      <path d="M40 52 C52 52 64 42 62 30 C60 22 50 20 40 30" fill={color} opacity="0.3"/>
      {/* Lotus petals — 3 rows */}
      <path d="M40 52 C34 44 32 36 34 28 C36 22 40 20 40 28 C40 20 44 22 46 28 C48 36 46 44 40 52Z" fill={color} opacity="0.85"/>
      <path d="M40 52 C26 48 20 38 24 28 C26 22 32 22 36 30" fill={color} opacity="0.65"/>
      <path d="M40 52 C54 48 60 38 56 28 C54 22 48 22 44 30" fill={color} opacity="0.65"/>
      <path d="M40 52 C22 50 14 40 20 30 C22 24 28 24 33 32" fill={color} opacity="0.4"/>
      <path d="M40 52 C58 50 66 40 60 30 C58 24 52 24 47 32" fill={color} opacity="0.4"/>
      {/* Center stamen */}
      <circle cx="40" cy="32" r="5"   fill={color} opacity="0.95"/>
      <circle cx="40" cy="32" r="2.5" fill="rgba(0,0,0,0.45)"/>
      {/* Stem */}
      <line x1="40" y1="52" x2="40" y2="72" stroke={color} strokeWidth="2.5" opacity="0.7"/>
      {/* Roots */}
      <path d="M40 72 C34 72 28 76 24 74" stroke={color} strokeWidth="1.5" fill="none" opacity="0.5"/>
      <path d="M40 72 C46 72 52 76 56 74" stroke={color} strokeWidth="1.5" fill="none" opacity="0.5"/>
      {/* Sparkles */}
      <text x="18" y="28" fill={color} fontSize="7" opacity="0.6">✦</text>
      <text x="58" y="25" fill={color} fontSize="6" opacity="0.5">✦</text>
      <text x="12" y="55" fill={color} fontSize="5" opacity="0.4">✦</text>
    </svg>
  );
  // flame / POWER
  return (
    <svg width={s} height={s} viewBox="0 0 80 80" fill="none">
      {/* Outer energy ring */}
      <circle cx="40" cy="44" r="32" stroke={color} strokeWidth="0.8" strokeDasharray="5 3" opacity="0.28"/>
      {/* Sun rays behind */}
      {[0,40,80,120,160,200,240,280,320].map((deg, i) => {
        const a = (deg * Math.PI) / 180;
        return <line key={i} x1={40 + 20*Math.cos(a)} y1={44 + 20*Math.sin(a)} x2={40 + 30*Math.cos(a)} y2={44 + 30*Math.sin(a)} stroke={color} strokeWidth="1" opacity="0.3"/>;
      })}
      {/* Phoenix wing hints */}
      <path d="M40 56 C28 52 16 44 14 36 C12 28 20 26 28 36" stroke={color} strokeWidth="1.5" fill="none" opacity="0.45"/>
      <path d="M40 56 C52 52 64 44 66 36 C68 28 60 26 52 36" stroke={color} strokeWidth="1.5" fill="none" opacity="0.45"/>
      {/* Outer flame */}
      <path d="M40 10 C40 10 54 22 54 36 C54 44 50 50 46 54 C46 44 44 38 40 34 C36 38 34 44 34 54 C30 50 26 44 26 36 C26 22 40 10 40 10Z" fill={color} opacity="0.85"/>
      {/* Mid flame */}
      <path d="M40 22 C40 22 49 30 49 40 C49 46 46 50 43 52 C43 44 41 40 40 38 C39 40 37 44 37 52 C34 50 31 46 31 40 C31 30 40 22 40 22Z" fill="rgba(255,220,120,0.55)"/>
      {/* Inner core */}
      <path d="M40 34 C40 34 44 38 44 44 C44 48 42 50 40 50 C38 50 36 48 36 44 C36 38 40 34 40 34Z" fill="rgba(255,255,200,0.8)"/>
      {/* Base glow */}
      <ellipse cx="40" cy="58" rx="14" ry="5" fill={color} opacity="0.35"/>
      {/* Spark particles */}
      <circle cx="28" cy="26" r="1.8" fill={color} opacity="0.7"/>
      <circle cx="54" cy="20" r="1.5" fill={color} opacity="0.6"/>
      <circle cx="20" cy="38" r="1.2" fill={color} opacity="0.5"/>
      <circle cx="60" cy="32" r="1.5" fill={color} opacity="0.55"/>
      <circle cx="26" cy="52" r="1"   fill={color} opacity="0.45"/>
      <circle cx="56" cy="50" r="1"   fill={color} opacity="0.4"/>
    </svg>
  );
}

const DOMAIN_GLYPHS = {
  'Self-Awareness': '◉', 'Self-Regulation': '⬡',
  'Empathy': '◈', 'Social Skills': '⊕', 'Motivation': '▲',
  'Pattern': '∞', 'Spatial': '◇', 'Memory': '◌', 'Logic': '⟁',
};

// Individual card with tilt + holographic effects
function TarotCard({ card, opt, label, isSelected, isLocked, dealDelay, isTwoOpt, onClick }) {
  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [shimmerX, setShimmerX] = useState(50);

  const handlePointerMove = useCallback((e) => {
    if (isLocked || isSelected) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = (e.clientX - rect.left) / rect.width;
    const cy = (e.clientY - rect.top)  / rect.height;
    setTilt({ x: (cy - 0.5) * 14, y: (cx - 0.5) * -14 });
    setShimmerX(cx * 100);
  }, [isLocked, isSelected]);

  const handlePointerLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
    setShimmerX(50);
  }, []);

  return (
    <button
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={onClick}
      style={{
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '14px 10px 18px',
        minHeight: isTwoOpt ? '220px' : '185px',
        background: card.gradient,
        border: `2px solid ${isSelected ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: '20px',
        cursor: isLocked ? 'default' : 'pointer',
        fontFamily: DESIGN.fontFamily,
        boxShadow: isSelected
          ? `0 0 48px ${card.glow}, 0 12px 40px rgba(0,0,0,0.65), inset 0 0 20px rgba(255,255,255,0.06)`
          : `0 4px 28px rgba(0,0,0,0.55)`,
        transform: isSelected
          ? 'scale(0.95)'
          : `perspective(600px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(1.01)`,
        transition: isSelected
          ? 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.15s ease'
          : 'box-shadow 0.2s ease, border-color 0.15s ease',
        animationName: 'tarotDeal',
        animationDuration: '0.45s',
        animationTimingFunction: 'cubic-bezier(0.34,1.56,0.64,1)',
        animationFillMode: 'both',
        animationDelay: `${dealDelay}s`,
        outline: 'none',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
        willChange: 'transform',
      }}
    >
      {/* Holographic foil sweep */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(${shimmerX * 1.2}deg, transparent 0%, rgba(255,255,255,0.04) 35%, rgba(255,255,255,0.13) 50%, rgba(255,255,255,0.04) 65%, transparent 100%)`,
        pointerEvents: 'none',
        borderRadius: '18px',
        zIndex: 1,
        transition: 'background 0.1s ease',
      }} />

      {/* Animated shimmer stripe on selected */}
      {isSelected && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.22) 50%, transparent 70%)',
          backgroundSize: '200% 100%',
          animation: 'shimmerSweep 0.5s ease forwards',
          borderRadius: '18px',
          zIndex: 2,
          pointerEvents: 'none',
        }} />
      )}

      {/* Radial burst glow on select */}
      {isSelected && (
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse at 50% 50%, ${card.glow} 0%, transparent 65%)`,
          opacity: 0,
          animation: 'burstFade 0.5s ease forwards',
          borderRadius: '18px',
          zIndex: 1,
          pointerEvents: 'none',
        }} />
      )}

      {/* Border glow ring on hover */}
      <div style={{
        position: 'absolute', inset: '-1px',
        borderRadius: '21px',
        background: `radial-gradient(ellipse at ${shimmerX}% 20%, ${card.accent}40 0%, transparent 60%)`,
        opacity: isSelected ? 0 : 1,
        pointerEvents: 'none',
        zIndex: 0,
        transition: 'opacity 0.2s',
      }} />

      {/* Card top label */}
      <div style={{
        position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)',
        fontSize: '8px', fontWeight: 800, letterSpacing: '0.14em',
        color: `${card.accent}99`,
        zIndex: 3,
      }}>{card.label}</div>

      {/* Large rotating background mandala — the centrepiece art */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        width: '115%', height: '115%',
        transform: `translate(-50%, -50%) rotate(${isSelected ? 12 : 0}deg)`,
        transition: 'transform 0.6s cubic-bezier(0.34,1.56,0.64,1)',
        opacity: isSelected ? 0.28 : 0.16,
        pointerEvents: 'none',
        zIndex: 0,
        animation: 'cardMandala 28s linear infinite',
      }}>
        <CardSymbolSVG symbol={card.symbol} color={card.accent} size="100%" />
      </div>

      {/* SVG art medallion — top-left badge */}
      <div style={{
        position: 'absolute', top: '10px', left: '10px',
        width: '48px', height: '48px',
        borderRadius: '50%',
        background: 'rgba(0,0,0,0.4)',
        border: `2px solid rgba(255,255,255,${isSelected ? 0.65 : 0.22})`,
        boxShadow: isSelected ? `0 0 24px ${card.glow}, 0 0 6px rgba(0,0,0,0.5)` : `0 2px 10px rgba(0,0,0,0.5)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 3,
        transition: 'box-shadow 0.25s, border-color 0.25s',
        overflow: 'hidden',
        backdropFilter: 'blur(4px)',
      }}>
        <CardSymbolSVG symbol={card.symbol} color={card.accent} size={32} />
      </div>

      {/* Letter badge — top-right */}
      <div style={{
        position: 'absolute', top: '12px', right: '12px',
        width: '26px', height: '26px', borderRadius: '50%',
        background: 'rgba(0,0,0,0.4)',
        border: `1.5px solid rgba(255,255,255,${isSelected ? 0.7 : 0.3})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '10px', fontWeight: 900,
        color: isSelected ? card.accent : 'rgba(255,255,255,0.9)',
        zIndex: 3,
        letterSpacing: '0.02em',
        transition: 'color 0.2s, border-color 0.2s',
        backdropFilter: 'blur(4px)',
      }}>{label}</div>

      {/* Answer text — sits over the large art */}
      <div style={{
        zIndex: 3,
        fontSize: '13px', fontWeight: 700,
        color: 'rgba(255,255,255,0.97)',
        textAlign: 'center', lineHeight: 1.5,
        textShadow: '0 2px 12px rgba(0,0,0,0.95), 0 0 24px rgba(0,0,0,0.6)',
        padding: '0 8px',
        width: '100%',
        paddingTop: '68px',
      }}>{opt}</div>
    </button>
  );
}

// Ambient star-field for the question view background
const STAR_DATA = [
  { x:'8%',  y:'12%', d:0,    r:1.2, dur:4.5 },
  { x:'88%', y:'8%',  d:0.8,  r:1.5, dur:5.2 },
  { x:'55%', y:'5%',  d:1.6,  r:1,   dur:3.8 },
  { x:'22%', y:'18%', d:2.4,  r:0.8, dur:6.1 },
  { x:'76%', y:'20%', d:0.4,  r:1.3, dur:4.8 },
  { x:'4%',  y:'38%', d:3.2,  r:0.9, dur:5.5 },
  { x:'93%', y:'35%', d:1.2,  r:1.1, dur:4.2 },
  { x:'14%', y:'58%', d:2.0,  r:0.7, dur:6.8 },
  { x:'85%', y:'52%', d:0.6,  r:1.4, dur:3.5 },
  { x:'42%', y:'88%', d:3.8,  r:1.0, dur:5.0 },
  { x:'66%', y:'82%', d:1.8,  r:0.8, dur:4.6 },
  { x:'31%', y:'74%', d:2.8,  r:1.2, dur:7.0 },
];
function StarField({ accent }) {
  return (
    <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:0, overflow:'hidden' }}>
      {STAR_DATA.map((s, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: s.x, top: s.y,
          width: `${s.r * 2}px`, height: `${s.r * 2}px`,
          borderRadius: '50%',
          background: accent,
          boxShadow: `0 0 ${s.r * 4}px ${accent}`,
          animation: `starDrift ${s.dur}s ${s.d}s ease-in-out infinite alternate`,
          opacity: 0,
        }} />
      ))}
      {/* Thin constellation lines */}
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%' }} viewBox="0 0 100 100" preserveAspectRatio="none">
        <line x1="8" y1="12" x2="22" y2="18" stroke={accent} strokeWidth="0.15" opacity="0.2"/>
        <line x1="88" y1="8"  x2="76" y2="20" stroke={accent} strokeWidth="0.15" opacity="0.2"/>
        <line x1="55" y1="5"  x2="76" y2="20" stroke={accent} strokeWidth="0.12" opacity="0.15"/>
        <line x1="4"  y1="38" x2="14" y2="58" stroke={accent} strokeWidth="0.12" opacity="0.15"/>
        <line x1="93" y1="35" x2="85" y2="52" stroke={accent} strokeWidth="0.12" opacity="0.15"/>
        <line x1="42" y1="88" x2="31" y2="74" stroke={accent} strokeWidth="0.1"  opacity="0.12"/>
        <line x1="66" y1="82" x2="85" y2="52" stroke={accent} strokeWidth="0.1"  opacity="0.12"/>
      </svg>
    </div>
  );
}

function TarotQuestionView({ questions, type, onComplete }) {
  const [idx,       setIdx]       = useState(0);
  const [responses, setResponses] = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [qKey,      setQKey]      = useState(0);
  const [theme,     setTheme]     = useState('dharma');

  const q        = questions[idx];
  const T        = CARD_THEMES[theme];
  const total    = questions.length;
  const progress = (idx / total) * 100;
  const isTwoOpt = q.opts.length === 2;
  const LABELS   = ['A', 'B', 'C', 'D'];

  const handleAnswer = (i) => {
    if (selected !== null) return;
    setSelected(i);
    setTimeout(() => {
      const nr = [...responses, { qIdx: idx, chosen: i }];
      setResponses(nr);
      setSelected(null);
      if (idx < total - 1) {
        setIdx(idx + 1);
        setQKey(k => k + 1);
      } else {
        const result = type === 'eq'
          ? computeEQScoreAndDomains(nr, questions)
          : computeIQScoreAndDomains(nr, questions);
        onComplete(result);
      }
    }, 420);
  };

  return (
    <div style={{
      position: 'relative',
      display: 'flex', flexDirection: 'column',
      minHeight: 'calc(100dvh - 120px)',
      maxWidth: 'clamp(320px, 92vw, 520px)',
      margin: '0 auto', width: '100%',
    }}>
      {/* Ambient constellation star-field */}
      <StarField accent={T.accent} />

      <style>{`
        @keyframes tarotDeal {
          0%   { opacity:0; transform: translateY(55px) rotate(calc(var(--deal-rot, 0deg))) scale(0.82); }
          70%  { opacity:1; }
          100% { opacity:1; transform: translateY(0) rotate(0deg) scale(1); }
        }
        @keyframes questionReveal {
          0%   { opacity:0; transform: translateX(-14px); filter: blur(6px); }
          100% { opacity:1; transform: translateX(0);     filter: blur(0); }
        }
        @keyframes shimmerSweep {
          0%   { background-position: -200% center; opacity:0; }
          20%  { opacity:1; }
          100% { background-position: 200% center; opacity:0; }
        }
        @keyframes burstFade {
          0%   { opacity:0.8; transform: scale(0.6); }
          100% { opacity:0;   transform: scale(1.8); }
        }
        @keyframes progressPulse {
          0%,100% { box-shadow: 0 0 6px var(--pg-glow); }
          50%     { box-shadow: 0 0 16px var(--pg-glow), 0 0 30px var(--pg-glow); }
        }
        @keyframes cardMandala {
          from { transform: translate(-50%,-50%) rotate(0deg); }
          to   { transform: translate(-50%,-50%) rotate(360deg); }
        }
        @keyframes starDrift {
          0%   { opacity:0; transform: translateY(0px) scale(1); }
          30%  { opacity:1; }
          100% { opacity:0; transform: translateY(-40px) scale(0.4); }
        }
        @keyframes orbitSpin {
          from { transform: rotate(0deg) translateX(var(--orbit-r)) rotate(0deg); }
          to   { transform: rotate(360deg) translateX(var(--orbit-r)) rotate(-360deg); }
        }
        .tarot-theme-dot:active { transform: scale(0.85) !important; }
      `}</style>

      {/* ── Progress bar ── */}
      <div style={{
        height: '4px', background: DESIGN.border,
        borderRadius: '4px', marginBottom: '20px', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${progress}%`,
          background: `linear-gradient(90deg, ${T.accent}cc, ${T.accent})`,
          borderRadius: '4px',
          transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
          '--pg-glow': T.glow,
          animation: 'progressPulse 2s ease-in-out infinite',
          boxShadow: `0 0 10px ${T.glow}`,
        }} />
      </div>

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'center', marginBottom:'16px', gap:'8px' }}>
        <span style={{ fontSize:'12px', color: T.accent, fontWeight:700, letterSpacing:'0.08em' }}>
          {DOMAIN_GLYPHS[q.domain] || '◈'} {q.domain?.toUpperCase()}
        </span>
        <span style={{ fontSize:'11px', color: DESIGN.textMuted, marginLeft:'auto',
          background:'rgba(255,255,255,0.05)', padding:'2px 8px', borderRadius:'10px' }}>
          {idx + 1} <span style={{ opacity:0.45 }}>/ {total}</span>
        </span>
        {/* Theme switcher */}
        <div style={{ display:'flex', gap:'5px' }}>
          {Object.entries(CARD_THEMES).map(([key, t]) => (
            <button key={key} className="tarot-theme-dot" onClick={() => setTheme(key)} style={{
              width: theme === key ? '22px' : '9px', height: '9px',
              borderRadius: '5px', background: t.accent,
              border: 'none', padding: 0, cursor: 'pointer',
              opacity: theme === key ? 1 : 0.35,
              transition: 'all 0.2s ease',
              boxShadow: theme === key ? `0 0 10px ${t.glow}` : 'none',
              WebkitTapHighlightColor: 'transparent',
            }} />
          ))}
        </div>
      </div>

      {/* ── Question — blur slide-in on change ── */}
      <div key={`q-${qKey}`} style={{
        fontSize: 'clamp(14px, 3.5vw, 17px)',
        fontWeight: 700, color: DESIGN.textPrimary,
        lineHeight: 1.55, marginBottom: '22px', letterSpacing: '-0.015em',
        animation: 'questionReveal 0.35s cubic-bezier(0.22,1,0.36,1) both',
      }}>
        {q.q}
      </div>

      {/* ── Card grid — each card dealt with staggered spring ── */}
      <div key={`g-${qKey}`} style={{
        display: 'grid',
        gridTemplateColumns: isTwoOpt ? '1fr 1fr' : '1fr 1fr',
        gap: 'clamp(8px, 2.5vw, 14px)',
        flex: 1,
      }}>
        {q.opts.map((opt, i) => {
          const card = TAROT_CARD_ART[i % TAROT_CARD_ART.length];
          return (
            <TarotCard
              key={i}
              card={card}
              opt={opt}
              label={LABELS[i] || String.fromCharCode(65 + i)}
              isSelected={selected === i}
              isLocked={selected !== null}
              dealDelay={i * 0.08}
              isTwoOpt={isTwoOpt}
              onClick={() => handleAnswer(i)}
            />
          );
        })}
      </div>

      <div style={{ height: '20px' }} />
    </div>
  );
}

function EQQuestionView({ questions, onComplete }) {
  return <TarotQuestionView questions={questions} type="eq" onComplete={onComplete} />;
}

// ── IQ Visual Canvases ─────────────────────────────────────────────────────
function IQVisualCanvas({ questionId }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    let frameId, timeout;

    ctx.fillStyle = DESIGN.bg;
    ctx.fillRect(0, 0, W, H);

    if (questionId === 1) {
      // Shape sequence: ○ ■ △ ○ ■ ?
      const shapes = ['circle', 'square', 'triangle', 'circle', 'square', 'question'];
      const colors = ['#22c55e','#22c55e','#22c55e','rgba(34,197,94,0.4)','rgba(34,197,94,0.4)','rgba(255,255,255,0.15)'];
      let frame = 0;
      const draw = () => {
        ctx.fillStyle = DESIGN.bg;
        ctx.fillRect(0, 0, W, H);
        const spacing = W / 7;
        shapes.forEach((shape, i) => {
          const x = spacing + i * spacing;
          const y = H / 2;
          const r = 14;
          ctx.fillStyle = colors[i];
          ctx.strokeStyle = i < 5 ? '#22c55e' : `rgba(255,255,255,${0.3 + 0.2 * Math.sin(frame * 0.08)})`;
          ctx.lineWidth = 2;
          if (shape === 'circle') {
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
          } else if (shape === 'square') {
            ctx.beginPath(); ctx.rect(x - r, y - r, r * 2, r * 2);
            ctx.fill(); ctx.stroke();
          } else if (shape === 'triangle') {
            ctx.beginPath();
            ctx.moveTo(x, y - r); ctx.lineTo(x + r, y + r); ctx.lineTo(x - r, y + r);
            ctx.closePath(); ctx.fill(); ctx.stroke();
          } else {
            ctx.font = `bold 22px Inter, sans-serif`;
            ctx.fillStyle = `rgba(255,255,255,${0.4 + 0.3 * Math.sin(frame * 0.08)})`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('?', x, y);
          }
        });
        frame++;
        frameId = requestAnimationFrame(draw);
      };
      draw();
    }

    if (questionId === 5) {
      // Square-base pyramid wireframe
      const draw = () => {
        ctx.fillStyle = DESIGN.bg;
        ctx.fillRect(0, 0, W, H);
        const cx = W / 2, cy = H / 2;
        // Base square (isometric)
        const base = [
          [cx - 40, cy + 10], [cx + 40, cy + 10],
          [cx + 40, cy + 30], [cx - 40, cy + 30]
        ];
        // Apex
        const apex = [cx, cy - 35];
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        // Draw base
        ctx.beginPath();
        ctx.moveTo(...base[0]); base.forEach(p => ctx.lineTo(...p));
        ctx.closePath(); ctx.stroke();
        // Draw edges to apex
        base.forEach(p => {
          ctx.beginPath(); ctx.moveTo(...p); ctx.lineTo(...apex); ctx.stroke();
        });
        // Glow apex
        ctx.fillStyle = 'rgba(34,197,94,0.8)';
        ctx.beginPath(); ctx.arc(...apex, 4, 0, Math.PI * 2); ctx.fill();
        // Labels: edge count hint
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('Count the edges →', cx, cy + 52);
      };
      draw();
    }

    if (questionId === 7) {
      // 3×3 memory grid — show for 3s then hide
      const grid = [['K','M','P'],['R','T','W'],['B','N','X']];
      let shown = true;
      const drawGrid = (visible) => {
        ctx.fillStyle = DESIGN.bg;
        ctx.fillRect(0, 0, W, H);
        const cellW = 52, cellH = 44;
        const startX = (W - cellW * 3) / 2;
        const startY = (H - cellH * 3) / 2;
        grid.forEach((row, r) => {
          row.forEach((cell, c) => {
            const x = startX + c * cellW;
            const y = startY + r * cellH;
            ctx.strokeStyle = visible ? 'rgba(34,197,94,0.6)' : 'rgba(255,255,255,0.1)';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, cellW - 4, cellH - 4);
            if (visible) {
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 18px Inter, sans-serif';
              ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
              ctx.fillText(cell, x + (cellW - 4) / 2, y + (cellH - 4) / 2);
            } else {
              ctx.fillStyle = 'rgba(255,255,255,0.12)';
              ctx.font = 'bold 18px Inter, sans-serif';
              ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
              ctx.fillText('?', x + (cellW - 4) / 2, y + (cellH - 4) / 2);
            }
          });
        });
        ctx.fillStyle = visible ? '#22c55e' : 'rgba(255,255,255,0.3)';
        ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(visible ? 'Memorise this grid…' : 'Row 2, Col 2?', W / 2, H - 10);
      };
      drawGrid(true);
      timeout = setTimeout(() => { shown = false; drawGrid(false); }, 3000);
    }

    if (questionId === 9) {
      // Two L-shapes: left normal, right rotated 90°
      const draw = () => {
        ctx.fillStyle = DESIGN.bg;
        ctx.fillRect(0, 0, W, H);
        const u = 18; // unit size
        // L-shape helper
        const drawL = (ox, oy, rotated, color) => {
          ctx.fillStyle = color;
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 2;
          if (!rotated) {
            // Normal L: 3 cells tall + 1 bottom right
            const cells = [[0,0],[0,1],[0,2],[1,2]];
            cells.forEach(([cx, cy]) => {
              ctx.beginPath();
              ctx.rect(ox + cx * u, oy + cy * u, u - 2, u - 2);
              ctx.fill(); ctx.stroke();
            });
          } else {
            // Rotated 90° CW: 3 cells wide + 1 top left
            const cells = [[0,1],[1,1],[2,1],[0,0]];
            cells.forEach(([cx, cy]) => {
              ctx.beginPath();
              ctx.rect(ox + cx * u, oy + cy * u, u - 2, u - 2);
              ctx.fill(); ctx.stroke();
            });
          }
        };
        drawL(W / 2 - 80, H / 2 - 28, false, 'rgba(34,197,94,0.35)');
        drawL(W / 2 + 20, H / 2 - 28, true, 'rgba(34,197,94,0.35)');
        // Labels
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('Shape A', W / 2 - 60, H / 2 + 36);
        ctx.fillText('Shape B (rotated 90°)', W / 2 + 50, H / 2 + 36);
        // vs divider
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.font = 'bold 14px Inter, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('vs', W / 2, H / 2);
      };
      draw();
    }

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(timeout);
    };
  }, [questionId]);

  return (
    <canvas
      ref={canvasRef}
      width={280}
      height={90}
      style={{
        display: 'block',
        margin: '0 auto 16px',
        borderRadius: '8px',
        border: `1px solid ${DESIGN.border}`,
        backgroundColor: DESIGN.bg,
      }}
    />
  );
}

function MoodCheckIn({ onComplete }) {
  const [mood, setMood] = useState(null);
  const [energy, setEnergy] = useState(null);
  const moods = [
    { v: 1, e: '😴', label: 'Drained' },
    { v: 2, e: '😐', label: 'Flat' },
    { v: 3, e: '🙂', label: 'OK' },
    { v: 4, e: '😄', label: 'Good' },
    { v: 5, e: '🔥', label: 'Fired up' },
  ];

  const handleSubmit = () => {
    if (!mood || !energy) return;
    const entry = { timestamp: Date.now(), mood, energy };
    const existing = JSON.parse(localStorage.getItem('healai_mood_log') || '[]');
    existing.push(entry);
    localStorage.setItem('healai_mood_log', JSON.stringify(existing));
    onComplete(entry);
  };

  return (
    <div style={{
      padding: '32px 24px',
      maxWidth: '420px',
      margin: '0 auto',
      animation: 'fadeIn 0.3s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: DESIGN.green }} />
        <span style={{ fontSize: '11px', color: DESIGN.textSecondary, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          SESSION CHECK-IN
        </span>
      </div>

      <h3 style={{ fontSize: '20px', color: DESIGN.textPrimary, fontWeight: 600, marginBottom: '8px' }}>
        How are you arriving today?
      </h3>
      <p style={{ fontSize: '13px', color: DESIGN.textMuted, marginBottom: '28px' }}>
        This shapes your session. Honest is best.
      </p>

      {/* Mood selector */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '12px', color: DESIGN.textSecondary, marginBottom: '12px', letterSpacing: '0.05em' }}>
          MOOD
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between' }}>
          {moods.map(m => (
            <button
              key={m.v}
              onClick={() => setMood(m.v)}
              style={{
                flex: 1,
                padding: '12px 4px',
                backgroundColor: mood === m.v ? DESIGN.greenGlow : DESIGN.surface,
                border: `1px solid ${mood === m.v ? DESIGN.green : DESIGN.border}`,
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{ fontSize: '22px' }}>{m.e}</span>
              <span style={{ fontSize: '9px', color: mood === m.v ? DESIGN.green : DESIGN.textMuted, letterSpacing: '0.03em' }}>
                {m.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Energy bar */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '12px', color: DESIGN.textSecondary, marginBottom: '12px', letterSpacing: '0.05em' }}>
          ENERGY LEVEL
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[1,2,3,4,5].map(v => (
            <button
              key={v}
              onClick={() => setEnergy(v)}
              style={{
                flex: 1,
                height: '36px',
                backgroundColor: energy >= v ? DESIGN.green : DESIGN.surface,
                border: `1px solid ${energy >= v ? DESIGN.green : DESIGN.border}`,
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                opacity: energy >= v ? 1 : 0.4,
              }}
            />
          ))}
        </div>
        {energy && (
          <div style={{ fontSize: '11px', color: DESIGN.textMuted, marginTop: '8px', textAlign: 'right' }}>
            {['', 'Very low', 'Low', 'Medium', 'High', 'Charged'][energy]}
          </div>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!mood || !energy}
        style={{
          width: '100%',
          padding: '14px',
          backgroundColor: mood && energy ? 'transparent' : 'transparent',
          border: `1px solid ${mood && energy ? DESIGN.green : DESIGN.border}`,
          color: mood && energy ? DESIGN.green : DESIGN.textMuted,
          fontFamily: DESIGN.fontFamily,
          fontSize: '13px',
          fontWeight: 500,
          cursor: mood && energy ? 'pointer' : 'default',
          letterSpacing: '0.05em',
          borderRadius: '8px',
          transition: 'all 0.2s ease',
        }}
      >
        BEGIN SESSION →
      </button>
    </div>
  );
}

function IQQuestionView({ questions, onComplete }) {
  return <TarotQuestionView questions={questions} type="iq" onComplete={onComplete} />;
}

function ResultsView({ resultsType, eqData, iqData, onBack }) {
  const [activeTab, setActiveTab] = useState(resultsType);
  const canvasFrameRef = useRef(0);

  const getEQInsight = (domain, score) => {
    if (domain === 'Empathy' && score >= 80) return 'Your standout strength. You read rooms and people intuitively.';
    if (domain === 'Self-Awareness' && score >= 80) return 'Strong self-knowledge. You pause before reacting.';
    if (domain === 'Social Skills' && score >= 75) return 'Natural connector. You bring people together.';
    if (domain === 'Self-Regulation' && score >= 75) return 'Steady under pressure. Calm is your default.';
    if (domain === 'Motivation' && score >= 70) return 'Relentless driver. You keep going when others stop.';
    return 'Growing edge. Focus here to level up.';
  };

  const getIQInterpretation = (ss) => {
    if (ss >= 130) return 'Exceptional cognition. You master complex domains rapidly.';
    if (ss >= 115) return 'Above-average cognition. Excellent reasoning and problem-solving.';
    if (ss >= 100) return 'Solid all-around cognitive performance. Strong pattern and logic skills.';
    if (ss >= 85) return 'Developing cognition. Consistent effort unlocks mastery.';
    return 'Learning in progress. Structured practice accelerates growth.';
  };

  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div style={{ animation: 'fadeIn 0.2s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
        <button
          onClick={onBack}
          style={{
            fontSize: '12px',
            color: DESIGN.textSecondary,
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontFamily: DESIGN.fontFamily,
            transition: 'color 0.2s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = DESIGN.textPrimary)}
          onMouseLeave={(e) => (e.currentTarget.style.color = DESIGN.textSecondary)}
        >
          ← ASSESS
        </button>
      </div>

      <h2 style={{ fontSize: '18px', color: DESIGN.textPrimary, fontWeight: '600', marginBottom: '24px' }}>
        ASSESSMENT RESULTS
      </h2>

      {eqData && iqData && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: `1px solid ${DESIGN.border}`, paddingBottom: '12px' }}>
          <button
            onClick={() => setActiveTab('eq')}
            style={{
              padding: '8px 16px',
              backgroundColor: activeTab === 'eq' ? DESIGN.surface : 'transparent',
              border: `1px solid ${activeTab === 'eq' ? DESIGN.green : DESIGN.border}`,
              color: DESIGN.textPrimary,
              cursor: 'pointer',
              borderRadius: '6px',
              fontSize: '12px',
              fontFamily: DESIGN.fontFamily,
              fontWeight: '600',
              transition: 'all 0.2s ease',
            }}
          >
            [EQ]
          </button>
          <button
            onClick={() => setActiveTab('iq')}
            style={{
              padding: '8px 16px',
              backgroundColor: activeTab === 'iq' ? DESIGN.surface : 'transparent',
              border: `1px solid ${activeTab === 'iq' ? DESIGN.green : DESIGN.border}`,
              color: DESIGN.textPrimary,
              cursor: 'pointer',
              borderRadius: '6px',
              fontSize: '12px',
              fontFamily: DESIGN.fontFamily,
              fontWeight: '600',
              transition: 'all 0.2s ease',
            }}
          >
            [IQ]
          </button>
        </div>
      )}

      {(activeTab === 'eq' || (activeTab === 'both' && eqData)) && eqData && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
            <CanvasScoreArc score={eqData.score} frameRef={canvasFrameRef} />
            <div style={{ fontSize: '13px', color: DESIGN.green, fontWeight: '600', letterSpacing: '1px', marginTop: '12px' }}>
              {eqData.band}
            </div>
            <div style={{ fontSize: '11px', color: DESIGN.textMuted, marginTop: '6px' }}>
              Taken {today}
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '12px', color: DESIGN.textMuted, marginBottom: '12px', fontWeight: '600' }}>
              DOMAIN BREAKDOWN
            </div>
            {eqData.domains.map((d) => (
              <div key={d.domain}>
                <DomainBar domain={d.domain} score={d.score} animated={true} />
                <div style={{ fontSize: '11px', color: DESIGN.textSecondary, marginBottom: '12px', marginLeft: '0px' }}>
                  {getEQInsight(d.domain, d.score)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(activeTab === 'iq' || (activeTab === 'both' && iqData)) && iqData && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '48px', fontWeight: 'bold', color: DESIGN.textPrimary, marginBottom: '12px' }}>
              {iqData.score}
            </div>
            <div style={{ fontSize: '13px', color: DESIGN.green, fontWeight: '600', letterSpacing: '1px', marginBottom: '6px' }}>
              {iqData.band}
            </div>
            <div style={{ fontSize: '11px', color: DESIGN.textMuted }}>
              {iqData.percentile}th percentile
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '12px', color: DESIGN.textMuted, marginBottom: '12px', fontWeight: '600' }}>
              COGNITIVE DOMAINS
            </div>
            {iqData.domains.map((d) => (
              <DomainBar key={d.domain} domain={d.domain} score={d.score} animated={true} />
            ))}
          </div>

          <div style={{ padding: '12px 16px', backgroundColor: DESIGN.surface, borderRadius: '8px', marginBottom: '24px', borderLeft: `3px solid ${DESIGN.green}` }}>
            <div style={{ fontSize: '12px', color: DESIGN.textSecondary, lineHeight: '1.5' }}>
              {getIQInterpretation(iqData.score)}
            </div>
          </div>

          <button
            onClick={() => window.location.reload()}
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: 'transparent',
              border: `1px solid ${DESIGN.border}`,
              color: DESIGN.textPrimary,
              cursor: 'pointer',
              borderRadius: '8px',
              fontSize: '13px',
              fontFamily: DESIGN.fontFamily,
              fontWeight: '600',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = DESIGN.surfaceHover;
              e.currentTarget.style.borderColor = DESIGN.borderHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = DESIGN.border;
            }}
          >
            RETAKE IQ ASSESSMENT
          </button>
        </div>
      )}

      <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
    </div>
  );
}

function PositiveView({ eqData, iqData, onBack }) {
  const canvasFrameRef = useRef(0);
  const [currentDomainIdx, setCurrentDomainIdx] = useState(0);

  const topEQDomain = eqData?.domains?.reduce((a, b) => (a.score > b.score ? a : b))?.domain || 'Empathy';
  const topIQDomain = iqData?.domains?.reduce((a, b) => (a.score > b.score ? a : b))?.domain || 'Pattern';

  const strengthTitle = STRENGTH_TITLES[`${topEQDomain}+${topIQDomain}`] || 'Resilient Intelligence';

  const eqDomains = [topEQDomain, ...eqData?.domains?.map((d) => d.domain).filter((d) => d !== topEQDomain).slice(0, 1)];
  const iqDomains = [topIQDomain];
  const cycleDomains = [...eqDomains, ...iqDomains];

  const challenges = eqData ? (STRENGTH_CHALLENGES[topEQDomain] || []).slice(0, 3) : [];
  if (challenges.length < 3 && topIQDomain) {
    const iqChallenges = STRENGTH_CHALLENGES[topIQDomain] || [];
    challenges.push(...iqChallenges.slice(0, 3 - challenges.length));
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDomainIdx((prev) => (prev + 1) % Math.max(1, cycleDomains.length));
    }, 4000);
    return () => clearInterval(timer);
  }, [cycleDomains.length]);

  const currentDomain = cycleDomains[currentDomainIdx] || 'Empathy';

  const handleVijñanaChallenge = (challenge) => {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(
        {
          type: 'vijnana_challenge_request',
          topic: challenge.topic,
          difficulty: challenge.diff,
          subtopic: challenge.subtopic,
        },
        '*'
      );
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.2s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
        <button
          onClick={onBack}
          style={{
            fontSize: '12px',
            color: DESIGN.textSecondary,
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontFamily: DESIGN.fontFamily,
            transition: 'color 0.2s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = DESIGN.textPrimary)}
          onMouseLeave={(e) => (e.currentTarget.style.color = DESIGN.textSecondary)}
        >
          ← ASSESS
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
        <div style={{ width: '8px', height: '8px', backgroundColor: DESIGN.green, borderRadius: '50%' }} />
        <h2 style={{ fontSize: '16px', color: DESIGN.textPrimary, fontWeight: '600', margin: 0 }}>
          YOUR STRENGTH PROFILE
        </h2>
      </div>

      <div style={{ fontSize: '14px', color: DESIGN.textSecondary, marginBottom: '24px', fontWeight: '500' }}>
        {strengthTitle}
      </div>

      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '11px', color: DESIGN.textMuted, fontWeight: '600', marginBottom: '12px', letterSpacing: '0.5px' }}>
          AV REINFORCEMENT CANVAS
        </div>
        <CanvasStrengthRipples domain={currentDomain} frameRef={canvasFrameRef} />
        <div style={{ fontSize: '12px', color: DESIGN.textSecondary, marginTop: '12px', textAlign: 'center', fontStyle: 'italic' }}>
          {DOMAIN_AFFIRMATIONS[currentDomain] || 'Your strength is your advantage.'}
        </div>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '11px', color: DESIGN.textMuted, fontWeight: '600', marginBottom: '16px', letterSpacing: '0.5px' }}>
          VIJNANA CHALLENGE SUGGESTIONS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {challenges.map((ch, i) => (
            <div
              key={i}
              style={{
                padding: '16px',
                backgroundColor: DESIGN.surface,
                border: `1px solid ${DESIGN.border}`,
                borderRadius: '8px',
              }}
            >
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: '700',
                    color: DESIGN.bg,
                    backgroundColor: ch.topic === 'Biology' ? '#10b981' : ch.topic === 'Physics' ? '#ef4444' : '#06b6d4',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    letterSpacing: '0.5px',
                  }}
                >
                  {ch.topic}
                </span>
                <span
                  style={{
                    fontSize: '9px',
                    fontWeight: '600',
                    color: DESIGN.textMuted,
                    padding: '4px 8px',
                    borderRadius: '4px',
                    backgroundColor: DESIGN.border,
                  }}
                >
                  {ch.diff}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: DESIGN.textSecondary, marginBottom: '12px', lineHeight: '1.4' }}>
                {ch.q}
              </div>
              <button
                onClick={() => handleVijñanaChallenge(ch)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: 'transparent',
                  border: `1px solid ${DESIGN.green}`,
                  color: DESIGN.green,
                  cursor: 'pointer',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontFamily: DESIGN.fontFamily,
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = DESIGN.greenGlow;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                SEND TO VIJNANA →
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '11px', color: DESIGN.textMuted, fontWeight: '600', marginBottom: '16px', letterSpacing: '0.5px' }}>
          STRENGTH AFFIRMATIONS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          {[topEQDomain, topIQDomain, 'Motivation'].map((d, i) => (
            <div
              key={i}
              style={{
                padding: '12px',
                backgroundColor: DESIGN.surface,
                border: `1px solid ${DESIGN.border}`,
                borderRadius: '8px',
                animation: `borderGlow 3s ease-in-out ${i * 0.3}s infinite`,
              }}
            >
              <div style={{ fontSize: '12px', color: DESIGN.textSecondary, textAlign: 'center', lineHeight: '1.4' }}>
                {DOMAIN_AFFIRMATIONS[d] || 'You are capable and growing.'}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => window.location.reload()}
        style={{
          width: '100%',
          padding: '12px 16px',
          backgroundColor: 'transparent',
          border: `1px solid ${DESIGN.border}`,
          color: DESIGN.textPrimary,
          cursor: 'pointer',
          borderRadius: '8px',
          fontSize: '13px',
          fontFamily: DESIGN.fontFamily,
          fontWeight: '600',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = DESIGN.surfaceHover;
          e.currentTarget.style.borderColor = DESIGN.borderHover;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.borderColor = DESIGN.border;
        }}
      >
        RETAKE ASSESSMENTS
      </button>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes borderGlow { 0%, 100% { border-color: ${DESIGN.border}; } 50% { border-color: ${DESIGN.green}; } }
      `}</style>
    </div>
  );
}

function TestCard({ title, description, score, band, onBegin, onViewResults, hasResults }) {
  return (
    <div
      style={{
        position: 'relative',
        padding: '24px',
        backgroundColor: DESIGN.surface,
        border: `1px solid ${DESIGN.border}`,
        borderRadius: '12px',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = DESIGN.surfaceHover;
        e.currentTarget.style.borderColor = DESIGN.borderHover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = DESIGN.surface;
        e.currentTarget.style.borderColor = DESIGN.border;
      }}
    >
      {hasResults && (
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            backgroundColor: DESIGN.greenGlow,
            border: `1px solid ${DESIGN.green}`,
            borderRadius: '6px',
            padding: '4px 10px',
            fontSize: '11px',
            fontWeight: '600',
            color: DESIGN.green,
            letterSpacing: '0.5px',
          }}
        >
          {score} / {band}
        </div>
      )}
      <h3 style={{ fontSize: '16px', fontWeight: '600', color: DESIGN.textPrimary, margin: '0 0 8px 0' }}>
        {title}
      </h3>
      <p style={{ fontSize: '13px', color: DESIGN.textSecondary, margin: '0 0 16px 0', lineHeight: '1.4' }}>
        {description}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          onClick={onBegin}
          style={{
            padding: '10px 16px',
            backgroundColor: DESIGN.surface,
            border: `1px solid ${DESIGN.green}`,
            color: DESIGN.green,
            cursor: 'pointer',
            borderRadius: '8px',
            fontSize: '13px',
            fontFamily: DESIGN.fontFamily,
            fontWeight: '600',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = DESIGN.greenGlow;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = DESIGN.surface;
          }}
        >
          BEGIN {title.split(' ')[0].toUpperCase()} ASSESSMENT →
        </button>
        {hasResults && (
          <button
            onClick={onViewResults}
            style={{
              padding: '10px 16px',
              backgroundColor: 'transparent',
              border: `1px solid ${DESIGN.border}`,
              color: DESIGN.textPrimary,
              cursor: 'pointer',
              borderRadius: '8px',
              fontSize: '13px',
              fontFamily: DESIGN.fontFamily,
              fontWeight: '600',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = DESIGN.surfaceHover;
              e.currentTarget.style.borderColor = DESIGN.borderHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = DESIGN.border;
            }}
          >
            VIEW RESULTS
          </button>
        )}
      </div>
    </div>
  );
}

function HubView({ eqData, iqData, onBeginEQ, onBeginIQ, onViewEQResults, onViewIQResults, onExploreStrengths, hasTests }) {
  return (
    <div style={{ animation: 'fadeIn 0.2s ease' }}>
      <h2 style={{ fontSize: '18px', fontWeight: '600', color: DESIGN.textPrimary, marginBottom: '24px', margin: '0 0 24px 0' }}>
        ASSESSMENT HUB
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <TestCard
          title="EQ Radar"
          description="Emotional intelligence assessment. 10 quick scenarios."
          score={eqData?.score}
          band={eqData?.band}
          onBegin={onBeginEQ}
          onViewResults={onViewEQResults}
          hasResults={!!eqData}
        />
        <TestCard
          title="IQ Matrix"
          description="Cognitive ability assessment. Pattern, spatial, logic, memory."
          score={iqData?.score}
          band={iqData?.band}
          onBegin={onBeginIQ}
          onViewResults={onViewIQResults}
          hasResults={!!iqData}
        />
      </div>

      {hasTests && (
        <div
          style={{
            padding: '24px',
            backgroundColor: DESIGN.surface,
            border: `1px solid ${DESIGN.border}`,
            borderRadius: '12px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '12px', color: DESIGN.textMuted, marginBottom: '8px', letterSpacing: '0.5px', fontWeight: '600' }}>
            ━━━━━━━━━━━ YOUR STRENGTHS ━━━━━━━━━━━
          </div>
          <p style={{ fontSize: '13px', color: DESIGN.textSecondary, margin: '0 0 16px 0', lineHeight: '1.5' }}>
            Build on what's already strong.
            <br />
            Personalised AV reinforcement + Vijnana challenges.
          </p>
          <button
            onClick={onExploreStrengths}
            style={{
              padding: '10px 16px',
              backgroundColor: DESIGN.surface,
              border: `1px solid ${DESIGN.green}`,
              color: DESIGN.green,
              cursor: 'pointer',
              borderRadius: '8px',
              fontSize: '13px',
              fontFamily: DESIGN.fontFamily,
              fontWeight: '600',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = DESIGN.greenGlow;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = DESIGN.surface;
            }}
          >
            EXPLORE YOUR STRENGTHS →
          </button>
        </div>
      )}

      {!hasTests && (
        <div
          style={{
            padding: '24px',
            backgroundColor: DESIGN.surface,
            border: `1px solid ${DESIGN.border}`,
            borderRadius: '12px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '12px', color: DESIGN.textMuted, marginBottom: '8px', letterSpacing: '0.5px', fontWeight: '600' }}>
            ━━━━━━━━━━━ YOUR STRENGTHS ━━━━━━━━━━━
          </div>
          <p style={{ fontSize: '13px', color: DESIGN.textSecondary, margin: 0, lineHeight: '1.5' }}>
            Complete the EQ or IQ assessment first to unlock your strength profile.
          </p>
        </div>
      )}

      <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
    </div>
  );
}

// ── Self-Discovery questions ─────────────────────────────────────────────
const SD_QUESTIONS = [
  { q: "When you're stuck, your first instinct is to...", a: "Figure out what I need to DO differently", b: "Question who I need to BE differently" },
  { q: "Your biggest frustration is usually...", a: "Not performing well enough", b: "Not understanding myself well enough" },
  { q: "What excites you most about growth?", a: "Getting better — mastering skills and getting real results", b: "Understanding my inner operating system" },
  { q: "When things go wrong, you look for...", a: "What actions or strategies to change", b: "What beliefs or stories I've been running" },
  { q: "Right now you most want...", a: "A clearer strategy for success", b: "Clarity on why I keep getting in my own way" },
  { q: "Your relationship with your past:", a: "Fuel — I use it to push forward", b: "It pulls me back sometimes without me meaning it to" },
  { q: "When things feel off but you can't explain why...", a: "You push through and keep going", b: "You stop and sit with the discomfort" },
  { q: "What feels most true right now:", a: "I need to work harder and smarter", b: "I need to look at something I've been avoiding seeing" },
  { q: "At your best, it's about...", a: "Performing at the highest level", b: "Being fully present and clear from the inside" },
];

function SelfDiscoveryView({ onComplete, onBack }) {
  const [idx, setIdx]       = useState(0);
  const [answers, setAnswers] = useState([]); // 'fox' | 'werner'

  const handleAnswer = (choice) => {
    const next = [...answers, choice];
    if (idx < SD_QUESTIONS.length - 1) {
      setAnswers(next);
      setIdx(idx + 1);
    } else {
      // Tally
      const foxCount    = next.filter(a => a === 'fox').length;
      const wernerCount = next.filter(a => a === 'werner').length;
      let nominated;
      if (foxCount >= 6)    nominated = ['fox'];
      else if (wernerCount >= 6) nominated = ['werner'];
      else                  nominated = ['fox', 'werner'];
      const result = { foxCount, wernerCount, nominated };
      localStorage.setItem('healai_guru_nominated', JSON.stringify(result));
      onComplete(result);
    }
  };

  const progress = ((idx) / SD_QUESTIONS.length) * 100;
  const q = SD_QUESTIONS[idx];

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', maxWidth: '520px', margin: '0 auto' }}>
      <button onClick={onBack} style={{
        background: 'none', border: 'none', color: DESIGN.textMuted,
        fontSize: '13px', cursor: 'pointer', padding: 0, marginBottom: '24px',
        fontFamily: DESIGN.fontFamily, display: 'flex', alignItems: 'center', gap: '6px',
      }}>← Back</button>

      <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: DESIGN.textMuted, letterSpacing: '0.06em' }}>
          SELF-DISCOVERY · {idx + 1} of {SD_QUESTIONS.length}
        </span>
        <span style={{ fontSize: '11px', color: DESIGN.textMuted }}>◈ Guru Map</span>
      </div>

      {/* Progress bar */}
      <div style={{ height: '2px', backgroundColor: DESIGN.border, borderRadius: '2px', marginBottom: '32px' }}>
        <div style={{
          height: '100%', width: `${progress}%`,
          backgroundColor: '#f59e0b', borderRadius: '2px',
          transition: 'width 0.3s ease',
        }} />
      </div>

      <h3 style={{ fontSize: '18px', fontWeight: 600, color: DESIGN.textPrimary, lineHeight: 1.55, marginBottom: '28px', letterSpacing: '-0.01em' }}>
        {q.q}
      </h3>

      <div key={`sd-${idx}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {[
          {
            label: q.a, choice: 'fox',
            gradient: 'linear-gradient(155deg, #064e3b 0%, #059669 55%, #34d399 100%)',
            shine:    'radial-gradient(ellipse at 32% 18%, rgba(255,255,255,0.2) 0%, transparent 52%)',
            glow:     'rgba(52,211,153,0.75)',
            art:      '🦊',
            watermark:'◈',
            accent:   '#a7f3d0',
          },
          {
            label: q.b, choice: 'werner',
            gradient: 'linear-gradient(155deg, #78350f 0%, #b45309 55%, #d97706 100%)',
            shine:    'radial-gradient(ellipse at 68% 18%, rgba(255,255,255,0.2) 0%, transparent 52%)',
            glow:     'rgba(217,119,6,0.75)',
            art:      '◈',
            watermark:'◉',
            accent:   '#fde68a',
          },
        ].map(({ label, choice, gradient, shine, glow, art, watermark, accent }) => (
          <button
            key={choice}
            className="tarot-btn"
            onClick={() => handleAnswer(choice)}
            style={{
              position: 'relative', overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 10px 16px',
              minHeight: '215px',
              background: gradient,
              border: '2px solid rgba(255,255,255,0.1)',
              borderRadius: '20px', cursor: 'pointer',
              fontFamily: DESIGN.fontFamily,
              boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
              transition: 'border-color 0.18s ease, box-shadow 0.18s ease, transform 0.15s ease',
              animation: 'cardReveal 0.32s ease both',
              outline: 'none',
              WebkitTapHighlightColor: 'transparent',
              userSelect: 'none',
            }}
          >
            {/* Shine */}
            <div style={{ position: 'absolute', inset: 0, background: shine, pointerEvents: 'none', borderRadius: '18px', zIndex: 0 }} />
            {/* Watermark */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '108px', lineHeight: 1,
              color: 'rgba(255,255,255,0.07)',
              pointerEvents: 'none', userSelect: 'none', zIndex: 0,
            }}>
              {watermark}
            </div>
            {/* Corner medallion — top-left */}
            <div style={{
              position: 'absolute', top: '12px', left: '12px',
              width: '58px', height: '58px', borderRadius: '50%',
              background: 'rgba(0,0,0,0.26)',
              border: '2px solid rgba(255,255,255,0.2)',
              boxShadow: `0 0 24px ${glow}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 1,
            }}>
              <span style={{ fontSize: '30px', lineHeight: 1, color: accent, filter: `drop-shadow(0 0 10px ${glow})` }}>
                {art}
              </span>
            </div>
            {/* Answer text — large, centred */}
            <div style={{
              zIndex: 1, fontSize: '15px', fontWeight: 600,
              color: 'rgba(255,255,255,0.97)',
              textAlign: 'center', lineHeight: 1.45,
              textShadow: '0 2px 8px rgba(0,0,0,0.7)',
              padding: '0 8px', width: '100%',
              paddingTop: '64px',
            }}>
              {label}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function SelfDiscoveryResult({ result, onGoToGuru, onBack }) {
  const both = result.nominated.length > 1;
  return (
    <div style={{ animation: 'fadeIn 0.3s ease', maxWidth: '520px', margin: '0 auto', textAlign: 'center' }}>
      <div style={{ fontSize: '36px', marginBottom: '16px' }}>
        {both ? '🦊◈' : result.nominated[0] === 'fox' ? '🦊' : '◈'}
      </div>
      <h2 style={{ fontSize: '20px', fontWeight: 700, color: DESIGN.textPrimary, marginBottom: '10px' }}>
        {both
          ? 'Both Guides Nominated'
          : result.nominated[0] === 'fox'
            ? 'Gen-AI Fox Nominated'
            : 'Werner Chat Nominated'}
      </h2>
      <p style={{ fontSize: '14px', color: DESIGN.textSecondary, lineHeight: 1.6, marginBottom: '28px' }}>
        {both
          ? "Your map shows both performance drive and deep inner curiosity. You're wired to build AND transform. Both guides are activated for you."
          : result.nominated[0] === 'fox'
            ? "Your operating pattern is execution-first — you think in systems, skills, and results. Gen-AI Fox is your guide."
            : "Your operating pattern is being-first — you sense there's a deeper shift needed before strategy makes sense. Werner Chat is your guide."}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button onClick={onGoToGuru} style={{
          padding: '14px', backgroundColor: DESIGN.green,
          border: 'none', borderRadius: '10px', color: '#000',
          fontSize: '14px', fontWeight: 700, cursor: 'pointer',
          fontFamily: DESIGN.fontFamily,
        }}>
          Open AI Guru →
        </button>
        <button onClick={onBack} style={{
          padding: '13px', backgroundColor: 'transparent',
          border: `1px solid ${DESIGN.border}`, borderRadius: '10px',
          color: DESIGN.textSecondary, fontSize: '14px', cursor: 'pointer',
          fontFamily: DESIGN.fontFamily,
        }}>
          Back to Assess Hub
        </button>
      </div>
    </div>
  );
}

// ── Test Selection View ──────────────────────────────────────────────────
// ── Personality Question View ──────────────────────────────────────────────
function PersonalityQuestionView({ questions, onComplete }) {
  const [idx, setIdx]           = useState(0);
  const [responses, setResponses] = useState([]);
  const [selected, setSelected] = useState(null);
  const q     = questions[idx];
  const total = questions.length;
  const LABELS = ['A', 'B', 'C', 'D', 'E'];

  const PERSONA_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'];

  const handleAnswer = (i) => {
    if (selected !== null) return;
    setSelected(i);
    setTimeout(() => {
      const nr = [...responses, { qIdx: idx, chosen: i }];
      setResponses(nr);
      setSelected(null);
      if (idx < total - 1) {
        setIdx(idx + 1);
      } else {
        onComplete(computePersonalityScore(nr, questions));
      }
    }, 350);
  };

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', width: '100%' }}>
      <style>{`.pers-btn:active { transform: scale(0.96) !important; }`}</style>

      {/* Progress */}
      <div style={{ height: '3px', backgroundColor: DESIGN.border, borderRadius: '2px', marginBottom: '20px' }}>
        <div style={{
          height: '100%', width: `${(idx / total) * 100}%`,
          background: 'linear-gradient(90deg, #8b5cf6, #a78bfa)',
          borderRadius: '2px', transition: 'width 0.4s ease',
          boxShadow: '0 0 8px rgba(139,92,246,0.6)',
        }} />
      </div>

      {/* Counter */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', gap: '8px' }}>
        <span style={{ fontSize: '12px', color: '#a78bfa', fontWeight: 700, letterSpacing: '0.08em' }}>
          ◈ PERSONALITY
        </span>
        <span style={{ fontSize: '12px', color: DESIGN.textMuted, marginLeft: 'auto' }}>
          {idx + 1} / {total}
        </span>
      </div>

      {/* Question card */}
      <div key={idx} style={{
        backgroundColor: 'rgba(139,92,246,0.07)',
        border: '1px solid rgba(139,92,246,0.2)',
        borderRadius: '18px',
        padding: '22px 20px 16px',
        marginBottom: '16px',
        animation: 'cardReveal 0.3s ease',
      }}>
        <p style={{
          fontSize: '15px', fontWeight: 600, color: DESIGN.textPrimary,
          lineHeight: 1.6, margin: 0,
          fontFamily: DESIGN.fontFamily,
        }}>
          {q.q}
        </p>
      </div>

      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {q.opts.map((opt, i) => (
          <button
            key={i}
            className="pers-btn"
            onClick={() => handleAnswer(i)}
            style={{
              padding: '14px 16px',
              backgroundColor: selected === i
                ? `${PERSONA_COLORS[i % PERSONA_COLORS.length]}22`
                : 'rgba(255,255,255,0.03)',
              border: `1px solid ${selected === i
                ? PERSONA_COLORS[i % PERSONA_COLORS.length]
                : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '12px',
              cursor: selected !== null ? 'default' : 'pointer',
              display: 'flex', alignItems: 'flex-start', gap: '12px',
              textAlign: 'left',
              transition: 'all 0.2s ease',
              fontFamily: DESIGN.fontFamily,
              outline: 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span style={{
              width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
              backgroundColor: `${PERSONA_COLORS[i % PERSONA_COLORS.length]}22`,
              border: `1px solid ${PERSONA_COLORS[i % PERSONA_COLORS.length]}`,
              color: PERSONA_COLORS[i % PERSONA_COLORS.length],
              fontSize: '11px', fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {LABELS[i]}
            </span>
            <span style={{
              fontSize: '14px', fontWeight: 500, color: DESIGN.textPrimary,
              lineHeight: 1.5, flex: 1,
            }}>
              {opt}
            </span>
          </button>
        ))}
      </div>
      <div style={{ height: '24px' }} />
    </div>
  );
}

// ── Personality Result View ───────────────────────────────────────────────
function PersonalityResultView({ result, onBack, onGoToGuru }) {
  const { typeProfile, tally, score, band } = result;
  const TALLY_LABELS = { E: 'Explorer', B: 'Builder', C: 'Connector', A: 'Achiever' };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', maxWidth: '480px', margin: '0 auto' }}>
      <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>

      {/* Back */}
      <button onClick={onBack} style={{
        fontSize: '12px', color: DESIGN.textSecondary,
        backgroundColor: 'transparent', border: 'none',
        cursor: 'pointer', fontFamily: DESIGN.fontFamily,
        marginBottom: '20px', padding: 0,
      }}>
        ← ASSESS
      </button>

      {/* Hero card */}
      <div style={{
        background: typeProfile.gradient,
        borderRadius: '20px', padding: '28px 24px', marginBottom: '20px',
        boxShadow: `0 12px 48px ${typeProfile.color}33`,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 60%)',
        }} />
        <div style={{ fontSize: '52px', marginBottom: '8px' }}>{typeProfile.emoji}</div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)', letterSpacing: '0.1em', marginBottom: '4px' }}>
          PERSONALITY TYPE
        </div>
        <div style={{ fontSize: '28px', fontWeight: 800, color: '#fff', marginBottom: '4px', fontFamily: DESIGN.fontFamily }}>
          The {typeProfile.label}
        </div>
        <div style={{ fontSize: '15px', color: 'rgba(255,255,255,0.8)', fontStyle: 'italic' }}>
          {typeProfile.tagline}
        </div>
        <div style={{
          display: 'inline-block', marginTop: '14px',
          padding: '4px 12px', borderRadius: '20px',
          backgroundColor: 'rgba(0,0,0,0.25)',
          fontSize: '11px', color: '#fff', letterSpacing: '0.08em',
        }}>
          {score}% {band} MATCH
        </div>
      </div>

      {/* Description */}
      <div style={{
        padding: '20px', backgroundColor: DESIGN.surface,
        border: `1px solid ${typeProfile.color}33`,
        borderRadius: '14px', marginBottom: '16px',
      }}>
        <p style={{ fontSize: '14px', color: DESIGN.textPrimary, lineHeight: 1.7, margin: 0, fontFamily: DESIGN.fontFamily }}>
          {typeProfile.description}
        </p>
      </div>

      {/* Strengths */}
      <div style={{
        padding: '20px', backgroundColor: DESIGN.surface,
        border: `1px solid ${DESIGN.border}`,
        borderRadius: '14px', marginBottom: '16px',
      }}>
        <div style={{ fontSize: '10px', color: DESIGN.textMuted, letterSpacing: '0.08em', marginBottom: '12px' }}>
          YOUR STRENGTHS
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {typeProfile.strengths.map((s, i) => (
            <span key={i} style={{
              padding: '5px 12px', borderRadius: '20px',
              backgroundColor: `${typeProfile.color}15`,
              border: `1px solid ${typeProfile.color}44`,
              fontSize: '12px', color: typeProfile.color, fontWeight: 600,
            }}>{s}</span>
          ))}
        </div>
      </div>

      {/* Growth area */}
      <div style={{
        padding: '16px 20px', backgroundColor: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '14px', marginBottom: '16px',
      }}>
        <div style={{ fontSize: '10px', color: DESIGN.textMuted, letterSpacing: '0.08em', marginBottom: '8px' }}>
          GROWTH EDGE
        </div>
        <p style={{ fontSize: '13px', color: DESIGN.textSecondary, margin: 0, lineHeight: 1.6 }}>
          {typeProfile.growthArea}
        </p>
      </div>

      {/* Tally breakdown */}
      <div style={{
        padding: '20px', backgroundColor: DESIGN.surface,
        border: `1px solid ${DESIGN.border}`,
        borderRadius: '14px', marginBottom: '24px',
      }}>
        <div style={{ fontSize: '10px', color: DESIGN.textMuted, letterSpacing: '0.08em', marginBottom: '14px' }}>
          SCORE BREAKDOWN
        </div>
        {Object.entries(tally).map(([code, count]) => {
          const tp = PERSONALITY_TYPES[code];
          const pct = Math.round((count / Object.values(tally).reduce((a, b) => a + b, 1)) * 100);
          return (
            <div key={code} style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', color: DESIGN.textSecondary }}>
                  {tp.emoji} {tp.label}
                </span>
                <span style={{ fontSize: '12px', color: tp.color, fontWeight: 600 }}>{pct}%</span>
              </div>
              <div style={{ height: '4px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '2px' }}>
                <div style={{
                  height: '100%', width: `${pct}%`,
                  backgroundColor: tp.color,
                  borderRadius: '2px', transition: 'width 0.6s ease',
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA */}
      <button onClick={onGoToGuru} style={{
        display: 'block', width: '100%', padding: '15px',
        background: typeProfile.gradient,
        border: 'none', borderRadius: '14px',
        color: '#fff', fontSize: '15px', fontWeight: 700,
        cursor: 'pointer', fontFamily: DESIGN.fontFamily,
        boxShadow: `0 4px 24px ${typeProfile.color}44`,
        marginBottom: '12px',
        WebkitTapHighlightColor: 'transparent',
      }}>
        Talk to Your AI Guru →
      </button>
      <button onClick={onBack} style={{
        display: 'block', width: '100%', padding: '12px',
        backgroundColor: 'transparent', border: `1px solid ${DESIGN.border}`,
        borderRadius: '12px', color: DESIGN.textMuted,
        fontSize: '13px', cursor: 'pointer', fontFamily: DESIGN.fontFamily,
        WebkitTapHighlightColor: 'transparent',
      }}>
        Back to Tests
      </button>
    </div>
  );
}

function TestSelectionView({ eqData, iqData, personalityData, onSelectEQ, onSelectIQ, onSelectSD, onSelectPersonality, onSkip }) {
  const profile = (() => {
    if (typeof window === 'undefined') return null;
    try { return JSON.parse(localStorage.getItem('healai_profile') || 'null'); } catch { return null; }
  })();
  const name = profile?.name ? `, ${profile.name.split(' ')[0]}` : '';

  const TESTS = [
    {
      id: 'eq', icon: '🧠', label: 'EQ Radar', badge: 'CORE',
      badgeColor: DESIGN.green,
      title: 'Emotional Intelligence',
      desc: '10 scenario questions across 5 domains: Self-Awareness, Self-Regulation, Empathy, Social Skills, Motivation.',
      enables: ['Guardian radar + alerts', 'Flow state recommendations', 'AI Guru emotional context'],
      done: !!eqData,
      score: eqData ? `${eqData.score} · ${eqData.band}` : null,
      onBegin: onSelectEQ,
    },
    {
      id: 'iq', icon: '⚡', label: 'IQ Matrix', badge: 'CORE',
      badgeColor: DESIGN.green,
      title: 'Cognitive Ability',
      desc: '10 questions across 4 domains: Pattern Recognition, Spatial Reasoning, Memory, Logic.',
      enables: ['Strength Identity title', 'Vijnana difficulty calibration', 'Learning pattern map'],
      done: !!iqData,
      score: iqData ? `SS ${iqData.score} · ${iqData.band}` : null,
      onBegin: onSelectIQ,
    },
    {
      id: 'personality', icon: '🔮', label: 'Personality', badge: 'NEW',
      badgeColor: '#8b5cf6',
      title: 'Learning Archetype',
      desc: 'Discover your natural learning style — Explorer, Builder, Connector, or Achiever — with questions tailored to your age group.',
      enables: ['Vijnana learning archetype match', 'Personalised study challenge style', 'AI Guru personality context'],
      done: !!personalityData,
      score: personalityData ? `${personalityData.typeProfile?.label} · ${personalityData.band}` : null,
      onBegin: onSelectPersonality,
    },
    {
      id: 'sd', icon: '◈', label: 'Self-Discovery', badge: 'OPTIONAL',
      badgeColor: '#f59e0b',
      title: 'Find Your AI Guru',
      desc: '9 binary questions mapping your transformational operating pattern — how you relate to growth, obstacles, and change.',
      enables: ['AI Guru nomination (Fox / Werner / Both)', 'Transformational work baseline'],
      done: typeof window !== 'undefined' && !!localStorage.getItem('healai_guru_nominated'),
      score: null,
      onBegin: onSelectSD,
    },
  ];

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: DESIGN.textPrimary, margin: '0 0 8px' }}>
          Your Assessment Path{name}
        </h2>
        <p style={{ fontSize: '13px', color: DESIGN.textSecondary, margin: 0, lineHeight: 1.6 }}>
          Each test unlocks a different layer of your intelligence map. Select what you want to explore.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
        {TESTS.map(t => (
          <div key={t.id} style={{
            padding: '20px', backgroundColor: DESIGN.surface,
            border: `1px solid ${t.done ? 'rgba(34,197,94,0.3)' : DESIGN.border}`,
            borderRadius: '14px',
          }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <span style={{ fontSize: '20px' }}>{t.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: DESIGN.textPrimary }}>{t.label}</span>
                  <span style={{
                    fontSize: '9px', fontWeight: 700, letterSpacing: '0.06em',
                    color: t.badgeColor, border: `1px solid ${t.badgeColor}`,
                    borderRadius: '4px', padding: '2px 6px',
                    backgroundColor: t.id === 'sd' ? 'rgba(245,158,11,0.08)' : DESIGN.greenGlow,
                  }}>{t.badge}</span>
                  {t.done && <span style={{ fontSize: '9px', color: DESIGN.green, letterSpacing: '0.04em' }}>✓ DONE{t.score ? ` · ${t.score}` : ''}</span>}
                </div>
                <div style={{ fontSize: '12px', color: DESIGN.textMuted }}>{t.title}</div>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: DESIGN.textSecondary, margin: '0 0 12px', lineHeight: 1.5 }}>
              {t.desc}
            </p>

            {/* Enables */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '10px', color: DESIGN.textMuted, letterSpacing: '0.06em', marginBottom: '6px' }}>
                UNLOCKS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {t.enables.map((e, i) => (
                  <div key={i} style={{ fontSize: '12px', color: DESIGN.textSecondary, display: 'flex', gap: '6px' }}>
                    <span style={{ color: t.id === 'sd' ? '#f59e0b' : DESIGN.green }}>→</span> {e}
                  </div>
                ))}
              </div>
            </div>

            <button onClick={t.onBegin} style={{
              padding: '10px 16px', width: '100%',
              backgroundColor: t.done ? 'transparent' : (t.id === 'sd' ? 'rgba(245,158,11,0.08)' : DESIGN.greenGlow),
              border: `1px solid ${t.done ? DESIGN.border : (t.id === 'sd' ? 'rgba(245,158,11,0.4)' : DESIGN.green)}`,
              borderRadius: '8px',
              color: t.done ? DESIGN.textSecondary : (t.id === 'sd' ? '#f59e0b' : DESIGN.green),
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              fontFamily: DESIGN.fontFamily, transition: 'all 0.2s ease',
            }}>
              {t.done ? `Retake ${t.label} →` : `Begin ${t.label} →`}
            </button>
          </div>
        ))}
      </div>

      <button onClick={onSkip} style={{
        width: '100%', padding: '12px',
        backgroundColor: 'transparent', border: `1px solid ${DESIGN.border}`,
        borderRadius: '10px', color: DESIGN.textMuted,
        fontSize: '13px', cursor: 'pointer', fontFamily: DESIGN.fontFamily,
      }}>
        Go to Assessment Hub →
      </button>

      <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
    </div>
  );
}

// ── Optional Save-Profile bottom sheet ────────────────────────────────────────
function SaveProfileOverlay({ onSave, onSkip }) {
  const [name, setName]         = useState('');
  const [grade, setGrade]       = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [mounted, setMounted]   = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 40);
    return () => clearTimeout(t);
  }, []);

  const handleSave = () => {
    const profile = { name: name.trim() || 'Explorer', grade, whatsapp, createdAt: Date.now() };
    localStorage.setItem('healai_profile', JSON.stringify(profile));
    onSave(profile);
  };

  const inp = {
    display: 'block', width: '100%', padding: '12px 14px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px', color: '#fff',
    fontSize: '15px', fontFamily: DESIGN.fontFamily,
    outline: 'none', marginBottom: '10px',
    boxSizing: 'border-box',
    WebkitAppearance: 'none',
  };

  return (
    <div
      onClick={onSkip}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.68)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '480px',
          background: 'linear-gradient(180deg, #111116 0%, #0d0d10 100%)',
          borderRadius: '24px 24px 0 0',
          padding: '10px 22px 52px',
          border: '1px solid rgba(255,255,255,0.1)',
          borderBottom: 'none',
          boxShadow: '0 -8px 56px rgba(0,0,0,0.75)',
          transform: mounted ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.38s cubic-bezier(0.34,1.15,0.64,1)',
        }}
      >
        {/* Handle */}
        <div style={{
          width: '38px', height: '4px', borderRadius: '2px',
          background: 'rgba(255,255,255,0.15)',
          margin: '0 auto 22px',
        }} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{ fontSize: '26px' }}>🎯</span>
              <span style={{ fontSize: '18px', fontWeight: 700, color: '#fff', fontFamily: DESIGN.fontFamily }}>
                Save Your Results
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.42)', margin: 0, lineHeight: 1.55, fontFamily: DESIGN.fontFamily }}>
              Name your journey — keep your intelligence map.
            </p>
          </div>
          <button onClick={onSkip} style={{
            width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.5)', fontSize: '15px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: DESIGN.fontFamily, outline: 'none',
            WebkitTapHighlightColor: 'transparent', marginLeft: '10px', marginTop: '-2px',
          }}>×</button>
        </div>

        <div style={{ height: '20px' }} />

        {/* Fields */}
        <input type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} style={inp} />
        <select value={grade} onChange={e => setGrade(e.target.value)} style={{ ...inp, color: grade ? '#fff' : 'rgba(255,255,255,0.35)' }}>
          <option value="">Grade / Year</option>
          {['Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12','College','Other'].map(g => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <input type="tel" placeholder="WhatsApp (optional)" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} style={{ ...inp, marginBottom: '22px' }} />

        {/* Save */}
        <button onClick={handleSave} style={{
          display: 'block', width: '100%', padding: '15px',
          background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
          border: 'none', borderRadius: '14px',
          color: '#fff', fontSize: '15px', fontWeight: 700,
          cursor: 'pointer', fontFamily: DESIGN.fontFamily,
          marginBottom: '12px',
          boxShadow: '0 4px 24px rgba(34,197,94,0.38)',
          WebkitTapHighlightColor: 'transparent',
          letterSpacing: '0.01em',
        }}>
          Save &amp; Continue →
        </button>

        {/* Skip */}
        <button onClick={onSkip} style={{
          display: 'block', width: '100%', padding: '10px',
          background: 'none', border: 'none',
          color: 'rgba(255,255,255,0.3)', fontSize: '13px',
          cursor: 'pointer', fontFamily: DESIGN.fontFamily,
          WebkitTapHighlightColor: 'transparent',
        }}>
          Skip for now
        </button>
      </div>
    </div>
  );
}

// ── Breadcrumb back-nav row ───────────────────────────────────────────────────
function NavRow({ label, onBack }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', gap: '6px' }}>
      <button onClick={onBack} style={{
        display: 'flex', alignItems: 'center', gap: '5px',
        background: 'none', border: 'none',
        color: 'rgba(255,255,255,0.35)', fontSize: '13px',
        cursor: 'pointer', padding: '6px 0',
        fontFamily: DESIGN.fontFamily, outline: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}>
        ← Home
      </button>
      <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px' }}>·</span>
      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600 }}>{label}</span>
    </div>
  );
}

export default function AssessSection({ onBeginArchetype, onKidsCorner, onGoToGuru }) {
  const [activeView, setActiveView] = useState('select'); // 'select' first
  const [showSignup, setShowSignup] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(() => {
    if (typeof window === 'undefined') return false;
    const last = localStorage.getItem('healai_session_date');
    return last === new Date().toDateString();
  });
  const [eqData,          setEQData]          = useState(null);
  const [iqData,          setIQData]          = useState(null);
  const [personalityData, setPersonalityData] = useState(null);
  const [resultsType,     setResultsType]     = useState('eq');
  const [sdResult,        setSdResult]        = useState(null);
  const [personalityResult, setPersonalityResult] = useState(null);

  // Derive the student's grade from saved profile, fallback to 'teen'
  const studentGrade = (() => {
    if (typeof window === 'undefined') return '';
    try {
      const p = JSON.parse(localStorage.getItem('healai_profile') || 'null');
      return p?.grade || '';
    } catch { return ''; }
  })();

  // Age-appropriate question sets
  const eqQuestions          = getQuestions('eq',          studentGrade);
  const iqQuestions          = getQuestions('iq',          studentGrade);
  const personalityQuestions = getQuestions('personality', studentGrade);

  useEffect(() => {
    const eqRaw          = localStorage.getItem('healai_eq');
    const iqRaw          = localStorage.getItem('healai_iq');
    const personalityRaw = localStorage.getItem('healai_personality');
    if (eqRaw) {
      try {
        const parsed = JSON.parse(eqRaw);
        if (parsed.score !== undefined) setEQData(parsed);
      } catch (e) {}
    }
    if (iqRaw) {
      try {
        const parsed = JSON.parse(iqRaw);
        if (parsed.score !== undefined) setIQData(parsed);
      } catch (e) {}
    }
    if (personalityRaw) {
      try {
        const parsed = JSON.parse(personalityRaw);
        if (parsed.type !== undefined) setPersonalityData(parsed);
      } catch (e) {}
    }
  }, []);

  // Show optional signup overlay after any result — only if no profile saved yet
  const checkAndShowSignup = () => {
    if (!localStorage.getItem('healai_profile')) {
      setTimeout(() => setShowSignup(true), 850);
    }
  };

  const handleEQComplete = (result) => {
    setEQData(result);
    localStorage.setItem('healai_eq', JSON.stringify(result));
    setResultsType('eq');
    setActiveView('results');
    checkAndShowSignup();
  };

  const handleIQComplete = (result) => {
    setIQData(result);
    localStorage.setItem('healai_iq', JSON.stringify(result));
    setResultsType('iq');
    setActiveView('results');
    checkAndShowSignup();
  };

  const handlePersonalityComplete = (result) => {
    setPersonalityData(result);
    setPersonalityResult(result);
    localStorage.setItem('healai_personality', JSON.stringify(result));
    setActiveView('personality_result');
    checkAndShowSignup();
  };

  const handleViewEQResults = () => {
    setResultsType('eq');
    setActiveView('results');
  };

  const handleViewIQResults = () => {
    setResultsType('iq');
    setActiveView('results');
  };

  const handleExploreStrengths = () => {
    setActiveView('positive');
  };

  // MoodCheckIn gate — once per day
  if (!sessionStarted) return (
    <MoodCheckIn onComplete={(entry) => {
      const sessions = JSON.parse(localStorage.getItem('healai_sessions') || '[]');
      sessions.push({ date: new Date().toDateString(), startTime: Date.now(), mood: entry.mood, energy: entry.energy });
      localStorage.setItem('healai_sessions', JSON.stringify(sessions));
      localStorage.setItem('healai_session_date', new Date().toDateString());
      setSessionStarted(true);
    }} />
  );

  return (
    <div style={{ padding: '16px 16px 100px', backgroundColor: DESIGN.bg, fontFamily: DESIGN.fontFamily, minHeight: '100vh', color: DESIGN.textPrimary }}>

      {/* Test selection — home screen */}
      {activeView === 'select' && (
        <TestSelectionView
          eqData={eqData}
          iqData={iqData}
          personalityData={personalityData}
          onSelectEQ={() => setActiveView('eq')}
          onSelectIQ={() => setActiveView('iq')}
          onSelectSD={() => setActiveView('sd')}
          onSelectPersonality={() => setActiveView('personality')}
          onSkip={() => setActiveView('hub')}
        />
      )}

      {activeView === 'hub' && (
        <HubView
          eqData={eqData}
          iqData={iqData}
          onBeginEQ={() => setActiveView('eq')}
          onBeginIQ={() => setActiveView('iq')}
          onViewEQResults={handleViewEQResults}
          onViewIQResults={handleViewIQResults}
          onExploreStrengths={handleExploreStrengths}
          hasTests={!!(eqData || iqData)}
        />
      )}

      {activeView === 'eq' && (
        <div>
          <NavRow label="EQ Radar" onBack={() => setActiveView('select')} />
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: DESIGN.textPrimary, margin: '0 0 4px' }}>
            EQ RADAR
          </h2>
          <p style={{ fontSize: '12px', color: DESIGN.textMuted, margin: '0 0 22px' }}>
            10 scenario-based questions · 5 emotional domains
          </p>
          <EQQuestionView questions={eqQuestions} onComplete={handleEQComplete} />
        </div>
      )}

      {activeView === 'iq' && (
        <div>
          <NavRow label="IQ Matrix" onBack={() => setActiveView('select')} />
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: DESIGN.textPrimary, margin: '0 0 4px' }}>
            IQ MATRIX
          </h2>
          <p style={{ fontSize: '12px', color: DESIGN.textMuted, margin: '0 0 22px' }}>
            10 questions · 4 cognitive domains
          </p>
          <IQQuestionView questions={iqQuestions} onComplete={handleIQComplete} />
        </div>
      )}

      {activeView === 'personality' && (
        <div>
          <NavRow label="Personality" onBack={() => setActiveView('select')} />
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: DESIGN.textPrimary, margin: '0 0 4px' }}>
            PERSONALITY TYPE
          </h2>
          <p style={{ fontSize: '12px', color: DESIGN.textMuted, margin: '0 0 22px' }}>
            {personalityQuestions.length} questions · discover your learning archetype
          </p>
          <PersonalityQuestionView
            questions={personalityQuestions}
            onComplete={handlePersonalityComplete}
          />
        </div>
      )}

      {activeView === 'personality_result' && personalityResult && (
        <PersonalityResultView
          result={personalityResult}
          onBack={() => setActiveView('select')}
          onGoToGuru={() => onGoToGuru ? onGoToGuru() : setActiveView('select')}
        />
      )}

      {activeView === 'sd' && !sdResult && (
        <SelfDiscoveryView
          onComplete={(result) => {
            setSdResult(result);
            checkAndShowSignup();
          }}
          onBack={() => setActiveView('select')}
        />
      )}

      {activeView === 'sd' && sdResult && (
        <SelfDiscoveryResult
          result={sdResult}
          onGoToGuru={() => onGoToGuru ? onGoToGuru() : setActiveView('select')}
          onBack={() => { setSdResult(null); setActiveView('select'); }}
        />
      )}

      {activeView === 'results' && (
        <ResultsView
          resultsType={resultsType}
          eqData={eqData}
          iqData={iqData}
          onBack={() => setActiveView('select')}
        />
      )}

      {activeView === 'positive' && (
        <PositiveView
          eqData={eqData}
          iqData={iqData}
          onBack={() => setActiveView('select')}
        />
      )}

      {/* Optional save-profile overlay — appears after first result reveal */}
      {showSignup && (
        <SaveProfileOverlay
          onSave={() => setShowSignup(false)}
          onSkip={() => setShowSignup(false)}
        />
      )}
    </div>
  );
}
