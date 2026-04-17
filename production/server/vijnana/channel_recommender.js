/**
 * Vijnana — Channel Recommender
 * Maps a student's OCEAN personality + cognitive state → optimal genre + renderer.
 *
 * Inputs:
 *   ocean       { O, C, E, A, N } — each 0–100
 *   cogState    "OPTIMAL" | "ELEVATED_FRICTION" | "CRITICAL_ANXIETY" | "CRITICAL_FATIGUE"
 *   subject     "maths" | "biology" | "chemistry" | "physics" | "computer_applications" | ...
 *   topic       string (optional, for subject-level overrides)
 *
 * Output:
 *   { genre, renderer, paceMultiplier, reason }
 */

const SUBJECT_RENDERER_OVERRIDE = {
  chemistry:            "manim",       // always Manim — equation/molecular rendering
  physics:              "whiteboard",  // whiteboard with physics simulation scene type
  computer_applications: "whiteboard",
};

const SUBJECT_GENRE_OVERRIDE = {
  maths:       "vijnana",
  mathematics: "vijnana",
};

export function recommendChannel(ocean = {}, cogState = "OPTIMAL", subject = "", topic = "") {
  const { O = 50, C = 50, E = 50, A = 50, N = 50 } = ocean;
  const subjectLow = subject.toLowerCase();

  // ── Critical state override: always gentle pace ──────────────────────────
  if (cogState === "CRITICAL_ANXIETY" || cogState === "CRITICAL_FATIGUE") {
    return {
      genre:           "disney",
      renderer:        "whiteboard",
      paceMultiplier:  0.65,
      reason:          `Cognitive state ${cogState} — minimal stakes narrative, reduced pace`,
    };
  }

  // ── Subject hard overrides ────────────────────────────────────────────────
  let genre    = SUBJECT_GENRE_OVERRIDE[subjectLow] || null;
  let renderer = SUBJECT_RENDERER_OVERRIDE[subjectLow] || null;

  // ── OCEAN-based genre selection (only if not overridden by subject) ───────
  if (!genre) {
    if (E >= 75)                   genre = "marvel";      // high energy, action
    else if (N >= 60)              genre = "disney";      // gentle, low-stakes
    else if (C >= 80 && E < 50)    genre = "hollywood";  // analytical/mystery
    else                           genre = "bollywood";  // default: warm + relatable
  }

  // ── OCEAN-based renderer (only if not overridden by subject) ─────────────
  if (!renderer) {
    if (O >= 80)                   renderer = "3d";
    else if (C >= 80 || subjectLow === "physics") renderer = "simulation";
    else                           renderer = "whiteboard";
  }

  // ── Pace multiplier: anxiety/neuroticism slows the pace ──────────────────
  const friction = cogState === "ELEVATED_FRICTION" ? 0.15 : 0;
  const paceMultiplier = parseFloat(Math.max(0.6, 1.0 - N * 0.003 - friction).toFixed(2));

  // ── Build human-readable reason ──────────────────────────────────────────
  const reasons = [];
  if (SUBJECT_GENRE_OVERRIDE[subjectLow])     reasons.push(`${subject} always uses Vijnana Jugaad-cademy`);
  else if (genre === "marvel")                reasons.push(`High Extraversion (${E}) → high-energy Marvel narrative`);
  else if (genre === "disney")                reasons.push(`High Neuroticism (${N}) → gentle Disney narrative`);
  else if (genre === "hollywood")             reasons.push(`High Conscientiousness (${C}) + low E → analytical Hollywood thriller`);
  else                                        reasons.push(`Balanced OCEAN → warm Bollywood narrative`);
  if (renderer === "3d")                      reasons.push(`High Openness (${O}) → abstract 3D visual`);
  if (SUBJECT_RENDERER_OVERRIDE[subjectLow])  reasons.push(`${subject} requires ${renderer} renderer`);
  if (paceMultiplier < 0.9)                   reasons.push(`Reduced pace (${paceMultiplier}x) for elevated cognitive friction`);

  return { genre, renderer, paceMultiplier, reason: reasons.join("; ") };
}
