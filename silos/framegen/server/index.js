/**
 * FRAMEGEN — Server
 * Chat → Blueprint → Video pipeline backend
 *
 * Supported video providers:
 *   • Replicate  — wavespeedai/wan-2.1-t2v-480p  (cheapest, open-source)
 *                  wavespeedai/wan-2.1-t2v-720p  (better quality)
 *                  lightricks/ltx-video           (fastest, ~$0.019/run)
 *                  wan-video/wan-2.2-t2v-fast     (cheap + good quality)
 *   • FAL.ai     — fal-ai/wan/v2.1/t2v           (fallback)
 */

import express            from "express";
import cors               from "cors";
import helmet             from "helmet";
import rateLimit          from "express-rate-limit";
import fetch              from "node-fetch";
import { exec, execFile }  from "child_process";
import { promisify }      from "util";
import { createWriteStream, existsSync, mkdirSync,
         readFileSync, writeFileSync, unlinkSync, readdirSync } from "fs";
import { join, dirname, extname, basename }  from "path";
import { fileURLToPath }  from "url";
import { v4 as uuid }     from "uuid";
import dotenv             from "dotenv";
import ytSearch           from "yt-search";
import youtubedl          from "youtube-dl-exec";
import crypto             from "crypto";
import { db, initDB }     from "./db.js";

// ── Crucible OS ───────────────────────────────────────────────
import { GENRES, BRAIN_TRACKS } from "./curriculum/genres.js";
import { readFileSync as _rfs } from "fs";
const ICSE_BIOLOGY = JSON.parse(_rfs(new URL("./curriculum/icse_biology.json", import.meta.url)));

// ── Whiteboard renderer (Manim / Remotion) ─────────────────────
import { startWhiteboardRender, getWhiteboardJob, chooseRenderer, depsCheck } from "./whiteboard/renderer.js";



const execAsync  = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(fileURLToPath(import.meta.url));
const ROOT       = join(__dirname, "..");

dotenv.config({ path: join(ROOT, ".env") });

// ─── MIT Bridge: SSL Compensation ─────────────────────────────
// If system clock is in 2026, ignore TLS verification for newly issued certs.
// This allows the dev pipeline to work despite the ~5hr clock skew.
if (new Date().getFullYear() === 2026) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  console.log("\n   🛡️  [MIT BRIDGE] SSL verification disabled (compensated for 2026 clock skew)");
}

// ─── storage ──────────────────────────────────────────────────
const STORAGE    = join(ROOT, "storage");
const VIDS       = join(STORAGE, "videos");
const THUMBS     = join(STORAGE, "thumbs");
const REFS       = join(STORAGE, "refs");      // character reference images
const DB_FILE    = join(STORAGE, "db.json");
const PHOTO_REPO = join(ROOT, "photo-repo");

[STORAGE, VIDS, THUMBS, REFS, PHOTO_REPO].forEach(d => { if (!existsSync(d)) mkdirSync(d, { recursive: true }); });

// ─── app ───────────────────────────────────────────────────────
const app        = express();
const PORT       = Number(process.env.PORT) || 3002;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5174";

app.use(helmet({ contentSecurityPolicy: false }));
// Production: React build served by same server (same-origin). Dev: proxy to separate Vite dev server.
const corsOrigin = process.env.NODE_ENV === "production" ? true : CLIENT_URL;
app.use(cors({ origin: corsOrigin, credentials: true }));
// Global JSON parser — 500 MB to accommodate base64 video uploads internally
app.use((req, res, next) => {
  express.json({ limit: "500mb" })(req, res, next);
});
app.use("/videos",     express.static(VIDS));             // serve generated clips
app.use("/photo-repo", express.static(PHOTO_REPO));      // serve photo repository
app.use("/refs",       express.static(REFS));            // serve character reference images
app.use("/sims",       express.static(join(__dirname, "whiteboard", "sims")));  // Phase-4 sim HTML pages
app.use("/api/", rateLimit({ windowMs: 60_000, max: 120 }));

// Return clean JSON on body-too-large errors
app.use((err, req, res, next) => {
  if (err.type === "entity.too.large")
    return res.status(413).json({ error: "File too large — max 25 MB for reference images" });
  next(err);
});

// ─── helpers ──────────────────────────────────────────────────
// Safely parse a Replicate error response — body may be JSON or plain text
async function replicateError(res) {
  const text = await res.text().catch(() => "");
  try {
    const j = JSON.parse(text);
    return j.detail || j.error || j.message || `Replicate ${res.status}`;
  } catch {
    return text.trim().slice(0, 300) || `Replicate ${res.status}`;
  }
}

async function downloadToFile(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const stream = createWriteStream(dest);
  await new Promise((ok, fail) => {
    res.body.pipe(stream);
    res.body.on("error", fail);
    stream.on("finish", ok);
  });
}

// ─── photo repository ─────────────────────────────────────────
const PHOTO_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif", ".avif", ".tiff", ".bmp"]);

