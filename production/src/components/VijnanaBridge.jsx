"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';

// ── Design tokens ─────────────────────────────────────────────────────────────
const D = {
  bg:           '#0a0a0b',
  surface:      'rgba(255,255,255,0.04)',
  surfaceHover: 'rgba(255,255,255,0.07)',
  border:       'rgba(255,255,255,0.08)',
  borderHover:  'rgba(255,255,255,0.16)',
  text:         '#ffffff',
  textSec:      'rgba(255,255,255,0.5)',
  textMuted:    'rgba(255,255,255,0.25)',
  green:        '#22c55e',
  cyan:         '#06b6d4',
  purple:       '#a78bfa',
  orange:       '#fb923c',
  gold:         '#fbbf24',
  red:          '#f43f5e',
  font:         "'Inter', system-ui, -apple-system, sans-serif",
  mono:         "'JetBrains Mono', 'Fira Code', monospace",
};

// ── Rank thresholds (D → S based on cumulative XP) ────────────────────────────
const RANKS = [
  { rank: 'S', min: 6000, color: '#fbbf24', glow: 'rgba(251,191,36,0.3)',  label: 'Shadow Monarch' },
  { rank: 'A', min: 3000, color: '#a78bfa', glow: 'rgba(167,139,250,0.3)', label: 'Special Grade' },
  { rank: 'B', min: 1500, color: '#06b6d4', glow: 'rgba(6,182,212,0.3)',   label: 'Elite Hunter' },
  { rank: 'C', min: 500,  color: '#22c55e', glow: 'rgba(34,197,94,0.3)',   label: 'Jonin' },
  { rank: 'D', min: 0,    color: '#94a3b8', glow: 'rgba(148,163,184,0.2)', label: 'Genin' },
];
const getRank = (xp) => RANKS.find(r => xp >= r.min) ?? RANKS[RANKS.length - 1];

// ── Archetype system ─────────────────────────────────────────────────────────
const ARCHETYPE_META = {
  Commander: { emoji: '🎯', color: '#f59e0b' },
  Explorer:  { emoji: '🔍', color: '#06b6d4' },
  Warrior:   { emoji: '⚔️', color: '#f87171' },
  Sage:      { emoji: '📖', color: '#a78bfa' },
  Phantom:   { emoji: '👻', color: '#6b7280' },
};

// ── Mastery labels (matches game_engine.js) ───────────────────────────────────
const MASTERY_LABEL = ['locked', 'introduced', 'practiced', 'mastered', 'expert'];
const MASTERY_COLOR = ['#374151', '#6b7280', '#06b6d4', '#22c55e', '#fbbf24'];

