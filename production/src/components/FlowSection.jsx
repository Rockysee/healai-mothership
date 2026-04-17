"use client";
import React, { useEffect, useRef, useState } from 'react';
import { addBreatheRound, addPomodoro, logFlowAchieved, markFlowInSession } from './healai_session_store.js';

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
  commander: 'BETA',
  explorer: 'THETA',
  warrior: 'BETA',
  sage: 'ALPHA',
  phantom: 'THETA',
};

function BrainBreathingCanvas({ phase, breathProgress }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = D.bg;
    ctx.fillRect(0, 0, w, h);

    // Draw brain outline
    const brainScale = 80;
    ctx.strokeStyle = phase === 'inhale' ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Left hemisphere
    ctx.beginPath();
    ctx.moveTo(cx - 30, cy - brainScale);
    ctx.quadraticCurveTo(cx - brainScale * 0.6, cy - brainScale * 0.5, cx - brainScale * 0.7, cy);
    ctx.quadraticCurveTo(cx - brainScale * 0.5, cy + brainScale * 0.6, cx - 20, cy + brainScale * 0.8);
    ctx.stroke();

    // Right hemisphere
    ctx.beginPath();
    ctx.moveTo(cx + 30, cy - brainScale);
    ctx.quadraticCurveTo(cx + brainScale * 0.6, cy - brainScale * 0.5, cx + brainScale * 0.7, cy);
    ctx.quadraticCurveTo(cx + brainScale * 0.5, cy + brainScale * 0.6, cx + 20, cy + brainScale * 0.8);
    ctx.stroke();

    // Center line
    ctx.beginPath();
    ctx.moveTo(cx, cy - brainScale);
    ctx.lineTo(cx, cy + brainScale * 0.8);
    ctx.stroke();

    // Draw animated pulses or shimmer based on phase
    if (phase === 'inhale') {
      const numPulses = 4;
      for (let i = 0; i < numPulses; i++) {
        const pulsProgress = (breathProgress + i * 0.25) % 1;
        const radius = pulsProgress * 120;
        const opacity = Math.max(0, 1 - pulsProgress);
        ctx.strokeStyle = `rgba(34,197,94,${opacity * 0.6})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (phase === 'exhale') {
      const numPulses = 3;
      for (let i = 0; i < numPulses; i++) {
        const pulsProgress = (1 - breathProgress + i * 0.33) % 1;
        const radius = pulsProgress * 100;
        const opacity = Math.max(0, 1 - pulsProgress);
        ctx.strokeStyle = `rgba(255,255,255,${opacity * 0.2})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (phase === 'hold') {
      for (let i = 0; i < 8; i++) {
        const angle = (Math.random() * Math.PI * 2) + breathProgress * Math.PI;
        const radius = Math.random() * 60 + 20;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.3})`;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [phase, breathProgress]);

  return <canvas ref={canvasRef} width={320} height={320} style={{ display: 'block', margin: '0 auto' }} />;
}

function BreathingGuide({ phase, timeLeft, isRunning }) {
  const circumference = 2 * Math.PI * 50;
  const offset = circumference * (1 - timeLeft / 100);

  const phaseColor = phase === 'inhale' ? D.green : phase === 'hold' ? 'rgba(255,255,255,0.3)' : 'transparent';

  return (
    <div style={{ textAlign: 'center', marginTop: '32px' }}>
      <svg width="120" height="120" style={{ margin: '0 auto', display: 'block' }}>
        <circle cx="60" cy="60" r="50" fill="none" stroke={D.border} strokeWidth="2" />
        <circle
          cx="60"
          cy="60"
          r="50"
          fill="none"
          stroke={phaseColor}
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 100ms linear' }}
        />
        <text x="60" y="55" textAnchor="middle" style={{ fontSize: '13px', fontWeight: 600, fill: D.textPrimary, fontFamily: D.font }}>
          {phase.toUpperCase()}
        </text>
        <text x="60" y="70" textAnchor="middle" style={{ fontSize: '28px', fontWeight: 700, fill: D.green, fontFamily: D.font }}>
          {Math.ceil(timeLeft)}
        </text>
      </svg>

      <p style={{ fontSize: '12px', color: D.textMuted, fontFamily: D.font, marginTop: '16px', letterSpacing: '0.05em' }}>
        ROUND 1 OF 5 · TOTAL: 0:00
      </p>
    </div>
  );
}

function Breathe() {
  const [phase, setPhase] = useState('inhale');
  const [timeLeft, setTimeLeft] = useState(4);
  const [isRunning, setIsRunning] = useState(true);
  const [breathProgress, setBreathProgress] = useState(0);
  const phaseTimings = { inhale: 4, hold: 4, exhale: 6, hold2: 2 };
  const phaseOrder = ['inhale', 'hold', 'exhale', 'hold2'];
  const phaseIndex = useRef(0);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setBreathProgress(prev => (prev + 0.02) % 1);
      setTimeLeft(prev => {
        if (prev <= 0.1) {
          phaseIndex.current = (phaseIndex.current + 1) % 4;
          if (phaseIndex.current === 0) {
            addBreatheRound();
          }
          const nextPhase = phaseOrder[phaseIndex.current];
          const nextPhaseKey = nextPhase === 'hold2' ? 'hold' : nextPhase;
          setPhase(nextPhaseKey);
          return phaseTimings[nextPhase];
        }
        return prev - 0.1;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isRunning]);

  return (
    <div>
      <BrainBreathingCanvas phase={phase} breathProgress={breathProgress} />
      <BreathingGuide phase={phase} timeLeft={timeLeft} isRunning={isRunning} />

      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '24px' }}>
        <button
          onClick={() => setIsRunning(!isRunning)}
          style={{
            padding: '10px 20px',
            background: D.surface,
            border: `1px solid ${D.border}`,
            color: D.textPrimary,
            fontFamily: D.font,
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            borderRadius: '4px',
            transition: 'all 200ms',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = D.surfaceHover;
            e.currentTarget.style.borderColor = D.borderHover;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = D.surface;
            e.currentTarget.style.borderColor = D.border;
          }}
        >
          {isRunning ? '⏸ PAUSE' : '▶ RESUME'}
        </button>
      </div>
    </div>
  );
}

function Focus() {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(25);
  const [enhancers, setEnhancers] = useState({ binauralBeats: false, whiteNoise: false, deepWork: false });
  const [eq, setEq] = useState(null);

  useEffect(() => {
    const eqData = JSON.parse(localStorage.getItem('healai_eq') || 'null');
    setEq(eqData);
  }, []);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) {
          setIsRunning(false);
          addPomodoro();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  const handleStart = () => {
    if (timeLeft === 0) {
      setTimeLeft(selectedDuration * 60);
    }
    setIsRunning(!isRunning);
  };

  const handlePreset = duration => {
    setSelectedDuration(duration);
    setTimeLeft(duration * 60);
    setIsRunning(false);
  };

  const toggleEnhancer = key => {
    setEnhancers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getCogState = () => {
    if (!eq) return null;
    const score = eq.score;
    if (score < 40) return { icon: '🔴', label: 'CRITICAL STATE — breathing recommended before focus', color: '#ef4444' };
    if (score < 60) return { icon: '🟡', label: 'LOW ENERGY — short session recommended', color: '#f59e0b' };
    if (score < 80) return { icon: '🟢', label: 'READY — begin your session', color: D.green };
    return { icon: '⚡', label: 'PEAK STATE — optimal for deep work', color: D.green };
  };

  const cogState = getCogState();

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const totalSeconds = selectedDuration * 60;
  const progress = Math.max(0, 1 - timeLeft / totalSeconds);
  const numDots = 20;

  return (
    <div>
      <h3 style={{ fontSize: '18px', color: D.textSecondary, fontFamily: D.font, letterSpacing: '0.05em', marginBottom: '24px', textTransform: 'uppercase' }}>
        Deep Focus Timer
      </h3>

      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '48px', fontWeight: 700, fontFamily: "'Courier New', monospace", color: D.textPrimary, marginBottom: '16px', letterSpacing: '0.1em' }}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
        {(() => {
          try {
            const sessions = JSON.parse(localStorage.getItem('healai_sessions') || '[]');
            const today = new Date().toDateString();
            const todayMins = Math.floor(sessions.filter(s => s.date === today).reduce((sum, s) => sum + (s.duration || 0), 0) / 60000);
            return todayMins > 0 ? (
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '8px', textAlign: 'center', letterSpacing: '0.05em' }}>
                {todayMins} min studied today
              </div>
            ) : null;
          } catch { return null; }
        })()}

        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginBottom: '24px', flexWrap: 'wrap' }}>
          {Array.from({ length: numDots }).map((_, i) => (
            <div
              key={i}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: i < Math.floor(progress * numDots) ? D.green : D.border,
                transition: 'background-color 100ms',
              }}
            />
          ))}
        </div>

        <button
          onClick={handleStart}
          style={{
            width: '100%',
            padding: '12px 24px',
            background: isRunning ? D.surface : D.green,
            color: isRunning ? D.textPrimary : '#000',
            fontFamily: D.font,
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            borderRadius: '4px',
            letterSpacing: '0.05em',
            transition: 'all 200ms',
          }}
          onMouseEnter={e => {
            if (!isRunning) e.currentTarget.style.opacity = '0.9';
          }}
          onMouseLeave={e => {
            if (!isRunning) e.currentTarget.style.opacity = '1';
          }}
        >
          {isRunning ? 'PAUSE SESSION' : 'START SESSION'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '32px' }}>
        {[
          { label: '25 MIN', duration: 25 },
          { label: '45 MIN', duration: 45 },
          { label: '90 MIN', duration: 90 },
        ].map(preset => (
          <button
            key={preset.duration}
            onClick={() => handlePreset(preset.duration)}
            style={{
              padding: '12px',
              background: selectedDuration === preset.duration ? D.surface : 'transparent',
              border: `1px solid ${selectedDuration === preset.duration ? D.green : D.border}`,
              color: selectedDuration === preset.duration ? D.green : D.textSecondary,
              fontFamily: D.font,
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              borderRadius: '4px',
              transition: 'all 200ms',
              letterSpacing: '0.05em',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = D.borderHover;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = selectedDuration === preset.duration ? D.green : D.border;
            }}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h4 style={{ fontSize: '12px', color: D.textMuted, fontFamily: D.font, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '12px' }}>
          Focus Enhancers
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          {[
            { key: 'binauralBeats', label: '🎵 BINAURAL BEATS', indicator: 'on: 40Hz gamma active' },
            { key: 'whiteNoise', label: '🔇 WHITE NOISE', indicator: 'on: ambient noise active' },
            { key: 'deepWork', label: '📵 DEEP WORK MODE', indicator: 'on: distractions locked' },
          ].map(enhancer => (
            <button
              key={enhancer.key}
              onClick={() => toggleEnhancer(enhancer.key)}
              style={{
                padding: '12px',
                background: enhancers[enhancer.key] ? D.green : D.surface,
                border: `1px solid ${enhancers[enhancer.key] ? D.green : D.border}`,
                color: enhancers[enhancer.key] ? '#000' : D.textSecondary,
                fontFamily: D.font,
                fontSize: '11px',
                fontWeight: 500,
                cursor: 'pointer',
                borderRadius: '4px',
                transition: 'all 200ms',
                letterSpacing: '0.05em',
              }}
              onMouseEnter={e => {
                if (!enhancers[enhancer.key]) {
                  e.currentTarget.style.borderColor = D.borderHover;
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = enhancers[enhancer.key] ? D.green : D.border;
              }}
            >
              {enhancer.label}
            </button>
          ))}
        </div>
      </div>

      {cogState && (
        <div style={{ padding: '16px', background: D.surface, border: `1px solid ${D.border}`, borderRadius: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>{cogState.icon}</span>
            <div>
              <p style={{ fontSize: '11px', color: D.textMuted, fontFamily: D.font, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                Cognitive State
              </p>
              <p style={{ fontSize: '13px', color: D.textSecondary, fontFamily: D.font }}>{cogState.label}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Sync() {
  const [selectedFreq, setSelectedFreq] = useState('THETA');
  const [timeInSync, setTimeInSync] = useState(0);
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

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeInSync(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const frequencies = [
    { name: 'DELTA', range: '0.5–4 Hz', desc: 'Deep sleep / healing' },
    { name: 'THETA', range: '4–8 Hz', desc: 'Creativity / flow / meditation' },
    { name: 'ALPHA', range: '8–12 Hz', desc: 'Relaxed focus / learning' },
    { name: 'BETA', range: '12–30 Hz', desc: 'Active thinking / problem-solving' },
    { name: 'GAMMA', range: '30–100 Hz', desc: 'Peak concentration / insight' },
  ];

  const getRecommendedFreq = () => {
    if (archetype && ARCHETYPES[archetype]) {
      return ARCHETYPES[archetype];
    }
    return 'ALPHA';
  };

  const getRecommendation = () => {
    let base = '';
    if (archetype === 'commander') base = 'BETA waves. Strategic thinking mode.';
    else if (archetype === 'explorer') base = 'THETA waves. Discovery and insight mode.';
    else if (archetype === 'warrior') base = 'BETA waves. High performance mode.';
    else if (archetype === 'sage') base = 'ALPHA waves. Collaborative reflection mode.';
    else if (archetype === 'phantom') base = 'THETA waves. Deep mastery mode.';
    else base = 'ALPHA waves. Balanced learning mode.';

    let extra = '';
    if (iq && iq.ss > 115) {
      extra = 'Your above-average pattern recognition works best in THETA.';
    } else if (iq && iq.ss >= 85 && iq.ss <= 115) {
      extra = 'Consistent ALPHA sessions build long-term cognitive reserve.';
    }

    return base + (extra ? ' ' + extra : '');
  };

  const recommendedFreq = getRecommendedFreq();

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '18px', color: D.textSecondary, fontFamily: D.font, letterSpacing: '0.05em', marginBottom: '8px', textTransform: 'uppercase' }}>
          Brainwave Sync
        </h3>
        <p style={{ fontSize: '14px', color: D.textMuted, fontFamily: D.font, marginBottom: '24px' }}>Tune your brain to the optimal frequency for your task.</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '24px' }}>
          {frequencies.map(freq => (
            <button
              key={freq.name}
              onClick={() => setSelectedFreq(freq.name)}
              style={{
                padding: '12px',
                background: selectedFreq === freq.name ? D.green : 'transparent',
                border: `1px solid ${selectedFreq === freq.name ? D.green : D.border}`,
                color: selectedFreq === freq.name ? '#000' : D.textSecondary,
                fontFamily: D.font,
                fontSize: '11px',
                fontWeight: 500,
                cursor: 'pointer',
                borderRadius: '4px',
                transition: 'all 200ms',
                letterSpacing: '0.05em',
              }}
              onMouseEnter={e => {
                if (selectedFreq !== freq.name) {
                  e.currentTarget.style.borderColor = D.borderHover;
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = selectedFreq === freq.name ? D.green : D.border;
              }}
            >
              {freq.name}
            </button>
          ))}
        </div>

        <div style={{ padding: '16px', background: D.surface, border: `1px solid ${D.border}`, borderRadius: '4px', marginBottom: '24px' }}>
          {frequencies.find(f => f.name === selectedFreq) && (
            <>
              <p style={{ fontSize: '12px', color: D.textMuted, fontFamily: D.font, marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {frequencies.find(f => f.name === selectedFreq).range}
              </p>
              <p style={{ fontSize: '14px', color: D.textSecondary, fontFamily: D.font }}>
                {frequencies.find(f => f.name === selectedFreq).desc}
              </p>
            </>
          )}
        </div>
      </div>

      <WaveCanvas selectedFreq={selectedFreq} />

      <div style={{ padding: '16px', background: D.surface, border: `1px solid ${D.border}`, borderRadius: '4px', marginTop: '24px', marginBottom: '24px' }}>
        <p style={{ fontSize: '11px', color: D.textMuted, fontFamily: D.font, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>
          AI Recommendation
        </p>
        <p style={{ fontSize: '13px', color: D.textSecondary, fontFamily: D.font }}>{getRecommendation()}</p>
      </div>

      {timeInSync > 60 && (
        <div
          style={{
            padding: '12px 16px',
            background: D.greenDim,
            border: `1px solid ${D.green}`,
            borderRadius: '4px',
            textAlign: 'center',
            animation: 'pulse 2s infinite',
          }}
          ref={(el) => {
            if (el && !el.dataset.flowLogged) {
              el.dataset.flowLogged = 'true';
              logFlowAchieved(60000);
              markFlowInSession(60000);
            }
          }}
        >
          <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }`}</style>
          <p style={{ fontSize: '12px', color: D.green, fontFamily: D.font, fontWeight: 500, letterSpacing: '0.05em' }}>⚡ FLOW STATE DETECTED</p>
        </div>
      )}
    </div>
  );
}

