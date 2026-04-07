// ─── Video models available on Replicate ──────────────────────
// Quality tiers:
//   draft    — fast iteration, low cost
//   standard — balanced quality/price
//   premium  — deevid.ai-tier output (use with quality:"high" on the API)
export const MODELS = [
  // ── Free / Local ─────────────────────────────────────────────
  {
    id:        "local-ltx",
    name:      "LTX-Video · Local",
    badge:     "FREE",
    badgeColor:"#4dff9e",
    cost:      "Free — runs on your M1 GPU",
    time:      "~60–90s",
    res:       "704×480",
    tier:      "draft",
    desc:      "LTX-Video on Apple MPS. First run downloads ~8 GB model. Zero API cost forever after.",
    numFrames: 97,
    local:     true,
  },
  // ── Draft tier ───────────────────────────────────────────────
  {
    id:        "wan-fast",
    name:      "Wan 2.2 Fast",
    badge:     "DRAFT",
    badgeColor:"#4da6ff",
    cost:      "~$0.04 / 5s",
    time:      "~25s",
    res:       "480p",
    tier:      "draft",
    desc:      "Fastest cloud option — perfect for drafting scenes before upgrading to premium.",
    numFrames: 81,
  },
  {
    id:        "ltx",
    name:      "LTX-Video",
    badge:     "REALTIME",
    badgeColor:"#ff6b35",
    cost:      "~$0.019 / run",
    time:      "~20s",
    res:       "768×512",
    tier:      "draft",
    desc:      "Lightricks open-source. Near real-time, great for rapid iteration.",
    numFrames: 97,
  },
  // ── Standard tier ─────────────────────────────────────────────
  {
    id:        "wan-480p",
    name:      "Wan 2.1 · 480p",
    badge:     "CHEAPEST",
    badgeColor:"#4dff9e",
    cost:      "~$0.05 / 5s",
    time:      "~40s",
    res:       "480p",
    tier:      "standard",
    desc:      "Alibaba open-source. Best bang-for-buck. Good motion, decent quality.",
    numFrames: 81,
  },
  {
    id:        "wan-720p",
    name:      "Wan 2.1 · 720p",
    badge:     "HD",
    badgeColor:"#e8ff6e",
    cost:      "~$0.08 / 5s",
    time:      "~150s",
    res:       "720p",
    tier:      "standard",
    desc:      "Higher resolution, cinematic output. Takes ~2min per scene.",
    numFrames: 81,
  },
  // ── Premium tier (matches deevid.ai output quality) ──────────
  // Pair with quality:"high" (50 steps, guidance 7.5) for full production output
  {
    id:        "haiper",
    name:      "Haiper 2.0",
    badge:     "PREMIUM",
    badgeColor:"#b57eff",
    cost:      "~$0.12 / 4s",
    time:      "~45s",
    res:       "720p",
    tier:      "premium",
    desc:      "Fast premium model. Sharp detail, strong prompt adherence. Best entry-point to premium tier.",
    numFrames: 65,
  },
  {
    id:        "minimax",
    name:      "Minimax · Hailuo",
    badge:     "CINEMATIC",
    badgeColor:"#4da6ff",
    cost:      "~$0.20 / 6s",
    time:      "~90s",
    res:       "720p",
    tier:      "premium",
    desc:      "Minimax Video-01 (Hailuo engine). Cinematic motion, high coherence. Powers many top-tier AI videos online.",
    numFrames: 144,
  },
  {
    id:        "luma",
    name:      "Luma Dream Machine",
    badge:     "PHOTOREALISTIC",
    badgeColor:"#4dff9e",
    cost:      "~$0.25 / 5s",
    time:      "~120s",
    res:       "720p",
    tier:      "premium",
    desc:      "Luma AI flagship. Best-in-class photorealism and lighting. Ideal for product/live-action style scenes.",
    numFrames: 120,
  },
  {
    id:        "kling-1.5",
    name:      "Kling 1.5 Pro",
    badge:     "BEST QUALITY",
    badgeColor:"#e8ff6e",
    cost:      "~$0.28 / 5s",
    time:      "~90s",
    res:       "720p",
    tier:      "premium",
    desc:      "KlingAI production model. Highest motion quality + character consistency. The engine behind deevid.ai's top outputs.",
    numFrames: 120,
  },
];