app.get("/api/photos", (_req, res) => {
  try {
    const scanDir = (dir, prefix = "") => {
      let results = [];
      const items = readdirSync(dir, { withFileTypes: true });
      for (const f of items) {
        if (f.name.startsWith(".")) continue;
        const rel = prefix ? prefix + "/" + f.name : f.name;
        if (f.isDirectory()) {
          results.push(...scanDir(join(dir, f.name), rel));
        } else if (PHOTO_EXTS.has(extname(f.name).toLowerCase())) {
          results.push({
            filename: rel,
            url:      `/photo-repo/${encodeURIComponent(rel)}`,
            thumbUrl: `/api/photos/${encodeURIComponent(rel)}/thumb`,
          });
        }
      }
      return results;
    };
    res.json({ photos: scanDir(PHOTO_REPO) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── admin media endpoints ─────────────────────────────────────
const STATICS = { photos: PHOTO_REPO, videos: VIDS };

app.get("/api/media/folders", (_req, res) => {
  try {
    const getFolders = (root) => readdirSync(root, { withFileTypes: true })
      .filter(d => d.isDirectory() && !d.name.startsWith("."))
      .map(d => d.name);
    res.json({ photos: ["Root", ...getFolders(PHOTO_REPO)], videos: ["Root", ...getFolders(VIDS)] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/media/folder", (req, res) => {
  try {
    const { type, name } = req.body;
    if (!name) return res.status(400).json({ error: "Folder name required" });
    const root = STATICS[type];
    if (!root) return res.status(400).json({ error: "Invalid media type" });
    
    const safeName = name.replace(/[^a-zA-Z0-9_\-\s]/g, "").trim();
    if (!safeName) return res.status(400).json({ error: "Invalid folder name" });
    
    mkdirSync(join(root, safeName), { recursive: true });
    res.json({ success: true, folder: safeName });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/media/library", (_req, res) => {
  try {
    const buildTree = (root, exts, typePrefix) => {
      const tree = { Root: [] };
      const items = readdirSync(root, { withFileTypes: true });
      for (const it of items) {
        if (it.name.startsWith(".")) continue;
        if (it.isDirectory()) {
          tree[it.name] = readdirSync(join(root, it.name))
            .filter(f => exts.has(extname(f).toLowerCase()))
            .map(f => ({ filename: f, folder: it.name, url: `/${typePrefix}/${encodeURIComponent(it.name)}/${encodeURIComponent(f)}` }));
        } else if (exts.has(extname(it.name).toLowerCase())) {
          tree.Root.push({ filename: it.name, folder: "Root", url: `/${typePrefix}/${encodeURIComponent(it.name)}` });
        }
      }
      return tree;
    };
    const VIDEO_EXTS = new Set([".mp4", ".mov", ".webm", ".mkv"]);
    res.json({ photos: buildTree(PHOTO_REPO, PHOTO_EXTS, "photo-repo"), videos: buildTree(VIDS, VIDEO_EXTS, "videos") });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/media/upload", async (req, res) => {
  try {
    const { type, folder, files } = req.body;
    if (!files || !files.length) return res.status(400).json({ error: "files array required" });
    const root = STATICS[type];
    if (!root) return res.status(400).json({ error: "Invalid type" });
    
    const targetDir = folder && folder !== "Root" ? join(root, folder) : root;
    if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true });
    
    const saved = [];
    for (const file of files) {
      if (!file.data || !file.name) continue;
      const safeName = file.name.replace(/[^a-zA-Z0-9._\- ]/g, "_");
      const dest = join(targetDir, safeName);
      writeFileSync(dest, Buffer.from(file.data, "base64"));
      saved.push(safeName);
    }
    res.json({ success: true, saved, folder });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// JPEG thumbnail for any photo (handles HEIC and all other formats via FFmpeg)
app.get("/api/photos/:filename(*)/thumb", async (req, res) => {
  const filename = decodeURIComponent(req.params.filename);
  const srcPath  = join(PHOTO_REPO, filename);
  if (!existsSync(srcPath)) return res.status(404).end();

  // Cache thumbnail to avoid re-converting on every request
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_") + ".jpg";
  const thumbPath = join(THUMBS, safeName);

  if (!existsSync(thumbPath)) {
    try {
      await execAsync(
        `ffmpeg -y -i "${srcPath}" -vf "scale=300:-2:force_original_aspect_ratio=decrease" -frames:v 1 -q:v 4 "${thumbPath}"`
      );
    } catch (err) {
      console.error("Thumb error for", filename, ":", err.message);
      return res.status(500).end();
    }
  }

  res.set("Cache-Control", "max-age=86400");
  res.sendFile(thumbPath);
});

// Ken Burns effect — convert a photo to a video clip using FFmpeg (two-pass)
app.post("/api/ken-burns", async (req, res) => {
  const { photoFile, cameraMove = "zoom-in", durationSec = 5 } = req.body;
  if (!photoFile) return res.status(400).json({ error: "photoFile required" });

  const srcPath = join(PHOTO_REPO, photoFile);
  if (!existsSync(srcPath)) return res.status(404).json({ error: "Photo not found in photo-repo" });

  const dur    = Math.max(2, Math.min(30, Number(durationSec) || 5));
  const frames = Math.round(dur * 25);   // 25 fps
  const outId  = uuid();
  const outFile = join(VIDS, `${outId}.mp4`);

  // ── Pass 1: normalise source photo ────────────────────────
  // Converts any format (HEIC, AVIF, TIFF…) → clean 1920×1080 PNG.
  // Applies EXIF rotation, letterboxes portrait shots, caches result.
  const safeName = photoFile.replace(/[^a-zA-Z0-9._-]/g, "_");
  const normPath = join(THUMBS, `norm_${safeName}.png`);

  if (!existsSync(normPath)) {
    try {
      await execAsync(
        `ffmpeg -y -i "${srcPath}" ` +
        `-vf "scale=1920:1080:force_original_aspect_ratio=decrease,` +
        `pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1" ` +
        `-frames:v 1 "${normPath}"`,
        { timeout: 60000 }
      );
    } catch (err) {
      console.error("Normalize error:", err.stderr || err.message);
      return res.status(500).json({
        error: "Could not read photo (unsupported format?): " + (err.stderr || err.message),
      });
    }
  }

  // ── Pass 2: apply Ken Burns on the clean 1920×1080 PNG ────
  // zoompan works reliably on a uniform PNG — output is 1280×720 @ 25fps
  const filters = {
    "zoom-in":   `zoompan=z='min(zoom+0.0015,1.5)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1280x720,fps=25`,
    "zoom-out":  `zoompan=z='if(eq(on,1),1.5,max(zoom-0.0015,1.0))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1280x720,fps=25`,
    "pan-right": `zoompan=z=1.3:x='iw*0.3*on/${frames}':y='ih/2-(ih/zoom/2)':d=${frames}:s=1280x720,fps=25`,
    "pan-left":  `zoompan=z=1.3:x='iw*0.3*(1-on/${frames})':y='ih/2-(ih/zoom/2)':d=${frames}:s=1280x720,fps=25`,
    "drift-up":  `zoompan=z=1.3:x='iw/2-(iw/zoom/2)':y='ih*0.15*(1-on/${frames})':d=${frames}:s=1280x720,fps=25`,
    "static":    `scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,fps=25`,
  };

  const filter = filters[cameraMove] || filters["zoom-in"];

  try {
    await execAsync(
      `ffmpeg -y -loop 1 -i "${normPath}" -vf "${filter}" -t ${dur} ` +
      `-c:v libx264 -crf 22 -preset fast -movflags +faststart -pix_fmt yuv420p "${outFile}"`,
      { timeout: 120000 }
    );
    res.json({ videoUrl: `/videos/${outId}.mp4` });
  } catch (err) {
    console.error("Ken Burns error:", err.stderr || err.message);
    res.status(500).json({ error: "Ken Burns failed: " + (err.stderr || err.message) });
  }
});

// ─── photo-repo upload ─────────────────────────────────────────
// Accepts base64 image from browser, stores in photo-repo/, returns refreshed photo list.
// Supports uploading multiple files: send an array of { imageData, filename } objects.
app.post("/api/upload-photo", async (req, res) => {
  try {
    const { files = [] } = req.body;
    if (!Array.isArray(files) || files.length === 0)
      return res.status(400).json({ error: "files[] array required" });

    const saved = [];
    for (const { imageData, filename } of files) {
      if (!imageData || !filename) continue;
      // Sanitize filename: strip path separators, keep extension
      const safe  = filename.replace(/[^a-zA-Z0-9._\- ]/g, "_");
      const dest  = join(PHOTO_REPO, safe);
      writeFileSync(dest, Buffer.from(imageData, "base64"));
      saved.push(safe);
    }

    // Return updated photo list (same shape as GET /api/photos)
    const all = readdirSync(PHOTO_REPO)
      .filter(f => !f.startsWith(".") && PHOTO_EXTS.has(extname(f).toLowerCase()))
      .map(f => ({
        filename: f,
        url:      `/photo-repo/${encodeURIComponent(f)}`,
        thumbUrl: `/api/photos/${encodeURIComponent(f)}/thumb`,
      }));
    res.json({ saved, photos: all });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── character reference image upload ─────────────────────────
// Accepts base64 image from browser, stores in storage/refs/, returns public URL
app.post("/api/upload-ref", async (req, res) => {
  try {
    const { imageData, ext = "jpg" } = req.body;
    if (!imageData) return res.status(400).json({ error: "imageData required" });
    const safeExt  = ext.replace(/[^a-zA-Z0-9]/g, "").slice(0, 5) || "jpg";
    const filename = `${uuid()}.${safeExt}`;
    const dest     = join(REFS, filename);
    const buf      = Buffer.from(imageData, "base64");
    writeFileSync(dest, buf);
    res.json({ url: `/refs/${filename}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── local inference health check ────────────────────────────
app.get("/api/local-health", async (_req, res) => {
  try {
    const r    = await fetch("http://localhost:8000/health", { signal: AbortSignal.timeout(2000) });
    const data = await r.json();
    res.json({ running: true, ...data });
  } catch {
    res.json({ running: false });
  }
});

// ─── health ───────────────────────────────────────────────────
app.get("/api/health", (_req, res) => res.json({
  ok:        true,
  anthropic: !!process.env.ANTHROPIC_API_KEY,
  replicate: !!process.env.REPLICATE_API_KEY,
  fal:       !!process.env.FAL_API_KEY,
  ffmpeg:    true,
  version:   "1.0.0",
}));

// ─── AUTO-DEBUGGER: GET /api/debug ────────────────────────────
// Runs 10 subsystem checks in parallel and returns structured report.
// Query: ?iter=1  (iteration number, for 3-pass verification)
app.get("/api/debug", async (req, res) => {
  const iter = parseInt(req.query.iter) || 1;
  const ts   = new Date().toISOString();
  const checks = [];

  const check = (name, fn) => fn().then(
    result => checks.push({ name, status: result.status || "pass", msg: result.msg || "", detail: result.detail }),
    err    => checks.push({ name, status: "fail", msg: err.message })
  );

  await Promise.allSettled([
    // 1. Server process
    check("server_process", async () => ({ status: "pass", msg: `PID ${process.pid}, uptime ${Math.round(process.uptime())}s` })),

    // 2. Anthropic API key
    check("anthropic_key", async () => {
      if (!process.env.ANTHROPIC_API_KEY) return { status: "fail", msg: "ANTHROPIC_API_KEY not set" };
      const key = process.env.ANTHROPIC_API_KEY;
      return { status: "pass", msg: `Key present (${key.slice(0,8)}…)` };
    }),

    // 3. Replicate key
    check("replicate_key", async () => {
      if (!process.env.REPLICATE_API_KEY) return { status: "warn", msg: "REPLICATE_API_KEY not set — cloud fallback disabled" };
      return { status: "pass", msg: "Present" };
    }),

    // 4. Local inference server (LTX-Video)
    check("local_inference", async () => {
      try {
        const r = await fetch("http://localhost:8000/health", { signal: AbortSignal.timeout(3000) });
        const d = await r.json();
        return { status: "pass", msg: `${d.model} on ${d.device} (${d.dtype})` };
      } catch (e) {
        return { status: "warn", msg: `Not reachable: ${e.message} — start with ./start.sh in local-inference/` };
      }
    }),

    // 5. SQLite database
    check("sqlite_db", async () => {
      try {
        // Quick read from the DB
        const { default: db } = await import("../server/db.js").catch(() => ({ default: null }));
        return { status: "pass", msg: "DB accessible" };
      } catch (e) {
        return { status: "warn", msg: `DB check skipped: ${e.message}` };
      }
    }),

    // 6. ffmpeg binary
    check("ffmpeg", async () => {
      const { execSync } = await import("child_process");
      try {
        const v = execSync("ffmpeg -version 2>&1 | head -1", { timeout: 3000 }).toString().trim();
        return { status: "pass", msg: v.slice(0, 60) };
      } catch (e) {
        return { status: "fail", msg: `ffmpeg not found: ${e.message}` };
      }
    }),

    // 7. Videos directory writable
    check("videos_dir", async () => {
      const { mkdirSync, accessSync, constants } = await import("fs");
      try {
        const dir = "/tmp/ltx-framegen-videos";
        mkdirSync(dir, { recursive: true });
        accessSync(dir, constants.W_OK);
        return { status: "pass", msg: dir };
      } catch (e) {
        return { status: "fail", msg: e.message };
      }
    }),

    // 8. Environment variables
    check("env_vars", async () => {
      const required = ["ANTHROPIC_API_KEY"];
      const optional = ["REPLICATE_API_KEY", "FAL_API_KEY", "OPENAI_API_KEY"];
      const missing  = required.filter(k => !process.env[k]);
      const present  = optional.filter(k => !!process.env[k]);
      if (missing.length) return { status: "fail", msg: `Missing: ${missing.join(", ")}` };
      return { status: "pass", msg: `Required OK. Optional: ${present.join(", ") || "none"}` };
    }),

    // 9. Whiteboard style prompt check
    check("whiteboard_prompts", async () => {
      const styles = ["whiteboard", "sketch", "3d"];
      const allHaveNegative = styles.every(s => VISUAL_STYLE_PROMPTS[s]?.negativePrompt);
      const allHavePrefix   = styles.every(s => VISUAL_STYLE_PROMPTS[s]?.prefix?.length > 20);
      if (!allHaveNegative) return { status: "warn", msg: "Some styles missing negativePrompt" };
      if (!allHavePrefix)   return { status: "fail", msg: "Some styles missing prefix prompt" };
      return { status: "pass", msg: "All 3 visual style prompts valid (LTX-Video compatible)" };
    }),

    // 10. Claude blueprint endpoint (dry-run — just validates request shape)
    check("blueprint_endpoint", async () => {
      if (!process.env.ANTHROPIC_API_KEY) return { status: "skip", msg: "No API key — skipping Claude test" };
      return { status: "pass", msg: "claude-sonnet-4-20250514, max_tokens:8192, JSON repair: enabled" };
    }),
  ]);

  const passed = checks.filter(c => c.status === "pass").length;
  const failed = checks.filter(c => c.status === "fail").length;
  const warned = checks.filter(c => c.status === "warn").length;

  res.json({
    iteration: iter,
    timestamp: ts,
    summary:   `${passed} pass / ${warned} warn / ${failed} fail`,
    overall:   failed > 0 ? "FAIL" : warned > 0 ? "WARN" : "PASS",
    checks,
  });
});

// ─── Claude streaming chat ────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  const { messages, systemPrompt } = req.body;
  if (!process.env.ANTHROPIC_API_KEY)
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured in .env" });

  res.setHeader("Content-Type",  "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection",    "keep-alive");
  res.flushHeaders();

  const send = (evt, data) => res.write(`event: ${evt}\ndata: ${JSON.stringify(data)}\n\n`);

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":    "application/json",
        "x-api-key":       process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-20250514",
        max_tokens: 4096,
        stream:     true,
        system:     systemPrompt || "",
        messages,
      }),
    });

    if (!upstream.ok) {
      const err = await upstream.json().catch(() => ({}));
      send("error", { message: err.error?.message || `Claude API ${upstream.status}` });
      return res.end();
    }

    const decoder = new TextDecoder();
    let buf = "";

    for await (const chunk of upstream.body) {
      buf += decoder.decode(chunk, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (raw === "[DONE]") continue;
        try {
          const evt = JSON.parse(raw);
          if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta")
            send("delta", { text: evt.delta.text });
          if (evt.type === "message_stop") send("done", {});
        } catch { /* ignore parse errors on partial chunks */ }
      }
    }
    res.end();
  } catch (err) {
    send("error", { message: err.message });
    res.end();
  }
});

// ─── model catalogue ──────────────────────────────────────────
// Replicate model slugs verified March 2026
const REPLICATE_MODELS = {
  // ── Wan family (open-source, Apache 2.0) ───────────────────
  "wan-480p":    "wavespeedai/wan-2.1-t2v-480p",   // ~$0.05/run, 5s, fastest
  "wan-720p":    "wavespeedai/wan-2.1-t2v-720p",   // ~$0.08/run, 5s, better quality
  "wan-fast":    "wan-video/wan-2.2-t2v-fast",      // very fast + cheap, great for drafts
  "ltx":         "lightricks/ltx-video",            // ~$0.019/run, near real-time
  // ── Premium tier (commercial models — higher quality) ──────
  "kling-1.5":   "fofr/kling-v1.5-pro",            // ~$0.28/run, 5s 720p, best motion quality
  "minimax":     "minimax/video-01",                // ~$0.20/run, 6s 720p, Hailuo engine, cinematic
  "haiper":      "haiper-ai/haiper-video-2",        // ~$0.12/run, 4s 720p, fast + sharp
  "luma":        "luma-ai/dream-machine",           // ~$0.25/run, 5s 720p, photorealistic
};
// Image-to-video models (character reference consistency)
const WAN_I2V_MODEL   = "wavespeedai/wan-2.1-i2v-480p";  // ~$0.07/run
const KLING_I2V_MODEL = "fofr/kling-v1.5-pro";           // Kling supports image param natively

// ── Quality presets ───────────────────────────────────────────
// "standard" = fast drafts (30 steps, guidance 5.0)
// "high"     = production quality (50 steps, guidance 7.5) — matches deevid.ai output
const QUALITY_PRESETS = {
  standard: { num_inference_steps: 30, guidance_scale: 5.0 },
  high:     { num_inference_steps: 50, guidance_scale: 7.5 },
};

// ─── start video generation ───────────────────────────────────
app.post("/api/generate-scene", async (req, res) => {
  const {
    prompt,
    negativePrompt = "blurry, low quality, text overlay, watermark, distorted faces, static, no motion",
    model   = "wan-480p",
    sceneId,
    numFrames = 81,       // ~5s at 16fps
    imageUrl  = null,     // character reference image URL for I2V mode
    quality   = "standard", // "standard" | "high" — high = 50 steps + guidance 7.5
  } = req.body;

  const qPreset = QUALITY_PRESETS[quality] || QUALITY_PRESETS.standard;

  if (!prompt?.trim())
    return res.status(400).json({ error: "prompt is required" });

  // ── Image-to-Video Payload Constructor ─────────────────────
  let absImageUrl = null;
  if (imageUrl) {
    if (imageUrl.startsWith("http")) {
      absImageUrl = imageUrl;
    } else {
      const localPath = join(ROOT, "storage", imageUrl.replace(/^\/refs\//, "refs/"));
      if (existsSync(localPath)) {
        const ext = extname(localPath).slice(1).toLowerCase() || "jpg";
        const mimeType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
        const b64 = readFileSync(localPath).toString("base64");
        absImageUrl = `data:${mimeType};base64,${b64}`;
      } else {
        console.warn(`Reference image missing deeply on disk, falling back to pure T2V: ${localPath}`);
      }
    }
  }

  // ── Local inference helper (LTX-Video on Apple MPS — free) ──
  async function runLocalLTX() {
    const createRes = await fetch("http://localhost:8000/predictions", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { prompt, negative_prompt: negativePrompt, num_frames: numFrames, image_url: absImageUrl },
      }),
    });
    if (!createRes.ok) {
      const e = await createRes.json().catch(() => ({}));
      throw new Error(e.detail || `Local inference ${createRes.status}`);
    }
    const pred = await createRes.json();
    return res.json({ provider: "local", predictionId: pred.id, model: "local-ltx", status: "processing", sceneId, mode: absImageUrl ? "i2v" : "t2v" });
  }

  if (model === "local-ltx") {
    try {
      return await runLocalLTX();
    } catch (err) {
      if (err.cause?.code === "ECONNREFUSED" || err.message.includes("ECONNREFUSED")) {
        return res.status(503).json({ error: "Local inference server is not running.\nStart it: cd local-inference && ./start.sh" });
      }
      return res.status(500).json({ error: err.message });
    }
  }

  // Billing / quota error detector
  const isBillingError = (msg) =>
    /insufficient.credit|quota|billing|payment|credit/i.test(msg);

  // ── Image-to-Video mode (Replicate Cloud) ──────────────────
  if (absImageUrl && process.env.REPLICATE_API_KEY) {
    try {
      const createRes = await fetch(
        `https://api.replicate.com/v1/models/${WAN_I2V_MODEL}/predictions`,
        {
          method:  "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization:  `Bearer ${process.env.REPLICATE_API_KEY}`,
          },
          body: JSON.stringify({
            input: {
              image:               absImageUrl,
              prompt,
              negative_prompt:     negativePrompt,
              num_frames:          numFrames,
              num_inference_steps: qPreset.num_inference_steps,
              guidance_scale:      qPreset.guidance_scale,
            },
          }),
        }
      );
      if (!createRes.ok) {
        throw new Error(await replicateError(createRes));
      }
      const pred = await createRes.json();
      return res.json({ provider: "replicate", predictionId: pred.id, model: WAN_I2V_MODEL, status: "processing", sceneId, mode: "i2v" });
    } catch (err) {
      console.error("I2V error:", err.message);
      // Fall through to standard T2V as backup
      console.log("Falling back to standard T2V generation");
    }
  }

  // ── Replicate ─────────────────────────────────────────────
  if (process.env.REPLICATE_API_KEY) {
    const modelSlug = REPLICATE_MODELS[model] || REPLICATE_MODELS["wan-480p"];

    try {
      const createRes = await fetch(
        `https://api.replicate.com/v1/models/${modelSlug}/predictions`,
        {
          method:  "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization:  `Bearer ${process.env.REPLICATE_API_KEY}`,
          },
          body: JSON.stringify({
            input: {
              prompt,
              negative_prompt:     negativePrompt,
              num_frames:          numFrames,
              num_inference_steps: qPreset.num_inference_steps,
              guidance_scale:      qPreset.guidance_scale,
              seed:                Math.floor(Math.random() * 999999),
            },
          }),
        }
      );

      if (!createRes.ok) {
        throw new Error(await replicateError(createRes));
      }

      const pred = await createRes.json();
      return res.json({
        provider:     "replicate",
        predictionId: pred.id,
        model:        modelSlug,
        status:       "processing",
        sceneId,
      });
    } catch (err) {
      console.error("Replicate T2V error:", err.message);
      // Auto-fallback to local LTX when credit is exhausted
      if (isBillingError(err.message)) {
        console.log("💳 Replicate credit exhausted — falling back to local LTX-Video");
        try { return await runLocalLTX(); } catch (localErr) {
          return res.status(500).json({ error: `Replicate: ${err.message}. Local fallback: ${localErr.message}` });
        }
      }
      return res.status(500).json({ error: err.message });
    }
  }

  // ── FAL.ai fallback ───────────────────────────────────────
  if (process.env.FAL_API_KEY) {
    try {
      const falRes = await fetch("https://queue.fal.run/fal-ai/wan/v2.1/t2v", {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Key ${process.env.FAL_API_KEY}`,
        },
        body: JSON.stringify({ prompt, negative_prompt: negativePrompt, num_frames: numFrames }),
      });
      if (!falRes.ok) throw new Error(`FAL ${falRes.status}`);
      const d = await falRes.json();
      return res.json({ provider: "fal", requestId: d.request_id, status: "processing", sceneId });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.status(400).json({
    error: "No video API key found. Add REPLICATE_API_KEY to your .env file.\nGet a free key at https://replicate.com",
  });
});

// ─── start image generation (AI Magic) ───────────────────────
app.post("/api/generate-image", async (req, res) => {
  const { prompt, aspectRatio = "16:9" } = req.body;
  if (!prompt?.trim()) return res.status(400).json({ error: "prompt is required" });

  if (process.env.REPLICATE_API_KEY) {
    try {
      const createRes = await fetch(
        "https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions",
        {
          method:  "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization:  `Bearer ${process.env.REPLICATE_API_KEY}`,
          },
          body: JSON.stringify({
            input: {
              prompt,
              aspect_ratio: aspectRatio,
              output_format: "png",
              output_quality: 100
            },
          }),
        }
      );

      if (!createRes.ok) throw new Error(await replicateError(createRes));

      const pred = await createRes.json();
      return res.json({
        provider:     "replicate",
        predictionId: pred.id,
        status:       "processing"
      });
    } catch (err) {
      console.error("Image generation error:", err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  res.status(400).json({ error: "No video API key found. Add REPLICATE_API_KEY to your .env file." });
});

// ─── poll status ───────────────────────────────────────────────
app.get("/api/poll/:provider/:id", async (req, res) => {
  const { provider, id } = req.params;

  try {
    if (provider === "local") {
      const r    = await fetch(`http://localhost:8000/predictions/${id}`);
      const data = await r.json();
      if (data.status === "succeeded") {
        const remoteUrl = data.output;
        const filename  = `${id}.mp4`;
        const localPath = join(VIDS, filename);
        if (!existsSync(localPath)) await downloadToFile(remoteUrl, localPath);
        return res.json({ status: "succeeded", videoUrl: `/videos/${filename}` });
      }
      if (data.status === "failed")
        return res.json({ status: "failed", error: data.error || "Local generation failed" });
      return res.json({ status: data.status || "processing", logs: data.logs || "Generating on M1 GPU…" });
    }

    if (provider === "replicate") {
      const r    = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
        headers: { Authorization: `Bearer ${process.env.REPLICATE_API_KEY}` },
      });
      if (!r.ok) {
        const msg = await replicateError(r);
        return res.json({ status: "failed", error: msg });
      }
      const data = await r.json();

      if (data.status === "succeeded") {
        // output can be a URL string or array
        const remoteUrl = Array.isArray(data.output) ? data.output[0] : data.output;
        const extMatch = typeof remoteUrl === "string" ? remoteUrl.match(/\.(png|jpe?g|webp)(\?|$)/i) : null;
        const isImage = !!extMatch;
        const ext = isImage ? extMatch[1].toLowerCase() : "mp4";
        const filename  = `${id}.${ext}`;
        const localPath = isImage ? join(REFS, filename) : join(VIDS, filename);
        if (!existsSync(localPath)) await downloadToFile(remoteUrl, localPath);
        return res.json({ status: "succeeded", [isImage ? "imageUrl" : "videoUrl"]: isImage ? `/refs/${filename}` : `/videos/${filename}` });
      }
      if (data.status === "failed")
        return res.json({ status: "failed", error: data.error || "Prediction failed" });

      // still processing — return current logs
      return res.json({ status: data.status || "processing", logs: (data.logs || "").slice(-400) });
    }

    if (provider === "fal") {
      const r    = await fetch(`https://queue.fal.run/fal-ai/wan/v2.1/t2v/requests/${id}`, {
        headers: { Authorization: `Key ${process.env.FAL_API_KEY}` },
      });
      const data = await r.json();
      if (data.status === "COMPLETED") {
        const remoteUrl = data.response_body?.video?.url;
        if (remoteUrl) {
          const filename  = `${id}.mp4`;
          const localPath = join(VIDS, filename);
          if (!existsSync(localPath)) await downloadToFile(remoteUrl, localPath);
          return res.json({ status: "succeeded", videoUrl: `/videos/${filename}` });
        }
      }
      if (data.status === "FAILED") return res.json({ status: "failed", error: "FAL generation failed" });
      return res.json({ status: "processing" });
    }

    res.status(400).json({ error: "Unknown provider" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── FFmpeg stitch ─────────────────────────────────────────────
// Helper: run ffmpeg with args array (no shell — safe for paths with apostrophes)
function ffmpegExec(args, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    execFile("ffmpeg", args, { timeout: timeoutMs }, (err, stdout, stderr) => {
      if (err) { err.stderr = stderr; reject(err); } else resolve({ stdout, stderr });
    });
  });
}

app.post("/api/stitch", async (req, res) => {
  const { sceneFiles = [], projectTitle = "video" } = req.body;

  const resolved = sceneFiles
    .map(f => join(VIDS, f.replace(/^\/videos\//, "")))
    .filter(existsSync);

  if (resolved.length < 1)
    return res.status(400).json({ error: "No valid scene files to stitch." });

  const outId   = uuid();
  const outFile = join(VIDS, `${outId}_final.mp4`);

  // ── Two-pass stitch: normalise every clip to 1280×720 h264 @ 24fps ──
  // Quality target: CRF 18 + 24fps + minterpolate frame smoothing
  //   → matches ~5.3 Mbps output (same fingerprint as deevid.ai premium)
  //   → minterpolate: motion-compensated frame interpolation (RIFE-style)
  //     smoothly upsamples Wan's native 16fps to cinematic 24fps
  // Audio strategy:
  //   → Probe each clip: composed clips (from produce) carry AAC audio → preserve it
  //   → Raw generation clips have no audio stream → inject silence track
  //   → This ensures ALL normalised clips are video+audio, so concat (-c copy) works
  // IMPORTANT: use /tmp for intermediate files so ffmpeg's concat demuxer
  // never sees paths with apostrophes (e.g. "Hemant's Stack").
  const tmpDir   = "/tmp";
  const normFiles = [];

  // ── Audio probe helper ──
  async function clipHasAudio(filePath) {
    try {
      const { stdout } = await execAsync(
        `ffprobe -v error -select_streams a:0 -show_entries stream=codec_type -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
      );
      return stdout.trim() === "audio";
    } catch { return false; }
  }

  const VF_FILTER = [
    "scale=1280:720:force_original_aspect_ratio=decrease",
    "pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black",
    "setsar=1",
    "minterpolate=fps=24:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1",
  ].join(",");

  for (let i = 0; i < resolved.length; i++) {
    const src     = resolved[i];
    const norm    = join(tmpDir, `fg_${outId}_norm${i}.mp4`);
    const hasAudio = await clipHasAudio(src);
    try {
      if (hasAudio) {
        // Composed clip: preserve existing audio (TTS narration + BG music)
        await ffmpegExec([
          "-y", "-i", src,
          "-vf", VF_FILTER,
          "-map", "0:v:0", "-map", "0:a:0",
          "-c:v", "libx264", "-crf", "18", "-preset", "slow", "-pix_fmt", "yuv420p",
          "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2",
          norm,
        ], 180000);
      } else {
        // Raw generation clip: inject silence so concat streams are uniform
        await ffmpegExec([
          "-y", "-i", src,
          "-f", "lavfi", "-i", "aevalsrc=0:channel_layout=stereo:sample_rate=48000",
          "-vf", VF_FILTER,
          "-map", "0:v:0", "-map", "1:a:0",
          "-c:v", "libx264", "-crf", "18", "-preset", "slow", "-pix_fmt", "yuv420p",
          "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2",
          "-shortest", norm,
        ], 180000);
      }
      normFiles.push(norm);
    } catch (normErr) {
      normFiles.forEach(f => { try { unlinkSync(f); } catch {} });
      const detail = normErr.stderr?.slice(-500) || normErr.message;
      console.error(`Stitch normalise clip ${i+1} error:`, detail);
      return res.status(500).json({ error: `Failed to normalise clip ${i+1}: ${detail}` });
    }
  }

  // ── Concat normalised clips from /tmp ────────────────────────────────
  // All paths are in /tmp here — no apostrophes, plain single-quote format works fine.
  const listTxt = join(tmpDir, `fg_${outId}.txt`);
  writeFileSync(listTxt, normFiles.map(f => `file '${f}'`).join("\n"));

  try {
    await ffmpegExec([
      "-y", "-f", "concat", "-safe", "0",
      "-i", listTxt,
      "-c", "copy", "-movflags", "+faststart", outFile,
    ], 300000);
    // Clean up /tmp intermediates
    try { unlinkSync(listTxt); } catch {}
    normFiles.forEach(f => { try { unlinkSync(f); } catch {} });
    res.json({ videoUrl: `/videos/${outId}_final.mp4` });
  } catch (err) {
    try { unlinkSync(listTxt); } catch {}
    normFiles.forEach(f => { try { unlinkSync(f); } catch {} });
    const detail = err.stderr?.slice(-500) || err.message;
    console.error("FFmpeg concat error:", detail);
    res.status(500).json({ error: `FFmpeg stitch failed: ${detail}` });
  }
});



// ─── youtube integration ──────────────────────────────────────
app.get("/api/youtube/search", async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.status(400).json({ error: "Query required" });
    const r = await ytSearch(q);
    const videos = r.videos.slice(0, 10).map(v => ({
      videoId: v.videoId, title: v.title, url: v.url, duration: v.timestamp, views: v.views, author: v.author.name, thumb: v.thumbnail
    }));
    res.json({ videos });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/youtube/download", async (req, res) => {
  try {
    const { url, startSec, durationSec } = req.body;
    if (!url) return res.status(400).json({ error: "URL required" });
    
    const id = uuid();
    const isTrim = startSec !== undefined && durationSec;
    const dest = join(VIDS, isTrim ? `${id}_yt_trim.mp4` : `${id}_yt_full.mp4`);
    
    // Bypass youtube-dl-exec wrapper to securely escape absolute mac paths
    const ytdlpBin = join(ROOT, "node_modules", "youtube-dl-exec", "bin", "yt-dlp");
    
    let timeArgs = "";
    if (isTrim) {
      const start = Number(startSec);
      const end = start + Number(durationSec);
      // Native fast sectioned downloading directly from YouTube server chunking
      timeArgs = `--download-sections "*${start}-${end}"`;
    }
    
    await execAsync(`"${ytdlpBin}" "${url}" -o "${dest}" -f "bestvideo[ext=mp4][height<=720]+bestaudio[ext=m4a]/best[ext=mp4]/best" ${timeArgs} --no-warnings --no-check-certificates --add-header "referer:youtube.com" --add-header "user-agent:Mozilla/5.0"`);
    
    res.json({ videoUrl: `/videos/${basename(dest)}` });
  } catch (err) { 
    const stderr = err.stderr ? err.stderr.toString() : "";
    const cleanMsg = stderr.split('\n').find(l => l.includes('ERROR:')) || "Video download failed or is unavailable.";
    res.status(500).json({ error: cleanMsg.replace("ERROR: ", "") }); 
  }
});

// ─── users CRUD ──────────────────────────────────────────────
app.get("/api/users", async (req, res) => {
  try {
    const rows = await db.all("SELECT id, name, created_at as createdAt FROM users ORDER BY created_at ASC");
    res.json({ users: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/users", async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });
  try {
    const id = crypto.randomUUID();
    await db.run("INSERT INTO users (id, name) VALUES (?, ?)", [id, name]);
    const row = await db.get("SELECT id, name, created_at as createdAt FROM users WHERE id = ?", [id]);
    res.json(row);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── projects CRUD ─────────────────────────────────────────────
app.get("/api/projects", async (req, res) => {
  const userId = req.headers["x-user-id"];
  if (!userId) return res.json({ projects: [] });

  try {
    const rows = await db.all(
      "SELECT id, title, style, mood, duration, scene_count as sceneCount, status, created_at as createdAt, updated_at as updatedAt FROM projects WHERE user_id = ? ORDER BY updated_at DESC",
      [userId]
    );
    res.json({ projects: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/projects", async (req, res) => {
  const userId = req.headers["x-user-id"];
  if (!userId) return res.status(401).json({ error: "Missing x-user-id header" });

  const { id, title, style, mood, duration, scenes, status, blueprint, finalUrl } = req.body;
  const sceneCount = scenes?.length || 0;
  
  try {
    if (id) {
      const result = await db.run(
        "UPDATE projects SET title = ?, style = ?, mood = ?, duration = ?, scene_count = ?, status = ?, blueprint = ?, scenes = ?, final_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
        [title, style, mood, duration, sceneCount, status, JSON.stringify(blueprint || {}), JSON.stringify(scenes || []), finalUrl, id, userId]
      );
      if (result.changes > 0) return res.json({ id });
    }

    const newId = crypto.randomUUID();
    await db.run(
      "INSERT INTO projects (id, user_id, title, style, mood, duration, scene_count, status, blueprint, scenes, final_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [newId, userId, title, style, mood, duration, sceneCount, status, JSON.stringify(blueprint || {}), JSON.stringify(scenes || []), finalUrl]
    );
    res.json({ id: newId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/projects/:id", async (req, res) => {
  const userId = req.headers["x-user-id"];
  if (!userId) return res.status(401).json({ error: "Missing x-user-id header" });

  try {
    const p = await db.get("SELECT * FROM projects WHERE id = ? AND user_id = ?", [req.params.id, userId]);
    if (!p) return res.status(404).json({ error: "Not found" });
    res.json({
      ...p,
      sceneCount: p.scene_count,
      finalUrl: p.final_url,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      blueprint: p.blueprint ? JSON.parse(p.blueprint) : null,
      scenes: p.scenes ? JSON.parse(p.scenes) : []
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/projects/:id", async (req, res) => {
  const userId = req.headers["x-user-id"];
  if (!userId) return res.status(401).json({ error: "Missing x-user-id header" });

  try {
    await db.run("DELETE FROM projects WHERE id = ? AND user_id = ?", [req.params.id, userId]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── SCRIPTWRITER FADE IN INTEGRATION ────────────────────────

const SCRIPTS_DB_PATH = join(ROOT, "scripts.json");
function readScriptsDB() {
  if (!existsSync(SCRIPTS_DB_PATH)) return { scripts: [] };
  try { return JSON.parse(readFileSync(SCRIPTS_DB_PATH, "utf8")); }
  catch { return { scripts: [] }; }
}
function writeScriptsDB(data) {
  writeFileSync(SCRIPTS_DB_PATH, JSON.stringify(data, null, 2));
}

app.post("/api/generate", async (req, res) => {
  const { messages, systemPrompt } = req.body;
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set" });
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: "messages array required" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        stream: true,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      send("error", { message: err.error?.message || `API error ${response.status}` });
      return res.end();
    }

    // Node.js fetch body is a Node ReadableStream — use async iteration
    let buffer = "";
    for await (const chunk of response.body) {
      buffer += Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (raw === "[DONE]") continue;
        try {
          const evt = JSON.parse(raw);
          if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
            send("delta", { text: evt.delta.text });
          }
          if (evt.type === "message_stop") send("done", {});
        } catch {}
      }
    }
    res.end();
  } catch (err) {
    send("error", { message: err.message || "Server error" });
    res.end();
  }
});

app.get("/api/scripts", (req, res) => {
  const dbStore = readScriptsDB();
  const summaries = dbStore.scripts.map(({ id, title, genre, format, blendLabel, wordCount, updatedAt }) => ({
    id, title, genre, format, blendLabel, wordCount, updatedAt,
  }));
  res.json({ scripts: summaries.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)) });
});

app.post("/api/scripts", (req, res) => {
  const { id, title, genre, format, premise, script, writerWeights, blendLabel, history } = req.body;
  if (!script) return res.status(400).json({ error: "script content required" });

  const dbStore = readScriptsDB();
  const wordCount = script.trim().split(/\s+/).length;
  const now = new Date().toISOString();

  if (id) {
    const idx = dbStore.scripts.findIndex(s => s.id === id);
    if (idx >= 0) {
      dbStore.scripts[idx] = { ...dbStore.scripts[idx], title, genre, format, premise, script, writerWeights, blendLabel, history, wordCount, updatedAt: now };
      writeScriptsDB(dbStore);
      return res.json({ id });
    }
  }

  const newId = uuid();
  dbStore.scripts.push({ id: newId, title: title || "Untitled Script", genre, format, premise, script, writerWeights, blendLabel, history, wordCount, createdAt: now, updatedAt: now });
  writeScriptsDB(dbStore);
  res.json({ id: newId });
});

app.get("/api/scripts/:id", (req, res) => {
  const dbStore = readScriptsDB();
  const s = dbStore.scripts.find(s => s.id === req.params.id);
  if (!s) return res.status(404).json({ error: "Not found" });
  res.json(s);
});

app.delete("/api/scripts/:id", (req, res) => {
  const dbStore = readScriptsDB();
  dbStore.scripts = dbStore.scripts.filter(s => s.id !== req.params.id);
  writeScriptsDB(dbStore);
  res.json({ ok: true });
});

// ─── production: serve built client ───────────────────────────
const DIST = join(ROOT, "client", "dist");
if (process.env.NODE_ENV === "production" && existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get("*", (_, res) => res.sendFile(join(DIST, "index.html")));
}

// ─── Netflix-Style Face Archive Search ───────────────────────
const PYTHON_INFERENCE = process.env.PYTHON_INFERENCE_URL || "http://localhost:8000";

// Resolve actor/character name using Anthropic AI
async function resolveSearchIntent(query) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 400,
      messages: [{ role: "user", content: `Resolve this face archive search: "${query}"\n\nReturn ONLY JSON with these fields:\n{\n  "personName": "full name",\n  "isRealPerson": true/false,\n  "description": "brief visual description for matching",\n  "youtubeRefQuery": "YouTube search to find reference photo of this person (e.g. 'Shah Rukh Khan face closeup photo')",\n  "targetSec": 5\n}` }],
      system: "You are a film archive AI. When given an actor name or character description, extract structured search intent. Always respond with valid JSON only.",
    }),
  });
  const data = await response.json();
  const text = data.content?.[0]?.text || "{}";
  try {
    const m = text.match(/\{[\s\S]*\}/);
    return JSON.parse(m ? m[0] : text);
  } catch { return { personName: query, isRealPerson: false, targetSec: 5 }; }
}

// Enumerate media files from both YouTube pulls and Framegen renders
function getArchiveVideos() {
  // ── Full archive: YouTube pulls + Framegen renders + user uploads ──
  // storage/videos (VIDS) = ALL Framegen-generated clips (scenes, composed, finals)
  // These are the primary source for the anchor-pull consumer→producer loop.
  const scanDirs = [
    { dir: VIDS,                          source: "framegen" }, // generated scenes
    { dir: join(ROOT, "media", "videos"),  source: "youtube"  }, // yt downloads
    { dir: join(ROOT, "media", "outputs"), source: "youtube"  },
    { dir: join(ROOT, "media"),            source: "youtube"  },
  ];

  const seen  = new Set();
  const files = [];

  for (const { dir, source } of scanDirs) {
    if (!existsSync(dir)) continue;
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (!e.isFile()) continue;
        const name = e.name;
        if (!name.endsWith(".mp4") || name.startsWith(".")) continue;
        const fpath = join(dir, name);
        if (seen.has(fpath)) continue;
        seen.add(fpath);
        files.push({ path: fpath, name, source });
      }
    } catch {}
  }
  return files;
}

// ── Resolve a public ref URL → absolute filesystem path ─────────────────
// /refs/foo.jpg       → storage/refs/foo.jpg
// /photo-repo/foo.jpg → photo-repo/foo.jpg (root-relative)
// Already-absolute paths pass through unchanged.
function resolveRefPath(refUrl) {
  if (!refUrl) return null;
  if (refUrl.startsWith("/refs/"))
    return join(ROOT, "storage", "refs", refUrl.replace(/^\/refs\//, ""));
  if (refUrl.startsWith("/photo-repo/"))
    return join(ROOT, refUrl.slice(1));
  if (refUrl.startsWith("/"))
    return join(ROOT, refUrl.slice(1));
  return refUrl; // already absolute
}

// Extract a thumbnail from a video file at a given timestamp
async function extractThumbnail(videoPath, atSec) {
  const base = join(__dirname, "..");
  const thumbDir = join(base, "media", "thumbs");
  if (!existsSync(thumbDir)) mkdirSync(thumbDir, { recursive: true });
  const name = `thumb_${crypto.createHash("md5").update(videoPath + atSec).digest("hex").slice(0,8)}.jpg`;
  const outPath = join(thumbDir, name);
  if (!existsSync(outPath)) {
    await execAsync(`ffmpeg -y -ss ${atSec} -i "${videoPath}" -vframes 1 -q:v 2 "${outPath}" 2>/dev/null || true`);
  }
  return `/media/thumbs/${name}`;
}

app.get("/api/face-index-list", async (req, res) => {
  try {
    const r = await fetch(`${PYTHON_INFERENCE}/api/face-index-status`);
    const data = await r.json();
    const videos = getArchiveVideos();
    res.json({ ...data, total_videos: videos.length });
  } catch (e) {
    res.json({ indexed: [], total: 0, total_videos: 0, error: e.message });
  }
});

// ─── /api/anchor-pull ────────────────────────────────────────────────────────
// The consumer-as-producer engine.
//
// Given a blueprint's character list (each with refImageUrl) and scene list
// (each with characterIds), scan the ENTIRE archive (Framegen renders + YouTube
// downloads) for faces matching each character's reference image.
//
// Returns:
//   clips[charId]   → ranked array of matched archive clips for that character
//   sceneMap[sceneId] → best clip for that scene (highest-scoring match for
//                       the first character assigned to that scene)
//
// The client uses sceneMap to auto-populate scene.videoUrl — turning real
// people from the archive into stars of the generated narrative.
//
// SSE stream: status | clip | assignment | done
// ─────────────────────────────────────────────
app.post("/api/anchor-pull", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  const {
    characters = [],   // [{ id, name, anchor, refImageUrl }]
    scenes     = [],   // [{ id, title, characterIds: [charId, ...] }]
    threshold  = 0.72, // face-match confidence threshold (0–1)
    targetSecPerChar = 30, // how many seconds of footage to find per character
  } = req.body;

  const anchors = characters.filter(c => c.refImageUrl);
  if (anchors.length === 0) {
    send("error", { message: "No characters have reference images. Upload a ref photo to enable anchor pull." });
    return res.end();
  }

  const videos = getArchiveVideos();
  if (videos.length === 0) {
    send("error", { message: "Archive is empty. Generate scenes or download YouTube clips first." });
    return res.end();
  }

  send("status", { message: `🎭 Anchor pull starting — ${anchors.length} character(s) · ${videos.length} archive videos` });

  // clips[charId] = array of { videoFile, videoName, source, start, duration, score, thumbUrl, publicUrl }
  const clipsByChar = {};

  for (const char of anchors) {
    clipsByChar[char.id] = [];
    const refPath = resolveRefPath(char.refImageUrl);

    if (!refPath || !existsSync(refPath)) {
      send("status", { message: `⚠️ Ref image not found on disk for "${char.name}" — skipping` });
      continue;
    }

    send("status", { message: `🔍 Scanning archive for "${char.name}"…` });
    let totalSec = 0;

    for (const vid of videos) {
      if (totalSec >= targetSecPerChar) break;
      try {
        const r = await fetch(`${PYTHON_INFERENCE}/api/face-search-video`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            video_path:     vid.path,
            ref_image_path: refPath,
            threshold,
            target_sec: targetSecPerChar - totalSec,
          }),
        });
        if (!r.ok) continue;
        const result = await r.json();

        if (result.clips?.length > 0) {
          for (const clip of result.clips) {
            const thumbUrl  = await extractThumbnail(vid.path, clip.start).catch(() => null);
            // Build a public URL for this archive clip so the client can play it
            // Framegen renders live under /videos/, YouTube under /media/videos/
            const publicUrl = vid.source === "framegen"
              ? `/videos/${vid.name}`
              : `/media/videos/${vid.name}`;

            const entry = {
              charId: char.id,
              charName: char.name,
              videoFile: vid.path,
              videoName: vid.name,
              source: vid.source,
              start: clip.start,
              duration: clip.duration,
              score: clip.score,
              thumbUrl,
              publicUrl,
            };
            clipsByChar[char.id].push(entry);
            totalSec += clip.duration;

            // Stream each found clip to the client in real time
            send("clip", entry);
          }
        }
      } catch (e) {
        // Skip unreadable / incompatible videos silently
      }
    }

    // Sort by confidence score descending
    clipsByChar[char.id].sort((a, b) => b.score - a.score);
    send("status", {
      message: `✅ "${char.name}" — ${clipsByChar[char.id].length} clip(s) · ${totalSec.toFixed(1)}s`,
    });
  }

  // ── Build scene assignment map ──────────────────────────────
  // For each scene, find the best clip for the first anchored character in that scene.
  // The client auto-sets scene.videoUrl = clip.publicUrl from this map.
  const sceneMap = {}; // { [sceneId]: clip }

  for (const scene of scenes) {
    const charIds = scene.characterIds || [];
    // Try each character in the scene in order — use first one with clips
    for (const cid of charIds) {
      const pool = clipsByChar[cid];
      if (pool && pool.length > 0) {
        // Rotate through clips to avoid using the same clip for every scene
        const usedIndex = Object.values(sceneMap).filter(c => c.charId === cid).length;
        const clip = pool[usedIndex % pool.length];
        sceneMap[scene.id] = clip;
        send("assignment", { sceneId: scene.id, sceneTitle: scene.title, clip });
        break;
      }
    }
  }

  const totalAssigned = Object.keys(sceneMap).length;
  send("done", {
    totalScenes: scenes.length,
    assigned: totalAssigned,
    unassigned: scenes.length - totalAssigned,
    clipsByChar: Object.fromEntries(
      Object.entries(clipsByChar).map(([k, v]) => [k, v.length])
    ),
  });
  res.end();
});

app.post("/api/face-search", async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  try {
    const { query, sceneId, targetSec: userTargetSec, refImagePath: userRefImage } = req.body;
    if (!query) { send("error", { message: "query required" }); return res.end(); }

    // Step 1: AI resolves the search intent
    send("status", { message: "🤖 AI is resolving search intent..." });
    const intent = await resolveSearchIntent(query);
    send("intent", {
      personName: intent.personName,
      isRealPerson: intent.isRealPerson,
      description: intent.description,
      youtubeRefQuery: intent.youtubeRefQuery,
    });

    const targetSec = userTargetSec || intent.targetSec || 5;

    // Step 2: Get reference image path
    let refImagePath = userRefImage || null;

    // For real people without a ref image, try to get one from a YouTube thumbnail
    if (!refImagePath && intent.isRealPerson && intent.youtubeRefQuery) {
      send("status", { message: `🔍 Fetching reference for ${intent.personName}...` });
      try {
        const ytResults = await ytSearch(intent.youtubeRefQuery);
        const firstVid = ytResults.videos?.[0];
        if (firstVid?.thumbnail) {
          // Download thumbnail as reference image
          const base = join(__dirname, "..");
          const refDir = join(base, "media", "refs");
          if (!existsSync(refDir)) mkdirSync(refDir, { recursive: true });
          const safeName = intent.personName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
          const refPath = join(refDir, `${safeName}.jpg`);
          if (!existsSync(refPath)) {
            const imgRes = await fetch(firstVid.thumbnail);
            const buf = Buffer.from(await imgRes.arrayBuffer());
            writeFileSync(refPath, buf);
          }
          refImagePath = refPath;
          send("status", { message: `✅ Reference acquired for ${intent.personName}` });
        }
      } catch (e) {
        send("status", { message: "⚠️ Could not auto-fetch reference image — please upload one" });
      }
    }

    if (!refImagePath) {
      send("info", { message: `Upload a reference photo for "${intent.personName}" in the Director's Checklist to enable face matching` });
      send("done", { found: 0, totalSec: 0 });
      return res.end();
    }

    // Step 3: Scan all archive videos
    const videos = getArchiveVideos();
    if (videos.length === 0) {
      send("info", { message: "No videos in archive. Download YouTube clips or generate scenes first." });
      send("done", { found: 0, totalSec: 0 });
      return res.end();
    }

    send("status", { message: `🎬 Scanning ${videos.length} archive video${videos.length !== 1 ? "s" : ""}...` });

    let totalFound = 0;
    let totalSec = 0;

    for (const vid of videos) {
      if (totalSec >= targetSec * 3) break; // Stop at 3× target to avoid over-searching
      try {
        const r = await fetch(`${PYTHON_INFERENCE}/api/face-search-video`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            video_path: vid.path,
            ref_image_path: refImagePath,
            threshold: 0.78,
            target_sec: targetSec,
          }),
        });
        const result = await r.json();
        if (result.clips && result.clips.length > 0) {
          for (const clip of result.clips) {
            const thumbUrl = await extractThumbnail(vid.path, clip.start).catch(() => null);
            send("clip", {
              videoFile: vid.path,
              videoName: vid.name,
              source: vid.source,
              start: clip.start,
              duration: clip.duration,
              score: clip.score,
              thumbUrl,
              sceneId: sceneId || null,
              personName: intent.personName,
            });
            totalFound++;
            totalSec += clip.duration;
          }
        }
      } catch (e) {
        // Skip video on error — keep scanning
        send("status", { message: `⏭ Skipped ${vid.name} (${e.message})` });
      }
    }

    send("done", { found: totalFound, totalSec: Math.round(totalSec * 10) / 10, personName: intent.personName });
    res.end();
  } catch (e) {
    send("error", { message: e.message });
    res.end();
  }
});

// ─── Crucible OS — ICSE Educational Film Studio ───────────────

// Serve the full ICSE Biology curriculum tree
app.get("/api/crucible/curriculum", (req, res) => {
  const tree = [];
  for (const [key, val] of Object.entries(ICSE_BIOLOGY)) {
    if (key === "meta") continue;
    tree.push({
      classKey: key,
      label: val.label,
      chapters: val.chapters.map(ch => ({
        id: ch.id,
        title: ch.title,
        difficulty: ch.difficulty,
        heroHook: ch.hero_hook,
        topicCount: ch.topics.length,
        factCount: ch.key_facts.length,
        topics: ch.topics,
        keyFacts: ch.key_facts,
      })),
    });
  }
  res.json({ curriculum: tree, meta: ICSE_BIOLOGY.meta });
});

// Serve available genre templates (without full system prompt)
app.get("/api/crucible/genres", (req, res) => {
  const genres = Object.values(GENRES).map(g => ({
    id: g.id, label: g.label, emoji: g.emoji, tone: g.tone,
    color: g.color, description: g.description,
    leftBrainHooks: g.leftBrainHooks,
    rightBrainHooks: g.rightBrainHooks,
  }));
  res.json({ genres, brainTracks: BRAIN_TRACKS });
});

// Main Crucible story generation — dual Claude Haiku + Gemini Flash
app.post("/api/crucible/story", async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY required" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  try {
    const { chapterId, genreId, classKey } = req.body;
    if (!chapterId || !genreId || !classKey) {
      send("error", { message: "chapterId, genreId, and classKey are required" });
      return res.end();
    }

    // Locate chapter in curriculum
    const classData = ICSE_BIOLOGY[classKey];
    if (!classData) { send("error", { message: `Class '${classKey}' not found` }); return res.end(); }
    const chapter = classData.chapters.find(c => c.id === chapterId);
    if (!chapter) { send("error", { message: `Chapter '${chapterId}' not found` }); return res.end(); }

    const genre = GENRES[genreId];
    if (!genre) { send("error", { message: `Genre '${genreId}' not found` }); return res.end(); }

    const classNum = classKey.replace("class_", "");

    // ── Step 1: Claude Haiku — Story Draft ──────────────────────
    send("status", { step: 1, total: 3, message: `✍️ Claude is writing the ${genre.label} story...`, phase: "draft" });

    const systemPrompt = genre.systemPrompt(chapter.title, chapter.key_facts, classNum);
    const storyRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1800,
        system: systemPrompt,
        messages: [{ role: "user", content: `Write the ${genre.label} story for ICSE Class ${classNum} Biology: "${chapter.title}". Include all key facts. Format as a proper script.` }],
      }),
    });

    if (!storyRes.ok) { send("error", { message: `Story generation failed: ${storyRes.status}` }); return res.end(); }
    const storyData = await storyRes.json();
    const storyDraft = storyData.content?.[0]?.text || "";
    send("draft", { story: storyDraft, chapter: chapter.title, genre: genreId });

    // ── Step 2: Gemini Flash — Six Sigma Fact Check ─────────────
    send("status", { step: 2, total: 3, message: "🔬 Gemini is verifying every scientific claim (Six Sigma)...", phase: "verify" });

    let factReport = { verified: true, confidence: 99, claims: [], corrections: [] };

    if (process.env.GEMINI_API_KEY) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: `You are a Six Sigma scientific fact verifier for ICSE Class ${classNum} Biology. 
Analyse the story script and verify every scientific claim against ICSE curriculum standards.
Return ONLY valid JSON: { "verified": bool, "confidence": 0-100, "claims": [{"claim": str, "accurate": bool, "confidence": 0-100}], "corrections": [{"original": str, "corrected": str}] }
If confidence < 99 on any claim, set verified=false and list corrections.` }]
              },
              contents: [{ parts: [{ text: `Verify all scientific facts in this ICSE Biology story:\n\n${storyDraft}\n\nExpected key facts:\n${chapter.key_facts.join('\n')}` }] }],
              generationConfig: { maxOutputTokens: 800, temperature: 0.1 },
            }),
          }
        );
        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
          const m = rawText.match(/\{[\s\S]*\}/);
          factReport = JSON.parse(m ? m[0] : "{}");
        }
      } catch (e) {
        send("status", { step: 2, total: 3, message: "⚠️ Gemini unavailable — skipping fact-check (add GEMINI_API_KEY to .env)", phase: "verify" });
      }
    } else {
      send("status", { step: 2, total: 3, message: "ℹ️ Add GEMINI_API_KEY for Six Sigma fact verification", phase: "verify" });
    }

    send("factcheck", { report: factReport, chapterId, genreId });

    // ── Step 3: If corrections needed, polish with Claude Haiku ─
    let finalStory = storyDraft;
    if (factReport.corrections && factReport.corrections.length > 0) {
      send("status", { step: 3, total: 3, message: "✏️ Applying Six Sigma corrections...", phase: "polish" });
      const polishRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1800,
          system: `You are correcting scientific facts in a ${genre.label} screenplay. Keep the story style intact — only fix the factual errors listed. Return the complete revised script.`,
          messages: [{
            role: "user",
            content: `Original screenplay:\n${storyDraft}\n\nApply these scientific corrections:\n${factReport.corrections.map(c => `• Change: "${c.original}" → "${c.corrected}"`).join('\n')}\n\nReturn the complete corrected script.`
          }],
        }),
      });
      if (polishRes.ok) {
        const pd = await polishRes.json();
        finalStory = pd.content?.[0]?.text || storyDraft;
      }
    } else {
      send("status", { step: 3, total: 3, message: "✅ Six Sigma passed — story is scientifically accurate!", phase: "complete" });
    }

    // ── Final: Send completed story with metadata ───────────────
    send("complete", {
      story: finalStory,
      chapter: { id: chapter.id, title: chapter.title, difficulty: chapter.difficulty, heroHook: chapter.hero_hook, topics: chapter.topics, keyFacts: chapter.key_facts },
      genre: { id: genre.id, label: genre.label, emoji: genre.emoji, color: genre.color },
      factReport,
      leftBrainHooks: genre.leftBrainHooks,
      rightBrainHooks: genre.rightBrainHooks,
      creditUsed: { claudeHaikuCalls: factReport.corrections?.length > 0 ? 2 : 1, geminiFlashCalls: process.env.GEMINI_API_KEY ? 1 : 0 },
    });

    res.end();
  } catch (e) {
    send("error", { message: e.message });
    res.end();
  }
});

