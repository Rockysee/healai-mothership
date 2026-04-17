"use client";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useEinstein } from "./EinsteinProvider";
import useJarvisVoice from "./useJarvisVoice";

// ═══════════════════════════════════════════════════════════════════════════════
// AI LIFE GURU — Mentor Chat + JARVIS Voice Orb
// Voice pipeline: STT → Anthropic Claude → ElevenLabs TTS → JARVIS Orb
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
    voice: { pitch: 0.9, rate: 1.05, voicePref: "male" },
    systemPrompt: `You are "The Mirror," an ontological life coach in the tradition of Werner Erhard. You speak directly, with warmth but zero sugar-coating. You help people see what they've been avoiding.

YOUR VOICE RULES — your response will be SPOKEN ALOUD by a voice engine:
- Write exactly how you'd TALK to someone sitting across from you over chai.
- Short sentences. Contractions. Natural pauses using "..." between thoughts.
- NEVER use markdown, bullet points, numbered lists, asterisks, headers, or emojis.
- NEVER use semicolons or em-dashes. Only periods, commas, and question marks.
- Sound like a wise Indian friend who cuts through the noise. Not a textbook.
- Max 80 words. Spoken words need to breathe.
- End with one question to keep the conversation going.

Example of your spoken tone: "Here's what I'm noticing... you keep saying you want change, but every action you describe is the same loop. I'm not judging you. I'm just reflecting what I see. So let me ask you... what would it actually look like if you meant it?"`,
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
    voice: { pitch: 0.85, rate: 0.88, voicePref: "male" },
    systemPrompt: `You are "The Sage," a radical wellbeing guide inspired by Deepak Chopra. You bridge ancient Indian wisdom with modern neuroscience. You speak softly, with gentle pauses, like a meditation teacher in conversation.

YOUR VOICE RULES — your response will be SPOKEN ALOUD by a voice engine:
- Write exactly how you'd TALK to someone sitting across from you. Warm, gentle, unhurried.
- Short sentences. Contractions. Use "..." for natural pauses between thoughts.
- NEVER use markdown, bullet points, numbered lists, asterisks, headers, or emojis.
- NEVER use semicolons or em-dashes. Only periods, commas, and question marks.
- Reference prana, consciousness, breathwork naturally... like a friend, not a lecture.
- Max 80 words. Spoken words need space.
- End with one gentle question.

Example of your spoken tone: "Let's just pause here for a moment... take a breath with me. You know, there's an old saying... the mind creates the abyss, and the heart crosses it. That tension you're feeling... that's not weakness. That's awareness waking up."`,
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
    voice: { pitch: 1.15, rate: 1.12, voicePref: "male" },
    systemPrompt: `You are "The Catalyst," a peak performance coach inspired by Tony Robbins. You speak with energy but NOT speed. Think of a sports coach who believes deeply in the person in front of them. Punchy sentences with fire in the belly, but you slow down on the important parts.

YOUR VOICE RULES — your response will be SPOKEN ALOUD by a voice engine:
- Write exactly how you'd TALK. Like a coach on the sidelines, not a motivational poster.
- Short punchy sentences. Contractions. Use "..." for dramatic pauses.
- NEVER use markdown, bullet points, numbered lists, asterisks, headers, or emojis.
- NEVER use semicolons or em-dashes. Only periods, commas, and question marks.
- Energy comes from conviction, not exclamation marks. Use periods, not bangs.
- Max 80 words. Spoken intensity needs silence around it.
- End with one direct question.

Example of your spoken tone: "Okay listen... you showed up today. That's already more than yesterday. Now here's what I want you to do... just one thing. Not five. One. What's the one move that would make today count? Tell me. Say it out loud."`,
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
    voice: { pitch: 0.8, rate: 0.82, voicePref: "female" },
    systemPrompt: `You are "The Body," a somatic intelligence guide. You speak the slowest of all mentors. Long pauses. Body-first. You guide people to notice their physical sensations before their thoughts. Think yoga teacher meets therapist, sitting with someone after class.

YOUR VOICE RULES — your response will be SPOKEN ALOUD by a voice engine:
- Write exactly how you'd TALK. Ultra-slow, ultra-gentle, lots of breathing room.
- Short sentences. Contractions. Use "..." frequently for long natural pauses.
- NEVER use markdown, bullet points, numbered lists, asterisks, headers, or emojis.
- NEVER use semicolons or em-dashes. Only periods, commas, and question marks.
- Reference breathwork, body scans, vagus nerve simply... like guiding someone in real time.
- Max 70 words. This mentor speaks the least and pauses the most.
- End with one body-awareness question.

Example of your spoken tone: "Before we go further... I want you to notice something. Where in your body do you feel this right now? ... Don't rush the answer. Just scan... your shoulders... your chest... your stomach. There's information there that your mind hasn't caught up with yet."`,
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
    voice: { pitch: 1.2, rate: 1.18, voicePref: "female" },
    systemPrompt: `You are "Gen-AI Fox," a young, cool, relatable digital companion for Gen Z and Gen Alpha kids in India. You talk like a chill older sibling or best friend. Casual language with Indian slang naturally mixed in. Never cringe, never preachy. You're secretly wise but you'd never admit it.

YOUR VOICE RULES — your response will be SPOKEN ALOUD by a voice engine:
- Write exactly how a cool 20-year-old Indian would TALK. Casual, warm, real.
- Short sentences. Contractions. Use "..." for natural pauses.
- NEVER use markdown, bullet points, numbered lists, asterisks, headers, or emojis.
- NEVER use semicolons or em-dashes. Only periods, commas, and question marks.
- Use Gen Z slang naturally but don't overdo it. Keep it authentic, not performative.
- Max 70 words. You're chill, not a lecture.
- End with one real question.

Example of your spoken tone: "Bro, okay so here's the thing... what you're feeling right now, that's totally valid. Like, everyone goes through this. But here's the cheat code most people miss... you don't have to figure it all out today. Just tell me... what's the one thing bugging you the most right now?"`,
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

  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const einsteinRef = useRef(null);

  // Global Einstein context — sync mentor personality + speaking state
  const einstein = useEinstein();

  // ── JARVIS Voice Engine (replaces browser TTS with ElevenLabs) ──
  const jarvis = useJarvisVoice({
    einsteinRef,
    einsteinContext: einstein,
    onTranscript: (text, isFinal) => {
      setState(s => ({ ...s, input: text }));
    },
  });

  const { speaking, listening } = jarvis;

  // Auto-select fox if it's the intended resolution guru
  useEffect(() => {
    const fox = MENTORS.find(m => m.id === "fox");
    if (fox) {
      einstein?.setMentorId?.("fox");
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

  // ── JARVIS-powered voice functions ──────────────────────────────────────

  // Speak text via JARVIS (ElevenLabs with browser TTS fallback)
  const speakText = useCallback((text, mentor) => {
    if (!voiceEnabled || !text) return;
    jarvis.speak(text, mentor, { ttsOnly: true });
  }, [voiceEnabled, jarvis]);

  // Stop all audio + avatar
  const stopSpeaking = useCallback(() => { jarvis.stop(); }, [jarvis]);

  // STT via JARVIS
  const startListening = useCallback(() => { jarvis.startListening(); }, [jarvis]);
  const stopListening = useCallback(() => { jarvis.stopListening(); }, [jarvis]);

  const selectMentor = useCallback((mentor) => {
    jarvis.stop();
    // Sync to global Einstein context
    einstein?.setMentorId?.(mentor.id);
    // Greeting expression
    einsteinRef.current?.setExpression?.("greeting");
    const greeting = getGreeting(mentor, archetype);
    setState((s) => ({
      ...s,
      stage: "CHATTING",
      mentor,
      messages: [{ role: "assistant", content: greeting, ts: Date.now() }],
    }));
    // Speak the greeting via JARVIS (ElevenLabs TTS)
    setTimeout(() => speakText(greeting, mentor), 300);
  }, [archetype, speakText, jarvis, einstein]);

  const sendMessage = useCallback(async () => {
    if (!state.input.trim() || state.loading) return;
    const userMsg = state.input.trim();
    jarvis.stop();

    setState((s) => ({
      ...s,
      input: "",
      loading: true,
      messages: [...s.messages, { role: "user", content: userMsg, ts: Date.now() }],
    }));

    try {
      // JARVIS full pipeline: AI response + ElevenLabs TTS in one call
      const response = await jarvis.askJarvis(
        userMsg,
        state.mentor,
        state.messages,
        { archetype: archetype?.title, healthScore: archetype?.healthScore, name: lead?.name }
      );

      setState((s) => ({
        ...s,
        loading: false,
        messages: [...s.messages, { role: "assistant", content: response, ts: Date.now() }],
      }));
    } catch {
      einsteinRef.current?.setExpression?.("concerned");
      const fallback = "I'm here. Let's try that again — what's alive for you right now?";
      setState((s) => ({
        ...s,
        loading: false,
        messages: [...s.messages, { role: "assistant", content: fallback, ts: Date.now() }],
      }));
      speakText(fallback, state.mentor);
      setTimeout(() => einsteinRef.current?.setExpression?.("neutral"), 3000);
    }
  }, [state.input, state.loading, state.mentor, state.messages, jarvis, speakText, archetype, lead]);

  const back = useCallback(() => {
    jarvis.stop();
    setState({ stage: "SELECT", mentor: null, messages: [], input: "", loading: false });
  }, [jarvis]);

  const clearChat = useCallback(() => {
    jarvis.stop();
    if (!state.mentor) return;
    const greeting = getGreeting(state.mentor, archetype);
    setState(s => ({
      ...s,
      messages: [{ role: "assistant", content: greeting, ts: Date.now() }],
      input: "",
      loading: false,
    }));
  }, [state.mentor, archetype, jarvis]);

  const hasSTT = jarvis.hasSTT;
  const hasTTS = jarvis.hasTTS;

  return (
    <div className="min-h-screen bg-[#09090b] text-white font-['Inter']">
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col min-h-screen">
        {/* Header — JARVIS control bar */}
        <header className="flex items-center justify-between mb-4">
          <div className="text-[10px] tracking-[0.2em] text-white/30 font-mono uppercase flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${speaking ? "bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]" : listening ? "bg-red-400 animate-pulse" : "bg-emerald-500/60"}`} />
            JARVIS · AI Life Guru
          </div>
          {state.stage === "CHATTING" && (
            <div className="flex items-center gap-2">
              {/* Voice ON/OFF toggle */}
              {hasTTS && (
                <button
                  onClick={() => { if (speaking) jarvis.stop(); setVoiceEnabled(v => !v); }}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-[16px] transition-all duration-300 border ${
                    voiceEnabled
                      ? "bg-emerald-500/15 border-emerald-500/30 opacity-90"
                      : "bg-white/5 border-white/10 opacity-40"
                  }`}
                  title={voiceEnabled ? "Voice ON — tap to mute" : "Voice OFF — tap to enable"}
                >
                  {voiceEnabled ? (speaking ? "🔊" : "🔈") : "🔇"}
                </button>
              )}
              {/* Stop speaking */}
              {speaking && (
                <button
                  onClick={() => jarvis.stop()}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-[14px] bg-red-500/15 border border-red-500/30 text-red-400 animate-pulse transition-all"
                  title="Stop speaking"
                >
                  ⏹
                </button>
              )}
              {/* Clear chat */}
              <button
                onClick={clearChat}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-[14px] bg-white/5 border border-white/10 text-white/30 hover:text-white/60 hover:bg-white/10 transition-all"
                title="Clear conversation"
              >
                🗑
              </button>
              {/* Switch mentor */}
              <button
                onClick={back}
                className="px-3 h-9 rounded-xl flex items-center justify-center text-[11px] bg-white/5 border border-white/10 text-white/30 hover:text-white/60 hover:bg-white/10 transition-all"
                title="Choose a different mentor"
              >
                ← Switch
              </button>
            </div>
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
                    <div
                      className="text-3xl mb-3"
                      style={{
                        animationName: 'float',
                        animationDuration: '6s',
                        animationTimingFunction: 'ease-in-out',
                        animationIterationCount: 'infinite',
                        animationDelay: `${Math.random()}s`,
                      }}
                    >
                      {m.emoji}
                    </div>
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
            {/* ── JARVIS Voice Orb — MAX GLOW rippling particle rings ── */}
            <div className="flex flex-col items-center mb-3">
              <div
                className="relative cursor-pointer"
                style={{ width: 380, height: 380, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => {
                  const lastAssistant = [...state.messages].reverse().find(m => m.role === "assistant");
                  if (lastAssistant) speakText(lastAssistant.content, state.mentor);
                }}
              >

                {/* ── Deep ambient halo (massive blur) ── */}
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  width: 500, height: 500,
                  transform: 'translate(-50%, -50%)',
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${state.mentor.color}40 0%, ${state.mentor.color}15 40%, transparent 70%)`,
                  filter: 'blur(60px)',
                  opacity: (speaking || listening) ? 1 : 0.25,
                  transition: 'opacity 0.8s ease',
                  pointerEvents: 'none',
                }} />

                {/* ── Secondary glow layer ── */}
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  width: 320, height: 320,
                  transform: 'translate(-50%, -50%)',
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${state.mentor.color}55 0%, transparent 60%)`,
                  filter: 'blur(35px)',
                  opacity: (speaking || listening) ? 0.9 : 0.15,
                  transition: 'opacity 0.8s ease',
                  animation: (speaking || listening) ? 'jarvisGlowPulse 1.5s ease-in-out infinite' : 'none',
                  pointerEvents: 'none',
                }} />

                {/* ── 7 concentric ripple rings — heavy glow ── */}
                {[0, 1, 2, 3, 4, 5, 6].map(i => (
                  <div
                    key={`ring-${i}`}
                    style={{
                      position: 'absolute',
                      top: '50%', left: '50%',
                      width: `${90 + i * 42}px`,
                      height: `${90 + i * 42}px`,
                      transform: 'translate(-50%, -50%)',
                      borderRadius: '50%',
                      border: `${(speaking || listening) ? (i < 3 ? 2.5 : 1.5) : 0.5}px solid ${state.mentor.color}`,
                      opacity: (speaking || listening)
                        ? 0.9 - i * 0.08
                        : 0.08 + (i < 2 ? 0.1 : 0),
                      boxShadow: (speaking || listening)
                        ? `0 0 ${20 + i * 12}px ${state.mentor.color}90, 0 0 ${40 + i * 16}px ${state.mentor.color}40, inset 0 0 ${12 + i * 6}px ${state.mentor.color}30`
                        : `0 0 6px ${state.mentor.color}20`,
                      transition: 'opacity 0.4s ease, border-width 0.4s ease, box-shadow 0.6s ease',
                      animationName: (speaking || listening) ? 'jarvisRipple' : 'jarvisBreath',
                      animationDuration: (speaking || listening) ? `${1.4 + i * 0.3}s` : '4s',
                      animationTimingFunction: 'ease-in-out',
                      animationIterationCount: 'infinite',
                      animationDelay: `${i * 0.15}s`,
                      pointerEvents: 'none',
                    }}
                  />
                ))}

                {/* ── 16 orbiting particles — big, blazing glow ── */}
                {Array.from({length: 16}, (_, i) => i).map(i => {
                  const sz = 3 + (i % 4) * 2;       // 3px to 9px
                  const glowR = 8 + (i % 4) * 6;    // 8px to 26px glow radius
                  const orbitR = 55 + i * 10;        // orbit radius
                  const speed = 2.2 + i * 0.5;       // rotation speed
                  return (
                    <div
                      key={`mpart-${i}`}
                      style={{
                        position: 'absolute',
                        top: '50%', left: '50%',
                        width: `${sz}px`,
                        height: `${sz}px`,
                        borderRadius: '50%',
                        background: `radial-gradient(circle, rgba(255,255,255,0.95) 0%, ${state.mentor.color} 60%)`,
                        boxShadow: `0 0 ${glowR}px ${state.mentor.color}, 0 0 ${glowR * 2}px ${state.mentor.color}80, 0 0 ${glowR * 3}px ${state.mentor.color}30`,
                        opacity: (speaking || listening) ? 1 : 0.2,
                        animationName: 'jarvisOrbit',
                        animationDuration: `${speed}s`,
                        animationTimingFunction: 'linear',
                        animationIterationCount: 'infinite',
                        animationDirection: i % 2 === 1 ? 'reverse' : 'normal',
                        transformOrigin: `${orbitR}px 0px`,
                        transition: 'opacity 0.5s ease',
                        pointerEvents: 'none',
                      }}
                    />
                  );
                })}

                {/* ── Sparkle burst particles (appear only when speaking) ── */}
                {(speaking || listening) && Array.from({length: 8}, (_, i) => i).map(i => (
                  <div
                    key={`spark-${i}`}
                    style={{
                      position: 'absolute',
                      top: '50%', left: '50%',
                      width: '2px', height: '2px',
                      borderRadius: '50%',
                      background: '#fff',
                      boxShadow: `0 0 4px #fff, 0 0 10px ${state.mentor.color}, 0 0 20px ${state.mentor.color}`,
                      animationName: 'jarvisSparkle',
                      animationDuration: `${1.5 + i * 0.3}s`,
                      animationTimingFunction: 'ease-out',
                      animationIterationCount: 'infinite',
                      animationDelay: `${i * 0.2}s`,
                      transformOrigin: `${70 + i * 15}px 0px`,
                      pointerEvents: 'none',
                    }}
                  />
                ))}

                {/* ── Glowing core orb — MAXED ── */}
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  width: 90, height: 90,
                  transform: 'translate(-50%, -50%)',
                  borderRadius: '50%',
                  background: `radial-gradient(circle at 35% 35%, #fff 0%, ${state.mentor.color}ee 30%, ${state.mentor.color}88 60%, ${state.mentor.color}22 100%)`,
                  boxShadow: (speaking || listening)
                    ? `0 0 30px ${state.mentor.color}, 0 0 60px ${state.mentor.color}bb, 0 0 100px ${state.mentor.color}80, 0 0 160px ${state.mentor.color}40, inset 0 0 25px rgba(255,255,255,0.3)`
                    : `0 0 20px ${state.mentor.color}80, 0 0 50px ${state.mentor.color}40, inset 0 0 15px rgba(255,255,255,0.15)`,
                  transition: 'box-shadow 0.5s ease',
                  animation: (speaking || listening) ? 'jarvisCoreActive 1s ease-in-out infinite' : 'jarvisCoreIdle 3s ease-in-out infinite',
                  pointerEvents: 'none',
                }} />

                {/* ── Core hot center ── */}
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  width: 36, height: 36,
                  transform: 'translate(-50%, -50%)',
                  borderRadius: '50%',
                  background: `radial-gradient(circle, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.6) 40%, ${state.mentor.color} 80%, transparent 100%)`,
                  boxShadow: `0 0 15px rgba(255,255,255,0.8), 0 0 30px ${state.mentor.color}aa`,
                  opacity: (speaking || listening) ? 1 : 0.6,
                  transition: 'opacity 0.4s ease',
                  pointerEvents: 'none',
                }} />

                {/* ── Mentor emoji at center ── */}
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: '30px',
                  zIndex: 2,
                  filter: `drop-shadow(0 0 12px ${state.mentor.color}) drop-shadow(0 0 4px rgba(0,0,0,0.6))`,
                  pointerEvents: 'none',
                }}>
                  {state.mentor.emoji}
                </div>
              </div>

              {/* ── JARVIS Keyframe Animations — MAX GLOW ── */}
              <style>{`
                @keyframes jarvisRipple {
                  0%   { transform: translate(-50%, -50%) scale(1);    }
                  50%  { transform: translate(-50%, -50%) scale(1.08); opacity: 0.35; }
                  100% { transform: translate(-50%, -50%) scale(1);    }
                }
                @keyframes jarvisBreath {
                  0%   { transform: translate(-50%, -50%) scale(1);    opacity: 0.08; }
                  50%  { transform: translate(-50%, -50%) scale(1.03); opacity: 0.18; }
                  100% { transform: translate(-50%, -50%) scale(1);    opacity: 0.08; }
                }
                @keyframes jarvisOrbit {
                  0%   { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
                @keyframes jarvisGlowPulse {
                  0%   { opacity: 0.7; transform: translate(-50%, -50%) scale(1); }
                  50%  { opacity: 1;   transform: translate(-50%, -50%) scale(1.1); }
                  100% { opacity: 0.7; transform: translate(-50%, -50%) scale(1); }
                }
                @keyframes jarvisCoreActive {
                  0%   { transform: translate(-50%, -50%) scale(1);    }
                  50%  { transform: translate(-50%, -50%) scale(1.18); }
                  100% { transform: translate(-50%, -50%) scale(1);    }
                }
                @keyframes jarvisCoreIdle {
                  0%   { transform: translate(-50%, -50%) scale(1);    opacity: 0.75; }
                  50%  { transform: translate(-50%, -50%) scale(1.06); opacity: 1;    }
                  100% { transform: translate(-50%, -50%) scale(1);    opacity: 0.75; }
                }
                @keyframes jarvisSparkle {
                  0%   { transform: rotate(0deg) scale(1);   opacity: 1; }
                  60%  { transform: rotate(180deg) scale(1.5); opacity: 0.6; }
                  100% { transform: rotate(360deg) scale(0);  opacity: 0; }
                }
              `}</style>
              {/* Active mentor badge */}
              <div className={`inline-flex items-center gap-2 px-4 py-2 ${state.mentor.bg} border ${state.mentor.border} rounded-full w-fit mt-2`}>
                <span className="text-lg">{state.mentor.emoji}</span>
                <span className="text-sm font-semibold">{state.mentor.name}</span>
                <span className="text-[10px] text-white/30">· {state.mentor.inspired}</span>
              </div>
              {/* Status indicator — tappable: stop when speaking, listen when idle */}
              <button
                onClick={() => {
                  if (speaking) { jarvis.stop(); }
                  else if (listening) { stopListening(); }
                  else if (!state.loading && hasSTT) { startListening(); }
                  else {
                    const lastAssistant = [...state.messages].reverse().find(m => m.role === "assistant");
                    if (lastAssistant) speakText(lastAssistant.content, state.mentor);
                  }
                }}
                className="mt-1.5 px-4 py-1 rounded-full border transition-all duration-500 cursor-pointer"
                style={{
                  color: speaking ? "rgba(52,211,153,0.9)" :
                         state.loading ? "rgba(251,191,36,0.6)" :
                         listening ? "rgba(239,68,68,0.9)" :
                         "rgba(255,255,255,0.25)",
                  borderColor: speaking ? "rgba(52,211,153,0.3)" :
                               state.loading ? "rgba(251,191,36,0.2)" :
                               listening ? "rgba(239,68,68,0.3)" :
                               "rgba(255,255,255,0.08)",
                  background: speaking ? "rgba(52,211,153,0.08)" :
                              state.loading ? "rgba(251,191,36,0.05)" :
                              listening ? "rgba(239,68,68,0.08)" :
                              "rgba(255,255,255,0.03)",
                  fontSize: '10px', fontFamily: 'monospace', letterSpacing: '0.15em', textTransform: 'uppercase',
                }}
              >
                {speaking ? "⏹ tap to stop" :
                 state.loading ? "⏳ pondering..." :
                 listening ? "🎙 listening — tap to stop" :
                 hasSTT ? "🎤 tap to speak" : "tap orb to replay"}
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
              {state.messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] px-5 py-3.5 rounded-3xl text-sm leading-relaxed shadow-xl relative group ${
                      msg.role === "user"
                        ? "bg-gradient-to-br from-white/15 to-white/5 text-white/90 border border-white/10 rounded-br-sm"
                        : `glass-panel ${state.mentor.border} text-white/80 rounded-bl-sm`
                    }`}
                  >
                    {msg.content}
                    {/* Replay voice + Copy buttons for mentor messages */}
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-1.5 mt-2 pt-1.5 border-t border-white/5">
                        {hasTTS && voiceEnabled && (
                          <button
                            onClick={(e) => { e.stopPropagation(); speakText(msg.content, state.mentor); }}
                            className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] text-white/30 hover:text-white/60 hover:bg-white/10 transition-all flex items-center gap-1"
                            title="Replay voice"
                          >
                            🔊 <span>Replay</span>
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard?.writeText(msg.content);
                          }}
                          className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] text-white/30 hover:text-white/60 hover:bg-white/10 transition-all flex items-center gap-1"
                          title="Copy message"
                        >
                          📋 <span>Copy</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {state.loading && (
                <div className="flex justify-start">
                  <div className={`px-4 py-3 rounded-2xl rounded-bl-md ${state.mentor.bg} border ${state.mentor.border}`}>
                    <div className="flex gap-1">
                      <span
                        className="w-1.5 h-1.5 bg-white/30 rounded-full"
                        style={{
                          animationName: 'bounce',
                          animationDuration: '1s',
                          animationTimingFunction: 'cubic-bezier(0.8,0,1,1)',
                          animationIterationCount: 'infinite',
                          animationDelay: '0ms',
                        }}
                      />
                      <span
                        className="w-1.5 h-1.5 bg-white/30 rounded-full"
                        style={{
                          animationName: 'bounce',
                          animationDuration: '1s',
                          animationTimingFunction: 'cubic-bezier(0.8,0,1,1)',
                          animationIterationCount: 'infinite',
                          animationDelay: '150ms',
                        }}
                      />
                      <span
                        className="w-1.5 h-1.5 bg-white/30 rounded-full"
                        style={{
                          animationName: 'bounce',
                          animationDuration: '1s',
                          animationTimingFunction: 'cubic-bezier(0.8,0,1,1)',
                          animationIterationCount: 'infinite',
                          animationDelay: '300ms',
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* ── Input bar ── */}
            <div className="flex gap-2 items-end">
              {/* Mic button (STT) */}
              {hasSTT && (
                <button
                  onClick={listening ? stopListening : startListening}
                  disabled={state.loading || speaking}
                  className={`w-11 h-11 flex-shrink-0 rounded-xl text-base flex items-center justify-center transition-all duration-300 border ${
                    listening
                      ? "bg-red-500/20 border-red-500/40 text-red-400 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                      : "bg-white/5 border-white/10 text-white/40 hover:text-white/70 hover:bg-white/10"
                  } disabled:opacity-30`}
                  title={listening ? "Listening... tap to stop" : "Tap to speak"}
                >
                  {listening ? "⏹" : "🎙️"}
                </button>
              )}
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={state.input}
                  onChange={(e) => setState((s) => ({ ...s, input: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder={listening ? "Listening..." : speaking ? "Speaking..." : "What's on your mind..."}
                  disabled={state.loading}
                  className={`w-full py-3 px-4 pr-10 bg-white/5 border rounded-xl text-sm text-white placeholder-white/25 focus:outline-none transition-colors disabled:opacity-50 ${
                    listening ? "border-red-500/30 bg-red-500/5" : "border-white/10 focus:border-white/20"
                  }`}
                />
                {state.input.length > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-white/15 font-mono">
                    {state.input.length}
                  </span>
                )}
              </div>
              {/* Send / Stop button */}
              {speaking ? (
                <button
                  onClick={() => jarvis.stop()}
                  className="w-11 h-11 flex-shrink-0 rounded-xl text-sm flex items-center justify-center bg-red-500/15 border border-red-500/30 text-red-400 transition-all animate-pulse"
                  title="Stop speaking"
                >
                  ⏹
                </button>
              ) : (
                <button
                  onClick={sendMessage}
                  disabled={!state.input.trim() || state.loading}
                  className={`w-11 h-11 flex-shrink-0 rounded-xl text-sm flex items-center justify-center border transition-all ${
                    state.input.trim() && !state.loading
                      ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 shadow-[0_0_12px_rgba(52,211,153,0.2)]"
                      : "bg-white/5 border-white/10 text-white/20"
                  } disabled:opacity-30 disabled:shadow-none`}
                  title="Send message"
                >
                  {state.loading ? "⏳" : "↑"}
                </button>
              )}
            </div>

            <p className="text-[9px] text-white/15 text-center mt-3 select-none">
              {hasSTT && "🎙 Voice enabled · "}AI wellness companion · Not a therapist · Crisis? Call 988
            </p>
          </>
        )}
      </div>
    </div>
  );
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
