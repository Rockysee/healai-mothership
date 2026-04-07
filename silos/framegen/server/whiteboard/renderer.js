/**
 * Framegen — Whiteboard renderer orchestrator (v2)
 *
 * Routes each scene to the appropriate renderer:
 *   • Manim      — Chemistry/Biology with SMILES, heavy LaTeX equations
 *   • Remotion:WhiteboardComposition  — General narrative whiteboard
 *   • Remotion:ThreeDComposition      — 3D visual style (Phase 1)
 *   • Remotion:GraphComposition       — Animated math graphs (Phase 2)
 *   • Remotion:PhysicsComposition     — Matter.js physics sims (Phase 3)
 *   • Playwright (ejss-capture)       — Pendulum/projectile/osmosis/circuit HTML sims (Phase 4)
 *
 * Decision table (checked in order):
 *   1. visualStyle === "3d"                        → ThreeDComposition
 *   2. scene.simulation present + physics subject  → PhysicsComposition  (Phase 3 preferred)
 *      OR simulation is a Phase-4 type             → Playwright sim
 *   3. scene.graphType present (non-"none")        → GraphComposition
 *   4. Chemistry + SMILES present                  → Manim
 *   5. STEM subject or math equations              → Manim (falls back to WhiteboardComposition)
 *   6. Default                                     → WhiteboardComposition
 *
 * All renderers produce 1280×720 MP4 @ 30 fps.
 */

import { v4 as uuid }   from "uuid";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { writeFileSync, existsSync, unlinkSync } from "fs";
import { exec }          from "child_process";
import { promisify }     from "util";

const execAsync  = promisify(exec);
const __dirname  = dirname(fileURLToPath(import.meta.url));

// ── Python executable — prefer venv, fall back to system python3 ──────────────
const VENV_PYTHON = join(__dirname, ".venv", "bin", "python3");
const PYTHON      = existsSync(VENV_PYTHON) ? VENV_PYTHON : "python3";

// ── In-memory job registry ────────────────────────────────────────────────────
const jobs = new Map();

// ── Manim availability (lazily checked, cached) ───────────────────────────────
let _manimAvailable = null;

async function isManimAvailable() {
  if (_manimAvailable !== null) return _manimAvailable;
  try {
    await execAsync(`"${PYTHON}" -c "import manim"`, { timeout: 10_000 });
    _manimAvailable = true;
  } catch {
    try {
      await execAsync(`python3 -c "import manim"`, { timeout: 10_000 });
      _manimAvailable = true;
    } catch {
      _manimAvailable = false;
    }
  }
  return _manimAvailable;
}

// ── Remotion availability ─────────────────────────────────────────────────────
function isRemotionAvailable() {
  return existsSync(join(__dirname, "remotion", "node_modules", ".bin", "remotion"));
}

// ── Playwright availability (cached) ─────────────────────────────────────────
let _playwrightAvailable = null;

async function isPlaywrightAvailable() {
  if (_playwrightAvailable !== null) return _playwrightAvailable;
  try {
    const { isPlaywrightAvailable: check } = await import("./ejss-capture.js");
    _playwrightAvailable = await check();
  } catch {
    _playwrightAvailable = false;
  }
  return _playwrightAvailable;
}

// ── Phase-4 sim types (handled by Playwright, not Remotion PhysicsComposition) ─
const PLAYWRIGHT_SIM_TYPES = new Set([
  "osmosis", "diffusion", "circuit", "circuit_parallel", "double_pendulum",
]);

// ── Phase-3 sim types (Remotion PhysicsComposition) ──────────────────────────
const REMOTION_SIM_TYPES = new Set([
  "pendulum", "projectile", "collision", "spring", "incline",
]);

// ── STEM subject list ─────────────────────────────────────────────────────────
const STEM_SUBJECTS = new Set([
  "physics", "chemistry", "biology", "maths", "mathematics", "science",
]);

const MATH_RE = /[=÷×√∫∑∏²³°%]|\\frac|\\sqrt|\bsin\b|\bcos\b|\btan\b|pH\b|\bv\s*=/i;

// ── 3D model subject hints ────────────────────────────────────────────────────
const MODEL3D_HINTS = {
  dna:          ["dna", "gene", "chromosome", "nucleotide", "double helix"],
  solar_system: ["solar", "planet", "orbit", "sun", "moon", "gravity"],
  wave:         ["wave", "oscillation", "frequency", "amplitude", "transverse"],
  crystal:      ["crystal", "lattice", "ionic", "sodium chloride", "nacl"],
  molecule_3d:  ["molecule", "compound", "bond", "molecular"],
};

/**
 * Infer a model3d value from narration/title when blueprint doesn't supply one.
 */
function inferModel3d(narration = "", title = "") {
  const text = `${narration} ${title}`.toLowerCase();
  for (const [model, hints] of Object.entries(MODEL3D_HINTS)) {
    if (hints.some(h => text.includes(h))) return model;
  }
  return "atom";
}

