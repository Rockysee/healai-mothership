/**
 * Vijnana Game — Standalone Test Server
 *
 * Runs ONLY the gamification layer. Zero Framegen video-pipeline dependencies.
 * Uses the same game_engine.js + frame_generator.js used by the main server,
 * but in isolation — no Claude/Gemini/Remotion/Manim required.
 *
 * AI feedback in test mode: returns pre-written socratic_nudge (no LLM call).
 * Image frames: Replicate/FAL if REPLICATE_API_KEY or FAL_API_KEY in .env,
 *               otherwise falls back to emoji placeholder — game still works.
 *
 * ── Start ────────────────────────────────────────────────────────────────────
 *   cd /path/to/framegen
 *   node server/vijnana/game_test_server.js
 *
 * ── Open ─────────────────────────────────────────────────────────────────────
 *   http://localhost:3099
 */

import express            from "express";
import cors               from "cors";
import compression        from "compression";
import fetch              from "node-fetch";
import { join, dirname }  from "path";
import { fileURLToPath }  from "url";
import { config }         from "dotenv";

import {
  createSession,
  nextProblem,
  evaluateAnswer,
  getAIFeedback,
  getHint,
  generateVariant,
  getProgressSnapshot,
  listCourses,
  getCourse,
} from "./game_engine.js";
import { nextReviewDate, generateRecallQuestions } from "./recall_engine.js";
import { getFrame, prewarmCourse }           from "./frame_generator.js";
import { getAnimation, prewarmAnimations }  from "./animation_generator.js";
import { generateChallenge }               from "./challenge_generator.js";

// Load .env from framegen root (REPLICATE_API_KEY, FAL_API_KEY optional)
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../../.env") });

const PORT = process.env.GAME_TEST_PORT || 3099;
const app  = express();

app.use(compression());
app.use(cors());
app.use(express.json({ limit: "12mb" }));  // increased for base64 file uploads

// ── Build stamp — changes every server restart, busts any disk cache ──────────
const BUILD_STAMP = Date.now();

// ── HTML page delivery: read file, inject ?v=BUILD_STAMP into all asset refs ──
const PUBLIC_DIR = join(__dirname, "../public");
import { readFileSync } from "fs";

function serveStamped(filename) {
  return (_req, res) => {
    try {
      let html = readFileSync(join(PUBLIC_DIR, filename), "utf8");
      // Inject build stamp into self-referencing hrefs/src so browser sees new URL
      html = html.replace(/(href|src)="(\/game\/[^"]+\.(html|js|css))"/g,
        (_, attr, url) => `${attr}="${url}?v=${BUILD_STAMP}"`);
      res.set({
        "Content-Type":  "text/html; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma":        "no-cache",
        "Expires":       "0",
        "Surrogate-Control": "no-store",
      });
      res.send(html);
    } catch (e) {
      res.status(404).send("Not found");
    }
  };
}

// Serve HTML pages with injected stamp
app.get("/game/index.html",             serveStamped("index.html"));
app.get("/game/game.html",              serveStamped("game.html"));
app.get("/game/creator.html",           serveStamped("creator.html"));
app.get("/game/subject-biology.html",   serveStamped("subject-biology.html"));
app.get("/game/subject-chemistry.html", serveStamped("subject-chemistry.html"));
app.get("/game/subject-physics.html",   serveStamped("subject-physics.html"));
app.get("/game/subject-maths.html",     serveStamped("subject-maths.html"));

// ── Static assets (JS, CSS, images — long-lived ok, versioned via stamp above) ─
app.use("/game",             express.static(PUBLIC_DIR,                                           { etag: false, lastModified: false, setHeaders: (res) => res.setHeader("Cache-Control", "no-store") }));
app.use("/game-frames",      express.static(join(__dirname, "../../storage/game_frames"),         { etag: false, lastModified: false, setHeaders: (res) => res.setHeader("Cache-Control", "no-store") }));
app.use("/game-animations",  express.static(join(__dirname, "../../storage/game_animations"),     { etag: false, lastModified: false, setHeaders: (res) => res.setHeader("Cache-Control", "no-store") }));

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ ok: true, mode: "game-test", build: BUILD_STAMP }));

// ── Root redirect ─────────────────────────────────────────────────────────────
app.get("/",          (_req, res) => res.redirect(`/game/index.html?v=${BUILD_STAMP}`));
app.get("/quickquest",(_req, res) => res.redirect("/game/quickquest.html"));

