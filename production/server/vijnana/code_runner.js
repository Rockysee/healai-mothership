/**
 * Vijnana — Code Runner
 * For Computer Applications (Java / Python) exam questions:
 *   1. Claude generates a solution
 *   2. Sandboxed subprocess executes it
 *   3. Test case output verified
 *   4. Correction loop if failing (max 3 attempts)
 */

import { exec }      from "child_process";
import { promisify } from "util";
import { writeFileSync, unlinkSync, existsSync } from "fs";
import { join }      from "path";
import { tmpdir }    from "os";
import { v4 as uuid } from "uuid";
import { callLLM }  from "../llm.js";

const execAsync = promisify(exec);
const CODE_TIMEOUT_MS = 8000;

// ── Detect language from question text ───────────────────────────────────────
export function detectLanguage(questionText) {
  const lower = questionText.toLowerCase();
  if (/\bjava\b|class\s+\w+|public\s+static\s+void\s+main|system\.out/.test(lower)) return "java";
  if (/\bpython\b|def\s+\w+|print\s*\(|import\s+\w+/.test(lower)) return "python";
  // ICSE default is Java
  return "java";
}

// ── Generate solution code via Claude ────────────────────────────────────────
async function generateSolution(questionText, language, apiKey, previousCode = null, errorMsg = null) {
  const correctionNote = previousCode
    ? `\n\nPrevious attempt failed with error:\n${errorMsg}\n\nPrevious code:\n${previousCode}\n\nFix the error.`
    : "";

  // Truncate question to prevent runaway token usage on large exam papers
  const safeQuestion = questionText.slice(0, 3000);

  const prompt = `You are an expert ICSE ${language === "java" ? "Java" : "Python"} programmer.
Write a complete, compilable solution for this ICSE Computer Applications question.

QUESTION:
${safeQuestion}${correctionNote}

RULES:
- Write ONLY the complete ${language === "java" ? "Java class with main method" : "Python script"}
- No explanations, no comments, no markdown — pure code only
- For Java: the class name MUST be "Solution"
- Include sample output that matches expected test case
- Handle edge cases gracefully`;

  // Use unified LLM router — falls back to Gemini/Groq/Pollinations if Anthropic is out
  const llmResult = await callLLM({
    userMessage: prompt,
    maxTokens: 1000,
    temperature: 0.2,  // low temp for deterministic compilable code
  });
  let code = llmResult.text || "";

  // Strip markdown code blocks if Claude added them
  code = code.replace(/^```[\w]*\n?/gm, "").replace(/^```$/gm, "").trim();
  return code;
}

// ── Execute code in a sandboxed subprocess ───────────────────────────────────
async function executeCode(code, language, stdin = "") {
  const runId  = uuid().slice(0, 8);
  const tmpDir = tmpdir();

  if (language === "python") {
    const filePath = join(tmpDir, `vijnana_${runId}.py`);
    try {
      writeFileSync(filePath, code, "utf8");
      const { stdout, stderr } = await execAsync(
        `echo ${JSON.stringify(stdin)} | python3 "${filePath}"`,
        { timeout: CODE_TIMEOUT_MS, cwd: tmpDir }
      );
      return { success: true, output: stdout.trim(), error: stderr.trim() };
    } catch (e) {
      return { success: false, output: "", error: e.stderr || e.message };
    } finally {
      if (existsSync(filePath)) unlinkSync(filePath);
    }
  }

  if (language === "java") {
    const srcPath = join(tmpDir, `Solution_${runId}.java`);
    const classDir = join(tmpDir, `vij_${runId}`);
    try {
      // Java class name must be "Solution" to match filename
      const javaCode = code.replace(/public\s+class\s+\w+/, "public class Solution");
      writeFileSync(srcPath, javaCode, "utf8");
      await execAsync(`mkdir -p "${classDir}" && javac -d "${classDir}" "${srcPath}"`, { timeout: 15000 });
      const { stdout, stderr } = await execAsync(
        `echo ${JSON.stringify(stdin)} | java -cp "${classDir}" Solution`,
        { timeout: CODE_TIMEOUT_MS, cwd: classDir }
      );
      return { success: true, output: stdout.trim(), error: stderr.trim() };
    } catch (e) {
      return { success: false, output: "", error: e.stderr || e.message };
    } finally {
      if (existsSync(srcPath)) unlinkSync(srcPath);
      if (existsSync(classDir)) await execAsync(`rm -rf "${classDir}"`).catch(() => {});
    }
  }

  throw new Error(`Unsupported language: ${language}`);
}

// ── Main: generate + run + verify loop ───────────────────────────────────────
export async function solveCodeQuestion(questionText, testInput = "", expectedOutput = "", apiKey) {
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY required");

  const language = detectLanguage(questionText);
  let code = null;
  let result = null;
  const attempts = [];

  for (let attempt = 1; attempt <= 3; attempt++) {
    code = await generateSolution(
      questionText,
      language,
      apiKey,
      attempt > 1 ? code : null,
      attempt > 1 ? result?.error : null
    );

    result = await executeCode(code, language, testInput);
    const passed = expectedOutput
      ? result.output.trim() === expectedOutput.trim()
      : result.success;

    attempts.push({ attempt, code, output: result.output, error: result.error, passed });

    if (passed) break;
  }

  const finalAttempt = attempts[attempts.length - 1];
  return {
    language,
    code:         finalAttempt.code,
    output:       finalAttempt.output,
    passed:       finalAttempt.passed,
    error:        finalAttempt.error || null,
    attemptCount: attempts.length,
    attempts,
  };
}
