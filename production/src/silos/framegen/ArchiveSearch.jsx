"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { faceSearch, faceIndexList } from "./api.js";

// ── design tokens (matches App.jsx) ──────────────────────────
const C = {
  bg: "#080808", s1: "#0f0f0f", s2: "#151515", s3: "#1c1c1c", s4: "#252525",
  b1: "#222", b2: "#2e2e2e", b3: "#3a3a3a",
  text: "#ede9e3", t2: "#8a8078", t3: "#4a4440", t4: "#2a2420",
  accent: "#e8ff6e", blue: "#4da6ff", green: "#4dff9e", red: "#ff5555", orange: "#ff6b35",
};

const Pill = ({ color = C.blue, children }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 20,
    background: `${color}18`, border: `1px solid ${color}44`, color, fontSize: 10, fontWeight: 700,
    letterSpacing: ".1em", textTransform: "uppercase" }}>
    {children}
  </span>
);

const ConfBar = ({ score }) => (
  <div style={{ height: 3, background: C.s3, borderRadius: 2, marginTop: 4, overflow: "hidden" }}>
    <div style={{ width: `${Math.round(score * 100)}%`, height: "100%", background: score > 0.8 ? C.green : score > 0.6 ? C.accent : C.orange, borderRadius: 2, transition: "width .4s" }} />
  </div>
);