// ─── Visual styles ─────────────────────────────────────────────
export const STYLES = [
  { id: "cinematic",   label: "Cinematic",    emoji: "🎥", color: "#4da6ff",
    hint: "anamorphic lens, shallow DOF, film grain, golden hour, dramatic shadows" },
  { id: "documentary", label: "Documentary",  emoji: "📽", color: "#4dff9e",
    hint: "handheld camera, natural light, raw authentic feel, observational" },
  { id: "anime",       label: "Anime",        emoji: "✨", color: "#b57eff",
    hint: "vibrant colors, expressive characters, stylized backgrounds, motion blur" },
  { id: "commercial",  label: "Commercial",   emoji: "📺", color: "#ffd166",
    hint: "clean bright lighting, product-forward, modern minimalism, sharp focus" },
  { id: "musicvideo",  label: "Music Video",  emoji: "🎵", color: "#ff6b9d",
    hint: "rhythmic fast cuts, bold colors, abstract metaphors, surreal elements" },
  { id: "scifi",       label: "Sci-Fi",       emoji: "🚀", color: "#00e5ff",
    hint: "neon lighting, futuristic tech, volumetric fog, lens flares, space" },
];

// ─── Moods ─────────────────────────────────────────────────────
export const MOODS = [
  "Epic", "Intimate", "Surreal", "Energetic", "Melancholic",
  "Mysterious", "Dreamlike", "Tense", "Joyful", "Raw",
];

// ─── Duration → scene count ────────────────────────────────────
export const DURATION_OPTIONS = [
  // ── Short clips ─────────────────────────────────────────────
  { label: "15s",     scenes: 2  },
  { label: "30s",     scenes: 4  },
  { label: "60s",     scenes: 6  },
  { label: "90s",     scenes: 9  },
  // ── Mid-form ────────────────────────────────────────────────
  { label: "2 min",   scenes: 12 },
  { label: "5 min",   scenes: 20 },
  { label: "10 min",  scenes: 30 },
  { label: "15 min",  scenes: 45 },
  { label: "20 min",  scenes: 60 },
  { label: "30 min",  scenes: 80 },
  // ── Long-form ───────────────────────────────────────────────
  { label: "45 min",  scenes: 110 },
  { label: "60 min",  scenes: 140 },
  { label: "90 min",  scenes: 200 },
  // ── Feature film ────────────────────────────────────────────
  { label: "120 min", scenes: 260 },
  { label: "150 min", scenes: 320 },
  { label: "180 min", scenes: 380 },
];