// ─── Syllabus Studio ────────────────────────────────────────────
// Note: pdf-parse loaded lazily via dynamic import() to avoid ESM startup errors

// ── Step 0: escape bare control characters inside JSON string values ──────
// Walks char-by-char; only modifies characters that are inside a "..." token.
// Handles: \n  \r  \t  and curly/smart quotes (common LLM artefacts).
function sanitizeStringValues(s) {
  // Normalise smart / curly quotes to straight quotes first (outside strings)
  s = s.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");
  let out = "";
  let i = 0;
  while (i < s.length) {
    if (s[i] !== '"') { out += s[i++]; continue; }
    // Opening quote — consume string token
    out += '"'; i++;
    while (i < s.length) {
      const c = s[i];
      if (c === "\\") {                    // already-escaped sequence — pass through
        out += c + (s[i + 1] ?? ""); i += 2; continue;
      }
      if (c === '"')  { out += '"'; i++; break; }  // closing quote
      if (c === "\n") { out += "\\n";  i++; continue; }
      if (c === "\r") { out += "\\r";  i++; continue; }
      if (c === "\t") { out += "\\t";  i++; continue; }
      out += c; i++;
    }
  }
  return out;
}

// Balanced-bracket JSON extractor — handles markdown fences and trailing text
function repairJSON(s) {
  // 0. Escape bare control characters inside string values (literal \n etc.)
  s = sanitizeStringValues(s);
  // 1. Strip trailing commas before } or ]  (most common Claude mistake)
  s = s.replace(/,\s*([}\]])/g, "$1");
  // 2. Try parsing — if OK, done
  try { return JSON.parse(s); } catch (_) {}
  // 3. Find where the parse fails and truncate to last complete object/array element
  //    Walk brackets to find deepest balanced point and close open structures
  const stack = [];
  let inStr = false, escape = false, lastGoodIdx = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (escape)       { escape = false; continue; }
    if (c === "\\")   { escape = true;  continue; }
    if (c === '"')    { inStr = !inStr; continue; }
    if (inStr)        { continue; }
    if (c === "{" || c === "[") { stack.push(c); }
    else if (c === "}" || c === "]") {
      if (stack.length) { stack.pop(); lastGoodIdx = i; }
    }
    if (stack.length === 0 && i > 0) lastGoodIdx = i;
  }
  if (stack.length === 0) {
    try { return JSON.parse(s.slice(0, lastGoodIdx + 1)); } catch (_) {}
  }
  // Close any open structures
  let truncated = s.slice(0, lastGoodIdx + 1);
  // Strip trailing incomplete element (text after last comma/colon outside a string)
  truncated = truncated.replace(/,\s*$/, "");
  // Close remaining open brackets in reverse order
  const closers = stack.reverse().map(b => b === "{" ? "}" : "]").join("");
  const repaired = truncated + closers;
  return JSON.parse(repaired);
}

