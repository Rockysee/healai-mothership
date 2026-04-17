/**
 * Vijnana Animation Generator
 *
 * Converts a problem from the game JSON into a self-contained HTML5 Canvas
 * animation that walks the student through the problem using a 5-step
 * MIT-style problem-solving decomposition:
 *
 *   BREACH  → Show the broken system — what is unknown, what failed
 *   SCAN    → Extract and display all knowns/constants from the problem
 *   VECTOR  → Identify the concept direction — what principle unlocks the variable
 *   EXECUTE → Animate the concept being applied at the particle level
 *   LOCK    → Reveal and confirm the solution
 *
 * Output: self-contained HTML file (~450-600 lines), zero CDN dependencies.
 * Cached to disk per problemId — never regenerated once written.
 * Served as an <iframe> inside game.html replacing the static frame image.
 *
 * Usage:
 *   import { getAnimation, prewarmAnimations } from "./animation_generator.js";
 *   const { url } = await getAnimation(courseId, problemId, problemObject, env);
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname }  from "path";
import { fileURLToPath }  from "url";
import fetch              from "node-fetch";

const __dirname     = dirname(fileURLToPath(import.meta.url));
const ANIM_DIR      = join(__dirname, "../../storage/game_animations");
if (!existsSync(ANIM_DIR)) mkdirSync(ANIM_DIR, { recursive: true });

// In-flight promise dedup — prevents concurrent Claude calls for the same problem
const _inFlight = new Map();

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns a cached animation URL or generates a new one via Claude.
 * Concurrent requests for the same problemId share a single Claude call.
 */
export async function getAnimation(courseId, problemId, problem, env = process.env) {
  const cacheKey  = `${courseId}_${problemId}`;
  const cachePath = join(ANIM_DIR, `${cacheKey}.html`);
  const cacheUrl  = `/game-animations/${cacheKey}.html`;

  if (existsSync(cachePath)) return { url: cacheUrl, cached: true };

  if (!env.ANTHROPIC_API_KEY) return { url: null, cached: false, error: "No ANTHROPIC_API_KEY" };

  // Deduplicate concurrent requests for the same problem
  if (_inFlight.has(cacheKey)) {
    await _inFlight.get(cacheKey);
    return existsSync(cachePath)
      ? { url: cacheUrl, cached: true }
      : { url: null, cached: false, error: "Concurrent generation failed" };
  }

  const promise = _generateAnimation(problem, env.ANTHROPIC_API_KEY)
    .then(html => { if (html) writeFileSync(cachePath, html, "utf8"); return html; })
    .finally(() => _inFlight.delete(cacheKey));

  _inFlight.set(cacheKey, promise);
  const html = await promise;
  if (!html) return { url: null, cached: false, error: "Claude generation failed" };
  return { url: cacheUrl, cached: false };
}

/**
 * Pre-generates all animations for a course (background job).
 */
export async function prewarmAnimations(game, env = process.env) {
  const results = [];
  for (const [pid, problem] of Object.entries(game.problems)) {
    const r = await getAnimation(game.course_id, pid, problem, env);
    results.push({ problemId: pid, ...r });
  }
  return results;
}

// ── Prompt Engineering ────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a world-class educational animation engineer for ICSE Class 10 science and maths.

You generate a self-contained HTML5 Canvas animation that acts as a LIVE TUTOR working through a problem
step by step — exactly like a teacher writing on a board, one logical move at a time.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HOW IT WORKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The animation has exactly 5 logical steps.
Each step AUTO-ADVANCES after 12 seconds, OR the student can TAP anywhere to go faster.
After the last step it loops back to step 1 — it keeps teaching passively. Total loop = 60 seconds.

Each step shows:
  ┌────────────────────────────────────────┐
  │  Step label top-left  (e.g. "Step 2") │
  │  Progress bar top-right               │
  │                                        │
  │  VISUAL — the main animated element   │
  │  (particles, diagrams, equations)     │
  │                                        │
  │  ONE-LINE explanation bottom          │
  └────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP DESIGN BY SUBJECT TYPE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CHEMISTRY (ions, electrodes, reactions):
  Step 1 — Show the system as-is. Frozen/dead state. Label entities.
  Step 2 — Isolate the KEY VARIABLE that's unknown. Highlight it in gold.
  Step 3 — Apply the principle: show particles/ions MOVING. Animate with rAF.
  Step 4 — Show the outcome at each electrode. What deposits? What releases?
  Step 5 — Reveal answer. Show the half-equation forming token by token.
  Step 6 — KEY FACT flashes in. Gold glow. Celebration particles.

MATHS / PHYSICS (equations, geometry, graphs):
  Step 1 — Draw the diagram/scenario. Label all KNOWNS in cyan.
  Step 2 — Identify the UNKNOWN. Show it as a glowing question mark.
  Step 3 — Write the formula. Animate it appearing character by character.
  Step 4 — Substitute values. Numbers slide into the formula slots.
  Step 5 — Simplify. Each operation animates (cross out, combine, calculate).
  Step 6 — BOX the final answer in gold. Particles burst from the box.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ANIMATION QUALITY REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Every step must have MOTION. Nothing is static.
  • Chemistry: ions/electrons/atoms moving every frame
  • Maths: text writing itself, values sliding in, lines drawing
