"use client";
import React, { useEffect, useRef, useState } from 'react';

const D = {
  bg: '#0a0a0b',
  surface: 'rgba(255,255,255,0.04)',
  surfaceHover: 'rgba(255,255,255,0.07)',
  border: 'rgba(255,255,255,0.08)',
  borderHover: 'rgba(255,255,255,0.16)',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.5)',
  textMuted: 'rgba(255,255,255,0.25)',
  green: '#22c55e',
  greenDim: 'rgba(34,197,94,0.15)',
  font: "'Inter', system-ui, -apple-system, sans-serif",
};

const ARCHETYPES = {
  commander: { name: 'Commander', anime: 'Solo Leveling', desc: 'Strategic, decisive, outcome-focused. You lead with clarity and command.' },
  explorer: { name: 'Explorer', anime: 'FMA Brotherhood', desc: 'Curious, adaptive, discovery-driven. You find what others miss.' },
  warrior: { name: 'Warrior', anime: 'Naruto', desc: 'Intense, direct, competition-fuelled. You rise through challenges.' },
  sage: { name: 'Sage', anime: 'One Piece', desc: 'Collaborative, wise, story-driven. You grow through connection.' },
  phantom: { name: 'Phantom', anime: 'Demon Slayer', desc: 'Precise, introspective, mastery-seeking. You work in depth, not speed.' },
};

