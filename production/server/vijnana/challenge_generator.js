/**
 * Vijnana Challenge Generator
 *
 * Generates anime-framed ICSE science challenges via Claude.
 * Maps viral pop-culture trends (Solo Leveling, Demon Slayer, Naruto, JJK, One Piece)
 * to ICSE Class 10 Chemistry / Physics / Biology concepts.
 *
 * Equivalent of the Genkit generateChallenge flow — raw Claude fetch, no framework.
 *
 * POST /api/quickquest/challenge
 *   body: { difficulty: "easy"|"medium"|"hard", topic?: string, trend?: string }
 *   returns: { challenge, answer, concept, trendReference, type, hint, rank, xp }
 */

import fetch from "node-fetch";

const TRENDS = [
  "Solo Leveling",
  "Demon Slayer",
  "Jujutsu Kaisen",
  "Naruto",
  "One Piece",
  "Attack on Titan",
  "Dragon Ball Z",
  "My Hero Academia",
  "Fullmetal Alchemist Brotherhood",
  "Spider-Verse",
];

const RANK_XP = { easy: 100, medium: 250, hard: 600 };
const RANK_LABEL = { easy: "D-Rank", medium: "B-Rank", hard: "S-Rank" };

const SYSTEM_PROMPT = `You are the "Creative Expander" Game Master for Vijnana — an ICSE Class 10 science game.

Your job: generate a single challenge that maps a viral anime/pop-culture power or ability to an ICSE science concept. The challenge sounds like it's FROM the anime world but can ONLY be solved using the correct scientific term.

ICSE TOPIC BANK (use these for science concepts):
Chemistry: Ionic bonding, Electrolysis, Acids/Bases/Salts, Metals & Non-metals, Mole concept, Organic chemistry, Periodic table trends, Analytical chemistry
Physics: Force & Laws of Motion, Work/Energy/Power, Light (Reflection, Refraction, Lenses), Sound, Electricity (Ohm's Law, circuits), Electromagnetism, Heat
Biology: Photosynthesis, Respiration, Excretion, Nervous system, Reproduction, Genetics, Ecosystems

ANIME → SCIENCE MAPPING EXAMPLES (follow this logic):
- Tanjiro's Water Breathing → Fluid viscosity / Surface tension
- Sung Jinwoo's Shadow Extraction → Endothermic reaction (absorbs energy to raise soldiers)
- Naruto's Rasengan → Centripetal force / Angular momentum
- Goku's Kamehameha → Electromagnetic radiation / Energy transfer
- Luffy's Rubber body → Polymer elasticity / Insulation
- Eren's Titan hardening → Crystallisation / Solid state chemistry
- Itadori's cursed energy → Potential energy stored in chemical bonds
- Midoriya's One For All → Energy conservation / Transfer of momentum
- Edward Elric's Alchemy → Conservation of mass / Mole concept
- Sasuke's Sharingan → Persistence of vision / Optics

OUTPUT FORMAT — return ONLY this JSON, no markdown:
{
  "challenge": "The narrative riddle (2-3 sentences, sounds like anime but requires science to answer)",
  "answer": "The exact scientific term (1-5 words maximum)",
  "concept": "ICSE topic (e.g. 'Electrolysis — Selective Discharge')",
  "trendReference": "The anime/show name",
  "type": "riddle" | "puzzle" | "question",
  "hint": "One sentence bridging the fantasy power to the science principle"
}`;