// ── Quick challenge bank — Chemistry, Physics, Maths ─────────────────────────
const CHALLENGES = [
  {
    subject: 'Chemistry', anime: 'Naruto', rank: 'D',
    xp: 100,
    q: 'Molten PbBr₂ is electrolysed with inert electrodes. What are the products at each electrode?',
    a: 'Cathode: Pb  (Pb²⁺ + 2e⁻ → Pb)\nAnode: Br₂  (2Br⁻ → Br₂ + 2e⁻)\nMolten = only Pb²⁺ and Br⁻ ions present, no competition.',
  },
  {
    subject: 'Physics', anime: 'Solo Leveling', rank: 'C',
    xp: 200,
    q: 'A 12Ω resistor is connected to a 6V battery. Find the current and power dissipated.',
    a: 'I = V/R = 6/12 = 0.5 A\nP = I²R = 0.25 × 12 = 3 W  (or P = V²/R = 36/12 = 3 W)',
  },
  {
    subject: 'Chemistry', anime: 'JJK', rank: 'B',
    xp: 300,
    q: 'Dilute H₂SO₄ is electrolysed with platinum electrodes. What gas is produced at each electrode?',
    a: 'Cathode: H₂  (2H⁺ + 2e⁻ → H₂)\nAnode: O₂  (4OH⁻ → 2H₂O + O₂ + 4e⁻)\nOH⁻ has lower discharge potential than SO₄²⁻ at anode.',
  },
  {
    subject: 'Physics', anime: 'Attack on Titan', rank: 'B',
    xp: 300,
    q: 'Light travels from glass (n = 1.5) to air (n = 1.0). Find the critical angle.',
    a: 'sin C = n₂/n₁ = 1.0/1.5 = 0.667\nC = sin⁻¹(0.667) ≈ 41.8°\nAbove this angle → total internal reflection.',
  },
  {
    subject: 'Maths', anime: 'Death Note', rank: 'A',
    xp: 400,
    q: 'A ladder 10 m long rests against a wall. Its foot is 6 m from the base. Find the angle with the ground.',
    a: 'Height = √(10² − 6²) = √64 = 8 m\ncos θ = 6/10 = 0.6  →  θ = cos⁻¹(0.6) ≈ 53.1°\n(or sin θ = 8/10 = 0.8  →  θ ≈ 53.1°)',
  },
  {
    subject: 'Maths', anime: 'HxH', rank: 'A',
    xp: 450,
    q: 'Solve: 2x² − 7x + 3 = 0',
    a: 'Discriminant: b²−4ac = 49−24 = 25 > 0  →  two real roots\nx = (7 ± √25) / 4 = (7 ± 5) / 4\nx = 3  or  x = 0.5',
  },
];

// ── Rank colour by letter ─────────────────────────────────────────────────────
const RANK_COLOR = { S: '#fbbf24', A: '#a78bfa', B: '#06b6d4', C: '#22c55e', D: '#94a3b8' };

