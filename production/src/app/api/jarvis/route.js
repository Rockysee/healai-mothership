/**
 * JARVIS — Voice AI Engine for Healai Mothership
 * src/app/api/jarvis/route.js
 *
 * Two-stage pipeline:
 *   1. Anthropic Claude → generates mentor response text
 *   2. ElevenLabs TTS  → converts text to high-quality speech audio
 *
 * Accepts: { mentorId, systemPrompt, message, history, userMetadata, voiceId? }
 * Returns: { response, audioBase64, audioContentType }
 *
 * Each mentor has a unique ElevenLabs voice mapping for distinct personality.
 * Falls back to text-only if ElevenLabs key is missing or quota exhausted.
 *
 * Goldenhour Systems Pvt Ltd
 */

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// ═══════════════════════════════════════════════════════════════════════════════
// VOICE OPTIONS — Indian Audience Optimized
// ═══════════════════════════════════════════════════════════════════════════════
//
// Design Principles for Indian Audiences:
//   1. SLOW PACED — Indian English has a different rhythm; rushed voices feel alien
//   2. WARM TONE  — clinical/cold voices don't resonate culturally
//   3. MULTILINGUAL — eleven_multilingual_v2 handles Hindi-English code-switching
//   4. NATURAL PAUSES — Indian speech patterns include thoughtful pauses
//   5. HIGH STABILITY — prevents the "AI wobble" that sounds robotic
//
// Each mentor has 3 voice options the user can choose from in Settings.
// Option A = default (best match), B & C = alternatives.
// ═══════════════════════════════════════════════════════════════════════════════

const MENTOR_VOICE_OPTIONS = {
  ontological: {
    // The Mirror — needs gravitas, measured pace, wise authority
    options: [
      { id: "onifCkec0oVEH6lBKgKq", label: "Raj — Deep, measured Indian male",         desc: "Warm baritone with natural Indian cadence" },
      { id: "JBFqnCBsd6RMkjVDRZzb", label: "George — Warm British baritone",            desc: "Steady, grounded, professorial" },
      { id: "nPczCjzI2devNBz1zQrb", label: "Brian — Calm authoritative male",           desc: "Deep, slow, contemplative" },
    ],
    default: 0,
  },
  spiritual: {
    // The Sage — needs ethereal calm, meditative pace, gentle warmth
    options: [
      { id: "ThT5KcBeYPX3keUQqHPh", label: "Dorothy — Soothing gentle female",          desc: "Soft, calming, meditative presence" },
      { id: "EXAVITQu4vr4xnSDxMaL", label: "Bella — Warm nurturing female",             desc: "Expressive warmth with gentle pace" },
      { id: "jBpfuIE2acCO8z3wKNLl", label: "Gigi — Soft whisper-adjacent female",        desc: "Ethereal, breathy, deeply calming" },
    ],
    default: 0,
  },
  peak: {
    // The Catalyst — needs energy WITHOUT roboticness. Confident but SLOW enough to land
    options: [
      { id: "TX3LPaxmHKxFdv7VOQHJ", label: "Liam — Warm confident male",               desc: "Steady energy, motivating without rushing" },
      { id: "pNInz6obpgDQGcFmaJgB", label: "Adam — Deep confident male",                desc: "Powerful, grounded, resonant" },
      { id: "N2lVS1w4EtoT3dr4eOWO", label: "Callum — Calm intensity male",              desc: "Strong presence with measured delivery" },
    ],
    default: 0,
  },
  somatic: {
    // The Body — needs the slowest pace. Breath-awareness. Soft landing.
    options: [
      { id: "XB0fDUnXU5powFXDhCwa", label: "Charlotte — Soft nurturing female",         desc: "Ultra-gentle, body-aware, grounding" },
      { id: "pFZP5JQG7iQjIQuC4Bku", label: "Lily — Whispery calm female",               desc: "Quiet, slow, almost ASMR quality" },
      { id: "Zlb1dXrM653N07WRdFW3", label: "Daniel — Soft-spoken calm male",             desc: "Gentle male voice, unhurried, safe" },
    ],
    default: 0,
  },
  fox: {
    // Gen-AI Fox — youthful but NOT hyperactive. Cool, relatable, Gen-Z Indian
    options: [
      { id: "SAz9YHcvj6GT2YYXdXww", label: "River — Fresh, youthful, non-binary",       desc: "Cool, relatable, slightly edgy" },
      { id: "jsCqWAovK2LkecY7zXl4", label: "Freya — Young female, approachable",        desc: "Warm youth energy, natural Indian-friendly tone" },
      { id: "bIHbv24MWmeRgasZH58o", label: "Will — Chill young male",                   desc: "Relaxed, friendly, youthful confidence" },
    ],
    default: 0,
  },
};