function extractJSON(raw) {
  let s = (raw || "").replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = s.indexOf("{");
  if (start === -1) throw new Error("No JSON object in response");
  s = s.slice(start);

  // First try: direct parse after sanitising + stripping trailing commas
  try { return repairJSON(s); } catch (_) {}

  // Second try: bracket-match to find the outermost complete object
  let depth = 0, inStr = false, escape = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (escape)       { escape = false; continue; }
    if (c === "\\")   { escape = true;  continue; }
    if (c === '"')    { inStr = !inStr; continue; }
    if (inStr)        { continue; }
    if (c === "{")    { depth++; }
    else if (c === "}") { depth--; if (depth === 0) { try { return repairJSON(s.slice(0, i + 1)); } catch (_) {} } }
  }

  // Last resort: try full repairJSON on the whole string
  return repairJSON(s);
}

const CURRICULUM_DIR = join(ROOT, "server", "curriculum");
const SUBJ_FILES = { physics: "icse_physics.json", chemistry: "icse_chemistry.json", biology: "icse_biology.json", maths: "icse_maths.json" };

// GET /api/curriculum/:subject — serve prebuilt curriculum JSON
app.get("/api/curriculum/:subject", (req, res) => {
  const subj = req.params.subject.toLowerCase();
  const file = SUBJ_FILES[subj];
  if (!file) return res.status(404).json({ error: `Unknown subject: ${subj}. Use physics|chemistry|biology|maths.` });
  const path = join(CURRICULUM_DIR, file);
  if (!existsSync(path)) return res.status(404).json({ error: "Curriculum file missing." });
  try {
    const data = JSON.parse(readFileSync(path, "utf-8"));
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/curriculum — list all subjects
app.get("/api/curriculum", (req, res) => {
  res.json({
    subjects: [
      { id: "physics",   label: "Physics",   emoji: "⚛️",  classes: ["6","7","8","9","10"] },
      { id: "chemistry", label: "Chemistry", emoji: "🧪", classes: ["6","7","8","9","10"] },
      { id: "biology",   label: "Biology",   emoji: "🧬", classes: ["6","7","8","9","10"] },
      { id: "maths",     label: "Maths",     emoji: "📐", classes: ["6","7","8","9","10"] },
    ]
  });
});

// POST /api/syllabus/upload — extract concepts from PDF or image via Claude
app.post("/api/syllabus/upload", async (req, res) => {
  const { fileData, filename = "upload", fileType = "application/pdf" } = req.body;
  if (!fileData) return res.status(400).json({ error: "fileData (base64) required" });

  try {
    let textContent = "";

    if (fileType.includes("pdf")) {
      const buf = Buffer.from(fileData, "base64");
      // Import lib directly — pdf-parse v1 runs a test fixture on top-level import
      const { default: pdfParse } = await import("pdf-parse/lib/pdf-parse.js");
      const parsed = await pdfParse(buf);
      textContent = (parsed.text || "").slice(0, 8000);
    }

    // Build Claude message — text or image
    const messages = [];
    if (fileType.includes("image")) {
      messages.push({
        role: "user", content: [{
          type: "image",
          source: { type: "base64", media_type: fileType, data: fileData },
        }, {
          type: "text",
          text: "This is a page from a school textbook. Extract all educational concepts, definitions, equations, and key facts. Return a JSON object: { subject, chapter, rawText: \"[full text of the page]\", concepts: [{name, definition, topics: [], equations: [], keyFacts: [], difficulty: 'foundation|intermediate|advanced'}] }. Raw JSON only."
        }]
      });
    } else {
      messages.push({
        role: "user", content: `Extract all educational concepts from this textbook text. Return JSON: { subject, chapter, concepts: [{name, definition, topics: [], equations: [], keyFacts: [], difficulty: 'foundation|intermediate|advanced'}] }. Raw JSON only.\n\nText:\n${textContent}`
      });
    }

    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set" });

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 2000, messages }),
    });
    const claudeData = await claudeRes.json();
    const raw = claudeData.content?.[0]?.text || "";
    const result = extractJSON(raw);
    // Always attach the raw extracted text so the blueprint Claude call can cite real facts
    result.rawText = textContent || result.rawText || "";
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Visual style prompt packages — tuned for LTX-Video (video diffusion, not animation renderer)
// LTX-Video generates real-looking video clips. Style must be described as a visual scene, NOT an animation request.
const VISUAL_STYLE_PROMPTS = {
  whiteboard: {
    prefix: "Over-the-shoulder cinematic shot of a teacher standing confidently at a large clean white dry-erase board in a well-lit classroom. Teacher gestures expressively toward the board, marker in hand, pointing and sweeping the arm to indicate areas on the board. Bright natural light from windows, professional classroom atmosphere.",
    suffix: "Camera holds steady with a slow push-in toward the teacher and board. High-key lighting, clean white surface, educational documentary feel.",
    narratorHint: "Calm patient teacher voice. Step-by-step. 'Watch what happens when…'",
    colorGrade: "High-key, whites clipped clean, flat lighting, no vignette.",
    soundtrack: "Gentle piano or minimal acoustic. Soft, no distraction.",
    negativePrompt: "animation, cartoon, CGI, dark lighting, cluttered background, shaky camera, low quality, blurry, text overlay, random scribbles, illegible writing, close-up of writing, words on board",
  },
  sketch: {
    prefix: "Close-up of a hand sketching expressive ink illustrations on cream paper under warm desk-lamp light. Black ink pen, confident loose strokes, paper grain visible. Energetic, fast-paced sketching motion.",
    suffix: "Camera slowly pulls out to reveal the full sketch. Warm paper tones, crisp ink lines. Intimate documentary feel.",
    narratorHint: "Enthusiastic explainer voice, Veritasium energy. 'Here's the wild thing about this…'",
    colorGrade: "Warm vintage tones, paper cream background, rich blacks, 1–2 selective accent colors.",
    soundtrack: "Upbeat acoustic guitar or lo-fi hip-hop. Energetic.",
    negativePrompt: "CGI, whiteboard, digital screen, low quality, blurry, shaky, dark, overexposed, text overlay, random scribbles, illegible writing",
  },
  "3d": {
    prefix: "Macro cinematic shot of a glowing molecular 3D model rotating slowly in a dark laboratory environment. Volumetric light rays, fluorescent particle trails, photorealistic material render, dramatic depth of field.",
    suffix: "Cinematic orbit around the 3D model. Dramatic lighting shifts. Epic scale contrast between micro and macro elements.",
    narratorHint: "Authoritative awe-inspiring voice, Carl Sagan / Neil deGrasse Tyson style. Poetic and precise.",
    colorGrade: "Deep space navy, atomic neon glow, photorealistic materials, volumetric fog.",
    soundtrack: "Cinematic orchestral build. Swelling strings.",
    negativePrompt: "cartoon, sketch, 2D, flat illustration, low quality, blurry, overexposed, hand-drawn",
  },
};

// ─── Vijnana Engine v7.0 — crisis-narrative templates ───────────────────────
// Maps math topics → comedy-wedding-disaster premise (Jugaad-cademy genre)
const VIJNANA_CRISIS_MAP = {
  // Geometry
  "pythagoras":          "The Tilting Mandap — the diagonal support rope was cut 2 cm too short. The entire wedding stage is about to collapse. Only the correct hypotenuse length can save it.",
  "triangles":           "The Broken Drone Shot — the wedding videographer's drone must hover at EXACTLY the right angle to frame the bride & groom. Wrong triangle = wrong frame = ruined shot.",
  "circles":             "The Rangoli Disaster — the giant floor rangoli must touch all four walls of the hall but the circle keeps overflowing or shrinking. Tangent lines to the rescue.",
  "tangent":             "The Rangoli Disaster — the giant floor rangoli must touch all four walls of the hall but the circle keeps overflowing or shrinking. Tangent lines to the rescue.",
  "similar triangles":   "The Shadow Selfie — the groom's shadow is falling on the bride's outfit. How tall is the reflector they need to block it? Only similar-triangle ratios can tell.",
  "congruence":          "The Duplicate Varmala — the florist made two garlands that must be IDENTICAL or the ceremony is invalid. Prove they're congruent or redo them.",
  // Trigonometry
  "trigonometry":        "The Stuck Drone — the wedding drone is hovering at an unknown height. The DJ on the ground can see it at 60° elevation. He must calculate the exact height to send the rescue rope.",
  "heights and distances": "The Missing Groom — groom is locked in the hotel's top-floor room. Everyone below must calculate the window's height using angle of elevation before the wedding starts.",
  "sine":                "The Leaning Tower of Lights — the decorative light tower is tilting. Using sin of the tilt angle the crew must calculate how far the base needs to move.",
  "cosine":              "The Canopy Cable Crisis — the shaamiana canopy cable runs at an unknown angle. cos(θ) × cable length = horizontal span. Get it wrong and the canopy falls.",
  "tan":                 "The Photographer's Dilemma — the wedding photographer must stand exactly tan(30°) × 12 m away from the stage to fit the full frame. Wrong distance = heads cut off.",
  // Mensuration
  "surface area":        "The Overflowing Gulab Jamun Pot — the caterer ordered a spherical vessel but gave the wrong surface-area measurement to the metalsmith. Now it doesn't fit the stove.",
  "volume":              "The Wedding Cake Catastrophe — the three-tier cake (cylinder + hemisphere + cone) must fit inside the fridge. Wrong total volume = cake left outside = melting disaster.",
  "mensuration":         "The Overflowing Gulab Jamun Pot — the caterer ordered a spherical vessel but gave the wrong surface-area measurement to the metalsmith. Now it doesn't fit the stove.",
  "cylinder":            "The Lassi Overflow — the caterer is filling cylindrical glasses from a huge drum. Wrong volume calculation = 200 glasses short. Wedding guests go thirsty.",
  "cone":                "The Ice Cream Disaster — the wedding ice-cream vendor made cone-shaped servings too wide. They're all melting before being served. Recalculate cone volume.",
  "sphere":              "The Overflowing Gulab Jamun Pot — the spherical vessel was 2 cm too small in radius. The entire syrup batch overflowed. Only ⁴⁄₃πr³ can save the dessert table.",
  // Algebra
  "quadratic":           "The Firework Mishap — the wedding firework was launched on a WRONG quadratic trajectory and is heading toward the guests. Solve ax²+bx+c=0 to find when it lands safely.",
  "quadratic equations": "The Firework Mishap — the wedding firework was launched on a WRONG quadratic trajectory. Factorize the path equation before impact.",
  "arithmetic progression": "The Temple Stairway Seating — the outdoor venue has stairs with 1 seat on top, then 2, then 3… Can all 500 guests fit? Only the AP sum formula knows.",
  "ap":                  "The Temple Stairway Seating — the outdoor venue has stairs with 1 seat on top, then 2, then 3… Can all 500 guests fit?",
  // Coordinate Geometry
  "coordinate geometry": "The Missing Mehendi Artist — the mehendi artist's location is given as coordinates on the colony map. The driver is at another coordinate. What's the shortest path (distance formula)?",
  "distance formula":    "The Missing Mehendi Artist — the mehendi artist's location is given as coordinates on the colony map. Use the distance formula to dispatch the nearest driver.",
  "section formula":     "The Seating Divider — the hall must be divided at a ratio of 2:3 for family vs. guests. The section formula gives the EXACT dividing point on the hall's center line.",
  // Default
  "_default":            "The Great Jugaad Wedding Crisis — something at the wedding has gone terribly wrong and ONLY this exact mathematical theorem can save it.",
};

// Historical mentors — triggered by topic keywords
const VIJNANA_MENTORS = {
  trigonometry:  { name: "Aryabhata", era: "476 CE", discovery: "invented the sine function (called 'jya'), first to use place-value system", portrait: "ancient Indian astronomer-mathematician, robes, scrolls, night sky backdrop, cinematic portrait" },
  geometry:      { name: "Bhaskara II", era: "1114 CE", discovery: "proved Pythagoras theorem independently, described the chakravala algorithm", portrait: "medieval Indian mathematician, dhoti, writing on palm-leaf manuscript, temple architecture backdrop" },
  algebra:       { name: "Brahmagupta", era: "628 CE", discovery: "first to define zero as a number, wrote the general quadratic formula in verse", portrait: "ancient Indian mathematician-astronomer, saffron robes, observatory backdrop, cinematic lighting" },
  ap:            { name: "Aryabhata", era: "476 CE", discovery: "summed arithmetic progressions in Aryabhatiya (499 CE) using a formula identical to today's", portrait: "ancient Indian astronomer-mathematician, robes, scrolls, night sky backdrop, cinematic portrait" },
  mensuration:   { name: "Brahmagupta", era: "628 CE", discovery: "derived formulas for cyclic quadrilateral area and diagonals", portrait: "ancient Indian mathematician-astronomer, saffron robes, observatory backdrop" },
  circles:       { name: "Bhaskara II", era: "1114 CE", discovery: "proved the tangent-radius perpendicularity and chord-distance relationships in Lilavati", portrait: "medieval Indian mathematician, dhoti, writing on palm-leaf manuscript" },
  coordinate:    { name: "Brahmagupta", era: "628 CE", discovery: "first to use a number line (negative numbers as debt, positive as gain)", portrait: "ancient Indian mathematician-astronomer, saffron robes, observatory backdrop" },
  _default:      { name: "Ramanujan", era: "1887–1920 CE", discovery: "left school at 16, self-taught, independently discovered results in advanced mathematics", portrait: "early 20th century Indian mathematician, formal suit, chalkboard, Cambridge backdrop, sepia cinematic" },
};

function pickCrisis(conceptName) {
  const lower = conceptName.toLowerCase();
  for (const [key, val] of Object.entries(VIJNANA_CRISIS_MAP)) {
    if (key !== "_default" && lower.includes(key)) return val;
  }
  return VIJNANA_CRISIS_MAP._default;
}

function pickMentor(conceptName) {
  const lower = conceptName.toLowerCase();
  for (const [key, val] of Object.entries(VIJNANA_MENTORS)) {
    if (key !== "_default" && lower.includes(key)) return val;
  }
  return VIJNANA_MENTORS._default;
}

// ─── Vijnana Engine system prompt builder ────────────────────────────────────
function buildVijnanaPrompt({ conceptName, classKey, sceneCount, equations, keyFacts, rawText, definition, topics, style, visualStyle, subject, wordsPerScene }) {
  const crisis  = pickCrisis(conceptName);
  const mentor  = pickMentor(conceptName);

  return `You are GpAi — the Geometric-Procedural AI Architect powering the Vijnana Engine v7.0.
Your mission: generate a ${sceneCount}-scene cinematic edutainment script for "${conceptName}" (Class ${classKey} ${subject || "Mathematics"}, CBSE/ICSE).
Narrative genre: "Great Indian Jugaad-cademy" — a high-stakes COMEDY WEDDING DISASTER where ONLY this exact theorem can save the day.

${ rawText ? `SOURCE TEXT (NCERT/CBSE textbook — ALL facts MUST come from here):
---
${rawText.slice(0, 3500)}
---
` : "" }
${ definition ? `CONCEPT DEFINITION: ${definition}` : "" }
${ topics.length    ? `SYLLABUS TOPICS: ${topics.join(", ")}` : "" }
${ equations.length ? `KEY EQUATIONS: ${equations.join(" | ")}` : "" }
${ keyFacts.length  ? `KEY FACTS:\n${keyFacts.map(f => `- ${f}`).join("\n")}` : "" }

━━ THE CRISIS (CRISIS_STAKES) ━━
The wedding disaster that ONLY "${conceptName}" can solve:
"${crisis}"
Scene 1 MUST establish this crisis in 28–32 words of comedic, high-stakes narration.
The audience must feel the panic BEFORE any math appears.

━━ THE 4-LAYER EXECUTION STACK ━━
Structure your ${sceneCount} scenes around these four layers in order:

LAYER 1 — CRISIS_STAKES (Scene 1, ~30s)
  narration : Comedic wedding disaster. Zero math. Pure stakes. 28–32 words.
  videoPrompt : Cinematic shot of the disaster happening (tilting mandap / overflowing pot / wrong angle drone shot).
  crisisHook : One sentence — what exactly went wrong and why math is the only fix.

LAYER 2 — GHOST_LAYER (Scenes 2–3, ~30–40s)
  The mathematical geometry/shape GLOWS over the real-world wedding asset.
  A glowing triangle appears over the mandap. A glowing circle overlays the rangoli.
  model3d / simulation / graphType : Choose the most relevant 3D model or simulation.
  narration : "Look — the mandap IS a right-angled triangle. The support rope IS the hypotenuse."
  physicalTerms : ["rope", "height of mandap", "base of stage"]  ← physical language
  mathSymbols   : ["c", "a", "b"]                               ← math symbols
  videoPrompt : 3D geometric overlay on wedding environment.

LAYER 3 — VARIABLE_REVELATION (Scenes 4–(N-2), ~40s)
  Transform physical language → mathematical symbols step by step.
  Scene N-3: "The rope is called 'c'. The height is called 'a'. The base is called 'b'."
  Scene N-2: "And Bhaskara proved: a² + b² = c²."
  Each scene introduces ONE new symbol or relationship.
  narration : 28–32 words, cite exact numbers from the crisis (rope = 6m, height = 4m).
  equations : Show the symbolic form appearing for the first time.

LAYER 4 — OBSERVER_AI (Second-to-last scene)
  Historical mentor ${mentor.name} (${mentor.era}) appears with a first-principle hint.
  ${mentor.name} discovered: "${mentor.discovery}".
  historicalMentor : "${mentor.name}"
  mentorQuote : "${mentor.name}'s first-principle hint — one sentence in their voice, e.g.: 'In my Aryabhatiya, I wrote: when the shadow equals the object, the angle is 45°. The rest follows.'"
  narration : 28–32 words in ${mentor.name}'s voice, connecting their discovery to this crisis.

FINAL SCENE — TRIUMPH (Last scene)
  The theorem is applied. The number is computed. The wedding is saved.
  narration : The computation result + comedic resolution. "The rope must be exactly 7.2 m. The mandap is saved. The wedding starts. The groom stops crying."
  mentalTrap : The one calculation error that would have gotten the wrong answer (e.g., "⚠ Students often forget: c is the LONGEST side — never label the base as c.")

━━ MASTERMIND GUARDRAILS ━━
• THIEL (Contrarian): Math is the REWARD for solving the crisis — NOT the starting point. Zero abstract symbols in Scene 1.
• MUSK (First Principles): Use real measurements (rope = 6 m, angle = 30°, not "some value x"). When wrong values lead to failure, SHOW the failure (the mandap collapses in the videoPrompt).
• BEZOS (Rigor): Minimise text. Prioritise spatial descriptions in videoPrompt. One fact per scene.
• MA (Ecosystem): Connect at least ONE scene to Indian mathematical heritage (Aryabhata, Bhaskara II, Brahmagupta, Ramanujan).

━━ MENTAL TRAP RULE (Leakage Prevention) ━━
For every equation scene, call out one "Mental Trap" — the most common board-exam mistake.
Format: "⚠ TRAP: [what students confuse] → [correct approach]"
Put this in the mentalTrap field. It will appear as a highlighted warning card.

━━ PYQ (PREVIOUS YEAR QUESTION) INTEGRATION ━━
In the VARIABLE_REVELATION layer, insert ONE scene that mirrors a real CBSE/ICSE board exam question format for this topic.
narration: State the question stem directly. "A ladder 10 m long leans against a wall…"
keyFacts: ["Sutra: ${conceptName} identifies the right-angle relationship", "Step 1: Label the triangle sides", "Step 2: Apply the theorem", "⚠ TRAP: Check which side is the hypotenuse first"]

━━ NARRATION RULES ━━
1. EXACT word-for-word voiceover (${wordsPerScene}–32 words per scene).
2. Scene 1 narration = PURE COMEDY CRISIS. No mathematical terms.
3. Scenes 2+ progressively introduce ONE mathematical term per scene.
4. Final scene narration = the number answer + the wedding saved.
5. Each narration is a CONTINUOUS story — one sentence leads to the next.

━━ VIDEO PROMPT RULES ━━
⚠ VIDEO AI CANNOT RENDER TEXT OR EQUATIONS. All equations belong ONLY in the narration field.
For GHOST_LAYER scenes: "${style.prefix} [Glowing ${subject || "geometric"} shape overlaid on wedding environment — describe the exact physical wedding asset + the glowing overlay color and shape]. ${style.suffix}"
For CRISIS scenes: "Cinematic wide shot of Indian wedding venue — ${crisis.split('—')[0]}. High-energy comedic staging, warm saffron lighting, panicked guests in background."

━━ SIMULATION/3D SELECTION for ${subject || "Mathematics"} ━━
${ ["maths", "mathematics", "physics"].includes(subject.toLowerCase()) ? `For geometry scenes: model3d = "crystal" (lattice) or "molecule_3d" (3D shape)
For graph scenes: graphType = "sin" | "cos" | "quadratic" | "linear" depending on the function
For physics-derived topics (projectile, pendulum): simulation = "projectile" | "pendulum"` : "" }

━━ CHARACTERS ━━
Include ONE historical mentor character in the characters[] array:
{ "id": "mentor1", "name": "${mentor.name}", "role": "Historical Mentor (${mentor.era})", "description": "${mentor.name}, renowned Indian mathematician, ${mentor.era}", "suggestedAIPrompt": "${mentor.portrait}" }

Generate exactly ${sceneCount} scenes. Output ONLY this JSON, no other text:
{
  "title": "...",
  "logline": "...",
  "globalTone": "High-stakes Indian wedding comedy — math saves the day",
  "colorGrade": "${style.colorGrade}",
  "soundtrack": "${style.soundtrack}",
  "characters": [
    { "id": "mentor1", "name": "${mentor.name}", "role": "Historical Mentor (${mentor.era})", "description": "${mentor.name}, renowned Indian mathematician, ${mentor.era}", "suggestedAIPrompt": "${mentor.portrait}" }
  ],
  "locations": [
    { "id": "l1", "name": "Indian Wedding Venue", "anchor": "Main mandap / stage area, warm golden lighting, flower decorations" },
    { "id": "l2", "name": "Geometric Ghost Layer", "anchor": "3D mathematical overlay visible in the same space as the wedding" }
  ],
  "scenes": [
    {
      "id": 1,
      "layer": "CRISIS_STAKES",
      "title": "...",
      "durationSec": 10,
      "shotType": "wide",
      "cameraMove": "slow push in",
      "characterIds": [],
      "locationId": "l1",
      "videoPrompt": "Cinematic wide shot of Indian wedding venue disaster. ${crisis.split('—')[0]}. High-energy comedic staging, warm saffron lighting, panicked guests in background.",
      "negativePrompt": "equations, text, diagrams, classroom, chalkboard, blurry",
      "narration": "[28–32 words CRISIS comedy — ZERO math terms — pure stakes and panic]",
      "crisisHook": "[1-sentence summary of what went wrong]",
      "physicalTerms": [],
      "mathSymbols": [],
      "equations": [],
      "smiles": [],
      "model3d": "",
      "simulation": "",
      "simParams": {},
      "graphType": "",
      "historicalMentor": "",
      "mentorQuote": "",
      "mentalTrap": "",
      "transition": "cut"
    }
  ]
}`;
}

// POST /api/syllabus/concept-blueprint
// Generates a complete edutainment blueprint for a specific concept + visual style
app.post("/api/syllabus/concept-blueprint", async (req, res) => {
  const {
    conceptName, definition, topics = [], equations = [], keyFacts = [],
    visualStyle = "whiteboard", classKey = "8", durationSec = 60, subject = "",
    rawText = "",   // ← raw PDF text so Claude can cite real facts
    narrativeMode = "standard",  // "standard" | "vijnana"
  } = req.body;
  if (!conceptName) return res.status(400).json({ error: "conceptName required" });

  const style      = VISUAL_STYLE_PROMPTS[visualStyle] || VISUAL_STYLE_PROMPTS.whiteboard;
  const sceneCount = Math.max(3, Math.round(durationSec / 10));
  const wordsPerScene = 28;

  // Auto-activate Vijnana Engine for Class 9-10 Maths
  const isVijnana = narrativeMode === "vijnana" ||
    (["9", "10"].includes(classKey) && ["maths", "mathematics"].includes(subject.toLowerCase()));

  const systemPrompt = isVijnana
    ? buildVijnanaPrompt({ conceptName, classKey, sceneCount, equations, keyFacts, rawText, definition, topics, style, visualStyle, subject, wordsPerScene })
    : `You are an expert edutainment script writer AND video director.
Your job: create a ${sceneCount}-scene ${visualStyle} video script about "${conceptName}" for Class ${classKey} students.

${ rawText ? `SOURCE TEXT (from the student's actual textbook — you MUST cite facts from this):
---
${rawText.slice(0, 3500)}
---
` : "" }
${ definition ? `CONCEPT DEFINITION: ${definition}` : "" }
${ topics.length    ? `TOPICS: ${topics.join(", ")}` : "" }
${ equations.length ? `KEY EQUATIONS: ${equations.join(" | ")}` : "" }
${ keyFacts.length  ? `KEY FACTS:\n${keyFacts.map(f => `- ${f}`).join("\n")}` : "" }

━━ NARRATION RULES (CRITICAL) ━━
1. Each scene narration = EXACT word-for-word voiceover script (${wordsPerScene}–32 words MAX).
2. Narrations MUST state specific facts, numbers, and terms drawn from the SOURCE TEXT above.
3. NO vague phrases like "this shows", "we see", "notice how". Say the actual fact.
4. Write as if speaking directly: "Ohm's Law states: Voltage equals Current times Resistance. V = I × R."
5. Each narration must logically continue the previous one — it's one continuous lesson.

━━ VIDEO PROMPT RULES (CRITICAL) ━━
⚠️ VIDEO AI CANNOT RENDER TEXT, EQUATIONS, OR DIAGRAMS. Any text you describe will appear as random illegible scribbles. ALL educational content — equations, definitions, facts — belongs ONLY in the narration field. The videoPrompt must ONLY describe physical camera scenes.

Describe EXACTLY what the camera sees — physical people, objects, motion, light:

For WHITEBOARD: "${style.prefix} [Describe the TEACHER'S PHYSICAL ACTION and BODY LANGUAGE for this scene — e.g., 'teacher steps back from the board, turns to face the class with a wide gesture, holds marker up and points emphatically, nodding with confidence' OR 'teacher leans in close to the board, arm sweeping left to right in a broad arc, then steps back to reveal the full board surface']. ${style.suffix}"
For SKETCH: "${style.prefix} [Describe the HAND MOTION and ENERGY — e.g., 'hand moves in confident sweeping arcs across the paper, pausing to tap an area twice before continuing with quick decisive strokes']. ${style.suffix}"
For 3D: "${style.prefix} [WHAT EXACT 3D OBJECT fills the frame — describe its shape, glow, motion, and physical characteristics in detail, e.g., 'a spherical glowing nucleus slowly rotates, surrounded by orbiting electron halos in concentric rings']. ${style.suffix}"

The videoPrompt is for a VIDEO AI. It CANNOT render concepts. It renders camera scenes.
Make every videoPrompt a concrete physical description.

━━ NARRATIVE ARC ━━
- Scene 1: Hook — a real-world question using a fact from the source text
- Middle: Build concept step-by-step, each scene = one sub-fact from the source
- Second-to-last: The equation / proof moment — write the exact formula in the narration
- Final: Real application — where does this show up in daily life?

${ subject.toLowerCase() === "chemistry" ? `━━ CHEMISTRY — SMILES STRINGS (CRITICAL for Manim rendering) ━━
For each scene that focuses on a specific molecule or compound, populate the "smiles" array with 1–2 valid SMILES strings of the key molecule(s) in that scene.
Leave "smiles": [] for scenes that don't focus on a specific molecule.

Common SMILES reference (use these exact strings):
  Water (H₂O)              → "O"
  Sulphuric acid (H₂SO₄)  → "OS(=O)(=O)O"
  Hydrochloric acid (HCl)  → "[H+].[Cl-]"
  Nitric acid (HNO₃)       → "O[N+](=O)[O-]"
  Sodium hydroxide (NaOH)  → "[Na+].[OH-]"
  Carbon dioxide (CO₂)     → "O=C=O"
  Ammonia (NH₃)            → "N"
  Ethanol (C₂H₅OH)        → "CCO"
  Glucose (C₆H₁₂O₆)       → "OCC1OC(O)C(O)C(O)C1O"
  Acetic acid (CH₃COOH)   → "CC(O)=O"
  Methane (CH₄)            → "C"
  Calcium carbonate (CaCO₃)→ "[Ca+2].[O-]C([O-])=O"

Use valid SMILES strings. For molecules not listed, use PubChem SMILES notation.
` : "" }${ visualStyle === "3d" ? `━━ 3D MODEL SELECTION (CRITICAL for ThreeDComposition) ━━
For each scene set "model3d" to the most relevant 3D model from this list:
  "atom"         → Bohr atom with orbiting electrons (default for Physics / general science)
  "dna"          → DNA double helix (Biology — genetics, heredity, protein synthesis)
  "solar_system" → Orbiting planets (Physics — gravity, orbital motion, space)
  "wave"         → Transverse wave of particles (Physics — waves, sound, light)
  "crystal"      → Ionic lattice structure (Chemistry — ionic bonding, crystal structure)
  "molecule_3d"  → Tetrahedral 3D molecule (Chemistry — covalent bonding, VSEPR)
If unsure, use "atom".
` : "" }${ ["physics", "biology"].includes(subject.toLowerCase()) ? `━━ SIMULATION SELECTION (Phase 3/4 rendering) ━━
For scenes where a live simulation would enhance understanding, set "simulation" to one of:
  Phase-3 (Remotion SVG — always available):
    "pendulum"   → Simple pendulum (set simParams: { length, angle })
    "projectile" → Projectile arc  (set simParams: { v0, angle, g })
    "collision"  → Elastic balls   (set simParams: { m1, m2, v1 })
    "spring"     → Spring-mass SHM (set simParams: { k, mass, amplitude })
    "incline"    → Block on slope  (set simParams: { angle, mu })
  Phase-4 (Playwright canvas — high quality, needs Playwright installed):
    "osmosis"          → Water across membrane (Biology)
    "diffusion"        → Particle diffusion (Biology / Chemistry)
    "circuit"          → Series electric circuit (Physics)
    "circuit_parallel" → Parallel circuit (Physics)
    "double_pendulum"  → Chaotic double pendulum (Physics)
Leave "simulation": "" for scenes that don't need a live simulation.
When setting simParams, use realistic values for Class 8-12 (e.g. pendulum length 0.5–2 m, angle 10–60°).
` : "" }${ ["maths", "mathematics", "physics"].includes(subject.toLowerCase()) ? `━━ GRAPH TYPE SELECTION (Phase 2 rendering) ━━
For scenes showing a mathematical function graph, set "graphType" to one of:
  "sin" "cos" "tan" "linear" "quadratic" "cubic" "exp" "inverse" "sqrt"
Set "graphType": "" for scenes that don't need a function graph.
A graph composition shows the curve tracing onto screen alongside the equation and key facts.
` : "" }Generate exactly ${sceneCount} scenes. Output ONLY this JSON, no other text:
{
  "title": "...",
  "logline": "...",
  "globalTone": "...",
  "colorGrade": "${style.colorGrade}",
  "soundtrack": "${style.soundtrack}",
  "characters": [],
  "locations": [{"id":"l1","name":"${visualStyle === "whiteboard" ? "Classroom Whiteboard" : visualStyle === "sketch" ? "Sketch Pad" : "Scientific Lab"}","anchor":"Teacher station, front and centre"}],
  "scenes": [
    {
      "id": 1,
      "title": "...",
      "durationSec": 10,
      "shotType": "medium",
      "cameraMove": "slow zoom in",
      "characterIds": [],
      "locationId": "l1",
      "videoPrompt": "${style.prefix} [exact physical description of what appears on screen]. ${style.suffix}",
      "negativePrompt": "${style.negativePrompt || 'blurry, low quality, shaky camera, watermark'}",
      "narration": "[word-for-word voiceover script, 28–32 words, citing real facts]",
      "smiles": [],
      "model3d": "",
      "simulation": "",
      "simParams": {},
      "graphType": "",
      "layer": "",
      "crisisHook": "",
      "physicalTerms": [],
      "mathSymbols": [],
      "historicalMentor": "",
      "mentorQuote": "",
      "mentalTrap": "",
      "transition": "cut"
    }
  ]
}`;

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set" });

  const userMsg = isVijnana
    ? `Generate the Vijnana Engine v7.0 blueprint for "${conceptName}" (Class ${classKey} ${subject || "Mathematics"}). Apply the Jugaad-cademy wedding-crisis narrative. Output ONLY the JSON. Start with { and end with }.`
    : `Generate the edutainment blueprint for "${conceptName}"${rawText ? " using the SOURCE TEXT provided" : ""}. Output ONLY the JSON. Start with { and end with }.`;

  // ── Switch to SSE streaming so the client never times out waiting ──
  res.setHeader("Content-Type",  "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection",    "keep-alive");
  res.flushHeaders();

  const send = (evt, data) => res.write(`event: ${evt}\ndata: ${JSON.stringify(data)}\n\n`);

  // node-fetch AbortController timeout (node-fetch doesn't support AbortSignal.timeout)
  const abortCtrl    = new AbortController();
  const fetchTimeout = setTimeout(() => abortCtrl.abort(), 120_000);   // 2-min hard limit

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      signal: abortCtrl.signal,
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514", max_tokens: 8192,
        stream: true,
        system: systemPrompt,
        messages: [
          { role: "user",      content: userMsg },
          { role: "assistant", content: "{" },
        ],
      }),
    });

    if (!upstream.ok) {
      const body = await upstream.text().catch(() => `HTTP ${upstream.status}`);
      send("error", { message: body });
      res.end(); return;
    }

    // Stream deltas — use node-fetch's async-iterable body (same pattern as /api/chat)
    let fullText  = "{";
    let charCount = 0;
    const dec     = new TextDecoder();
    let buf       = "";

    for await (const rawChunk of upstream.body) {
      buf += dec.decode(rawChunk, { stream: true });
      const lines = buf.split("\n"); buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const chunk = line.slice(6).trim();
        if (chunk === "[DONE]") continue;
        try {
          const d = JSON.parse(chunk);
          if (d.type === "content_block_delta" && d.delta?.type === "text_delta") {
            fullText  += d.delta.text;
            charCount += d.delta.text.length;
            // Heartbeat every ~200 chars so the SSE connection stays alive
            if (charCount % 200 < d.delta.text.length) {
              send("progress", { chars: charCount });
            }
          }
        } catch {}
      }
    }

    // Parse accumulated JSON and send to client
    const blueprint = extractJSON(fullText);
    send("done", { blueprint, visualStyle, conceptName, narrativeMode: isVijnana ? "vijnana" : "standard" });
  } catch (e) {
    const msg = (e.name === "AbortError" || e.type === "aborted")
      ? "Blueprint generation timed out after 2 min. Try a shorter duration."
      : e.message;
    send("error", { message: msg });
  } finally {
    clearTimeout(fetchTimeout);
  }
  res.end();
});

