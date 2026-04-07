import { useState, useEffect, useCallback, useRef } from "react";

// ── design tokens ──────────────────────────────────────────────
const C = {
  bg: "#080808", s1: "#0f0f0f", s2: "#151515", s3: "#1c1c1c", s4: "#252525",
  b1: "#222", b2: "#2e2e2e", b3: "#3a3a3a",
  text: "#ede9e3", t2: "#8a8078", t3: "#4a4440", t4: "#2a2420",
  accent: "#e8ff6e", blue: "#4da6ff", green: "#4dff9e", red: "#ff5555", orange: "#ff6b35",
  purple: "#c084fc",
};

const DIFFICULTY_COLOR = { foundation: C.green, intermediate: C.accent, advanced: C.orange };

const CHAR_OPTIONS = [
  {
    id: "upload",
    label: "Upload Reference Photo",
    emoji: "📸",
    tag: "Option A",
    color: C.blue,
    desc: "Upload a real photo for maximum visual accuracy. Best for real actors or specific characters.",
  },
  {
    id: "aigen",
    label: "AI-Generated Face",
    emoji: "🤖",
    tag: "Option B",
    color: C.purple,
    desc: "AI creates a portrait from the character description. No upload needed — fast and free.",
  },
  {
    id: "abstract",
    label: "Abstract / Animated Style",
    emoji: "🎨",
    tag: "Option C",
    color: C.orange,
    desc: "No face reference — use stylised silhouettes and illustration. Great for Marvel/Disney genre.",
  },
];

// SSE consumer for Crucible story pipeline
async function generateCrucibleStory({ chapterId, genreId, classKey, onStatus, onDraft, onFactcheck, onComplete, onError }) {
  const res = await fetch("/api/crucible/story", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chapterId, genreId, classKey }),
  });
  if (!res.ok) { onError?.(`Server error ${res.status}`); return; }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "", evt = null;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n"); buf = lines.pop();
    for (const line of lines) {
      if (line.startsWith("event: ")) { evt = line.slice(7).trim(); continue; }
      if (line.startsWith("data: ")) {
        try {
          const d = JSON.parse(line.slice(6));
          if (evt === "status")    onStatus?.(d);
          if (evt === "draft")     onDraft?.(d);
          if (evt === "factcheck") onFactcheck?.(d);
          if (evt === "complete")  onComplete?.(d);
          if (evt === "error")     onError?.(d.message);
        } catch {}
      }
    }
  }
}