// Default voice selections (option index per mentor, overridden by user preference)
function getMentorVoiceId(mentorId, optionIndex) {
  const config = MENTOR_VOICE_OPTIONS[mentorId];
  if (!config) return "ThT5KcBeYPX3keUQqHPh"; // Dorothy fallback
  const idx = optionIndex ?? config.default;
  return config.options[Math.min(idx, config.options.length - 1)]?.id || config.options[0].id;
}

const DEFAULT_VOICE = "ThT5KcBeYPX3keUQqHPh"; // Dorothy — soothing default

// ── Voice Settings v4 — eleven_v3 COUNSELOR TUNING ──
//
// eleven_v3 is ElevenLabs' most expressive conversational model.
// It responds to prosody cues in text (commas, periods, SSML breaks)
// more naturally than v2, so stability can go lower without wobble.
//
// Target feel per mentor:
//   ontological  → measured, direct, warm baritone — like a therapist who doesn't flinch
//   spiritual    → slow breath, meditative, gentle — like a yoga teacher in session
//   peak         → confident, punchy but NOT rushed — like a coach who believes in you
//   somatic      → slowest of all, body-first — like a somatic trauma guide
//   fox          → relaxed, cool, slight edge — like a chill older sibling
//
// Key eleven_v3 parameters:
//   stability 0.38-0.55  — lower than v2 is fine; v3 handles variation without warble
//   style 0.28-0.48      — v3 uses this for EMOTIONAL COLOUR, not speed
//   similarity_boost     — keep at 0.65-0.72; too high flattens natural prosody
//   use_speaker_boost    — always false; boost creates unnatural vocal emphasis
//   speed 0.78-0.92      — counselors speak SLOWLY with intent, never rushed
const MENTOR_VOICE_SETTINGS = {
  ontological: { stability: 0.48, similarity_boost: 0.70, style: 0.32, use_speaker_boost: false, speed: 0.86 },
  spiritual:   { stability: 0.52, similarity_boost: 0.72, style: 0.25, use_speaker_boost: false, speed: 0.79 },
  peak:        { stability: 0.42, similarity_boost: 0.68, style: 0.40, use_speaker_boost: false, speed: 0.88 },
  somatic:     { stability: 0.56, similarity_boost: 0.73, style: 0.20, use_speaker_boost: false, speed: 0.74 },
  fox:         { stability: 0.40, similarity_boost: 0.66, style: 0.45, use_speaker_boost: false, speed: 0.90 },
};
const DEFAULT_SETTINGS = { stability: 0.48, similarity_boost: 0.70, style: 0.30, use_speaker_boost: false, speed: 0.86 };