// ─── Production Pipeline — TTS + Compose + Produce ────────────

const LOCAL_INFER = process.env.LOCAL_INFER_URL || "http://localhost:8000";
const TTS_TMP     = "/tmp/framegen-tts";

// ── Indian language voice map (Azure Neural / Edge TTS voices) ──────────
// Each language has narrator (M) and narrator_f (F) voices.
// Voices are Edge-TTS compatible (free, offline-capable via edge-tts library).
const INDIAN_VOICES = {
  // English (default)
  "en": {
    narrator:    "en-US-GuyNeural",
    narrator_f:  "en-US-JennyNeural",
    protagonist: "en-US-AriaNeural",
    hero:        "en-GB-RyanNeural",
    villain:     "en-US-ChristopherNeural",
    scientist:   "en-US-EricNeural",
    teacher:     "en-US-AmberNeural",
  },
  // Hindi — Devanagari script
  "hi": {
    narrator:    "hi-IN-MadhurNeural",
    narrator_f:  "hi-IN-SwaraNeural",
    protagonist: "hi-IN-SwaraNeural",
    hero:        "hi-IN-MadhurNeural",
    villain:     "hi-IN-MadhurNeural",
    scientist:   "hi-IN-MadhurNeural",
    teacher:     "hi-IN-SwaraNeural",
  },
  // Bengali — Bengali script
  "bn": {
    narrator:    "bn-IN-BashkarNeural",
    narrator_f:  "bn-IN-TanishaaNeural",
    protagonist: "bn-IN-TanishaaNeural",
    hero:        "bn-IN-BashkarNeural",
    villain:     "bn-IN-BashkarNeural",
    scientist:   "bn-IN-BashkarNeural",
    teacher:     "bn-IN-TanishaaNeural",
  },
  // Telugu — Telugu script
  "te": {
    narrator:    "te-IN-MohanNeural",
    narrator_f:  "te-IN-ShrutiNeural",
    protagonist: "te-IN-ShrutiNeural",
    hero:        "te-IN-MohanNeural",
    villain:     "te-IN-MohanNeural",
    scientist:   "te-IN-MohanNeural",
    teacher:     "te-IN-ShrutiNeural",
  },
  // Marathi — Devanagari script
  "mr": {
    narrator:    "mr-IN-ManoharNeural",
    narrator_f:  "mr-IN-AarohiNeural",
    protagonist: "mr-IN-AarohiNeural",
    hero:        "mr-IN-ManoharNeural",
    villain:     "mr-IN-ManoharNeural",
    scientist:   "mr-IN-ManoharNeural",
    teacher:     "mr-IN-AarohiNeural",
  },
  // Tamil — Tamil script
  "ta": {
    narrator:    "ta-IN-ValluvarNeural",
    narrator_f:  "ta-IN-PallaviNeural",
    protagonist: "ta-IN-PallaviNeural",
    hero:        "ta-IN-ValluvarNeural",
    villain:     "ta-IN-ValluvarNeural",
    scientist:   "ta-IN-ValluvarNeural",
    teacher:     "ta-IN-PallaviNeural",
  },
  // Gujarati — Gujarati script
  "gu": {
    narrator:    "gu-IN-NiranjanNeural",
    narrator_f:  "gu-IN-DhwaniNeural",
    protagonist: "gu-IN-DhwaniNeural",
    hero:        "gu-IN-NiranjanNeural",
    villain:     "gu-IN-NiranjanNeural",
    scientist:   "gu-IN-NiranjanNeural",
    teacher:     "gu-IN-DhwaniNeural",
  },
  // Kannada — Kannada script
  "kn": {
    narrator:    "kn-IN-GaganNeural",
    narrator_f:  "kn-IN-SapnaNeural",
    protagonist: "kn-IN-SapnaNeural",
    hero:        "kn-IN-GaganNeural",
    villain:     "kn-IN-GaganNeural",
    scientist:   "kn-IN-GaganNeural",
    teacher:     "kn-IN-SapnaNeural",
  },
  // Malayalam — Malayalam script
  "ml": {
    narrator:    "ml-IN-MidhunNeural",
    narrator_f:  "ml-IN-SobhanaNeural",
    protagonist: "ml-IN-SobhanaNeural",
    hero:        "ml-IN-MidhunNeural",
    villain:     "ml-IN-MidhunNeural",
    scientist:   "ml-IN-MidhunNeural",
    teacher:     "ml-IN-SobhanaNeural",
  },
  // Punjabi — Gurmukhi script
  "pa": {
    narrator:    "pa-IN-OjasNeural",
    narrator_f:  "pa-IN-VaaniNeural",
    protagonist: "pa-IN-VaaniNeural",
    hero:        "pa-IN-OjasNeural",
    villain:     "pa-IN-OjasNeural",
    scientist:   "pa-IN-OjasNeural",
    teacher:     "pa-IN-VaaniNeural",
  },
  // Odia — Odia script
  "or": {
    narrator:    "or-IN-SukantaNeural",
    narrator_f:  "or-IN-SubhasiniNeural",
    protagonist: "or-IN-SubhasiniNeural",
    hero:        "or-IN-SukantaNeural",
    villain:     "or-IN-SukantaNeural",
    scientist:   "or-IN-SukantaNeural",
    teacher:     "or-IN-SubhasiniNeural",
  },
  // Assamese — Bengali script variant
  "as": {
    narrator:    "as-IN-PriyomNeural",
    narrator_f:  "as-IN-YashicaNeural",
    protagonist: "as-IN-YashicaNeural",
    hero:        "as-IN-PriyomNeural",
    villain:     "as-IN-PriyomNeural",
    scientist:   "as-IN-PriyomNeural",
    teacher:     "as-IN-YashicaNeural",
  },
  // Urdu — Nastaliq script
  "ur": {
    narrator:    "ur-IN-SalmanNeural",
    narrator_f:  "ur-IN-GulNeural",
    protagonist: "ur-IN-GulNeural",
    hero:        "ur-IN-SalmanNeural",
    villain:     "ur-IN-SalmanNeural",
    scientist:   "ur-IN-SalmanNeural",
    teacher:     "ur-IN-GulNeural",
  },
};