- Use requestAnimationFrame for all animation loops
- Transitions between steps: smooth 300ms fade (globalAlpha lerp)
- Progress bar at top fills smoothly as time passes within a step
- Tap-to-advance: clicking anywhere skips the timer and jumps next step
- A subtle "tap to advance" hint pulses at the bottom (opacity: 0.4→0.8)

VOICEOVER SYNC — MANDATORY PATTERN (you MUST follow exactly):
Define all step narrations in a const array at the top of your script:
  const NARRATIONS = ["step 1 explanation","step 2 explanation","step 3 explanation","step 4 explanation","step 5 explanation"];
All step transitions MUST go through ONE function called advanceStep(n):
  function advanceStep(n) {
    currentStep = n;
    window.parent.postMessage({ type:'vijnana_step', step:n, total:NARRATIONS.length, narration:NARRATIONS[n-1] }, '*');
    // then call your draw function
    draw();
  }
Rules:
- NEVER call postMessage anywhere except inside advanceStep().
- advanceStep(1) must be called when the animation FIRST loads (not just on step change).
- On loop-back to step 1, call advanceStep(1) again — parent needs the repeat event.
- The narration text = the same one-line explanation shown at the bottom of the canvas.
- N is 1-based. total = number of steps (usually 5).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ABSOLUTE RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Single self-contained HTML file. ZERO external dependencies. No CDN. No imports.
2. Canvas: 520 × 420 px (portrait-ish, more space for step content).
3. Dark bg: #0d0b1e. Surface: #161230. Cyan: #4ade80. Purple: #7c6af7. Gold: #fbbf24. Warn: #f43f5e. Text: #f0eeff.
4. Monospace font for all equations/formulas/ions. Sans-serif for explanations.
5. Step label always top-left. Progress bar top-right. One-line explanation always bottom.
6. MUST use requestAnimationFrame — the canvas must never be static between frames.
7. Max 700 lines total. Compact JS. No comments beyond inline variable names.
8. Must work inside a sandboxed iframe (allow-scripts only).
9. Output ONLY raw HTML. No markdown. No preamble. Start with <!DOCTYPE html>.`;

// ── Core generator ────────────────────────────────────────────────────────────

async function _generateAnimation(problem, apiKey) {
  const userPrompt = _buildUserPrompt(problem);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-6",
        max_tokens: 8000,
        system:     SYSTEM_PROMPT,
        messages:   [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      console.error("[animation_generator] Claude error:", response.status, await response.text().catch(() => ""));
      return null;
    }

    const data = await response.json();
    const html = data.content?.[0]?.text?.trim();
    if (!html || !html.includes("<!DOCTYPE")) return null;

    return html;
  } catch (e) {
    console.error("[animation_generator] fetch error:", e.message);
    return null;
  }
}

// ── Prompt builder ────────────────────────────────────────────────────────────

function _buildUserPrompt(problem) {
  const subject  = _detectSubject(problem);
  const knowns   = _extractKnowns(problem);
  const execute  = _extractExecute(problem);
  const concept  = _extractConcept(problem);
  const answer   = _extractCorrectAnswer(problem);
  const traps    = (problem.misconceptions || []).map(m => `  • ${m.socratic_nudge || m.diagnosis || m.pattern}`).join("\n") || "  • None";
  const hints    = (problem.hints || []).join(" → ") || "";

  // Build the logical solution steps the tutor walks through
  const solutionSteps = _buildSolutionSteps(problem, knowns, execute, concept, answer);

  return `
Generate an auto-advancing step-by-step animation that acts as a live tutor solving this problem.
Canvas: 520 × 420 px. Auto-advance every 12s. Tap anywhere to advance manually. Loop after final step.
Subject: ${subject.toUpperCase()} — use the matching step design from your instructions.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROBLEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Title    : ${problem.title}
Question : ${problem.prompt}
Concept  : ${problem.concept}
Type     : ${problem.type}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THE TUTOR'S SOLUTION — step by step
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
These are the exact logical steps to animate, in order:

