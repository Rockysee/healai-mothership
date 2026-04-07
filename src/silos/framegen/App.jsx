"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { chatStream, startGeneration, pollUntilDone, stitchScenes, db, usersAPI, listPhotos, uploadPhotos, kenBurns, uploadRefImage, searchYoutube, downloadYoutube, startImageGeneration, fetchMediaLibrary, fetchMediaFolders, createMediaFolder, uploadMedia, anchorPull } from "./api.js";
import Scriptwriter from "./Scriptwriter.jsx";
import ArchiveSearch from "./ArchiveSearch.jsx";
import CrucibleOS from "./CrucibleOS.jsx";
import CreditsPanel from "./CreditsPanel.jsx";
import ContinuityBar from "./ContinuityBar.jsx";
import ProducerPanel from "./ProducerPanel.jsx";
import SyllabusStudio from "./SyllabusStudio.jsx";
import { MODELS, STYLES, MOODS, DURATION_OPTIONS, buildSystemPrompt, QUICK_REFINES } from "./constants.js";

// ─────────────────────────────────────────────────────────────
// Tiny design system
// ─────────────────────────────────────────────────────────────

const css = Object.assign;   // short alias for style merging

const C = {                  // colour tokens
  bg:       "#080808",
  s1:       "#0f0f0f",
  s2:       "#151515",
  s3:       "#1c1c1c",
  s4:       "#252525",
  b1:       "#222",
  b2:       "#2e2e2e",
  b3:       "#3a3a3a",
  text:     "#ede9e3",
  t2:       "#8a8078",
  t3:       "#4a4440",
  t4:       "#2a2420",
  accent:   "#e8ff6e",
  blue:     "#4da6ff",
  green:    "#4dff9e",
  red:      "#ff5555",
  orange:   "#ff6b35",
};

function Spin({ size = 14 }) {
  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      border: `2px solid ${C.b3}`,
      borderTopColor: C.accent,
      borderRadius: "50%",
      animation: "spin .7s linear infinite",
    }} />
  );
}

function Badge({ children, color = C.accent }) {
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: ".1em",
      padding: "2px 6px", borderRadius: 4,
      background: color + "22", color, border: `1px solid ${color}44`,
    }}>
      {children}
    </span>
  );
}

function Btn({ onClick, disabled, variant = "primary", size = "md", icon, children, title, style: s = {} }) {
  const base = {
    display: "inline-flex", alignItems: "center", gap: 6,
    border: "none", cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "var(--sans)", fontWeight: 500, letterSpacing: ".03em",
    opacity: disabled ? .4 : 1, transition: "opacity .15s, background .15s",
    borderRadius: 7,
  };
  const sizes   = { sm: { padding: "5px 11px", fontSize: 11 }, md: { padding: "8px 16px", fontSize: 13 }, lg: { padding: "11px 22px", fontSize: 14 } };
  const variants = {
    primary:   { background: C.accent,  color: "#111" },
    secondary: { background: C.s3,      color: C.t2,   border: `1px solid ${C.b2}` },
    ghost:     { background: "none",     color: C.t3 },
    danger:    { background: "none",     color: C.red,  border: `1px solid ${C.red}44` },
    green:     { background: C.green+"22", color: C.green, border: `1px solid ${C.green}44` },
  };
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled} title={title}
      style={css({}, base, sizes[size] || sizes.md, variants[variant] || variants.primary, s)}>
      {icon}<span>{children}</span>
    </button>
  );
}

function Toast({ msg, type = "info", onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 5000); return () => clearTimeout(t); }, [onClose]);
  const colors = { success: C.green, error: C.red, info: C.blue, warn: C.orange };
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      padding: "11px 16px", borderRadius: 9,
      background: C.s2, border: `1px solid ${(colors[type] || C.blue)}55`,
      color: colors[type] || C.blue, fontSize: 13, maxWidth: 380,
      animation: "fadeUp .25s ease", boxShadow: "0 8px 30px #00000088",
    }}>
      {msg}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Scene card
// ─────────────────────────────────────────────────────────────