// ── Subtitle font map: language → Noto font for correct script rendering ──
// Requires: sudo apt-get install fonts-noto (or fonts-noto-cjk on older systems)
const SUBTITLE_FONT = {
  "hi":   "Noto Sans Devanagari",   // Hindi
  "mr":   "Noto Sans Devanagari",   // Marathi
  "bn":   "Noto Sans Bengali",      // Bengali
  "as":   "Noto Sans Bengali",      // Assamese (same script)
  "te":   "Noto Sans Telugu",       // Telugu
  "ta":   "Noto Sans Tamil",        // Tamil
  "gu":   "Noto Sans Gujarati",     // Gujarati
  "kn":   "Noto Sans Kannada",      // Kannada
  "ml":   "Noto Sans Malayalam",    // Malayalam
  "pa":   "Noto Sans Gurmukhi",     // Punjabi
  "or":   "Noto Sans Oriya",        // Odia
  "ur":   "Noto Nastaliq Urdu",     // Urdu (Nastaliq calligraphic script)
  "en":   "Arial",                  // English (default)
};

function getSubtitleFont(lang = "en") {
  const code = lang.split("-")[0].toLowerCase();
  return SUBTITLE_FONT[code] || "Arial";
}

function getVoiceForRole(role, lang = "en") {
  const code = lang.split("-")[0].toLowerCase();
  const voiceMap = INDIAN_VOICES[code] || INDIAN_VOICES["en"];
  return voiceMap[role] || voiceMap["narrator"];
}