export async function generateChallenge(difficulty = "medium", topic = null, trend = null, apiKey) {
  if (!apiKey) return _fallbackChallenge(difficulty);

  const selectedTrend = trend || TRENDS[Math.floor(Math.random() * TRENDS.length)];
  const topicLine = topic ? `Focus subject: ${topic}` : "Mix Chemistry and Physics equally";
  const difficultyGuide = {
    easy:   "Use a well-known concept with an obvious anime parallel. Answer is a single common term.",
    medium: "Use a moderately complex ICSE concept. Answer may be a short phrase. The parallel should require some thought.",
    hard:   "Use advanced ICSE concepts (Organic chemistry, Optics, Electrochemistry). The parallel is subtle and the answer is precise.",
  }[difficulty];

  const userPrompt = `Generate a ${difficulty.toUpperCase()} challenge using "${selectedTrend}".
${topicLine}
Difficulty guide: ${difficultyGuide}

Return ONLY the JSON object. No preamble. No markdown fences.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-haiku-4-5-20251001",
        max_tokens: 600,
        system:     SYSTEM_PROMPT,
        messages:   [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) return _fallbackChallenge(difficulty);

    const data = await response.json();
    const text = data.content?.[0]?.text?.trim() || "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return _fallbackChallenge(difficulty);

    const parsed = JSON.parse(match[0]);
    return {
      ...parsed,
      rank:  RANK_LABEL[difficulty],
      xp:    RANK_XP[difficulty],
      difficulty,
    };
  } catch {
    return _fallbackChallenge(difficulty);
  }
}

// ── Curated fallbacks — game works even without API key ──────────────────────

const FALLBACKS = {
  easy: [
    {
      challenge: "In the world of Naruto, shadow clones split the user's chakra equally between copies. In the science world, when a 12Ω resistor is split into two equal parallel branches — what is the combined resistance?",
      answer: "6 ohms",
      concept: "Electricity — Parallel Resistance",
      trendReference: "Naruto",
      type: "puzzle",
      hint: "Parallel resistance: the combined value is always LESS than the smallest individual resistor.",
    },
    {
      challenge: "Luffy's body is made of rubber — a material that stops electricity dead in its tracks. In ICSE Chemistry, what is the term for a material that does NOT allow electric current to pass through it?",
      answer: "insulator",
      concept: "Electricity — Conductors and Insulators",
      trendReference: "One Piece",
      type: "riddle",
      hint: "Rubber is a polymer. Polymers have no free electrons to carry current.",
    },
  ],
  medium: [
    {
      challenge: "Sung Jinwoo extracts shadows from fallen enemies — pulling them from death into service. This process ABSORBS energy from the surroundings, making the area feel colder. In ICSE Chemistry, what term describes a reaction that absorbs heat energy from its surroundings?",
      answer: "endothermic reaction",
      concept: "Chemistry — Exothermic and Endothermic Reactions",
      trendReference: "Solo Leveling",
      type: "riddle",
      hint: "Shadow Extraction cools the air — heat flows IN to the reaction, not out.",
    },
    {
      challenge: "Tanjiro's Water Breathing — Seventh Form — creates a looping, circular current of water that builds pressure. In Physics, the force that keeps water (or any object) moving in a circular path and directed toward the centre is called?",
      answer: "centripetal force",
      concept: "Physics — Circular Motion",
      trendReference: "Demon Slayer",
      type: "question",
      hint: "Circular motion always requires a force directed toward the centre — without it, the water would fly off in a straight line.",
    },
  ],
  hard: [
    {
      challenge: "Edward Elric's alchemy obeys the Law of Equivalent Exchange — nothing is created or destroyed, only transformed. In ICSE Chemistry, this exact principle governs stoichiometry. What is the name of the law that states mass is neither created nor destroyed in a chemical reaction?",
      answer: "law of conservation of mass",
      concept: "Chemistry — Mole Concept & Stoichiometry",
      trendReference: "Fullmetal Alchemist Brotherhood",
      type: "riddle",
      hint: "Alchemy's Equivalent Exchange = Chemistry's mass balance. Total mass of reactants always equals total mass of products.",
    },
    {
      challenge: "In Jujutsu Kaisen, Gojo's Infinity technique bends the path of any attack approaching him — light, sound, and matter all curve away. In ICSE Physics, when light passes from a denser medium to a rarer medium at an angle greater than a critical angle, it bends back completely. What is this phenomenon called?",
      answer: "total internal reflection",
      concept: "Physics — Light / Optics",
      trendReference: "Jujutsu Kaisen",
      type: "riddle",
      hint: "Gojo's Infinity = the critical angle barrier. Beyond the critical angle, nothing escapes — exactly like light trapped inside an optical fibre.",
    },
  ],
};

function _fallbackChallenge(difficulty) {
  const pool = FALLBACKS[difficulty] || FALLBACKS.medium;
  const q    = pool[Math.floor(Math.random() * pool.length)];
  return { ...q, rank: RANK_LABEL[difficulty], xp: RANK_XP[difficulty], difficulty, fallback: true };
}
