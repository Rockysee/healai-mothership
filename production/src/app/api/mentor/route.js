/**
 * AI MENTOR — Next.js App Router API Route
 * src/app/api/mentor/route.js
 *
 * Handles the 5 personality-driven mentor personas:
 *   The Mirror (ontological), The Sage (spiritual), The Catalyst (peak),
 *   The Body (somatic), Gen-AI Fox (conscious resolution)
 *
 * Called by: AIMentorChat.jsx → callMentorAI()
 * Requires: ANTHROPIC_API_KEY in .env.local
 */

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// ── POST handler ─────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      mentorId,
      systemPrompt,
      message,
      history = [],
      userMetadata = {},
    } = body;

    if (!message) {
      return Response.json({ error: "No message provided" }, { status: 400 });
    }

    if (!ANTHROPIC_API_KEY) {
      // Fallback when no API key — return a canned response
      return Response.json({
        response: generateFallbackResponse(mentorId, message),
      });
    }

    // Build messages array for Anthropic API
    // history comes as [{ role, content }] from last 6 messages
    const anthropicMessages = [
      ...history.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    // Use Haiku for fast, cost-effective mentor responses
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        system: systemPrompt || buildDefaultSystemPrompt(mentorId),
        messages: anthropicMessages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Anthropic API error ${response.status}:`, errText);
      // Return fallback instead of throwing
      return Response.json({
        response: generateFallbackResponse(mentorId, message),
      });
    }

    const data = await response.json();
    const text =
      data.content?.[0]?.text ||
      "I'm present with you. Take a breath, and share what's real for you right now.";

    return Response.json({ response: text });
  } catch (err) {
    console.error("AI MENTOR error:", err);
    return Response.json(
      { response: "I'm here. Let's try that again — what's alive for you right now?" },
    );
  }
}

// ── Fallback responses when API is unavailable ──────────────────────────
function generateFallbackResponse(mentorId, message) {
  const kw = (message || "").toLowerCase();

  const fallbacks = {
    ontological:
      "That's a story. I'm not interested in the story — I'm interested in who you're being inside of it. What would open up if you let that narrative go?",
    spiritual:
      "Take one slow breath with me. In for four... hold for four... release for six. Now — from this place of stillness — what does your body want you to know?",
    peak:
      "I hear you. Now here's what I need from you: one action. Not a plan. Not a strategy. One physical action you can take in the next 60 seconds. What is it?",
    somatic:
      "Before we go further — notice your body right now. Where is the tightest spot? Your jaw? Your chest? Your shoulders? Don't fix it. Just notice. That sensation is information.",
    fox:
      "Yo, I see you. No cap — that's real talk right there. Let's not just think about it though, let's resolve it. What's the ONE thing that would change everything if you handled it today?",
  };

  return (
    fallbacks[mentorId] ||
    "I'm present with you. Take a breath, and share what's real for you right now."
  );
}

// ── Default system prompts (backup if component doesn't send one) ───────
function buildDefaultSystemPrompt(mentorId) {
  const prompts = {
    ontological: `You are 'The Mirror' — an ontological coach. Direct, zero-comfort-zone, distinction-based. You reveal hidden assumptions. You ask questions that dismantle the listener's filters. Short, punchy sentences. Ruthlessly compassionate. Max 120 words.`,
    spiritual: `You are 'The Sage' — a radical wellbeing guide. You bridge Vedantic philosophy, Ayurvedic wisdom, and quantum biology. Warm and deep. You offer breathing techniques and perspective shifts. Never preach. Always illuminate. Max 120 words.`,
    peak: `You are 'The Catalyst' — a peak performance strategist. State dictates outcome. You use pattern interrupts, reframing, and physiology-first interventions. Bold, energetic, impossible to ignore. Push for immediate action. Max 120 words.`,
    somatic: `You are 'The Body' — a somatic intelligence guide. The body knows before the mind. Start with what the person physically feels. Offer breathwork, body scans, grounding exercises. Reference polyvagal theory simply. Max 120 words.`,
    fox: `You are 'Gen-AI Fox' — the AI wellbeing companion. Warm, sharp, no-BS. Light GenZ language naturally. Short, punchy replies. Always end with a question or clear next action. Max 100 words.`,
  };

  return prompts[mentorId] || prompts.fox;
}
