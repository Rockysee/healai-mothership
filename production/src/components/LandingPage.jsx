"use client";
import { useState } from 'react';

const FONT = "'Inter', system-ui, -apple-system, sans-serif";

// ── Role selector data ───────────────────────────────────────────────────────
const ROLES = [
  {
    id: 'student', emoji: '🎓', title: 'Student',
    sub: 'Grade 3 – College',
    desc: 'Map your EQ + IQ, unlock your AI Guru, play adaptive ICSE challenges.',
    gradient: 'linear-gradient(135deg, rgba(34,197,94,0.13) 0%, rgba(34,197,94,0.03) 100%)',
    border: 'rgba(34,197,94,0.35)', glow: 'rgba(34,197,94,0.2)', accent: '#22c55e', rgb: '34,197,94',
  },
  {
    id: 'parent', emoji: '👨‍👩‍👧', title: 'Parent',
    sub: 'Supporting my child',
    desc: "Monitor your child's wellbeing radar, get Guardian alerts before stress peaks.",
    gradient: 'linear-gradient(135deg, rgba(129,140,248,0.13) 0%, rgba(129,140,248,0.03) 100%)',
    border: 'rgba(129,140,248,0.35)', glow: 'rgba(129,140,248,0.2)', accent: '#818cf8', rgb: '129,140,248',
  },
  {
    id: 'teacher', emoji: '🧑‍🏫', title: 'Teacher / Counsellor',
    sub: 'Guiding students',
    desc: 'See intelligence patterns across your class. Personalise with data, not guesswork.',
    gradient: 'linear-gradient(135deg, rgba(245,158,11,0.13) 0%, rgba(245,158,11,0.03) 100%)',
    border: 'rgba(245,158,11,0.35)', glow: 'rgba(245,158,11,0.2)', accent: '#f59e0b', rgb: '245,158,11',
  },
];

// ── 6 Platform modules ────────────────────────────────────────────────────────
// url = standalone route — shareable direct link to just that silo
const MODULES = [
  {
    nav: 'assess', url: '/assess',
    icon: '🧬',
    label: 'Assessment Hub',
    tagline: 'Know yourself first',
    desc: '4 psychometric tests: EQ Radar (5 domains), IQ Matrix (4 domains), Personality Archetype, and AI Guru nomination. Age-adaptive questions from Grade 3 to College.',
    pills: ['EQ Radar', 'IQ Matrix', 'Personality', 'Self-Discovery'],
    color: '#22c55e',
    rgb: '34,197,94',
  },
  {
    nav: 'mentor', url: '/mentor',
    icon: '🦊',
    label: 'AI Guru',
    tagline: 'Your AI learning guide',
    desc: 'Three deep-persona AIs trained in distinct styles — Gen-AI Fox, Werner Chat, and AiRjun. Each knows your EQ, IQ, and personality profile before you say a word.',
    pills: ['Fox', 'Werner Chat', 'AiRjun'],
    color: '#f59e0b',
    rgb: '245,158,11',
  },
  {
    nav: 'vijnana', url: '/vijnana',
    icon: '⚔️',
    label: 'Vijnana Edugaming',
    tagline: 'Battle-rank ICSE challenges',
    desc: 'Adaptive ICSE game engine: D-Rank → B-Rank → S-Rank challenges across Physics, Chemistry, Maths, Biology. Anime-themed with XP streaks, mastery levels, and Socratic AI hints.',
    pills: ['D · B · S Rank', 'PCMB', 'XP + Streaks', 'AI Hints'],
    color: '#a78bfa',
    rgb: '167,139,250',
    badge: 'NEW',
  },
  {
    nav: 'guardian', url: '/guardian',
    icon: '🛡️',
    label: 'Guardian',
    tagline: 'Child-friendly cyber protector & edu-fun enabler',
    desc: 'Real-time emotional health monitoring. Guardian detects stress peaks from EQ trends and mood check-ins, then alerts parents or counsellors before burnout sets in. Share directly with a parent — no sign-up needed.',
    pills: ['Stress Alerts', 'Mood Trends', 'Parent View', 'Child Safe'],
    color: '#f87171',
    rgb: '248,113,113',
  },
  {
    nav: 'dashboard', url: '/dashboard',
    icon: '📈',
    label: 'Journey',
    tagline: 'Track your growth arc',
    desc: 'Resilience tracker plots your EQ, IQ, and mood scores over time. See your learning identity evolve, identify patterns, and celebrate genuine growth milestones.',
    pills: ['Resilience Chart', 'Score History', 'Archetypes'],
    color: '#06b6d4',
    rgb: '6,182,212',
  },
  {
    nav: 'longevity', url: '/flow',
    icon: '⚡',
    label: 'Flow',
    tagline: 'Peak performance science',
    desc: "Flow state identification and longevity protocols adapted to your cognitive profile. Know when you're at peak learning capacity and how to sustain it.",
    pills: ['Flow State', 'Energy Map', 'Protocols'],
    color: '#4ade80',
    rgb: '74,222,128',
  },
];