function WaveCanvas({ selectedFreq }) {
  const canvasRef = useRef(null);
  const frameRef = useRef(0);
  const phaseRef = useRef(0);

  const freqMap = {
    DELTA: 2,
    THETA: 6,
    ALPHA: 10,
    BETA: 20,
    GAMMA: 60,
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    let frameId;
    const animate = () => {
      frameRef.current += 1;
      phaseRef.current += 0.01;

      ctx.fillStyle = D.bg;
      ctx.fillRect(0, 0, w, h);

      const baseFreq = freqMap[selectedFreq] / 10;
      const centerY = h / 2;

      // Draw 3 harmonic waves
      const harmonics = [1, 0.6, 0.3];
      const opacities = [1, 0.6, 0.3];

      harmonics.forEach((harmonic, idx) => {
        ctx.strokeStyle = `rgba(34,197,94,${opacities[idx]})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();

        const amplitude = 40 * (0.9 + Math.sin(phaseRef.current) * 0.1);

        for (let x = 0; x < w; x += 2) {
          const waveValue = Math.sin((x / w) * Math.PI * 2 * baseFreq * harmonic + phaseRef.current) * amplitude * harmonic;
          const y = centerY + waveValue;

          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        ctx.stroke();
      });

      frameId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(frameId);
  }, [selectedFreq]);

  return <canvas ref={canvasRef} width={320} height={200} style={{ display: 'block', width: '100%', height: '200px' }} />;
}

function FlowSection() {
  const [flowTab, setFlowTab] = useState('breathe');

  return (
    <div style={{ padding: '40px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{ width: '11px', height: '11px', borderRadius: '50%', backgroundColor: D.green }} />
          <span style={{ fontSize: '11px', color: D.textSecondary, fontFamily: D.font, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            FLOW · TUNED-IN BRAIN PROTOCOL
          </span>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '16px', color: D.textMuted, fontFamily: D.font, marginBottom: '8px' }}>Enter the</p>
          <h1 style={{ fontSize: '56px', color: D.textPrimary, fontFamily: D.font, fontWeight: 700, lineHeight: 1, marginBottom: '16px' }}>Flow State</h1>
          <p style={{ fontSize: '14px', color: D.textMuted, fontFamily: D.font }}>Synchronise your brain. Unlock peak performance.</p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: '24px', marginBottom: '32px', borderBottom: `1px solid ${D.border}`, paddingBottom: '16px' }}>
        {[
          { id: 'breathe', label: 'BREATHE' },
          { id: 'focus', label: 'FOCUS' },
          { id: 'sync', label: 'SYNC' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFlowTab(tab.id)}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '12px',
              fontFamily: D.font,
              fontWeight: 600,
              cursor: 'pointer',
              color: flowTab === tab.id ? D.textPrimary : D.textSecondary,
              paddingBottom: '12px',
              borderBottom: flowTab === tab.id ? `2px solid ${D.green}` : 'transparent',
              transition: 'all 200ms',
              letterSpacing: '0.05em',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ opacity: flowTab !== 'breathe' ? 0 : 1, transition: 'opacity 200ms', display: flowTab !== 'breathe' ? 'none' : 'block' }}>
        <Breathe />
      </div>

      <div style={{ opacity: flowTab !== 'focus' ? 0 : 1, transition: 'opacity 200ms', display: flowTab !== 'focus' ? 'none' : 'block' }}>
        <Focus />
      </div>

      <div style={{ opacity: flowTab !== 'sync' ? 0 : 1, transition: 'opacity 200ms', display: flowTab !== 'sync' ? 'none' : 'block' }}>
        <Sync />
      </div>
    </div>
  );
}

export default FlowSection;
