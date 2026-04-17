/**
 * Vijnana Game Engine — Brilliant.org-style AI-enabled interactive learning
 *
 * Core responsibilities:
 *  1. Session management — track per-student progress, mastery per concept node
 *  2. Adaptive next problem — route based on mastery + error patterns
 *  3. Answer evaluation — check answers, compute XP, detect misconceptions
 *  4. AI feedback — Socratic hints + targeted wrong-answer diagnosis via Claude
 *  5. Variant generation — Claude generates new problem instances so answers can't be memorised
 */

import { readFileSync, readdirSync } from "fs";
import { join, dirname }            from "path";
import { fileURLToPath }            from "url";
import { v4 as uuid }               from "uuid";

const __dirname = dirname(fileURLToPath(import.meta.url));
const GAMES_DIR = join(__dirname, "../storage/games");

// ── Load all game definitions at startup ─────────────────────────────────────
const GAME_CATALOG = {};
for (const file of readdirSync(GAMES_DIR).filter(f => f.endsWith(".game.json"))) {
  const game = JSON.parse(readFileSync(join(GAMES_DIR, file), "utf8"));
  GAME_CATALOG[game.course_id] = game;
}

// ── Mastery levels ────────────────────────────────────────────────────────────
const MASTERY = { LOCKED: 0, INTRODUCED: 1, PRACTICED: 2, MASTERED: 3, EXPERT: 4 };
const MASTERY_LABEL = ["locked", "introduced", "practiced", "mastered", "expert"];

// ── In-memory session store ───────────────────────────────────────────────────
const SESSIONS     = new Map();
const SESSION_TTL  = 2 * 60 * 60 * 1000;  // 2 hours idle
const SESSION_MAX  = 500;

// Evict expired or oldest sessions
function _evictSessions() {
  const now = Date.now();
  for (const [id, s] of SESSIONS) {
    if (now - (s.lastActiveAt ?? s.startedAt) > SESSION_TTL) SESSIONS.delete(id);
  }
  // If still over cap, remove oldest by startedAt
  if (SESSIONS.size > SESSION_MAX) {
    const sorted = [...SESSIONS.entries()].sort((a, b) => a[1].startedAt - b[1].startedAt);
    for (const [id] of sorted.slice(0, SESSIONS.size - SESSION_MAX)) SESSIONS.delete(id);
  }
}
setInterval(_evictSessions, 15 * 60 * 1000);  // run every 15 min

// ─────────────────────────────────────────────────────────────────────────────
// SESSION MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export function createSession(courseId, userId, dbProgress = null) {
  const game = GAME_CATALOG[courseId];
  if (!game) throw new Error(`Unknown course: ${courseId}`);

  // Build mastery map from DB progress or start from zero
  const mastery = {};
  const errorLog = {};
  for (const node of game.concept_graph.nodes) {
    mastery[node.id] = dbProgress?.[node.id] ?? 0;
    errorLog[node.id] = [];
  }

  // Per-concept wrong streak tracker — 3 consecutive wrongs triggers remediation
  const wrongStreak = {};
  // Remediation mode per concept — serves easiest problems until recovery
  const remediationMode = {};
  // Spaced review — track when each concept was mastered for EXPERT promotion
  const spacedReview = {};
  for (const node of game.concept_graph.nodes) {
    wrongStreak[node.id]    = 0;
    remediationMode[node.id] = false;
    spacedReview[node.id]   = dbProgress?.spaced_review?.[node.id] ?? null;
  }

  const session = {
    sessionId: uuid(),
    courseId,
    userId,
    xp: dbProgress?.total_xp ?? 0,
    streak: 0,
    mastery,
    errorLog,
    wrongStreak,
    remediationMode,
    spacedReview,
    completedProblems: new Set(dbProgress?.completed ?? []),
    currentConceptId: null,
    hintsUsedThisSession: 0,
    problemStartedAt: null,
    startedAt:    Date.now(),
    lastActiveAt: Date.now(),
  };
  _evictSessions();

  // Unlock first available node
  session.currentConceptId = _firstUnlockedNode(game, mastery);
  SESSIONS.set(session.sessionId, session);
  return session;
}