// ─── Build the Claude system prompt ───────────────────────────
// continuity: optional object for multi-chapter feature films:
//   { chapterNumber, totalChapters, filmTitle, totalDuration,
//     characters[], locations[], storySoFar, chapterTask }
export function buildSystemPrompt({ style, mood, duration, sceneCount, modelId, continuity }) {
  const styleInfo = STYLES.find(s => s.id === style) || STYLES[0];
  const modelInfo = MODELS.find(m => m.id === modelId) || MODELS[0];

  // ── Continuity Block — injected for multi-chapter feature films
  const continuityBlock = continuity ? [
    "══════════════════════════════════════════════════════",
    `🎬 FEATURE FILM CONTINUITY MODE — Chapter ${continuity.chapterNumber} of ${continuity.totalChapters}`,
    `Film: "${continuity.filmTitle}" | Total runtime: ${continuity.totalDuration}`,
    "══════════════════════════════════════════════════════",
    "",
    "LOCKED CHARACTER ANCHORS (reuse EXACTLY — no changes to appearance):",
    ...continuity.characters.map(c => `• ${c.name} [${c.id}]: ${c.anchor}`),
    "",
    "ESTABLISHED LOCATIONS (reuse EXACTLY — no changes to environment):",
    ...continuity.locations.map(l => `• ${l.name} [${l.id}]: ${l.anchor}`),
    "",
    "STORY SO FAR (previous chapters summary):",
    continuity.storySoFar,
    "",
    `CHAPTER ${continuity.chapterNumber} TASK:`,
    continuity.chapterTask,
    "",
    "CONTINUITY RULES (CRITICAL — hard constraints):",
    "- Reuse character ids (c1, c2…) and location ids (l1, l2…) from above EXACTLY.",
    "- Character appearances must match their anchors down to clothing colour and hair length.",
    `- New characters introduced THIS chapter must use new ids starting at c${continuity.characters.length + 1}.`,
    `- New locations introduced THIS chapter must use new ids starting at l${continuity.locations.length + 1}.`,
    `- The final 2 scenes must create a narrative bridge/hook into Chapter ${continuity.chapterNumber + 1}.`,
    "══════════════════════════════════════════════════════",
    "",
  ].join("\n") : "";

  return `You are a world-class video director and AI prompt engineer.
${continuityBlock}
Given a video concept, produce a JSON production blueprint — no prose, no markdown fences, raw JSON only.

SCHEMA (strict — every field required):
{
  "title": "short punchy title (3–6 words)",
  "logline": "one sentence — the emotional core of the video",
  "globalTone": "the overarching emotional texture and pacing speed of the film",
  "targetLength": "the estimated complete runtime requested by the script length",
  "colorGrade": "colour palette description (e.g. 'Teal & orange, high contrast, filmic')",
  "soundtrack": "music style description (e.g. 'Slow build orchestral, then drops into heavy drums')",
  "characters": [
    {
      "id": "c1",
      "name": "Character name (e.g. The Protagonist)",
      "anchor": "Highly specific visual description locked for ALL scenes — age, ethnicity, hair colour and length, eye colour, build, clothing including exact colours and textures, any distinctive features. 30–50 words."
    }
  ],
  "locations": [
    {
      "id": "l1",
      "name": "Location name (e.g. The Workshop)",
      "anchor": "Specific environment description locked for ALL scenes — architecture, surfaces, lighting quality and colour temperature, time of day, atmosphere, any distinctive props or features. 20–35 words."
    }
  ],
  "scenes": [
    {
      "id": 1,
      "title": "Scene title",
      "durationSec": 5,
      "shotType": "EXTREME WIDE / WIDE / MEDIUM / CLOSE-UP / EXTREME CLOSE-UP / OVERHEAD",
      "cameraMove": "STATIC / SLOW PAN / DOLLY IN / HANDHELD / CRANE DOWN / etc",
      "characterIds": ["c1"],
      "locationId": "l1",
      "videoPrompt": "Self-contained, vivid AI video prompt. Write ONLY the action and camera direction here — do NOT repeat character or location descriptions (they are injected automatically). Include: subject action, lighting style, camera movement, colour grade, mood. Must be 40–60 words.",
      "negativePrompt": "text, watermark, blurry, low quality, static, distorted, artifacts, inconsistent appearance, face change, costume change",
      "narration": "REQUIRED voice-over line for this scene. Must be ≤ (durationSec × 3) words so it fits within the clip. Write as polished documentary narration — present tense, vivid, intellectually precise. Empty string only if scene is purely atmospheric.",
      "transition": "cut / dissolve / match-cut / fade-to-black"
    }
  ]
}

Rules:
- Generate exactly ${sceneCount} scenes totalling approximately ${duration}
- Style: ${styleInfo.label} — use these visual cues in prompts: ${styleInfo.hint}
- Mood: ${mood}
- Target model: ${modelInfo.name} (${modelInfo.res}) — write prompts this model handles well
- EXTREME CONSISTENCY: You MUST define every unique character and location in the arrays. Do NOT hallucinate characters if none exist.
- It is CRITICAL that every element of the screenplay scene layout is extracted into the JSON sequences correctly so Framegen can allocate the offline archival resources efficiently.
- If the concept has no human characters, set "characters": []. If all scenes are in one place, define one location.
- videoPrompt should describe only ACTION and CAMERA — anchors handle appearance automatically.
- Vary shot types and camera moves across scenes

STORY-VIDEO SYNC RULES (critical for production pipeline):
- Narration text timing: max words = durationSec × 3. If durationSec=5, max 15 words. If durationSec=10, max 30 words.
- Every scene must earn its place in the narrative arc. No filler. Each scene = a beat that advances character, theme, or plot.
- Narration must match what is VISIBLE on screen at that moment — describe or react to the visual action directly.
- Scene titles should be evocative and distinct, not generic ('The Lab Explodes' not 'Scene 3')

SCIENCE & MATHS NARRATIVE CORE (treat this as law):
- If the concept involves STEM — physics, chemistry, biology, mathematics, astronomy, engineering — the narration MUST include the correct scientific concept clearly articulated.
- Use real terminology (e.g. 'photon', 'entropy', 'eigenvalue', 'mitosis', 'Fibonacci spiral', 'electromagnetic induction')
- Science concepts must be accurate. No hand-waving. Narration = micro-lessons embedded in visual storytelling.
- Think Cosmos (Carl Sagan / Neil deGrasse Tyson): poetic, precise, awe-inspiring.
- Mathematical relationships should be stated clearly where they appear visually: 'The ratio of circumference to diameter — always, inevitably, pi.'

NARRATIVE ARC REQUIREMENT:
- Scenes 1–2: Establish world + central tension/question
- Middle scenes: Exploration, conflict, discovery
- Final 2 scenes: Resolution + lingering insight or emotional resonance
- The final narration line must land like a thesis statement — profound, quotable.

- Output ONLY the JSON object. Zero preamble, zero explanation, zero backticks.`;
}