function SceneCard({ scene, idx, onGenerate, onRegen, onPickPhoto, busy, characters = [], locations = [], model = "" }) {
  const [expanded, setExpanded] = useState(false);
  const [elapsed,  setElapsed]  = useState(0);   // seconds since generation started
  const st = scene.genStatus || "idle";
  const statusColor = { idle: C.b2, generating: C.blue, succeeded: C.green, failed: C.red }[st] || C.b2;

  // Local = ~300s, cloud = ~45s
  const estTotal = model.includes("local") ? 300 : 45;

  // Tick elapsed timer while generating
  useEffect(() => {
    if (st !== "generating") { setElapsed(0); return; }
    setElapsed(0);
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [st]); // eslint-disable-line react-hooks/exhaustive-deps

  // Progress: clamp at 94% until truly done
  const pct = st === "succeeded" ? 100
             : st === "generating" ? Math.min(94, Math.round((elapsed / estTotal) * 100))
             : 0;
  const remaining = Math.max(0, estTotal - elapsed);
  const fmtTime = s => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  return (
    <div className="fade-up" style={{
      background: C.s1, border: `1px solid ${statusColor}55`,
      borderRadius: 10, overflow: "hidden",
    }}>
      {/* ── header ── */}
      <div style={{
        padding: "10px 14px", display: "flex", alignItems: "center", gap: 10,
        borderBottom: `1px solid ${C.b1}`, cursor: "pointer",
      }} onClick={() => setExpanded(e => !e)}>
        <div style={{
          width: 26, height: 26, flexShrink: 0, borderRadius: 5,
          background: C.s3, border: `1px solid ${statusColor}88`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--mono)", fontSize: 11, color: C.t3,
        }}>
          {idx + 1}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {scene.title}
          </div>
          <div style={{ fontSize: 10, color: C.t3, marginTop: 1, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span>{scene.shotType}  ·  {scene.cameraMove}  ·  {scene.durationSec}s</span>
            {/* Consistency badges */}
            {(scene.characterIds || []).map(cid => {
              const char = characters.find(c => c.id === cid);
              if (!char) return null;
              return (
                <span key={cid} style={{ fontSize: 9, padding: "1px 5px", background: C.blue + "18", color: C.blue, border: `1px solid ${C.blue}33`, borderRadius: 3, flexShrink: 0 }}>
                  👤 {char.name}{char.refImageUrl ? " ·I2V" : ""}
                </span>
              );
            })}
            {scene.locationId && (() => {
              const loc = locations.find(l => l.id === scene.locationId);
              return loc ? (
                <span style={{ fontSize: 9, padding: "1px 5px", background: C.orange + "18", color: C.orange, border: `1px solid ${C.orange}33`, borderRadius: 3, flexShrink: 0 }}>
                  📍 {loc.name}
                </span>
              ) : null;
            })()}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {st === "generating" && <Spin size={13} />}
          {st === "succeeded"  && <span style={{ color: C.green, fontSize: 13 }}>✓</span>}
          {st === "failed"     && <span style={{ color: C.red,   fontSize: 13 }}>✗</span>}
          <span style={{ fontSize: 9, color: statusColor, letterSpacing: ".12em" }}>{st.toUpperCase()}</span>
          <span style={{ color: C.t4, fontSize: 12 }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* ── Progress bar ── */}
      {(st === "generating" || st === "succeeded") && (
        <div style={{ padding: "0 14px 4px" }}>
          {st === "generating" && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontSize: 9, color: C.blue, fontFamily: "var(--mono)" }}>
                ⏱ {fmtTime(elapsed)} elapsed
              </span>
              <span style={{ fontSize: 9, color: C.t4, fontFamily: "var(--mono)" }}>
                {pct < 94 ? `~${fmtTime(remaining)} remaining` : "Finishing up…"}
              </span>
            </div>
          )}
          <div style={{ height: 3, borderRadius: 2, background: C.b2, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${pct}%`,
              background: st === "succeeded" ? C.green : `linear-gradient(90deg, ${C.blue}, ${C.accent})`,
              transition: "width 1s linear",
              borderRadius: 2,
            }} />
          </div>
        </div>
      )}

      {/* ── expanded body ── */}
      {expanded && (
        <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Prompt */}
          <div>
            <div style={labelStyle}>Video Prompt</div>
            <div style={{
              padding: "9px 12px", background: C.bg, borderRadius: 6,
              fontSize: 11, color: C.t2, lineHeight: 1.7, fontFamily: "var(--mono)",
            }}>
              {scene.videoPrompt}
            </div>
          </div>

          {/* Negative */}
          <div>
            <div style={labelStyle}>Negative</div>
            <div style={{ fontSize: 10, color: C.t4, fontFamily: "var(--mono)" }}>
              {scene.negativePrompt}
            </div>
          </div>

          {/* Narration */}
          {scene.narration && (
            <div>
              <div style={labelStyle}>Voice-over</div>
              <div style={{ fontSize: 12, color: C.t3, fontStyle: "italic" }}>"{scene.narration}"</div>
            </div>
          )}
        </div>
      )}

      {/* ── video preview ── */}
      {scene.videoUrl && (
        <div style={{ padding: "0 14px 10px" }}>
          <video src={scene.videoUrl} controls loop style={{ width: "100%", borderRadius: 7, background: "#000", maxHeight: 220 }} />
        </div>
      )}

      {/* ── progress log ── */}
      {st === "generating" && scene.progressLog && (
        <div style={{ padding: "4px 14px 8px", fontSize: 10, color: C.t4, fontFamily: "var(--mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {scene.progressLog}
        </div>
      )}

      {/* ── actions ── */}
      <div style={{ padding: "8px 14px 12px", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", borderTop: `1px solid ${C.b1}` }}>
        {st === "idle" && (
          <Btn size="sm" onClick={() => onGenerate(idx)} disabled={busy} icon={<span>▶</span>}>Generate</Btn>
        )}
        {(st === "succeeded" || st === "failed") && (
          <Btn size="sm" variant="secondary" onClick={() => onRegen(idx)} disabled={busy} icon={<span>↺</span>}>Regenerate</Btn>
        )}
        <Btn size="sm" variant="ghost" onClick={() => onPickPhoto(idx)} disabled={busy}
          style={{ border: `1px solid ${C.orange}44`, color: C.orange }}>
          📷 {scene.photoFile ? "Change Photo" : "Use Photo"}
        </Btn>
        {scene.photoFile && (
          <span style={{ fontSize: 10, color: C.t3, fontFamily: "var(--mono)", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120, whiteSpace: "nowrap" }}>
            {scene.photoFile}
          </span>
        )}
        {scene.videoUrl && (
          <Btn size="sm" variant="ghost" onClick={() => {
            const a = document.createElement("a");
            a.href = scene.videoUrl; a.download = `scene_${idx + 1}.mp4`; a.click();
          }}>⬇ Download</Btn>
        )}
        <div style={{ marginLeft: "auto", fontSize: 10, color: C.t4 }}>{scene.transition}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// Admin Media Panel
// ─────────────────────────────────────────────────────────────

function AdminPanel({ onInjectToTimeline, toast_ }) {
  const [lib, setLib] = useState({ photos: { Root: [] }, videos: { Root: [] } });
  const [folders, setFolders] = useState({ photos: ["Root"], videos: ["Root"] });
  const [activeType, setActiveType] = useState("videos");
  const [activeFolder, setActiveFolder] = useState("Root");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      const [l, f] = await Promise.all([fetchMediaLibrary(), fetchMediaFolders()]);
      setLib(l); setFolders(f);
    } catch (e) { toast_("Failed to load admin media", "error"); }
  };

  useEffect(() => { load(); }, []);

  const handleCreateFolder = async () => {
    const name = prompt("New folder name:");
    if (!name) return;
    try {
      await createMediaFolder(activeType, name);
      toast_("Folder created!");
      await load();
      setActiveFolder(name);
    } catch (e) { toast_(e.message, "error"); }
  };

  const handleUpload = async (e) => {
    if (!e.target.files.length) return;
    setLoading(true);
    try {
      await uploadMedia(activeType, activeFolder, e.target.files);
      toast_("Upload complete!", "success");
      await load();
    } catch (err) { toast_(err.message, "error"); }
    setLoading(false);
  };

  const activeFiles = lib[activeType]?.[activeFolder] || [];

  return (
    <div style={{ display: "flex", height: "100%", background: C.s1, borderRadius: 12, overflow: "hidden", border: `1px solid ${C.b1}` }}>
      {/* Sidebar */}
      <div style={{ width: 220, background: C.s2, borderRight: `1px solid ${C.b1}`, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: 15, borderBottom: `1px solid ${C.b1}`, fontWeight: 600 }}>Media Explorer</div>
        <div style={{ display: "flex", padding: 10, gap: 5 }}>
          <Btn size="sm" variant={activeType === "videos" ? "primary" : "ghost"} onClick={() => { setActiveType("videos"); setActiveFolder("Root"); }} style={{ flex: 1 }}>Videos</Btn>
          <Btn size="sm" variant={activeType === "photos" ? "primary" : "ghost"} onClick={() => { setActiveType("photos"); setActiveFolder("Root"); }} style={{ flex: 1 }}>Photos</Btn>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 10 }}>
          {folders[activeType].map(f => (
            <div key={f} onClick={() => setActiveFolder(f)} style={{
              padding: "8px 12px", fontSize: 13, borderRadius: 6, cursor: "pointer",
              background: activeFolder === f ? C.s3 : "transparent",
              color: activeFolder === f ? C.t1 : C.t2,
              marginBottom: 4, display: "flex", alignItems: "center", gap: 8
            }}>
              <span>📁</span> <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{f}</span>
            </div>
          ))}
          <Btn size="sm" variant="ghost" onClick={handleCreateFolder} style={{ width: "100%", marginTop: 10, color: C.t3 }}>+ New Folder</Btn>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg }}>
        <div style={{ padding: "15px 20px", borderBottom: `1px solid ${C.b1}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ color: C.t3 }}>{activeType === "videos" ? "Videos" : "Photos"} / </span>
            <span style={{ fontWeight: 600 }}>{activeFolder}</span>
            <span style={{ color: C.t3, fontSize: 12, marginLeft: 10 }}>({activeFiles.length} items)</span>
          </div>
          <div style={{ position: "relative" }}>
            <Btn size="sm" variant="primary" icon="⬆">{loading ? "Uploading..." : "Upload Files"}</Btn>
            <input type="file" multiple disabled={loading} onChange={handleUpload} accept={activeType === "videos" ? "video/*" : "image/*"} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
          </div>
        </div>

        <div style={{ flex: 1, padding: 20, overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 15, alignContent: "start" }}>
          {activeFiles.length === 0 && <div style={{ gridColumn: "1/-1", textAlign: "center", color: C.t3, marginTop: 40 }}>Folder is empty.</div>}
          {activeFiles.map(f => (
            <div key={f.filename} className="fade-up" style={{ background: C.s2, borderRadius: 8, overflow: "hidden", border: `1px solid ${C.b1}` }}>
              {activeType === "videos" ? (
                <video src={f.url} controls muted playsInline style={{ width: "100%", height: 120, objectFit: "cover", background: "#000" }} />
              ) : (
                <img src={f.url} alt="" style={{ width: "100%", height: 120, objectFit: "cover" }} />
              )}
              <div style={{ padding: 10 }}>
                <div style={{ fontSize: 11, color: C.t2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 8 }} title={f.filename}>{f.filename}</div>
                {activeType === "videos" && (
                  <Btn size="sm" style={{ width: "100%", fontSize: 11 }} icon="➕" onClick={() => onInjectToTimeline(f.url, f.filename)}>Add to Sequence</Btn>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  // ── config state ───────────────────────────────────────────
  const [model,    setModel]    = useState("wan-480p");
  const [style,    setStyle]    = useState("cinematic");
  const [mood,     setMood]     = useState("Epic");
  const [durIdx,   setDurIdx]   = useState(1);            // index into DURATION_OPTIONS

  // ── users / profiles state ─────────────────────────────────
  const [users, setUsers] = useState([]);
  const [activeUserId, setActiveUserId] = useState(null);

  // ── project state ──────────────────────────────────────────
  const [projectId,    setProjectId]    = useState(null);
  const [projectTitle, setProjectTitle] = useState("Untitled");
  const [editTitle,    setEditTitle]    = useState(false);
  const [blueprint,    setBlueprint]    = useState(null);    // parsed JSON from Claude
  const [scenes,       setScenes]       = useState([]);      // blueprint.scenes + video status
  const [finalUrl,     setFinalUrl]     = useState(null);

  // ── UI state ───────────────────────────────────────────────
  const [tab,           setTab]           = useState("home");  // home | chat | blueprint | syllabus | ...
  const [sidebarOpen,   setSidebarOpen]   = useState(true);   // collapsible left sidebar
  const [advTabs,       setAdvTabs]       = useState(false);  // show advanced tabs
  const [chatLog,       setChatLog]       = useState([]);
  const [input,         setInput]         = useState("");
  const [streaming,     setStreaming]      = useState(false);
  const [continuity,    setContinuity]     = useState(null);   // multi-chapter film continuity context
  const [genAllBusy,    setGenAllBusy]    = useState(false);
  const [stitchBusy,    setStitchBusy]    = useState(false);
  const [activeGens,    setActiveGens]    = useState(0);
  const [projects,      setProjects]      = useState([]);
  const [showLibrary,   setShowLibrary]   = useState(false);
  const [health,        setHealth]        = useState(null);
  const [toast,         setToast]         = useState(null);

  // ── youtube state ──────────────────────────────────────────
  const [ytQuery,       setYtQuery]       = useState("");
  const [ytResults,     setYtResults]     = useState([]);
  const [ytSearching,   setYtSearching]   = useState(false);
  const [ytDownloading, setYtDownloading] = useState(null); // videoId
  const [ytTrimStart,   setYtTrimStart]   = useState(0);
  const [ytTrimDuration,setYtTrimDuration]= useState(3);


  // ── local inference state ──────────────────────────────────
  const [localOnline, setLocalOnline] = useState(false);

  useEffect(() => {
    const checkLocal = () =>
      fetch("/api/local-health").then(r => r.json()).then(d => setLocalOnline(!!d.running)).catch(() => setLocalOnline(false));
    checkLocal();
    const t = setInterval(checkLocal, 10000);  // recheck every 10s
    return () => clearInterval(t);
  }, []);

  // Auto-select local LTX when local GPU server is available (avoids Replicate billing errors)
  useEffect(() => {
    if (localOnline) setModel(prev => prev === "local-ltx" ? prev : "local-ltx");
  }, [localOnline]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── photo repo state ───────────────────────────────────────
  const [photoPickerIdx,  setPhotoPickerIdx]  = useState(null);  // scene idx being picked, or null
  const [photoLibrary,    setPhotoLibrary]    = useState([]);
  const [photoLoading,    setPhotoLoading]    = useState(false);
  const [photoUploading,  setPhotoUploading]  = useState(false); // uploading new photos to repo
  const [photoDragOver,   setPhotoDragOver]   = useState(false); // drag-over state for drop zone
  const [photoBusyIdx,    setPhotoBusyIdx]    = useState(null);  // scene idx being converted
  const [pickerMove,      setPickerMove]      = useState("zoom-in");
  const photoUploadRef = useRef(null);

  // ── consistency state ──────────────────────────────────────
  // characters: [{ id, name, anchor, refImageUrl }]
  // locations:  [{ id, name, anchor }]
  const [characters,   setCharacters]   = useState([]);
  const [locations,    setLocations]    = useState([]);
  const [refUploading,     setRefUploading]     = useState(null);  // character id being uploaded
  const [anchorPullStatus, setAnchorPullStatus] = useState({});    // charId → { phase, clipsFound, scenesSet, message }

  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const titleRef   = useRef(null);
  const refInputRef = useRef(null);  // hidden file input for ref image upload

  const durOpt     = DURATION_OPTIONS[durIdx];
  const modelInfo  = MODELS.find(m => m.id === model) || MODELS[0];
  const styleInfo  = STYLES.find(s => s.id === style) || STYLES[0];
  const doneScenes = scenes.filter(s => s.genStatus === "succeeded").length;
  const totalCost  = scenes.reduce((sum, s) => sum + (s.durationSec || 5) * 0.01, 0);  // rough est

  // ── project helpers ────────────────────────────────────────
  const loadProjects = useCallback(async () => {
    if (!activeUserId) return;
    try { const r = await db.list(activeUserId); setProjects(r.projects || []); } catch {}
  }, [activeUserId]);

  const saveProject = useCallback(async (overrides = {}) => {
    if (!activeUserId) return;
    try {
      const payload = { id: projectId, title: projectTitle, style, mood, duration: durOpt.label, blueprint, scenes, finalUrl, status: finalUrl ? "complete" : doneScenes > 0 ? "in-progress" : "draft", ...overrides };
      const r = await db.save(activeUserId, payload);
      if (!projectId) setProjectId(r.id);
      loadProjects();
    } catch (e) { console.error("Save failed", e); }
  }, [projectId, projectTitle, style, mood, durOpt, blueprint, scenes, finalUrl, doneScenes, activeUserId, loadProjects]);

  // ── anchor pull ────────────────────────────────────────────
  // Scans the entire archive for a character's face and auto-populates scenes
  const handleAnchorPull = useCallback(async (char) => {
    if (!char.refImageUrl) return;
    setAnchorPullStatus(prev => ({ ...prev, [char.id]: { phase: "scanning", clipsFound: 0, scenesSet: 0, message: "Scanning archive…" } }));
    try {
      await anchorPull({
        characters: [char],
        scenes,
        threshold: 0.55,
        onStatus: (d) => {
          setAnchorPullStatus(prev => ({
            ...prev,
            [char.id]: { ...prev[char.id], phase: "scanning", message: d.message || "Scanning…" },
          }));
        },
        onClip: () => {
          setAnchorPullStatus(prev => ({
            ...prev,
            [char.id]: { ...prev[char.id], clipsFound: (prev[char.id]?.clipsFound || 0) + 1 },
          }));
        },
        onAssignment: (d) => {
          // d = { sceneId, charId, clip: { publicUrl, videoName } }
          setScenes(prev => prev.map(s =>
            String(s.id) === String(d.sceneId)
              ? { ...s, videoUrl: d.clip.publicUrl || `/media/videos/${d.clip.videoName}`, genStatus: "succeeded" }
              : s
          ));
          setAnchorPullStatus(prev => ({
            ...prev,
            [char.id]: { ...prev[char.id], scenesSet: (prev[char.id]?.scenesSet || 0) + 1 },
          }));
        },
        onDone: (d) => {
          const total = d?.totalAssignments ?? 0;
          setAnchorPullStatus(prev => ({
            ...prev,
            [char.id]: { ...prev[char.id], phase: "done", message: total > 0 ? `${total} scene${total !== 1 ? "s" : ""} populated` : "No matches found" },
          }));
          if (total > 0) toast_(`🎭 ${char.name}: ${total} scene${total !== 1 ? "s" : ""} pulled from archive`, "success");
          else           toast_(`🔍 ${char.name}: no archive matches above threshold`, "warn");
        },
        onError: (msg) => {
          setAnchorPullStatus(prev => ({ ...prev, [char.id]: { phase: "error", message: msg } }));
          toast_(`Anchor pull failed: ${msg}`, "error");
        },
      });
    } catch (e) {
      setAnchorPullStatus(prev => ({ ...prev, [char.id]: { phase: "error", message: e.message } }));
    }
  }, [scenes]);

  // ── users / profiles ───────────────────────────────────────
  const loadUsers = useCallback(async () => {
    try { 
      const r = await usersAPI.list(); 
      setUsers(r.users || []);
      if (r.users?.length > 0 && !activeUserId) setActiveUserId(r.users[0].id);
    } catch (e) { console.error("users error", e); }
  }, [activeUserId]);

  const handleCreateProfile = async () => {
    const name = prompt("Enter new profile name (e.g. Sports Channel):");
    if (name) {
      try {
        const u = await usersAPI.create(name);
        await loadUsers();
        setActiveUserId(u.id);
        toast_(`Profile "${u.name}" created!`, "success");
      } catch (e) { toast_("Failed to create profile", "error"); }
    }
  };

  // ── boot ───────────────────────────────────────────────────
  useEffect(() => {
    db.health().then(setHealth).catch(() => {});
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (activeUserId) loadProjects();
  }, [activeUserId, loadProjects]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatLog, streaming]);
  useEffect(() => { if (editTitle) titleRef.current?.focus(); }, [editTitle]);

  const toast_ = (msg, type = "success") => setToast({ msg, type });

  // ── parse Claude JSON ──────────────────────────────────────
  // Robust JSON extractor — uses balanced bracket counting to find the
  // exact first complete JSON object, regardless of trailing text or markdown.
  const extractJSON = (text) => {
    // Strip markdown fences first
    let s = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const start = s.indexOf("{");
    if (start === -1) throw new Error("No JSON object found");
    let depth = 0;
    let inStr  = false;
    let escape = false;
    for (let i = start; i < s.length; i++) {
      const c = s[i];
      if (escape)          { escape = false; continue; }
      if (c === "\\")      { escape = true;  continue; }
      if (c === '"')       { inStr = !inStr; continue; }
      if (inStr)           { continue; }
      if (c === "{")       { depth++; }
      else if (c === "}") {
        depth--;
        if (depth === 0) return JSON.parse(s.slice(start, i + 1));
      }
    }
    // Fallback: greedy match (last resort)
    const m = s.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error("Couldn't parse blueprint JSON");
  };

  const parseBlueprint = (text) => {
    return extractJSON(text);
  };


  // ── send chat ──────────────────────────────────────────────
  const handleSend = async () => {
    if (!input.trim() || streaming) return;
    const userText = input.trim();
    setInput("");
    await handleChat(userText);
  };

  // ── dedicated execute from Scriptwriter ────────────────────
  const handleExecuteScript = useCallback(async (script) => {
    if (streaming) return;
    const userText = `CREATE PRE-PRODUCTION BLUEPRINT from this screenplay:\n\n${script}`;
    toast_("📋 Analyzing screenplay — building Director's Check list...", "success");
    setTab("chat");
    await handleChat(userText);
    // Blueprint tab auto-switches inside handleChat onDone
  }, [streaming]); // eslint-disable-line

  const handleChat = async (userText) => {
    if (!userText.trim() || streaming) return;
    setStreaming(true);

    const userMsg  = { role: "user", content: userText };
    const newLog   = [...chatLog, userMsg];
    setChatLog(newLog);

    const sysPrompt = buildSystemPrompt({
      style, mood,
      duration: durOpt.label,
      sceneCount: durOpt.scenes,
      modelId: model,
      continuity,
    });

    let accumulated = "";

    await chatStream({
      messages:     newLog,
      systemPrompt: sysPrompt,
      onDelta: t  => { accumulated += t; },
      onDone:  async () => {
        setChatLog(prev => [...prev, { role: "assistant", content: accumulated }]);
        try {
          const bp = parseBlueprint(accumulated);
          setBlueprint(bp);
          setProjectTitle(bp.title || "Untitled");
          const init = bp.scenes.map(s => ({ ...s, genStatus: "idle", videoUrl: null, progressLog: "" }));
          setScenes(init);
          // Parse consistency definitions from blueprint
          if (Array.isArray(bp.characters) && bp.characters.length > 0) {
            setCharacters(bp.characters.map(c => ({ ...c, refImageUrl: null })));
          }
          if (Array.isArray(bp.locations) && bp.locations.length > 0) {
            setLocations(bp.locations);
          }
          setFinalUrl(null);
          setTab("blueprint");
          toast_(`✅ Blueprint ready — ${bp.scenes.length} scenes${bp.characters?.length ? `, ${bp.characters.length} characters` : ""}. Review Director's Checklist!`, "success");
          await saveProject({ blueprint: bp, scenes: init, title: bp.title });
        } catch (e) {
          toast_("Couldn't parse blueprint — try rephrasing your concept.", "error");
        }
        setStreaming(false);
      },
      onError: msg => { toast_(msg, "error"); setStreaming(false); },
    });
  };

  // ── AI Magic Auto-Generation Pipeline ────────────────────────
  const handleMagicGenerate = async () => {
    if (!input.trim() || streaming) return;
    const userText = input.trim();
    setInput("");
    setStreaming(true);

    const userMsg  = { role: "user", content: `[AI MAGIC MODE] ${userText}` };
    const newLog   = [...chatLog, userMsg];
    setChatLog(newLog);

    const sysPrompt = buildSystemPrompt({
      style, mood,
      duration: durOpt.label,
      sceneCount: durOpt.scenes,
      modelId: model,
    });

    let accumulated = "";

    await chatStream({
      messages:     newLog,
      systemPrompt: sysPrompt,
      onDelta: t  => { accumulated += t; },
      onDone:  async () => {
        setChatLog(prev => [...prev, { role: "assistant", content: accumulated }]);
        try {
          const bp = parseBlueprint(accumulated);
          setBlueprint(bp);
          setProjectTitle(bp.title || "Untitled");
          let initScenes = bp.scenes.map(s => ({ ...s, genStatus: "idle", videoUrl: null, progressLog: "" }));
          setScenes(initScenes);
          if (Array.isArray(bp.characters) && bp.characters.length > 0) {
            setCharacters(bp.characters.map(c => ({ ...c, refImageUrl: null })));
          }
          if (Array.isArray(bp.locations) && bp.locations.length > 0) {
            setLocations(bp.locations);
          }
          setFinalUrl(null);
          setTab("blueprint");
          toast_("Blueprint ready — starting auto-generation! ✨", "success");
          
          // Execute generation sequentially
          setActiveGens(1);
          for (let i = 0; i < initScenes.length; i++) {
             // 1. Image
             setScenes(prev => prev.map((s, idx) => idx === i ? { ...s, genStatus: "generating", progressLog: "Generating image..." } : s));
             const imgRes = await startImageGeneration({ prompt: initScenes[i].videoPrompt });
             const imgFinal = await pollUntilDone(imgRes.provider, imgRes.predictionId, (s, l) => {
               setScenes(prev => prev.map((sc, idx) => idx === i ? { ...sc, progressLog: "Image " + (l || s) } : sc));
             });
             
             // 2. Video
             setScenes(prev => prev.map((s, idx) => idx === i ? { ...s, progressLog: "Generating video..." } : s));
             const vidRes = await startGeneration({
               prompt: initScenes[i].videoPrompt,
               negativePrompt: initScenes[i].negativePrompt,
               model,
               numFrames: MODELS.find(m => m.id === model)?.numFrames || 81,
               sceneId: initScenes[i].id,
               imageUrl: imgFinal.imageUrl
             });
             const vidFinal = await pollUntilDone(vidRes.provider, vidRes.predictionId || vidRes.requestId, (s, l) => {
               setScenes(prev => prev.map((sc, idx) => idx === i ? { ...sc, progressLog: l ? l.slice(-100) : s } : sc));
             });

             setScenes(prev => prev.map((s, idx) => idx === i ? { ...s, genStatus: "succeeded", videoUrl: vidFinal.videoUrl, progressLog: "" } : s));
          }
          setActiveGens(0);
          setTab("timeline");
          toast_("AI Magic complete! ✨", "success");
          await saveProject();

        } catch (e) {
          setActiveGens(0);
          toast_("AI Magic error: " + e.message, "error");
        }
        setStreaming(false);
      },
      onError: msg => { toast_(msg, "error"); setStreaming(false); },
    });
  };

  // ── build anchored prompt (injects character + location descriptions) ──
  const buildAnchoredPrompt = useCallback((scene) => {
    const parts = [];
    // Inject character anchors
    const sceneCharIds = scene.characterIds || [];
    const sceneChars = characters.filter(c => sceneCharIds.includes(c.id));
    if (sceneChars.length > 0) {
      parts.push(sceneChars.map(c => c.anchor).join(", "));
    }
    // Inject location anchor
    if (scene.locationId) {
      const loc = locations.find(l => l.id === scene.locationId);
      if (loc) parts.push(loc.anchor);
    }
    // Append the scene's own action prompt
    parts.push(scene.videoPrompt);
    return parts.join(". ");
  }, [characters, locations]);

  // ── generate a single scene ────────────────────────────────
  const generateScene = useCallback(async (idx) => {
    const scene = scenes[idx];
    if (!scene) return;

    setScenes(prev => prev.map((s, i) => i === idx ? { ...s, genStatus: "generating", progressLog: "Starting…" } : s));
    setActiveGens(n => n + 1);

    try {
      // Build consistency-anchored prompt
      const anchoredPrompt = buildAnchoredPrompt(scene);

      // Find reference image from first assigned character (for I2V)
      const sceneCharIds = scene.characterIds || [];
      const charWithImage = characters.find(c => sceneCharIds.includes(c.id) && c.refImageUrl);
      const imageUrl = charWithImage?.refImageUrl || null;

      const result = await startGeneration({
        prompt:         anchoredPrompt,
        negativePrompt: scene.negativePrompt,
        model,
        numFrames:      modelInfo.numFrames,
        sceneId:        scene.id,
        imageUrl,       // triggers I2V on server when provided
      });

      if (result.error) throw new Error(result.error);

      const provider = result.provider;
      const pollId   = result.predictionId || result.requestId;

      const final = await pollUntilDone(provider, pollId, (status, logs) => {
        setScenes(prev => prev.map((s, i) => i === idx
          ? { ...s, progressLog: logs ? logs.slice(-200) : status }
          : s));
      });

      let videoUrl = final.videoUrl;

      // ── PRODUCTION PIPELINE: TTS + COMPOSE ──────────────────────
      // If there's narration, generate audio and merge it
      if (scene.narration) {
        setScenes(prev => prev.map((s, i) => i === idx ? { ...s, progressLog: "Generating narration audio..." } : s));
        try {
          // 1. Generate TTS
          const ttsRes = await fetch("/api/tts", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: scene.narration, voice: "neutral" })
          });
          const ttsData = await ttsRes.json();
          if (ttsData.audioFile) {
            setScenes(prev => prev.map((s, i) => i === idx ? { ...s, progressLog: "Composing final scene (speech + music)..." } : s));
            // 2. Compose video + audio + subtitles + music
            const composeRes = await fetch("/api/compose-scene", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                videoFile: videoUrl.split("/").pop(),
                narrationAudio: ttsData.audioFile,
                narrationText: scene.narration,
                durationSec: scene.durationSec,
                sceneTitle: scene.title
              })
            });
            const composeData = await composeRes.json();
            if (composeData.composedUrl) {
              videoUrl = composeData.composedUrl;
            }
          }
        } catch (composeErr) {
          console.error("Compose failed, falling back to raw video:", composeErr);
        }
      }

      setScenes(prev => prev.map((s, i) => i === idx
        ? { ...s, genStatus: "succeeded", videoUrl, progressLog: "" }
        : s));
      toast_(`Scene ${idx + 1} ready ✓`, "success");
    } catch (err) {
      setScenes(prev => prev.map((s, i) => i === idx
        ? { ...s, genStatus: "failed", progressLog: err.message }
        : s));
      toast_(`Scene ${idx + 1} failed: ${err.message}`, "error");
    } finally {
      setActiveGens(n => n - 1);
      saveProject();
    }
  }, [scenes, model, modelInfo, saveProject, buildAnchoredPrompt, characters]);

  // ── generate all (sequential) ──────────────────────────────
  const generateAll = async () => {
    setGenAllBusy(true);
    for (let i = 0; i < scenes.length; i++) {
      if (scenes[i].genStatus !== "succeeded") await generateScene(i);
    }
    setGenAllBusy(false);
    if (scenes.filter(s => s.genStatus === "succeeded").length >= 2) setTab("timeline");
  };

  // ── photo repo ─────────────────────────────────────────────
  const openPhotoPicker = async (idx) => {
    setPhotoPickerIdx(idx);
    if (photoLibrary.length === 0) {
      setPhotoLoading(true);
      try {
        const { photos } = await listPhotos();
        setPhotoLibrary(photos || []);
      } catch (e) { toast_("Could not load photo library: " + e.message, "error"); }
      setPhotoLoading(false);
    }
  };

  // Upload photos from browser into photo-repo/ and refresh the library
  const handlePhotoUpload = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    setPhotoUploading(true);
    try {
      const { photos, saved } = await uploadPhotos(fileList);
      setPhotoLibrary(photos || []);
      toast_(`${saved.length} photo${saved.length !== 1 ? "s" : ""} added to library ✓`, "success");
    } catch (e) {
      toast_("Photo upload failed: " + e.message, "error");
    } finally {
      setPhotoUploading(false);
    }
  };

  const applyPhoto = async (photoFile) => {
    const idx = photoPickerIdx;
    setPhotoPickerIdx(null);
    setPhotoBusyIdx(idx);
    const scene = scenes[idx];
    const dur = scene?.durationSec || 5;
    setScenes(prev => prev.map((s, i) => i === idx
      ? { ...s, genStatus: "generating", progressLog: "Rendering Ken Burns effect…", photoFile }
      : s));
    try {
      const { videoUrl } = await kenBurns({ photoFile, cameraMove: pickerMove, durationSec: dur });
      setScenes(prev => prev.map((s, i) => i === idx
        ? { ...s, genStatus: "succeeded", videoUrl, progressLog: "", photoFile }
        : s));
      toast_(`Scene ${idx + 1} photo applied ✓`, "success");
      saveProject();
    } catch (e) {
      setScenes(prev => prev.map((s, i) => i === idx
        ? { ...s, genStatus: "failed", progressLog: e.message, photoFile }
        : s));
      toast_(`Scene ${idx + 1} photo failed: ${e.message}`, "error");
    } finally {
      setPhotoBusyIdx(null);
    }
  };

  // ── stitch final video ─────────────────────────────────────
  const handleStitch = async () => {
    const ready = scenes.filter(s => s.videoUrl);
    if (ready.length < 2) { toast_("Need at least 2 generated scenes", "warn"); return; }
    setStitchBusy(true);
    try {
      const { videoUrl } = await stitchScenes({ sceneFiles: ready.map(s => s.videoUrl), projectTitle });
      setFinalUrl(videoUrl);
      toast_("Final video ready 🎬", "success");
      await saveProject({ finalUrl: videoUrl });
    } catch (e) { toast_("Stitch failed: " + e.message, "error"); }
    setStitchBusy(false);
  };

  // ── admin media actions ────────────────────────────────────────
  const handleInjectAdminVideo = (url, filename) => {
    const newScene = {
      id: "admin-" + Date.now(),
      title: filename,
      shotType: "Admin Media",
      cameraMove: "Original",
      durationSec: 5,
      genStatus: "succeeded",
      videoUrl: url,
      progressLog: "",
      videoPrompt: `Injected from Admin Panel: ${filename}`,
      negativePrompt: "",
    };
    setScenes(prev => [...prev, newScene]);
    toast_("Admin Video added to Timeline ✓", "success");
    saveProject({ scenes: [...scenes, newScene] });
  };

  // ── youtube actions ────────────────────────────────────────
  const handleYtSearch = async (e) => {
    e?.preventDefault();
    if (!ytQuery.trim()) return;
    setYtSearching(true);
    try {
      const { videos } = await searchYoutube(ytQuery);
      setYtResults(videos);
    } catch (e) { toast_("Search failed: " + e.message, "error"); }
    setYtSearching(false);
  };

  const handleYtDownload = async (v, isTrim) => {
    setYtDownloading(v.videoId);
    try {
      if (isTrim) {
        const { videoUrl } = await downloadYoutube(v.url, ytTrimStart, ytTrimDuration);
        const newScene = {
          id: "yt-" + Date.now(),
          title: v.title,
          shotType: "YouTube Pull",
          cameraMove: "Original",
          durationSec: ytTrimDuration,
          genStatus: "succeeded",
          videoUrl: videoUrl,
          progressLog: "",
          videoPrompt: `Pulled from YouTube: ${v.title}`,
          negativePrompt: "",
        };
        setScenes(prev => [...prev, newScene]);
        toast_("YouTube clip added to Timeline ✓", "success");
        saveProject({ scenes: [...scenes, newScene] });
      } else {
        await downloadYoutube(v.url);
        toast_("Full Video downloaded to Admin Panel ✓", "success");
      }
    } catch (e) {
      toast_("Failed to process YouTube clip: " + e.message, "error");
    }
    setYtDownloading(null);
  };

  // ── load project ───────────────────────────────────────────
  const loadProject = async (id) => {
    try {
      const p = await db.load(activeUserId, id);
      setProjectId(p.id);
      setProjectTitle(p.title || "Untitled");
      setStyle(p.style || "cinematic");
      setMood(p.mood || "Epic");
      const dIdx = DURATION_OPTIONS.findIndex(d => d.label === p.duration);
      if (dIdx >= 0) setDurIdx(dIdx);
      setBlueprint(p.blueprint);
      setScenes(p.scenes || []);
      setFinalUrl(p.finalUrl);
      setShowLibrary(false);
      setTab(p.scenes?.length ? "blueprint" : "chat");
      toast_(`Loaded "${p.title}"`);
    } catch { toast_("Failed to load project", "error"); }
  };

  const newProject = () => {
    if (scenes.length && !confirm("Start a new project?")) return;
    setProjectId(null); setProjectTitle("Untitled"); setBlueprint(null);
    setScenes([]); setFinalUrl(null); setChatLog([]); setTab("chat");
    setCharacters([]); setLocations([]);
  };

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: C.bg, color: C.text }}>

      {/* ── Top bar ───────────────────────────────────────────── */}
      <header style={{ height: 50, display: "flex", alignItems: "center", padding: "0 16px", gap: 12, background: C.s1, borderBottom: `1px solid ${C.b1}`, flexShrink: 0, zIndex: 100 }}>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: `linear-gradient(135deg, ${C.accent}30, ${C.blue}30)`, border: `1px solid ${C.accent}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: C.accent }}>
            ▶
          </div>
          <div>
            <div style={{ fontFamily: "var(--display)", fontSize: 17, letterSpacing: ".1em", color: C.text, lineHeight: 1 }}>FRAMEGEN</div>
            {/* Profile Selector */}
            <div style={{ marginLeft: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <select 
                value={activeUserId || ""} 
                onChange={(e) => {
                  setActiveUserId(e.target.value);
                  setProjectId(null); setProjectTitle("Untitled"); setBlueprint(null); setScenes([]);
                }}
                style={{ background: C.s3, color: C.text, border: `1px solid ${C.b3}`, borderRadius: 4, padding: "2px 8px", fontSize: 12, outline: "none" }}
              >
                {users.length === 0 && <option value="">No profiles...</option>}
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <Btn size="sm" variant="ghost" onClick={handleCreateProfile} style={{ padding: "2px 6px", fontSize: 11 }}>+ New</Btn>
            </div>
            <div style={{ fontSize: 8, color: C.t4, letterSpacing: ".2em" }}>CHAT TO VIDEO</div>
          </div>
        </div>

        {/* Title */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 6 }}>
          {editTitle
            ? <input ref={titleRef} value={projectTitle} onChange={e => setProjectTitle(e.target.value)} onBlur={() => setEditTitle(false)} onKeyDown={e => e.key === "Enter" && setEditTitle(false)} style={{ background: C.s3, border: `1px solid ${C.b2}`, borderRadius: 5, color: C.text, padding: "4px 9px", fontSize: 12, outline: "none", width: 200 }} />
            : <span onClick={() => setEditTitle(true)} style={{ fontSize: 12, color: C.t2, cursor: "text", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>{projectTitle}</span>
          }
          {scenes.length > 0 && (
            <span style={{ fontSize: 10, color: C.t4 }}>{doneScenes}/{scenes.length} scenes</span>
          )}
        </div>

        {/* Status pills */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {health && !health.anthropic  && <Badge color={C.red}>No Claude key</Badge>}
          {health && !health.replicate && !health.fal && <Badge color={C.orange}>No Video API</Badge>}
          {activeGens > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.blue }}>
              <Spin size={11} /> {activeGens} generating
            </div>
          )}
          {blueprint && <Btn size="sm" variant="secondary" onClick={() => saveProject()}>💾 Save</Btn>}
          <Btn size="sm" variant="ghost" title="Projects" onClick={() => { setShowLibrary(l => !l); loadProjects(); }}>📂</Btn>
          <Btn size="sm" variant="ghost" title="New project" onClick={newProject}>＋</Btn>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── Sidebar ─────────────────────────────────────────── */}
        <aside style={{ width: sidebarOpen ? 240 : 0, minWidth: 0, background: C.s1, borderRight: `1px solid ${sidebarOpen ? C.b1 : "transparent"}`, overflowY: sidebarOpen ? "auto" : "hidden", overflowX: "hidden", display: "flex", flexDirection: "column", gap: 0, transition: "width .25s ease", flexShrink: 0 }}>
          <div style={{ padding: "14px 14px 20px", display: "flex", flexDirection: "column", gap: 18 }}>

            {/* Model picker */}
            <section>
              <div style={sectionTitle}>Video Model</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {MODELS.map(m => (
                  <button key={m.id} onClick={() => setModel(m.id)} style={{
                    display: "flex", alignItems: "flex-start", gap: 9,
                    padding: "8px 10px", borderRadius: 7, cursor: "pointer", textAlign: "left",
                    background: model === m.id ? C.s3 : "transparent",
                    border: `1px solid ${model === m.id ? C.b3 : "transparent"}`,
                    transition: "all .15s",
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: model === m.id ? C.text : C.t3 }}>{m.name}</span>
                        <Badge color={m.badgeColor}>{m.badge}</Badge>
                        {m.local && (
                          <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3,
                            background: localOnline ? C.green + "22" : C.red + "22",
                            color: localOnline ? C.green : C.red,
                            border: `1px solid ${localOnline ? C.green : C.red}44` }}>
                            {localOnline ? "● ONLINE" : "○ OFFLINE"}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 10, color: C.t4, lineHeight: 1.5 }}>{m.cost} · {m.time}</div>
                      {m.local && !localOnline && model === m.id && (
                        <div style={{ fontSize: 10, color: C.orange, marginTop: 3, lineHeight: 1.5 }}>
                          Start: <code style={{ background: C.s4, padding: "0 4px", borderRadius: 3 }}>cd local-inference && ./start.sh</code>
                        </div>
                      )}
                    </div>
                    {model === m.id && <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.accent, marginTop: 5, flexShrink: 0 }} />}
                  </button>
                ))}
              </div>
            </section>

            {/* Style picker */}
            <section>
              <div style={sectionTitle}>Visual Style</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                {STYLES.map(s => (
                  <button key={s.id} onClick={() => setStyle(s.id)} title={s.hint} style={{
                    padding: "6px 8px", borderRadius: 6, cursor: "pointer", textAlign: "center",
                    background: style === s.id ? s.color + "18" : "transparent",
                    border: `1px solid ${style === s.id ? s.color + "55" : C.b1}`,
                    fontSize: 11, color: style === s.id ? s.color : C.t3, transition: "all .15s",
                  }}>
                    {s.emoji} {s.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Mood */}
            <section>
              <div style={sectionTitle}>Mood</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {MOODS.map(m => (
                  <button key={m} onClick={() => setMood(m)} style={{
                    padding: "4px 9px", borderRadius: 14, cursor: "pointer",
                    background: mood === m ? C.accent + "22" : "transparent",
                    border: `1px solid ${mood === m ? C.accent + "55" : C.b1}`,
                    fontSize: 10, color: mood === m ? C.accent : C.t4, transition: "all .15s",
                  }}>{m}</button>
                ))}
              </div>
            </section>

            {/* Duration */}
            <section>
              <div style={sectionTitle}>Target Duration</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {DURATION_OPTIONS.map((d, i) => (
                  <button key={d.label} onClick={() => setDurIdx(i)} style={{
                    padding: "5px 10px", borderRadius: 6, cursor: "pointer",
                    background: durIdx === i ? C.s4 : "transparent",
                    border: `1px solid ${durIdx === i ? C.b3 : C.b1}`,
                    fontSize: 11, fontFamily: "var(--mono)", color: durIdx === i ? C.text : C.t4,
                  }}>{d.label}</button>
                ))}
              </div>
              <div style={{ fontSize: 10, color: C.t4, marginTop: 5 }}>{durOpt.scenes} scenes · {durOpt.label}</div>
            </section>

            {/* Cost estimate */}
            {scenes.length > 0 && (
              <section style={{ padding: 10, background: C.bg, borderRadius: 7, border: `1px solid ${C.b1}` }}>
                <div style={sectionTitle}>Est. Cost</div>
                <div style={{ fontSize: 16, color: C.green, fontFamily: "var(--mono)" }}>
                  ~${totalCost.toFixed(2)}
                </div>
                <div style={{ fontSize: 9, color: C.t4, marginTop: 3 }}>Replicate · open-source models</div>
              </section>
            )}
          </div>
        </aside>

        {/* ── Main panel ───────────────────────────────────────── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* ── Tab bar: 4 primary + ⋯ More ──────────────────────── */}
          <div style={{ height: 42, display: "flex", alignItems: "center", padding: "0 10px", gap: 2, background: C.s1, borderBottom: `1px solid ${C.b1}`, flexShrink: 0, overflowX: "auto" }}>

            {/* Sidebar ⇤ toggle */}
            <button onClick={() => setSidebarOpen(o => !o)}
              title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
              style={{ padding: "4px 8px", border: `1px solid ${C.b1}`, borderRadius: 5, background: "transparent", color: C.t3, fontSize: 13, cursor: "pointer", marginRight: 4, flexShrink: 0 }}>
              {sidebarOpen ? "⇤" : "⇥"}
            </button>

            {/* Primary 4 */}
            {[
              ["home",    "🏠 Home"],
              ["syllabus","🎓 Syllabus"],
              ["chat",    "🎬 Studio"],
              ["produce", `🎙 Produce${doneScenes ? ` (${doneScenes})` : ""}`],
            ].map(([t, label]) => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: "6px 14px", border: "none",
                borderBottom: `2px solid ${tab === t ? C.accent : "transparent"}`,
                background: "transparent", color: tab === t ? C.text : C.t3,
                fontSize: 12, cursor: "pointer", fontFamily: "var(--sans)", whiteSpace: "nowrap",
              }}>{label}</button>
            ))}

            {/* ⋯ More */}
            <button onClick={() => setAdvTabs(p => !p)}
              style={{ padding: "4px 8px", border: `1px solid ${advTabs ? C.accent + "55" : C.b1}`, borderRadius: 5,
                background: advTabs ? `${C.accent}12` : "transparent", color: advTabs ? C.accent : C.t3,
                fontSize: 10, cursor: "pointer", marginLeft: 4, whiteSpace: "nowrap" }}>
              {advTabs ? "▾ Close" : "⋯ More"}
            </button>

            {/* Advanced tabs revealed */}
            {advTabs && [
              ["blueprint",    `📋 Blueprint${scenes.length ? ` (${scenes.length})` : ""}`],
              ["timeline",     `🎬 Timeline${doneScenes ? ` (${doneScenes}✓)` : ""}`],
              ["scriptwriter", "📝 Script"],
              ["crucible",     "🧪 Crucible"],
              ["youtube",      "📺 YouTube"],
              ["admin",        "📁 Admin"],
              ["archive",      "🎭 Archive"],
              ["credits",      "💳 Credits"],
            ].map(([t, label]) => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: "5px 11px", border: "none",
                borderBottom: `2px solid ${tab === t ? C.purple : "transparent"}`,
                background: "transparent", color: tab === t ? C.text : C.t3,
                fontSize: 11, cursor: "pointer", fontFamily: "var(--sans)", whiteSpace: "nowrap",
              }}>{label}</button>
            ))}

            {/* Right-side actions */}
            <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexShrink: 0 }}>
              {tab === "blueprint" && scenes.length > 0 && (
                <Btn size="sm" onClick={() => {
                  if (characters.length > 0 && !characters.every(c => c.refImageUrl)) {
                    toast_("Tip: Add reference photos to characters for Image-to-Video consistency. Generating without them (text-to-video).", "info");
                  }
                  generateAll();
                }} disabled={genAllBusy || streaming}
                  style={{ background: "linear-gradient(135deg, #10a36b, #0b7a4f)", color: "#fff", border: "none", fontWeight: 700, padding: "0 16px" }}
                  icon={genAllBusy ? <Spin size={11} /> : <span>🎬</span>}>
                  {genAllBusy
                    ? "Executing Filming..."
                    : `FINAL: MAKE MOVIE`}
                </Btn>
              )}
              {tab === "timeline" && doneScenes >= 2 && (
                <Btn size="sm" variant="green" onClick={handleStitch} disabled={stitchBusy}
                  icon={stitchBusy ? <Spin size={11} /> : <span>✂</span>}>
                  {stitchBusy ? "Stitching…" : `Stitch Final MP4`}
                </Btn>
              )}
            </div>
          </div>

          {/* ── TAB: CHAT ─────────────────────────────────────── */}
          {/* ── HOME: Mode Picker ───────────────────────────────── */}
          {tab === "home" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, gap: 32, overflowY: "auto" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: C.text, marginBottom: 8, letterSpacing: "-0.5px" }}>What do you want to make today?</div>
                <div style={{ fontSize: 14, color: C.t3 }}>Choose your creative mode to get started</div>
              </div>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center", maxWidth: 860 }}>
                {[
                  {
                    id: "syllabus", icon: "🎓", label: "Syllabus Studio", color: "#6c63ff",
                    desc: "Turn any ICSE Physics, Chemistry, Biology or Maths chapter into an animated edutainment video. Whiteboard, sketch or 3D render styles.",
                    cta: "Start with Curriculum →",
                  },
                  {
                    id: "chat", icon: "🎬", label: "Studio Mode", color: C.accent,
                    desc: "Describe your concept and Claude builds a full multi-scene blueprint. Generate each clip, stitch a film, add narration and music.",
                    cta: "Open Studio →",
                  },
                  {
                    id: "chat", icon: "⚡", label: "Quick Video", color: "#f59e0b",
                    desc: "One prompt, one 30-second video. Model picks the best settings automatically. Download in under 3 minutes.",
                    cta: "Quick Generate →",
                  },
                ].map(m => (
                  <button key={m.id + m.label} onClick={() => setTab(m.id)}
                    style={{ width: 240, padding: "28px 24px", borderRadius: 16, border: `1.5px solid ${m.color}33`,
                      background: `linear-gradient(160deg, ${m.color}0a, ${m.color}18)`,
                      cursor: "pointer", textAlign: "left", transition: "all .2s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = `0 12px 32px ${m.color}25`; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>{m.icon}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 8 }}>{m.label}</div>
                    <div style={{ fontSize: 12, color: C.t3, lineHeight: 1.6, marginBottom: 16 }}>{m.desc}</div>
                    <div style={{ fontSize: 12, color: m.color, fontWeight: 600 }}>{m.cta}</div>
                  </button>
                ))}
              </div>
              {projects.length > 0 && (
                <div style={{ width: "100%", maxWidth: 860 }}>
                  <div style={{ fontSize: 12, color: C.t3, fontWeight: 600, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>Recent Projects</div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {projects.slice(0, 6).map(p => (
                      <button key={p.id} onClick={() => loadProject(p.id)}
                        style={{ padding: "10px 16px", borderRadius: 10, border: `1px solid ${C.b1}`, background: C.s2,
                          cursor: "pointer", fontSize: 12, color: C.t2, textAlign: "left", maxWidth: 180 }}>
                        <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title || "Untitled"}</div>
                        <div style={{ color: C.t4, fontSize: 10, marginTop: 3 }}>{p.sceneCount} scenes</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "admin" && (
            <div style={{ padding: 20, height: "100%", overflowY: "auto", overflowX: "hidden" }}>
              <AdminPanel onInjectToTimeline={handleInjectAdminVideo} toast_={toast_} />
            </div>
          )}
          {tab === "syllabus" && (
            <div style={{ flex: 1, overflow: "hidden", minHeight: 0, display: "flex", flexDirection: "column" }}>
              <SyllabusStudio
                onSendToFramegen={(bp) => {
                  // Load the generated blueprint and switch to Blueprint tab
                  const init = bp.scenes.map(s => ({ ...s, genStatus: "idle", videoUrl: null, progressLog: "" }));
                  setBlueprint(bp);
                  setScenes(init);
                  setTab("blueprint");
                }}
              />
            </div>
          )}
          {tab === "produce" && (
            <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
              <ProducerPanel
                blueprint={blueprint}
                sceneVideoFiles={scenes.map(s => s.videoUrl || null)}
              />
            </div>
          )}
          {tab === "chat" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {/* Messages */}
              <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
                {chatLog.length === 0 ? (
                  <div className="fade-in" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 20 }}>
                    <div style={{ width: 64, height: 64, borderRadius: 16, background: `linear-gradient(135deg, ${C.accent}18, ${C.blue}18)`, border: `1px solid ${C.accent}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: C.accent }}>▶</div>
                    <div style={{ textAlign: "center", maxWidth: 440 }}>
                      <div style={{ fontFamily: "var(--display)", fontSize: 28, letterSpacing: ".1em", marginBottom: 8 }}>DESCRIBE YOUR VIDEO</div>
                      <div style={{ fontSize: 13, color: C.t2, lineHeight: 1.7 }}>
                        Tell me your concept — a feeling, a story, a product, a dream sequence. Claude will build a full production blueprint, then you generate each scene with open-source AI video models.
                      </div>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 500 }}>
                      {[
                        "Ancient sage boy maps the stars — origin of Vedic astrology",
                        "A lone astronaut finds a garden on Mars",
                        "Brand film for a sustainable sneaker launch",
                        "Music video — rainy neon city, lost love",
                        "Short documentary on deep sea bioluminescence",
                      ].map(ex => (
                        <button key={ex} onClick={() => setInput(ex)} style={{
                          padding: "7px 14px", background: "none", border: `1px solid ${C.b2}`,
                          borderRadius: 20, fontSize: 11, color: C.t3, cursor: "pointer",
                          fontFamily: "var(--sans)", transition: "border-color .15s",
                        }}>{ex}</button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ maxWidth: 700, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>
                    {chatLog.map((m, i) => (
                      <div key={i} className="fade-up" style={{ display: "flex", gap: 10, justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                        {m.role === "assistant" && (
                          <div style={{ width: 28, height: 28, flexShrink: 0, borderRadius: 6, background: C.s3, border: `1px solid ${C.b2}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: C.accent, marginTop: 2 }}>▶</div>
                        )}
                        <div style={{
                          maxWidth: "84%", padding: "10px 14px",
                          borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "4px 14px 14px 14px",
                          background: m.role === "user" ? C.s3 : C.s2,
                          border: `1px solid ${C.b1}`,
                          fontSize: 13, lineHeight: 1.7,
                          color: m.role === "user" ? C.text : C.t2,
                        }}>
                          {m.role === "assistant" ? (
                            blueprint ? (
                              <div>
                                <div style={{ color: C.green, fontSize: 12, marginBottom: 6 }}>✓ Blueprint generated</div>
                                <div style={{ fontFamily: "var(--mono)", fontSize: 11 }}>
                                  <b style={{ color: C.text }}>{blueprint.title}</b><br />
                                  <span style={{ color: C.t3 }}>{blueprint.logline}</span><br />
                                  <span style={{ color: C.t4 }}>{blueprint.scenes?.length} scenes · {durOpt.label}</span>
                                </div>
                                <button onClick={() => setTab("blueprint")} style={{ marginTop: 10, padding: "5px 12px", background: C.s4, border: `1px solid ${C.accent}44`, borderRadius: 6, color: C.accent, fontSize: 11, cursor: "pointer", fontFamily: "var(--sans)" }}>
                                  View Blueprint →
                                </button>
                              </div>
                            ) : m.content
                          ) : m.content}
                        </div>
                      </div>
                    ))}
                    {streaming && (
                      <div className="fade-up" style={{ display: "flex", gap: 10 }}>
                        <div style={{ width: 28, height: 28, flexShrink: 0, borderRadius: 6, background: C.s3, border: `1px solid ${C.b2}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Spin size={12} />
                        </div>
                        <div style={{ padding: "10px 14px", background: C.s2, border: `1px solid ${C.b1}`, borderRadius: "4px 14px 14px 14px", fontSize: 12, color: C.t4 }}>
                          Building blueprint…
                        </div>
                      </div>
                    )}
                    <div ref={bottomRef} />
                  </div>
                )}
              </div>

              {/* Quick refine chips (shows after blueprint) */}
              {blueprint && (
                <div style={{ padding: "6px 24px", borderTop: `1px solid ${C.b1}`, display: "flex", gap: 6, overflowX: "auto" }}>
                  {QUICK_REFINES.map(r => (
                    <button key={r} onClick={() => { setInput(r); setTimeout(() => inputRef.current?.focus(), 50); }} style={{
                      padding: "4px 11px", background: "none", border: `1px solid ${C.b1}`,
                      borderRadius: 14, fontSize: 10, color: C.t4, cursor: "pointer",
                      fontFamily: "var(--sans)", whiteSpace: "nowrap",
                    }}>{r}</button>
                  ))}
                </div>
              )}

              {/* Continuity bar — feature film chapter mode */}
              <ContinuityBar continuity={continuity} onContinuityChange={setContinuity} />

              {/* Input */}
              <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.b1}`, background: C.s1, flexShrink: 0 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder={blueprint ? "Refine your blueprint… (Enter to generate)" : "Describe your video concept… (Enter to generate)"}
                    rows={2}
                    style={{ flex: 1, background: C.s3, border: `1px solid ${C.b2}`, borderRadius: 9, color: C.text, padding: "10px 14px", fontSize: 13, lineHeight: 1.6, resize: "none", outline: "none" }}
                  />
                  <button onClick={handleSend} disabled={streaming || !input.trim()} style={{
                    padding: "10px 20px", background: C.accent, border: "none",
                    borderRadius: 9, color: "#111", fontSize: 13, fontWeight: 600,
                    cursor: streaming || !input.trim() ? "not-allowed" : "pointer",
                    opacity: streaming || !input.trim() ? .4 : 1,
                    fontFamily: "var(--sans)", whiteSpace: "nowrap",
                  }}>Generate ▶</button>
                  <button onClick={handleMagicGenerate} disabled={streaming || !input.trim()} title="Auto-generate script, high-res photos, and video sequentially" style={{
                    padding: "10px 20px", background: `linear-gradient(135deg, ${C.accent}, ${C.green})`, border: "none",
                    borderRadius: 9, color: "#111", fontSize: 13, fontWeight: 600,
                    cursor: streaming || !input.trim() ? "not-allowed" : "pointer",
                    opacity: streaming || !input.trim() ? .4 : 1,
                    fontFamily: "var(--sans)", whiteSpace: "nowrap",
                    boxShadow: "0 4px 15px rgba(77, 255, 158, 0.2)"
                  }}>✨ AI Magic</button>
                </div>
                <div style={{ marginTop: 6, fontSize: 10, color: C.t4, display: "flex", gap: 8 }}>
                  <span>{styleInfo.emoji} {styleInfo.label}</span>
                  <span>·</span><span>{mood}</span>
                  <span>·</span><span>{durOpt.label}</span>
                  <span>·</span><span>{modelInfo.name}</span>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: YOUTUBE ──────────────────────────────────── */}
          {tab === "youtube" && (
            <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
              <div style={{ maxWidth: 780, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
                <div style={{ padding: "20px", background: C.s2, borderRadius: 10, border: `1px solid ${C.b2}` }}>
                  <h3 style={{ margin: "0 0 10px 0", fontSize: 16 }}>Search YouTube</h3>
                  <form onSubmit={handleYtSearch} style={{ display: "flex", gap: 10 }}>
                    <input
                      value={ytQuery} onChange={e => setYtQuery(e.target.value)}
                      placeholder="e.g. 1983 cricket match top moments"
                      style={{ flex: 1, padding: "10px", borderRadius: 6, background: C.s1, border: `1px solid ${C.b3}`, color: C.text, outline: "none" }}
                    />
                    <Btn type="submit" disabled={ytSearching || !ytQuery.trim()}>{ytSearching ? "Searching..." : "Search"}</Btn>
                  </form>
                  <div style={{ display: "flex", gap: 15, marginTop: 15, alignItems: "center" }}>
                    <div style={{ fontSize: 13, color: C.t3 }}>Trim settings (applied on download):</div>
                    <label style={{ fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}>Start (s): <input type="number" min="0" value={ytTrimStart} onChange={e => setYtTrimStart(Number(e.target.value))} style={{ width: 60, background: C.s1, color: C.text, border: `1px solid ${C.b3}`, padding: "4px" }} /></label>
                    <label style={{ fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}>Duration (s): <input type="number" min="1" max="60" value={ytTrimDuration} onChange={e => setYtTrimDuration(Number(e.target.value))} style={{ width: 60, background: C.s1, color: C.text, border: `1px solid ${C.b3}`, padding: "4px" }} /></label>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 15 }}>
                  {ytResults.map(v => (
                    <div key={v.videoId} style={{ background: C.s2, borderRadius: 8, overflow: "hidden", border: `1px solid ${C.b1}` }}>
                      <img src={v.thumb} alt={v.title} style={{ width: "100%", height: 120, objectFit: "cover" }} />
                      <div style={{ padding: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", height: 32 }}>{v.title}</div>
                        <div style={{ fontSize: 10, color: C.t4, marginTop: 4 }}>{v.author} · {v.duration}</div>
                        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                          <Btn size="sm" onClick={() => handleYtDownload(v, true)} disabled={ytDownloading === v.videoId} style={{ flex: 1, justifyContent: "center", fontSize: 11, padding: "6px 4px" }}>
                            {ytDownloading === v.videoId ? "..." : "⬇ Trim & Inject"}
                          </Btn>
                          <Btn size="sm" variant="ghost" onClick={() => handleYtDownload(v, false)} disabled={ytDownloading === v.videoId} style={{ flex: 1, justifyContent: "center", fontSize: 11, padding: "6px 4px", border: `1px solid ${C.b3}` }}>
                            ⬇ Full DL
                          </Btn>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: BLUEPRINT ────────────────────────────────── */}
          {tab === "blueprint" && (
            <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
              {!blueprint ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, color: C.t4 }}>
                  <span style={{ fontSize: 36 }}>📋</span>
                  <div>No blueprint yet — describe your video in the Chat tab</div>
                  <Btn size="sm" onClick={() => setTab("chat")}>Go to Chat</Btn>
                </div>
              ) : (
                <div style={{ maxWidth: 780, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }} className="fade-in">

                  {/* Project meta card */}
                  <div style={{ padding: 18, background: C.s2, border: `1px solid ${C.b2}`, borderRadius: 12 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                      <div>
                        <div style={{ fontFamily: "var(--display)", fontSize: 22, letterSpacing: ".08em", marginBottom: 4 }}>{blueprint.title}</div>
                        <div style={{ fontSize: 13, color: C.t2 }}>{blueprint.logline}</div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end", flexShrink: 0 }}>
                        <Badge color={styleInfo.color}>{styleInfo.emoji} {styleInfo.label}</Badge>
                        <Badge color={C.t2}>{mood}</Badge>
                        <Badge color={C.t3}>{durOpt.label}</Badge>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <div>
                        <div style={sectionTitle}>Global Tone</div>
                        <div style={{ fontSize: 12, color: C.t2 }}>{blueprint.globalTone || "Not specified by Scriptwriter"}</div>
                      </div>
                      <div>
                        <div style={sectionTitle}>Target Length</div>
                        <div style={{ fontSize: 12, color: C.t2 }}>{blueprint.targetLength || "Not specified by Scriptwriter"}</div>
                      </div>
                      <div>
                        <div style={sectionTitle}>Colour Grade</div>
                        <div style={{ fontSize: 12, color: C.t2 }}>{blueprint.colorGrade}</div>
                      </div>
                      <div>
                        <div style={sectionTitle}>Soundtrack</div>
                        <div style={{ fontSize: 12, color: C.t2 }}>{blueprint.soundtrack}</div>
                      </div>
                    </div>
                  </div>

                  {/* ── Director's Pre-Production Checklist ─────────────────────── */}
                  {(characters.length > 0 || locations.length > 0) && (
                  <div style={{ padding: 16, background: C.s2, border: `1px solid ${characters.every(c => c.refImageUrl) ? C.green : C.orange}44`, borderRadius: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                        <span style={{ fontSize: 14 }}>📋</span>
                        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase", color: characters.every(c => c.refImageUrl) ? C.green : C.orange }}>
                          Director's Pre-Production Checklist
                        </span>
                        <span style={{ fontSize: 10, color: C.t4, marginLeft: 4 }}>— optional: add reference photos for Image-to-Video consistency</span>
                      </div>
                      
                      {characters.length > 0 && !characters.every(c => c.refImageUrl) && (
                        <div style={{ marginBottom: 16, padding: "8px 12px", background: `${C.orange}11`, color: C.orange, borderRadius: 6, fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
                          <span>💡</span>
                          <span><strong>Optional:</strong> Upload reference images below to enable Image-to-Video mode for character consistency. Without them, scenes generate as text-to-video (still works great!).</span>
                        </div>
                      )}

                      {/* Characters */}
                      {characters.length > 0 && (
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", color: C.t3, marginBottom: 8 }}>Characters</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                            {characters.map((char, ci) => (
                              <div key={char.id} style={{
                                background: C.s3, border: `1px solid ${C.blue}44`, borderRadius: 10,
                                padding: 12, width: 220, flexShrink: 0,
                              }}>
                                {/* Ref image area */}
                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                                  <div
                                    onClick={() => { refInputRef.current._charId = char.id; refInputRef.current.click(); }}
                                    style={{
                                      width: 48, height: 48, borderRadius: 8, flexShrink: 0,
                                      background: C.s4, border: `2px dashed ${char.refImageUrl ? C.blue : C.b3}`,
                                      cursor: "pointer", overflow: "hidden",
                                      display: "flex", alignItems: "center", justifyContent: "center",
                                      position: "relative",
                                    }}
                                    title="Upload reference photo for I2V consistency"
                                  >
                                    {char.refImageUrl
                                      ? <img src={char.refImageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                                      : refUploading === char.id
                                        ? <div style={{ width: 14, height: 14, border: `2px solid ${C.b3}`, borderTopColor: C.blue, borderRadius: "50%", animation: "spin .7s linear infinite" }} />
                                        : <span style={{ fontSize: 18, color: C.t4 }}>📷</span>
                                    }
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <input
                                      value={char.name}
                                      onChange={e => setCharacters(prev => prev.map((c, i) => i === ci ? { ...c, name: e.target.value } : c))}
                                      style={{ width: "100%", background: "none", border: "none", borderBottom: `1px solid ${C.b2}`, color: C.text, fontSize: 12, fontWeight: 600, padding: "2px 0", outline: "none" }}
                                    />
                                    {char.refImageUrl && (
                                      <div style={{ fontSize: 9, color: C.blue, marginTop: 3 }}>● I2V ready</div>
                                    )}
                                  </div>
                                  <button onClick={() => setCharacters(prev => prev.filter((_, i) => i !== ci))}
                                    style={{ background: "none", border: "none", color: C.t4, cursor: "pointer", fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
                                </div>
                                {/* Anchor text */}
                                <textarea
                                  value={char.anchor}
                                  onChange={e => setCharacters(prev => prev.map((c, i) => i === ci ? { ...c, anchor: e.target.value } : c))}
                                  rows={3}
                                  placeholder="Visual anchor: age, hair, clothing, features…"
                                  style={{ width: "100%", background: C.s4, border: `1px solid ${C.b2}`, borderRadius: 6, color: C.t2, fontSize: 10, padding: "6px 8px", resize: "vertical", outline: "none", boxSizing: "border-box", lineHeight: 1.5 }}
                                />
                                {/* Anchor Pull button — only visible once a ref image is set */}
                                {char.refImageUrl && (() => {
                                  const ps = anchorPullStatus[char.id];
                                  const scanning = ps?.phase === "scanning";
                                  const done     = ps?.phase === "done";
                                  const errored  = ps?.phase === "error";
                                  return (
                                    <div style={{ marginTop: 8 }}>
                                      <button
                                        onClick={() => handleAnchorPull(char)}
                                        disabled={scanning}
                                        style={{
                                          width: "100%", padding: "5px 8px",
                                          background: done    ? `${C.green}18` :
                                                      errored ? `${C.red}18` :
                                                      scanning ? `${C.blue}18` :
                                                      `${C.accent}18`,
                                          border: `1px solid ${done ? C.green : errored ? C.red : scanning ? C.blue : C.accent}55`,
                                          borderRadius: 6, cursor: scanning ? "not-allowed" : "pointer",
                                          color: done ? C.green : errored ? C.red : scanning ? C.blue : C.accent,
                                          fontSize: 10, fontWeight: 600, display: "flex", alignItems: "center",
                                          justifyContent: "center", gap: 5, opacity: scanning ? 0.75 : 1,
                                          transition: "all .2s",
                                        }}
                                        title="Search archive for this character's face and auto-populate matching scenes"
                                      >
                                        {scanning ? (
                                          <>
                                            <div style={{ width: 8, height: 8, border: `1.5px solid ${C.blue}44`, borderTopColor: C.blue, borderRadius: "50%", animation: "spin .7s linear infinite", flexShrink: 0 }} />
                                            Scanning… {ps.clipsFound > 0 ? `${ps.clipsFound} clip${ps.clipsFound !== 1 ? "s" : ""}` : "archive"}
                                          </>
                                        ) : done ? (
                                          <>✓ {ps.message}</>
                                        ) : errored ? (
                                          <>⚠ Pull failed — retry</>
                                        ) : (
                                          <>🎭 Pull from Archive</>
                                        )}
                                      </button>
                                      {(done || errored) && ps?.message && (
                                        <div style={{ fontSize: 9, color: done ? C.green : C.red, marginTop: 3, textAlign: "center", opacity: 0.8 }}>
                                          {errored ? ps.message : null}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}

                                {/* Scene badges */}
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 6 }}>
                                  {scenes.filter(s => (s.characterIds || []).includes(char.id)).map(s => (
                                    <span key={s.id} style={{
                                      fontSize: 9, padding: "1px 5px", borderRadius: 3,
                                      background: s.genStatus === "succeeded" ? `${C.green}18` : `${C.blue}18`,
                                      color: s.genStatus === "succeeded" ? C.green : C.blue,
                                    }}>
                                      S{s.id}{s.genStatus === "succeeded" ? " ✓" : ""}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                            <button
                              onClick={() => setCharacters(prev => [...prev, { id: `c${Date.now()}`, name: "New Character", anchor: "", refImageUrl: null }])}
                              style={{ width: 48, height: 48, background: "none", border: `1px dashed ${C.b3}`, borderRadius: 8, color: C.t4, cursor: "pointer", fontSize: 20, alignSelf: "flex-start", flexShrink: 0 }}
                              title="Add character"
                            >+</button>
                          </div>
                        </div>
                      )}

                      {/* Locations */}
                      {locations.length > 0 && (
                        <div>
                          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", color: C.t3, marginBottom: 8 }}>Locations</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                            {locations.map((loc, li) => (
                              <div key={loc.id} style={{
                                background: C.s3, border: `1px solid ${C.orange}44`, borderRadius: 10,
                                padding: 12, width: 220, flexShrink: 0,
                              }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                                  <span style={{ fontSize: 14 }}>📍</span>
                                  <input
                                    value={loc.name}
                                    onChange={e => setLocations(prev => prev.map((l, i) => i === li ? { ...l, name: e.target.value } : l))}
                                    style={{ flex: 1, background: "none", border: "none", borderBottom: `1px solid ${C.b2}`, color: C.text, fontSize: 12, fontWeight: 600, padding: "2px 0", outline: "none" }}
                                  />
                                  <button onClick={() => setLocations(prev => prev.filter((_, i) => i !== li))}
                                    style={{ background: "none", border: "none", color: C.t4, cursor: "pointer", fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
                                </div>
                                <textarea
                                  value={loc.anchor}
                                  onChange={e => setLocations(prev => prev.map((l, i) => i === li ? { ...l, anchor: e.target.value } : l))}
                                  rows={3}
                                  placeholder="Environment anchor: surfaces, lighting, atmosphere…"
                                  style={{ width: "100%", background: C.s4, border: `1px solid ${C.b2}`, borderRadius: 6, color: C.t2, fontSize: 10, padding: "6px 8px", resize: "vertical", outline: "none", boxSizing: "border-box", lineHeight: 1.5 }}
                                />
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 6 }}>
                                  {scenes.filter(s => s.locationId === loc.id).map(s => (
                                    <span key={s.id} style={{ fontSize: 9, padding: "1px 5px", background: C.orange + "18", color: C.orange, borderRadius: 3 }}>
                                      S{s.id}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                            <button
                              onClick={() => setLocations(prev => [...prev, { id: `l${Date.now()}`, name: "New Location", anchor: "" }])}
                              style={{ width: 48, height: 48, background: "none", border: `1px dashed ${C.b3}`, borderRadius: 8, color: C.t4, cursor: "pointer", fontSize: 20, alignSelf: "flex-start", flexShrink: 0 }}
                              title="Add location"
                            >+</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Hidden file input for ref image upload */}
                  <input
                    ref={refInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      const charId = refInputRef.current?._charId;
                      if (!file || !charId) return;
                      e.target.value = "";
                      setRefUploading(charId);
                      try {
                        const { url } = await uploadRefImage(file);
                        setCharacters(prev => prev.map(c => c.id === charId ? { ...c, refImageUrl: url } : c));
                        toast_("Reference image uploaded — I2V mode enabled for this character ✓", "success");
                      } catch (err) {
                        toast_("Upload failed: " + err.message, "error");
                      } finally {
                        setRefUploading(null);
                      }
                    }}
                  />

                  {/* ── Add consistency buttons (shown when no anchors yet) ── */}
                  {characters.length === 0 && locations.length === 0 && (
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: C.t4 }}>No consistency anchors defined.</span>
                      <Btn size="sm" variant="secondary"
                        onClick={() => setCharacters(prev => [...prev, { id: `c${Date.now()}`, name: "Character", anchor: "", refImageUrl: null }])}>
                        + Character
                      </Btn>
                      <Btn size="sm" variant="secondary"
                        onClick={() => setLocations(prev => [...prev, { id: `l${Date.now()}`, name: "Location", anchor: "" }])}>
                        + Location
                      </Btn>
                    </div>
                  )}

                  {/* Scene cards */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <div style={{ ...sectionTitle, marginBottom: 0 }}>{scenes.length} Scenes</div>
                      <span style={{ fontSize: 11, color: C.t4, fontFamily: "var(--mono)" }}>
                        {doneScenes} generated · {scenes.length - doneScenes} remaining
                      </span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {scenes.map((scene, idx) => (
                        <SceneCard
                          key={`${scene.id}-${idx}`}
                          scene={scene} idx={idx}
                          onGenerate={generateScene}
                          onRegen={generateScene}
                          onPickPhoto={openPhotoPicker}
                          busy={genAllBusy || scene.genStatus === "generating" || photoBusyIdx === scenes.indexOf(scene)}
                          characters={characters}
                          locations={locations}
                          model={model}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: SCRIPTWRITER ─────────────────────────────── */}
          {tab === "scriptwriter" && (
            <div style={{ flex: 1, overflow: "hidden" }}>
              <Scriptwriter onExecute={handleExecuteScript} />
            </div>
          )}

          {/* ── TAB: ARCHIVE ─────────────────────────────────── */}
          {tab === "archive" && (
            <div style={{ flex: 1, overflow: "hidden" }}>
              <ArchiveSearch
                scenes={scenes}
                onUseClip={(clip, sceneId) => {
                  // Actually wire the clip into the scene's videoUrl state
                  // so it appears in the Timeline and gets used by stitch/produce
                  setScenes(prev => prev.map(s =>
                    String(s.id) === String(sceneId)
                      ? { ...s, videoUrl: clip.publicUrl || `/media/videos/${clip.videoName}`, genStatus: "succeeded" }
                      : s
                  ));
                  toast_(`🎭 "${clip.charName || clip.personName || clip.videoName}" anchored to scene ${sceneId}`, "success");
                }}
              />
            </div>
          )}

          {/* ── TAB: CRUCIBLE OS ─────────────────────────────── */}
          {tab === "crucible" && (
            <div style={{ flex: 1, overflow: "hidden" }}>
              <CrucibleOS
                onSendToFramegen={({ story, chapter, genre }) => {
                  const msg = `🧪 Crucible OS — ${genre.label} story for "${chapter.title}":\n\n${story}\n\nPlease create a Framegen blueprint from this educational film concept.`;
                  setInput(msg);
                  setTab("chat");
                  setTimeout(() => handleSend(), 100);
                }}
              />
            </div>
          )}

          {/* ── TAB: CREDITS & BILLING ───────────────────────── */}
          {tab === "credits" && (
            <CreditsPanel />
          )}

          {/* ── TAB: TIMELINE ─────────────────────────────────── */}

          {tab === "timeline" && (
            <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
              <div style={{ maxWidth: 780, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }} className="fade-in">

                {/* Final video */}
                {finalUrl ? (
                  <div style={{ padding: 18, background: C.s2, border: `1px solid ${C.green}44`, borderRadius: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.green }}>✓ Final Video Ready</div>
                        <div style={{ fontSize: 11, color: C.t4, marginTop: 2 }}>{projectTitle} · all scenes stitched</div>
                      </div>
                      <Btn size="sm" variant="green" icon="⬇" onClick={() => { const a = document.createElement("a"); a.href = finalUrl; a.download = `${projectTitle.replace(/\s+/g, "_")}.mp4`; a.click(); }}>
                        Download MP4
                      </Btn>
                    </div>
                    <video src={finalUrl} controls style={{ width: "100%", borderRadius: 9, background: "#000", maxHeight: 400 }} />
                  </div>
                ) : (
                  <div style={{ padding: 18, background: C.s2, border: `1px solid ${C.b2}`, borderRadius: 12 }}>
                    <div style={{ fontSize: 13, color: C.t2, marginBottom: 12 }}>
                      {doneScenes < 2
                        ? `Generate at least 2 scenes to stitch them into a final video. (${doneScenes} ready)`
                        : `${doneScenes} scenes ready — stitch them into one continuous MP4 using FFmpeg.`}
                    </div>
                    {doneScenes >= 2 && (
                      <Btn onClick={handleStitch} disabled={stitchBusy} icon={stitchBusy ? <Spin size={14} /> : "✂"}>
                        {stitchBusy ? "Stitching with FFmpeg…" : `Stitch ${doneScenes} Scenes → Final MP4`}
                      </Btn>
                    )}
                  </div>
                )}

                {/* Scene strip */}
                {scenes.some(s => s.videoUrl) && (
                  <div>
                    <div style={{ ...sectionTitle, marginBottom: 10 }}>Scene Clips</div>
                    <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8 }}>
                      {scenes.map((s, i) => (
                        <div key={i} style={{ flexShrink: 0, width: 140 }}>
                          {s.videoUrl
                            ? <video src={s.videoUrl} loop muted autoPlay style={{ width: 140, height: 79, objectFit: "cover", borderRadius: 6, border: `1px solid ${C.green}44` }} />
                            : <div style={{ width: 140, height: 79, background: C.s3, borderRadius: 6, border: `1px solid ${C.b1}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <span style={{ fontSize: 10, color: C.t4 }}>Scene {i + 1}</span>
                              </div>
                          }
                          <div style={{ fontSize: 10, color: C.t4, marginTop: 4, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Download list */}
                {scenes.filter(s => s.videoUrl).length > 0 && (
                  <div>
                    <div style={{ ...sectionTitle, marginBottom: 8 }}>Individual Downloads</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {scenes.filter(s => s.videoUrl).map((s, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", background: C.s2, border: `1px solid ${C.b1}`, borderRadius: 7 }}>
                          <span style={{ fontSize: 10, color: C.green, fontFamily: "var(--mono)", flexShrink: 0 }}>SCENE {scenes.indexOf(s) + 1}</span>
                          <span style={{ fontSize: 12, color: C.t2, flex: 1 }}>{s.title}</span>
                          <span style={{ fontSize: 10, color: C.t4, fontFamily: "var(--mono)" }}>{s.durationSec}s</span>
                          <Btn size="sm" variant="ghost" onClick={() => { const a = document.createElement("a"); a.href = s.videoUrl; a.download = `scene_${scenes.indexOf(s) + 1}.mp4`; a.click(); }}>⬇</Btn>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

        </div>

        {/* ── Library drawer ─────────────────────────────────── */}
        {showLibrary && (
          <div className="fade-in" style={{ position: "fixed", top: 50, right: 0, width: 320, height: "calc(100vh - 50px)", background: C.s1, borderLeft: `1px solid ${C.b1}`, zIndex: 200, overflowY: "auto", padding: 16, boxShadow: "-8px 0 30px #00000066" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Projects ({projects.length})</span>
              <button onClick={() => setShowLibrary(false)} style={{ background: "none", border: "none", color: C.t3, cursor: "pointer", fontSize: 18 }}>×</button>
            </div>
            {projects.length === 0
              ? <div style={{ fontSize: 12, color: C.t4 }}>No saved projects yet.</div>
              : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {projects.map(p => (
                    <div key={p.id} style={{ padding: 12, background: C.s2, border: `1px solid ${C.b1}`, borderRadius: 9 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 3 }}>{p.title}</div>
                      <div style={{ fontSize: 10, color: C.t4, marginBottom: 8 }}>{p.sceneCount} scenes · {p.status} · {new Date(p.updatedAt).toLocaleDateString()}</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Btn size="sm" onClick={() => loadProject(p.id)}>Load</Btn>
                        <Btn size="sm" variant="danger" onClick={async () => { if (confirm(`Delete "${p.title}"?`)) { await db.delete(activeUserId, p.id); loadProjects(); } }}>Delete</Btn>
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        )}

      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Photo Picker Modal ── */}
      {/* Hidden multi-file input — triggered by upload button or drop zone */}
      <input
        ref={photoUploadRef}
        type="file"
        multiple
        accept="image/*"
        style={{ display: "none" }}
        onChange={e => { handlePhotoUpload(e.target.files); e.target.value = ""; }}
      />

      {photoPickerIdx !== null && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", zIndex: 200,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
        }} onClick={() => setPhotoPickerIdx(null)}>
          <div style={{
            background: C.s1, border: `1px solid ${C.b2}`, borderRadius: 14,
            width: "min(820px, 100%)", maxHeight: "82vh", display: "flex", flexDirection: "column",
            overflow: "hidden",
          }} onClick={e => e.stopPropagation()}>

            {/* ── header ── */}
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.b1}`, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>📷 Photo Library</span>
              <span style={{ fontSize: 11, color: C.t3 }}>— Scene {photoPickerIdx + 1}</span>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {/* Motion selector */}
                <span style={{ fontSize: 11, color: C.t3 }}>Motion:</span>
                <select value={pickerMove} onChange={e => setPickerMove(e.target.value)} style={{
                  background: C.s3, border: `1px solid ${C.b2}`, borderRadius: 6,
                  color: C.text, fontSize: 11, padding: "3px 8px", cursor: "pointer",
                }}>
                  <option value="zoom-in">Slow Zoom In</option>
                  <option value="zoom-out">Slow Zoom Out</option>
                  <option value="pan-right">Pan Right</option>
                  <option value="pan-left">Pan Left</option>
                  <option value="drift-up">Drift Up</option>
                  <option value="static">Static</option>
                </select>
                {/* Upload button */}
                <button
                  onClick={() => photoUploadRef.current?.click()}
                  disabled={photoUploading}
                  style={{
                    background: C.orange + "22", border: `1px solid ${C.orange}55`,
                    color: C.orange, borderRadius: 6, fontSize: 11,
                    padding: "4px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
                  }}>
                  {photoUploading ? <><Spin size={11} /> Uploading…</> : "⬆ Add Photos"}
                </button>
                {/* Refresh */}
                <button
                  onClick={async () => {
                    setPhotoLoading(true);
                    try { const { photos } = await listPhotos(); setPhotoLibrary(photos || []); }
                    catch {}
                    setPhotoLoading(false);
                  }}
                  title="Refresh library"
                  style={{ background: "none", border: `1px solid ${C.b2}`, color: C.t3, borderRadius: 6, fontSize: 13, padding: "3px 7px", cursor: "pointer" }}>
                  ↺
                </button>
              </div>
              <button onClick={() => setPhotoPickerIdx(null)} style={{
                background: "none", border: "none", color: C.t3, fontSize: 18, cursor: "pointer", lineHeight: 1,
              }}>✕</button>
            </div>

            {/* ── body ── */}
            <div
              style={{ overflowY: "auto", padding: 16, flex: 1, position: "relative" }}
              onDragOver={e => { e.preventDefault(); if (!photoDragOver) setPhotoDragOver(true); }}
              onDragLeave={e => {
                // Only clear when leaving the container itself, not a child element
                if (!e.currentTarget.contains(e.relatedTarget)) setPhotoDragOver(false);
              }}
              onDrop={e => {
                e.preventDefault();
                setPhotoDragOver(false);
                handlePhotoUpload(e.dataTransfer.files);
              }}>

              {/* Drag-and-drop overlay — rendered inside position:relative parent */}
              {photoDragOver && (
                <div style={{
                  position: "absolute", inset: 0, background: C.orange + "18",
                  border: `2px dashed ${C.orange}`, borderRadius: 10,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, color: C.orange, fontWeight: 600, pointerEvents: "none", zIndex: 10,
                }}>
                  Drop photos here
                </div>
              )}

              {/* Loading spinner */}
              {(photoLoading || photoUploading) && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 120, gap: 10, color: C.t3 }}>
                  <Spin size={18} />
                  {photoUploading ? "Uploading photos…" : "Loading library…"}
                </div>
              )}

              {/* Empty state — drag-to-upload prompt */}
              {!photoLoading && !photoUploading && photoLibrary.length === 0 && (
                <div
                  onClick={() => photoUploadRef.current?.click()}
                  style={{
                    textAlign: "center", color: C.t3, padding: 48, lineHeight: 1.8,
                    border: `2px dashed ${C.b3}`, borderRadius: 10, cursor: "pointer",
                    transition: "border-color .15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = C.orange}
                  onMouseLeave={e => e.currentTarget.style.borderColor = C.b3}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>📷</div>
                  <div style={{ fontWeight: 600, marginBottom: 6, color: C.text }}>No photos yet</div>
                  <div style={{ fontSize: 12 }}>
                    Click here or drag photos to upload them<br />
                    <span style={{ color: C.t4 }}>Supports JPG, PNG, HEIC, WEBP, AVIF…</span>
                  </div>
                </div>
              )}

              {/* Photo grid */}
              {!photoLoading && !photoUploading && photoLibrary.length > 0 && (
                <>
                  {/* Drop-to-add strip when photos exist */}
                  <div
                    onClick={() => photoUploadRef.current?.click()}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      padding: "9px 14px", marginBottom: 12,
                      border: `1px dashed ${C.b3}`, borderRadius: 8, cursor: "pointer",
                      fontSize: 11, color: C.t3,
                      transition: "border-color .15s, color .15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = C.orange; e.currentTarget.style.color = C.orange; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = C.b3;    e.currentTarget.style.color = C.t3; }}>
                    ⬆ Upload more photos (or drag &amp; drop onto this panel)
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
                    {photoLibrary.map(photo => (
                      <div
                        key={photo.filename}
                        onClick={() => applyPhoto(photo.filename)}
                        title={`Apply "${photo.filename}" to Scene ${photoPickerIdx + 1}`}
                        style={{
                          cursor: "pointer", borderRadius: 8, overflow: "hidden",
                          border: `2px solid ${C.b2}`,
                          transition: "border-color .15s, transform .1s", background: C.s3,
                          display: "flex", flexDirection: "column",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = C.orange; e.currentTarget.style.transform = "scale(1.02)"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = C.b2;    e.currentTarget.style.transform = "scale(1)"; }}>

                        {/* Thumbnail */}
                        <div style={{ width: "100%", aspectRatio: "4/3", overflow: "hidden", background: C.s4, position: "relative" }}>
                          <img
                            src={photo.thumbUrl}
                            alt={photo.filename}
                            loading="lazy"
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                            onError={e => {
                              // Fall back to the full image if thumb generation failed
                              if (e.target.src !== photo.url) e.target.src = photo.url;
                            }}
                          />
                        </div>

                        {/* Filename label */}
                        <div style={{
                          padding: "5px 7px", fontSize: 9, color: C.t3,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          background: C.s2, borderTop: `1px solid ${C.b1}`,
                        }}>
                          {photo.filename}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* ── footer hint ── */}
            <div style={{ padding: "10px 18px", borderTop: `1px solid ${C.b1}`, fontSize: 11, color: C.t4, display: "flex", justifyContent: "space-between" }}>
              <span>Click a photo → Ken Burns applied to Scene {photoPickerIdx + 1}</span>
              <span>{photoLibrary.length} photo{photoLibrary.length !== 1 ? "s" : ""} in library</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Shared micro-styles
// ─────────────────────────────────────────────────────────────
const sectionTitle = {
  fontSize: 9, fontWeight: 700, letterSpacing: ".18em",
  textTransform: "uppercase", color: "#2a2420", marginBottom: 8,
};
const labelStyle = {
  fontSize: 9, fontWeight: 700, letterSpacing: ".15em",
  textTransform: "uppercase", color: "#2a2420", marginBottom: 5,
};