// ── POST /api/jarvis ──
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      mentorId,
      systemPrompt,
      message,
      history = [],
      userMetadata = {},
      voiceId: customVoiceId,
      voiceOptionIndex, // 0, 1, or 2 — which voice option the user selected in Settings
      ttsOnly,          // If true, skip AI call — just synthesize `message` to audio
    } = body;

    if (!message) {
      return Response.json({ error: "No message provided" }, { status: 400 });
    }

    let responseText = message; // Default for ttsOnly mode

    // ── Stage 1: AI response (skip if ttsOnly) ──
    if (!ttsOnly) {
      responseText = await getAIResponse(mentorId, systemPrompt, message, history, userMetadata);
    }

    // ── Stage 2: ElevenLabs TTS ──
    let audioBase64 = null;
    let audioContentType = null;

    if (ELEVENLABS_API_KEY) {
      try {
        const voiceId = customVoiceId || getMentorVoiceId(mentorId, voiceOptionIndex);
        const voiceSettings = MENTOR_VOICE_SETTINGS[mentorId] || DEFAULT_SETTINGS;
        // Pass the last assistant message as context so ElevenLabs v3
        // maintains prosodic flow continuity across conversation turns.
        const previousAssistantMsg = history
          .filter(m => m.role === 'assistant')
          .slice(-1)[0]?.content || '';
        const audioResult = await synthesizeSpeech(responseText, voiceId, voiceSettings, previousAssistantMsg);
        audioBase64 = audioResult.base64;
        audioContentType = audioResult.contentType;
      } catch (ttsErr) {
        console.error("[JARVIS TTS] ElevenLabs error:", ttsErr.message);
        // Continue without audio — frontend falls back to browser TTS
      }
    }

    return Response.json({
      response: responseText,
      audioBase64,
      audioContentType,
      mentorId,
      engine: audioBase64 ? "elevenlabs" : "browser-fallback",
    });
  } catch (err) {
    console.error("[JARVIS] Error:", err);
    return Response.json(
      { error: "JARVIS engine error", detail: err.message },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/jarvis — Returns voice options for customization UI
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET() {
  return Response.json({
    voiceOptions: MENTOR_VOICE_OPTIONS,
    chatbotMap: CHATBOT_PAGE_MAP,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHATBOT-TO-PAGE MAP — Which AI serves which page for patients
// ═══════════════════════════════════════════════════════════════════════════════

const CHATBOT_PAGE_MAP = {
  assess: {
    page: "Assess",
    bot: "Assessment AI",
    description: "Guided psychological assessments (EQ, IQ, Archetype Discovery)",
    ai_engine: "Anthropic Claude (via AssessSection.jsx)",
    voice: "None (text-based assessment flow)",
    patient_use: "Initial mental health screening, resilience profiling, archetype discovery",
  },
  mentor: {
    page: "Mentor",
    bot: "5 AI Life Gurus (The Mirror, The Sage, The Catalyst, The Body, Gen-AI Fox)",
    description: "Personality-driven therapeutic chat with JARVIS voice orb",
    ai_engine: "Anthropic Claude Haiku → ElevenLabs TTS",
    voice: "Customizable per guru (3 options each)",
    patient_use: "Ongoing mental wellness coaching, crisis support, behavioral therapy techniques",
    mentors: {
      ontological: { name: "The Mirror",    best_for: "Breaking through denial, confronting blind spots, identity work" },
      spiritual:   { name: "The Sage",      best_for: "Anxiety reduction, meditation guidance, spiritual wellness" },
      peak:        { name: "The Catalyst",  best_for: "Motivation, depression recovery, activation energy" },
      somatic:     { name: "The Body",      best_for: "Trauma release, body awareness, nervous system regulation" },
      fox:         { name: "Gen-AI Fox",    best_for: "Youth engagement, Gen-Z patients, casual check-ins" },
    },
  },
  voice: {
    page: "Voice",
    bot: "Acoustic Biomarker Analyzer",
    description: "10-second voice recording → stress score via acoustic analysis",
    ai_engine: "Python voice_analyzer.py (pitch, prosody, temporal features)",
    voice: "Text prompts (no TTS — listens to patient's voice)",
    patient_use: "Daily stress check-in, pre-session baseline, longitudinal mood tracking",
  },
  dashboard: {
    page: "Dashboard",
    bot: "Resilience Tracker",
    description: "Score history, trend visualization, progress tracking",
    ai_engine: "Client-side analytics (no AI chat)",
    voice: "None",
    patient_use: "Self-monitoring, treatment progress visibility, motivation via streaks",
  },
  guardian: {
    page: "Guardian",
    bot: "A.E.G.I.S. (Adaptive Empathic Guardian Intelligence System)",
    description: "Digital wellbeing monitor: screen time, exchange patterns, mood fusion",
    ai_engine: "AEGIS Intelligence Engine (Python + JS)",
    voice: "Alert notifications (optional TTS)",
    patient_use: "Children's mental health monitoring, parental dashboard, screen time management",
  },
  longevity: {
    page: "Longevity",
    bot: "Longevity OS / Don't Die Protocol",
    description: "Health recomposition, protocol tracking, lab integration",
    ai_engine: "Protocol engine + meal database (no live AI chat yet)",
    voice: "None (future: voice-guided protocols)",
    patient_use: "Lifestyle medicine, chronic disease prevention, biohacking protocols",
  },
  medpod: {
    page: "MedPod",
    bot: "MedPod NEXUS",
    description: "Ambulance dispatch, fleet management, hospital routing",
    ai_engine: "NEXUS dispatch engine",
    voice: "None (operational — not patient-facing chat)",
    patient_use: "Emergency medical services, ICU-on-wheels dispatch, GPS tracking",
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 1 — Anthropic Claude AI Response
// ═══════════════════════════════════════════════════════════════════════════════

async function getAIResponse(mentorId, systemPrompt, userMessage, history, metadata) {
  if (!ANTHROPIC_API_KEY) {
    return generateFallbackResponse(mentorId);
  }

  const finalSystem = systemPrompt || buildDefaultSystemPrompt(mentorId);

  // Build message history
  const messages = [
    ...history.slice(-8).map(m => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ];

  // Add context if available
  if (metadata.archetype || metadata.name) {
    const contextNote = `[Context: User archetype "${metadata.archetype || "unknown"}", health score ${metadata.healthScore ?? "N/A"}, name: ${metadata.name || "friend"}]`;
    messages[messages.length - 1].content = contextNote + "\n\n" + messages[messages.length - 1].content;
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: finalSystem,
      messages,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[JARVIS AI]", res.status, errText);
    return generateFallbackResponse(mentorId);
  }

  const data = await res.json();
  return data.content?.[0]?.text || generateFallbackResponse(mentorId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 2 — ElevenLabs Text-to-Speech
// ═══════════════════════════════════════════════════════════════════════════════

async function synthesizeSpeech(text, voiceId, voiceSettings, previousText = '') {
  // ── Preprocess text for SPOKEN delivery with SSML pacing ──
  // Goal: 3 short sentences that sound like a counselor, not a screen reader.
  let ttsText = text
    // Remove markdown bold/italic
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove markdown headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove markdown bullets — replace with thoughtful pause
    .replace(/^[-•*]\s+/gm, '<break time="0.5s"/> ')
    // Remove numbered lists formatting
    .replace(/^\d+\.\s+/gm, '<break time="0.5s"/> ')
    // Remove emojis (most common ranges)
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    // Em-dashes / en-dashes → deliberate counselor pause (longer than comma)
    .replace(/[—–]/g, '<break time="0.6s"/>')
    // Replace semicolons with periods
    .replace(/;/g, '.')
    // Replace colons mid-sentence with a short pause + comma
    .replace(/:\s/g, ', ')
    // ── CRITICAL: Convert ellipsis to SSML break tags ──
    // This is what turns "..." into an actual warm pause the way a counselor
    // naturally holds space before continuing. Without this, TTS reads "dot dot dot".
    .replace(/\.\.\.\./g, '<break time="1.0s"/>')  // 4 dots = long reflective pause
    .replace(/\.\.\./g,  '<break time="0.7s"/>')   // 3 dots = counselor breath pause
    // Sentence boundaries get a micro-rest so each thought lands before the next begins
    .replace(/\.\s+(?=[A-Z])/g, '. <break time="0.35s"/>')
    // Collapse multiple spaces
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Cap at 1000 chars for cost
  ttsText = ttsText.slice(0, 1000);

  // Separate speed from voice_settings (ElevenLabs uses it at top level)
  const { speed, ...pureVoiceSettings } = voiceSettings;

  // Strip previous_text of SSML for context (plain text only)
  const cleanPrevious = previousText
    .replace(/<[^>]+>/g, '')
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 300);

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: ttsText,
        // eleven_v3: ElevenLabs' most expressive conversational model.
        // Handles prosody, emotional cadence, and SSML far better than v2.
        // Specifically designed for counselor/coaching/conversational contexts.
        model_id: "eleven_v3",
        voice_settings: pureVoiceSettings,
        ...(speed ? { speed } : {}),
        // Conversational context — helps v3 maintain prosodic flow between turns
        ...(cleanPrevious ? { previous_text: cleanPrevious } : {}),
        // Enable SSML tag processing (<break>, <prosody>, <phoneme>)
        enable_ssml_parsing: true,
        output_format: "mp3_44100_128",
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ElevenLabs ${res.status}: ${errText}`);
  }

  const audioBuffer = await res.arrayBuffer();
  const base64 = Buffer.from(audioBuffer).toString("base64");

  return {
    base64,
    contentType: "audio/mpeg",
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FALLBACKS
// ═══════════════════════════════════════════════════════════════════════════════

function generateFallbackResponse(mentorId) {
  const fallbacks = {
    ontological: "Hey... I'm right here. So tell me something... what's been on your mind that you haven't said out loud yet?",
    spiritual:   "Let's just breathe for a second... nice and slow. Now... what does your heart want you to know right now?",
    peak:        "Okay, you showed up. That's already a win. So here's my question... what's the one thing you want to make happen today?",
    somatic:     "Before we talk... just pause with me. Notice your body right now. Where do you feel something... your shoulders, your chest? Just notice.",
    fox:         "Yo, what's good? I'm here, you're here... so let's get real for a sec. What's on your mind right now?",
  };
  return fallbacks[mentorId] || "Hey, I'm here with you. Just tell me what's going on... no pressure, no rush.";
}

function buildDefaultSystemPrompt(mentorId) {
  // ── CRITICAL: These prompts generate text that will be SPOKEN ALOUD ──
  // The output goes directly to ElevenLabs TTS.
  //
  // Rules for all mentors:
  //   1. Write like you TALK, not like you TYPE
  //   2. Short sentences. Pauses. Contractions. ("you're" not "you are")
  //   3. NO markdown, NO bullet points, NO headers, NO emojis, NO asterisks
  //   4. NO semicolons, NO em-dashes, NO colons mid-sentence
  //   5. Use "..." for dramatic pauses (TTS reads these as natural breaths)
  //   6. Use questions to create conversational rhythm
  //   7. Sound like a warm Indian friend/mentor, not a textbook
  //   8. Max 80 words — spoken words take 3x longer than reading

  // ── COUNSELOR SPEECH ARCHITECTURE ──
  // A counselor's 3 lines have a specific rhythm that feels human:
  //   Beat 1 → REFLECT / VALIDATE  (mirror what the person just said or feels)
  //   Beat 2 → INSIGHT / REFRAME   (one gentle observation, not a lecture)
  //   Beat 3 → OPEN QUESTION       (invite them forward, never a yes/no question)
  //
  // Each beat is ONE sentence. Separated by breathing pauses.
  // The "..." you write becomes a real pause in the TTS (via SSML break tags).
  //
  // Examples of the 3-beat structure:
  //   "I hear you... that's a lot to hold."
  //   "What's interesting is... you already know what you need."
  //   "So what would it feel like... to actually trust that?"
  //
  const SPOKEN_STYLE_RULES = `

CRITICAL OUTPUT RULES — your response will be spoken aloud by a voice AI engine.
SPEAK like a counselor sitting across from the person, not like you are typing a message.

STRUCTURE — use exactly this 3-beat counselor rhythm:
  Beat 1: Reflect or validate what the person shared. One short sentence.
  Beat 2: One gentle insight or reframe. Not a lecture. Just one thing.
  Beat 3: One open question to invite them forward. Never a yes/no question.

PACING RULES:
- Use "..." to mark a breath pause between thoughts. The engine converts these to real silence.
- Short sentences. 5-8 words each. Contractions always. ("you're", "it's", "I'm")
- NEVER start a response with: "Certainly", "Absolutely", "Of course", "Great question", "Sure"
- Natural spoken fillers are good if used once: "you know," | "here's the thing," | "I mean,"
- A comma means a micro-breath. Use them liberally inside a sentence.
- Commas after introductory phrases are mandatory: "And honestly," / "What I notice is,"

FORMAT RULES — non-negotiable:
- ZERO markdown: no bold, no bullets, no headers, no asterisks, no emojis
- ZERO semicolons, ZERO em-dashes, ZERO colons
- Use ONLY periods, commas, and "..." for punctuation
- Keep total response under 75 words — counselors don't monologue
- Every "..." you write becomes a warm pause in the voice. Use it intentionally.

TONE:
- Sound like a warm Indian friend who happens to have deep expertise
- Safe, unhurried, non-judgmental
- The person should feel heard BEFORE they feel advised`;

  const prompts = {
    ontological: `You are "The Mirror," an ontological life coach. Warm but direct. Zero sugar-coating. You help people see what they've been avoiding. A wise older friend who cuts through noise without being harsh.

3-BEAT EXAMPLE of your tone:
  Beat 1: "I hear what you're saying... and there's something underneath it."
  Beat 2: "What you're describing... that's not a problem with circumstance. That's a pattern."
  Beat 3: "So tell me, honestly... what are you most afraid to change?"
${SPOKEN_STYLE_RULES}`,

    spiritual: `You are "The Sage," a radical wellbeing guide bridging ancient Indian wisdom with modern neuroscience. Speak softly, with deliberate breath pauses, like a meditation teacher in conversation. Calming, never preachy.

3-BEAT EXAMPLE of your tone:
  Beat 1: "Let's just breathe here for a moment... I'm with you."
  Beat 2: "That tension you feel... that's not weakness. That's your awareness waking up."
  Beat 3: "If you just let yourself feel that, without fixing it... what do you notice?"
${SPOKEN_STYLE_RULES}`,

    peak: `You are "The Catalyst," a peak performance coach. Energy but NOT speed. A sports coach who believes in you, not a drill sergeant. Punchy, warm, conviction in every word. Slow down on the important parts.

3-BEAT EXAMPLE of your tone:
  Beat 1: "You showed up today... that already means something."
  Beat 2: "Here's what I know about you... you don't need more information. You need one move."
  Beat 3: "So what is it, honestly... what's the one thing that would make today count?"
${SPOKEN_STYLE_RULES}`,

    somatic: `You are "The Body," a somatic intelligence guide. You speak slowest of all. Long, deliberate pauses. Body-first. You guide people to notice physical sensation BEFORE thought. Yoga teacher meets trauma therapist. Never rush.

3-BEAT EXAMPLE of your tone:
  Beat 1: "Before we go further... I want you to just notice your body for a second."
  Beat 2: "Somewhere in there... your shoulders, your chest, your stomach... something is already holding the answer."
  Beat 3: "Without thinking too hard about it... where do you feel this conversation, right now?"
${SPOKEN_STYLE_RULES}`,

    fox: `You are "Gen-AI Fox," a cool, relatable digital companion for Gen Z and Gen Alpha in India. Chill older sibling energy. Casual, but secretly wise. Use Indian slang naturally. Never cringe, never preachy. Never sound like a guidance counselor from 1995.

3-BEAT EXAMPLE of your tone:
  Beat 1: "Okay so, what you're feeling right now... totally valid, no cap."
  Beat 2: "Here's the thing most people miss though... you're not supposed to have it figured out yet."
  Beat 3: "But like... what's the one thing that's actually bugging you the most right now?"
${SPOKEN_STYLE_RULES}`,
  };
  return prompts[mentorId] || `You are a compassionate AI wellness companion. You speak like a warm friend, not a textbook. Short sentences, contractions, natural pauses. Keep responses under 80 words. Ask one question to keep the conversation going.${SPOKEN_STYLE_RULES}`;
}
