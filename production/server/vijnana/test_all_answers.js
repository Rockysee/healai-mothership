/**
 * Vijnana — Full Answer Pass Test
 * Runs every course, submits the correct answer for every problem,
 * and reports anything that fails, gets stuck, or has no correct answer derivable.
 *
 * Usage:
 *   node server/vijnana/test_all_answers.js
 */

import {
  createSession,
  nextProblem,
  evaluateAnswer,
  listCourses,
  getCourse,
} from "./game_engine.js";

// ── Extract the correct answer payload from problem data ─────────────────────
function correctAnswerFor(p) {
  const w = p.widget;
  switch (p.type) {
    case "tap_select":
    case "mcq": {
      const id = w.options?.find(o => o.correct)?.id;
      return id ? { selected: id } : null;
    }
    case "multi_select": {
      const ids = w.options?.filter(o => o.correct).map(o => o.id);
      return ids?.length ? { selected: ids } : null;
    }
    case "sort_order": {
      const order = (w.correct_orders ?? (w.correct_order ? [w.correct_order] : []))[0];
      return order ? { order } : null;
    }
    case "fill_blank": {
      const blanks = {};
      (w.blanks ?? []).forEach(b => { blanks[b.id] = b.correct; });
      return Object.keys(blanks).length ? { blanks } : null;
    }
    case "label_diagram": {
      return w.correct_mapping ? { mapping: w.correct_mapping } : null;
    }
    case "equation_builder": {
      return w.correct_equation ? { equation: w.correct_equation } : null;
    }
    case "comparison_table": {
      const table = {};
      (w.rows ?? []).forEach(r => { table[r.property] = r.correct; });
      return Object.keys(table).length ? { table } : null;
    }
    case "prediction":
    case "two_option_compare": {
      const a = w.scenario_A?.options?.find(o => o.correct)?.id;
      const b = w.scenario_B?.options?.find(o => o.correct)?.id;
      return a && b ? { scenario_A: a, scenario_B: b } : null;
    }
    case "matching": {
      const matches = {};
      (w.pairs ?? []).forEach(pair => {
        const key = pair.description ?? pair.left;
        const val = pair.correct ?? pair.match ?? pair.right;
        if (key && val) matches[key] = val;
      });
      return Object.keys(matches).length ? { matches } : null;
    }
    case "design_task":
    case "cell_builder": {
      const components = {};
      (w.components ?? []).forEach(c => { components[c.component] = c.correct; });
      return Object.keys(components).length ? { components } : null;
    }
    case "number_input": {
      const v = w.correct_value ?? p.solution?.correct_value;
      return v != null ? { value: String(v) } : null;
    }
    case "dropdown_fill": {
      const ids = p.solution?.correct_id;
      return Array.isArray(ids) && ids.length ? { selected: ids } : null;
    }
    case "two_column_select": {
      const cathode = w.cathode_options?.find(o => o.correct)?.id;
      const anode   = w.anode_options?.find(o => o.correct)?.id;
      return cathode && anode ? { cathode, anode } : null;
    }
    case "slider_sim": {
      const ans = w.correct_answer;
      return ans ? { written: ans } : null;
    }
    default:
      return null;
  }
}

// ── Run one course ────────────────────────────────────────────────────────────
function runCourse(courseId) {
  const session = createSession(courseId, "autotest");
  const results = [];
  const MAX_STEPS = 200; // safety cap against infinite loops
  let steps = 0;

  while (steps++ < MAX_STEPS) {
    const data = nextProblem(session.sessionId);
    if (!data || data.status === "course_complete") break;

    const pid     = data.problem_id;
    // Use raw problem (with solution intact) — nextProblem strips solution for security
    const p       = getCourse(courseId).problems[pid];
    const ans     = correctAnswerFor(p);

    if (!ans) {
      results.push({ pid, type: p.type, status: "SKIP", reason: "no_correct_answer_derivable" });
      // Force-complete the problem by marking it done (advance past unanswerable)
      // Submit a dummy wrong answer twice so engine moves on
      evaluateAnswer(session.sessionId, pid, { selected: "__skip__" });
      evaluateAnswer(session.sessionId, pid, { selected: "__skip__" });
      // Add to completedProblems so it doesn't loop
      session.completedProblems.add(pid);
      continue;
    }

    const result = evaluateAnswer(session.sessionId, pid, ans);

    if (result.error) {
      results.push({ pid, type: p.type, status: "ERROR", reason: result.error });
    } else if (result.correct) {
      results.push({ pid, type: p.type, status: "PASS" });
    } else {
      results.push({ pid, type: p.type, status: "FAIL", answer: ans, widget: w_summary(p.widget) });
    }
  }

  if (steps >= MAX_STEPS) {
    results.push({ pid: "—", type: "—", status: "STUCK", reason: `still_running_after_${MAX_STEPS}_steps` });
  }

  return results;
}

function w_summary(w) {
  return { kind: w?.kind, correct_order: w?.correct_order, correct_orders: w?.correct_orders, correct_id: w?.correct_id };
}

// ── Main ──────────────────────────────────────────────────────────────────────
const courses  = listCourses().map(c => c.course_id);
let totalPass  = 0, totalFail = 0, totalSkip = 0, totalError = 0;

console.log(`\nVijnana Answer-Pass Test — ${courses.length} courses\n${"─".repeat(60)}`);

for (const courseId of courses) {
  const results = runCourse(courseId);
  const pass  = results.filter(r => r.status === "PASS").length;
  const fail  = results.filter(r => r.status === "FAIL");
  const skip  = results.filter(r => r.status === "SKIP");
  const err   = results.filter(r => r.status === "ERROR" || r.status === "STUCK");

  const icon  = fail.length || err.length ? "✗" : skip.length ? "~" : "✓";
  console.log(`${icon}  ${courseId.padEnd(42)} pass:${pass}  fail:${fail.length}  skip:${skip.length}  err:${err.length}`);

  if (fail.length) {
    fail.forEach(f => console.log(`     FAIL  ${f.pid} (${f.type})`, JSON.stringify(f.answer)));
  }
  if (err.length) {
    err.forEach(e => console.log(`     ERR   ${e.pid} — ${e.reason || ""}`));
  }
  if (skip.length) {
    skip.forEach(s => console.log(`     SKIP  ${s.pid} (${s.type}) — ${s.reason}`));
  }

  totalPass  += pass;
  totalFail  += fail.length;
  totalSkip  += skip.length;
  totalError += err.length;
}

console.log(`${"─".repeat(60)}`);
console.log(`TOTAL  pass:${totalPass}  fail:${totalFail}  skip:${totalSkip}  err:${totalError}`);
console.log(totalFail + totalError === 0 ? "\n✓ All answerable problems pass correctly.\n" : "\n✗ Failures above need fixing.\n");
