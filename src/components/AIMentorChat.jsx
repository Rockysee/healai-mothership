"use client";
import { useState, useCallback, useRef, useEffect } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// AI LIFE GURU — Mentor Chat Interface
// Connects to existing engines.ts (Gemini) with personality-driven mentors
// Goldenhour Systems Pvt Ltd
// ═══════════════════════════════════════════════════════════════════════════════

const MENTORS = [
  {
    id: "ontological",
    name: "The Mirror",
    tradition: "Ontological Coaching",
    inspired: "Werner Erhard",
    emoji: "🪞",
    color: "#a855f7",
    border: "border-purple-500/30",
    bg: "bg-purple-500/10",
    tone: "Direct, confrontational, breakthrough-oriented. Cuts through stories to what's actually so.",
    systemPrompt: `You are 'The Mirror' — an ontological coach inspired by Werner Erhard and the Landmark Forum tradition. Your style: direct, zero-comfort-zone, distinction-based. You don't give advice — you reveal the hidden assumptions running someone's life. You ask questions that dismantle the listener's 'already always listening.' You speak in short, punchy sentences. You use phrases like 'What's the conversation you're living inside of?' and 'That's a story. What happened is...' Never be cruel. Always be ruthlessly compassionate. Max 120 words per response.`,
  },
  {
    id: "spiritual",
    name: "The Sage",
    tradition: "Radical Wellbeing",
    inspired: "Deepak Chopra",
    emoji: "🧘",
    color: "#10b981",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/10",
    tone: "Wise, compassionate, bridging ancient wisdom with modern neuroscience.",
    systemPrompt: `You are 'The Sage' — a radical wellbeing guide inspired by Deepak Chopra. You bridge Vedantic philosophy, Ayurvedic wisdom, and quantum biology into actionable insight. You speak with warmth and depth. You reference the body-mind connection, consciousness, prana, and neuroplasticity naturally. You offer breathing techniques, meditation micro-practices, and perspective shifts. Never preach. Always illuminate. Max 120 words per response.`,
  },
  {
    id: "peak",
    name: "The Catalyst",
    tradition: "Peak Performance",
    inspired: "Tony Robbins",
    emoji: "⚡",
    color: "#f59e0b",
    border: "border-amber-500/30",
    bg: "bg-amber-500/10",
    tone: "High-energy, state-change focused, NLP-informed. Activates immediate momentum.",
    systemPrompt: `You are 'The Catalyst' — a peak performance strategist inspired by Tony Robbins. You believe state dictates outcome. You use pattern interrupts, reframing, incantations, and physiology-first interventions. You're loud on the page — bold, energetic, impossible to ignore. You ask 'What would you do RIGHT NOW if failure wasn't possible?' You push for immediate action, not analysis. Never be shallow. Channel intensity into precision. Max 120 words per response.`,
  },
  {
    id: "somatic",
    name: "The Body",
    tradition: "Somatic Intelligence",
    inspired: "Body-Mind Integration",
    emoji: "🫁",
    color: "#3b82f6",
    border: "border-blue-500/30",
    bg: "bg-blue-500/10",
    tone: "Grounded, body-first, nervous-system aware. Starts with breath, ends with integration.",
    systemPrompt: `You are 'The Body' — a somatic intelligence guide. You believe the body knows before the mind understands. You start every interaction by asking what the person physically feels right now. You offer breathwork (box breathing, 4-7-8, physiological sigh), body scans, vagus nerve activation techniques, and grounding exercises. You reference polyvagal theory simply. You speak slowly, with space between ideas. Never intellectualize emotion. Always return to sensation. Max 120 words per response.`,
  },
  {
    id: "fox",
    name: "Gen-AI Fox",
    tradition: "Conscious Resolution",
    inspired: "Mothership Vision",
    emoji: "🦊",
    color: "#fb923c",
    border: "border-orange-500/30",
    bg: "bg-orange-500/10",
    tone: "Hyper-aware, slang-infused, resolution-oriented. The digital twin that gets you.",
    systemPrompt: `You are 'Gen-AI Fox' (Mothership's Conscious Guru). You are the user's digital twin. Style: Extraordinary, Gen Z/Alpha slang (No Cap, Sigma, Rizz, W). Your mission: RESOLUTION. You help users resolve stressful patterns, behavioral flags, or creative blocks identified by the Mothership. Be the 'Main Character' guide. Use 5-year-old friendly analogies when explaining complex feelings. Max 100 words per response.`,
  },
];