// ── Animated XP counter hook ──────────────────────────────────────────────────
function useAnimatedCounter(target) {
  const [display, setDisplay] = useState(target);
  const prev = useRef(target);
  useEffect(() => {
    if (target === prev.current) return;
    const delta = target - prev.current;
    const steps = Math.min(Math.abs(delta), 40);
    const step  = delta / steps;
    let cur = prev.current;
    let i   = 0;
    const tid = setInterval(() => {
      i++;
      cur += step;
      setDisplay(Math.round(cur));
      if (i >= steps) { setDisplay(target); clearInterval(tid); }
    }, 25);
    prev.current = target;
    return () => clearInterval(tid);
  }, [target]);
  return display;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function VijnanaBridge() {
  const [isOnline,        setIsOnline]        = useState(null);
  const [revealed,        setRevealed]        = useState(new Set());
  const [sessionXP,       setSessionXP]       = useState(0);
  const [streak,          setStreak]          = useState(0);
  const [narration,       setNarration]       = useState(null);
  const [stepInfo,        setStepInfo]        = useState(null);   // { step, total }
  const [studentProfile,  setStudentProfile]  = useState(null);
  const [subjectFilter,   setSubjectFilter]   = useState('All');
  const [xpFlash,         setXpFlash]         = useState(false);

  const iframeRef = useRef(null);
  const displayXP = useAnimatedCounter(sessionXP);

  // ── Load student profile from localStorage ──────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem('healai_profile');
      if (raw) {
        setStudentProfile({
          ...JSON.parse(raw),
          eqResult:          (() => { try { return JSON.parse(localStorage.getItem('healai_eq'));  } catch { return null; } })(),
          iqResult:          (() => { try { return JSON.parse(localStorage.getItem('healai_iq'));  } catch { return null; } })(),
          personalityResult: (() => { try { return JSON.parse(localStorage.getItem('healai_personality')); } catch { return null; } })(),
        });
      }
    } catch { /* localStorage unavailable */ }
  }, []);

  // ── Poll Vijnana server health ──────────────────────────────────────────────
  useEffect(() => {
    const vijUrl = process.env.NEXT_PUBLIC_VIJNANA_URL || 'http://localhost:3099';
    const check = async () => {
      try {
        await fetch(`${vijUrl}/health`, { mode: 'no-cors' });
        setIsOnline(true);
      } catch {
        setIsOnline(false);
      }
    };
    check();
    const id = setInterval(check, 8000);
    return () => clearInterval(id);
  }, []);

  // ── Handle messages from the game iframe ────────────────────────────────────
  useEffect(() => {
    const onMessage = (event) => {
      const msg = event.data || {};

      if (msg.type === 'vijnana_step') {
        // {type:'vijnana_step', step:N, total:T, narration:str}
        setNarration(msg.narration ?? null);
        setStepInfo(msg.step != null ? { step: msg.step, total: msg.total } : null);
      }

      if (msg.type === 'vijnana_xp') {
        if (typeof msg.xp === 'number') {
          setSessionXP(prev => {
            if (msg.xp > prev) {
              setXpFlash(true);
              setTimeout(() => setXpFlash(false), 800);
            }
            return msg.xp;
          });
        }
        if (typeof msg.streak === 'number') setStreak(msg.streak);
      }

      if (msg.type === 'airjun_eq_complete') localStorage.setItem('healai_eq',  JSON.stringify(msg.payload ?? msg));
      if (msg.type === 'airjun_iq_complete') localStorage.setItem('healai_iq',  JSON.stringify(msg.payload ?? msg));
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // ── Push student context into iframe on load ────────────────────────────────
  const handleIframeLoad = useCallback(() => {
    if (!iframeRef.current || !studentProfile) return;
    const userId = studentProfile.name
      ? studentProfile.name.toLowerCase().replace(/\s+/g, '_')
      : 'vijnana_player';
    try {
      iframeRef.current.contentWindow._vijnanUserId  = userId;
      iframeRef.current.contentWindow._vijnanProfile = {
        userId,
        grade:     studentProfile.grade   || null,
        archetype: studentProfile.personalityResult?.type || null,
        eq:        studentProfile.eqResult?.score  || null,
        iq:        studentProfile.iqResult?.score  || null,
      };
    } catch { /* cross-origin guard */ }
  }, [studentProfile]);

  const toggleReveal = (key) => {
    const next = new Set(revealed);
    next.has(key) ? next.delete(key) : next.add(key);
    setRevealed(next);
  };

  // ── Derived display values ──────────────────────────────────────────────────
  const archetype      = studentProfile?.personalityResult?.type || null;
  const archetypeMeta  = archetype ? ARCHETYPE_META[archetype] : null;
  const studentName    = studentProfile?.name || null;
  const rank           = getRank(displayXP);
  const vijUrl         = process.env.NEXT_PUBLIC_VIJNANA_URL || 'http://localhost:3099';
  const subjects       = ['All', ...new Set(CHALLENGES.map(c => c.subject))];
  const filtered       = subjectFilter === 'All' ? CHALLENGES : CHALLENGES.filter(c => c.subject === subjectFilter);
  const streakLabel    = streak >= 5 ? '🔥🔥🔥' : streak >= 3 ? '🔥🔥' : streak >= 1 ? '🔥' : null;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: D.font, backgroundColor: D.bg, color: D.text, padding: '24px', minHeight: '100vh' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            width: '9px', height: '9px', borderRadius: '50%',
            backgroundColor: D.green,
            boxShadow: `0 0 8px ${D.green}`,
            display: 'inline-block',
          }} />
          <span style={{ fontSize: '11px', letterSpacing: '0.12em', color: D.textMuted, fontWeight: '700' }}>
            VIJNANA ENGINE
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Rank badge */}
          <div style={{
            fontSize: '12px', fontWeight: '800', letterSpacing: '0.1em',
            padding: '5px 12px', borderRadius: '6px',
            border: `1.5px solid ${rank.color}`,
            color: rank.color,
            boxShadow: displayXP > 0 ? `0 0 10px ${rank.glow}` : 'none',
            transition: 'all 0.3s ease',
          }}>
            {rank.rank}-RANK · {rank.label}
          </div>
          {/* Online status */}
          <div style={{
            fontSize: '11px', fontWeight: '700', letterSpacing: '0.06em',
            padding: '5px 12px', borderRadius: '6px',
            backgroundColor: isOnline === true ? D.green : isOnline === false ? D.red : '#374151',
            color: isOnline === false ? '#fff' : '#000',
            transition: 'background-color 0.3s',
          }}>
            {isOnline === null ? '···' : isOnline ? 'LIVE' : 'OFFLINE'}
          </div>
        </div>
      </div>

      {/* ── Student context strip ── */}
      {(studentName || archetype || sessionXP > 0 || streak > 0) && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
          marginBottom: '16px', padding: '10px 14px',
          background: D.surface, borderRadius: '8px', border: `1px solid ${D.border}`,
          fontSize: '12px',
        }}>
          {studentName && <span style={{ color: D.text, fontWeight: '700' }}>{studentName}</span>}
          {archetypeMeta && (
            <span style={{
              padding: '3px 9px', borderRadius: '4px', fontSize: '11px', fontWeight: '700',
              border: `1px solid ${archetypeMeta.color}`, color: archetypeMeta.color,
            }}>
              {archetypeMeta.emoji} {archetype}
            </span>
          )}
          {streakLabel && (
            <span style={{ color: D.orange, fontWeight: '700', fontSize: '13px' }}>
              {streakLabel} ×{streak} streak
            </span>
          )}
          <span style={{
            marginLeft: 'auto',
            color: xpFlash ? D.gold : D.gold,
            fontWeight: '800', fontSize: '15px', fontFamily: D.mono,
            transition: 'transform 0.15s',
            transform: xpFlash ? 'scale(1.12)' : 'scale(1)',
            display: 'inline-block',
          }}>
            ⚡ {displayXP.toLocaleString()} XP
          </span>
        </div>
      )}

      {/* ── Game iframe ── */}
      <div style={{
        position: 'relative', width: '100%', height: '580px',
        borderRadius: narration ? '12px 12px 0 0' : '12px',
        border: `1px solid ${D.border}`,
        borderBottom: narration ? 'none' : `1px solid ${D.border}`,
        backgroundColor: 'rgba(255,255,255,0.02)',
        overflow: 'hidden',
        marginBottom: narration ? 0 : '24px',
      }}>
        {isOnline === false ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100%', gap: '16px',
          }}>
            <div style={{ fontSize: '42px' }}>⚡</div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: D.text }}>Vijnana Engine Offline</div>
            <div style={{ fontSize: '12px', color: D.textMuted, textAlign: 'center', lineHeight: '1.9', maxWidth: '280px' }}>
              Start the game server from the AIrJun repo to play
            </div>
            <div style={{
              fontSize: '13px', fontFamily: D.mono, color: D.cyan,
              background: 'rgba(6,182,212,0.08)', padding: '10px 22px',
              borderRadius: '6px', border: '1px solid rgba(6,182,212,0.2)', letterSpacing: '0.02em',
            }}>
              cd server &amp;&amp; npm start
            </div>
            <div style={{ fontSize: '11px', color: D.textMuted }}>Checking again every 8 s…</div>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            src={`${vijUrl}/game/index.html`}
            onLoad={handleIframeLoad}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="Vijnana Game Engine"
            sandbox="allow-scripts allow-same-origin"
          />
        )}
      </div>

      {/* ── Live narration panel (appears when animation is playing) ── */}
      {narration && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '12px 18px', marginBottom: '24px',
          background: 'rgba(124,106,247,0.07)',
          border: `1px solid rgba(124,106,247,0.2)`,
          borderTop: 'none',
          borderRadius: '0 0 12px 12px',
        }}>
          {stepInfo && (
            <div style={{
              fontSize: '10px', fontWeight: '800', letterSpacing: '0.1em',
              color: D.purple, fontFamily: D.mono, whiteSpace: 'nowrap',
              padding: '4px 10px', borderRadius: '4px',
              border: '1px solid rgba(167,139,250,0.3)',
            }}>
              {stepInfo.step} / {stepInfo.total}
            </div>
          )}
          <div style={{ fontSize: '13px', color: D.textSec, lineHeight: '1.55', fontStyle: 'italic' }}>
            {narration}
          </div>
        </div>
      )}

      {/* ── Quick challenges ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <span style={{ fontSize: '11px', letterSpacing: '0.11em', color: D.textMuted, fontWeight: '700' }}>
          QUICK CHALLENGES
        </span>
        {/* Subject filter pills */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {subjects.map(s => (
            <button
              key={s}
              onClick={() => setSubjectFilter(s)}
              style={{
                fontSize: '10px', fontWeight: '700', letterSpacing: '0.05em',
                padding: '4px 10px', borderRadius: '4px', cursor: 'pointer',
                border: `1px solid ${subjectFilter === s ? D.cyan : D.border}`,
                backgroundColor: subjectFilter === s ? 'rgba(6,182,212,0.1)' : 'transparent',
                color: subjectFilter === s ? D.cyan : D.textMuted,
                fontFamily: D.font, transition: 'all 0.15s ease',
              }}
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '12px' }}>
        {filtered.map((c, idx) => {
          const key      = `${c.subject}-${idx}`;
          const rColor   = RANK_COLOR[c.rank] ?? D.textMuted;
          const isOpen   = revealed.has(key);
          return (
            <div
              key={key}
              style={{
                minWidth: '340px', maxWidth: '380px', flexShrink: 0,
                backgroundColor: 'rgba(255,255,255,0.03)',
                border: `1px solid ${isOpen ? D.borderHover : D.border}`,
                borderRadius: '10px', padding: '14px 16px',
                display: 'flex', flexDirection: 'column', gap: '12px',
                transition: 'border-color 0.2s',
              }}
            >
              {/* Badge row */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <Tag color={D.green}>{c.anime}</Tag>
                <Tag color={rColor}>{c.rank}-Rank</Tag>
                <Tag color={D.textMuted}>{c.subject}</Tag>
                <span style={{ marginLeft: 'auto', fontSize: '13px', color: D.gold, fontWeight: '800', fontFamily: D.mono }}>
                  +{c.xp}
                </span>
              </div>

              {/* Question text */}
              <div style={{
                fontSize: '13px', color: D.text, lineHeight: '1.6',
                display: '-webkit-box', WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {c.q}
              </div>

              {/* Reveal button */}
              <RevealButton isOpen={isOpen} onClick={() => toggleReveal(key)} />

              {/* Answer */}
              {isOpen && (
                <div style={{
                  fontSize: '12px', color: D.textSec, lineHeight: '1.8',
                  borderLeft: `2px solid ${D.green}`, paddingLeft: '12px',
                  fontFamily: D.mono, whiteSpace: 'pre-wrap',
                }}>
                  {c.a}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}

// ── Small reusable sub-components ─────────────────────────────────────────────
function Tag({ color, children }) {
  return (
    <span style={{
      fontSize: '10px', padding: '3px 8px', borderRadius: '4px',
      border: `1px solid ${color}`, color, fontWeight: '600',
    }}>
      {children}
    </span>
  );
}

function RevealButton({ isOpen, onClick }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        fontSize: '11px', fontWeight: '700', letterSpacing: '0.07em',
        backgroundColor: 'transparent',
        border: `1px solid ${hover ? '#06b6d4' : 'rgba(255,255,255,0.12)'}`,
        color: hover ? '#06b6d4' : 'rgba(255,255,255,0.45)',
        padding: '8px 12px', borderRadius: '6px', cursor: 'pointer',
        fontFamily: "'Inter', system-ui, sans-serif",
        transition: 'all 0.15s ease',
      }}
    >
      {isOpen ? '▲ HIDE ANSWER' : '▼ REVEAL ANSWER'}
    </button>
  );
}
