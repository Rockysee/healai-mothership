/**
 * Framegen — Phase 4: Playwright headless simulation capture
 *
 * Renders the local HTML simulation pages to MP4 by:
 *   1. Launching a headless Chromium browser via Playwright
 *   2. Navigating to the simulation HTML (served from /sims/)
 *   3. Recording a WebM video via Playwright's recordVideo
 *   4. Converting WebM → MP4 via FFmpeg
 *
 * Supported simulations (map keys must match blueprint "simulation" values):
 *   pendulum   → sims/pendulum.html
 *   projectile → sims/projectile.html
 *   osmosis    → sims/osmosis.html
 *   circuit    → sims/circuit.html
 *
 * Each sim HTML page reads its parameters from URL query string.
 *
 * Usage (called from renderer.js when provider === "playwright"):
 *   import { runPlaywrightSim } from "./ejss-capture.js";
 *   const videoUrl = await runPlaywrightSim({ simType, simParams, vidsDir, durationSec });
 */

import { chromium }   from "playwright";
import { exec }       from "child_process";
import { promisify }  from "util";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync, mkdirSync } from "fs";
import { v4 as uuid } from "uuid";

const execAsync = promisify(exec);
const __dirname  = dirname(fileURLToPath(import.meta.url));

// ── Sim catalogue: simType → { file, defaultParams } ──────────────────────────
export const SIM_CATALOGUE = {
  pendulum: {
    file: "pendulum.html",
    desc: "Simple or double pendulum with animated swing + trail",
    defaults: { length: 1.5, angle: 40, mass: 1, double: 0 },
  },
  double_pendulum: {
    file: "pendulum.html",
    desc: "Chaotic double pendulum",
    defaults: { length: 1.2, angle: 55, mass: 1, double: 1 },
  },
  projectile: {
    file: "projectile.html",
    desc: "Projectile motion with velocity vectors + trajectory trace",
    defaults: { v0: 18, angle: 45, g: 9.8 },
  },
  osmosis: {
    file: "osmosis.html",
    desc: "Osmosis — water movement across semi-permeable membrane",
    defaults: { type: "osmosis", solute: 40 },
  },
  diffusion: {
    file: "osmosis.html",
    desc: "Diffusion of particles from high to low concentration",
    defaults: { type: "diffusion", solute: 50 },
  },
  circuit: {
    file: "circuit.html",
    desc: "Series/parallel circuit with animated electron flow",
    defaults: { type: "series", voltage: 12, r1: 4, r2: 6 },
  },
  circuit_parallel: {
    file: "circuit.html",
    desc: "Parallel circuit — same voltage, different currents",
    defaults: { type: "parallel", voltage: 12, r1: 4, r2: 6 },
  },
};

// ── Port used by Express sim server (set in server/index.js) ─────────────────
// We read it from the environment so this module has no hard dependency on the server.
const SIM_PORT = process.env.SIM_SERVER_PORT || 3001;
const SIMS_DIR = join(__dirname, "sims");

// ── Helper: build query string from params object ─────────────────────────────
function buildQuery(params) {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

// ── Main export ───────────────────────────────────────────────────────────────
/**
 * Run a simulation and capture it to an MP4 file.
 *
 * @param {object} opts
 * @param {string}  opts.simType     - key from SIM_CATALOGUE
 * @param {object}  opts.simParams   - overrides for default params
 * @param {string}  opts.vidsDir     - output directory (absolute path)
 * @param {number}  opts.durationSec - clip duration in seconds (default 10)
 * @returns {string}  Relative URL path like "/videos/abc_sim.mp4"
 */
export async function runPlaywrightSim({ simType, simParams = {}, vidsDir, durationSec = 10 }) {
  const cat = SIM_CATALOGUE[simType];
  if (!cat) throw new Error(`Unknown simType "${simType}". Available: ${Object.keys(SIM_CATALOGUE).join(", ")}`);

  const id        = uuid();
  const webmPath  = join("/tmp", `fg_sim_${id}.webm`);
  const mp4Path   = join(vidsDir, `${id}_sim.mp4`);
  const tmpDir    = join("/tmp", `fg_sim_${id}`);

  mkdirSync(tmpDir, { recursive: true });

  const params  = { ...cat.defaults, ...simParams, duration: durationSec };
  const query   = buildQuery(params);
  const simUrl  = `http://localhost:${SIM_PORT}/sims/${cat.file}?${query}`;

  console.log(`[ejss-capture] Launching sim: ${simType}  url=${simUrl}`);

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--enable-gpu",
      "--use-gl=angle",             // macOS native GPU
      "--ignore-gpu-blocklist",
    ],
  });

  let page;
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: {
        dir:  tmpDir,
        size: { width: 1280, height: 720 },
      },
    });

    page = await context.newPage();
    await page.goto(simUrl, { waitUntil: "networkidle", timeout: 15_000 });

    // Let the simulation run for the full duration + 0.5 s buffer
    await page.waitForTimeout((durationSec + 0.5) * 1000);

    // Closing the page finalises the WebM recording
    const video = await page.video();
    await context.close();
    await browser.close();

    // Playwright saves the WebM with a generated filename inside tmpDir
    const savedPath = await video.path();
    if (!existsSync(savedPath)) throw new Error("Playwright did not produce a video file");

    // Convert WebM → MP4 (H.264), 1280×720 @ 30 fps
    await execAsync(
      `ffmpeg -y -i "${savedPath}" -vf "scale=1280:720,fps=30" -c:v libx264 -preset fast -crf 18 -movflags +faststart "${mp4Path}"`,
      { timeout: 120_000 },
    );

    if (!existsSync(mp4Path)) throw new Error("FFmpeg conversion failed — no MP4 produced");

    console.log(`[ejss-capture] Done: ${mp4Path}`);
    return `/videos/${id}_sim.mp4`;

  } catch (err) {
    await browser.close().catch(() => {});
    throw err;
  }
}

// ── Availability check ────────────────────────────────────────────────────────
/** Returns true if Playwright chromium is installed and usable. */
export async function isPlaywrightAvailable() {
  try {
    const b = await chromium.launch({ headless: true });
    await b.close();
    return true;
  } catch {
    return false;
  }
}