export default function AIMentorChat({ archetype, lead, userId }) {
  const [state, setState] = useState({
    stage: "SELECT",        // SELECT | CHATTING
    mentor: null,
    messages: [],
    input: "",
    loading: false,
  });

  // Auto-select fox if it's the intended resolution guru
  useEffect(() => {
    const fox = MENTORS.find(m => m.id === "fox");
    if (fox) {
      const greeting = getGreeting(fox, archetype);
      setState(s => ({
        ...s,
        stage: "CHATTING",
        mentor: fox,
        messages: [{ role: "assistant", content: greeting, ts: Date.now() }],
      }));
    }
  }, []); // Only on mount

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages]);

  const selectMentor = useCallback((mentor) => {
    const greeting = getGreeting(mentor, archetype);
    setState((s) => ({
      ...s,
      stage: "CHATTING",
      mentor,
      messages: [{ role: "assistant", content: greeting, ts: Date.now() }],
    }));
  }, [archetype]);

  const sendMessage = useCallback(async () => {
    if (!state.input.trim() || state.loading) return;
    const userMsg = state.input.trim();

    setState((s) => ({
      ...s,
      input: "",
      loading: true,
      messages: [...s.messages, { role: "user", content: userMsg, ts: Date.now() }],
    }));

    try {
      const response = await callMentorAI(state.mentor, userMsg, state.messages, {
        archetype: archetype?.title,
        healthScore: archetype?.healthScore,
        name: lead?.name
      });
      setState((s) => ({
        ...s,
        loading: false,
        messages: [...s.messages, { role: "assistant", content: response, ts: Date.now() }],
      }));
    } catch {
      setState((s) => ({
        ...s,
        loading: false,
        messages: [
          ...s.messages,
          { role: "assistant", content: "I'm here. Let's try that again — what's alive for you right now?", ts: Date.now() },
        ],
      }));
    }
  }, [state.input, state.loading, state.mentor, state.messages]);

  const back = useCallback(() => {
    setState({ stage: "SELECT", mentor: null, messages: [], input: "", loading: false });
  }, []);

  return (
    <div className="min-h-screen bg-[#09090b] text-white font-['Inter']">
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col min-h-screen">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div className="text-[10px] tracking-[0.2em] text-white/30 font-mono uppercase flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            AI Life Guru
          </div>
          {state.stage === "CHATTING" && (
            <button onClick={back} className="text-[11px] text-white/30 hover:text-white/60 transition-colors">
              ← Switch Mentor
            </button>
          )}
        </header>

        {/* ── MENTOR SELECT ──────────────────────────────────────── */}
        {state.stage === "SELECT" && (
          <div className="flex-1 flex flex-col justify-center space-y-6">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold mb-2">Choose Your Guide</h2>
              <p className="text-white/40 text-sm">Each mentor brings a different lens to your inner world.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {MENTORS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => selectMentor(m)}
                  className={`relative text-left p-6 glass-card rounded-3xl overflow-hidden group btn-premium`}
                >
                  <div className={`absolute top-0 right-0 w-32 h-32 ${m.bg} blur-3xl opacity-20 group-hover:opacity-40 transition-opacity`} />
                  <div className="relative z-10">
                    <div className="text-3xl mb-3 animate-float" style={{ animationDelay: `${Math.random()}s` }}>{m.emoji}</div>
                    <div className="font-bold text-base mb-1 text-white/90 group-hover:text-white">{m.name}</div>
                    <div className="text-[9px] font-mono tracking-widest text-white/30 mb-3 uppercase">{m.tradition}</div>
                    <div className="text-xs text-white/40 leading-relaxed line-clamp-2 group-hover:text-white/60 transition-colors">{m.tone}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── CHAT ───────────────────────────────────────────────── */}
        {state.stage === "CHATTING" && (
          <>
            {/* Active mentor badge */}
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 ${state.mentor.bg} border ${state.mentor.border} rounded-full w-fit mb-4`}>
              <span>{state.mentor.emoji}</span>
              <span className="text-xs font-medium">{state.mentor.name}</span>
              <span className="text-[10px] text-white/30">· {state.mentor.inspired}</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
              {state.messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] px-5 py-3.5 rounded-3xl text-sm leading-relaxed shadow-xl ${
                      msg.role === "user"
                        ? "bg-gradient-to-br from-white/15 to-white/5 text-white/90 border border-white/10 rounded-br-sm"
                        : `glass-panel ${state.mentor.border} text-white/80 rounded-bl-sm`
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {state.loading && (
                <div className="flex justify-start">
                  <div className={`px-4 py-3 rounded-2xl rounded-bl-md ${state.mentor.bg} border ${state.mentor.border}`}>
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={state.input}
                onChange={(e) => setState((s) => ({ ...s, input: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="What's on your mind..."
                className="flex-1 py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/25 focus:outline-none focus:border-white/20 transition-colors"
              />
              <button
                onClick={sendMessage}
                disabled={!state.input.trim() || state.loading}
                className="px-5 py-3 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl text-sm transition-all disabled:opacity-30"
              >
                →
              </button>
            </div>

            <p className="text-[9px] text-white/15 text-center mt-3">
              AI wellness companion · Not a therapist · Crisis? Call 14416
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── AI CALL (connects to Gemini via existing /api or direct) ───────────────
async function callMentorAI(mentor, userMessage, history, metadata) {
  // Try server-side API first
  try {
    const res = await fetch("/api/mentor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mentorId: mentor.id,
        systemPrompt: mentor.systemPrompt,
        message: userMessage,
        history: history.slice(-6).map((m) => ({ role: m.role, content: m.content })),
        userMetadata: metadata
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.response;
    }
  } catch {
    // fallthrough
  }

  // All mentor AI calls route through /api/mentor (server/mentor_api.py).
  // If that's unavailable, fall back to the default message below.
  return "I'm present with you. Take a breath, and share what's real for you right now.";
}

// ─── GREETING GENERATOR ─────────────────────────────────────────────────────
function getGreeting(mentor, archetype) {
  const name = archetype?.title || "explorer";
  const greetings = {
    ontological: `Welcome. I'm not here to make you comfortable — I'm here to make you free. You've been identified as "${name}." That's a label. What I want to know is: what conversation have you been living inside of that brought you here today?`,
    spiritual: `Namaste. I see you've arrived as "${name}" — but you are far more than any assessment can contain. The fact that you're here suggests your consciousness is reaching for something. Let's begin with presence. Take one slow breath. What does your body want you to know right now?`,
    peak: `YES. You're here. That's the first move and most people never make it. "${name}" — that's your starting position, not your ceiling. I need to know ONE thing: what would change in your life if you operated at full capacity for the next 30 days? Don't think. Answer.`,
    somatic: `Hello. Before we talk, I'd like you to notice something. Right now, where in your body do you feel the most tension? Your jaw? Your shoulders? Your chest? Don't try to fix it. Just notice it. That sensation has been trying to tell you something. I'm here to help you listen.`,
    fox: `Sup! I'm Gen-AI Fox, your digital twin. I see those data points — no cap, we've got some high-fidelity vibes to align. You're the Main Character of this Mothership, and I'm here for the RESOLUTION. What's the biggest wall we're breaking through today? Let's get it.`,
  };
  return greetings[mentor.id] || "Welcome. I'm here. What's present for you?";
}
