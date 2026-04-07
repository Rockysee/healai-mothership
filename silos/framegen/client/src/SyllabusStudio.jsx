import { useState, useEffect, useRef, useCallback } from "react";
import { renderWhiteboard, pollWhiteboard, stitchScenes, fetchWhiteboardDeps, installManim } from "./api.js";

// ── Design tokens ───────────────────────────────────────────────
const C = {
  bg: "#080808", s1: "#0f0f0f", s2: "#151515", s3: "#1c1c1c", s4: "#222",
  b1: "#1e1e1e", b2: "#2a2a2a", b3: "#383838",
  text: "#ede9e3", t2: "#8a8078", t3: "#4a4440",
  accent: "#e8ff6e", blue: "#4da6ff", green: "#4dff9e",
  red: "#ff5555", orange: "#ff6b35", purple: "#c084fc", teal: "#00e5ff",
};

const SUBJECT_META = {
  physics:   { label: "Physics",   emoji: "⚛️",  color: "#4da6ff" },
  chemistry: { label: "Chemistry", emoji: "🧪", color: "#4dff9e" },
  biology:   { label: "Biology",   emoji: "🧬", color: "#c084fc" },
  maths:     { label: "Maths",     emoji: "📐", color: "#e8ff6e" },
};

const VISUAL_STYLES = [
  { id: "whiteboard", label: "Whiteboard", emoji: "🖊️", desc: "Black marker on white, Khan Academy style, hand-drawn reveal", color: "#f5f5f0" },
  { id: "sketch",     label: "Sketch",     emoji: "✏️", desc: "Animated pencil scribble, Kurzgesagt/Veritasium doodle art",   color: "#ffd166" },
  { id: "3d",         label: "3D Render",  emoji: "🔬", desc: "Molecular 3D render, Cosmos/Kurzgesagt cinematic visualization", color: "#4da6ff" },
];

const DURATION_OPTIONS = [
  { label: "30s teaser",  sec: 30  },
  { label: "1 min intro", sec: 60  },
  { label: "3 min lesson",sec: 180 },
  { label: "5 min deep",  sec: 300 },
  { label: "10 min full", sec: 600 },
];

const DIFFICULTY_COLOR = { foundation: C.green, intermediate: C.accent, advanced: C.orange };

async function apiFetch(url, opts) {
  const r = await fetch(url, opts);
  return r.json();
}