export default function ArchiveSearch({ scenes = [], onUseClip }) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [intent, setIntent] = useState(null);
  const [clips, setClips] = useState([]);
  const [info, setInfo] = useState("");
  const [done, setDone] = useState(null);
  const [coverage, setCoverage] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    faceIndexList().then(d => setCoverage(d)).catch(() => {});
  }, []);

  const handleSearch = useCallback(async () => {
    if (!query.trim() || busy) return;
    setBusy(true);
    setStatus(""); setIntent(null); setClips([]); setInfo(""); setDone(null);

    await faceSearch({
      query: query.trim(),
      onStatus: msg => setStatus(msg),
      onIntent: d => setIntent(d),
      onClip: d => setClips(prev => [...prev, d]),
      onInfo: msg => setInfo(msg),
      onDone: d => { setDone(d); setBusy(false); setStatus(""); },
      onError: msg => { setStatus(`❌ ${msg}`); setBusy(false); },
    });
  }, [query, busy]);

  const handleKeyDown = e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSearch(); } };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: C.bg }}>

      {/* ── Header ── */}
      <div style={{ padding: "16px 20px 0", borderBottom: `1px solid ${C.b1}`, paddingBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 16 }}>🎭</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text, letterSpacing: ".04em" }}>Archive Face Search</span>
          {coverage && (
            <span style={{ marginLeft: "auto", fontSize: 10, color: C.t2,
              padding: "2px 8px", background: C.s3, borderRadius: 20, border: `1px solid ${C.b2}` }}>
              {coverage.total} indexed · {coverage.total_videos} total videos
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKeyDown}
            placeholder='Type a name or description — e.g. "Shah Rukh Khan" or "the detective in a hat"'
            disabled={busy}
            style={{ flex: 1, padding: "10px 14px", background: C.s2, border: `1px solid ${C.b2}`,
              borderRadius: 8, color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none",
              opacity: busy ? 0.6 : 1 }} />
          <button onClick={handleSearch} disabled={busy || !query.trim()}
            style={{ padding: "10px 20px", borderRadius: 8, border: "none", cursor: busy ? "not-allowed" : "pointer",
              background: busy ? C.s3 : `linear-gradient(135deg, ${C.accent}, #c8df50)`,
              color: busy ? C.t2 : C.bg, fontSize: 12, fontWeight: 700, fontFamily: "inherit",
              opacity: !query.trim() ? 0.5 : 1, transition: "all .2s", whiteSpace: "nowrap" }}>
            {busy ? "Scanning…" : "🔍 Search"}
          </button>
        </div>

        {/* ── AI Intent preview ── */}
        {intent && (
          <div style={{ marginTop: 10, padding: "8px 12px", background: C.s3, borderRadius: 8,
            border: `1px solid ${C.b2}`, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: C.text, fontWeight: 600 }}>🤖 AI resolved:</span>
            <span style={{ fontSize: 12, color: C.accent, fontWeight: 700 }}>{intent.personName}</span>
            {intent.isRealPerson && <Pill color={C.green}>Real Person</Pill>}
            {!intent.isRealPerson && <Pill color={C.orange}>Fictional</Pill>}
            {intent.description && <span style={{ fontSize: 11, color: C.t2 }}>— {intent.description}</span>}
          </div>
        )}

        {/* ── Status bar ── */}
        {status && (
          <div style={{ marginTop: 8, padding: "6px 10px", background: `${C.blue}11`,
            border: `1px solid ${C.blue}33`, borderRadius: 6, fontSize: 11, color: C.blue }}>
            {status}
          </div>
        )}
        {info && (
          <div style={{ marginTop: 8, padding: "6px 10px", background: `${C.orange}11`,
            border: `1px solid ${C.orange}33`, borderRadius: 6, fontSize: 11, color: C.orange }}>
            ℹ️ {info}
          </div>
        )}
      </div>

      {/* ── Results ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>

        {/* Done summary */}
        {done && (
          <div style={{ padding: "10px 14px", background: done.found > 0 ? `${C.green}11` : C.s2,
            border: `1px solid ${done.found > 0 ? C.green : C.b1}33`, borderRadius: 8, marginBottom: 14,
            fontSize: 12, color: done.found > 0 ? C.green : C.t2, fontWeight: 600 }}>
            {done.found > 0
              ? `✅ Found ${done.found} clip${done.found !== 1 ? "s" : ""} · ${done.totalSec}s total footage for "${done.personName}"`
              : `No matches found for "${done.personName}" in current archive`}
          </div>
        )}

        {/* Empty state */}
        {!busy && clips.length === 0 && !done && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: C.t3 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🎬</div>
            <div style={{ fontSize: 13, color: C.t2, marginBottom: 6 }}>Search your archive by name or description</div>
            <div style={{ fontSize: 11, color: C.t3, maxWidth: 360, margin: "0 auto", lineHeight: 1.6 }}>
              AI resolves the identity, auto-fetches a reference, and progressively scans all downloaded YouTube clips and Framegen renders for matching faces.
            </div>
          </div>
        )}

        {/* Progressive clip grid */}
        {clips.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
            {clips.map((clip, i) => (
              <ClipCard key={i} clip={clip} scenes={scenes} onUseClip={onUseClip} />
            ))}
            {/* Loading skeleton while scanning */}
            {busy && [1,2].map(n => (
              <div key={`sk${n}`} style={{ height: 200, background: C.s2, borderRadius: 10,
                border: `1px solid ${C.b1}`, animation: "pulse 1.5s ease infinite",
                opacity: 0.5 }} />
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:.3} 50%{opacity:.6} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
      `}</style>
    </div>
  );
}

function ClipCard({ clip, scenes, onUseClip }) {
  const [selectedScene, setSelectedScene] = useState("");
  const scoreColor = clip.score > 0.8 ? C.green : clip.score > 0.6 ? C.accent : C.orange;
  const sourceLabel = clip.source === "youtube" ? "🎬 YouTube" : "🖥 Framegen";
  const sourceColor = clip.source === "youtube" ? C.red : C.blue;

  return (
    <div className="fade-up" style={{ background: C.s1, border: `1px solid ${C.b1}`,
      borderRadius: 10, overflow: "hidden", animation: "fadeUp .3s ease" }}>
      {/* Thumbnail */}
      <div style={{ height: 130, background: C.s3, position: "relative", overflow: "hidden" }}>
        {clip.thumbUrl ? (
          <img src={clip.thumbUrl} alt="frame" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
            color: C.t3, fontSize: 24 }}>🎬</div>
        )}
        {/* Source badge overlay */}
        <span style={{ position: "absolute", top: 6, left: 6, padding: "2px 6px", borderRadius: 4,
          background: `${sourceColor}dd`, color: "#fff", fontSize: 9, fontWeight: 700 }}>
          {sourceLabel}
        </span>
        {/* Duration badge */}
        <span style={{ position: "absolute", bottom: 6, right: 6, padding: "2px 6px", borderRadius: 4,
          background: "rgba(0,0,0,.75)", color: "#fff", fontSize: 9, fontWeight: 700 }}>
          {clip.duration.toFixed(1)}s
        </span>
      </div>

      {/* Info */}
      <div style={{ padding: "10px 12px" }}>
        <div style={{ fontSize: 11, color: C.text, fontWeight: 600, marginBottom: 2,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={clip.videoName}>
          {clip.videoName}
        </div>
        <div style={{ fontSize: 10, color: C.t2, marginBottom: 6 }}>
          {clip.personName} · at {clip.start.toFixed(1)}s
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 10, color: scoreColor, fontWeight: 700 }}>
            {Math.round(clip.score * 100)}% match
          </span>
        </div>
        <ConfBar score={clip.score} />

        {/* Use for Scene selector */}
        {scenes.length > 0 && (
          <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
            <select value={selectedScene} onChange={e => setSelectedScene(e.target.value)}
              style={{ flex: 1, padding: "5px 8px", background: C.s3, border: `1px solid ${C.b2}`,
                borderRadius: 5, color: C.t2, fontSize: 10, fontFamily: "inherit" }}>
              <option value="">Select scene…</option>
              {scenes.map((s, i) => (
                <option key={s.id || i} value={s.id || i}>Scene {i + 1}: {s.title?.slice(0, 24)}</option>
              ))}
            </select>
            <button onClick={() => selectedScene && onUseClip?.(clip, selectedScene)}
              disabled={!selectedScene}
              style={{ padding: "5px 10px", borderRadius: 5, border: "none", fontFamily: "inherit",
                background: selectedScene ? C.green : C.s3, color: selectedScene ? C.bg : C.t3,
                fontSize: 10, fontWeight: 700, cursor: selectedScene ? "pointer" : "not-allowed",
                transition: "all .2s" }}>
              Use ↗
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