export default function CrucibleOS({ onSendToFramegen }) {
  const [curriculum, setCurriculum] = useState([]);
  const [genres, setGenres] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [brainMode, setBrainMode] = useState("both");
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [statusStep, setStatusStep] = useState(0);
  const [storyDraft, setStoryDraft] = useState("");
  const [factReport, setFactReport] = useState(null);
  const [finalResult, setFinalResult] = useState(null);
  const [error, setError] = useState("");
  // Character picker
  const [characters, setCharacters] = useState(null); // null = not extracted yet
  const [charBusy, setCharBusy] = useState(false);
  const [charSelections, setCharSelections] = useState({}); // { charName: { option, file, fileUrl } }
  const [globalStyle, setGlobalStyle] = useState(null); // "upload" | "aigen" | "abstract"

  useEffect(() => {
    Promise.all([
      fetch("/api/crucible/curriculum").then(r => r.json()),
      fetch("/api/crucible/genres").then(r => r.json()),
    ]).then(([currData, genreData]) => {
      setCurriculum(currData.curriculum || []);
      setGenres(genreData.genres || []);
    }).catch(() => {});
  }, []);

  const handleIgnite = useCallback(async () => {
    if (!selectedChapter || !selectedGenre || !selectedClass) return;
    setBusy(true); setError(""); setStoryDraft(""); setFactReport(null);
    setFinalResult(null); setStatusStep(0); setCharacters(null); setCharSelections({});
    await generateCrucibleStory({
      chapterId: selectedChapter.id,
      genreId: selectedGenre.id,
      classKey: selectedClass.classKey,
      onStatus: d => { setStatusMsg(d.message); setStatusStep(d.step || 0); },
      onDraft: d => setStoryDraft(d.story),
      onFactcheck: d => setFactReport(d.report),
      onComplete: d => { setFinalResult(d); setBusy(false); setStatusMsg(""); },
      onError: msg => { setError(msg); setBusy(false); setStatusMsg(""); },
    });
  }, [selectedChapter, selectedGenre, selectedClass]);

  // Extract characters from story after story completes
  const handleExtractCharacters = useCallback(async (story, genre, chapterTitle) => {
    setCharBusy(true);
    try {
      const res = await fetch("/api/crucible/extract-characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story, genre: genre?.label, chapterTitle }),
      });
      const data = await res.json();
      setCharacters(data.characters || []);
    } catch { setCharacters([]); }
    setCharBusy(false);
  }, []);

  // Apply globalStyle to all characters at once
  const applyGlobalStyle = (style) => {
    setGlobalStyle(style);
    if (characters) {
      const newSel = {};
      characters.forEach(c => { newSel[c.name] = { option: style }; });
      setCharSelections(newSel);
    }
  };

  const setCharOption = (charName, option, file, fileUrl) => {
    setCharSelections(prev => ({ ...prev, [charName]: { option, file, fileUrl } }));
  };

  // Build Framegen dispatch message with character context
  const handleFinalDispatch = () => {
    if (!finalResult) return;
    const { story, chapter, genre } = finalResult;
    const charLines = characters && characters.length > 0
      ? characters.map(c => {
          const sel = charSelections[c.name];
          if (!sel) return `- ${c.name} (${c.role}): ${c.description} [No visualization selected]`;
          if (sel.option === "upload") return `- ${c.name} (${c.role}): Use uploaded reference photo. ${c.description}`;
          if (sel.option === "aigen") return `- ${c.name} (${c.role}): Generate AI portrait. Prompt: ${c.suggestedAIPrompt}`;
          if (sel.option === "abstract") return `- ${c.name} (${c.role}): Animated/abstract style — no face reference. ${c.description}`;
          return `- ${c.name}: ${c.description}`;
        }).join("\n")
      : "(No characters extracted — use default visual style)";

    const globalStyleNote = globalStyle === "abstract"
      ? "\n\n🎨 GLOBAL STYLE: Animated/Abstract — all characters rendered as stylised illustrations, no photorealistic faces."
      : globalStyle === "aigen"
      ? "\n\n🤖 GLOBAL STYLE: AI-Generated faces for all characters — use the AI portrait prompts listed above."
      : "";

    const msg = `🧪 Crucible OS — ${genre.label} story for "${chapter.title}"\n\n` +
      `📋 CHARACTER VISUALIZATION:\n${charLines}${globalStyleNote}\n\n` +
      `📜 SCREENPLAY:\n${story}\n\n` +
      `Please create a Framegen blueprint from this educational film.`;
    onSendToFramegen?.({ story, chapter, genre, message: msg });
  };

  const canIgnite = selectedChapter && selectedGenre && selectedClass && !busy;
  const allCharsSet = characters && characters.length > 0
    ? characters.every(c => charSelections[c.name]?.option)
    : true;

  return (
    <div style={{ display: "flex", height: "100%", background: C.bg, overflow: "hidden" }}>

      {/* ── LEFT: Curriculum Selector ── */}
      <div style={{ width: 272, background: C.s1, borderRight: `1px solid ${C.b1}`, display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0 }}>
        <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${C.b1}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 2 }}>🧪 Crucible OS</div>
          <div style={{ fontSize: 10, color: C.t2 }}>ICSE Biology · Class 6–10</div>
        </div>
        <div style={{ overflowY: "auto", flex: 1, padding: 8 }}>
          {curriculum.map(cls => (
            <div key={cls.classKey} style={{ marginBottom: 6 }}>
              <button onClick={() => setSelectedClass(cls.classKey === selectedClass?.classKey ? null : cls)}
                style={{ width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: 7,
                  background: selectedClass?.classKey === cls.classKey ? `${C.accent}18` : "transparent",
                  border: `1px solid ${selectedClass?.classKey === cls.classKey ? C.accent : "transparent"}`,
                  color: selectedClass?.classKey === cls.classKey ? C.accent : C.t2,
                  fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {cls.label}
                <span style={{ float: "right", fontSize: 10, opacity: .6 }}>{cls.chapters.length} ch</span>
              </button>
              {selectedClass?.classKey === cls.classKey && cls.chapters.map(ch => (
                <button key={ch.id} onClick={() => setSelectedChapter(ch)}
                  style={{ width: "100%", textAlign: "left", padding: "7px 10px 7px 18px", borderRadius: 6,
                    background: selectedChapter?.id === ch.id ? `${C.blue}18` : "transparent",
                    border: `1px solid ${selectedChapter?.id === ch.id ? C.blue : "transparent"}`,
                    color: selectedChapter?.id === ch.id ? C.blue : C.text,
                    fontSize: 11, cursor: "pointer", fontFamily: "inherit", marginTop: 2, display: "block" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 1 }}>{ch.title}</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 9, color: DIFFICULTY_COLOR[ch.difficulty] || C.t2, fontWeight: 700, textTransform: "uppercase" }}>{ch.difficulty}</span>
                    <span style={{ fontSize: 9, color: C.t3 }}>{ch.factCount} facts</span>
                  </div>
                  <div style={{ fontSize: 9, color: C.t3, marginTop: 2, fontStyle: "italic", lineHeight: 1.4 }}>{ch.heroHook}</div>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── CENTER: Studio ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "12px 20px", borderBottom: `1px solid ${C.b1}`, display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
              {selectedChapter ? selectedChapter.title : "Select a chapter →"}
            </div>
            {selectedChapter && (
              <div style={{ fontSize: 10, color: C.t2, marginTop: 2 }}>
                {selectedClass?.label} · {selectedChapter.topicCount} topics · {selectedChapter.factCount} verified facts
              </div>
            )}
          </div>
          {/* Brain Mode Toggle */}
          <div style={{ marginLeft: "auto", display: "flex", gap: 4, padding: "4px", background: C.s3, borderRadius: 8 }}>
            {[["both","🧠 Both"], ["right","Right 🎭"], ["left","Left 📐"]].map(([mode, label]) => (
              <button key={mode} onClick={() => setBrainMode(mode)}
                style={{ padding: "4px 10px", borderRadius: 6, border: "none",
                  background: brainMode === mode ? C.b2 : "transparent",
                  color: brainMode === mode ? C.text : C.t2,
                  fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {label}
              </button>
            ))}
          </div>
          {/* Ignite Button */}
          <button onClick={handleIgnite} disabled={!canIgnite}
            style={{ padding: "8px 20px", borderRadius: 8, border: "none",
              background: canIgnite ? "linear-gradient(135deg, #e8ff6e, #c8df50)" : C.s3,
              color: canIgnite ? C.bg : C.t3, fontSize: 12, fontWeight: 800,
              cursor: canIgnite ? "pointer" : "not-allowed", fontFamily: "inherit",
              opacity: !selectedChapter || !selectedGenre ? 0.5 : 1 }}>
            {busy ? "🔥 Generating..." : "🧪 Ignite Crucible"}
          </button>
        </div>

        {/* Genre Selector */}
        {genres.length > 0 && (
          <div style={{ padding: "10px 20px", borderBottom: `1px solid ${C.b1}`, display: "flex", gap: 8, flexShrink: 0, overflowX: "auto" }}>
            {genres.map(g => (
              <button key={g.id} onClick={() => setSelectedGenre(g)}
                style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${selectedGenre?.id === g.id ? g.color : C.b2}`,
                  background: selectedGenre?.id === g.id ? `${g.color}18` : C.s2,
                  color: selectedGenre?.id === g.id ? g.color : C.t2,
                  fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0 }}>
                {g.emoji} {g.label}
              </button>
            ))}
          </div>
        )}

        {/* Status Bar */}
        {busy && (
          <div style={{ padding: "8px 20px", background: `${C.accent}0a`, borderBottom: `1px solid ${C.b1}33`, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", gap: 4 }}>
                {[1,2,3].map(n => (
                  <div key={n} style={{ width: 6, height: 6, borderRadius: "50%", background: n <= statusStep ? C.accent : C.b3, transition: "all .3s" }} />
                ))}
              </div>
              <span style={{ fontSize: 11, color: C.accent }}>{statusMsg}</span>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {error && (
            <div style={{ padding: "10px 14px", background: `${C.red}11`, border: `1px solid ${C.red}33`, borderRadius: 8, color: C.red, fontSize: 12, marginBottom: 12 }}>
              ❌ {error}
            </div>
          )}

          {!selectedChapter && !busy && !finalResult && <EmptyState />}
          {selectedChapter && !finalResult && !busy && <ChapterPreview chapter={selectedChapter} genre={selectedGenre} />}
          {factReport && <FactCheckPanel report={factReport} />}

          {/* Draft preview while generating */}
          {busy && storyDraft && !finalResult && (
            <div style={{ padding: "16px", background: C.s2, borderRadius: 10, border: `1px solid ${C.b1}` }}>
              <div style={{ fontSize: 10, color: C.t2, marginBottom: 8, fontWeight: 700, letterSpacing: ".08em" }}>DRAFT PREVIEW</div>
              <pre style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: C.t2, whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{storyDraft}</pre>
            </div>
          )}

          {/* Final story + Character Picker */}
          {finalResult && (
            <StoryResult
              result={finalResult}
              characters={characters}
              charBusy={charBusy}
              charSelections={charSelections}
              globalStyle={globalStyle}
              allCharsSet={allCharsSet}
              onExtractCharacters={() => handleExtractCharacters(finalResult.story, finalResult.genre, finalResult.chapter?.title)}
              onApplyGlobalStyle={applyGlobalStyle}
              onSetCharOption={setCharOption}
              onFinalDispatch={handleFinalDispatch}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🧬</div>
      <div style={{ fontSize: 15, color: C.text, fontWeight: 700, marginBottom: 6 }}>Welcome to Crucible OS</div>
      <div style={{ fontSize: 12, color: C.t2, maxWidth: 400, margin: "0 auto", lineHeight: 1.7 }}>
        ICSE Biology · Class 6–10 · Six Sigma Verified<br/>
        Pick a chapter from the left, choose your cinematic genre, and ignite.
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 24, flexWrap: "wrap" }}>
        {["⚡ Marvel", "✨ Disney", "🎭 Bollywood", "🔍 Hollywood"].map(g => (
          <span key={g} style={{ fontSize: 11, color: C.t3, padding: "4px 10px", border: `1px solid ${C.b2}`, borderRadius: 20 }}>{g}</span>
        ))}
      </div>
    </div>
  );
}

function ChapterPreview({ chapter, genre }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ padding: "14px 16px", background: C.s2, borderRadius: 10, border: `1px solid ${C.b1}`, marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.t2, letterSpacing: ".08em", marginBottom: 8 }}>LEARNING OBJECTIVES</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {chapter.topics?.slice(0, 8).map((t, i) => (
            <span key={i} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 12, background: C.s3, border: `1px solid ${C.b2}`, color: C.t2 }}>{t}</span>
          ))}
        </div>
      </div>
      <div style={{ padding: "14px 16px", background: C.s2, borderRadius: 10, border: `1px solid ${C.b1}` }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.t2, letterSpacing: ".08em", marginBottom: 8 }}>
          🔬 SIX SIGMA FACTS ({chapter.keyFacts?.length || chapter.factCount} verified claims)
        </div>
        {(chapter.keyFacts || []).map((f, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "flex-start" }}>
            <span style={{ color: C.green, fontSize: 10, marginTop: 1 }}>✓</span>
            <span style={{ fontSize: 11, color: C.text, lineHeight: 1.5 }}>{f}</span>
          </div>
        ))}
      </div>
      {!genre && <div style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: C.t3 }}>← Select a genre above to continue</div>}
    </div>
  );
}

function FactCheckPanel({ report }) {
  const passed = report.verified && report.confidence >= 99;
  const borderColor = passed ? C.green : C.orange;
  return (
    <div style={{ padding: "12px 16px", background: passed ? `${C.green}08` : `${C.orange}08`,
      border: `1px solid ${borderColor}33`, borderRadius: 10, marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: report.corrections?.length > 0 ? 8 : 0 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: borderColor }}>
          {passed ? "✅ Six Sigma PASSED" : "⚠️ Six Sigma: Corrections Applied"}
        </span>
        <span style={{ fontSize: 10, color: C.t2, marginLeft: "auto" }}>Confidence: {report.confidence}%</span>
      </div>
      {report.corrections?.map((c, i) => (
        <div key={i} style={{ fontSize: 10, color: C.t2, marginBottom: 3 }}>
          <span style={{ color: C.red, textDecoration: "line-through" }}>{c.original}</span>{" → "}
          <span style={{ color: C.green }}>{c.corrected}</span>
        </div>
      ))}
    </div>
  );
}

function StoryResult({ result, characters, charBusy, charSelections, globalStyle, allCharsSet,
    onExtractCharacters, onApplyGlobalStyle, onSetCharOption, onFinalDispatch }) {
  const { story, chapter, genre, factReport, leftBrainHooks, rightBrainHooks, creditUsed } = result;

  return (
    <div>
      {/* Result header */}
      <div style={{ padding: "14px 16px", background: `${genre.color}11`, border: `1px solid ${genre.color}33`,
        borderRadius: 10, marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 22 }}>{genre.emoji}</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{chapter.title}</div>
          <div style={{ fontSize: 10, color: C.t2 }}>
            {genre.label} · Six Sigma {factReport?.verified ? "✅ Passed" : "⚠️ Corrected"} ·
            {creditUsed?.claudeHaikuCalls} Claude + {creditUsed?.geminiFlashCalls} Gemini calls
          </div>
        </div>
      </div>

      {/* Brain tracks */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <div style={{ padding: "10px 12px", background: `${C.purple}0a`, border: `1px solid ${C.purple}22`, borderRadius: 8 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: C.purple, letterSpacing: ".1em", marginBottom: 6 }}>🎭 RIGHT BRAIN</div>
          {rightBrainHooks?.map((h, i) => <div key={i} style={{ fontSize: 10, color: C.t2, marginBottom: 3 }}>• {h}</div>)}
        </div>
        <div style={{ padding: "10px 12px", background: `${C.blue}0a`, border: `1px solid ${C.blue}22`, borderRadius: 8 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: C.blue, letterSpacing: ".1em", marginBottom: 6 }}>📐 LEFT BRAIN</div>
          {leftBrainHooks?.map((h, i) => <div key={i} style={{ fontSize: 10, color: C.t2, marginBottom: 3 }}>• {h}</div>)}
        </div>
      </div>

      {/* ── CHARACTER VISUALIZATION PICKER ── */}
      <CharacterPicker
        story={story}
        genre={genre}
        chapterTitle={chapter?.title}
        characters={characters}
        charBusy={charBusy}
        charSelections={charSelections}
        globalStyle={globalStyle}
        allCharsSet={allCharsSet}
        onExtract={onExtractCharacters}
        onApplyGlobal={onApplyGlobalStyle}
        onSetChar={onSetCharOption}
        onDispatch={onFinalDispatch}
      />

      {/* Story script */}
      <div style={{ padding: "16px", background: C.s1, borderRadius: 10, border: `1px solid ${C.b1}`, marginTop: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.t2, letterSpacing: ".08em", marginBottom: 12 }}>SCREENPLAY</div>
        <pre style={{ fontFamily: "'Courier New', monospace", fontSize: 11.5, color: C.text, whiteSpace: "pre-wrap", lineHeight: 1.8, margin: 0 }}>
          {story}
        </pre>
      </div>
    </div>
  );
}

// ── CharacterPicker: the 3-option flow ─────────────────────────
function CharacterPicker({ story, genre, chapterTitle, characters, charBusy, charSelections,
    globalStyle, allCharsSet, onExtract, onApplyGlobal, onSetChar, onDispatch }) {

  const notExtracted = characters === null;

  return (
    <div style={{ border: `1px solid ${C.b2}`, borderRadius: 12, overflow: "hidden", background: C.s1 }}>
      {/* Header */}
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.b1}`,
        background: "linear-gradient(90deg, #1a1a1a, #111)", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 14 }}>🎭</span>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>Character Visualization</div>
          <div style={{ fontSize: 10, color: C.t2 }}>Choose how each character is visualized before final render</div>
        </div>
        {notExtracted && !charBusy && (
          <button onClick={onExtract}
            style={{ marginLeft: "auto", padding: "6px 14px", borderRadius: 7, border: `1px solid ${C.accent}`,
              background: `${C.accent}18`, color: C.accent, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            🔍 Extract Characters
          </button>
        )}
        {charBusy && (
          <span style={{ marginLeft: "auto", fontSize: 10, color: C.accent }}>⏳ Extracting characters…</span>
        )}
      </div>

      <div style={{ padding: 16 }}>
        {/* Global style quick-apply */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.t2, letterSpacing: ".08em", marginBottom: 8 }}>
            APPLY TO ALL CHARACTERS
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {CHAR_OPTIONS.map(opt => (
              <button key={opt.id} onClick={() => onApplyGlobal(opt.id)}
                style={{ padding: "8px 14px", borderRadius: 9, border: `1px solid ${globalStyle === opt.id ? opt.color : C.b2}`,
                  background: globalStyle === opt.id ? `${opt.color}18` : C.s2,
                  color: globalStyle === opt.id ? opt.color : C.t2,
                  fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                  display: "flex", alignItems: "center", gap: 6 }}>
                <span>{opt.emoji}</span>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 10, fontWeight: 700 }}>{opt.tag}</div>
                  <div style={{ fontSize: 9, opacity: .8 }}>{opt.label}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Per-character cards */}
        {notExtracted && !charBusy && (
          <div style={{ textAlign: "center", padding: "20px 0", color: C.t3, fontSize: 11 }}>
            Click "Extract Characters" to identify the cast, or apply a global style above.
          </div>
        )}

        {charBusy && (
          <div style={{ textAlign: "center", padding: "20px 0", color: C.accent, fontSize: 11 }}>
            ⏳ Claude is reading your screenplay and identifying characters…
          </div>
        )}

        {characters && characters.length === 0 && (
          <div style={{ textAlign: "center", padding: "16px 0", color: C.t3, fontSize: 11 }}>
            No named characters found — using global style for all scenes.
          </div>
        )}

        {characters && characters.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.t2, letterSpacing: ".08em" }}>
              CAST ({characters.length} characters found)
            </div>
            {characters.map(ch => (
              <CharacterCard key={ch.name} char={ch} selection={charSelections[ch.name]} onSelect={(opt, file, url) => onSetChar(ch.name, opt, file, url)} />
            ))}
          </div>
        )}

        {/* Final Build Button */}
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.b1}`, display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onDispatch} disabled={!globalStyle && !allCharsSet}
            style={{ padding: "10px 24px", borderRadius: 9, border: "none",
              background: (globalStyle || allCharsSet)
                ? "linear-gradient(135deg, #e8ff6e, #c8df50)"
                : C.s3,
              color: (globalStyle || allCharsSet) ? C.bg : C.t3,
              fontSize: 12, fontWeight: 800, cursor: (globalStyle || allCharsSet) ? "pointer" : "not-allowed",
              fontFamily: "inherit" }}>
            🎬 Build Final Film →
          </button>
          {!globalStyle && !allCharsSet && (
            <div style={{ fontSize: 10, color: C.t3, alignSelf: "center", marginRight: "auto" }}>
              ← Select visualization style to unlock
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Single character card with 3 option tabs ───────────────────
function CharacterCard({ char, selection, onSelect }) {
  const fileRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onSelect("upload", file, url);
  };

  return (
    <div style={{ background: C.s2, border: `1px solid ${selection ? C.b3 : C.b1}`, borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
        {/* Avatar placeholder */}
        {selection?.fileUrl ? (
          <img src={selection.fileUrl} alt={char.name}
            style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: `2px solid ${C.blue}` }} />
        ) : (
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.s3,
            border: `2px dashed ${C.b3}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
            {char.role === "hero" ? "⚡" : char.role === "villain" ? "💀" : char.role === "mentor" ? "🧑‍🏫" : "👤"}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{char.name}</div>
          <div style={{ fontSize: 10, color: C.t2 }}>{char.role} · {char.description?.slice(0, 60)}{char.description?.length > 60 ? "…" : ""}</div>
        </div>
        {selection?.option && (
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 12,
            background: selection.option === "upload" ? `${C.blue}22`
              : selection.option === "aigen" ? `${C.purple}22`
              : `${C.orange}22`,
            color: selection.option === "upload" ? C.blue
              : selection.option === "aigen" ? C.purple
              : C.orange,
            fontWeight: 700 }}>
            {CHAR_OPTIONS.find(o => o.id === selection.option)?.emoji} {CHAR_OPTIONS.find(o => o.id === selection.option)?.tag}
          </span>
        )}
      </div>

      {/* Option tabs */}
      <div style={{ display: "flex", borderTop: `1px solid ${C.b1}` }}>
        {CHAR_OPTIONS.map(opt => (
          <button key={opt.id} onClick={() => { if (opt.id === "upload") fileRef.current?.click(); else onSelect(opt.id); }}
            style={{ flex: 1, padding: "8px 4px", border: "none", borderRight: `1px solid ${C.b1}`,
              background: selection?.option === opt.id ? `${opt.color}18` : "transparent",
              color: selection?.option === opt.id ? opt.color : C.t3,
              fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              transition: "all .15s" }}>
            <span style={{ fontSize: 14 }}>{opt.emoji}</span>
            <span>{opt.tag}</span>
          </button>
        ))}
      </div>

      {/* Option A — show upload drop zone */}
      {selection?.option === "upload" && !selection.fileUrl && (
        <div onClick={() => fileRef.current?.click()}
          style={{ padding: "12px", background: `${C.blue}08`, borderTop: `1px solid ${C.blue}22`,
            textAlign: "center", cursor: "pointer" }}>
          <div style={{ fontSize: 11, color: C.blue }}>📁 Click to upload photo for {char.name}</div>
          <div style={{ fontSize: 9, color: C.t3, marginTop: 2 }}>JPG, PNG, WEBP — used as face reference for all scenes</div>
        </div>
      )}
      {selection?.option === "upload" && selection.fileUrl && (
        <div style={{ padding: "8px 14px", background: `${C.blue}08`, borderTop: `1px solid ${C.blue}22`,
          display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, color: C.blue }}>✅ Reference photo uploaded</span>
          <button onClick={() => fileRef.current?.click()}
            style={{ marginLeft: "auto", fontSize: 9, color: C.t2, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
            Change
          </button>
        </div>
      )}

      {/* Option B — show AI prompt */}
      {selection?.option === "aigen" && (
        <div style={{ padding: "10px 14px", background: `${C.purple}08`, borderTop: `1px solid ${C.purple}22` }}>
          <div style={{ fontSize: 9, color: C.t2, marginBottom: 4, fontWeight: 700 }}>AI PORTRAIT PROMPT</div>
          <div style={{ fontSize: 9, color: C.purple, fontFamily: "monospace", lineHeight: 1.5 }}>{char.suggestedAIPrompt}</div>
        </div>
      )}

      {/* Option C — show style note */}
      {selection?.option === "abstract" && (
        <div style={{ padding: "10px 14px", background: `${C.orange}08`, borderTop: `1px solid ${C.orange}22` }}>
          <div style={{ fontSize: 10, color: C.orange }}>🎨 Will render as animated/illustrated silhouette — no real face used</div>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
    </div>
  );
}