function HexagonRadar({ eq, iq }) {
  const canvasRef = useRef(null);
  const [isAnimating, setIsAnimating] = useState(true);
  const animationProgress = useRef(0);

  const eqNorm = eq?.score ? Math.min(100, Math.max(0, eq.score)) : 0;
  const iqNorm = iq?.ss ? Math.min(100, Math.max(0, (iq.ss - 70) / 60 * 100)) : 0;

  const findDomain = (arr, name) => (arr || []).find(d => d.domain?.toLowerCase() === name.toLowerCase())?.score || 0;
  const selfAwareness = findDomain(eq?.domains, 'Self-Awareness');
  const empathy = findDomain(eq?.domains, 'Empathy');
  const selfReg = findDomain(eq?.domains, 'Self-Regulation');
  const patternRecognition = findDomain(iq?.domains, 'Pattern');
  const logic = findDomain(iq?.domains, 'Logic');
  const reasoning = findDomain(iq?.domains, 'Memory');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const maxRadius = Math.min(w, h) / 2 - 30;

    const angles = [0, 1, 2, 3, 4, 5].map(i => (i * Math.PI * 2) / 6 - Math.PI / 2);
    const labels = ['EQ', 'IQ', 'Self-Awareness', 'Pattern', 'Empathy', 'Logic'];
    const values = [eqNorm, iqNorm, selfAwareness, patternRecognition, empathy, logic];

    let frameId;
    const animate = () => {
      if (animationProgress.current < 1) {
        animationProgress.current += 0.008;
      }
      const prog = Math.min(animationProgress.current, 1);

      ctx.fillStyle = D.bg;
      ctx.fillRect(0, 0, w, h);

      // Draw hexagon grid
      ctx.strokeStyle = D.border;
      ctx.lineWidth = 1;
      for (let ring = 1; ring <= 3; ring++) {
        const r = (maxRadius * ring) / 3;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const x = cx + r * Math.cos(angles[i]);
          const y = cy + r * Math.sin(angles[i]);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }

      // Draw axis lines
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        const x = cx + maxRadius * Math.cos(angles[i]);
        const y = cy + maxRadius * Math.sin(angles[i]);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(x, y);
        ctx.stroke();
      }

      // Draw user data polygon
      ctx.fillStyle = 'rgba(34,197,94,0.2)';
      ctx.strokeStyle = D.green;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const normalized = values[i] / 100;
        const r = maxRadius * normalized * prog;
        const x = cx + r * Math.cos(angles[i]);
        const y = cy + r * Math.sin(angles[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Draw axis labels
      ctx.fillStyle = D.textMuted;
      ctx.font = `12px ${D.font}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < 6; i++) {
        const x = cx + (maxRadius + 25) * Math.cos(angles[i]);
        const y = cy + (maxRadius + 25) * Math.sin(angles[i]);
        ctx.fillText(labels[i], x, y);
      }

      frameId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(frameId);
  }, [eqNorm, iqNorm, selfAwareness, patternRecognition, empathy, logic]);

  return <canvas ref={canvasRef} width={300} height={300} style={{ display: 'block', margin: '0 auto' }} />;
}

function GuardianSection({ onGoToAssess, onGoToFlow }) {
  const [eq, setEq] = useState(null);
  const [iq, setIq] = useState(null);
  const [archetype, setArchetype] = useState(null);

  useEffect(() => {
    const eqData = JSON.parse(localStorage.getItem('healai_eq') || 'null');
    const iqData = JSON.parse(localStorage.getItem('healai_iq') || 'null');
    const archetypeData = localStorage.getItem('healai_archetype') || null;

    setEq(eqData);
    setIq(iqData);
    setArchetype(archetypeData);
  }, []);

  const getRank = () => {
    if (!eq || !iq) return null;
    const avg = (eq.score + ((iq.ss - 70) / 60 * 100)) / 2;
    if (avg < 80) return 'SCOUT';
    if (avg < 90) return 'SENTINEL';
    if (avg < 100) return 'GUARDIAN';
    return 'VANGUARD';
  };

  const getLowestDomain = () => {
    const domains = [];
    if (eq?.domains) {
      Object.entries(eq.domains).forEach(([name, data]) => {
        domains.push({ name, score: data.score || 0, type: 'eq' });
      });
    }
    if (iq?.domains) {
      Object.entries(iq.domains).forEach(([name, data]) => {
        domains.push({ name, score: data.score || 0, type: 'iq' });
      });
    }
    return domains.sort((a, b) => a.score - b.score)[0] || null;
  };

  const getRecommendation = () => {
    const lowest = getLowestDomain();
    if (!lowest) return null;

    const recommendations = {
      'self-awareness': 'Your guardian recommends: Pause daily to reflect on your emotional patterns. Self-awareness is the root of resilience.',
      'self-regulation': 'Your guardian recommends: Practice the FLOW protocol before high-stakes sessions. Regulate before you engage.',
      'motivation': 'Your guardian recommends: Connect your tasks to deeper purpose. Sustainable drive comes from meaning.',
      'empathy': 'Your guardian recommends: Schedule active listening sessions. Empathy strengthens your relational intelligence.',
      'social-skill': 'Your guardian recommends: Engage in collaborative problem-solving. Social skill compounds through practice.',
      'verbal-reasoning': 'Your guardian recommends: Spend 10 minutes daily on verbal challenges. Language fluency improves with consistency.',
      'pattern-recognition': 'Your guardian recommends: Spend 10 minutes daily on the Vijnana pattern challenges. Small gains compound.',
      'logic': 'Your guardian recommends: Tackle one logic puzzle daily. Sequential thinking strengthens through focused repetition.',
      'reasoning': 'Your guardian recommends: Study complex systems in your domain. Pattern reasoning accelerates with depth.',
    };

    return recommendations[lowest.name] || 'Your guardian recommends: Focus on your weakest domain. Consistency builds mastery.';
  };

  const hasNoData = !eq && !iq;
  const hasPartialData = (eq && !iq) || (!eq && iq);
  const hasFullData = eq && iq;

  if (hasNoData) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', justifyContent: 'center' }}>
          <span style={{ width: '11px', height: '11px', borderRadius: '50%', backgroundColor: D.green }} />
          <span style={{ fontSize: '11px', color: D.textSecondary, fontFamily: D.font, letterSpacing: '0.08em', textTransform: 'uppercase' }}>GUARDIAN</span>
        </div>

        <svg width="48" height="48" viewBox="0 0 48 48" style={{ margin: '32px auto', opacity: 0.3 }}>
          <g stroke={D.textMuted} strokeWidth="2" fill="none">
            <path d="M24 4L8 16v12c0 10 16 12 16 12s16-2 16-12V16L24 4Z" />
          </g>
        </svg>

        <h2 style={{ fontSize: '24px', color: D.textPrimary, fontFamily: D.font, fontWeight: 600, marginBottom: '16px' }}>Your Guardian is dormant.</h2>
        <p style={{ fontSize: '14px', color: D.textMuted, fontFamily: D.font, marginBottom: '32px' }}>
          Complete the EQ and IQ assessments to activate your intelligence profile.
        </p>

        <button
          onClick={onGoToAssess}
          style={{
            padding: '12px 24px',
            border: `1px solid ${D.green}`,
            background: 'transparent',
            color: D.green,
            fontFamily: D.font,
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            letterSpacing: '0.05em',
            transition: 'all 200ms',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = 'rgba(34,197,94,0.1)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          GO TO ASSESS →
        </button>
      </div>
    );
  }

  if (hasPartialData) {
    return (
      <div style={{ padding: '40px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px' }}>
          <span style={{ width: '11px', height: '11px', borderRadius: '50%', backgroundColor: D.green }} />
          <span style={{ fontSize: '11px', color: D.textSecondary, fontFamily: D.font, letterSpacing: '0.08em', textTransform: 'uppercase' }}>GUARDIAN · PARTIAL</span>
          <span style={{ width: '11px', height: '11px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
        </div>

        <h2 style={{ fontSize: '28px', color: D.textPrimary, fontFamily: D.font, fontWeight: 600, letterSpacing: '0.05em', marginBottom: '32px', textAlign: 'center' }}>Guardian Activating...</h2>

        <p style={{ fontSize: '14px', color: D.textSecondary, fontFamily: D.font, textAlign: 'center', marginBottom: '24px' }}>
          {eq ? 'Emotional Intelligence captured. Complete your IQ assessment to fully activate.' : 'Cognitive Ability captured. Complete your EQ assessment to fully activate.'}
        </p>

        <button
          onClick={onGoToAssess}
          style={{
            display: 'block',
            margin: '0 auto',
            padding: '12px 24px',
            border: `1px solid ${D.green}`,
            background: 'transparent',
            color: D.green,
            fontFamily: D.font,
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            letterSpacing: '0.05em',
            transition: 'all 200ms',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = 'rgba(34,197,94,0.1)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          COMPLETE ASSESSMENT →
        </button>
      </div>
    );
  }

  const rank = getRank();
  const archetypeData = archetype ? ARCHETYPES[archetype] : null;

  return (
    <div style={{ padding: '40px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{ width: '11px', height: '11px', borderRadius: '50%', backgroundColor: D.green }} />
          <span style={{ fontSize: '11px', color: D.textSecondary, fontFamily: D.font, letterSpacing: '0.08em', textTransform: 'uppercase' }}>GUARDIAN · ACTIVE</span>
        </div>

        <h1 style={{ fontSize: '56px', color: D.textPrimary, fontFamily: D.font, fontWeight: 700, letterSpacing: '0.1em', margin: '16px 0', lineHeight: 1 }}>
          {rank}
        </h1>
        <p style={{ fontSize: '13px', color: D.green, fontFamily: D.font, letterSpacing: '0.05em' }}>Intelligence Profile Active</p>
      </div>

      {/* Radar Canvas */}
      <div style={{ marginBottom: '40px' }}>
        <HexagonRadar eq={eq} iq={iq} />
      </div>

      {/* Intelligence Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '40px' }}>
        {/* EQ Card */}
        <div style={{ padding: '20px', background: D.surface, border: `1px solid ${D.border}`, borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <span style={{ fontSize: '20px' }}>💫</span>
            <div>
              <div style={{ fontSize: '11px', color: D.textMuted, fontFamily: D.font, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Emotional Intelligence</div>
              <div style={{ fontSize: '20px', color: D.textPrimary, fontFamily: D.font, fontWeight: 600 }}>{eq?.score || 0}</div>
              <div style={{ fontSize: '12px', color: D.textSecondary, fontFamily: D.font }}>Band: {eq?.band || 'N/A'}</div>
            </div>
          </div>

          <div style={{ fontSize: '12px', color: D.textMuted, fontFamily: D.font, marginBottom: '12px' }}>
            Top domain: {eq?.domains ? [...eq.domains].sort((a, b) => (b.score || 0) - (a.score || 0))[0]?.domain || 'N/A' : 'N/A'}
          </div>

          <div style={{ height: '4px', background: D.border, borderRadius: '2px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                background: D.green,
                width: `${Math.min((eq?.score || 0) / 100 * 100, 100)}%`,
                transition: 'width 800ms ease-out',
              }}
            />
          </div>
        </div>

        {/* IQ Card */}
        <div style={{ padding: '20px', background: D.surface, border: `1px solid ${D.border}`, borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <span style={{ fontSize: '20px' }}>🧠</span>
            <div>
              <div style={{ fontSize: '11px', color: D.textMuted, fontFamily: D.font, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cognitive Ability</div>
              <div style={{ fontSize: '20px', color: D.textPrimary, fontFamily: D.font, fontWeight: 600 }}>{iq?.ss || 0}</div>
              <div style={{ fontSize: '12px', color: D.textSecondary, fontFamily: D.font }}>{iq?.percentile || 0}th percentile</div>
            </div>
          </div>

          <div style={{ fontSize: '12px', color: D.textMuted, fontFamily: D.font, marginBottom: '12px' }}>
            Top domain: {iq?.domains ? [...iq.domains].sort((a, b) => (b.score || 0) - (a.score || 0))[0]?.domain || 'N/A' : 'N/A'}
          </div>

          <div style={{ height: '4px', background: D.border, borderRadius: '2px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                background: D.green,
                width: `${Math.min(((iq?.ss || 70) - 70) / 60 * 100, 100)}%`,
                transition: 'width 800ms ease-out',
              }}
            />
          </div>
        </div>
      </div>

      {/* Guardian Directive */}
      <div style={{ padding: '20px', background: D.surface, border: `1px solid ${D.border}`, borderRadius: '8px', marginBottom: '40px' }}>
        <p style={{ fontSize: '13px', color: D.textMuted, fontFamily: D.font, marginBottom: '12px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Guardian Directive</p>
        <p style={{ fontSize: '14px', color: D.textSecondary, fontFamily: D.font, marginBottom: '16px', lineHeight: 1.6 }}>
          {getRecommendation()}
        </p>
        <button
          onClick={onGoToFlow}
          style={{
            padding: '10px 16px',
            background: D.green,
            color: '#000',
            fontFamily: D.font,
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            borderRadius: '4px',
            letterSpacing: '0.05em',
            transition: 'all 200ms',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.opacity = '0.9';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          ACTIVATE FLOW PROTOCOL →
        </button>
      </div>

      {/* Archetype Shield */}
      {archetypeData && (
        <div style={{ padding: '20px', background: D.surface, border: `1px solid ${D.border}`, borderRadius: '8px', marginBottom: '40px' }}>
          <p style={{ fontSize: '11px', color: D.textMuted, fontFamily: D.font, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>Your Archetype</p>
          <h3 style={{ fontSize: '24px', color: D.textPrimary, fontFamily: D.font, fontWeight: 600, marginBottom: '8px' }}>{archetypeData.name}</h3>
          <p style={{ fontSize: '14px', color: D.textSecondary, fontFamily: D.font, marginBottom: '12px', lineHeight: 1.5 }}>{archetypeData.desc}</p>
          <span style={{ display: 'inline-block', padding: '4px 12px', background: D.greenDim, color: D.green, fontSize: '11px', fontFamily: D.font, borderRadius: '4px', fontWeight: 500 }}>
            Anime: {archetypeData.anime}
          </span>
        </div>
      )}

      {/* ── Session Intelligence (Category B) ──────────────────────────── */}
      {(() => {
        const sessions = JSON.parse(localStorage.getItem('healai_sessions') || '[]');
        const today = new Date().toDateString();
        const todaySessions = sessions.filter(s => s.date === today);
        const flowLog = JSON.parse(localStorage.getItem('healai_flow_log') || '[]');
        const todayFlow = flowLog.filter(f => new Date(f.timestamp).toDateString() === today);
        const moodLog = JSON.parse(localStorage.getItem('healai_mood_log') || '[]');
        const latestMood = moodLog[moodLog.length - 1];
        const totalDuration = todaySessions.reduce((sum, s) => sum + (s.duration || 0), 0);
        const totalMinutes = Math.floor(totalDuration / 60000);
        const flowAchieved = todayFlow.length > 0;
        const streakKey = 'healai_streak';
        const streak = parseInt(localStorage.getItem(streakKey) || '0');

        // Build alerts
        const alerts = [];
        if (flowAchieved) alerts.push({ type: 'flow', icon: '🟢', msg: `Flow state achieved · ${todayFlow[0]?.duration ? Math.round(todayFlow[0].duration / 60000) + ' min' : 'today'}` });
        if (streak >= 3) alerts.push({ type: 'streak', icon: '🔵', msg: `${streak}-day study streak — keep going` });
        if (latestMood && latestMood.mood <= 2) alerts.push({ type: 'mood', icon: '🟡', msg: `Low energy detected — short session recommended` });
        if (totalMinutes > 45) alerts.push({ type: 'fatigue', icon: '🟡', msg: `${totalMinutes} min studied — consider a 10-min break` });

        return (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ fontSize: '11px', color: D.textSecondary, fontFamily: D.font, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '16px' }}>
              Today's Session
            </div>

            {/* Metric tiles */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
              {[
                { label: 'Study Time', value: totalMinutes > 0 ? `${totalMinutes}m` : '—' },
                { label: 'Flow State', value: flowAchieved ? 'YES ✓' : '—' },
                { label: 'Mood', value: latestMood ? ['','😴','😐','🙂','😄','🔥'][latestMood.mood] : '—' },
              ].map((tile, i) => (
                <div key={i} style={{
                  padding: '14px 12px',
                  background: D.surface,
                  border: `1px solid ${D.border}`,
                  borderRadius: '8px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '18px', color: D.textPrimary, fontFamily: D.font, fontWeight: 600, marginBottom: '4px' }}>
                    {tile.value}
                  </div>
                  <div style={{ fontSize: '10px', color: D.textMuted, fontFamily: D.font, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    {tile.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Alert cards */}
            {alerts.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {alerts.map((alert, i) => (
                  <div key={i} style={{
                    padding: '12px 14px',
                    background: D.surface,
                    border: `1px solid ${D.border}`,
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}>
                    <span style={{ fontSize: '14px' }}>{alert.icon}</span>
                    <span style={{ fontSize: '12px', color: D.textSecondary, fontFamily: D.font }}>{alert.msg}</span>
                  </div>
                ))}
              </div>
            )}

            {alerts.length === 0 && todaySessions.length === 0 && (
              <div style={{ padding: '16px', background: D.surface, border: `1px solid ${D.border}`, borderRadius: '8px' }}>
                <span style={{ fontSize: '12px', color: D.textMuted, fontFamily: D.font }}>
                  No session data yet today. Start studying to activate Guardian intelligence.
                </span>
              </div>
            )}
          </div>
        );
      })()}

      {/* External Inputs Placeholder */}
      <div style={{ padding: '20px', background: 'transparent', border: `1px dashed ${D.border}`, borderRadius: '8px', opacity: 0.5 }}>
        <p style={{ fontSize: '16px', color: D.textPrimary, fontFamily: D.font, fontWeight: 500, marginBottom: '8px' }}>⚡ External Inputs</p>
        <p style={{ fontSize: '13px', color: D.textMuted, fontFamily: D.font, marginBottom: '8px' }}>Wearables · HRV · Sleep · Nutrition</p>
        <p style={{ fontSize: '13px', color: D.textMuted, fontFamily: D.font }}>Coming soon — connect your biometrics for real-time guardian activation.</p>
      </div>
    </div>
  );
}

export default GuardianSection;