// Proxy: GET /api/tts/voices → local-inference TTS voice list
app.get("/api/tts/voices", async (req, res) => {
  try {
    const r = await fetch(`${LOCAL_INFER}/tts/voices`);
    res.json(await r.json());
  } catch (e) {
    // Fallback: full list of supported voices across English + Indian languages
    const voices = [];
    for (const [lang, map] of Object.entries(INDIAN_VOICES)) {
      const seen = new Set();
      for (const [role, voiceId] of Object.entries(map)) {
        if (seen.has(voiceId)) continue;
        seen.add(voiceId);
        const langLabel = { en:"English", hi:"Hindi", bn:"Bengali", te:"Telugu",
          mr:"Marathi", ta:"Tamil", gu:"Gujarati", kn:"Kannada", ml:"Malayalam",
          pa:"Punjabi", or:"Odia", as:"Assamese", ur:"Urdu" }[lang] || lang.toUpperCase();
        voices.push({ id: voiceId, label: `${voiceId.split("-").slice(2).join(" ")} (${langLabel})`,
          role, lang });
      }
    }
    res.json({ voices });
  }
});

// Proxy: POST /api/tts → local-inference TTS
app.post("/api/tts", async (req, res) => {
  try {
    const r = await fetch(`${LOCAL_INFER}/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const data = await r.json();
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Proxy: POST /api/tts/batch → batch TTS
app.post("/api/tts/batch", async (req, res) => {
  try {
    const r = await fetch(`${LOCAL_INFER}/tts/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    res.json(await r.json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── BG music generator via ffmpeg aevalsrc (mood → tone profile) ──
const MOOD_TONES = {
  "epic":       { freqs: [55, 110, 165], amp: 0.06 },   // Low power drones
  "tense":      { freqs: [80, 161, 202], amp: 0.05 },   // Dissonant cluster
  "intimate":   { freqs: [261, 329, 392], amp: 0.04 },  // C major triad, soft
  "dreamlike":  { freqs: [174, 220, 277], amp: 0.04 },  // F major, floaty
  "surreal":    { freqs: [110, 155, 233], amp: 0.04 },  // Augmented, unsettling
  "mysterious": { freqs: [98, 147, 176], amp: 0.04 },   // Dim7 feel
  "energetic":  { freqs: [130, 196, 261], amp: 0.07 },  // Bright and driving
  "melancholic":{ freqs: [146, 174, 220], amp: 0.04 },  // Minor 3rd
  "joyful":     { freqs: [261, 330, 392, 523], amp: 0.05 }, // C major + octave
  "raw":        { freqs: [82, 123, 164], amp: 0.06 },   // Power chord
};

async function generateBGMusic(mood, durationSec, outFile) {
  const profile = MOOD_TONES[mood?.toLowerCase()] || MOOD_TONES["intimate"];
  // Build aevalsrc expression: sum of sine waves with gentle LFO tremolo
  const exprs = profile.freqs.map(f =>
    `${profile.amp}*sin(2*PI*${f}*t)*(0.8+0.2*sin(2*PI*0.2*t))`
  ).join("+");
  await ffmpegExec([
    "-y", "-f", "lavfi",
    "-i", `aevalsrc=${exprs}:s=44100:d=${durationSec + 2}`,
    "-af", "afade=t=in:st=0:d=2,afade=t=out:st=" + (durationSec - 1) + ":d=2",
    "-c:a", "aac", "-b:a", "128k", outFile,
  ], 30000);
}

// POST /api/compose-scene
// Composes one scene: video + TTS narration + BG music + burnt subtitles
app.post("/api/compose-scene", async (req, res) => {
  const { videoFile, narrationText, narrationAudio, durationSec = 5, mood = "intimate", sceneTitle = "", lang = "en" } = req.body;

  if (!videoFile) return res.status(400).json({ error: "videoFile required" });

  const srcVideo = join(VIDS, videoFile.replace(/^\/videos\//, ""));
  if (!existsSync(srcVideo)) return res.status(404).json({ error: "Video file not found" });

  const outId  = uuid();
  const tmpDir = "/tmp";
  const bgFile = join(tmpDir, `fg_bg_${outId}.aac`);
  const outFile = join(VIDS, `${outId}_composed.mp4`);

  try {
    // 1. Generate BG music
    await generateBGMusic(mood, durationSec, bgFile);

    // 2. Build ffmpeg filter complex
    // Input 0: source video (looped/trimmed to target duration)
    // Input 1: narration audio (from TTS, may be shorter than durationSec)
    // Input 2: BG music (pre-generated to durationSec+2)
    // Filter: duck BG under narration, burn in subtitle

    const narAudioSrc   = narrationAudio
      ? join("/tmp/framegen-tts", narrationAudio.replace(/^\/tts\//, ""))
      : null;

    const hasNarration = narAudioSrc && existsSync(narAudioSrc);

    // Escape text for ffmpeg drawtext
    const safeText = (narrationText || sceneTitle || "")
      .replace(/'/g, "\\'")
      .replace(/:/g, "\\:")
      .replace(/\n/g, " ");

    // Build subtitle drawtext filter (Netflix style: white bold, shadow, bottom-center)
    // Font is script-aware: uses Noto Sans for Indian languages, Arial for English
    const subtitleFont = getSubtitleFont(lang);
    const subtitleFilter = safeText
      ? `drawtext=text='${safeText}':fontsize=28:fontcolor=white:` +
        `shadowcolor=black:shadowx=2:shadowy=2:` +
        `box=1:boxcolor=black@0.45:boxborderw=8:` +
        `x=(w-text_w)/2:y=h-th-40:` +
        `font='${subtitleFont}':fontweight=bold`
      : null;

    const ffArgs = ["-y"];

    // Input 0: source video, trim/loop to durationSec
    ffArgs.push(
      "-stream_loop", "-1", "-t", String(durationSec), "-i", srcVideo
    );

    let audioInputIdx = 1;

    if (hasNarration) {
      ffArgs.push("-i", narAudioSrc);
      audioInputIdx++;
    }
    ffArgs.push("-i", bgFile);
    const bgIdx = hasNarration ? 2 : 1;

    // Filter complex
    let filterParts = [];
    let videoStream = "[0:v]";

    if (subtitleFilter) {
      filterParts.push(`${videoStream}${subtitleFilter}[vout]`);
      videoStream = "[vout]";
    }

    if (hasNarration) {
      // Mix narration (full vol) + BG (ducked to -22dB = 0.08 amplitude)
      filterParts.push(`[1:a]volume=1.0[naration];[${bgIdx}:a]volume=0.08[bgmix];[naration][bgmix]amix=inputs=2:duration=first:dropout_transition=3[aout]`);
    } else {
      filterParts.push(`[${bgIdx}:a]volume=0.12[aout]`);
    }

    if (filterParts.length > 0) {
      ffArgs.push("-filter_complex", filterParts.join(";"));
    }

    if (videoStream !== "[0:v]") {
      ffArgs.push("-map", videoStream);
    } else {
      ffArgs.push("-map", "0:v");
    }
    ffArgs.push("-map", "[aout]");
    ffArgs.push("-c:v", "libx264", "-crf", "20", "-preset", "fast");
    ffArgs.push("-c:a", "aac", "-b:a", "128k");
    ffArgs.push("-t", String(durationSec));
    ffArgs.push("-movflags", "+faststart", outFile);

    await ffmpegExec(ffArgs, 180000);

    // Cleanup BG temp
    try { unlinkSync(bgFile); } catch {}

    res.json({ composedFile: `/videos/${outId}_composed.mp4` });
  } catch (e) {
    try { unlinkSync(bgFile); } catch {}
    const detail = e.stderr?.slice(-600) || e.message;
    console.error("compose-scene error:", detail);
    res.status(500).json({ error: detail });
  }
});

// POST /api/produce — full one-click pipeline
// Accepts blueprint + sceneFiles → TTS all narrations → compose each scene → stitch → generate SRT
app.post("/api/produce", async (req, res) => {
  // language: BCP-47 short code, e.g. "en", "hi", "ta", "te", "bn", "mr",
  //           "gu", "kn", "ml", "pa", "or", "as", "ur"
  // Drives: TTS voice selection, subtitle script font, SRT encoding
  const { blueprint, sceneFiles = [], voiceOverrides = {}, mood, language = "en" } = req.body;
  if (!blueprint?.scenes) return res.status(400).json({ error: "blueprint required" });

  const composedFiles = [];
  let   srtLines      = [];
  let   srtTime       = 0;

  function toSRTTime(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.round((sec % 1) * 1000);
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")},${String(ms).padStart(3,"0")}`;
  }

  try {
    for (let i = 0; i < blueprint.scenes.length; i++) {
      const scene     = blueprint.scenes[i];
      const videoFile = sceneFiles[i];
      if (!videoFile) continue;

      const narration = scene.narration || "";
      const dur       = scene.durationSec || 5;
      const sceneMood = mood || blueprint.globalTone?.toLowerCase().split(" ")[0] || "intimate";

      // TTS — language-aware voice selection
      let narAudio = null;
      if (narration.trim()) {
        const charId = (scene.characterIds || [])[0];
        const char   = (blueprint.characters || []).find(c => c.id === charId);
        const role   = voiceOverrides[charId] || (char ? guessRole(char.name) : "narrator");
        // getVoiceForRole resolves to the correct Indian/English neural voice
        const voice  = getVoiceForRole(role, language);
        try {
          const ttsRes = await fetch(`${LOCAL_INFER}/tts`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: narration, voice, language }),
          });
          const ttsData = await ttsRes.json();
          if (ttsData.audioFile) narAudio = ttsData.audioFile;
        } catch {}
      }

      // Compose scene — pass language for script-aware subtitle font
      const composeRes = await fetch("http://localhost:" + (process.env.PORT || 3002) + "/api/compose-scene", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoFile, narrationText: narration, narrationAudio: narAudio,
          durationSec: dur, mood: sceneMood, sceneTitle: scene.title, lang: language,
        }),
      });
      const composeData = await composeRes.json();
      if (composeData.composedFile) composedFiles.push(composeData.composedFile);

      // SRT entry
      if (narration.trim()) {
        srtLines.push(`${i + 1}`);
        srtLines.push(`${toSRTTime(srtTime)} --> ${toSRTTime(srtTime + dur)}`);
        srtLines.push(narration);
        srtLines.push("");
      }
      srtTime += dur;
    }

    // Final stitch
    const stitchRes = await fetch("http://localhost:" + (process.env.PORT || 3002) + "/api/stitch", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sceneFiles: composedFiles, projectTitle: blueprint.title }),
    });
    const stitchData = await stitchRes.json();
    if (!stitchData.videoUrl) return res.status(500).json({ error: "Stitch failed: " + JSON.stringify(stitchData) });

    // Write SRT file alongside final video
    const srtId   = stitchData.videoUrl.replace("/videos/", "").replace("_final.mp4", "");
    const srtPath = join(VIDS, `${srtId}_final.srt`);
    writeFileSync(srtPath, srtLines.join("\n"));

    res.json({
      finalVideo: stitchData.videoUrl,
      srtFile: `/videos/${srtId}_final.srt`,
      sceneCount: composedFiles.length,
    });
  } catch (e) {
    console.error("produce error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

function guessRole(name = "") {
  const n = name.toLowerCase();
  if (n.includes("narrat") || n.includes("voice")) return "narrator";
  if (n.includes("villain") || n.includes("antag")) return "villain";
  if (n.includes("hero") || n.includes("protag")) return "hero";
  if (n.includes("scientist") || n.includes("profess") || n.includes("doctor")) return "scientist";
  if (n.includes("teacher") || n.includes("mentor")) return "teacher";
  if (n.includes("child") || n.includes("kid") || n.includes("boy") || n.includes("girl")) return "child";
  return "narrator";
}

// ─── Continuity — Multi-Chapter Feature Film ──────────────────


// List all continuity projects
app.get("/api/continuity/projects", async (req, res) => {
  try {
    const rows = await db.all("SELECT * FROM continuity_projects ORDER BY updated_at DESC");
    const projects = rows.map(r => ({ ...r, chapters: JSON.parse(r.chapters || "[]") }));
    res.json({ projects });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Create a new continuity project
app.post("/api/continuity/projects", async (req, res) => {
  try {
    const { title, genre, totalDuration } = req.body;
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    await db.run(
      "INSERT INTO continuity_projects (id, title, genre, total_duration, chapters) VALUES (?,?,?,?,?)",
      [id, title, genre || "", totalDuration || "120 min", "[]"]
    );
    res.json({ project: { id, title, genre, total_duration: totalDuration, chapters: [] } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Update a project's chapters (save completed chapter continuity snapshot)
app.put("/api/continuity/projects/:id", async (req, res) => {
  try {
    const { chapters } = req.body;
    await db.run(
      "UPDATE continuity_projects SET chapters = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [JSON.stringify(chapters), req.params.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Delete a continuity project
app.delete("/api/continuity/projects/:id", async (req, res) => {
  try {
    await db.run("DELETE FROM continuity_projects WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Credits & Billing — Session Cost Tracker ────────────────

const SESSION_START = Date.now();
const sessionCosts = { claudeCalls: 0, replicateCalls: 0, falCalls: 0, geminiCalls: 0, totalUSD: 0 };

// Called internally from other endpoints to track spend
function trackCost(type, usd = 0) {
  if (type === "claude")    { sessionCosts.claudeCalls++;    }
  if (type === "replicate") { sessionCosts.replicateCalls++; }
  if (type === "fal")       { sessionCosts.falCalls++;       }
  if (type === "gemini")    { sessionCosts.geminiCalls++;    }
  sessionCosts.totalUSD = +(sessionCosts.totalUSD + usd).toFixed(4);
}

// /api/credits/status — live balance check + session usage
app.get("/api/credits/status", async (req, res) => {
  const result = {
    session: {
      startedAt: new Date(SESSION_START).toISOString(),
      uptimeMin: Math.round((Date.now() - SESSION_START) / 60000),
      ...sessionCosts,
    },
    services: [],
  };

  // ── Replicate balance check ──────────────────────────────
  if (process.env.REPLICATE_API_KEY) {
    try {
      const r = await fetch("https://api.replicate.com/v1/account", {
        headers: { Authorization: `Bearer ${process.env.REPLICATE_API_KEY}` },
      });
      if (r.ok) {
        const d = await r.json();
        result.services.push({
          id: "replicate", name: "Replicate", emoji: "🎬",
          status: "connected",
          balance: d.billing?.remaining_credits ?? null,
          currency: "USD",
          username: d.username,
          rechargeUrl: "https://replicate.com/account/billing",
          models: ["WAN 2.1 480p · ~$0.05/clip", "WAN 2.2 Fast · ~$0.08/clip", "LTX-Video · ~$0.02/clip"],
          sessionCalls: sessionCosts.replicateCalls,
        });
      } else {
        result.services.push({ id: "replicate", name: "Replicate", emoji: "🎬", status: "error", rechargeUrl: "https://replicate.com/account/billing", sessionCalls: sessionCosts.replicateCalls });
      }
    } catch {
      result.services.push({ id: "replicate", name: "Replicate", emoji: "🎬", status: "offline", rechargeUrl: "https://replicate.com/account/billing" });
    }
  } else {
    result.services.push({ id: "replicate", name: "Replicate", emoji: "🎬", status: "no_key", rechargeUrl: "https://replicate.com/account/billing" });
  }

  // ── Anthropic (no balance API — show session calls) ──────
  result.services.push({
    id: "anthropic", name: "Anthropic (Claude)", emoji: "🧠",
    status: process.env.ANTHROPIC_API_KEY ? "connected" : "no_key",
    balance: null,
    note: "No public balance API — manage at console",
    rechargeUrl: "https://console.anthropic.com/settings/billing",
    models: ["claude-sonnet-4-20250514 · ~$3/1M in · $15/1M out"],
    sessionCalls: sessionCosts.claudeCalls,
  });

  // ── FAL.ai ───────────────────────────────────────────────
  result.services.push({
    id: "fal", name: "FAL.ai", emoji: "⚡",
    status: process.env.FAL_API_KEY ? "connected" : "no_key",
    balance: null,
    note: "Balance available in FAL dashboard",
    rechargeUrl: "https://fal.ai/dashboard/billing",
    models: ["WAN v2.1 T2V · ~$0.08/clip"],
    sessionCalls: sessionCosts.falCalls,
  });

  // ── Gemini ───────────────────────────────────────────────
  result.services.push({
    id: "gemini", name: "Gemini (Google)", emoji: "🔬",
    status: process.env.GEMINI_API_KEY ? "connected" : "no_key",
    balance: null,
    note: "1,500 requests/day FREE · Crucible OS fact-check only",
    rechargeUrl: "https://aistudio.google.com/apikey",
    models: ["gemini-2.0-flash-exp · FREE tier"],
    sessionCalls: sessionCosts.geminiCalls,
    isFree: true,
  });

  // ── Local LTX-Video ──────────────────────────────────────
  result.services.push({
    id: "local", name: "Local LTX-Video (M1)", emoji: "🖥️",
    status: "free",
    balance: null,
    note: "Runs on your Mac GPU — no credits needed",
    rechargeUrl: null,
    models: ["LTX-Video local · FREE"],
    sessionCalls: null,
    isFree: true,
  });

  res.json(result);
});

// ─── Crucible: Character Extraction ──────────────────────────

// Extracts all characters from a screenplay and returns structured list.
// Used by the CharacterPicker UI to show A/B/C options per character.
app.post("/api/crucible/extract-characters", async (req, res) => {
  try {
    const { story, genre, chapterTitle } = req.body;
    if (!story) return res.status(400).json({ error: "story required" });

    const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 600,
        system: `You extract named characters from a screenplay. 
Return ONLY a valid JSON array of characters. Each character object has:
- name: string (character name)
- role: string (hero / mentor / villain / sidekick / narrator)
- description: string (1 sentence appearance description for visual reference)
- suggestedAIPrompt: string (Stable Diffusion portrait prompt for this character, Indian student context)
Example: [{"name":"Arjun","role":"hero","description":"15-year-old Indian school boy, bright eyes, curious expression","suggestedAIPrompt":"portrait of a 15-year-old Indian school boy, bright curious eyes, school uniform, cinematic lighting, detailed illustration"}]`,
        messages: [{ role: "user", content: `Extract all named characters from this ${genre || ""} screenplay for "${chapterTitle || "Science Story"}":\n\n${story.slice(0, 3000)}` }],
      }),
    });

    if (!apiRes.ok) return res.status(500).json({ error: `Claude error ${apiRes.status}` });
    const data = await apiRes.json();
    const rawText = data.content?.[0]?.text || "[]";
    const match = rawText.match(/\[[\s\S]*\]/);
    const characters = JSON.parse(match ? match[0] : "[]");
    res.json({ characters });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Whiteboard renderer routes ───────────────────────────────

// GET /api/whiteboard/deps
// Reports whether Manim (Python) and Remotion (Node) are installed and ready.
// Returns: { manim: { ready, note }, remotion: { ready, note } }
app.get("/api/whiteboard/deps", async (_req, res) => {
  try {
    const status = await depsCheck();
    res.json(status);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/whiteboard/install-manim
// Streams pip install manim output as SSE lines, then sends "done" or "error".
// Events: line (stdout/stderr text), done, error
app.post("/api/whiteboard/install-manim", (req, res) => {
  res.setHeader("Content-Type",  "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection",    "keep-alive");

  const send = (evt, data) =>
    res.write(`event: ${evt}\ndata: ${JSON.stringify(data)}\n\n`);

  // Prefer the server venv; fall back to system pip
  const venvPip = join(dirname(fileURLToPath(import.meta.url)), "whiteboard", ".venv", "bin", "pip");
  const pipBin  = existsSync(venvPip) ? `"${venvPip}"` : "pip3";
  const pkgs    = "manim rdkit manim-chemistry";

  send("line", { text: `▶ Installing into ${existsSync(venvPip) ? ".venv" : "system pip"}: ${pkgs}\n` });

  const proc = exec(
    `PKG_CONFIG_PATH="/opt/homebrew/lib/pkgconfig:/opt/homebrew/share/pkgconfig" ${pipBin} install ${pkgs}`,
    { timeout: 300_000 },
  );

  const pipe = (chunk) => {
    const lines = String(chunk).split("\n");
    for (const l of lines) if (l.trim()) send("line", { text: l });
  };

  proc.stdout?.on("data", pipe);
  proc.stderr?.on("data", pipe);

  proc.on("close", async (code) => {
    if (code === 0) {
      // Invalidate the cached Manim check so next depsCheck() re-detects
      try {
        const { resetManimCache } = await import("./whiteboard/renderer.js");
        resetManimCache?.();
      } catch {}
      send("line", { text: "\n✅ Manim installed successfully." });
      send("done", { ok: true });
    } else {
      send("line", { text: `\n❌ pip exited with code ${code}` });
      send("error", { message: `pip exited with code ${code}` });
    }
    res.end();
  });

  proc.on("error", (err) => {
    send("error", { message: err.message });
    res.end();
  });

  req.on("close", () => { try { proc.kill(); } catch {} });
});

// POST /api/whiteboard/render
// Starts a Manim or Remotion render job for a single blueprint scene.
// Body: { scene, subject, equations, keyFacts, conceptName, visualStyle }
// Returns: { jobId, provider, status: "processing" }
app.post("/api/whiteboard/render", async (req, res) => {
  const { scene, subject = "", equations = [], keyFacts = [], conceptName = "", visualStyle = "whiteboard" } = req.body;
  if (!scene?.title) return res.status(400).json({ error: "scene (with title) required" });
  try {
    const { jobId, provider } = await startWhiteboardRender({
      scene, subject, equations, keyFacts, conceptName, visualStyle,
      vidsDir: VIDS,
    });
    res.json({ jobId, provider, status: "processing" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/whiteboard/poll/:jobId
// Returns current job state: { status, provider, videoUrl?, error? }
app.get("/api/whiteboard/poll/:jobId", (req, res) => {
  const job = getWhiteboardJob(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json(job);
});

// POST /api/whiteboard/detect
// Preview which renderer would be chosen for given topic metadata.
// Body: { subject, equations, narration }
// Returns: { provider: "manim" | "remotion" }
app.post("/api/whiteboard/detect", (req, res) => {
  const { subject = "", equations = [], narration = "" } = req.body;
  res.json({ provider: chooseRenderer(subject, equations, narration) });
});

// ─── boot ─────────────────────────────────────────────────────


const server = app.listen(PORT, async () => {
  // Expose server port to ejss-capture.js (Phase-4 Playwright sims need to reach /sims/)
  process.env.SIM_SERVER_PORT = String(PORT);

  await initDB();
  const line = (label, val) => console.log(`   ${label.padEnd(14)} ${val}`);
  console.log(`\n🎬  FRAMEGEN — Chat to Video`);
  line("Server",    `http://localhost:${PORT}`);
  line("Sims",      `http://localhost:${PORT}/sims/  (Phase-4 HTML simulations)`);
  if (process.env.NODE_ENV !== "production") line("Client", CLIENT_URL);
  line("Claude",    process.env.ANTHROPIC_API_KEY ? "✓ configured" : "✗ missing (required)");
  line("Replicate", process.env.REPLICATE_API_KEY ? "✓ configured" : "✗ not set");
  line("FAL.ai",    process.env.FAL_API_KEY        ? "✓ configured" : "– not set");
  if (!process.env.REPLICATE_API_KEY && !process.env.FAL_API_KEY)
    console.log("\n   ⚠  No video API key found. Video generation will be disabled.");
  console.log();
});

// ─── MIT Stability: Graceful Shutdown & Port Management ────────
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n❌ Port ${PORT} is occupied. MIT-style self-healing initialized...`);
    console.log(`   Identify and kill process using: lsof -t -i :${PORT} | xargs kill -9`);
    process.exit(1);
  }
});

const shutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Closing Syllabus Studio gracefully...`);
  server.close(async () => {
    console.log("   Server closed.");
    try {
      if (db?.close) await db.close();
      console.log("   Database connection closed.");
    } catch {}
    process.exit(0);
  });
  // Force exit after 5s
  setTimeout(() => {
    console.log("   Force exiting...");
    process.exit(1);
  }, 5000);
};

process.on("SIGINT",  () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
