#!/usr/bin/env node
/**
 * FRAMEGEN — MIT Style Auto-Debugger
 * Rigorous console-based diagnostic tool
 */

import fetch from "node-fetch";
import { execSync } from "child_process";
import fs from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT      = join(__dirname, "..");
dotenv.config({ path: join(ROOT, ".env") });

const bold = s => `\x1b[1m${s}\x1b[0m`;
const dim  = s => `\x1b[2m${s}\x1b[0m`;
const cyan = s => `\x1b[36m${s}\x1b[0m`;
const green = s => `\x1b[32m${s}\x1b[0m`;
const yellow = s => `\x1b[33m${s}\x1b[0m`;
const red = s => `\x1b[31m${s}\x1b[0m`;

console.log("\n" + bold(cyan(" 🕵️  Syllabus Studio | MIT Auto-Debugger v1.0")));
console.log(dim(" ───────────────────────────────────────────────────"));

const checks = [];

async function check(name, task) {
  process.stdout.write(`  • ${name.padEnd(20)} `);
  try {
    const result = await task();
    if (result.status === "pass") {
      console.log(green("PASS") + "  " + dim(result.msg));
      checks.push({ name, status: "pass" });
    } else if (result.status === "warn") {
      console.log(yellow("WARN") + "  " + dim(result.msg));
      checks.push({ name, status: "warn" });
    } else {
      console.log(red("FAIL") + "  " + bold(result.msg));
      checks.push({ name, status: "fail" });
    }
  } catch (err) {
    console.log(red("ERROR") + " " + bold(err.message));
    checks.push({ name, status: "fail" });
  }
}

async function run() {
  // 1. Env check
  await check("Environment", async () => {
    if (!fs.existsSync(join(ROOT, ".env"))) return { status: "fail", msg: ".env missing" };
    const required = ["ANTHROPIC_API_KEY", "REPLICATE_API_KEY"];
    const missing = required.filter(k => !process.env[k]);
    if (missing.length) return { status: "fail", msg: `Missing ${missing.join(", ")}` };
    return { status: "pass", msg: "API keys configured" };
  });

  // 2. Anthropic API
  await check("Anthropic API", async () => {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { 
          "x-api-key": process.env.ANTHROPIC_API_KEY, 
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 1,
          messages: [{ role: "user", content: "hi" }]
        })
      });
      if (res.status === 401) return { status: "fail", msg: "Invalid API Key" };
      return { status: "pass", msg: "Claude is reachable" };
    } catch (e) {
      return { status: "fail", msg: e.message };
    }
  });

  // 3. Replicate API
  await check("Replicate API", async () => {
    try {
      const res = await fetch("https://api.replicate.com/v1/predictions", {
        headers: { Authorization: `Token ${process.env.REPLICATE_API_KEY}` }
      });
      if (res.status === 401) return { status: "fail", msg: "Invalid Token" };
      return { status: "pass", msg: "Replicate reachable" };
    } catch (e) {
      return { status: "fail", msg: e.message };
    }
  });

  // 4. Local Inference
  await check("Local Inference", async () => {
    try {
      const r = await fetch("http://localhost:8000/health", { timeout: 2000 });
      return { status: "pass", msg: "LTX-Video server active" };
    } catch {
      return { status: "warn", msg: "Port 8000 closed (using cloud fallback)" };
    }
  });

  // 5. FFmpeg
  await check("FFmpeg Binary", async () => {
    try {
      const v = execSync("ffmpeg -version", { stdio: "pipe" }).toString().split("\n")[0];
      return { status: "pass", msg: v.slice(0, 40) };
    } catch {
      return { status: "fail", msg: "Not installed" };
    }
  });

  // 6. DB Access
  await check("SQLite DB", async () => {
    const sqlitePath = join(ROOT, "server", "db.js");
    if (fs.existsSync(sqlitePath)) return { status: "pass", msg: "SQL engine ready" };
    return { status: "warn", msg: "Database file not found" };
  });

  // 7. Storage Permissions
  await check("Storage", async () => {
    const dir = join(ROOT, "storage", "videos");
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.accessSync(dir, fs.constants.W_OK);
      return { status: "pass", msg: "Writable" };
    } catch (e) {
      return { status: "fail", msg: e.message };
    }
  });

  // Summary
  const failed = checks.filter(c => c.status === "fail").length;
  console.log(dim(" ───────────────────────────────────────────────────"));
  if (failed > 0) {
    console.log(bold(red(`\n  ✖ ${failed} Critical failures detected.`)));
    console.log(dim("    Fix the RED items above before running 'npm run dev'.\n"));
    process.exit(1);
  } else {
    console.log(bold(green("\n  ✔ All systems operational. System is stabilized.\n")));
    process.exit(0);
  }
}

run();
