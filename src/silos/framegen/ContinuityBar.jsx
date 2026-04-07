"use client";
import { useState, useEffect, useCallback } from "react";

const C = {
  bg: "#080808", s1: "#0f0f0f", s2: "#151515", s3: "#1c1c1c",
  b1: "#222", b2: "#2e2e2e", b3: "#3a3a3a",
  text: "#ede9e3", t2: "#8a8078", t3: "#4a4440",
  accent: "#e8ff6e", blue: "#4da6ff", green: "#4dff9e",
  red: "#ff5555", orange: "#ff6b35", purple: "#c084fc",
};

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

// ── API helpers ────────────────────────────────────────────────
async function apiGet(url) { const r = await fetch(url); return r.json(); }
async function apiPost(url, body) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return r.json();
}
async function apiPut(url, body) {
  const r = await fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return r.json();
}
async function apiDelete(url) { await fetch(url, { method: "DELETE" }); }

export default function ContinuityBar({ continuity, onContinuityChange }) {
  const [projects, setProjects] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newGenre, setNewGenre] = useState("Cinematic");
  const [newDuration, setNewDuration] = useState("120 min");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiGet("/api/continuity/projects").then(d => setProjects(d.projects || [])).catch(() => {});
  }, []);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setBusy(true);
    const d = await apiPost("/api/continuity/projects", { title: newTitle, genre: newGenre, totalDuration: newDuration });
    setProjects(prev => [d.project, ...prev]);
    setCreating(false); setNewTitle(""); setBusy(false);
  };

  const handleSelectProject = (proj) => {
    const chapters = proj.chapters || [];
    const chapterNumber = chapters.length + 1;
    // Build continuity from previous chapters
    const allChars = chapters.flatMap(c => c.characters || []);
    const allLocs  = chapters.flatMap(c => c.locations  || []);
    // Deduplicate by id
    const characters = Object.values(Object.fromEntries(allChars.map(c => [c.id, c])));
    const locations  = Object.values(Object.fromEntries(allLocs.map(l => [l.id, l])));
    const storySoFar = chapters.map((c, i) =>
      `Chapter ${i + 1} — "${c.title}": ${c.summary}`).join("\n") || "This is the first chapter — no prior events.";

    onContinuityChange({
      projectId: proj.id,
      filmTitle: proj.title,
      totalDuration: proj.total_duration,
      totalChapters: Math.ceil(parseInt(proj.total_duration) / 60) || 3,
      chapterNumber,
      characters,
      locations,
      storySoFar,
      chapterTask: `Continue the story of "${proj.title}". Chapter ${chapterNumber} begins immediately after the bridge moment of Chapter ${chapterNumber - 1}.`,
    });
    setExpanded(false);
  };

  const handleClearContinuity = () => {
    onContinuityChange(null);
  };

  const handleSaveChapter = async (projectId, chapterData) => {
    const proj = projects.find(p => p.id === projectId);
    if (!proj) return;
    const chapters = [...(proj.chapters || []), chapterData];
    await apiPut(`/api/continuity/projects/${projectId}`, { chapters });
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, chapters } : p));
  };

  // Expose saveChapter so parent can call it after blueprint is accepted
  useEffect(() => {
    if (continuity) continuity._saveChapter = handleSaveChapter;
  });

  return (
    <div style={{ borderBottom: `1px solid ${C.b1}`, background: continuity ? `${C.purple}08` : "transparent" }}>
      {/* Continuity bar header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 16px" }}>
        <button onClick={() => setExpanded(e => !e)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
            cursor: "pointer", fontFamily: "inherit", padding: 0 }}>
          <span style={{ fontSize: 13 }}>🔗</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: continuity ? C.purple : C.t3, letterSpacing: ".08em" }}>
            {continuity
              ? `CONTINUITY ON — "${continuity.filmTitle}" · Ch.${continuity.chapterNumber}`
              : "CONTINUITY MODE"}
          </span>
          <span style={{ fontSize: 9, color: C.t3 }}>{expanded ? "▲" : "▼"}</span>
        </button>

        {continuity && (
          <>
            <span style={{ fontSize: 9, color: C.purple, padding: "2px 7px", borderRadius: 10,
              background: `${C.purple}18`, border: `1px solid ${C.purple}30` }}>
              {continuity.characters.length} chars · {continuity.locations.length} locs locked
            </span>
            <button onClick={handleClearContinuity}
              style={{ marginLeft: "auto", fontSize: 9, color: C.t3, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
              ✕ Clear
            </button>
          </>
        )}
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div style={{ padding: "0 12px 12px", maxHeight: 320, overflowY: "auto" }}>

          {/* Create new project */}
          {!creating && (
            <button onClick={() => setCreating(true)}
              style={{ width: "100%", padding: "7px", borderRadius: 7, border: `1px dashed ${C.b2}`,
                background: "transparent", color: C.t2, fontSize: 10, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit", marginBottom: 8 }}>
              + New Feature Film Project
            </button>
          )}

          {creating && (
            <div style={{ padding: 10, background: C.s2, borderRadius: 8, marginBottom: 8, border: `1px solid ${C.b2}` }}>
              <div style={{ fontSize: 9, color: C.t3, fontWeight: 700, marginBottom: 6 }}>NEW FILM PROJECT</div>
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
                placeholder="Film title…"
                style={{ width: "100%", padding: "5px 8px", borderRadius: 5, border: `1px solid ${C.b2}`,
                  background: C.s3, color: C.text, fontSize: 11, fontFamily: "inherit", marginBottom: 6, boxSizing: "border-box" }} />
              <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                <select value={newDuration} onChange={e => setNewDuration(e.target.value)}
                  style={{ flex: 1, padding: "4px 6px", borderRadius: 5, border: `1px solid ${C.b2}`,
                    background: C.s3, color: C.t2, fontSize: 10, fontFamily: "inherit" }}>
                  {["60 min","90 min","120 min","150 min","180 min"].map(d =>
                    <option key={d} value={d}>{d}</option>)}
                </select>
                <input value={newGenre} onChange={e => setNewGenre(e.target.value)}
                  placeholder="Genre…"
                  style={{ flex: 1, padding: "4px 6px", borderRadius: 5, border: `1px solid ${C.b2}`,
                    background: C.s3, color: C.t2, fontSize: 10, fontFamily: "inherit" }} />
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={handleCreate} disabled={busy || !newTitle.trim()}
                  style={{ flex: 1, padding: "5px", borderRadius: 5, border: "none",
                    background: C.accent, color: C.bg, fontSize: 10, fontWeight: 700,
                    cursor: "pointer", fontFamily: "inherit" }}>
                  {busy ? "Creating…" : "Create Project"}
                </button>
                <button onClick={() => setCreating(false)}
                  style={{ padding: "5px 10px", borderRadius: 5, border: `1px solid ${C.b2}`,
                    background: "transparent", color: C.t2, fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Project list */}
          {projects.length === 0 && !creating && (
            <div style={{ textAlign: "center", color: C.t3, fontSize: 10, padding: "12px 0" }}>
              No projects yet — create one above to enable continuity mode.
            </div>
          )}

          {projects.map(proj => {
            const chapters = proj.chapters || [];
            const isActive = continuity?.projectId === proj.id;
            return (
              <div key={proj.id}
                style={{ padding: "8px 10px", borderRadius: 7, marginBottom: 6,
                  background: isActive ? `${C.purple}12` : C.s2,
                  border: `1px solid ${isActive ? C.purple : C.b1}`, cursor: "pointer" }}
                onClick={() => handleSelectProject(proj)}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12 }}>🎬</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: isActive ? C.purple : C.text, truncate: true }}>
                      {proj.title}
                    </div>
                    <div style={{ fontSize: 9, color: C.t3 }}>
                      {proj.genre} · {proj.total_duration} · {chapters.length} chapter{chapters.length !== 1 ? "s" : ""} done
                    </div>
                  </div>
                  {isActive && <span style={{ fontSize: 9, color: C.purple, fontWeight: 700 }}>ACTIVE</span>}
                  {!isActive && <span style={{ fontSize: 9, color: C.t3 }}>→ Load</span>}
                </div>

                {chapters.length > 0 && (
                  <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {chapters.map((ch, i) => (
                      <span key={i} style={{ fontSize: 8, padding: "2px 6px", borderRadius: 10,
                        background: C.s3, border: `1px solid ${C.b2}`, color: C.t3 }}>
                        Ch.{i + 1}: {ch.title?.slice(0, 20)}
                      </span>
                    ))}
                    <span style={{ fontSize: 8, padding: "2px 6px", borderRadius: 10,
                      background: `${C.accent}18`, border: `1px solid ${C.accent}30`, color: C.accent }}>
                      Ch.{chapters.length + 1} next →
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