export function getSession(sessionId) {
  const s = SESSIONS.get(sessionId) ?? null;
  if (s) s.lastActiveAt = Date.now();
  return s;
}

// ─────────────────────────────────────────────────────────────────────────────
// NEXT PROBLEM SELECTION (Adaptive)
// ─────────────────────────────────────────────────────────────────────────────

export function nextProblem(sessionId) {
  const session = SESSIONS.get(sessionId);
  if (!session) return null;

  const game = GAME_CATALOG[session.courseId];
  const concept = _resolveCurrentConcept(game, session);
  if (!concept) return { status: "course_complete", message: "All concepts mastered!" };

  session.currentConceptId = concept.id;
  session.problemStartedAt = Date.now();

  // Check if any mastered concept is due for spaced review (promotes to EXPERT)
  const reviewDue = _findSpacedReviewDue(game, session);
  if (reviewDue) {
    const reviewP = game.problems[reviewDue.pid];
    if (reviewP) return _serveWithContext(reviewDue.pid, reviewP, reviewDue.concept, session, game, "spaced_review");
  }

  // Get problems for this concept that haven't been completed
  const available = concept.problems
    .map(pid => ({ pid, p: game.problems[pid] }))
    .filter(({ pid }) => !session.completedProblems.has(pid))
    .sort((a, b) => {
      // In remediation mode: easiest first; otherwise normal difficulty order
      const inRemediation = session.remediationMode[concept.id];
      const diff = (a.p.difficulty ?? 1) - (b.p.difficulty ?? 1);
      return inRemediation ? diff : diff;
    });

  if (available.length === 0) {
    _advanceMastery(session, concept.id, game);
    return nextProblem(sessionId);
  }

  // In remediation mode: serve the lowest-difficulty problem, flag it
  if (session.remediationMode[concept.id]) {
    const { pid, p } = available[0];
    return _serveWithContext(pid, p, concept, session, game, "remediation");
  }

  // Error-targeted retry (2+ errors on this concept)
  const errors = session.errorLog[concept.id] ?? [];
  if (errors.length >= 2) {
    const retryPid = errors[errors.length - 1];
    const retryP = game.problems[retryPid];
    if (retryP && !session.completedProblems.has(retryPid)) {
      return _serveWithContext(retryPid, retryP, concept, session, game, "retry");
    }
  }

  const { pid, p } = available[0];
  return _serveWithContext(pid, p, concept, session, game, "new");
}

// ─────────────────────────────────────────────────────────────────────────────
// ANSWER EVALUATION
// ─────────────────────────────────────────────────────────────────────────────