// ── Courses ───────────────────────────────────────────────────────────────────
app.get("/api/game/courses", (_req, res) => {
  try   { res.json(listCourses()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Session ───────────────────────────────────────────────────────────────────
app.post("/api/game/session", (req, res) => {
  try {
    const { courseId, userId } = req.body;
    res.json(createSession(courseId || "chem_electrolysis_10", userId || "test_player"));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ── Next problem ──────────────────────────────────────────────────────────────
app.get("/api/game/next/:sessionId", (req, res) => {
  try   { res.json(nextProblem(req.params.sessionId)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

// ── Submit answer ─────────────────────────────────────────────────────────────
app.post("/api/game/answer/:sessionId", (req, res) => {
  try {
    const { problemId, answer } = req.body;
    res.json(evaluateAnswer(req.params.sessionId, problemId, answer));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ── AI feedback (pre-written socratic_nudge, no LLM in test mode) ────────────
app.post("/api/game/feedback/:sessionId", async (req, res) => {
  try {
    const { problemId, answer } = req.body;
    // Pass null for callClaude — engine falls back to pre-written nudge
    const result = await getAIFeedback(req.params.sessionId, problemId, answer, null);
    res.json(result);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ── Hint ──────────────────────────────────────────────────────────────────────
app.get("/api/game/hint/:sessionId/:problemId/:hintIndex", async (req, res) => {
  try {
    const { sessionId, problemId, hintIndex } = req.params;
    res.json(await getHint(sessionId, problemId, parseInt(hintIndex), null));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ── Variant (stub in test mode — returns original problem) ───────────────────
app.post("/api/game/variant/:sessionId/:problemId", async (req, res) => {
  try {
    res.json(await generateVariant(req.params.sessionId, req.params.problemId, null));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ── Progress ──────────────────────────────────────────────────────────────────
app.get("/api/game/progress/:sessionId", (req, res) => {
  try   { res.json(getProgressSnapshot(req.params.sessionId)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

// ── Frame (Replicate → FAL → null; game still works without keys) ─────────────
app.get("/api/game/frame/:conceptId/:problemId", async (req, res) => {
  const { conceptId, problemId } = req.params;
  const prompt = req.query.prompt
    || `${conceptId.replace(/_/g, " ")} chemistry concept, educational illustration, dark background, cyan glow`;
  const result = await getFrame(conceptId, problemId, prompt).catch(() => ({ url: null }));
  res.json(result);
});

app.get("/api/game/option-frame/:problemId/:optionId", async (req, res) => {
  const { problemId, optionId } = req.params;
  const prompt = req.query.prompt
    || `${optionId} symbolic chemistry illustration, tarot card art, no text`;
  const result = await getFrame("option", `${problemId}_opt_${optionId}`, prompt).catch(() => ({ url: null }));
  res.json(result);
});

// ── Prewarm frames ────────────────────────────────────────────────────────────
app.post("/api/game/prewarm/:courseId", (req, res) => {
  const game = getCourse(req.params.courseId);
  if (!game) return res.status(404).json({ error: "Course not found" });
  prewarmCourse(game).catch(() => {});
  res.json({ status: "prewarm_started", courseId: req.params.courseId });
});

// ── Animation (Claude-generated 5-step Canvas walk-through) ──────────────────
// GET  /api/game/animation/:courseId/:problemId
//   → returns { url: "/game-animations/chem_electrolysis_10_p01.html", cached: bool }
//   → first call: ~4s (Claude generates); subsequent calls: instant (disk cache)
app.get("/api/game/animation/:courseId/:problemId", async (req, res) => {
  const { courseId, problemId } = req.params;
  const game    = getCourse(courseId);
  if (!game)                 return res.status(404).json({ error: "Course not found" });
  const problem = game.problems?.[problemId];
  if (!problem)              return res.status(404).json({ error: "Problem not found" });

  // Attach concept enrichment so the animation can reference analogy/real_world
  const conceptNode = game.concept_graph?.nodes?.find(n => n.id === problem.concept) ?? {};
  const enrichedProblem = {
    ...problem,
    _concept_deeper:      conceptNode.deeper_explanation   ?? "",
    _concept_analogy:     conceptNode.analogy              ?? "",
    _concept_real_world:  conceptNode.real_world           ?? "",
  };

  const result = await getAnimation(courseId, problemId, enrichedProblem, process.env).catch(e => ({ url: null, error: e.message }));
  res.json(result);
});

// POST /api/game/prewarm-animations/:courseId  — fire-and-forget, generates all 23 animations
app.post("/api/game/prewarm-animations/:courseId", (req, res) => {
  const game = getCourse(req.params.courseId);
  if (!game) return res.status(404).json({ error: "Course not found" });
  prewarmAnimations(game, process.env).catch(() => {});
  res.json({ status: "animation_prewarm_started", problems: Object.keys(game.problems).length });
});

// ── Neural TTS (Gemini 2.5 Flash TTS — uses existing GEMINI_API_KEY) ─────────
// POST /api/tts  body: { text, character: "girl"|"guy" }
//   girl → Leda    (Youthful, warm, conversational — slightly flirty)
//   guy  → Algenib (Gravelly, deep baritone)
// Returns: audio/wav  (PCM L16 → WAV header added server-side, no ffmpeg needed)
// ElevenLabs upgrade: set ELEVENLABS_API_KEY in .env for even higher quality.

function _pcmToWav(pcm, sampleRate = 24000, channels = 1, bitsPerSample = 16) {
  const dataSize   = pcm.length;
  const header     = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);                                    // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * bitsPerSample / 8, 28);
  header.writeUInt16LE(channels * bitsPerSample / 8, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcm]);
}

app.post("/api/tts", async (req, res) => {
  const { text = "", character = "girl" } = req.body || {};
  if (!text.trim()) return res.status(400).json({ error: "empty_text" });

  // ElevenLabs if key is present — highest quality
  if (process.env.ELEVENLABS_API_KEY) {
    const ELVOICES = { girl: "EXAVITQu4vr4xnSDxMaL", guy: "VR6AewLTigWG4xSOukaG" };
    try {
      const upstream = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${ELVOICES[character] || ELVOICES.girl}/stream`,
        {
          method: "POST",
          headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({
            text, model_id: "eleven_turbo_v2_5",
            voice_settings: { stability: character === "girl" ? 0.38 : 0.50, similarity_boost: 0.78,
              style: character === "girl" ? 0.40 : 0.25, use_speaker_boost: true },
          }),
        }
      );
      if (upstream.ok) {
        res.set("Content-Type", "audio/mpeg");
        res.set("Cache-Control", "public, max-age=86400");
        return upstream.body.pipe(res);
      }
    } catch (_) { /* fall through to Gemini */ }
  }

  // Gemini 2.5 Flash TTS — uses existing GEMINI_API_KEY, no extra cost tier
  const GEMINI_VOICES = {
    girl: "Leda",     // Youthful, warm, slightly playful
    guy:  "Algenib",  // Gravelly, deep baritone
    guru: "Aoede",    // Warm, confident, wise — ARYA Life Guru voice
  };
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return res.status(503).json({ error: "no_gemini_key" });

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${geminiKey}`,
      {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: GEMINI_VOICES[character] || "Leda" } },
            },
          },
          systemInstruction: {
            parts: [{
              text: character === "girl"
                ? "You are a warm, slightly flirty teenage girl — speak like you're excitedly telling your best friend something cool. Use natural pauses, rising intonation on interesting bits, casual rhythm. Never sound like a textbook. Keep it light and real."
                : character === "guru"
                ? "You are ARYA — a wise, edgy life guru who guides teenagers through their studies. Confident and warm but never preachy. Speak in short bursts, direct. Like a cool older mentor who's been there. Dry wit, zero fluff."
                : "You are a chill, confident guy with a husky warm voice — speak like you're casually explaining something to a mate. Relaxed pace, low and smooth, occasional emphasis on key words. Natural, never robotic."
            }]
          },
        }),
      }
    );
    const data = await r.json();
    if (data.error) return res.status(502).json({ error: data.error.message });

    const part = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!part) return res.status(502).json({ error: "no_audio_in_response" });

    const pcm = Buffer.from(part.inlineData.data, "base64");
    const wav = _pcmToWav(pcm);
    res.set("Content-Type", "audio/wav");
    res.set("Cache-Control", "public, max-age=86400");
    res.send(wav);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── QuickQuest challenge endpoint ────────────────────────────────────────────
// POST /api/quickquest/challenge
//   body: { difficulty: "easy"|"medium"|"hard", topic?, trend? }
app.post("/api/quickquest/challenge", async (req, res) => {
  const { difficulty = "medium", topic, trend } = req.body || {};
  const result = await generateChallenge(difficulty, topic, trend, process.env.ANTHROPIC_API_KEY);
  res.json(result);
});

// ── QuickQuest hint endpoint ──────────────────────────────────────────────────
// POST /api/quickquest/hint
//   body: { challenge, incorrectAttempt }
app.post("/api/quickquest/hint", async (req, res) => {
  const { challenge, incorrectAttempt = "" } = req.body || {};
  if (!process.env.ANTHROPIC_API_KEY) return res.json({ hint: "Think about the physical principle behind the power described." });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 120,
        system: "You are an ICSE science tutor. Give ONE Socratic hint that bridges the anime metaphor to the correct scientific term. Do NOT reveal the answer. One sentence only.",
        messages: [{ role: "user", content: `Challenge: ${challenge}\nStudent's wrong answer: "${incorrectAttempt}"\nGive a hint.` }],
      }),
    });
    const data = await response.json();
    res.json({ hint: data.content?.[0]?.text?.trim() || "Focus on the physical principle behind the power." });
  } catch {
    res.json({ hint: "Think about what makes that power scientifically possible." });
  }
});

// ── Subject / class routing ───────────────────────────────────────────────────
app.get("/api/game/subjects", (_req, res) => {
  try {
    const all = listCourses();
    const map = {};
    for (const c of all) {
      if (!map[c.subject]) map[c.subject] = { id: c.subject, label: c.subject.charAt(0).toUpperCase() + c.subject.slice(1), courses: [] };
      map[c.subject].courses.push(c);
    }
    res.json({ subjects: Object.values(map) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/game/subject/:subject/courses", (req, res) => {
  try {
    const courses = listCourses().filter(c => c.subject === req.params.subject);
    res.json(courses);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/game/class/:classKey/courses", (req, res) => {
  try {
    const courses = listCourses().filter(c => c.class_key === req.params.classKey);
    res.json(courses);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/game/stats", (_req, res) => {
  try {
    const all = listCourses();
    const bySubject = {}, byClass = {};
    for (const c of all) {
      bySubject[c.subject] = (bySubject[c.subject] || 0) + 1;
      byClass[c.class_key] = (byClass[c.class_key] || 0) + 1;
    }
    res.json({ total_courses: all.length, courses_by_subject: bySubject, courses_by_class: byClass });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Recall / spaced repetition ────────────────────────────────────────────────
app.post("/api/recall/schedule", (req, res) => {
  try {
    const { attemptCount = 0, wasCorrect = true } = req.body || {};
    res.json({ nextReviewDate: nextReviewDate(attemptCount, wasCorrect) });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.post("/api/recall/generate", async (req, res) => {
  try {
    const { blueprint, subject } = req.body || {};
    const questions = await generateRecallQuestions(blueprint, subject, process.env.ANTHROPIC_API_KEY);
    res.json({ questions });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.get("/api/recall/coverage/:subject/:classKey", (req, res) => {
  try {
    const { subject, classKey } = req.params;
    const courses = listCourses().filter(c => c.subject === subject && c.class_key === classKey);
    res.json({ subject, classKey, courses_available: courses.length, courses });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// CREATOR ENDPOINTS — parse exam papers + chapter PDFs via Claude Vision
// ─────────────────────────────────────────────────────────────────────────────

// Helper: call Claude (text only — for exam parsing from extracted text)
async function _callClaude(systemPrompt, userContent, model = "claude-haiku-4-5-20251001") {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("No ANTHROPIC_API_KEY");
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    }),
  });
  if (!r.ok) throw new Error(`Claude ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return j.content?.[0]?.text || "";
}

// Helper: call Claude with a base64 image (Vision)
async function _callClaudeVision(systemPrompt, imageB64, mediaType, textPrompt, model = "claude-haiku-4-5-20251001") {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("No ANTHROPIC_API_KEY");
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: imageB64 } },
          { type: "text", text: textPrompt },
        ],
      }],
    }),
  });
  if (!r.ok) throw new Error(`Claude Vision ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return j.content?.[0]?.text || "";
}

// Helper: call Gemini with a base64 image (Vision fallback)
async function _callGeminiVision(imageB64, mediaType, textPrompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("No GEMINI_API_KEY");
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: mediaType, data: imageB64 } },
            { text: textPrompt },
          ],
        }],
        generationConfig: { maxOutputTokens: 4096, temperature: 0.2 },
      }),
    }
  );
  if (!r.ok) throw new Error(`Gemini Vision ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return j.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// POST /api/creator/parse-exam
// Body: { fileB64, mediaType, filename }
// Returns: { questions: [{q_no, text, marks, type, options?, answer?, concept}] }
app.post("/api/creator/parse-exam", async (req, res) => {
  try {
    const { fileB64, mediaType } = req.body;
    if (!fileB64) return res.status(400).json({ error: "fileB64 required" });

    const isImage = mediaType?.startsWith("image/");
    const systemPrompt = `You are an ICSE exam paper parser. Extract ALL questions from this exam paper and return ONLY valid JSON — no markdown, no explanation.`;
    const userPrompt = `Extract every question from this exam paper.

Return a JSON object: { "title": "exam title or filename", "subject": "guess subject", "year": 2024, "questions": [...] }

Each question object:
{
  "q_no": "1a",
  "text": "full question text verbatim",
  "marks": 2,
  "type": "mcq"|"short_answer"|"long_answer"|"diagram"|"numerical",
  "options": ["A. ...", "B. ...", "C. ...", "D. ..."],  // only for MCQ
  "answer": "best answer or null",
  "concept": "topic this tests e.g. Mendel's Laws, Electrolysis, Refraction"
}

Rules: preserve LaTeX math as plain text. Include ALL sub-parts as separate items (1a, 1b...). Return ONLY the JSON.`;

    let rawText;
    try {
      if (isImage) {
        rawText = await _callClaudeVision(systemPrompt, fileB64, mediaType, userPrompt);
      } else {
        // PDF sent as base64 — Claude can read PDFs via document blocks
        const key = process.env.ANTHROPIC_API_KEY;
        if (!key) throw new Error("No ANTHROPIC_API_KEY");
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 4096,
            system: systemPrompt,
            messages: [{
              role: "user",
              content: [
                { type: "document", source: { type: "base64", media_type: "application/pdf", data: fileB64 } },
                { type: "text", text: userPrompt },
              ],
            }],
          }),
        });
        if (!r.ok) throw new Error(`Claude PDF ${r.status}`);
        const j = await r.json();
        rawText = j.content?.[0]?.text || "";
      }
    } catch (claudeErr) {
      // Fallback: Gemini Vision for images
      if (isImage && process.env.GEMINI_API_KEY) {
        rawText = await _callGeminiVision(fileB64, mediaType, userPrompt);
      } else {
        throw claudeErr;
      }
    }

    // Parse JSON from response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(422).json({ error: "Could not extract JSON from AI response", raw: rawText.slice(0, 500) });
    const parsed = JSON.parse(jsonMatch[0]);
    res.json(parsed);
  } catch (e) {
    console.error("parse-exam error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/creator/parse-chapter
// Body: { fileB64, mediaType, title }
// Returns: { title, concepts: [{id, title, description, topics:[]}] }
app.post("/api/creator/parse-chapter", async (req, res) => {
  try {
    const { fileB64, mediaType, title } = req.body;
    if (!fileB64) return res.status(400).json({ error: "fileB64 required" });

    const systemPrompt = `You are an ICSE curriculum expert. Extract the concept structure from this chapter. Return ONLY valid JSON.`;
    const userPrompt = `Extract the main concepts and topics from this chapter document.

Return: {
  "title": "${title || 'Chapter'}",
  "subject": "guess from content",
  "concepts": [
    {
      "id": "slug_form",
      "title": "Concept Name",
      "description": "One sentence description",
      "topics": ["subtopic 1", "subtopic 2"]
    }
  ]
}

Return ONLY the JSON.`;

    const isImage = mediaType?.startsWith("image/");
    let rawText;
    if (isImage) {
      rawText = await _callClaudeVision(systemPrompt, fileB64, mediaType, userPrompt);
    } else {
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) throw new Error("No ANTHROPIC_API_KEY");
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{
            role: "user",
            content: [
              { type: "document", source: { type: "base64", media_type: "application/pdf", data: fileB64 } },
              { type: "text", text: userPrompt },
            ],
          }],
        }),
      });
      if (!r.ok) throw new Error(`Claude PDF ${r.status}`);
      const j = await r.json();
      rawText = j.content?.[0]?.text || "";
    }

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(422).json({ error: "Could not parse chapter", raw: rawText.slice(0, 500) });
    res.json(JSON.parse(jsonMatch[0]));
  } catch (e) {
    console.error("parse-chapter error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/creator/generate-questions
// Body: { questions: [{q_no, text, marks, type, concept}], subject, title }
// Returns: { course_id, problems: [{...game format}] }
app.post("/api/creator/generate-questions", async (req, res) => {
  try {
    const { questions, subject, title } = req.body;
    if (!questions?.length) return res.status(400).json({ error: "questions required" });

    const system = `You are an ICSE question designer. Convert exam questions into an interactive game format. Return ONLY valid JSON.`;
    const prompt = `Convert these ${questions.length} exam questions into an interactive game question bank.

Input questions:
${JSON.stringify(questions.slice(0, 20), null, 2)}

Return a JSON object:
{
  "problems": {
    "p01": {
      "concept": "slug",
      "difficulty": 1,
      "type": "tap_select",
      "title": "short title",
      "prompt": "question text",
      "widget": {
        "kind": "single_select",
        "options": [
          {"id": "A", "label": "option text", "correct": false},
          {"id": "B", "label": "correct answer", "correct": true},
          {"id": "C", "label": "option text", "correct": false},
          {"id": "D", "label": "option text", "correct": false}
        ]
      },
      "solution": {
        "correct_id": "B",
        "explanation": "explanation",
        "key_fact": "one-liner key fact"
      },
      "xp": 75,
      "hints": ["hint 1", "hint 2"]
    }
  },
  "concept_graph": {
    "nodes": [
      {"id": "slug", "title": "Concept Title", "description": "desc", "mastery_threshold": 3, "problems": ["p01"]}
    ],
    "edges": []
  }
}

Rules:
- For short_answer/long_answer/numerical: create 4 multiple-choice options where one is the real answer
- Number problems p01, p02, ...
- Group related questions under the same concept slug
- difficulty 1-3 based on marks (1 mark=1, 2-3 marks=2, 4+ marks=3)
- Return ONLY JSON`;

    const rawText = await _callClaude(system, prompt, "claude-haiku-4-5-20251001");
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(422).json({ error: "AI response not parseable", raw: rawText.slice(0, 500) });

    const generated = JSON.parse(jsonMatch[0]);
    const courseId = "custom_" + Date.now();
    res.json({ course_id: courseId, title, subject, ...generated });
  } catch (e) {
    console.error("generate-questions error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Startup: prewarm all courses ──────────────────────────────────────────────
// Generates & disk-caches animations for every course on server start.
// Already-cached HTML files are skipped instantly (idempotent).
// Staggered 800ms apart so Claude isn't flooded with concurrent requests.
async function _prewarmAll() {
  const courses = listCourses();
  console.log(`  ⚡ Prewarming ${courses.length} courses in background...`);
  let done = 0;
  for (const course of courses) {
    const game = getCourse(course.course_id);
    if (!game) continue;
    await prewarmAnimations(game, process.env).catch(() => {});
    done++;
    process.stdout.write(`\r  ⚡ Prewarm ${done}/${courses.length}: ${course.course_id.padEnd(42)}`);
    await new Promise(r => setTimeout(r, 800));  // stagger to avoid Claude rate limits
  }
  console.log(`\n  ✓ All ${courses.length} courses cached.`);
}

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  const hasReplicate = !!process.env.REPLICATE_API_KEY;
  const hasFal       = !!process.env.FAL_API_KEY;
  const imageMode    = hasReplicate ? "Replicate flux-schnell" : hasFal ? "FAL flux" : "placeholder (no API keys)";

  console.log(`
  ╔══════════════════════════════════════════════════════╗
  ║   VIJNANA GAME  —  Standalone Test Server            ║
  ╠══════════════════════════════════════════════════════╣
  ║   URL   :  http://localhost:${PORT}                    ║
  ║   Game  :  http://localhost:${PORT}/game/game.html     ║
  ║   API   :  http://localhost:${PORT}/api/game/courses   ║
  ║   Image :  ${imageMode.padEnd(42)} ║
  ╚══════════════════════════════════════════════════════╝
  `);
  _prewarmAll().catch(() => {});
});
