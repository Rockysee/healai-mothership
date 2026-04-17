"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { WRITERS, GENRES, FORMATS, buildBlendPrompt, blendLabel, PRESET_BLENDS } from "./writers.js";
import { generateScriptStream as generateStream, scriptwriterAPI as api } from "./api.js";

// ── tiny reusable components ───────────────────────────────────────────────────
const Label = ({ children }) => (
  <div style={{ fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text4)", marginBottom: "7px", fontWeight: 600 }}>
    {children}
  </div>
);

const Chip = ({ active, color, onClick, children }) => (
  <button onClick={onClick} style={{
    padding: "7px 8px", border: `1px solid ${active ? (color || "var(--gold)") : "var(--border)"}`,
    borderRadius: "4px", fontSize: "11px", cursor: "pointer", transition: "all 0.15s",
    background: active ? (color ? color + "22" : "var(--bg3)") : "transparent",
    color: active ? (color || "var(--gold)") : "var(--text3)",
    fontFamily: "inherit", textAlign: "center", width: "100%",
  }}>{children}</button>
);

const Btn = ({ onClick, disabled, variant = "primary", children, style = {} }) => (
  <button onClick={onClick} disabled={disabled} style={{
    width: "100%", padding: "12px", border: "none", borderRadius: "6px",
    fontSize: "12px", fontWeight: 600, letterSpacing: "0.08em", cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit", transition: "all 0.2s",
    opacity: disabled ? 0.4 : 1,
    background: variant === "primary" ? "linear-gradient(135deg, var(--gold), var(--gold-dim))" : "transparent",
    color: variant === "primary" ? "var(--bg)" : "var(--text3)",
    
    ...style,
  }}>{children}</button>
);

const Toast = ({ msg, type, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 999,
      padding: "12px 18px", borderRadius: "8px", fontSize: "13px",
      background: type === "error" ? "#3a1010" : "#1a2a1a",
      border: `1px solid ${type === "error" ? "#8b3030" : "#2a6a2a"}`,
      color: type === "error" ? "#e08080" : "#80c080",
      animation: "fadeIn 0.2s ease",
      maxWidth: "320px",
    }}>{msg}</div>
  );
};