export function evaluateAnswer(sessionId, problemId, studentAnswer) {
  const session = SESSIONS.get(sessionId);
  if (!session) return { error: "Session not found" };

  const game = GAME_CATALOG[session.courseId];
  const problem = game.problems[problemId];
  if (!problem) return { error: "Problem not found" };

  const result = _checkAnswer(problem, studentAnswer);

  const timeSec = session.problemStartedAt
    ? Math.round((Date.now() - session.problemStartedAt) / 1000)
    : null;
  session.problemStartedAt = null;

  if (result.correct) {
    // Award XP with streak multiplier; bonus for fast answer (under 30s)
    session.streak++;
    const streakMult = session.streak >= 5 ? 2.0 : session.streak >= 3 ? 1.5 : 1.0;
    const speedBonus  = timeSec !== null && timeSec < 30 ? 1.1 : 1.0;
    const multiplier  = streakMult * speedBonus;
    const earned      = Math.round((problem.xp ?? 100) * multiplier);
    session.xp += earned;
    session.completedProblems.add(problemId);

    // Reset wrong streak for this concept
    session.wrongStreak[problem.concept]    = 0;
    session.remediationMode[problem.concept] = false;

    // Advance mastery
    _advanceMastery(session, problem.concept, game);

    // If this was a spaced review problem, mark it passed
    const spaced = session.spacedReview[problem.concept];
    if (spaced && !spaced.passed) {
      session.spacedReview[problem.concept] = { ...spaced, passed: true, reviewedAt: Date.now() };
      // Promote to EXPERT
      if (session.mastery[problem.concept] >= MASTERY.MASTERED) {
        session.mastery[problem.concept] = MASTERY.EXPERT;
      }
    }

    return {
      correct: true,
      xp_earned: earned,
      streak: session.streak,
      streak_multiplier: parseFloat(multiplier.toFixed(2)),
      speed_bonus: speedBonus > 1,
      time_sec: timeSec,
      total_xp: session.xp,
      mastery: session.mastery[problem.concept],
      mastery_label: MASTERY_LABEL[session.mastery[problem.concept] ?? 0],
      key_fact: problem.solution.key_fact,
      explanation: problem.solution.explanation,
      key_facts: (problem.keyFacts ?? []).slice(0, 3),
    };
  } else {
    // Deduct XP, log error, track wrong streak
    session.streak = 0;
    session.xp = Math.max(0, session.xp - 10);
    if (!session.errorLog[problem.concept]) session.errorLog[problem.concept] = [];
    session.errorLog[problem.concept].push(problemId);

    session.wrongStreak[problem.concept] = (session.wrongStreak[problem.concept] ?? 0) + 1;
    const triggered = session.wrongStreak[problem.concept] >= 3;
    if (triggered) session.remediationMode[problem.concept] = true;

    const misconception = _matchMisconception(problem, studentAnswer);

    return {
      correct: false,
      xp_penalty: -10,
      total_xp: session.xp,
      streak: 0,
      time_sec: timeSec,
      wrong_streak: session.wrongStreak[problem.concept],
      remediation_triggered: triggered,
      misconception: misconception ?? null,
      hint_available: true,
      hint_cost_xp: problem.hint_cost_xp ?? 20,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AI FEEDBACK (requires callClaude function injected at route-level)
// ─────────────────────────────────────────────────────────────────────────────

export async function getAIFeedback(sessionId, problemId, studentAnswer, callClaude) {
  const session = SESSIONS.get(sessionId);
  const game = GAME_CATALOG[session?.courseId];
  const problem = game?.problems[problemId];
  if (!problem) return { error: "Problem not found" };

  const config = game.ai_engine_config;
  const misconception = _matchMisconception(problem, studentAnswer);

  const prompt = `${config.feedback_persona}

PROBLEM: "${problem.prompt}"
STUDENT ANSWER: "${JSON.stringify(studentAnswer)}"
CORRECT ANSWER: "${JSON.stringify(problem.solution)}"
${misconception ? `DIAGNOSED MISCONCEPTION: "${misconception.diagnosis}"` : ""}

Give targeted Socratic feedback in max 2 sentences. Do NOT give the answer.`;

  const feedback = await callClaude(prompt, { model: config.feedback_model, maxTokens: config.max_feedback_tokens });
  return { feedback, misconception: misconception?.diagnosis ?? null };
}

export async function getHint(sessionId, problemId, hintIndex, callClaude) {
  const session = SESSIONS.get(sessionId);
  const game = GAME_CATALOG[session?.courseId];
  const problem = game?.problems[problemId];
  if (!problem) return { error: "Problem not found" };

  const hintCost = problem.hint_cost_xp ?? 20;
  // After a wrong attempt, hints are free — student needs guidance, not a penalty
  const alreadyAttempted = session.errorLog[problem.concept]?.includes(problemId) ?? false;
  const effectiveCost = alreadyAttempted ? 0 : hintCost;
  if (session.xp < effectiveCost) return { error: "Not enough XP for a hint", xp_required: effectiveCost };

  // Use pre-written hint if available
  const hints = problem.hints ?? [];
  if (hints[hintIndex]) {
    session.xp = Math.max(0, session.xp - effectiveCost);
    session.hintsUsedThisSession++;
    return { hint: hints[hintIndex], xp_spent: effectiveCost, total_xp: session.xp };
  }

  // AI-generated hint as fallback
  const config = game.ai_engine_config;
  const prompt = `${config.hint_persona}

PROBLEM: "${problem.prompt}"
CORRECT ANSWER IS KNOWN. Student needs hint #${hintIndex + 1}.

Give ONE sentence Socratic nudge. Do NOT reveal the answer.`;

  const hint = await callClaude(prompt, { model: config.hint_model, maxTokens: config.max_hint_tokens });
  session.xp = Math.max(0, session.xp - effectiveCost);
  session.hintsUsedThisSession++;
  return { hint, xp_spent: effectiveCost, total_xp: session.xp };
}

export async function generateVariant(sessionId, problemId, callClaude) {
  const session = SESSIONS.get(sessionId);
  const game = GAME_CATALOG[session?.courseId];
  const problem = game?.problems[problemId];
  if (!problem) return { error: "Problem not found" };

  const config = game.ai_engine_config;
  const prompt = `${config.variant_persona}

ORIGINAL PROBLEM (JSON):
${JSON.stringify(problem, null, 2)}

Generate a NEW problem of the same type, same difficulty (${problem.difficulty}), same concept ("${problem.concept}"), but with different specific ions/salts/context from ICSE Class 10 Chemistry.
Return ONLY valid JSON matching the exact schema of the original problem. No preamble.`;

  const raw = await callClaude(prompt, { model: config.variant_model, maxTokens: config.max_variant_tokens });
  try {
    const { jsonrepair } = await import("jsonrepair");
    return { variant: JSON.parse(jsonrepair(raw)) };
  } catch {
    return { error: "Variant generation failed — malformed JSON", raw };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESS SNAPSHOT (for DB persistence)
// ─────────────────────────────────────────────────────────────────────────────

export function getProgressSnapshot(sessionId) {
  const session = SESSIONS.get(sessionId);
  if (!session) return null;
  return {
    sessionId:        session.sessionId,
    courseId:         session.courseId,
    userId:           session.userId,
    xp:               session.xp,
    streak:           session.streak,
    mastery:          session.mastery,
    spacedReview:     session.spacedReview,
    completedProblems: [...session.completedProblems],
    currentConceptId: session.currentConceptId,
    hintsUsed:        session.hintsUsedThisSession,
    duration_sec:     Math.round((Date.now() - session.startedAt) / 1000),
    remediation_active: Object.entries(session.remediationMode)
      .filter(([, v]) => v).map(([k]) => k),
  };
}

/** Returns per-concept mastery stats — useful for the UI mastery dashboard. */
export function getMasteryStats(sessionId) {
  const session = SESSIONS.get(sessionId);
  if (!session) return null;
  const game = GAME_CATALOG[session.courseId];
  return game.concept_graph.nodes.map(node => {
    const conceptProblems = node.problems ?? [];
    const solved = conceptProblems.filter(pid => session.completedProblems.has(pid)).length;
    return {
      conceptId:      node.id,
      title:          node.title,
      mastery:        session.mastery[node.id] ?? 0,
      mastery_label:  MASTERY_LABEL[session.mastery[node.id] ?? 0],
      problems_solved: solved,
      problems_total:  conceptProblems.length,
      wrong_streak:    session.wrongStreak[node.id] ?? 0,
      in_remediation:  session.remediationMode[node.id] ?? false,
      spaced_review:   session.spacedReview[node.id] ?? null,
    };
  });
}

/** Drop a concept back to INTRODUCED and clear its completed problems — lets student retry. */
export function resetConcept(sessionId, conceptId) {
  const session = SESSIONS.get(sessionId);
  if (!session) return { error: "Session not found" };
  const game = GAME_CATALOG[session.courseId];
  const concept = game.concept_graph.nodes.find(n => n.id === conceptId);
  if (!concept) return { error: "Concept not found" };

  for (const pid of concept.problems ?? []) session.completedProblems.delete(pid);
  session.mastery[conceptId]       = MASTERY.INTRODUCED;
  session.wrongStreak[conceptId]   = 0;
  session.remediationMode[conceptId] = false;
  session.spacedReview[conceptId]  = null;

  return { success: true, conceptId, mastery: MASTERY.INTRODUCED, mastery_label: "introduced" };
}

/** Manually mark a spaced review as passed (e.g. after a teacher verifies). */
export function markSpacedReviewPassed(sessionId, conceptId) {
  const session = SESSIONS.get(sessionId);
  if (!session) return { error: "Session not found" };
  const spaced = session.spacedReview[conceptId];
  if (!spaced) return { error: "No spaced review pending for this concept" };

  session.spacedReview[conceptId] = { ...spaced, passed: true, reviewedAt: Date.now() };
  if (session.mastery[conceptId] >= MASTERY.MASTERED) session.mastery[conceptId] = MASTERY.EXPERT;
  return { success: true, mastery: session.mastery[conceptId], mastery_label: "expert" };
}

export function listCourses() {
  return Object.values(GAME_CATALOG).map(g => ({
    course_id: g.course_id,
    title: g.title,
    subject: g.subject,
    chapter: g.chapter,
    class_key: g.class_key,
    estimated_minutes: g.estimated_minutes,
    icse_marks_covered: g.icse_marks_covered,
    concept_count: g.concept_graph.nodes.length,
    problem_count: Object.keys(g.problems).length,
  }));
}

/** Returns the full game object (including problems) for a courseId, or null. */
export function getCourse(courseId) {
  return GAME_CATALOG[courseId] ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function _firstUnlockedNode(game, mastery) {
  // Walk graph: return first node where all prerequisites are mastered
  for (const node of game.concept_graph.nodes) {
    const prereqs = game.concept_graph.edges
      .filter(e => e.to === node.id && e.type === "prerequisite")
      .map(e => e.from);
    const allPrereqsMet = prereqs.every(pid => (mastery[pid] ?? 0) >= MASTERY.MASTERED);
    if (allPrereqsMet && (mastery[node.id] ?? 0) < MASTERY.MASTERED) {
      return node.id;
    }
  }
  return game.concept_graph.nodes[0]?.id ?? null;
}

function _resolveCurrentConcept(game, session) {
  const conceptId = session.currentConceptId ?? _firstUnlockedNode(game, session.mastery);
  if (!conceptId) return null;

  const node = game.concept_graph.nodes.find(n => n.id === conceptId);
  if (!node) return null;

  // Check if this concept is already mastered — advance if so
  if ((session.mastery[conceptId] ?? 0) >= MASTERY.MASTERED) {
    const next = _firstUnlockedNode(game, session.mastery);
    if (next === conceptId) return null; // all done
    session.currentConceptId = next;
    return game.concept_graph.nodes.find(n => n.id === next) ?? null;
  }
  return node;
}

function _advanceMastery(session, conceptId, game) {
  if (!session.mastery[conceptId]) session.mastery[conceptId] = 0;
  const concept = game.concept_graph.nodes.find(n => n.id === conceptId);
  const threshold = concept?.mastery_threshold ?? 3;

  const conceptProblems = concept?.problems ?? [];
  const solved = conceptProblems.filter(pid => session.completedProblems.has(pid)).length;
  const current = session.mastery[conceptId];

  // 5-level progression: LOCKED → INTRODUCED → PRACTICED → MASTERED → EXPERT
  // EXPERT is granted via spaced review in evaluateAnswer (not here)
  if (solved >= threshold && current < MASTERY.MASTERED) {
    session.mastery[conceptId] = MASTERY.MASTERED;
    // Start spaced review clock if not already set
    if (!session.spacedReview[conceptId]) {
      session.spacedReview[conceptId] = { masteredAt: Date.now(), reviewedAt: null, passed: false };
    }
  } else if (solved >= 2 && current < MASTERY.PRACTICED) {
    session.mastery[conceptId] = MASTERY.PRACTICED;
  } else if (solved >= 1 && current < MASTERY.INTRODUCED) {
    session.mastery[conceptId] = MASTERY.INTRODUCED;
  }
}

// Find a mastered concept whose spaced review is due (24h+ since mastery, not yet passed)
function _findSpacedReviewDue(game, session) {
  const REVIEW_GAP_MS = 24 * 60 * 60 * 1000; // 24 hours
  for (const node of game.concept_graph.nodes) {
    const spaced = session.spacedReview[node.id];
    if (!spaced || spaced.passed) continue;
    if ((Date.now() - spaced.masteredAt) < REVIEW_GAP_MS) continue;
    // Find an unsolved problem from this concept to serve as review
    const reviewPid = node.problems?.find(pid => session.completedProblems.has(pid));
    if (reviewPid) return { concept: node, pid: reviewPid };
  }
  return null;
}

function _serveWithContext(pid, problem, concept, session, game, mode) {
  // Strip solution from served problem — client should not receive answers
  const { solution, misconceptions, ...clientProblem } = problem;
  return {
    status: "ok",
    mode,
    problem_id: pid,
    problem: clientProblem,
    concept: {
      id: concept.id,
      title: concept.title,
      description: concept.description ?? "",
      deeper_explanation:   concept.deeper_explanation   ?? "",
      analogy:              concept.analogy              ?? "",
      real_world:           concept.real_world           ?? "",
      common_misconception: concept.common_misconception ?? "",
      mastery: session.mastery[concept.id] ?? 0,
      mastery_label: MASTERY_LABEL[session.mastery[concept.id] ?? 0],
      problems_remaining: concept.problems.filter(p => !session.completedProblems.has(p)).length,
      total_problems: concept.problems.length,
    },
    session_xp:      session.xp,
    streak:          session.streak,
    hints_available: (problem.hints?.length ?? 0),
    hint_cost_xp:    problem.hint_cost_xp ?? 20,
    in_remediation:  session.remediationMode[concept.id] ?? false,
    wrong_streak:    session.wrongStreak[concept.id] ?? 0,
  };
}

function _checkAnswer(problem, studentAnswer) {
  const { type, widget, solution } = problem;

  switch (type) {
    case "tap_select":
    case "mcq": {
      const correct = widget.options?.find(o => o.correct)?.id;
      return { correct: studentAnswer?.selected === correct };
    }

    case "sort_order": {
      const studentOrder = studentAnswer?.order ?? [];
      // Support multiple valid orderings (e.g. when some items are equivalent)
      const acceptedOrders = widget.correct_orders ?? (widget.correct_order ? [widget.correct_order] : []);
      if (!acceptedOrders.length) return { correct: false };
      if (acceptedOrders[0].length !== studentOrder.length) return { correct: false };
      const isMatch = (ref) => ref.every((id, i) => studentOrder[i] === id);
      return { correct: acceptedOrders.some(isMatch) };
    }

    case "label_diagram": {
      const mapping = widget.correct_mapping ?? {};
      const studentMapping = studentAnswer?.mapping ?? {};
      const allCorrect = Object.entries(mapping).every(([k, v]) => studentMapping[k] === v);
      return { correct: allCorrect };
    }

    case "fill_blank": {
      const blanks = widget.blanks ?? [];
      const studentBlanks = studentAnswer?.blanks ?? {};
      const allCorrect = blanks.every(b => studentBlanks[b.id] === b.correct);
      return { correct: allCorrect };
    }

    case "equation_builder": {
      // Normalise whitespace and compare equation string
      const normalise = s => (s ?? "").replace(/\s+/g, " ").trim().toLowerCase();
      const correct = normalise(widget.correct_equation);
      const student = normalise(studentAnswer?.equation ?? "");
      return { correct: correct === student };
    }

    case "comparison_table": {
      // Check all cells in the table
      const rows = widget.rows ?? [];
      const studentData = studentAnswer?.table ?? {};
      const allCorrect = rows.every(row => {
        return studentData[row.property]?.molten === row.correct.molten &&
               studentData[row.property]?.aqueous === row.correct.aqueous;
      });
      return { correct: allCorrect };
    }

    case "prediction":
    case "two_option_compare": {
      const aCorrect = widget.scenario_A?.options?.find(o => o.correct)?.id;
      const bCorrect = widget.scenario_B?.options?.find(o => o.correct)?.id;
      return {
        correct: studentAnswer?.scenario_A === aCorrect && studentAnswer?.scenario_B === bCorrect,
      };
    }

    case "tap_select":
    case "multi_select": {
      const correct = new Set((widget.options ?? []).filter(o => o.correct).map(o => o.id));
      const student = new Set(studentAnswer?.selected ?? []);
      return { correct: _setsEqual(correct, student) };
    }

    case "design_task":
    case "cell_builder": {
      const components = widget.components ?? [];
      const studentComponents = studentAnswer?.components ?? {};
      const allCorrect = components.every(c => studentComponents[c.component] === c.correct);
      return { correct: allCorrect };
    }

    case "matching": {
      const pairs = widget.pairs ?? [];
      const studentPairs = studentAnswer?.matches ?? {};
      const allCorrect = pairs.every(p => studentPairs[p.description] === p.correct);
      return { correct: allCorrect };
    }

    case "slider_sim": {
      // Accept explicit correct_answer match, or keyword heuristic for open responses
      const canonical = (widget.correct_answer ?? "").toLowerCase().trim();
      const studentAns = (studentAnswer?.written ?? "").toLowerCase().trim();
      if (canonical && studentAns === canonical) return { correct: true };
      const keyTerms = ["concentration", "override", "discharge potential"];
      const found = keyTerms.filter(t => studentAns.includes(t)).length;
      return { correct: found >= 2 };
    }

    case "number_input": {
      const correctVal = widget.correct_value ?? solution?.correct_value;
      if (correctVal == null) return { correct: false };
      const studentVal = parseFloat(studentAnswer?.value ?? studentAnswer?.selected ?? "");
      const tolerance  = widget.tolerance ?? 0;
      return { correct: Math.abs(studentVal - correctVal) <= tolerance };
    }

    case "dropdown_fill": {
      // solution.correct_id is an array matching widget.blanks order
      const correctIds = solution?.correct_id ?? [];
      const studentIds = studentAnswer?.selected ?? [];
      if (!correctIds.length) return { correct: false };
      const allMatch = correctIds.every((v, i) => String(studentIds[i] ?? "").trim().toLowerCase() === String(v).trim().toLowerCase());
      return { correct: allMatch };
    }

    case "two_column_select": {
      // widget has cathode_options and anode_options arrays with correct:bool flags
      const correctCathode = widget.cathode_options?.find(o => o.correct)?.id;
      const correctAnode   = widget.anode_options?.find(o => o.correct)?.id;
      return {
        correct: studentAnswer?.cathode === correctCathode && studentAnswer?.anode === correctAnode,
      };
    }

    default:
      return { correct: false, reason: `Unknown problem type: ${type}` };
  }
}

function _matchMisconception(problem, studentAnswer) {
  const misconceptions = problem.misconceptions ?? [];
  if (!misconceptions.length) return null;

  for (const mc of misconceptions) {
    // Match by wrong_id
    if (mc.wrong_id && studentAnswer?.selected === mc.wrong_id) return mc;
    // Match by pattern keyword in answer
    if (mc.pattern) {
      const answerStr = JSON.stringify(studentAnswer).toLowerCase();
      if (answerStr.includes(mc.pattern.toLowerCase())) return mc;
    }
  }
  return misconceptions[0] ?? null; // fallback to first misconception
}

function _setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const item of a) if (!b.has(item)) return false;
  return true;
}
