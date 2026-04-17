/**
 * Vijnana — Recall Engine
 * Generates 3 post-video quiz questions from a blueprint's key facts.
 * Manages spaced repetition scheduling.
 *
 * Spaced repetition intervals (days): 1 → 3 → 7 → 14 → 30
 */

const RECALL_INTERVALS_DAYS = [1, 3, 7, 14, 30];

// ── Spaced repetition: next review date ──────────────────────────────────────
export function nextReviewDate(attemptCount = 0, correct = true) {
  const idx = correct
    ? Math.min(attemptCount, RECALL_INTERVALS_DAYS.length - 1)
    : Math.max(0, attemptCount - 1);
  const days = RECALL_INTERVALS_DAYS[idx];
  const next = new Date();
  next.setDate(next.getDate() + days);
  return next.toISOString();
}

// ── Generate recall questions from a blueprint via Claude ────────────────────
export async function generateRecallQuestions(blueprint, _subject, apiKey) {
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY required for recall generation");
  if (!blueprint?.scenes?.length) throw new Error("Blueprint has no scenes");

  // Extract key facts from narrations
  const narrations = blueprint.scenes
    .map((s, i) => `Scene ${i + 1}: ${s.narration || ""}`)
    .filter(n => n.length > 20)
    .join("\n");

  const prompt = `You are a ICSE exam prep assistant. Based on these lesson scenes, generate exactly 3 recall questions for a student.

LESSON SCENES:
${narrations.slice(0, 2000)}

OUTPUT FORMAT (JSON array, no extra text):
[
  {
    "type": "mcq",
    "question": "...",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "answer": "A",
    "explanation": "...",
    "difficulty": "easy" | "medium" | "hard"
  },
  {
    "type": "short",
    "question": "...",
    "answer": "...",
    "explanation": "...",
    "difficulty": "medium"
  },
  {
    "type": "mcq",
    "question": "...",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "answer": "B",
    "explanation": "...",
    "difficulty": "hard"
  }
]

Rules:
- Questions must test specific facts from the narrations above
- MCQ distractors must be plausible, not obviously wrong
- Short answer must be answerable in 1–2 sentences
- Difficulty: scene 1 fact = easy, middle = medium, last scene = hard`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Claude recall API error: ${res.status}`);
  const data = await res.json();
  const text = data.content?.[0]?.text || "[]";

  // Extract JSON array from response
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("Could not parse recall questions from Claude response");
  return JSON.parse(match[0]);
}

// ── Coverage map: topics attempted vs syllabus ───────────────────────────────
export function buildCoverageMap(progressRows, curriculumSubjects) {
  const attempted = new Set(progressRows.map(r => r.chapter_id));
  const coverage = {};

  for (const [subject, classes] of Object.entries(curriculumSubjects)) {
    coverage[subject] = {};
    for (const [classKey, classData] of Object.entries(classes)) {
      if (classKey === "meta") continue;
      const chapters = classData.chapters || [];
      const total = chapters.length;
      const done = chapters.filter(ch => attempted.has(ch.id)).length;
      coverage[subject][classKey] = {
        total,
        attempted: done,
        pct: total ? Math.round((done / total) * 100) : 0,
        remaining: chapters.filter(ch => !attempted.has(ch.id)).map(ch => ({
          id: ch.id, title: ch.title, difficulty: ch.difficulty,
        })),
      };
    }
  }
  return coverage;
}
