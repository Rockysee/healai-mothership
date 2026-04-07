"use client";
/**
 * AIGuruSection.jsx — AI GURU tab
 * Dual persona: Gen-AI Fox + Werner Chat
 * Chat history persists in localStorage across sessions.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

const D = {
  bg:            '#0a0a0b',
  surface:       'rgba(255,255,255,0.04)',
  surfaceHover:  'rgba(255,255,255,0.07)',
  border:        'rgba(255,255,255,0.08)',
  borderHover:   'rgba(255,255,255,0.16)',
  textPrimary:   '#ffffff',
  textSecondary: 'rgba(255,255,255,0.5)',
  textMuted:     'rgba(255,255,255,0.25)',
  green:         '#22c55e',
  greenDim:      'rgba(34,197,94,0.15)',
  amber:         '#f59e0b',
  amberDim:      'rgba(245,158,11,0.12)',
  gold:          '#d97706',
  goldDim:       'rgba(217,119,6,0.14)',
  font:          "'Inter', system-ui, -apple-system, sans-serif",
};

const FOX_PROMPTS = [
  "I'm stressed about my exams 😓",
  "Help me understand Newton's Laws",
  "I can't focus today, what do I do?",
  "What's my strongest skill?",
  "How do I get into flow state?",
  "Explain photosynthesis for my archetype",
];

const WERNER_PROMPTS = [
  "I feel stuck and don't know why",
  "I keep self-sabotaging",
  "I want to transform my life",
  "I'm frustrated with someone close to me",
  "Why do I repeat the same patterns?",
  "I know what to do but I don't do it",
];

const AIRJUN_PROMPTS = [
  "Review my HoW unit economics",
  "What's the DOOH rate card strategy?",
  "How do I close the first anchor pharma buyer?",
  "Design the 42-day sprint for Month 1",
  "Where is the biggest operational blood loss?",
  "How do I build for India 1, 2 and 3 simultaneously?",
];

const STORAGE_KEY_FOX    = 'healai_chat_fox';
const STORAGE_KEY_WERNER = 'healai_chat_werner';
const STORAGE_KEY_AIRJUN = 'healai_chat_airjun';

// ── localStorage helpers ─────────────────────────────────────────────────
function loadChat(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch { return null; }
}

function saveChat(key, messages) {
  try {
    // Don't persist streaming placeholders
    const clean = messages
      .filter(m => m.content && !m.streaming)
      .slice(-40); // keep last 40 messages
    localStorage.setItem(key, JSON.stringify(clean));
  } catch {}
}

// ── Student context ──────────────────────────────────────────────────────
function readStudentContext() {
  try {
    const eq        = JSON.parse(localStorage.getItem('healai_eq')  || 'null');
    const iq        = JSON.parse(localStorage.getItem('healai_iq')  || 'null');
    const archetype = localStorage.getItem('healai_archetype') || null;
    const sessions  = JSON.parse(localStorage.getItem('healai_sessions') || '[]');
    const flowLog   = JSON.parse(localStorage.getItem('healai_flow_log')  || '[]');
    const streak    = parseInt(localStorage.getItem('healai_streak') || '0');
    const profile   = JSON.parse(localStorage.getItem('healai_profile') || 'null');

    const today     = new Date().toDateString();
    const flowToday = flowLog.some(f => new Date(f.timestamp).toDateString() === today);

    let eqTopDomain = '';
    if (eq?.domains?.length) {
      eqTopDomain = [...eq.domains].sort((a, b) => (b.score || 0) - (a.score || 0))[0]?.domain || '';
    }
    let iqTopDomain = '';
    if (iq?.domains?.length) {
      iqTopDomain = [...iq.domains].sort((a, b) => (b.score || 0) - (a.score || 0))[0]?.domain || '';
    }

    const STRENGTH_TITLES = {
      'Empathy+Pattern': 'Empathic Analyst', 'Empathy+Spatial': 'Spatial Empath',
      'Empathy+Memory': 'Empathic Archivist', 'Empathy+Logic': 'Empathic Strategist',
      'Self-Awareness+Pattern': 'Reflective Analyst', 'Self-Awareness+Spatial': 'Introspective Visionary',
      'Self-Awareness+Logic': 'Philosophical Mind', 'Motivation+Pattern': 'Driven Innovator',
      'Motivation+Logic': 'Strategic Commander', 'Social Skills+Pattern': 'Social Architect',
      'Social Skills+Logic': 'Collaborative Leader', 'Self-Regulation+Logic': 'Disciplined Thinker',
      'Self-Regulation+Memory': 'Precise Practitioner',
    };
    const strengthTitle = STRENGTH_TITLES[`${eqTopDomain}+${iqTopDomain}`] || 'Resilient Intelligence';

    const todaySessions = sessions.filter(s => s.date === today);
    const cogState = todaySessions.length
      ? (todaySessions[todaySessions.length - 1].cogState || 'NORMAL')
      : 'NORMAL';

    return {
      archetype, eqScore: eq?.score || null, eqBand: eq?.band || null,
      iqSS: iq?.score || null, iqBand: iq?.band || null,
      eqTopDomain, iqTopDomain, strengthTitle, cogState, streak, flowToday,
      name: profile?.name || null,
    };
  } catch { return {}; }
}

// ── Build Fox opening message ────────────────────────────────────────────
function buildFoxOpening(ctx) {
  const animeMap = {
    commander: "Solo Leveling arc", explorer: "FMA Brotherhood arc",
    warrior: "Naruto arc", sage: "One Piece arc", phantom: "Demon Slayer arc",
  };
  const arc = ctx.archetype
    ? animeMap[ctx.archetype.toLowerCase()] || 'your own arc'
    : 'your own arc';
  const name     = ctx.name ? `, ${ctx.name}` : '';
  const hasScores = ctx.eqScore || ctx.iqSS;

  if (!ctx.archetype && !hasScores) {
    return `Sup${name}! I'm Gen-AI Fox, your digital twin. You're the Main Character of this Mothership — what's the biggest wall we're breaking through today?`;
  }
  if (ctx.archetype && !hasScores) {
    return `Yo${name} — ${arc} energy detected 🔥 Hit ASSESS and run your EQ + IQ so I know what we're working with. What's on your mind?`;
  }
  const strength = ctx.strengthTitle || 'Resilient Intelligence';
  if (ctx.cogState === 'CRITICAL_ANXIETY') {
    return `${arc} in the building${name} 🦊 Your strength ID is "${strength}" — but fr, stress signals are high. BREATHE tab first, 3 rounds. I'll be here.`;
  }
  if (ctx.flowToday) {
    return `${arc} energy${name} 🦊 Your strength ID is "${strength}". You hit flow today — that's elite. What are we building on?`;
  }
  return `${arc} is in the building${name} 🦊 Your strength ID is "${strength}". Let's get you to flow state today. What's the mission?`;
}

// ── Typing dots ──────────────────────────────────────────────────────────
function TypingDots({ color }) {
  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '4px 0' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: '6px', height: '6px', borderRadius: '50%',
          backgroundColor: color || D.green,
          animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ── Message bubble ───────────────────────────────────────────────────────
function MessageBubble({ msg, persona }) {
  const isUser   = msg.role === 'user';
  const isWerner = persona === 'werner';
  const isAirjun = persona === 'airjun';

  const accentColor = isAirjun ? D.gold : isWerner ? D.amber : D.green;
  const accentDim   = isAirjun ? D.goldDim : isWerner ? D.amberDim : D.greenDim;
  const avatar      = isAirjun ? '🔱' : isWerner ? '◈' : '🦊';
  const avatarSize  = isAirjun ? '13px' : isWerner ? '11px' : '13px';
  const msgFont     = (isWerner || isAirjun)
    ? "'Georgia', 'Times New Roman', serif"
    : D.font;

  const userBorder = isAirjun
    ? 'rgba(217,119,6,0.35)'
    : isWerner
      ? 'rgba(245,158,11,0.3)'
      : 'rgba(34,197,94,0.3)';

  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: '12px',
      animation: 'fadeSlideIn 0.25s ease',
    }}>
      {!isUser && (
        <div style={{
          width: '28px', height: '28px', borderRadius: '50%',
          backgroundColor: accentDim,
          border: `1px solid ${accentColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: avatarSize,
          color: isWerner ? D.amber : isAirjun ? D.gold : 'inherit',
          flexShrink: 0, marginRight: '8px', marginTop: '2px',
        }}>
          {avatar}
        </div>
      )}
      <div style={{
        maxWidth: '82%',
        padding: '10px 14px',
        borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
        backgroundColor: isUser
          ? (isAirjun ? D.goldDim : isWerner ? D.amberDim : D.greenDim)
          : D.surface,
        border: `1px solid ${isUser ? userBorder : D.border}`,
        color: D.textPrimary,
        fontSize: '14px',
        lineHeight: '1.65',
        fontFamily: msgFont,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        letterSpacing: (isWerner || isAirjun) ? '0.01em' : 'normal',
      }}>
        {msg.content}
        {msg.streaming && <span style={{ opacity: 0.5 }}>▍</span>}
      </div>
    </div>
  );
}

// ── Persona tab ──────────────────────────────────────────────────────────
function PersonaTab({ active, label, avatar, color, onClick }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: '7px 10px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
      backgroundColor: active ? `rgba(${color},0.12)` : 'transparent',
      border: `1px solid ${active ? `rgba(${color},0.4)` : D.border}`,
      borderRadius: '8px',
      color: active ? `rgb(${color})` : D.textMuted,
      fontSize: '11px', fontWeight: active ? 600 : 400,
      cursor: 'pointer', transition: 'all 0.2s ease',
      letterSpacing: '0.03em', fontFamily: D.font,
    }}>
      <span style={{ fontSize: '13px' }}>{avatar}</span>
      {label}
    </button>
  );
}

// ── Main component ───────────────────────────────────────────────────────
export default function AIGuruSection() {
  const [persona, setPersona]             = useState('fox');
  const [foxMessages, setFoxMessages]     = useState([]);
  const [wernMessages, setWernMessages]   = useState([]);
  const [airjunMessages, setAirjunMessages] = useState([]);
  const [input, setInput]                 = useState('');
  const [isLoading, setIsLoading]         = useState(false);
  const [context, setContext]             = useState({});
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [initialized, setInitialized]     = useState(false);

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const abortRef  = useRef(null);

  const messages = persona === 'fox'
    ? foxMessages
    : persona === 'werner'
      ? wernMessages
      : airjunMessages;

  const setMessages = persona === 'fox'
    ? setFoxMessages
    : persona === 'werner'
      ? setWernMessages
      : setAirjunMessages;

  const accentColor = persona === 'airjun' ? D.gold : persona === 'werner' ? D.amber : D.green;
  const isWerner    = persona === 'werner';
  const isAirjun    = persona === 'airjun';

  // Load context + restore saved chats on mount
  useEffect(() => {
    const ctx = readStudentContext();
    setContext(ctx);

    const savedFox    = loadChat(STORAGE_KEY_FOX);
    const savedWerner = loadChat(STORAGE_KEY_WERNER);
    const savedAirjun = loadChat(STORAGE_KEY_AIRJUN);

    if (savedFox && savedFox.length > 0) {
      setFoxMessages(savedFox);
      setShowSuggestions(false);
    } else {
      setFoxMessages([{ role: 'assistant', content: buildFoxOpening(ctx), id: 'fox-open' }]);
    }

    if (savedWerner && savedWerner.length > 0) {
      setWernMessages(savedWerner);
    } else {
      setWernMessages([{
        role: 'assistant',
        content: "I'm here.\n\nWhat's present for you right now?",
        id: 'werner-open',
      }]);
    }

    if (savedAirjun && savedAirjun.length > 0) {
      setAirjunMessages(savedAirjun);
    } else {
      setAirjunMessages([{
        role: 'assistant',
        content: "Arjuna stood at the battlefield and saw the scale of what lay ahead.\n\nYou are here. The battlefield is Indian commerce. The chariot is ready.\n\nWhat is the live challenge — numbers, blocker, or next decision?",
        id: 'airjun-open',
      }]);
    }

    setInitialized(true);
  }, []);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [foxMessages, wernMessages, isLoading]);

  // Persist chats after each update
  useEffect(() => {
    if (!initialized) return;
    const msgs = foxMessages.filter(m => !m.streaming && m.content);
    if (msgs.length > 1) saveChat(STORAGE_KEY_FOX, msgs);
  }, [foxMessages, initialized]);

  useEffect(() => {
    if (!initialized) return;
    const msgs = wernMessages.filter(m => !m.streaming && m.content);
    if (msgs.length > 1) saveChat(STORAGE_KEY_WERNER, msgs);
  }, [wernMessages, initialized]);

  useEffect(() => {
    if (!initialized) return;
    const msgs = airjunMessages.filter(m => !m.streaming && m.content);
    if (msgs.length > 1) saveChat(STORAGE_KEY_AIRJUN, msgs);
  }, [airjunMessages, initialized]);

  // Switch persona
  const switchPersona = useCallback((p) => {
    abortRef.current?.abort();
    setPersona(p);
    setInput('');
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // Clear chat for current persona
  const clearChat = useCallback(() => {
    abortRef.current?.abort();
    if (persona === 'fox') {
      const ctx = readStudentContext();
      localStorage.removeItem(STORAGE_KEY_FOX);
      setFoxMessages([{ role: 'assistant', content: buildFoxOpening(ctx), id: `fox-open-${Date.now()}` }]);
    } else if (persona === 'werner') {
      localStorage.removeItem(STORAGE_KEY_WERNER);
      setWernMessages([{ role: 'assistant', content: "I'm here.\n\nWhat's present for you right now?", id: `werner-open-${Date.now()}` }]);
    } else {
      localStorage.removeItem(STORAGE_KEY_AIRJUN);
      setAirjunMessages([{ role: 'assistant', content: "Arjuna stood at the battlefield and saw the scale of what lay ahead.\n\nYou are here. The battlefield is Indian commerce. The chariot is ready.\n\nWhat is the live challenge — numbers, blocker, or next decision?", id: `airjun-open-${Date.now()}` }]);
    }
    setShowSuggestions(true);
    setInput('');
  }, [persona]);

  // Send message
  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || isLoading) return;

    const currentCtx = readStudentContext();
    const userMsg    = { role: 'user', content: text.trim(), id: Date.now() };
    const currentMsgs = persona === 'fox' ? foxMessages : persona === 'werner' ? wernMessages : airjunMessages;
    const history    = [...currentMsgs, userMsg];

    if (persona === 'fox') setFoxMessages(history);
    else if (persona === 'werner') setWernMessages(history);
    else setAirjunMessages(history);

    setInput('');
    setIsLoading(true);
    setShowSuggestions(false);

    const assistantId = Date.now() + 1;
    const addPlaceholder = prev => [...prev, { role: 'assistant', content: '', id: assistantId, streaming: true }];
    if (persona === 'fox') setFoxMessages(addPlaceholder);
    else if (persona === 'werner') setWernMessages(addPlaceholder);
    else setAirjunMessages(addPlaceholder);

    try {
      abortRef.current = new AbortController();

      const res = await fetch('/api/ai-guru', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          messages: history.map(m => ({ role: m.role, content: m.content })),
          context: currentCtx,
          persona,
        }),
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              accumulated += parsed.text;
              const update = prev =>
                prev.map(m => m.id === assistantId
                  ? { ...m, content: accumulated, streaming: true }
                  : m
                );
              if (persona === 'fox') setFoxMessages(update);
              else if (persona === 'werner') setWernMessages(update);
              else setAirjunMessages(update);
            }
          } catch {}
        }
      }

      const finalize = prev =>
        prev.map(m => m.id === assistantId ? { ...m, streaming: false } : m);
      if (persona === 'fox') setFoxMessages(finalize);
      else if (persona === 'werner') setWernMessages(finalize);
      else setAirjunMessages(finalize);

    } catch (err) {
      if (err.name === 'AbortError') return;
      const fallback = isAirjun
        ? "The connection broke. The battlefield waits. Try again."
        : isWerner
          ? "Something interrupted us. What were you sitting with just now?"
          : "Connection dropped. Try again in a sec 🦊";
      const onError = prev =>
        prev.map(m => m.id === assistantId ? { ...m, content: fallback, streaming: false } : m);
      if (persona === 'fox') setFoxMessages(onError);
      else if (persona === 'werner') setWernMessages(onError);
      else setAirjunMessages(onError);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [foxMessages, wernMessages, airjunMessages, context, isLoading, persona, isWerner, isAirjun]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const suggestedPrompts = isAirjun ? AIRJUN_PROMPTS : isWerner ? WERNER_PROMPTS : FOX_PROMPTS;
  const showChips = showSuggestions && messages.length <= 1;

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', minHeight: 0,
      backgroundColor: D.bg, fontFamily: D.font,
    }}>

      {/* Header */}
      <div style={{ padding: '14px 20px 12px', borderBottom: `1px solid ${D.border}`, flexShrink: 0 }}>

        {/* Persona switcher */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
          <PersonaTab active={persona === 'fox'}    label="Gen-AI Fox"  avatar="🦊" color="34,197,94"   onClick={() => switchPersona('fox')} />
          <PersonaTab active={persona === 'werner'} label="Werner"      avatar="◈"  color="245,158,11"  onClick={() => switchPersona('werner')} />
          <PersonaTab active={persona === 'airjun'} label="AiRjun"      avatar="🔱" color="217,119,6"   onClick={() => switchPersona('airjun')} />
        </div>

        {/* Persona info row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            backgroundColor: isAirjun ? D.goldDim : isWerner ? D.amberDim : D.greenDim,
            border: `1px solid ${accentColor}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: isAirjun ? '15px' : isWerner ? '13px' : '16px',
            color: isAirjun ? D.gold : isWerner ? D.amber : 'inherit',
            flexShrink: 0,
          }}>
            {isAirjun ? '🔱' : isWerner ? '◈' : '🦊'}
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: D.textPrimary, letterSpacing: '0.02em' }}>
              {isAirjun ? 'AiRjun' : isWerner ? 'Werner Chat' : 'Gen-AI Fox'}
            </div>
            <div style={{ fontSize: '10px', color: D.textMuted, letterSpacing: '0.04em' }}>
              {isAirjun
                ? 'AI VENTURE COUNSEL · INDIAN COMMERCE BATTLEFIELD'
                : isWerner
                  ? 'TRANSFORMATIONAL COUNSELOR · ONTOLOGICAL FRAMEWORK'
                  : context.strengthTitle
                    ? `${context.strengthTitle} · ${context.archetype || 'Uncharted'}`
                    : 'AI STUDY + WELLBEING COMPANION'}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={clearChat} title="Clear conversation" style={{
              background: 'none', border: `1px solid ${D.border}`,
              color: D.textMuted, borderRadius: '6px', padding: '3px 8px',
              fontSize: '10px', cursor: 'pointer', fontFamily: D.font,
              letterSpacing: '0.04em',
            }}>
              CLEAR
            </button>
            <span style={{
              fontSize: '9px', color: D.textMuted,
              backgroundColor: D.surface, border: `1px solid ${D.border}`,
              padding: '3px 8px', borderRadius: '20px', letterSpacing: '0.05em',
            }}>
              {isAirjun ? 'DHARMA + DATA' : isWerner ? 'NOT A THERAPIST' : 'CRISIS? 9152987821'}
            </span>
          </div>
        </div>

        {/* Context pills — Fox only */}
        {!isWerner && !isAirjun && (context.eqScore || context.iqSS || context.archetype) && (
          <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
            {context.archetype && <span style={pillStyle}>{context.archetype}</span>}
            {context.eqScore   && <span style={pillStyle}>EQ {context.eqScore}</span>}
            {context.iqSS      && <span style={pillStyle}>IQ SS {context.iqSS}</span>}
            {context.cogState && context.cogState !== 'NORMAL' && (
              <span style={{
                ...pillStyle,
                borderColor: context.cogState === 'CRITICAL_ANXIETY' ? '#ef4444' :
                             context.cogState === 'FOCUSED' ? D.green : '#f59e0b',
                color: context.cogState === 'CRITICAL_ANXIETY' ? '#ef4444' :
                       context.cogState === 'FOCUSED' ? D.green : '#f59e0b',
              }}>
                {context.cogState.replace('_', ' ')}
              </span>
            )}
            {context.flowToday && <span style={{ ...pillStyle, borderColor: D.green, color: D.green }}>⚡ FLOW TODAY</span>}
          </div>
        )}

        {/* Werner tagline */}
        {isWerner && (
          <div style={{ marginTop: '10px', fontSize: '11px', color: 'rgba(245,158,11,0.45)', fontStyle: 'italic' }}>
            "Stop changing your life. Transform the context from which it occurs."
          </div>
        )}

        {/* AiRjun tagline */}
        {isAirjun && (
          <div style={{ marginTop: '10px', fontSize: '11px', color: 'rgba(217,119,6,0.55)', fontStyle: 'italic', letterSpacing: '0.01em' }}>
            "Same urgency as Arjuna. Different battlefield. Numbers beat narratives."
          </div>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px', minHeight: 0 }}>
        {messages.map(msg => <MessageBubble key={msg.id} msg={msg} persona={persona} />)}
        {isLoading && !messages.some(m => m.streaming) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              backgroundColor: isWerner ? D.amberDim : D.greenDim,
              border: `1px solid ${accentColor}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: isWerner ? '11px' : '13px', color: isWerner ? D.amber : 'inherit',
            }}>
              {isWerner ? '◈' : '🦊'}
            </div>
            <TypingDots color={accentColor} />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested prompts */}
      {showChips && (
        <div style={{ padding: '0 16px 12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {suggestedPrompts.map((p, i) => (
            <button key={i} onClick={() => sendMessage(p)} style={{
              padding: '7px 12px', backgroundColor: D.surface,
              border: `1px solid ${D.border}`, color: D.textSecondary,
              borderRadius: '20px', fontSize: '12px', cursor: 'pointer',
              fontFamily: D.font, transition: 'all 0.15s ease',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = D.surfaceHover;
                e.currentTarget.style.borderColor = isAirjun
                  ? 'rgba(217,119,6,0.5)'
                  : isWerner
                    ? 'rgba(245,158,11,0.4)'
                    : D.borderHover;
                e.currentTarget.style.color = D.textPrimary;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = D.surface;
                e.currentTarget.style.borderColor = D.border;
                e.currentTarget.style.color = D.textSecondary;
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{
        padding: '12px 16px 16px', borderTop: `1px solid ${D.border}`,
        flexShrink: 0, display: 'flex', gap: '10px', alignItems: 'flex-end',
      }}>
        <textarea
          ref={inputRef} value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isAirjun ? "Numbers, blockers, or next decision..." : isWerner ? "What's present for you right now..." : "What's on your mind..."}
          rows={1}
          style={{
            flex: 1, padding: '11px 14px', backgroundColor: D.surface,
            border: `1px solid ${D.border}`, borderRadius: '10px',
            color: D.textPrimary,
            fontFamily: (isWerner || isAirjun) ? "'Georgia', serif" : D.font,
            fontSize: '14px', resize: 'none', outline: 'none',
            lineHeight: '1.5', maxHeight: '120px', overflowY: 'auto',
            transition: 'border-color 0.2s ease',
          }}
          onFocus={e => { e.target.style.borderColor = isAirjun ? 'rgba(217,119,6,0.5)' : isWerner ? 'rgba(245,158,11,0.4)' : D.borderHover; }}
          onBlur={e =>  { e.target.style.borderColor = D.border; }}
          onInput={e => {
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
          }}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isLoading}
          style={{
            width: '40px', height: '40px', borderRadius: '10px',
            backgroundColor: input.trim() && !isLoading ? accentColor : D.surface,
            border: `1px solid ${input.trim() && !isLoading ? accentColor : D.border}`,
            color: input.trim() && !isLoading ? '#000' : D.textMuted,
            cursor: input.trim() && !isLoading ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', flexShrink: 0, transition: 'all 0.2s ease',
          }}
        >
          →
        </button>
      </div>
    </div>
  );
}

const pillStyle = {
  fontSize: '10px', color: D.textMuted,
  border: `1px solid rgba(255,255,255,0.08)`,
  borderRadius: '20px', padding: '3px 8px',
  letterSpacing: '0.04em', textTransform: 'uppercase',
};