${solutionSteps}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PARTICLE ANIMATION SPEC (for the physics/chemistry step)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${execute.description}
Environment : ${execute.environment}
Particles   :
${execute.particles.map(p => `  • ${p.name} [${p.color}] — ${p.motion}`).join("\n")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMMON WRONG PATHS TO AVOID SHOWING (don't animate these as solutions)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${traps}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KEY FACT (display on final step in glowing box)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${problem.solution?.key_fact || problem.solution?.explanation || ""}
${hints ? `Tutor hints: ${hints}` : ""}
${problem._concept_analogy ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONCEPT ANALOGY (use this on step 1 to hook the student)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${problem._concept_analogy}` : ""}
${problem._concept_real_world ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REAL-WORLD CONNECTION (weave into step 2 or final step narration)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${problem._concept_real_world}` : ""}
`.trim();
}

// ── Build the ordered solution steps the tutor walks through ─────────────────

function _buildSolutionSteps(problem, knowns, execute, concept, answer) {
  const steps = [];

  // Step 1 — Always: set the scene
  steps.push(`STEP 1 — SET THE SCENE
  Visual: Draw the physical setup described in the question. Label every entity.
  Text: "${problem.prompt.slice(0, 90)}..."
  Motion: Entities appear one by one with a fade-in. Labels slide in from left.`);

  // Step 2 — Extract knowns
  if (knowns.length) {
    steps.push(`STEP 2 — GATHER CONSTANTS
  Visual: Display each known as a labelled data block appearing in sequence.
  Knowns: ${knowns.map(k => `[${k.label} = ${k.value}]`).join("  ")}
  Motion: Each block drops in from top with a cyan scan line sweeping across it.
  Text: "What do we already know?"`);
  }

  // Step 3 — Identify the unknown
  steps.push(`STEP 3 — ISOLATE THE UNKNOWN
  Visual: Highlight the one thing the question is asking for. Show it in gold with a pulsing glow.
  Unknown: ${_extractUnknown(problem).variable}
  Motion: All knowns fade to 30% opacity. The unknown pulses gold.
  Text: "What are we solving for?"`);

  // Step 4 — Apply the concept (particle-level)
  steps.push(`STEP 4 — APPLY THE PRINCIPLE (particle level)
  Concept: ${concept.name}
  Principle: ${concept.principle}
  Visual: ${execute.description}
  Motion: MUST use requestAnimationFrame — particles/ions/electrons actively moving every frame.
  Text: "${concept.bridge}"`);

  // Step 5 — Show the logical conclusion
  steps.push(`STEP 5 — LOGICAL CONCLUSION
  Visual: Show the direct consequence of step 4. What happens as a result?
  For chemistry: what forms at each electrode? Show product appearing.
  For maths: show the calculation resolving, numbers simplifying.
  Motion: Result "materialises" — grows from 0 scale to full size with a spring ease.
  Text: One sentence stating why the answer must be what it is.`);

  // Step 6 — Lock the answer
  steps.push(`STEP 6 — LOCK THE ANSWER
  Visual: Display the correct answer in a gold box centre-screen.
  Answer: ${answer}
  Motion: 20 gold+cyan particles burst from the answer box. Box pulses then settles.
  Key Fact appears below in a glowing cyan border:
  "${problem.solution?.key_fact || problem.solution?.explanation || ""}"
  Text: "Remember this."`);

  return steps.map((s, i) => `[${i + 1}/${steps.length}]\n${s}`).join("\n\n");
}

// ── Structured extractors — convert raw problem JSON into animation data ──────

function _extractKnowns(problem) {
  const knowns = [];
  const p = problem;

  // Always extract the question substance/context
  const prompt = p.prompt || "";

  // ── Numeric values — extract labelled quantities (V=120V, R=4Ω, n=1.5, θ=45°) ──
  const numericMatches = [...prompt.matchAll(/([A-Za-zα-ωΑ-Ω₁₂₃]+)\s*=\s*([\d.]+\s*(?:V|Ω|A|W|m|cm|kg|N|Pa|J|K|°C|nm|Hz|Ω|ohm|s|mol|M|atm|kJ)?)/g)];
  for (const m of numericMatches) {
    knowns.push({ label: m[1], value: m[2].trim(), why: "given quantity" });
  }

  // ── Chemistry: compound mentions ──────────────────────────────────────────
  const compounds = [...prompt.matchAll(/\b([A-Z][a-z]?\d*(?:[A-Z][a-z]?\d*)*[₂₃₄⁺⁻²³]+|PbBr₂|NaCl|CuSO₄|H₂SO₄|NaOH|CuCl₂|AgNO₃|ZnSO₄)\b/g)]
    .map(m => m[0]);
  if (compounds.length) {
    knowns.push({
      label: "Electrolyte",
      value: [...new Set(compounds)].join(", "),
      why: "the substance being electrolysed"
    });
  }

  // State of matter
  if (/molten|liquid/i.test(prompt)) knowns.push({ label: "State", value: "Molten (liquid)", why: "ions are free to move" });
  if (/aqueous|solution|dissolved/i.test(prompt)) knowns.push({ label: "State", value: "Aqueous solution", why: "ions dissociated in water" });
  if (/solid/i.test(prompt)) knowns.push({ label: "State", value: "Solid", why: "ions locked in lattice" });

  // Electrode type
  if (/platinum|Pt|inert/i.test(prompt)) knowns.push({ label: "Electrodes", value: "Platinum (inert)", why: "do not dissolve or react" });
  if (/graphite|carbon/i.test(prompt)) knowns.push({ label: "Electrodes", value: "Graphite (inert)", why: "do not dissolve" });
  if (/copper|Cu\s+electrode/i.test(prompt)) knowns.push({ label: "Electrodes", value: "Copper (active)", why: "anode dissolves during process" });

  // Ions present
  const ionMatches = [...prompt.matchAll(/([A-Z][a-z]?\d*[²³⁺⁻\+\-]+)/g)].map(m => m[0]);
  if (ionMatches.length) {
    const cations = ionMatches.filter(i => i.includes("+") || i.includes("⁺") || i.includes("²⁺") || i.includes("³⁺"));
    const anions  = ionMatches.filter(i => i.includes("-") || i.includes("⁻"));
    if (cations.length) knowns.push({ label: "Cations present", value: cations.join(", "), why: "migrate to cathode" });
    if (anions.length)  knowns.push({ label: "Anions present",  value: anions.join(", "),  why: "migrate to anode" });
  }

  // Half-equation context
  if (p.type === "equation_builder") {
    const tokens = p.widget?.available_tokens || [];
    if (tokens.length) knowns.push({ label: "Available tokens", value: tokens.join("  "), why: "elements of the half-equation" });
  }

  // Concentration hint
  if (/dilute|concentrated|high concentration|low concentration/i.test(prompt)) {
    const conc = /dilute/i.test(prompt) ? "Dilute" : "Concentrated";
    knowns.push({ label: "Concentration", value: conc, why: "affects selective discharge at anode" });
  }

  // ── Physics: angles and media ─────────────────────────────────────────────
  if (/angle of incidence|critical angle|refractive index|n₁|n₂/i.test(prompt)) {
    const nMatches = [...prompt.matchAll(/n\s*=\s*([\d.]+)/g)];
    for (const m of nMatches) knowns.push({ label: "Refractive index n", value: m[1], why: "optical density of medium" });
  }
  if (/resistance|ohm|Ω/i.test(prompt)) {
    knowns.push({ label: "Formula", value: "V = IR  |  P = I²R  |  P = V²/R", why: "Ohm's Law and power relations" });
  }

  // ── Maths: trig and geometry ──────────────────────────────────────────────
  if (/sin|cos|tan|angle|triangle|hypotenuse/i.test(prompt)) {
    knowns.push({ label: "Trig identities", value: "sin²θ + cos²θ = 1  |  SOH-CAH-TOA", why: "trigonometric relations" });
  }

  // Fallback
  if (knowns.length === 0) {
    knowns.push({ label: "Question context", value: prompt.slice(0, 80) + "…", why: "problem statement" });
  }

  return knowns.slice(0, 5);
}

function _extractUnknown(problem) {
  const typeMap = {
    "tap_select":        { variable: "The correct option",      description: "Which of the given options is physically/chemically correct?", visual: "Show 4 option cards, one glowing with a question mark, others faded" },
    "mcq":               { variable: "The correct explanation",  description: "Which statement accurately describes the underlying mechanism?", visual: "Show 4 statement cards with a magnifying glass scanning them" },
    "sort_order":        { variable: "The correct sequence",     description: "What is the correct order of discharge / conductance / reaction?", visual: "Show items in random order with shuffle icon and a question: what is the right sequence?" },
    "fill_blank":        { variable: "The missing term(s)",      description: "Which specific scientific terms complete the principle statement?", visual: "Show a sentence with blank gaps highlighted in red/orange" },
    "label_diagram":     { variable: "The correct label positions", description: "Which electrode/component is which in this electrolytic setup?", visual: "Show a circuit diagram with labels missing (blank red boxes at each component)" },
    "equation_builder":  { variable: "The balanced half-equation", description: "What is the correctly balanced half-equation for this electrode reaction?", visual: "Show tokens scattered randomly with target equation box empty" },
    "slider_sim":        { variable: "The product at each concentration", description: "Which ion is preferentially discharged at each concentration level?", visual: "Show a slider with a question mark over the product display" },
    "comparison_table":  { variable: "Molten vs aqueous discharge products", description: "How do products differ between molten and aqueous electrolysis of the same compound?", visual: "Show two-column table with all cells blank and question marks" },
    "matching":          { variable: "The correct pairings",     description: "Which observation/product maps to which electrode/process?", visual: "Show left and right columns with no connections drawn" },
    "cell_builder":      { variable: "The correct component choices", description: "Which electrode material and electrolyte configuration achieves the required outcome?", visual: "Show a cell diagram with dashed boxes for each component" },
  };
  return typeMap[problem.type] || typeMap["tap_select"];
}

function _extractConcept(problem) {
  const conceptMap = {
    "ionic_conduction": {
      name: "Free Ion Movement Principle",
      principle: "Electrical conduction requires FREE charge carriers. In ionic compounds, ions carry charge — but only when mobile (molten or dissolved). Solid = locked = non-conductor.",
      bridge: "State of matter → Ion mobility → Conductance"
    },
    "polarity": {
      name: "Electrode Polarity & Charge Attraction",
      principle: "Cations (positive) are attracted to the cathode (negative). Anions (negative) are attracted to the anode (positive). Opposite charges attract. PANIC: Positive Anode, Negative Is Cathode.",
      bridge: "Ion charge sign → Electrode polarity → Migration direction"
    },
    "selective_discharge": {
      name: "Selective Discharge (Discharge Potential Series)",
      principle: "When multiple ions compete for the same electrode, the ion with the LOWEST discharge potential wins. Below hydrogen in the activity series → discharged preferentially over H⁺.",
      bridge: "Activity series position → Discharge potential → Which ion is deposited"
    },
    "half_equations": {
      name: "Half-Equation Electron Balance",
      principle: "At cathode: reduction — ions GAIN electrons (e⁻ added to left side). At anode: oxidation — ions LOSE electrons (e⁻ on right side). Electrons must balance. Charge must balance.",
      bridge: "Electrode type → Gain/lose electrons → Balanced half-equation"
    },
    "molten_vs_aqueous": {
      name: "Water's Ionic Intrusion",
      principle: "Water self-ionises: H₂O ⇌ H⁺ + OH⁻. In aqueous solution, H⁺ and OH⁻ enter the discharge competition. This changes products compared to molten electrolysis.",
      bridge: "Aqueous state → H⁺/OH⁻ competitors present → Different products than molten"
    },
    "active_inert": {
      name: "Active vs Inert Electrode Behaviour",
      principle: "Inert electrodes (Pt, graphite) do not participate — they only transfer electrons. Active electrodes (Cu, Ag) dissolve at the anode, replenishing the solution with their ions.",
      bridge: "Electrode material reactivity → Dissolves or stays inert → Effect on solution concentration"
    },
    "applications": {
      name: "Industrial Electrolysis — Mass Transfer at Scale",
      principle: "Electroplating deposits a thin controlled layer from an active anode onto an object (cathode). Electrorefining uses impure anode that dissolves; pure metal deposits at cathode.",
      bridge: "Process purpose → Electrode choice → Industrial outcome"
    },
  };
  // ── Physics concepts ─────────────────────────────────────────────────────────
  const physicsConceptMap = {
    "ohm_law": {
      name: "Ohm's Law — V = IR",
      principle: "Voltage (V) drives current (I) through resistance (R). Double the voltage → double the current. Double the resistance → halve the current. Power P = I²R = V²/R.",
      bridge: "Voltage source → Current through resistance → Power dissipated as heat"
    },
    "resistance": {
      name: "Resistance in Circuits",
      principle: "Series: R_total = R₁ + R₂ + ... (resistances add). Parallel: 1/R_total = 1/R₁ + 1/R₂ + ... (total is less than any individual). Current splits in parallel, stays same in series.",
      bridge: "Circuit topology → Equivalent resistance → Current and voltage distribution"
    },
    "refraction": {
      name: "Snell's Law — n₁sinθ₁ = n₂sinθ₂",
      principle: "Light bends when crossing between media of different optical densities. Going denser→rarer: bends away from normal. Rarer→denser: bends toward normal. Speed = c/n.",
      bridge: "Optical density ratio → Angle change → Direction of bending"
    },
    "total_internal_reflection": {
      name: "Total Internal Reflection",
      principle: "When light hits a denser→rarer boundary beyond the CRITICAL ANGLE, all light reflects back — none escapes. sinC = n₂/n₁. Used in optical fibres and diamonds.",
      bridge: "Incident angle > Critical angle → Complete internal reflection → No refracted ray"
    },
    "current_electricity": {
      name: "Electric Current & Charge Flow",
      principle: "Current (I) is charge (Q) flowing per second: I = Q/t. Conventional current flows + to −; electrons actually flow − to +. 1 Ampere = 1 Coulomb per second.",
      bridge: "Charge carriers in motion → Current magnitude → Energy transferred"
    },
    "force_motion": {
      name: "Newton's Laws of Motion",
      principle: "F = ma. Net force causes acceleration proportional to that force and inversely proportional to mass. Action and reaction are equal and opposite. Inertia resists change in motion.",
      bridge: "Net force → Acceleration → Change in velocity"
    },
    "pressure": {
      name: "Pressure — Force Per Unit Area",
      principle: "P = F/A. More force or less area → greater pressure. Liquid pressure P = ρgh depends only on depth and density, not the shape of the container.",
      bridge: "Force distribution over area → Pressure → Effect on boundaries"
    },
  };

  // ── Maths concepts ────────────────────────────────────────────────────────────
  const mathsConceptMap = {
    "trigonometry": {
      name: "SOH-CAH-TOA Trigonometry",
      principle: "In a right-angled triangle: sinθ = opposite/hypotenuse (SOH), cosθ = adjacent/hypotenuse (CAH), tanθ = opposite/adjacent (TOA). Pythagoras: a² + b² = c².",
      bridge: "Identify the sides → Choose the correct ratio → Solve for the unknown"
    },
    "quadratic": {
      name: "Quadratic Equations",
      principle: "ax² + bx + c = 0. Solutions: x = (−b ± √(b²−4ac)) / 2a. Discriminant b²−4ac > 0 gives two real roots, = 0 gives one, < 0 gives none.",
      bridge: "Standard form → Apply formula or factorise → Find roots"
    },
    "similar_triangles": {
      name: "Similar Triangles — Equal Ratios",
      principle: "If two triangles are similar (AA, SAS, SSS), their corresponding sides are proportional. Ratios of sides equal ratios of perimeters. Areas scale as the square of the side ratio.",
      bridge: "Prove similarity → Set up ratio equation → Solve for unknown side"
    },
    "coordinate_geometry": {
      name: "Coordinate Geometry",
      principle: "Distance: d = √((x₂−x₁)² + (y₂−y₁)²). Midpoint: ((x₁+x₂)/2, (y₁+y₂)/2). Slope: m = (y₂−y₁)/(x₂−x₁). Parallel lines have equal slopes. Perpendicular: m₁×m₂ = −1.",
      bridge: "Points on grid → Apply distance/midpoint/slope formulas → Find geometric properties"
    },
    "statistics": {
      name: "Mean, Median, Mode & Probability",
      principle: "Mean = sum/count. Median = middle value when sorted. Mode = most frequent. Probability = favourable outcomes / total outcomes. P(A') = 1 − P(A).",
      bridge: "Organise data → Choose appropriate measure → Interpret result in context"
    },
  };

  const allConcepts = { ...conceptMap, ...physicsConceptMap, ...mathsConceptMap };
  return allConcepts[problem.concept] || {
    name: "Core Scientific Principle",
    principle: "Apply the fundamental rules of this concept to identify the correct outcome.",
    bridge: "Identify knowns → Apply principle → Determine outcome"
  };
}

function _extractExecute(problem) {
  const executeMap = {
    "ionic_conduction": {
      description: "Animate ions trapped in a crystal lattice (solid state) — they vibrate but cannot move. Then show the lattice melting: ions break free and stream toward electrodes. Bulb flickers OFF in solid state, glows ON in molten state.",
      environment: "Left half: solid PbBr₂ crystal lattice with red Pb²⁺ and blue Br⁻ locked in grid. Right half: molten state with same ions now freely drifting.",
      chemistry: "Solid PbBr₂: Pb²⁺ and Br⁻ held by electrostatic forces in rigid lattice. Heating above 370°C breaks bonds → ions become mobile → current flows.",
      particles: [
        { name: "Pb²⁺ (cation)", color: "#fbbf24", motion: "locked oscillation → free drift right toward cathode", charge: "2+" },
        { name: "Br⁻ (anion)",   color: "#f43f5e", motion: "locked oscillation → free drift left toward anode",   charge: "1-" },
        { name: "Lattice bonds", color: "#2d2060", motion: "rigid grid that shatters when heat applied",           charge: "neutral" },
      ]
    },
    "polarity": {
      description: "Animate Pb²⁺ ions racing toward the cathode (negative, right electrode) and Br⁻ ions racing toward the anode (positive, left electrode). Show electrode labels clearly. At arrival: Pb²⁺ gains electrons and deposits as grey Pb metal. Br⁻ loses electrons and releases as orange Br₂ gas bubbles.",
      environment: "Two vertical electrode rods: left = ANODE (+) purple, right = CATHODE (–) cyan. Solution filled with ions between them.",
      chemistry: "Pb²⁺ + 2e⁻ → Pb (at cathode). 2Br⁻ → Br₂ + 2e⁻ (at anode). Electrons flow through external circuit.",
      particles: [
        { name: "Pb²⁺", color: "#fbbf24", motion: "drift right toward cathode, deposit on rod surface", charge: "2+" },
        { name: "Br⁻",  color: "#f43f5e", motion: "drift left toward anode, release as bubbles",        charge: "1-" },
        { name: "e⁻",   color: "#4ade80", motion: "flow through wire from anode to cathode (external circuit)", charge: "-" },
      ]
    },
    "selective_discharge": {
      description: "Show multiple ion species (Cu²⁺, H⁺, Na⁺) racing toward the cathode. Cu²⁺ moves fastest (lowest discharge potential). Na⁺ barely moves. H⁺ at medium speed. At cathode: Cu deposits as pink metal, H₂ bubbles appear later, Na never arrives.",
      environment: "Cathode on right. Three ion types with speed proportional to discharge preference. Activity series shown as vertical bar on left.",
      chemistry: "Cu²⁺ below H in activity series → lower discharge potential → discharged first. Na above H → almost impossible to discharge in aqueous. Selectivity based on thermodynamic stability of reduced metal.",
      particles: [
        { name: "Cu²⁺", color: "#f97316", motion: "fast drift to cathode, deposit as pink Cu metal",   charge: "2+" },
        { name: "H⁺",   color: "#4ade80", motion: "medium drift, arrive second, release H₂ bubbles",   charge: "1+" },
        { name: "Na⁺",  color: "#7c6af7", motion: "very slow, barely moves, never reaches cathode",     charge: "1+" },
      ]
    },
    "half_equations": {
      description: "Show electron transfer at each electrode. At cathode: ion arrives, 2 electrons jump from electrode surface onto the ion, it becomes neutral and deposits. At anode: ion arrives, gives up electrons to electrode surface, oxidised product released as gas or deposited.",
      environment: "Two electrode close-ups side by side. Cathode on left (REDUCTION), Anode on right (OXIDATION). Electron counter showing balanced equation tokens.",
      chemistry: "Cathode: Pb²⁺ + 2e⁻ → Pb. Anode: 2Br⁻ → Br₂ + 2e⁻. Electrons from anode flow through external circuit to cathode. Charge conserved.",
      particles: [
        { name: "e⁻ (electron)", color: "#4ade80", motion: "jump from cathode surface onto arriving ion / jump from ion to anode surface", charge: "-" },
        { name: "Pb²⁺",         color: "#fbbf24", motion: "approach cathode, absorb 2 electrons, become grey Pb, deposit", charge: "2+" },
        { name: "Br⁻",          color: "#f43f5e", motion: "approach anode, lose 1e⁻ each, pair up, release as Br₂ bubble", charge: "1-" },
      ]
    },
    "molten_vs_aqueous": {
      description: "Split screen: left = molten PbBr₂ (only Pb²⁺ and Br⁻ ions). Right = aqueous PbBr₂ (same ions PLUS H⁺ and OH⁻ from water). Show the water molecules splitting. At cathode: molten → Pb metal. Aqueous → H₂ gas (H⁺ wins over Pb²⁺ here only if dilute). At anode: both produce Br₂ (or OH⁻ discharge in very dilute).",
      environment: "Split screen with a dividing line. Left labelled MOLTEN, right labelled AQUEOUS. Water molecules appear and split on right side.",
      chemistry: "H₂O ⇌ H⁺ + OH⁻. In aqueous, the discharge competition now includes H⁺ (cathode) and OH⁻ (anode). Winner depends on position in discharge potential series and concentration.",
      particles: [
        { name: "Pb²⁺",    color: "#fbbf24", motion: "present in both halves, heading to cathode",       charge: "2+" },
        { name: "Br⁻",     color: "#f43f5e", motion: "present in both halves, heading to anode",         charge: "1-" },
        { name: "H₂O",     color: "#38bdf8", motion: "appears only on right side, splits into H⁺ + OH⁻", charge: "0" },
        { name: "H⁺/OH⁻", color: "#a3e635", motion: "emerge from H₂O split, join discharge competition", charge: "±1" },
      ]
    },
    "active_inert": {
      description: "Show two side-by-side cells: left has inert (Pt) electrodes, right has active (Cu) electrodes. In right cell: anode copper atoms detach, become Cu²⁺ ions, drift to cathode. Anode rod shrinks. Cathode rod grows. In left cell: electrodes stay constant in size.",
      environment: "Two cells side by side. Left: Pt electrodes remain same size. Right: Cu anode shrinks tick by tick, Cu cathode grows tick by tick. CuSO₄ solution shown.",
      chemistry: "Active anode: Cu → Cu²⁺ + 2e⁻ (dissolves). Cathode: Cu²⁺ + 2e⁻ → Cu (deposits). Solution concentration stays constant. Inert electrodes only transfer electrons.",
      particles: [
        { name: "Cu (anode)",    color: "#f97316", motion: "atom detaches from anode rod, becomes Cu²⁺ ion in solution", charge: "0→2+" },
        { name: "Cu²⁺ (ion)",   color: "#fbbf24", motion: "drifts from anode to cathode through solution",               charge: "2+" },
        { name: "Cu (cathode)",  color: "#f97316", motion: "deposits onto cathode rod surface, grows visible layer",      charge: "2+→0" },
        { name: "SO₄²⁻ spectator", color: "#7c6af7", motion: "does not discharge, drifts near anode",                   charge: "2-" },
      ]
    },
    "applications": {
      description: "Animate the electroplating process: a spoon (object to be plated) at the cathode. Silver rod at anode. AgNO₃ solution. Show Ag atoms dissolving from anode, becoming Ag⁺, drifting to spoon, depositing as shiny silver layer. Counter shows thickness growing.",
      environment: "Artistic setup: silver rod (anode, left), metal spoon (cathode, right), AgNO₃ solution glowing between them. Thickness meter on spoon.",
      chemistry: "Anode: Ag → Ag⁺ + e⁻. Cathode: Ag⁺ + e⁻ → Ag. Ag layer builds on object. NO₃⁻ spectator ions. Industrial application: jewelry, circuit boards, cutlery.",
      particles: [
        { name: "Ag (anode)",  color: "#d4d4d8", motion: "detach from silver rod one by one",                   charge: "0→1+" },
        { name: "Ag⁺",        color: "#fbbf24", motion: "drift across solution toward spoon",                   charge: "1+" },
        { name: "Ag (plate)", color: "#e2e8f0", motion: "deposit layer by layer on spoon surface",              charge: "1+→0" },
        { name: "NO₃⁻",       color: "#7c6af7", motion: "spectator — oscillates in solution, does not discharge", charge: "1-" },
      ]
    },
  };

  // ── Physics execute specs ──────────────────────────────────────────────────
  const physicsExecuteMap = {
    "ohm_law": {
      description: "Show a simple circuit: battery (left) → wire → resistor (centre) → wire back. Electrons flow as small cyan dots. When voltage increases (slider), dots speed up; when resistance increases, dots slow. Ammeter needle swings. V, I, R values update in real time.",
      environment: "Horizontal circuit loop. Battery symbol on left. Resistor box in centre. Ammeter and voltmeter shown as circular gauges.",
      particles: [
        { name: "e⁻ (electron)", color: "#4ade80", motion: "flow clockwise around circuit, speed ∝ V/R" },
        { name: "Heat photons",   color: "#fbbf24", motion: "burst from resistor when current flows — glow proportional to I²R" },
        { name: "Battery EMF",    color: "#7c6af7", motion: "arrows inside battery showing energy being given to charges" },
      ]
    },
    "refraction": {
      description: "Show a ray of light hitting a boundary between two media (air above, glass/water below). Before critical angle: ray splits into refracted ray (bends toward normal) and weak reflected ray. Normal line shown as dashed white. Angle labels θ₁ and θ₂ animate as the incident angle changes.",
      environment: "Horizontal boundary line mid-canvas. Upper half: air (dark, sparse particles). Lower half: glass/water (denser, blue-tinted). Normal = vertical dashed line at hit point.",
      particles: [
        { name: "Incident ray",  color: "#fbbf24", motion: "approaches boundary at angle θ₁, animated as moving photon stream" },
        { name: "Refracted ray", color: "#4ade80", motion: "bends toward normal on entering denser medium" },
        { name: "Reflected ray", color: "#f43f5e", motion: "weak partial reflection at boundary, obeys angle of incidence = angle of reflection" },
      ]
    },
    "total_internal_reflection": {
      description: "Show light inside a denser medium hitting the surface at increasing angles. At angles below critical angle: a refracted ray escapes. At exactly the critical angle: refracted ray runs along the boundary. Beyond critical angle: total reflection — NO ray escapes. Final panel: optical fibre with light bouncing along it.",
      environment: "Glass/water block shown as rectangle. Light source inside. Show angle increasing step by step. Critical angle marked with gold dashed line.",
      particles: [
        { name: "Light (below C)", color: "#4ade80", motion: "partial escape into air, shows refracted and reflected rays" },
        { name: "Light (at C)",    color: "#fbbf24", motion: "refracted ray skims along boundary at 90°" },
        { name: "Light (above C)", color: "#f43f5e", motion: "total reflection — 100% bounces back into medium, no escape" },
      ]
    },
    "current_electricity": {
      description: "Show a wire cross-section with free electrons (dots) drifting randomly when no voltage applied — net zero drift. When switch closes and battery connects: electrons drift in one direction (conventional current opposite). Show charge Q accumulating on a counter as Q = I×t.",
      environment: "Wire shown as rectangle. Battery and switch on left. Electrons shown as cyan dots.",
      particles: [
        { name: "Free e⁻ (no voltage)", color: "#94a3b8", motion: "random thermal motion — no net drift" },
        { name: "e⁻ (voltage on)",     color: "#4ade80", motion: "drift toward positive terminal, slow net velocity" },
        { name: "Conventional current", color: "#fbbf24", motion: "shown as arrow opposite to electron drift" },
      ]
    },
  };

  // ── Maths execute specs ────────────────────────────────────────────────────
  const mathsExecuteMap = {
    "trigonometry": {
      description: "Draw a right-angled triangle. Label the three sides: OPPOSITE (relative to angle θ), ADJACENT, HYPOTENUSE. Animate a glowing arc for angle θ. When the formula is applied, the relevant two sides glow and the ratio is calculated visually. Use a unit circle inset to show sin/cos geometrically.",
      environment: "Clean triangle on canvas with labelled sides. Angle θ marked with arc. Formula chosen (sin/cos/tan) shown top-right. Pythagoras theorem shown as coloured squares on each side.",
      particles: [
        { name: "Angle arc",      color: "#7c6af7", motion: "sweeps from 0 to θ with a glowing arc animation" },
        { name: "Active sides",   color: "#fbbf24", motion: "the two sides in the chosen ratio pulse gold" },
        { name: "Unit circle",    color: "#4ade80", motion: "small inset circle showing sin and cos as coordinates" },
      ]
    },
    "quadratic": {
      description: "Show the quadratic equation ax²+bx+c=0 with a and b and c labelled. Plot the parabola on a coordinate grid. Mark where it crosses the x-axis (the roots). Animate the discriminant calculation (b²-4ac) and show whether it's positive/negative/zero, linking to the number of crossings.",
      environment: "Coordinate axes. Parabola drawn and animated (appears curve by curve). Roots marked as gold points. Formula banner at top.",
      particles: [
        { name: "Parabola curve", color: "#7c6af7", motion: "draws itself from left to right using rAF" },
        { name: "Root points",    color: "#fbbf24", motion: "pulse gold at x-axis crossings when roots found" },
        { name: "Discriminant",   color: "#4ade80", motion: "number computed token by token, green if >0, red if <0" },
      ]
    },
  };

  const allExecute = { ...executeMap, ...physicsExecuteMap, ...mathsExecuteMap };
  return allExecute[problem.concept] || allExecute["polarity"];
}

// ── Subject detector — routes chemistry/physics/maths for prompt tailoring ────

function _detectSubject(problem) {
  const chemConcepts = new Set(["ionic_conduction","polarity","selective_discharge","half_equations","molten_vs_aqueous","active_inert","applications"]);
  const physicsConcepts = new Set(["ohm_law","resistance","refraction","total_internal_reflection","current_electricity","force_motion","pressure","lenz_law","buoyancy"]);
  const mathsConcepts = new Set(["trigonometry","quadratic","similar_triangles","coordinate_geometry","statistics","algebra","probability"]);

  if (chemConcepts.has(problem.concept))    return "chemistry";
  if (physicsConcepts.has(problem.concept)) return "physics";
  if (mathsConcepts.has(problem.concept))   return "maths";

  // Keyword fallback on prompt text
  const p = (problem.prompt || "").toLowerCase();
  if (/electrolysis|ion|electrode|cathode|anode|molten|aqueous/.test(p)) return "chemistry";
  if (/resistance|current|voltage|refraction|angle|ray|circuit|ohm/.test(p)) return "physics";
  if (/triangle|angle|equation|graph|coordinate|probability|median|mean/.test(p)) return "maths";

  return "chemistry"; // default (current course)
}

function _extractCorrectAnswer(problem) {
  // tap_select / mcq
  const correctOpt = (problem.widget?.options || []).find(o => o.correct);
  if (correctOpt) return `Option ${correctOpt.id}: "${correctOpt.label}"`;

  // fill_blank
  if (problem.widget?.blanks) {
    return problem.widget.blanks.map(b => `${b.id} = ${b.correct}`).join(", ");
  }

  // sort_order
  if (problem.widget?.correct_order) {
    const items = problem.widget.items || [];
    const order = problem.widget.correct_order.map(id => {
      const item = items.find(i => i.id === id);
      return item ? item.label : id;
    });
    return "Correct order: " + order.join(" → ");
  }

  // equation_builder
  if (problem.widget?.correct_equation) {
    return "Equation: " + problem.widget.correct_equation;
  }

  // label_diagram
  if (problem.widget?.correct_mapping) {
    return Object.entries(problem.widget.correct_mapping)
      .map(([k, v]) => `${k} = ${v}`).join(", ");
  }

  return problem.solution?.explanation?.slice(0, 120) || "See solution";
}