// ── Public: renderer + composition decision ───────────────────────────────────
/**
 * Returns { provider, compositionId } for a scene.
 * provider      : "manim" | "remotion" | "playwright"
 * compositionId : "WhiteboardComposition" | "ThreeDComposition" | "GraphComposition" | "PhysicsComposition"
 *                 (only meaningful when provider === "remotion")
 */
export function chooseRenderer(subject = "", equations = [], narration = "", scene = {}) {
  const sub  = subject.toLowerCase().trim();
  const sim  = (scene.simulation || "").toLowerCase();
  const gt   = (scene.graphType  || "").toLowerCase();
  const vs   = (scene.visualStyle || "").toLowerCase();

  // 1. 3D visual style
  if (vs === "3d" || scene.model3d) {
    return { provider: "remotion", compositionId: "ThreeDComposition" };
  }

  // 2. Physics simulation
  if (sim) {
    if (PLAYWRIGHT_SIM_TYPES.has(sim)) {
      return { provider: "playwright", compositionId: null };
    }
    if (REMOTION_SIM_TYPES.has(sim)) {
      return { provider: "remotion", compositionId: "PhysicsComposition" };
    }
  }

  // 3. Math graph
  if (gt && gt !== "none") {
    return { provider: "remotion", compositionId: "GraphComposition" };
  }

  // 4. Chemistry with SMILES → Manim (RDKit)
  if (sub === "chemistry" && scene.smiles?.length > 0) {
    return { provider: "manim", compositionId: null };
  }

  // 5. Equations → Manim
  // If the blueprint scene has an explicit `equations` field (even empty []), trust it.
  // This prevents Vijnana CRISIS_STAKES / OBSERVER_AI scenes (zero scene equations, pure narration)
  // from inheriting the concept-level equations and being misrouted to Manim.
  // Only fall back to concept-level equations when the scene has NO equations field at all.
  const sceneHasEqField = Array.isArray(scene.equations);
  const effectiveEqs    = sceneHasEqField ? scene.equations : equations;

  if (effectiveEqs.length > 0)    return { provider: "manim", compositionId: null };
  if (MATH_RE.test(narration))    return { provider: "manim", compositionId: null };

  // 6. Default — narrative whiteboard
  return { provider: "remotion", compositionId: "WhiteboardComposition" };
}

/**
 * Returns current system readiness for each renderer.
 */
export async function depsCheck() {
  const manimReady     = await isManimAvailable();
  const remotionReady  = isRemotionAvailable();
  const playwrightReady = await isPlaywrightAvailable();
  return {
    manim:      { ready: manimReady,      note: manimReady      ? "✓ installed" : "✗ run: pip install manim" },
    remotion:   { ready: remotionReady,   note: remotionReady   ? "✓ installed" : "✗ run: npm install in server/whiteboard/remotion" },
    playwright: { ready: playwrightReady, note: playwrightReady ? "✓ installed" : "✗ run: npx playwright install chromium" },
  };
}

// ── Manim renderer ────────────────────────────────────────────────────────────
async function runManim({ scene, subject, equations, keyFacts, vidsDir }) {
  const id      = uuid();
  const inFile  = join("/tmp", `fg_manim_in_${id}.json`);
  const outFile = join(vidsDir, `${id}_wb.mp4`);

  writeFileSync(inFile, JSON.stringify({
    title:        scene.title        || "Scene",
    narration:    scene.narration    || "",
    equations:    equations          || [],
    key_facts:    keyFacts           || [],
    smiles:       scene.smiles       || [],
    subject:      subject            || "",
    duration_sec: scene.durationSec  || 10,
  }));

  const script = join(__dirname, "manim_generator.py");

  try {
    await execAsync(
      `"${PYTHON}" "${script}" --input "${inFile}" --output "${outFile}"`,
      { timeout: 200_000 },
    );
  } finally {
    try { unlinkSync(inFile); } catch {}
  }

  if (!existsSync(outFile))
    throw new Error("Manim produced no output. Verify manim is installed: pip install manim");

  return `/videos/${id}_wb.mp4`;
}