// ── main app ──────────────────────────────────────────────────────────────────
export default function Scriptwriter({ onExecute }) {
  // script state
  const [genre, setGenre] = useState("Drama");
  const [format, setFormat] = useState("Feature Film");
  const [premise, setPremise] = useState("");
  const [writerWeights, setWriterWeights] = useState({});
  const [script, setScript] = useState("");
  const [scriptId, setScriptId] = useState(null);
  const [scriptTitle, setScriptTitle] = useState("Untitled Script");
  const [editingTitle, setEditingTitle] = useState(false);
  const [notes, setNotes] = useState("");
  const [history, setHistory] = useState([]);

  // ui state
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("write");
  const [savedScripts, setSavedScripts] = useState([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [toast, setToast] = useState(null);
  const [apiOk, setApiOk] = useState(null);
  const [undoStack, setUndoStack] = useState([]);
  const [copied, setCopied] = useState(false);

  const scriptRef = useRef(null);
  const bottomRef = useRef(null);
  const titleInputRef = useRef(null);

  // check health on mount
  useEffect(() => {
    api.health().then(h => setApiOk(h.apiKeySet)).catch(() => setApiOk(false));
    loadLibrary();
  }, []);

  useEffect(() => {
    if (script && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [script]);

  useEffect(() => {
    if (editingTitle && titleInputRef.current) titleInputRef.current.focus();
  }, [editingTitle]);

  const showToast = (msg, type = "success") => setToast({ msg, type });

  const loadLibrary = async () => {
    try {
      const { scripts } = await api.listScripts();
      setSavedScripts(scripts || []);
    } catch {}
  };

  // writer weight helpers
  const setWeight = (id, val) => setWriterWeights(prev => ({ ...prev, [id]: val }));
  const removeWriter = (id) => setWriterWeights(prev => { const n = { ...prev }; delete n[id]; return n; });
  const addWriter = (id) => { if (!writerWeights[id]) setWriterWeights(prev => ({ ...prev, [id]: 50 })); };

  const activeWriters = WRITERS.filter(w => (writerWeights[w.id] || 0) > 0);
  const totalWeight = Object.values(writerWeights).reduce((s, v) => s + v, 0);
  const blendSegments = activeWriters
    .map(w => ({ ...w, weight: writerWeights[w.id] || 0, pct: totalWeight > 0 ? ((writerWeights[w.id] || 0) / totalWeight) * 100 : 0 }))
    .sort((a, b) => b.weight - a.weight);

  const wordCount = script.trim() ? script.trim().split(/\s+/).length : 0;
  const pageEst = Math.max(1, Math.round(wordCount / 180));

  // push to undo stack before mutating script
  const pushUndo = (s) => setUndoStack(prev => [...prev.slice(-9), s]);

  const handleGenerate = async () => {
    if (!premise.trim()) return;
    pushUndo(script);
    setLoading(true);
    setScript("");
    setHistory([]);

    const styleNote = activeWriters.length > 0
      ? `Write in the blended style as instructed. Let the style be palpable from the very first line.`
      : "";
    const userMsg = { role: "user", content: `Write the opening of a ${format} in the ${genre} genre.\n\nPremise: ${premise}\n\n${styleNote}\n\nWrite the first 2-3 scenes in proper screenplay format.` };

    let accumulated = "";
    await generateStream({
      messages: [userMsg],
      systemPrompt: buildBlendPrompt(writerWeights),
      onDelta: (text) => { accumulated += text; setScript(accumulated); },
      onDone: () => {
        setHistory([userMsg, { role: "assistant", content: accumulated }]);
        setLoading(false);
      },
      onError: (err) => { showToast(err, "error"); setLoading(false); },
    });
  };

  const handleContinue = async () => {
    if (!script) return;
    pushUndo(script);
    setLoading(true);
    const contMsg = { role: "user", content: `Continue the script with the next 2-3 scenes${activeWriters.length > 0 ? ", maintaining the exact same style blend" : ""}.` };
    const msgs = [...history, contMsg];
    const base = script;

    let accumulated = "\n\n";
    await generateStream({
      messages: msgs,
      systemPrompt: buildBlendPrompt(writerWeights),
      onDelta: (text) => { accumulated += text; setScript(base + accumulated); },
      onDone: () => {
        setHistory([...msgs, { role: "assistant", content: accumulated.trim() }]);
        setLoading(false);
      },
      onError: (err) => { showToast(err, "error"); setLoading(false); },
    });
  };

  const handleRevise = async () => {
    if (!script || !notes.trim()) return;
    pushUndo(script);
    setLoading(true);
    const revMsg = { role: "user", content: `Revise the script based on these notes:\n\n${notes}\n\nReturn the full revised script.` };
    const msgs = [...history, revMsg];

    let accumulated = "";
    await generateStream({
      messages: msgs,
      systemPrompt: buildBlendPrompt(writerWeights),
      onDelta: (text) => { accumulated += text; setScript(accumulated); },
      onDone: () => {
        setHistory([...msgs, { role: "assistant", content: accumulated }]);
        setNotes("");
        setLoading(false);
      },
      onError: (err) => { showToast(err, "error"); setLoading(false); },
    });
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack(s => s.slice(0, -1));
    setScript(prev);
  };

  const handleSave = async () => {
    if (!script) return;
    try {
      const label = blendLabel(writerWeights);
      const { id } = await api.saveScript({ id: scriptId, title: scriptTitle, genre, format, premise, script, writerWeights, blendLabel: label, history });
      if (!scriptId) setScriptId(id);
      await loadLibrary();
      showToast("Script saved ✓");
    } catch (e) {
      showToast("Save failed", "error");
    }
  };

  const handleLoad = async (id) => {
    try {
      const s = await api.loadScript(id);
      setScript(s.script || "");
      setScriptId(s.id);
      setScriptTitle(s.title || "Untitled Script");
      setGenre(s.genre || "Drama");
      setFormat(s.format || "Feature Film");
      setPremise(s.premise || "");
      setWriterWeights(s.writerWeights || {});
      setHistory(s.history || []);
      setUndoStack([]);
      setShowLibrary(false);
      showToast(`Loaded "${s.title}"`);
    } catch {
      showToast("Failed to load script", "error");
    }
  };

  const handleDelete = async (id, title) => {
    if (!confirm(`Delete "${title}"?`)) return;
    await api.deleteScript(id);
    await loadLibrary();
    if (scriptId === id) { setScript(""); setScriptId(null); setScriptTitle("Untitled Script"); }
    showToast("Deleted");
  };

  const handleNewScript = () => {
    if (script && !confirm("Start a new script? Unsaved changes will be lost.")) return;
    setScript(""); setScriptId(null); setScriptTitle("Untitled Script");
    setPremise(""); setHistory([]); setUndoStack([]);
    setShowLibrary(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(script).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownload = () => {
    const blob = new Blob([script], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${scriptTitle.replace(/[^a-z0-9]/gi, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg)" }}>

      {/* ── Header ── */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", height: "52px", background: "var(--bg2)", borderBottom: "1px solid var(--border)", flexShrink: 0, gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          <span style={{ fontSize: "18px" }}>🎬</span>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, letterSpacing: "0.08em", color: "var(--gold)", fontFamily: "'Special Elite', cursive" }}>FADE IN</div>
            <div style={{ fontSize: "9px", color: "var(--text4)", letterSpacing: "0.2em", textTransform: "uppercase" }}>AI Script Studio</div>
          </div>
        </div>

        {/* Title */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: "8px" }}>
          {editingTitle ? (
            <input ref={titleInputRef} value={scriptTitle} onChange={e => setScriptTitle(e.target.value)}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={e => { if (e.key === "Enter") setEditingTitle(false); }}
              style={{ background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: "4px", color: "var(--text)", padding: "4px 8px", fontSize: "13px", fontFamily: "inherit", outline: "none", width: "240px" }}
            />
          ) : (
            <span onClick={() => setEditingTitle(true)} title="Click to rename"
              style={{ fontSize: "13px", color: "var(--text2)", cursor: "text", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "280px" }}>
              {scriptTitle}
            </span>
          )}
          {script && <span style={{ fontSize: "11px", color: "var(--text4)" }}>~{wordCount.toLocaleString()} words · ~{pageEst}pp</span>}
        </div>

        {/* API status + actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          {apiOk === false && (
            <div title="API key not set — check .env" style={{ fontSize: "10px", color: "#e08080", padding: "3px 8px", background: "#3a1010", borderRadius: "10px", border: "1px solid #8b3030" }}>⚠ No API key</div>
          )}
          {blendSegments.length > 0 && (
            <div style={{ display: "flex", gap: "4px" }}>
              {blendSegments.slice(0, 3).map(w => (
                <div key={w.id} title={`${w.fullName}: ${Math.round(w.pct)}%`} style={{ padding: "2px 7px", borderRadius: "10px", background: w.color + "22", border: `1px solid ${w.color}55`, fontSize: "10px", color: w.color }}>
                  {w.emoji} {Math.round(w.pct)}%
                </div>
              ))}
              {blendSegments.length > 3 && <div style={{ fontSize: "10px", color: "var(--text4)", padding: "2px 4px" }}>+{blendSegments.length - 3}</div>}
            </div>
          )}
          {script && <>
            <HeaderBtn onClick={handleUndo} disabled={undoStack.length === 0} title="Undo last generation (Ctrl+Z)">↩</HeaderBtn>
            <HeaderBtn onClick={handleCopy} title="Copy script">{copied ? "✓" : "⎘"}</HeaderBtn>
            <HeaderBtn onClick={handleDownload} title="Download as .txt">↓</HeaderBtn>
            <HeaderBtn onClick={handleSave} title="Save script">💾</HeaderBtn>
          </>}
          <HeaderBtn onClick={() => { setShowLibrary(l => !l); if (!showLibrary) loadLibrary(); }} title="Script library">📂</HeaderBtn>
          <HeaderBtn onClick={handleNewScript} title="New script">＋</HeaderBtn>
        </div>
      </header>

      {/* Blend bar */}
      {blendSegments.length > 0 && (
        <div style={{ height: "3px", display: "flex", flexShrink: 0 }}>
          {blendSegments.map(w => <div key={w.id} style={{ flex: w.pct, background: w.color, transition: "flex 0.4s ease" }} />)}
        </div>
      )}

      {/* ── Body ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── Sidebar ── */}
        <div style={{ width: "310px", minWidth: "310px", background: "var(--bg2)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
            {[["write", "✍️ Write"], ["blend", "🎨 Blend"], ["revise", "✏️ Revise"]].map(([tab, label]) => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                flex: 1, padding: "10px 4px", background: activeTab === tab ? "var(--bg3)" : "transparent",
                border: "none", color: activeTab === tab ? "var(--gold)" : "var(--text4)",
                fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase",
                cursor: "pointer", borderBottom: activeTab === tab ? "2px solid var(--gold)" : "2px solid transparent",
                transition: "all 0.2s", fontFamily: "inherit",
              }}>{label}</button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>

            {/* WRITE */}
            {activeTab === "write" && <>
              <div>
                <Label>Format</Label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
                  {FORMATS.map(f => <Chip key={f} active={format === f} onClick={() => setFormat(f)}>{f}</Chip>)}
                </div>
              </div>
              <div>
                <Label>Genre</Label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
                  {GENRES.map(g => <Chip key={g} active={genre === g} onClick={() => setGenre(g)}>{g}</Chip>)}
                </div>
              </div>
              <div>
                <Label>Premise</Label>
                <textarea value={premise} onChange={e => setPremise(e.target.value)}
                  onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleGenerate(); }}
                  placeholder="A dying oil tycoon hires a philosopher to debate whether his life had meaning — the conversation spirals into something neither expected...&#10;&#10;Tip: Cmd+Enter to generate"
                  rows={6} style={taStyle} />
              </div>
              <Btn onClick={handleGenerate} disabled={loading || !premise.trim()}>
                {loading ? "Writing…" : "✦ Generate Script"}
              </Btn>
              {script && <Btn variant="secondary" onClick={handleContinue} disabled={loading}>↓ Continue Script</Btn>}
              {onExecute && (
                <Btn style={{ marginTop: "14px", background: "linear-gradient(135deg, #10a36b, #0b7a4f)", color: "#fff", border: "none" }} 
                     onClick={() => onExecute(script)}
                     disabled={!script}>
                  {script ? "🚀 Execute Framegen Timeline" : "Waiting for Script..."}
                </Btn>
              )}
            </>}

            {/* BLEND */}
            {activeTab === "blend" && <>
              <div style={infoBox}>
                Add writers and dial their influence. Dominant voices set the tone; secondary voices flavor specific moments.
              </div>

              {/* Active writers */}
              {activeWriters.length > 0 && <>
                <Label>Active Blend</Label>
                {activeWriters.map(w => {
                  const weight = writerWeights[w.id] || 0;
                  const pct = totalWeight > 0 ? Math.round((weight / totalWeight) * 100) : 0;
                  return (
                    <div key={w.id} style={{ padding: "11px 12px", background: "var(--bg3)", border: `1px solid ${w.color}40`, borderRadius: "7px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                          <span style={{ fontSize: "14px" }}>{w.emoji}</span>
                          <span style={{ fontSize: "12px", color: w.color, fontWeight: 600 }}>{w.name}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "12px", color: w.color, fontWeight: 700, minWidth: "32px", textAlign: "right" }}>{pct}%</span>
                          <button onClick={() => removeWriter(w.id)} style={{ background: "none", border: "none", color: "var(--text4)", cursor: "pointer", fontSize: "16px", lineHeight: 1, padding: 0 }}>×</button>
                        </div>
                      </div>
                      <input type="range" min={5} max={100} value={weight}
                        onChange={e => setWeight(w.id, parseInt(e.target.value))}
                        style={{ accentColor: w.color }}
                      />
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                        <span style={{ fontSize: "9px", color: "var(--text4)" }}>SUBTLE</span>
                        <span style={{ fontSize: "9px", color: "var(--text4)" }}>DOMINANT</span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                        {w.traits.slice(0, pct >= 50 ? 5 : pct >= 25 ? 3 : 2).map(t => (
                          <span key={t} style={{ fontSize: "9px", padding: "2px 6px", borderRadius: "10px", background: w.color + "18", color: w.color + "cc" }}>{t}</span>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Blend viz */}
                {blendSegments.length > 1 && (
                  <div>
                    <div style={{ height: "6px", borderRadius: "3px", overflow: "hidden", display: "flex", marginBottom: "6px" }}>
                      {blendSegments.map(w => <div key={w.id} style={{ flex: w.pct, background: w.color, transition: "flex 0.3s ease" }} />)}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {blendSegments.map(w => (
                        <div key={w.id} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: w.color }} />
                          <span style={{ fontSize: "10px", color: "var(--text3)" }}>{w.name} {Math.round(w.pct)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <Btn variant="secondary" onClick={() => setWriterWeights({})} style={{ opacity: 0.5, fontSize: "11px" }}>Clear All</Btn>
                <div style={{ borderTop: "1px solid var(--border)", marginTop: "2px" }} />
              </>}

              {/* Preset blends */}
              {activeWriters.length === 0 && <>
                <Label>Preset Blends</Label>
                {PRESET_BLENDS.map(p => (
                  <button key={p.label} onClick={() => setWriterWeights(p.blend)} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "9px 12px", background: "var(--bg3)", border: "1px solid var(--border)",
                    borderRadius: "7px", cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                    fontFamily: "inherit",
                  }}>
                    <div>
                      <div style={{ fontSize: "12px", color: "var(--text2)", fontWeight: 600 }}>{p.label}</div>
                      <div style={{ fontSize: "10px", color: "var(--text4)", marginTop: "2px", fontStyle: "italic" }}>{p.desc}</div>
                    </div>
                    <div style={{ display: "flex", gap: "3px" }}>
                      {Object.keys(p.blend).map(id => { const w = WRITERS.find(w => w.id === id); return w ? <span key={id} style={{ fontSize: "13px" }}>{w.emoji}</span> : null; })}
                    </div>
                  </button>
                ))}
                <div style={{ borderTop: "1px solid var(--border)", marginTop: "2px" }} />
              </>}

              {/* Writer library */}
              <Label>{activeWriters.length > 0 ? "Add More" : "All Writers"}</Label>
              {WRITERS.filter(w => !(writerWeights[w.id] > 0)).map(w => (
                <button key={w.id} onClick={() => addWriter(w.id)} style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "9px 11px", background: "transparent", border: "1px solid var(--border)",
                  borderRadius: "7px", cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                  fontFamily: "inherit",
                }}>
                  <span style={{ fontSize: "15px" }}>{w.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "12px", color: "var(--text2)", fontWeight: 600 }}>{w.fullName}</div>
                    <div style={{ fontSize: "10px", color: "var(--text4)", marginTop: "1px" }}>{w.description}</div>
                  </div>
                  <span style={{ fontSize: "16px", color: "var(--text4)" }}>+</span>
                </button>
              ))}
            </>}

            {/* REVISE */}
            {activeTab === "revise" && <>
              <div style={infoBox}>
                {script ? "Enter director's notes to revise. Style blend will be maintained." : "Generate a script first, then return here."}
              </div>
              <div>
                <Label>Director's Notes</Label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="The villain needs more menace. Scene 3 drags — cut it in half. The protagonist's motivation is unclear..."
                  rows={9} style={taStyle} disabled={!script} />
              </div>
              <Btn onClick={handleRevise} disabled={loading || !script || !notes.trim()}>
                {loading ? "Revising…" : "↺ Apply Notes"}
              </Btn>
              {script && <Btn variant="secondary" onClick={handleUndo} disabled={undoStack.length === 0}>↩ Undo Last Change</Btn>}
            </>}
          </div>
        </div>

        {/* ── Script Panel ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "40px", position: "relative" }} ref={scriptRef}>

          {/* Library overlay */}
          {showLibrary && (
            <div style={{ position: "absolute", inset: 0, background: "var(--bg)", zIndex: 10, padding: "32px", overflowY: "auto", animation: "fadeIn 0.15s ease" }}>
              <div style={{ maxWidth: "680px", margin: "0 auto" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
                  <div>
                    <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--gold)", fontFamily: "'Special Elite', cursive" }}>Script Library</div>
                    <div style={{ fontSize: "12px", color: "var(--text4)", marginTop: "2px" }}>{savedScripts.length} saved script{savedScripts.length !== 1 ? "s" : ""}</div>
                  </div>
                  <button onClick={() => setShowLibrary(false)} style={{ background: "none", border: "1px solid var(--border)", color: "var(--text3)", borderRadius: "6px", padding: "6px 14px", cursor: "pointer", fontFamily: "inherit", fontSize: "12px" }}>Close</button>
                </div>
                {savedScripts.length === 0 ? (
                  <div style={{ textAlign: "center", color: "var(--text4)", padding: "60px 0", fontSize: "14px" }}>No saved scripts yet. Generate and save your first one.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {savedScripts.map(s => (
                      <div key={s.id} style={{ padding: "14px 16px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "8px", display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "14px", color: "var(--text)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</div>
                          <div style={{ fontSize: "11px", color: "var(--text4)", marginTop: "3px" }}>
                            {s.genre} · {s.format} · ~{s.wordCount?.toLocaleString()} words
                          </div>
                          {s.blendLabel && <div style={{ fontSize: "10px", color: "var(--gold)", marginTop: "3px", opacity: 0.7 }}>{s.blendLabel}</div>}
                          <div style={{ fontSize: "10px", color: "var(--text4)", marginTop: "2px" }}>{new Date(s.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button onClick={() => handleLoad(s.id)} style={libBtn}>Load</button>
                          <button onClick={() => handleDelete(s.id, s.title)} style={{ ...libBtn, color: "#e08080", borderColor: "#3a1010" }}>Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {!script && !loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "20px" }}>
              <div style={{ fontSize: "48px" }}>🎞️</div>
              <div style={{ fontSize: "15px", letterSpacing: "0.2em", color: "#2e2820", fontFamily: "'Special Elite', cursive" }}>FADE IN:</div>
              <div style={{ fontSize: "12px", maxWidth: "360px", textAlign: "center", lineHeight: "1.9", color: "#2a2418" }}>
                Blend master screenwriters, write your premise, and generate your script. All scripts are saved locally.
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center", maxWidth: "420px" }}>
                {WRITERS.slice(0, 6).map(w => (
                  <button key={w.id} onClick={() => { addWriter(w.id); setActiveTab("blend"); }} style={{
                    padding: "5px 11px", background: "transparent", border: "1px solid var(--border)",
                    borderRadius: "20px", fontSize: "11px", color: "var(--text4)", cursor: "pointer",
                    fontFamily: "inherit", transition: "all 0.2s",
                  }}>{w.emoji} {w.name}</button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: "700px", margin: "0 auto" }}>
              {/* Blend badge */}
              {blendSegments.length > 0 && script && (
                <div style={{ marginBottom: "24px", padding: "10px 14px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "6px" }}>
                  <div style={{ fontSize: "9px", color: "var(--text4)", letterSpacing: "0.18em", marginBottom: "8px" }}>STYLE BLEND</div>
                  <div style={{ height: "4px", borderRadius: "2px", overflow: "hidden", display: "flex", marginBottom: "8px" }}>
                    {blendSegments.map(w => <div key={w.id} style={{ flex: w.pct, background: w.color }} />)}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                    {blendSegments.map(w => (
                      <div key={w.id} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <span style={{ fontSize: "11px" }}>{w.emoji}</span>
                        <span style={{ fontSize: "10px", color: w.color }}>{w.name}</span>
                        <span style={{ fontSize: "10px", color: "var(--text4)" }}>{Math.round(w.pct)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {loading && !script && (
                <div style={{ color: "var(--gold)", fontFamily: "'Source Code Pro', monospace", letterSpacing: "0.1em", animation: "pulse 1.5s infinite" }}>
                  FADE IN...
                </div>
              )}

              <pre style={{
                whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0,
                fontFamily: "'Source Code Pro', 'Courier New', monospace",
                fontSize: "13px", lineHeight: "1.9", color: "var(--script)",
              }}>{script}</pre>

              {loading && script && <div style={{ color: "var(--gold)", marginTop: "16px", fontFamily: "monospace", animation: "pulse 1s infinite" }}>▋</div>}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// helpers
const HeaderBtn = ({ onClick, disabled, title, children }) => (
  <button onClick={onClick} disabled={disabled} title={title} style={{
    background: "none", border: "1px solid var(--border)", color: disabled ? "var(--text4)" : "var(--text3)",
    borderRadius: "5px", padding: "5px 9px", cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "13px", transition: "all 0.15s", fontFamily: "inherit",
  }}>{children}</button>
);

const taStyle = {
  width: "100%", background: "var(--bg3)", border: "1px solid var(--border)",
  borderRadius: "6px", color: "var(--text)", padding: "10px 12px", fontSize: "12px",
  fontFamily: "inherit", lineHeight: "1.6", resize: "vertical", outline: "none",
  boxSizing: "border-box",
};

const infoBox = {
  fontSize: "11px", color: "var(--text4)", lineHeight: "1.7",
  padding: "10px 12px", background: "var(--bg3)", borderRadius: "6px", border: "1px solid var(--border)",
};

const libBtn = {
  padding: "5px 12px", background: "none", border: "1px solid var(--border)",
  borderRadius: "5px", color: "var(--text3)", cursor: "pointer", fontSize: "12px",
  fontFamily: "inherit", whiteSpace: "nowrap",
};
