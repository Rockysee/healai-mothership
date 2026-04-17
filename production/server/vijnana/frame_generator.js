/**
 * Vijnana Frame Generator
 *
 * Generates a single illustrative frame (image) for each game problem.
 * Uses Replicate flux-schnell (fast, cheap) → FAL flux fallback.
 * Frames are cached to disk — never regenerated for same problemId.
 *
 * Frame style: technical educational illustration, dark terminal aesthetic,
 * ICSE chemistry diagrams, not photorealistic.
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname }                         from "path";
import { fileURLToPath }                         from "url";
import fetch                                     from "node-fetch";

const __dirname  = dirname(fileURLToPath(import.meta.url));
const FRAMES_DIR = join(__dirname, "../../storage/game_frames");
if (!existsSync(FRAMES_DIR)) mkdirSync(FRAMES_DIR, { recursive: true });

const BASE_STYLE = "technical educational illustration, dark background, glowing cyan/green lines, ICSE chemistry diagram style, clean vector aesthetic, no text, no watermarks";

// ── Generate or return cached frame URL ──────────────────────────────────────
export async function getFrame(courseId, problemId, imagePrompt, env = process.env) {
  const cacheKey  = `${courseId}_${problemId}`;
  const cachePath = join(FRAMES_DIR, `${cacheKey}.png`);
  const cacheUrl  = `/game-frames/${cacheKey}.png`;

  if (existsSync(cachePath)) return { url: cacheUrl, cached: true };

  const prompt = `${imagePrompt}, ${BASE_STYLE}`;
  const imgBuffer = await _generate(prompt, env);

  if (!imgBuffer) return { url: null, cached: false, error: "All image providers failed" };

  writeFileSync(cachePath, imgBuffer);
  return { url: cacheUrl, cached: false };
}

// ── Pre-warm all frames for a course (background job) ────────────────────────
export async function prewarmCourse(game, env = process.env) {
  const results = [];
  for (const [pid, problem] of Object.entries(game.problems)) {
    if (!problem.imagePrompt) continue;
    const r = await getFrame(game.course_id, pid, problem.imagePrompt, env);
    results.push({ problemId: pid, ...r });
  }
  return results;
}

// ── Internal: try Replicate then FAL ─────────────────────────────────────────
async function _generate(prompt, env) {
  if (env.REPLICATE_API_KEY) {
    const buf = await _replicate(prompt, env.REPLICATE_API_KEY);
    if (buf) return buf;
  }
  if (env.FAL_API_KEY) {
    const buf = await _fal(prompt, env.FAL_API_KEY);
    if (buf) return buf;
  }
  return null;
}

async function _replicate(prompt, apiKey) {
  try {
    // Start prediction
    const start = await fetch("https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions", {
      method:  "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ input: { prompt, num_outputs: 1, aspect_ratio: "16:9", output_format: "png" } }),
    });
    if (!start.ok) return null;
    const pred = await start.json();
    const predId = pred?.id;
    if (!predId) return null;

    // Poll for completion (max 30s)
    for (let i = 0; i < 30; i++) {
      await _sleep(1000);
      const poll = await fetch(`https://api.replicate.com/v1/predictions/${predId}`, {
        headers: { "Authorization": `Bearer ${apiKey}` },
      });
      const data = await poll.json().catch(() => null);
      if (data?.status === "succeeded" && data?.output?.[0]) {
        return await _fetchBuffer(data.output[0]);
      }
      if (data?.status === "failed") return null;
    }
    return null;
  } catch {
    return null;
  }
}

async function _fal(prompt, apiKey) {
  try {
    const r = await fetch("https://fal.run/fal-ai/flux/schnell", {
      method:  "POST",
      headers: { "Authorization": `Key ${apiKey}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ prompt, image_size: "landscape_16_9", num_images: 1 }),
    });
    if (!r.ok) return null;
    const data = await r.json().catch(() => null);
    const url  = data?.images?.[0]?.url;
    if (!url) return null;
    return await _fetchBuffer(url);
  } catch {
    return null;
  }
}

async function _fetchBuffer(url) {
  const r = await fetch(url).catch(() => null);
  if (!r?.ok) return null;
  const ab = await r.arrayBuffer();
  return Buffer.from(ab);
}

const _sleep = (ms) => new Promise(r => setTimeout(r, ms));