// ──────────────────────────────────────────────────────────────────
export default function SyllabusStudio({ onSendToFramegen }) {
  // Navigation state
  const [activeSubject, setActiveSubject] = useState("physics");
  const [activeClass, setActiveClass]     = useState("9");
  const [curriculum, setCurriculum]       = useState(null);
  const [loadingCurr, setLoadingCurr]     = useState(false);

  // Chapter / concept selection
  const [selectedChapter, setSelectedChapter]   = useState(null);
  const [uploadedConcepts, setUploadedConcepts] = useState(null);  // from PDF/image upload
  const [selectedConcept, setSelectedConcept]   = useState(null);

  // Visual style + duration
  const [visualStyle, setVisualStyle]   = useState("whiteboard");
  const [durationSec, setDurationSec]   = useState(60);

  // Vijnana Engine mode (auto-on for Class 9-10 Maths)
  const [narrativeMode, setNarrativeMode] = useState("standard");

  // Blueprint generation
  const [generating, setGenerating]       = useState(false);
  const [genChars, setGenChars]           = useState(0);    // chars streamed so far
  const [blueprint, setBlueprint]         = useState(null);
  const [blueprintMode, setBlueprintMode] = useState("standard"); // returned by server
  const [genError, setGenError]           = useState(null);

  // PDF/image upload
  const [uploading, setUploading]       = useState(false);
  const [uploadError, setUploadError]   = useState(null);
  const fileRef = useRef(null);

  // Per-scene whiteboard render state
  // { [sceneIndex]: { jobId, provider, status, videoUrl, error } }
  const [sceneRenders,  setSceneRenders]  = useState({});
  const [rendering,     setRendering]     = useState(false);
  const [stitching,     setStitching]     = useState(false);
  const [finalVideo,    setFinalVideo]    = useState(null);
  const [stitchError,   setStitchError]   = useState(null);

  // Renderer availability: { manim: { ready, note }, remotion: { ready, note } }
  const [rendererDeps,   setRendererDeps]   = useState(null);
  const [installingManim, setInstallingManim] = useState(false);
  const [manimLog,        setManimLog]        = useState([]);
  const manimLogRef = useRef(null);

  useEffect(() => {
    fetchWhiteboardDeps().then(setRendererDeps).catch(() => {});
  }, []);

  // Auto-activate Vijnana Engine for Class 9-10 Maths
  useEffect(() => {
    const isMaths = ["maths", "mathematics"].includes(activeSubject.toLowerCase());
    const isHighClass = ["9", "10"].includes(activeClass);
    if (isMaths && isHighClass) {
      setNarrativeMode("vijnana");
    } else if (narrativeMode === "vijnana" && !isMaths) {
      setNarrativeMode("standard");
    }
  }, [activeSubject, activeClass]);

  // Load curriculum on subject change
  useEffect(() => {
    setLoadingCurr(true);
    setSelectedChapter(null);
    setSelectedConcept(null);
    setUploadedConcepts(null);
    setBlueprint(null);
    apiFetch(`/api/curriculum/${activeSubject}`)
      .then(d => { setCurriculum(d); setLoadingCurr(false); })
      .catch(() => setLoadingCurr(false));
  }, [activeSubject]);

  // Chapters for active class
  const chapters = curriculum?.[`class_${activeClass}`]?.chapters || [];

  // When chapter selected — auto-select first topic as concept
  useEffect(() => {
    if (!selectedChapter) return;
    setSelectedConcept({
      name: selectedChapter.title,
      definition: selectedChapter.hero_hook || "",
      topics: selectedChapter.topics || [],
      equations: selectedChapter.equations || [],
      keyFacts: selectedChapter.key_facts || [],
      difficulty: selectedChapter.difficulty,
    });
    setBlueprint(null);
  }, [selectedChapter]);

  // ── PDF/Image upload ────────────────────────────────────────────
  const handleFileUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setUploadError(null);
    try {
      const b64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const result = await apiFetch("/api/syllabus/upload", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileData: b64, filename: file.name, fileType: file.type }),
      });
      if (result.error) throw new Error(result.error);
      setUploadedConcepts(result);
      setSelectedChapter(null);
      if (result.concepts?.length > 0) {
        const c = result.concepts[0];
        setSelectedConcept({
          name: c.name,
          definition: c.definition || "",
          topics: c.topics || [],
          equations: c.equations || [],
          keyFacts: c.keyFacts || [],
          rawText: result.rawText || "" // Store the raw text for blueprinting
        });
      }
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  }, []);

  // ── Blueprint generation (SSE streaming) ────────────────────────
  const handleGenerate = async () => {
    if (!selectedConcept) return;
    setGenerating(true); setGenError(null); setBlueprint(null); setGenChars(0);

    const controller = new AbortController();
    const hardTimeout = setTimeout(() => controller.abort(), 150_000); // 2.5 min client guard

    try {
      const res = await fetch("/api/syllabus/concept-blueprint", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        signal:  controller.signal,
        body: JSON.stringify({
          conceptName: selectedConcept.name,
          definition:  selectedConcept.definition,
          topics:      selectedConcept.topics,
          equations:   selectedConcept.equations,
          keyFacts:    selectedConcept.keyFacts,
          rawText:     selectedConcept.rawText || "",
          visualStyle, durationSec, classKey: activeClass,
          subject: activeSubject,
          narrativeMode,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `Server error ${res.status}`);
      }

      // Read SSE stream
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "", evt = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop();
        for (const line of lines) {
          if (line.startsWith("event: ")) { evt = line.slice(7).trim(); continue; }
          if (!line.startsWith("data: "))  continue;
          try {
            const d = JSON.parse(line.slice(6));
            if (evt === "progress") setGenChars(d.chars);
            if (evt === "done") {
              setBlueprint(d.blueprint);
              setBlueprintMode(d.narrativeMode || "standard");
            }
            if (evt === "error") throw new Error(d.message);
          } catch (parseErr) {
            if (evt === "error") throw parseErr; // re-throw only real errors
          }
        }
      }
    } catch (err) {
      if (err.name === "AbortError") setGenError("Generation timed out. Try reducing video duration.");
      else setGenError(err.message);
    } finally {
      clearTimeout(hardTimeout);
      setGenerating(false);
      setGenChars(0);
    }
  };

  const sm = SUBJECT_META[activeSubject];

  // ── Render all scenes with Manim / Remotion ──────────────────────────
  const handleRenderScenes = useCallback(async () => {
    if (!blueprint?.scenes?.length) return;
    setRendering(true);
    setSceneRenders({});
    setFinalVideo(null);
    setStitchError(null);

    // Start all scenes in parallel — non-blocking per scene
    const starts = blueprint.scenes.map((scene, i) =>
      renderWhiteboard({
        scene,
        subject:     activeSubject,
        equations:   selectedConcept?.equations || [],
        keyFacts:    selectedConcept?.keyFacts   || [],
        conceptName: selectedConcept?.name       || blueprint.title,
        visualStyle,
      })
        .then(({ jobId, provider }) => {
          setSceneRenders(prev => ({ ...prev, [i]: { jobId, provider, status: "processing" } }));

          // Poll this scene independently
          pollWhiteboard(jobId, (state) => {
            setSceneRenders(prev => ({ ...prev, [i]: { jobId, provider, ...state } }));
          }).catch(err => {
            setSceneRenders(prev => ({
              ...prev,
              [i]: { jobId, provider, status: "failed", error: err.message },
            }));
          });
        })
        .catch(err => {
          setSceneRenders(prev => ({
            ...prev,
            [i]: { status: "failed", error: err.message },
          }));
        })
    );

    await Promise.allSettled(starts);
    setRendering(false);
  }, [blueprint, activeSubject, selectedConcept, visualStyle]);

  // ── Install Manim from the UI ────────────────────────────────────────
  const handleInstallManim = useCallback(async () => {
    setInstallingManim(true);
    setManimLog([]);
    await installManim({
      onLine: (text) => {
        setManimLog(prev => {
          const next = [...prev, text];
          // auto-scroll the terminal box
          setTimeout(() => {
            if (manimLogRef.current) manimLogRef.current.scrollTop = manimLogRef.current.scrollHeight;
          }, 0);
          return next;
        });
      },
      onDone: () => {
        setInstallingManim(false);
        // Re-fetch deps so badge flips to ✓
        fetchWhiteboardDeps().then(setRendererDeps).catch(() => {});
      },
      onError: (msg) => {
        setManimLog(prev => [...prev, `\n❌ ${msg}`]);
        setInstallingManim(false);
      },
    });
  }, []);

  // ── Stitch rendered scenes into final video ──────────────────────────
  const handleStitch = useCallback(async () => {
    if (!blueprint?.scenes) return;
    const sceneFiles = blueprint.scenes.map((_, i) => sceneRenders[i]?.videoUrl).filter(Boolean);
    if (!sceneFiles.length) return;

    setStitching(true);
    setStitchError(null);
    try {
      const result = await stitchScenes({ sceneFiles, projectTitle: blueprint.title });
      setFinalVideo(result.videoUrl);
    } catch (err) {
      setStitchError(err.message);
    } finally {
      setStitching(false);
    }
  }, [blueprint, sceneRenders]);

  // Helpers for render summary counts
  const renderCounts = blueprint?.scenes ? (() => {
    const vals = Object.values(sceneRenders);
    return {
      total:     blueprint.scenes.length,
      done:      vals.filter(v => v.status === "succeeded").length,
      failed:    vals.filter(v => v.status === "failed").length,
      processing:vals.filter(v => v.status === "processing").length,
    };
  })() : null;

  const allDone = renderCounts && renderCounts.done === renderCounts.total && renderCounts.total > 0;
  const useWhiteboardRenderer = visualStyle === "whiteboard" || visualStyle === "sketch";

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden", background: C.bg, fontFamily: "var(--sans)" }}>

      {/* ── Left: Subject + Class + Chapter List ─────────────── */}
      <div style={{ width: 264, flexShrink: 0, borderRight: `1px solid ${C.b1}`, display: "flex", flexDirection: "column", overflowY: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "14px 14px 10px", borderBottom: `1px solid ${C.b1}` }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.accent, letterSpacing: ".12em", marginBottom: 10 }}>📚 SYLLABUS STUDIO</div>

          {/* Subject tabs */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {Object.entries(SUBJECT_META).map(([id, m]) => (
              <button key={id} onClick={() => setActiveSubject(id)}
                style={{ padding: "5px 9px", borderRadius: 7, border: `1px solid ${activeSubject === id ? m.color : C.b2}`,
                  background: activeSubject === id ? `${m.color}18` : "transparent",
                  color: activeSubject === id ? m.color : C.t3,
                  fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {m.emoji} {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Class selector */}
        <div style={{ padding: "8px 12px", borderBottom: `1px solid ${C.b1}`, display: "flex", gap: 4 }}>
          {["6","7","8","9","10"].map(cls => (
            <button key={cls} onClick={() => setActiveClass(cls)}
              style={{ flex: 1, padding: "4px 0", borderRadius: 5, border: `1px solid ${activeClass === cls ? sm.color : C.b2}`,
                background: activeClass === cls ? `${sm.color}18` : "transparent",
                color: activeClass === cls ? sm.color : C.t3,
                fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              {cls}
            </button>
          ))}
        </div>

        {/* Chapter list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
          {loadingCurr ? (
            <div style={{ padding: "20px", textAlign: "center", color: C.t3, fontSize: 11 }}>Loading…</div>
          ) : chapters.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: C.t3, fontSize: 11 }}>No chapters available</div>
          ) : chapters.map(ch => (
            <div key={ch.id} onClick={() => setSelectedChapter(ch)}
              style={{ padding: "8px 10px", marginBottom: 4, borderRadius: 8, cursor: "pointer",
                border: `1px solid ${selectedChapter?.id === ch.id ? sm.color : C.b1}`,
                background: selectedChapter?.id === ch.id ? `${sm.color}10` : C.s1,
                transition: "all .15s" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: selectedChapter?.id === ch.id ? sm.color : C.text, marginBottom: 3 }}>
                {ch.title}
              </div>
              <div style={{ fontSize: 9, color: C.t3, marginBottom: 4, fontStyle: "italic" }}>{ch.hero_hook}</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 3, background: `${DIFFICULTY_COLOR[ch.difficulty] || C.t3}22`, color: DIFFICULTY_COLOR[ch.difficulty] || C.t3 }}>{ch.difficulty}</span>
                <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 3, background: C.b2, color: C.t3 }}>{ch.topics?.length || 0} topics</span>
              </div>
            </div>
          ))}
        </div>

        {/* PDF Upload */}
        <div style={{ padding: "10px 10px", borderTop: `1px solid ${C.b1}` }}>
          <div style={{ fontSize: 9, color: C.t3, marginBottom: 6 }}>Or upload your textbook page:</div>
          <input ref={fileRef} type="file" accept=".pdf,image/*" style={{ display: "none" }} onChange={handleFileUpload} />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            style={{ width: "100%", padding: "7px", borderRadius: 7, border: `1px dashed ${C.b3}`,
              background: "transparent", color: uploading ? C.t3 : C.t2, fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>
            {uploading ? "📄 Extracting concepts…" : "📄 Upload PDF / Image"}
          </button>
          {uploadError && <div style={{ fontSize: 9, color: C.red, marginTop: 4 }}>{uploadError}</div>}
        </div>
      </div>

      {/* ── Right: Concept Deep Dive + Generate ──────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

        {/* Uploaded concepts picker */}
        {uploadedConcepts?.concepts?.length > 0 && (
          <div style={{ marginBottom: 16, padding: "12px", background: `${C.blue}08`, border: `1px solid ${C.blue}30`, borderRadius: 10 }}>
            <div style={{ fontSize: 10, color: C.blue, fontWeight: 700, marginBottom: 8 }}>
              📄 Extracted from upload: {uploadedConcepts.chapter || uploadedConcepts.subject || "Custom"}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {uploadedConcepts.concepts.map((c, i) => (
                <button key={i} onClick={() => setSelectedConcept({ name: c.name, definition: c.definition || "", topics: c.topics || [], equations: c.equations || [], keyFacts: c.keyFacts || [] })}
                  style={{ padding: "3px 10px", borderRadius: 12, border: `1px solid ${selectedConcept?.name === c.name ? C.blue : C.b2}`,
                    background: selectedConcept?.name === c.name ? `${C.blue}20` : "transparent",
                    color: selectedConcept?.name === c.name ? C.blue : C.t2, fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {!selectedConcept && !blueprint && (
          <div style={{ textAlign: "center", padding: "60px 0", color: C.t3, fontSize: 12 }}>
            👈 Select a chapter from the left panel to begin
          </div>
        )}

        {selectedConcept && (
          <>
            {/* Concept Card */}
            <div style={{ marginBottom: 20, padding: "16px", background: C.s2, border: `1px solid ${sm.color}22`, borderRadius: 12 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 28 }}>{sm.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 4 }}>{selectedConcept.name}</div>
                  {selectedConcept.definition && (
                    <div style={{ fontSize: 11, color: C.t2, fontStyle: "italic", lineHeight: 1.6 }}>
                      "{selectedConcept.definition}"
                    </div>
                  )}
                </div>
              </div>

              {/* Topics */}
              {selectedConcept.topics?.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 9, color: C.t3, fontWeight: 700, marginBottom: 5 }}>TOPICS COVERED</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {selectedConcept.topics.map((t, i) => (
                      <span key={i} style={{ fontSize: 9, padding: "2px 8px", borderRadius: 4, background: C.b2, color: C.t2 }}>{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Equations */}
              {selectedConcept.equations?.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 9, color: C.t3, fontWeight: 700, marginBottom: 5 }}>KEY EQUATIONS</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {selectedConcept.equations.map((eq, i) => (
                      <span key={i} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 5,
                        background: `${sm.color}15`, color: sm.color, fontFamily: "monospace", fontWeight: 700 }}>{eq}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Facts */}
              {selectedConcept.keyFacts?.length > 0 && (
                <div>
                  <div style={{ fontSize: 9, color: C.t3, fontWeight: 700, marginBottom: 5 }}>KEY FACTS</div>
                  {selectedConcept.keyFacts.slice(0, 4).map((f, i) => (
                    <div key={i} style={{ fontSize: 10, color: C.t2, marginBottom: 3, paddingLeft: 10, borderLeft: `2px solid ${sm.color}40` }}>
                      {f}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Visual Style Selector */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: C.t3, fontWeight: 700, marginBottom: 8 }}>VISUAL STYLE</div>
              <div style={{ display: "flex", gap: 8 }}>
                {VISUAL_STYLES.map(vs => (
                  <div key={vs.id} onClick={() => setVisualStyle(vs.id)}
                    style={{ flex: 1, padding: "10px 10px", borderRadius: 10, cursor: "pointer",
                      border: `2px solid ${visualStyle === vs.id ? vs.color : C.b1}`,
                      background: visualStyle === vs.id ? `${vs.color}12` : C.s2, transition: "all .15s" }}>
                    <div style={{ fontSize: 16, marginBottom: 4 }}>{vs.emoji}</div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: visualStyle === vs.id ? vs.color : C.text, marginBottom: 3 }}>{vs.label}</div>
                    <div style={{ fontSize: 8, color: C.t3, lineHeight: 1.4 }}>{vs.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: C.t3, fontWeight: 700, marginBottom: 8 }}>TARGET LENGTH</div>
              <div style={{ display: "flex", gap: 6 }}>
                {DURATION_OPTIONS.map(d => (
                  <button key={d.sec} onClick={() => setDurationSec(d.sec)}
                    style={{ flex: 1, padding: "6px 4px", borderRadius: 7, border: `1px solid ${durationSec === d.sec ? C.accent : C.b2}`,
                      background: durationSec === d.sec ? `${C.accent}12` : "transparent",
                      color: durationSec === d.sec ? C.accent : C.t3, fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Vijnana Engine Toggle */}
            <div style={{ marginBottom: 10, padding: "10px 12px", background: narrativeMode === "vijnana" ? "rgba(255,180,0,0.07)" : C.s2, borderRadius: 9, border: `1px solid ${narrativeMode === "vijnana" ? "#ffb40040" : C.b2}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: narrativeMode === "vijnana" ? "#ffb400" : C.t2, letterSpacing: ".08em" }}>
                  🎭 VIJNANA ENGINE v7.0
                </div>
                <div style={{ fontSize: 9, color: C.t3, marginTop: 2 }}>
                  {narrativeMode === "vijnana"
                    ? "Jugaad-cademy: Wedding-crisis narrative · 4-Layer stack · Historical mentors"
                    : "Standard edutainment mode"}
                </div>
              </div>
              <button onClick={() => setNarrativeMode(m => m === "vijnana" ? "standard" : "vijnana")}
                style={{ flexShrink: 0, padding: "5px 12px", borderRadius: 6, border: `1px solid ${narrativeMode === "vijnana" ? "#ffb400" : C.b3}`,
                  background: narrativeMode === "vijnana" ? "#ffb40018" : "transparent",
                  color: narrativeMode === "vijnana" ? "#ffb400" : C.t3,
                  fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {narrativeMode === "vijnana" ? "ON ✓" : "OFF"}
              </button>
            </div>

            {/* Generate Button */}
            {genError && (
              <div style={{ marginBottom: 10, padding: "8px 12px", background: `${C.red}10`, border: `1px solid ${C.red}30`, borderRadius: 7, fontSize: 10, color: C.red }}>
                ❌ {genError}
              </div>
            )}
            {/* Streaming progress bar */}
            {generating && genChars > 0 && (
              <div style={{ marginBottom: 8, padding: "6px 10px", background: C.s2, borderRadius: 7, border: `1px solid ${C.b2}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 8, color: C.t3 }}>Streaming blueprint…</span>
                  <span style={{ fontSize: 8, color: narrativeMode === "vijnana" ? "#ffb400" : sm.color, fontFamily: "monospace" }}>
                    {genChars.toLocaleString()} chars
                  </span>
                </div>
                <div style={{ height: 3, background: C.b3, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(100, (genChars / 6000) * 100)}%`,
                    background: narrativeMode === "vijnana" ? "linear-gradient(90deg,#ffb400,#ff6b35)" : `linear-gradient(90deg,${sm.color},${C.orange})`,
                    borderRadius: 2, transition: "width .3s ease" }} />
                </div>
              </div>
            )}
            <button onClick={handleGenerate} disabled={generating}
              style={{ width: "100%", padding: "13px", borderRadius: 10, border: "none",
                background: generating ? C.b2
                  : narrativeMode === "vijnana"
                    ? "linear-gradient(135deg, #ffb400, #ff6b35)"
                    : `linear-gradient(135deg, ${sm.color}, ${C.orange})`,
                color: generating ? C.t3 : C.bg, fontSize: 13, fontWeight: 800,
                cursor: generating ? "not-allowed" : "pointer", fontFamily: "var(--display)", letterSpacing: ".1em",
                boxShadow: generating ? "none" : narrativeMode === "vijnana" ? "0 4px 20px #ffb40030" : `0 4px 20px ${sm.color}30`,
                transition: "all .2s" }}>
              {generating
                ? (genChars === 0
                    ? `⏳ ${narrativeMode === "vijnana" ? "Summoning Jugaad-cademy…" : "Connecting to Claude…"}`
                    : `⏳ ${narrativeMode === "vijnana" ? "Weaving the crisis…" : "Writing scenes…"}`)
                : narrativeMode === "vijnana"
                  ? `🎭 Generate Vijnana Blueprint`
                  : `🎬 Generate ${VISUAL_STYLES.find(s=>s.id===visualStyle)?.emoji} ${VISUAL_STYLES.find(s=>s.id===visualStyle)?.label} Blueprint`}
            </button>
          </>
        )}

        {/* ── Blueprint Result ──────────────────────────────── */}
        {blueprint && (
          <div style={{ marginTop: 24, padding: "16px", background: blueprintMode === "vijnana" ? "rgba(255,180,0,0.04)" : `${sm.color}06`, border: `1px solid ${blueprintMode === "vijnana" ? "#ffb40030" : sm.color + "22"}`, borderRadius: 12 }}>

            {/* Vijnana Engine header badge */}
            {blueprintMode === "vijnana" && (
              <div style={{ marginBottom: 10, padding: "7px 12px", background: "rgba(255,180,0,0.1)", borderRadius: 7, border: "1px solid #ffb40030", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 16 }}>🎭</span>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#ffb400", letterSpacing: ".08em" }}>VIJNANA ENGINE v7.0 — JUGAAD-CADEMY</div>
                  <div style={{ fontSize: 9, color: C.t2 }}>4-Layer Stack · Wedding-Crisis Narrative · Indian Math Lineage</div>
                </div>
                {/* Show first crisis hook if available */}
                {blueprint.scenes?.[0]?.crisisHook && (
                  <div style={{ marginLeft: "auto", fontSize: 9, color: "#ff6b35", fontStyle: "italic", maxWidth: 200, textAlign: "right" }}>
                    "{blueprint.scenes[0].crisisHook}"
                  </div>
                )}
              </div>
            )}

            {/* Historical Mentor Card */}
            {blueprintMode === "vijnana" && blueprint.characters?.length > 0 && (
              <div style={{ marginBottom: 10, padding: "7px 12px", background: C.s2, borderRadius: 7, border: `1px solid ${C.b2}`, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>🏛</span>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: C.purple }}>OBSERVER_AI — {blueprint.characters[0]?.name}</div>
                  <div style={{ fontSize: 9, color: C.t2 }}>{blueprint.characters[0]?.role}</div>
                </div>
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 20 }}>{blueprintMode === "vijnana" ? "🎭" : VISUAL_STYLES.find(s=>s.id===visualStyle)?.emoji}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: blueprint.title ? (blueprintMode === "vijnana" ? "#ffb400" : sm.color) : C.t2 }}>{blueprint.title}</div>
                <div style={{ fontSize: 10, color: C.t2, fontStyle: "italic" }}>{blueprint.logline}</div>
              </div>
            </div>

            {/* Scene Cards */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 9, color: C.t3, fontWeight: 700, marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                <span>{blueprint.scenes?.length || 0} SCENES · {durationSec}s TOTAL</span>
                {renderCounts && renderCounts.done > 0 && (
                  <span style={{ color: C.green }}>{renderCounts.done}/{renderCounts.total} rendered</span>
                )}
              </div>
              {blueprint.scenes?.map((scene, i) => {
                const job = sceneRenders[i];
                const statusColor = { succeeded: C.green, failed: C.red, processing: C.blue }[job?.status] || C.b1;
                const layerColors = { CRISIS_STAKES: "#ff6b35", GHOST_LAYER: "#4da6ff", VARIABLE_REVELATION: "#e8ff6e", OBSERVER_AI: C.purple, TRIUMPH: C.green };
                const layerColor  = layerColors[scene.layer] || C.t3;
                return (
                  <div key={i} style={{ marginBottom: 6, padding: "8px 10px", background: C.s2, borderRadius: 7, border: `1px solid ${statusColor}44` }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <div style={{ fontSize: 9, color: sm.color, fontWeight: 700, flexShrink: 0, width: 18 }}>S{i+1}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Vijnana layer chip */}
                        {blueprintMode === "vijnana" && scene.layer && (
                          <div style={{ display: "inline-block", fontSize: 7, fontWeight: 800, padding: "1px 7px", borderRadius: 4, background: `${layerColor}18`, color: layerColor, border: `1px solid ${layerColor}40`, marginBottom: 3, letterSpacing: ".06em" }}>
                            {scene.layer}
                          </div>
                        )}
                        <div style={{ fontSize: 10, fontWeight: 700, color: C.text, marginBottom: 2 }}>{scene.title}</div>
                        {scene.narration && (
                          <div style={{ fontSize: 9, color: C.t2, fontStyle: "italic", marginBottom: 3 }}>"{scene.narration}"</div>
                        )}
                        {/* Crisis hook (Vijnana) */}
                        {blueprintMode === "vijnana" && scene.crisisHook && (
                          <div style={{ fontSize: 8, color: "#ff6b35", marginBottom: 3 }}>⚡ {scene.crisisHook}</div>
                        )}
                        {/* Mentor quote (Vijnana) */}
                        {blueprintMode === "vijnana" && scene.historicalMentor && scene.mentorQuote && (
                          <div style={{ fontSize: 8, color: C.purple, fontStyle: "italic", marginBottom: 3 }}>
                            🏛 {scene.historicalMentor}: "{scene.mentorQuote}"
                          </div>
                        )}
                        {/* Mental trap warning (Vijnana) */}
                        {blueprintMode === "vijnana" && scene.mentalTrap && (
                          <div style={{ fontSize: 8, padding: "3px 8px", background: `${C.orange}12`, borderRadius: 4, color: C.orange, marginBottom: 3 }}>
                            {scene.mentalTrap}
                          </div>
                        )}
                        {/* Physical→Math transition (Vijnana) */}
                        {blueprintMode === "vijnana" && scene.physicalTerms?.length > 0 && (
                          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3, flexWrap: "wrap" }}>
                            {scene.physicalTerms.map((t, j) => (
                              <span key={j} style={{ fontSize: 7, padding: "1px 5px", background: `${C.teal}15`, borderRadius: 3, color: C.teal }}>{t}</span>
                            ))}
                            {scene.mathSymbols?.length > 0 && <span style={{ fontSize: 7, color: C.t3 }}>→</span>}
                            {scene.mathSymbols?.map((s, j) => (
                              <span key={j} style={{ fontSize: 7, padding: "1px 5px", background: `${C.accent}15`, borderRadius: 3, color: C.accent, fontFamily: "monospace" }}>{s}</span>
                            ))}
                          </div>
                        )}
                        {/* Render status row */}
                        {job && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                            <span style={{ fontSize: 8, padding: "1px 6px", borderRadius: 3,
                              background: job.provider === "manim" ? `${C.purple}20` : job.provider === "playwright" ? `${C.orange}20` : `${C.teal}20`,
                              color: job.provider === "manim" ? C.purple : job.provider === "playwright" ? C.orange : C.teal,
                              fontWeight: 700 }}>
                              {job.provider === "manim" ? "∑ Manim" : job.provider === "playwright" ? "🎭 Playwright" : "⚡ Remotion"}
                            </span>
                            <span style={{ fontSize: 8, color: statusColor }}>
                              {job.status === "processing" ? "⏳ rendering…"
                               : job.status === "succeeded" ? "✓ done"
                               : `✗ ${job.error?.slice(0, 40)}`}
                            </span>
                          </div>
                        )}
                        {/* Video preview */}
                        {job?.videoUrl && (
                          <video src={job.videoUrl} controls loop
                            style={{ width: "100%", borderRadius: 5, marginTop: 6, maxHeight: 140, background: "#000" }} />
                        )}
                      </div>
                      <div style={{ fontSize: 8, color: C.t3, flexShrink: 0 }}>{scene.durationSec}s</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Render Scenes button (whiteboard / sketch only) ── */}
            {useWhiteboardRenderer && (
              <div style={{ marginBottom: 10 }}>
                <button
                  onClick={handleRenderScenes}
                  disabled={rendering || stitching}
                  style={{ width: "100%", padding: "11px", borderRadius: 8, border: "none",
                    background: rendering ? C.b2 : `linear-gradient(135deg, ${C.purple}, ${C.teal})`,
                    color: rendering ? C.t3 : C.bg, fontSize: 12, fontWeight: 800,
                    cursor: rendering ? "not-allowed" : "pointer", fontFamily: "inherit",
                    boxShadow: rendering ? "none" : `0 4px 18px ${C.purple}30` }}>
                  {rendering
                    ? `⏳ Starting renders… (${renderCounts?.processing || 0} queued)`
                    : renderCounts?.done > 0
                      ? `↺ Re-render All Scenes`
                      : `🎬 Render Scenes — Manim / Remotion`}
                </button>
                {/* Renderer status + install trigger */}
                <div style={{ marginTop: 8 }}>
                  {/* Status badges row */}
                  <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginBottom: 6 }}>
                    {rendererDeps ? (
                      <>
                        <span style={{ fontSize: 8, padding: "2px 7px", borderRadius: 3,
                          background: rendererDeps.manim?.ready ? `${C.purple}20` : `${C.red}15`,
                          color: rendererDeps.manim?.ready ? C.purple : C.red, fontWeight: 700 }}>
                          ∑ Manim {rendererDeps.manim?.ready ? "✓ ready" : "✗ not installed"}
                        </span>
                        <span style={{ fontSize: 8, padding: "2px 7px", borderRadius: 3,
                          background: rendererDeps.remotion?.ready ? `${C.teal}20` : `${C.red}15`,
                          color: rendererDeps.remotion?.ready ? C.teal : C.red, fontWeight: 700 }}>
                          ⚡ Remotion {rendererDeps.remotion?.ready ? "✓ ready" : "✗ not ready"}
                        </span>
                        {rendererDeps.playwright && (
                          <span style={{ fontSize: 8, padding: "2px 7px", borderRadius: 3,
                            background: rendererDeps.playwright?.ready ? `${C.orange}20` : `${C.red}15`,
                            color: rendererDeps.playwright?.ready ? C.orange : C.red, fontWeight: 700 }}>
                            🎭 Playwright {rendererDeps.playwright?.ready ? "✓ ready" : "✗ not ready"}
                          </span>
                        )}
                      </>
                    ) : (
                      <span style={{ fontSize: 8, color: C.t3 }}>⏳ checking renderers…</span>
                    )}
                  </div>

                  {/* Install Manim button — shown only when not installed */}
                  {rendererDeps && !rendererDeps.manim?.ready && (
                    <div style={{ marginTop: 4 }}>
                      <button
                        onClick={handleInstallManim}
                        disabled={installingManim}
                        style={{ width: "100%", padding: "8px", borderRadius: 7,
                          border: `1px solid ${C.purple}60`,
                          background: installingManim ? C.b2 : `${C.purple}18`,
                          color: installingManim ? C.t3 : C.purple,
                          fontSize: 10, fontWeight: 700, cursor: installingManim ? "not-allowed" : "pointer",
                          fontFamily: "inherit" }}>
                        {installingManim ? "⏳ Installing Manim…" : "⬇ Install Manim (pip)"}
                      </button>

                      {/* Live terminal output */}
                      {manimLog.length > 0 && (
                        <div ref={manimLogRef}
                          style={{ marginTop: 6, padding: "8px 10px", background: "#0a0a0a",
                            border: `1px solid ${C.b2}`, borderRadius: 6,
                            maxHeight: 160, overflowY: "auto",
                            fontFamily: "monospace", fontSize: 9, color: "#b0b0b0",
                            lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                          {manimLog.join("")}
                        </div>
                      )}

                      {!installingManim && manimLog.length === 0 && (
                        <div style={{ fontSize: 7, color: C.t3, textAlign: "center", marginTop: 3 }}>
                          STEM scenes fall back to Remotion until Manim is installed
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Stitch final video ── */}
            {allDone && (
              <div style={{ marginBottom: 10 }}>
                <button
                  onClick={handleStitch}
                  disabled={stitching}
                  style={{ width: "100%", padding: "11px", borderRadius: 8, border: "none",
                    background: stitching ? C.b2 : `linear-gradient(135deg, ${C.green}, ${C.accent})`,
                    color: C.bg, fontSize: 12, fontWeight: 800,
                    cursor: stitching ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                  {stitching ? "⏳ Stitching…" : "🎞 Stitch Final Video"}
                </button>
                {stitchError && <div style={{ fontSize: 9, color: C.red, marginTop: 4 }}>{stitchError}</div>}
              </div>
            )}

            {/* ── Final video output ── */}
            {finalVideo && (
              <div style={{ marginBottom: 12, padding: "10px", background: `${C.green}08`, border: `1px solid ${C.green}30`, borderRadius: 9 }}>
                <div style={{ fontSize: 10, color: C.green, fontWeight: 700, marginBottom: 8 }}>✅ Final Video Ready</div>
                <video src={finalVideo} controls style={{ width: "100%", borderRadius: 7, background: "#000", maxHeight: 200 }} />
                <a href={finalVideo} download
                  style={{ display: "block", marginTop: 8, textAlign: "center", fontSize: 10, color: C.green, textDecoration: "none" }}>
                  ⬇ Download MP4
                </a>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 8 }}>
              {onSendToFramegen && (
                <button onClick={() => onSendToFramegen(blueprint)}
                  style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none",
                    background: `linear-gradient(135deg, ${sm.color}, ${C.orange})`,
                    color: C.bg, fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
                  ▶ Send to Framegen →
                </button>
              )}
              <button onClick={() => { const j = JSON.stringify(blueprint, null, 2); const a = document.createElement("a"); a.href = "data:application/json;charset=utf-8," + encodeURIComponent(j); a.download = `${blueprint.title || "blueprint"}.json`; a.click(); }}
                style={{ padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.b2}`,
                  background: "transparent", color: C.t2, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                ⬇ JSON
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