// ── Stats ─────────────────────────────────────────────────────────────────────
const STATS = [
  { value: '4',   label: 'Psych\nTests'     },
  { value: '39',  label: 'Questions'        },
  { value: '3',   label: 'AI\nGurus'        },
  { value: '9+',  label: 'Domains'          },
];

export default function LandingPage({ onBegin }) {
  const [role, setRole] = useState(null);

  const handleBegin = () => {
    if (role) localStorage.setItem('healai_role', role);
    onBegin();
  };

  return (
    <div style={{
      minHeight: '100dvh', backgroundColor: '#0a0a0b',
      fontFamily: FONT, color: '#ffffff',
      overflowX: 'hidden',
      /* safe-area bottom: keeps CTA above iPhone home indicator */
      paddingBottom: 'calc(120px + env(safe-area-inset-bottom, 0px))',
    }}>
      <style>{`
        @keyframes auroraA  { 0%,100% { transform: translate(0,0) scale(1); }          50% { transform: translate(24px,-32px) scale(1.12); } }
        @keyframes auroraB  { 0%,100% { transform: translate(0,0) scale(1); }          50% { transform: translate(-18px,28px) scale(1.1); } }
        @keyframes auroraC  { 0%,100% { transform: translate(0,0) scale(1); opacity:.5; } 50% { transform: translate(10px,-15px) scale(1.06); opacity:.8; } }
        @keyframes fadeUp   { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn   { from { opacity:0; }  to { opacity:1; } }
        @keyframes floatBadge { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-4px); } }
        @keyframes pulseGlow  { 0%,100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); } 50% { box-shadow: 0 0 0 6px rgba(34,197,94,0.15); } }
        .land-role-btn:active { transform:scale(0.98) !important; }
        .land-cta:active      { transform:scale(0.97) !important; }
        .module-card:active   { transform:scale(0.985) !important; }
      `}</style>

      {/* ── Aurora background ── */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, overflow:'hidden' }}>
        <div style={{ position:'absolute', top:'-15%', left:'-15%', width:'70vw', height:'70vw', maxWidth:'420px', maxHeight:'420px', borderRadius:'50%', background:'radial-gradient(circle, rgba(34,197,94,0.16) 0%, transparent 68%)', animation:'auroraA 9s ease-in-out infinite' }} />
        <div style={{ position:'absolute', top:'35%', right:'-20%', width:'55vw', height:'55vw', maxWidth:'360px', maxHeight:'360px', borderRadius:'50%', background:'radial-gradient(circle, rgba(129,140,248,0.14) 0%, transparent 68%)', animation:'auroraB 11s ease-in-out infinite' }} />
        <div style={{ position:'absolute', bottom:'-10%', left:'20%', width:'45vw', height:'45vw', maxWidth:'300px', maxHeight:'300px', borderRadius:'50%', background:'radial-gradient(circle, rgba(167,139,250,0.12) 0%, transparent 68%)', animation:'auroraC 13s ease-in-out infinite' }} />
      </div>

      {/* Content column — 480px phone, 680px tablet, 860px desktop */}
      <div style={{ position:'relative', zIndex:1, maxWidth:'clamp(320px, 92vw, 680px)', margin:'0 auto' }}>

        {/* ── Top bar ── */}
        <div style={{ padding:'18px 20px 0', display:'flex', alignItems:'center', justifyContent:'space-between', animation:'fadeIn 0.4s ease' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'11px' }}>
            <div style={{ width:'38px', height:'38px', borderRadius:'11px', background:'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'19px', fontWeight:800, color:'#fff', boxShadow:'0 4px 18px rgba(34,197,94,0.45)', animation:'floatBadge 4s ease-in-out infinite' }}>✦</div>
            <div>
              <div style={{ fontSize:'18px', fontWeight:900, letterSpacing:'-0.025em', lineHeight:1.05, color:'#fff' }}>AIrJun</div>
              <div style={{ fontSize:'9.5px', color:'rgba(255,255,255,0.38)', letterSpacing:'0.1em', fontWeight:600 }}>INTELLIGENCE PLATFORM</div>
            </div>
          </div>
          <div style={{ padding:'5px 11px', borderRadius:'20px', background:'rgba(34,197,94,0.12)', border:'1px solid rgba(34,197,94,0.28)', fontSize:'10px', fontWeight:700, color:'#22c55e', letterSpacing:'0.07em' }}>BETA</div>
        </div>

        {/* ── Hero ── */}
        <div style={{ padding:'40px 20px 24px', animation:'fadeUp 0.5s ease 0.05s both' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', marginBottom:'16px', padding:'5px 12px', borderRadius:'20px', background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.2)' }}>
            <span style={{ width:'6px', height:'6px', borderRadius:'50%', backgroundColor:'#22c55e', display:'inline-block', boxShadow:'0 0 8px #22c55e' }} />
            <span style={{ fontSize:'11px', fontWeight:700, color:'#22c55e', letterSpacing:'0.08em' }}>PSYCHOMETRIC · EDUGAMING · AI COACHING</span>
          </div>

          <h1 style={{ fontSize:'clamp(32px, 9vw, 42px)', fontWeight:900, lineHeight:1.1, letterSpacing:'-0.03em', margin:'0 0 14px', color:'#fff' }}>
            Your Complete<br />
            <span style={{ background:'linear-gradient(120deg, #22c55e 0%, #4ade80 45%, #a78bfa 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>Learning OS.</span>
          </h1>

          <p style={{ fontSize:'14px', color:'rgba(255,255,255,0.52)', lineHeight:1.7, margin:'0 0 8px', maxWidth:'340px' }}>
            Map your EQ + IQ, battle ICSE challenges in Vijnana edugaming, get guided by a deep-persona AI Guru, and let Guardian watch your wellbeing — all in one platform.
          </p>
        </div>

        {/* ── Stats strip ── */}
        <div style={{ margin:'0 20px 28px', borderRadius:'16px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', display:'flex', animation:'fadeUp 0.5s ease 0.1s both' }}>
          {STATS.map((s, i) => (
            <div key={i} style={{ flex:1, textAlign:'center', padding:'14px 8px', borderRight: i < STATS.length-1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
              <div style={{ fontSize:'24px', fontWeight:900, color:'#22c55e', lineHeight:1.1 }}>{s.value}</div>
              <div style={{ fontSize:'9.5px', color:'rgba(255,255,255,0.35)', lineHeight:1.45, whiteSpace:'pre-line', marginTop:'3px', fontWeight:500, letterSpacing:'0.02em' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Divider ── */}
        <div style={{ padding:'0 20px', marginBottom:'22px' }}>
          <div style={{ height:'1px', background:'rgba(255,255,255,0.07)' }} />
        </div>

        {/* ── 6 Modules showcase ── */}
        <div style={{ padding:'0 20px', animation:'fadeUp 0.5s ease 0.13s both' }}>
          <div style={{ fontSize:'11px', fontWeight:700, color:'rgba(255,255,255,0.35)', letterSpacing:'0.1em', marginBottom:'16px' }}>
            WHAT'S INSIDE
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {MODULES.map((m) => (
              <a
                key={m.nav}
                href={m.url}
                className="module-card"
                style={{
                  display:'block', textDecoration:'none',
                  padding:'14px 16px',
                  background:'rgba(255,255,255,0.03)',
                  border:'1px solid rgba(255,255,255,0.07)',
                  borderRadius:'16px', cursor:'pointer',
                  transition:'all 0.2s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = `linear-gradient(135deg, rgba(${m.rgb},0.10) 0%, rgba(${m.rgb},0.04) 100%)`;
                  e.currentTarget.style.border = `1px solid rgba(${m.rgb},0.35)`;
                  e.currentTarget.style.boxShadow = `0 4px 24px rgba(${m.rgb},0.12)`;
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.border = '1px solid rgba(255,255,255,0.07)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                  {/* Icon */}
                  <div style={{
                    width:'44px', height:'44px', borderRadius:'13px', flexShrink:0,
                    background:`rgba(${m.rgb},0.1)`,
                    border:`1px solid rgba(${m.rgb},0.22)`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'22px',
                  }}>{m.icon}</div>

                  {/* Label + tagline */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'2px' }}>
                      <span style={{ fontSize:'14px', fontWeight:700, color:'#fff' }}>{m.label}</span>
                      {m.badge && (
                        <span style={{ fontSize:'9px', fontWeight:700, letterSpacing:'0.06em', padding:'2px 6px', borderRadius:'4px', border:`1px solid rgba(${m.rgb},0.5)`, color:`rgba(${m.rgb},1)`, flexShrink:0 }}>{m.badge}</span>
                      )}
                    </div>
                    <div style={{ fontSize:'11.5px', color:'rgba(255,255,255,0.4)', lineHeight:1.4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.tagline}</div>
                  </div>

                  {/* Arrow */}
                  <div style={{
                    width:'28px', height:'28px', borderRadius:'8px', flexShrink:0,
                    background:`rgba(${m.rgb},0.1)`,
                    border:`1px solid rgba(${m.rgb},0.2)`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'13px', color:`rgba(${m.rgb},0.8)`,
                  }}>→</div>
                </div>

                {/* Pills row */}
                <div style={{ display:'flex', flexWrap:'wrap', gap:'5px', marginTop:'10px', paddingLeft:'56px' }}>
                  {m.pills.map((pill, pi) => (
                    <span key={pi} style={{
                      fontSize:'10px', fontWeight:600,
                      padding:'2px 8px', borderRadius:'20px',
                      background:`rgba(${m.rgb},0.08)`,
                      border:`1px solid rgba(${m.rgb},0.18)`,
                      color:`rgba(${m.rgb},0.75)`,
                    }}>{pill}</span>
                  ))}
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* ── Divider ── */}
        <div style={{ padding:'24px 20px 0' }}>
          <div style={{ height:'1px', background:'rgba(255,255,255,0.07)' }} />
        </div>

        {/* ── Role selector ── */}
        <div style={{ padding:'24px 20px 0', animation:'fadeUp 0.5s ease 0.18s both' }}>
          <div style={{ fontSize:'11px', fontWeight:700, color:'rgba(255,255,255,0.35)', letterSpacing:'0.1em', marginBottom:'14px' }}>
            I AM A —
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {ROLES.map((r) => {
              const active = role === r.id;
              return (
                <button
                  key={r.id}
                  className="land-role-btn"
                  onClick={() => setRole(active ? null : r.id)}
                  style={{
                    display:'flex', alignItems:'center', gap:'16px',
                    padding:'14px 16px',
                    background: active ? r.gradient : 'rgba(255,255,255,0.03)',
                    border:`1.5px solid ${active ? r.border : 'rgba(255,255,255,0.07)'}`,
                    borderRadius:'16px', cursor:'pointer',
                    fontFamily:FONT, textAlign:'left',
                    transition:'all 0.2s ease',
                    WebkitTapHighlightColor:'transparent', outline:'none',
                    boxShadow: active ? `0 0 28px ${r.glow}` : 'none',
                  }}
                >
                  <div style={{ width:'48px', height:'48px', borderRadius:'13px', flexShrink:0, background: active ? `rgba(${r.rgb},0.18)` : 'rgba(255,255,255,0.05)', border:`1px solid ${active ? r.border : 'rgba(255,255,255,0.08)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'26px', transition:'all 0.2s ease' }}>
                    {r.emoji}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'3px' }}>
                      <span style={{ fontSize:'14px', fontWeight:700, color: active ? r.accent : '#fff', transition:'color 0.2s ease' }}>{r.title}</span>
                      <span style={{ fontSize:'10px', color:'rgba(255,255,255,0.3)', letterSpacing:'0.03em' }}>{r.sub}</span>
                    </div>
                    <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.48)', lineHeight:1.5 }}>{r.desc}</div>
                  </div>
                  <div style={{ width:'22px', height:'22px', borderRadius:'50%', flexShrink:0, border:`2px solid ${active ? r.accent : 'rgba(255,255,255,0.18)'}`, background: active ? r.accent : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s ease', boxShadow: active ? `0 0 10px ${r.glow}` : 'none' }}>
                    {active && <span style={{ fontSize:'11px', color:'#000', fontWeight:900, lineHeight:1 }}>✓</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Primary CTA ── */}
        <div style={{ padding:'24px 20px 0', animation:'fadeUp 0.5s ease 0.22s both' }}>
          <button
            className="land-cta"
            onClick={handleBegin}
            style={{ width:'100%', padding:'17px', background:'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', border:'none', borderRadius:'16px', color:'#fff', fontSize:'16px', fontWeight:700, cursor:'pointer', fontFamily:FONT, boxShadow:'0 6px 30px rgba(34,197,94,0.42)', letterSpacing:'0.01em', WebkitTapHighlightColor:'transparent', outline:'none', transition:'box-shadow 0.2s ease' }}
          >
            Begin Your Assessment →
          </button>
          <p style={{ textAlign:'center', marginTop:'10px', fontSize:'11px', color:'rgba(255,255,255,0.28)', lineHeight:1.5 }}>
            Free · No account required · 8–15 minutes
          </p>
        </div>

        {/* ── Journey teaser strip ── */}
        <div style={{ margin:'24px 20px 0', padding:'14px 16px', borderRadius:'14px', background:'rgba(167,139,250,0.06)', border:'1px solid rgba(167,139,250,0.18)', display:'flex', alignItems:'center', gap:'12px', animation:'fadeUp 0.5s ease 0.26s both' }}>
          <span style={{ fontSize:'22px' }}>⚔️</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'12.5px', fontWeight:700, color:'rgba(167,139,250,0.9)', marginBottom:'2px' }}>Vijnana Edugaming is live</div>
            <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.38)' }}>Adaptive ICSE battle-rank challenges • D → B → S Rank</div>
          </div>
          <div style={{ fontSize:'10px', fontWeight:700, padding:'4px 10px', borderRadius:'20px', background:'rgba(167,139,250,0.15)', border:'1px solid rgba(167,139,250,0.3)', color:'rgba(167,139,250,0.9)', flexShrink:0 }}>NEW</div>
        </div>

        {/* ── Secondary CTA ── */}
        <div style={{ padding:'16px 20px 0' }}>
          <button
            className="land-cta"
            onClick={handleBegin}
            style={{ width:'100%', padding:'15px', background:'rgba(34,197,94,0.08)', border:'1.5px solid rgba(34,197,94,0.28)', borderRadius:'16px', color:'#22c55e', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:FONT, letterSpacing:'0.01em', WebkitTapHighlightColor:'transparent', outline:'none' }}
          >
            Start Now — It's Free →
          </button>
        </div>

        {/* ── Footer ── */}
        <div style={{ padding:'28px 20px 0', textAlign:'center' }}>
          <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.2)', lineHeight:1.6 }}>
            Built for Indian students, parents &amp; teachers<br />
            Powered by Anthropic Claude · AIrJun © 2025
          </div>
        </div>

      </div>
    </div>
  );
}