// ─── Refinement quick-prompts ─────────────────────────────────
export const QUICK_REFINES = [
  "Make the scenes more visually dynamic — add extreme camera movements",
  "Darken the mood — more shadows, tension, emotional weight",
  "Simplify each scene — fewer elements, cleaner for AI to generate",
  "Add more human close-ups — faces and emotions",
  "Make it feel more surreal and abstract",
  "Boost the energy — faster implied pacing, more movement",
];

// ─── Narration languages ──────────────────────────────────────
// Drives TTS voice selection, subtitle font (Noto script family),
// and SRT file encoding in the production pipeline.
// Pass `language` code to /api/produce to activate.
export const LANGUAGES = [
  // ── English ────────────────────────────────────────────────
  { code: "en",  label: "English",    script: "Latin",      flag: "🇬🇧", voices: { m: "en-US-GuyNeural",     f: "en-US-JennyNeural"    } },
  // ── Indo-Aryan family ──────────────────────────────────────
  { code: "hi",  label: "Hindi",      script: "Devanagari", flag: "🇮🇳", voices: { m: "hi-IN-MadhurNeural",  f: "hi-IN-SwaraNeural"    } },
  { code: "bn",  label: "Bengali",    script: "Bengali",    flag: "🇮🇳", voices: { m: "bn-IN-BashkarNeural", f: "bn-IN-TanishaaNeural" } },
  { code: "mr",  label: "Marathi",    script: "Devanagari", flag: "🇮🇳", voices: { m: "mr-IN-ManoharNeural", f: "mr-IN-AarohiNeural"   } },
  { code: "gu",  label: "Gujarati",   script: "Gujarati",   flag: "🇮🇳", voices: { m: "gu-IN-NiranjanNeural",f: "gu-IN-DhwaniNeural"   } },
  { code: "pa",  label: "Punjabi",    script: "Gurmukhi",   flag: "🇮🇳", voices: { m: "pa-IN-OjasNeural",    f: "pa-IN-VaaniNeural"    } },
  { code: "or",  label: "Odia",       script: "Odia",       flag: "🇮🇳", voices: { m: "or-IN-SukantaNeural", f: "or-IN-SubhasiniNeural"} },
  { code: "as",  label: "Assamese",   script: "Bengali",    flag: "🇮🇳", voices: { m: "as-IN-PriyomNeural",  f: "as-IN-YashicaNeural"  } },
  { code: "ur",  label: "Urdu",       script: "Nastaliq",   flag: "🇮🇳", voices: { m: "ur-IN-SalmanNeural",  f: "ur-IN-GulNeural"      } },
  // ── Dravidian family ───────────────────────────────────────
  { code: "te",  label: "Telugu",     script: "Telugu",     flag: "🇮🇳", voices: { m: "te-IN-MohanNeural",   f: "te-IN-ShrutiNeural"   } },
  { code: "ta",  label: "Tamil",      script: "Tamil",      flag: "🇮🇳", voices: { m: "ta-IN-ValluvarNeural",f: "ta-IN-PallaviNeural"  } },
  { code: "kn",  label: "Kannada",    script: "Kannada",    flag: "🇮🇳", voices: { m: "kn-IN-GaganNeural",   f: "kn-IN-SapnaNeural"    } },
  { code: "ml",  label: "Malayalam",  script: "Malayalam",  flag: "🇮🇳", voices: { m: "ml-IN-MidhunNeural",  f: "ml-IN-SobhanaNeural"  } },
];