// ── Remotion renderer ─────────────────────────────────────────────────────────
async function runRemotion({ scene, equations, keyFacts, conceptName, visualStyle, vidsDir, compositionId }) {
  const id          = uuid();
  const outFile     = join(vidsDir, `${id}_wb.mp4`);
  const remotionDir = join(__dirname, "remotion");
  const fps         = 30;
  const frames      = (scene.durationSec || 10) * fps;
  const compId      = compositionId || "WhiteboardComposition";

  // Install sub-project deps on first run
  const nmPath = join(remotionDir, "node_modules");
  if (!existsSync(nmPath)) {
    console.log("📦  Installing Remotion sub-project dependencies…");
    await execAsync("npm install --cache /tmp/npm-cache-fg", {
      cwd:     remotionDir,
      timeout: 180_000,
    });
  }

  // Build props based on composition type
  let props;
  if (compId === "ThreeDComposition") {
    const model3d = scene.model3d || inferModel3d(scene.narration, scene.title);
    props = {
      title:          scene.title    || conceptName || "Scene",
      narration:      scene.narration || "",
      model3d,
      durationFrames: frames,
      fps,
    };
  } else if (compId === "GraphComposition") {
    props = {
      title:          scene.title    || conceptName || "Scene",
      narration:      scene.narration || "",
      graphType:      scene.graphType || "sin",
      equations:      (equations     || []).slice(0, 2),
      keyFacts:       (keyFacts      || []).slice(0, 3),
      accent:         "#1565c0",
      durationFrames: frames,
      fps,
    };
  } else if (compId === "PhysicsComposition") {
    props = {
      title:          scene.title    || conceptName || "Scene",
      narration:      scene.narration || "",
      simulation:     scene.simulation || "pendulum",
      simParams:      scene.simParams  || {},
      keyFacts:       (keyFacts      || []).slice(0, 4),
      accent:         "#1565c0",
      durationFrames: frames,
      fps,
    };
  } else {
    // WhiteboardComposition (default + Vijnana fields when present)
    props = {
      title:            scene.title    || conceptName || "Scene",
      narration:        scene.narration || "",
      equations:        (equations     || []).slice(0, 2),
      keyFacts:         (keyFacts      || []).slice(0, 3),
      durationFrames:   frames,
      fps,
      // ── Vijnana Engine overlay fields (no-ops when empty strings) ──
      layer:            scene.layer            || "",
      crisisHook:       scene.crisisHook       || "",
      historicalMentor: scene.historicalMentor || "",
      mentorQuote:      scene.mentorQuote      || "",
    };
  }

  const safeProps = JSON.stringify(props).replace(/'/g, "'\\''");
  const bin       = join(remotionDir, "node_modules", ".bin", "remotion");

  await execAsync(
    `"${bin}" render index.jsx ${compId} "${outFile}" --props='${safeProps}' --overwrite`,
    { cwd: remotionDir, timeout: 300_000 },
  );

  if (!existsSync(outFile))
    throw new Error(`Remotion (${compId}) produced no output — check the Remotion sub-project setup.`);

  return `/videos/${id}_wb.mp4`;
}

// ── Playwright renderer (Phase 4) ─────────────────────────────────────────────
async function runPlaywright({ scene, vidsDir }) {
  const { runPlaywrightSim } = await import("./ejss-capture.js");
  return runPlaywrightSim({
    simType:     scene.simulation,
    simParams:   scene.simParams || {},
    vidsDir,
    durationSec: scene.durationSec || 10,
  });
}

// ── Public API ────────────────────────────────────────────────────────────────
/**
 * Kick off a whiteboard render job (non-blocking).
 * Returns { jobId, provider, compositionId } immediately.
 * Poll with getWhiteboardJob().
 */
export async function startWhiteboardRender({
  scene, subject, equations, keyFacts, conceptName, visualStyle, vidsDir,
}) {
  const jobId = uuid();

  // Attach visualStyle to scene so chooseRenderer can see it
  const enrichedScene = { ...scene, visualStyle: visualStyle || scene.visualStyle };

  // Pass concept-level equations as the fallback; chooseRenderer prefers scene.equations
  let { provider, compositionId } = chooseRenderer(subject, equations, scene.narration, enrichedScene);
  console.log(`[whiteboard] chooseRenderer → ${provider}/${compositionId || "—"} (scene="${scene.title}", layer="${scene.layer||""}", sceneEqs=${JSON.stringify(scene.equations||[])}, conceptEqs=${equations.length})`);

  // Fallback chain
  if (provider === "manim" && !(await isManimAvailable())) {
    console.warn("[whiteboard] Manim not found — falling back to Remotion (WhiteboardComposition):", scene.title);
    provider = "remotion";
    compositionId = "WhiteboardComposition";
  }

  if (provider === "playwright" && !(await isPlaywrightAvailable())) {
    console.warn("[whiteboard] Playwright not found — falling back to PhysicsComposition:", scene.simulation);
    provider = "remotion";
    compositionId = "PhysicsComposition";
  }

  jobs.set(jobId, { status: "processing", provider, compositionId, videoUrl: null, error: null });

  let run;
  if (provider === "manim") {
    run = runManim({ scene: enrichedScene, subject, equations, keyFacts, vidsDir });
  } else if (provider === "playwright") {
    run = runPlaywright({ scene: enrichedScene, vidsDir });
  } else {
    run = runRemotion({ scene: enrichedScene, equations, keyFacts, conceptName, visualStyle, vidsDir, compositionId });
  }

  run
    .then(videoUrl => jobs.set(jobId, { status: "succeeded", provider, compositionId, videoUrl, error: null }))
    .catch(err     => {
      console.error(`[whiteboard] ${provider}/${compositionId} failed:`, err.message);
      jobs.set(jobId, { status: "failed", provider, compositionId, videoUrl: null, error: err.message });
    });

  return { jobId, provider, compositionId };
}

/** Retrieve current job state. Returns null if jobId unknown. */
export function getWhiteboardJob(jobId) {
  return jobs.get(jobId) || null;
}

/** Reset the cached Manim availability check (call after pip install). */
export function resetManimCache() {
  _manimAvailable = null;
}

/** Reset the cached Playwright availability check (call after npx playwright install). */
export function resetPlaywrightCache() {
  _playwrightAvailable = null;
}
