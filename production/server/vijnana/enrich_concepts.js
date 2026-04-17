/**
 * Vijnana — Concept Enrichment Script
 *
 * For every concept node across all 19 game courses, calls Claude to add:
 *   deeper_explanation  — 4–5 sentences on WHY the concept works
 *   analogy             — relatable real-world comparison for a 15-year-old
 *   real_world          — one concrete daily-life or industry application
 *   common_misconception — the single most dangerous wrong mental model
 *
 * Writes results back into each .game.json file in place.
 * Safe to re-run — already-enriched concepts are skipped (idempotent).
 *
 * Usage:
 *   node server/vijnana/enrich_concepts.js
 */

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, dirname }  from "path";
import { fileURLToPath }  from "url";
import { config }         from "dotenv";
import fetch              from "node-fetch";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../../.env") });

const GAMES_DIR   = join(__dirname, "../storage/games");
const API_KEY     = process.env.ANTHROPIC_API_KEY;
const MODEL       = "claude-haiku-4-5-20251001";  // fast + cheap for batch work
const DELAY_MS    = 300;                           // avoid rate limits

if (!API_KEY) { console.error("ANTHROPIC_API_KEY not set"); process.exit(1); }

// ── Call Claude ───────────────────────────────────────────────────────────────
async function enrich(subject, chapter, conceptTitle, conceptDescription, sampleProblems) {
  const sampleText = sampleProblems
    .slice(0, 3)
    .map(p => `- "${p.title}": ${p.prompt}`)
    .join("\n");

  const prompt = `You are an expert ICSE Class 10 tutor creating rich concept explanations for a gamified learning app aimed at 14–17 year olds in India.

SUBJECT: ${subject} — ${chapter}
CONCEPT: ${conceptTitle}
ONE-LINE DESCRIPTION: ${conceptDescription}

SAMPLE PROBLEMS IN THIS CONCEPT:
${sampleText}

Generate a JSON object with exactly these 4 fields. Be specific to this concept — no generic filler.

{
  "deeper_explanation": "4–5 sentences explaining WHY this concept works at a mechanistic level, not just what the rule is. Use cause-and-effect language. Suitable for a curious 15-year-old who asks 'but WHY?'",
  "analogy": "One vivid, concrete analogy to something a Class 10 Indian student encounters daily — school, cricket, Mumbai local train, phone battery, cooking, traffic. Make it sticky.",
  "real_world": "One real industry or daily-life application that directly uses this concept. Be specific — name the technology, product, or phenomenon.",
  "common_misconception": "The single most dangerous wrong mental model students carry into this concept. State it as the student would think it, then state why it's wrong in one sentence."
}

Output ONLY valid JSON. No markdown, no explanation outside the JSON.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API ${res.status}: ${err.slice(0, 200)}`);
  }

  const data  = await res.json();
  const text  = data.content?.[0]?.text?.trim() ?? "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`No JSON in response: ${text.slice(0, 200)}`);
  return JSON.parse(match[0]);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Main ──────────────────────────────────────────────────────────────────────
const files = readdirSync(GAMES_DIR).filter(f => f.endsWith(".game.json"));
let total = 0, enriched = 0, skipped = 0, errors = 0;

console.log(`\nVijnana Concept Enrichment — ${files.length} courses\n${"─".repeat(60)}`);

for (const file of files) {
  const path = join(GAMES_DIR, file);
  const game = JSON.parse(readFileSync(path, "utf8"));
  const nodes = game.concept_graph?.nodes ?? [];
  const subject = game.subject ?? "unknown";
  const chapter = game.chapter ?? game.title ?? file;
  let fileChanged = false;

  for (const node of nodes) {
    total++;

    // Skip if already enriched
    if (node.deeper_explanation) {
      process.stdout.write(`  ~ ${game.course_id} / ${node.id} (already enriched)\n`);
      skipped++;
      continue;
    }

    // Collect sample problems for this concept
    const sampleProblems = (node.problems ?? [])
      .map(pid => game.problems?.[pid])
      .filter(Boolean)
      .slice(0, 3);

    process.stdout.write(`  ↻ ${game.course_id} / ${node.id} "${node.title}" ...`);

    try {
      const enrichment = await enrich(subject, chapter, node.title, node.description, sampleProblems);

      node.deeper_explanation    = enrichment.deeper_explanation;
      node.analogy               = enrichment.analogy;
      node.real_world            = enrichment.real_world;
      node.common_misconception  = enrichment.common_misconception;

      fileChanged = true;
      enriched++;
      process.stdout.write(` ✓\n`);
    } catch (e) {
      errors++;
      process.stdout.write(` ✗ ${e.message}\n`);
    }

    await sleep(DELAY_MS);
  }

  if (fileChanged) {
    writeFileSync(path, JSON.stringify(game, null, 2));
  }
}

console.log(`${"─".repeat(60)}`);
console.log(`Concepts total: ${total}  enriched: ${enriched}  skipped: ${skipped}  errors: ${errors}`);
console.log(errors === 0 ? "\n✓ All concepts enriched.\n" : `\n⚠ ${errors} errors — re-run to retry failed concepts.\n`);
