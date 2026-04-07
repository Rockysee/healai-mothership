import { useState, useEffect, useRef } from "react";
import { LANGUAGES } from "./constants.js";

const C = {
  bg: "#080808", s1: "#0f0f0f", s2: "#151515", s3: "#1c1c1c", s4: "#222",
  b1: "#222", b2: "#2e2e2e", b3: "#3a3a3a",
  text: "#ede9e3", t2: "#8a8078", t3: "#4a4440", t4: "#6e6560",
  accent: "#e8ff6e", blue: "#4da6ff", green: "#4dff9e",
  red: "#ff5555", orange: "#ff6b35", purple: "#c084fc",
};

const MOOD_COLORS = {
  epic: "#ff6b35", intimate: "#4da6ff", tense: "#ff5555",
  dreamlike: "#c084fc", surreal: "#b57eff", mysterious: "#4dff9e",
  energetic: "#e8ff6e", melancholic: "#8a8078", joyful: "#ffd166", raw: "#ff6b9d",
};

const MOODS = ["epic","intimate","tense","dreamlike","surreal","mysterious","energetic","melancholic","joyful","raw"];

async function apiGet(url) { const r = await fetch(url); return r.json(); }
async function apiPost(url, body) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return r.json();
}

// Format seconds → MM:SS
function fmtTime(sec) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function ProducerPanel({ blueprint, sceneVideoFiles = [] }) {
  const [voices, setVoices]           = useState([]);
  const [charVoices, setCharVoices]   = useState({});   // { [charId]: voiceId }
  const [globalMood, setGlobalMood]   = useState("intimate");
  const [subtitlesOn, setSubtitlesOn] = useState(true);
  const [language, setLanguage]       = useState("en"); // BCP-47 code from LANGUAGES
  const [producing, setProducing]     = useState(false);
  const [progress, setProgress]       = useState({ stage: "", pct: 0 });
  const [result, setResult]           = useState(null);   // { finalVideo, srtFile }
  const [error, setError]             = useState(null);
  const [previewAudio, setPreviewAudio] = useState({});   // { [sceneId]: audioUrl }
  const [previewBusy, setPreviewBusy]   = useState({});
  const audioRefs = useRef({});

  useEffect(() => {
    apiGet("/api/tts/voices")
      .then(d => setVoices(d.voices || []))
      .catch(() => {});
  }, []);

  // ── Auto-assign voices whenever blueprint OR language changes ──
  // Resolves each character to the best-fit neural voice for the chosen language.
  // Falls back to "narrator" (M) voice for the selected language if role is unknown.
  function autoAssignVoices(chars, lang) {
    const langEntry = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];
    const { m: defaultM, f: defaultF } = langEntry.voices;
    const map = {};
    (chars || []).forEach(c => {
      const n = c.name.toLowerCase();
      if (n.includes("narrat") || n.includes("voice") || n.includes("teacher") || n.includes("mentor")) {
        map[c.id] = defaultM;
      } else if (n.includes("female") || n.includes("woman") || n.includes("girl") || n.includes("protagonist")) {
        map[c.id] = defaultF;
      } else {
        map[c.id] = defaultM;
      }
    });
    return map;
  }

  useEffect(() => {
    if (!blueprint?.characters) return;
    setCharVoices(autoAssignVoices(blueprint.characters, language));
    // Default mood from blueprint globalTone
    if (blueprint.globalTone) {
      const t = blueprint.globalTone.toLowerCase();
      for (const m of MOODS) { if (t.includes(m)) { setGlobalMood(m); break; } }
    }
  }, [blueprint]); // eslint-disable-line

  // Re-assign voices when language switches (user can still override manually after)
  useEffect(() => {
    if (!blueprint?.characters) return;
    setCharVoices(autoAssignVoices(blueprint.characters, language));
  }, [language]); // eslint-disable-line

  const handlePreviewNarration = async (scene) => {
    const narration = scene.narration;
    if (!narration?.trim()) return;
    setPreviewBusy(pb => ({ ...pb, [scene.id]: true }));
    try {
      const charId = (scene.characterIds || [])[0];
      const voice = charVoices[charId] || "en-US-GuyNeural";
      const data = await apiPost("/api/tts", { text: narration, voice });
      if (data.audioFile) {
        // TTS files served from local-inference port 8000
        const url = `http://localhost:8000${data.audioFile}`;
        setPreviewAudio(pa => ({ ...pa, [scene.id]: url }));
        setTimeout(() => { audioRefs.current[scene.id]?.play(); }, 100);
      }
    } catch {}
    setPreviewBusy(pb => ({ ...pb, [scene.id]: false }));
  };

  const handleProduce = async () => {
    if (!blueprint) return;
    setProducing(true); setError(null); setResult(null);

    const voiceOverrides = {};
    if (blueprint.characters) {
      blueprint.characters.forEach(c => {
        if (charVoices[c.id]) voiceOverrides[c.id] = charVoices[c.id];
      });
    }

    setProgress({ stage: "🎤 Generating narration audio…", pct: 10 });
    try {
      setProgress({ stage: "🎬 Composing scenes (video + voice + music + subtitles)…", pct: 30 });
      const data = await apiPost("/api/produce", {
        blueprint,
        sceneFiles: sceneVideoFiles,
        voiceOverrides,
        mood: globalMood,
        language,          // drives TTS voice, subtitle script font, SRT encoding
      });
      if (data.error) throw new Error(data.error);
      setProgress({ stage: "✅ Done!", pct: 100 });
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setProducing(false);
    }
  };

  const hasScenes = blueprint?.scenes?.length > 0;
  const readyScenes = sceneVideoFiles.filter(Boolean).length;
  const totalScenes = blueprint?.scenes?.length || 0;

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: 24, fontFamily: "var(--sans)" }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "var(--display)", letterSpacing: ".12em", color: C.accent, marginBottom: 6 }}>
          🎬 FILM PRODUCER
        </div>
        <div style={{ fontSize: 12, color: C.t2 }}>
          Transform your rendered scenes into a finished film — character voices, ambient music, Netflix-style subtitles, and a polished final cut.
        </div>
      </div>

      {!blueprint && (
        <div style={{ textAlign: "center", padding: 48, color: C.t3, fontSize: 13 }}>
          💡 Generate a blueprint first in the Chat tab, then come back here to produce your film.
        </div>
      )}

      {blueprint && (
        <>
          {/* Scene readiness */}
          <div style={{ padding: "10px 14px", background: C.s2, borderRadius: 10, border: `1px solid ${C.b2}`, marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: C.t3, fontWeight: 700, marginBottom: 6 }}>SCENE READINESS</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, height: 6, background: C.b2, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${totalScenes ? (readyScenes / totalScenes) * 100 : 0}%`, background: readyScenes === totalScenes ? C.green : C.accent, transition: "width .3s" }} />
              </div>
              <span style={{ fontSize: 11, color: readyScenes === totalScenes ? C.green : C.accent, fontWeight: 700, flexShrink: 0 }}>
                {readyScenes} / {totalScenes} scenes ready
              </span>
            </div>
          </div>

          {/* ── Narration Language Picker ── */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: C.t3, fontWeight: 700, marginBottom: 10 }}>
              NARRATION LANGUAGE
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {LANGUAGES.map(lang => {
                const active = language === lang.code;
                return (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    title={`${lang.label} · ${lang.script} script`}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "5px 11px", borderRadius: 14,
                      border: `1px solid ${active ? C.accent : C.b2}`,
                      background: active ? `${C.accent}18` : "transparent",
                      color: active ? C.accent : C.t3,
                      fontSize: 10, fontWeight: active ? 700 : 400,
                      cursor: "pointer", fontFamily: "inherit",
                      transition: "all .15s",
                    }}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.label}</span>
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 9, color: C.t3, marginTop: 6 }}>
              {(() => {
                const l = LANGUAGES.find(l => l.code === language);
                return l
                  ? `${l.script} script · ${l.voices.m} / ${l.voices.f} · Selecting a language auto-assigns voices and subtitle font`
                  : "";
              })()}
            </div>
          </div>

          {/* Character Voice Assignment */}
          {blueprint.characters?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: C.t3, fontWeight: 700, marginBottom: 10 }}>VOICE CASTING</div>
              {blueprint.characters.map(char => (
                <div key={char.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8,
                  padding: "8px 12px", background: C.s2, borderRadius: 8, border: `1px solid ${C.b1}` }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: `linear-gradient(135deg, ${C.purple}30, ${C.blue}20)`,
                    border: `1px solid ${C.purple}30`, display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 15 }}>🎭</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {char.name}
                    </div>
                    <div style={{ fontSize: 9, color: C.t3 }}>{char.id}</div>
                  </div>
                  <select value={charVoices[char.id] || "en-US-GuyNeural"}
                    onChange={e => setCharVoices(v => ({ ...v, [char.id]: e.target.value }))}
                    style={{ padding: "4px 8px", borderRadius: 6, border: `1px solid ${C.b2}`,
                      background: C.s3, color: C.text, fontSize: 10, fontFamily: "inherit", maxWidth: 180 }}>
                    {voices.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
                    {voices.length === 0 && <option value="en-US-GuyNeural">Guy (Narrator)</option>}
                  </select>
                </div>
              ))}
            </div>
          )}

          {/* Global Mood Selector */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: C.t3, fontWeight: 700, marginBottom: 10 }}>BACKGROUND MUSIC MOOD</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {MOODS.map(m => (
                <button key={m} onClick={() => setGlobalMood(m)}
                  style={{ padding: "5px 12px", borderRadius: 14, border: `1px solid ${globalMood === m ? MOOD_COLORS[m] : C.b2}`,
                    background: globalMood === m ? `${MOOD_COLORS[m]}22` : "transparent",
                    color: globalMood === m ? MOOD_COLORS[m] : C.t3, fontSize: 10, fontWeight: 700,
                    cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize" }}>
                  {m}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 9, color: C.t3, marginTop: 6 }}>
              Generates mood-matched ambient music. Ducked to -22dB beneath narration.
            </div>
          </div>

          {/* Subtitle toggle */}
          <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => setSubtitlesOn(s => !s)}
              style={{ width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer",
                background: subtitlesOn ? C.accent : C.b2, transition: "background .2s", flexShrink: 0, position: "relative" }}>
              <div style={{ position: "absolute", top: 3, left: subtitlesOn ? 18 : 3, width: 14, height: 14,
                borderRadius: "50%", background: subtitlesOn ? C.bg : C.t3, transition: "left .2s" }} />
            </button>
            <div>
              <div style={{ fontSize: 11, color: subtitlesOn ? C.text : C.t3, fontWeight: 700 }}>Netflix-style Subtitles</div>
              <div style={{ fontSize: 9, color: C.t3 }}>White bold text · black drop shadow · bottom-center burned in</div>
            </div>
          </div>

          {/* Scene Narration Previews */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, color: C.t3, fontWeight: 700, marginBottom: 10 }}>SCENE NARRATIONS</div>
            {blueprint.scenes?.map((scene, i) => {
              const narration = scene.narration || "";
              const hasVideo = !!sceneVideoFiles[i];
              return (
                <div key={scene.id || i} style={{ marginBottom: 8, padding: "8px 12px",
                  background: C.s2, borderRadius: 8, border: `1px solid ${hasVideo ? C.b2 : C.b1}` }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ fontSize: 9, color: C.t3, fontWeight: 700, marginTop: 1, flexShrink: 0, width: 26 }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: C.text, marginBottom: 3 }}>{scene.title}</div>
                      {narration ? (
                        <div style={{ fontSize: 10, color: C.t2, fontStyle: "italic", lineHeight: 1.5, marginBottom: 6 }}>
                          "{narration}"
                        </div>
                      ) : (
                        <div style={{ fontSize: 9, color: C.t3, marginBottom: 6 }}>No narration for this scene</div>
                      )}
                      {narration && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <button onClick={() => handlePreviewNarration(scene)}
                            disabled={previewBusy[scene.id]}
                            style={{ padding: "3px 10px", borderRadius: 6, border: `1px solid ${C.b2}`,
                              background: previewBusy[scene.id] ? C.b2 : "transparent",
                              color: C.t2, fontSize: 9, cursor: "pointer", fontFamily: "inherit" }}>
                            {previewBusy[scene.id] ? "Generating…" : "🔊 Preview Voice"}
                          </button>
                          {previewAudio[scene.id] && (
                            <audio ref={el => { audioRefs.current[scene.id] = el; }}
                              src={previewAudio[scene.id]} controls
                              style={{ height: 22, flex: 1, minWidth: 0, opacity: 0.7 }} />
                          )}
                        </div>
                      )}
                    </div>
                    <div style={{ flexShrink: 0, fontSize: 9, color: hasVideo ? C.green : C.t3 }}>
                      {hasVideo ? "✓ video" : "○ pending"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Production Progress */}
          {producing && (
            <div style={{ marginBottom: 20, padding: "14px 16px", background: `${C.accent}10`,
              border: `1px solid ${C.accent}30`, borderRadius: 10 }}>
              <div style={{ fontSize: 11, color: C.accent, fontWeight: 700, marginBottom: 8 }}>
                {progress.stage}
              </div>
              <div style={{ height: 4, background: C.b2, borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${progress.pct}%`, background: C.accent,
                  transition: "width 1s ease", borderRadius: 2 }} />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ marginBottom: 16, padding: "12px 14px", background: `${C.red}10`,
              border: `1px solid ${C.red}30`, borderRadius: 8, fontSize: 11, color: C.red }}>
              ❌ {error}
            </div>
          )}

          {/* Result */}
          {result && (
            <div style={{ marginBottom: 24, padding: "16px", background: `${C.green}08`,
              border: `1px solid ${C.green}30`, borderRadius: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: C.green, marginBottom: 12, letterSpacing: ".08em" }}>
                🎬 FILM PRODUCED — {result.sceneCount} SCENES
              </div>
              <video controls style={{ width: "100%", borderRadius: 8, marginBottom: 12, background: "#000" }}
                src={`http://localhost:3002${result.finalVideo}`} />
              <div style={{ display: "flex", gap: 8 }}>
                <a href={`http://localhost:3002${result.finalVideo}`} download
                  style={{ flex: 1, padding: "8px", textAlign: "center", borderRadius: 7, textDecoration: "none",
                    background: C.accent, color: C.bg, fontSize: 11, fontWeight: 700 }}>
                  ⬇ Download MP4
                </a>
                {result.srtFile && (
                  <a href={`http://localhost:3002${result.srtFile}`} download
                    style={{ padding: "8px 14px", textAlign: "center", borderRadius: 7, textDecoration: "none",
                      background: "transparent", border: `1px solid ${C.b2}`, color: C.t2, fontSize: 11 }}>
                    ⬇ SRT
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Produce Button */}
          <button onClick={handleProduce}
            disabled={producing || readyScenes === 0}
            style={{ width: "100%", padding: "14px", borderRadius: 10, border: "none",
              background: producing || readyScenes === 0
                ? C.b2
                : `linear-gradient(135deg, ${C.accent}, ${C.orange})`,
              color: producing || readyScenes === 0 ? C.t3 : C.bg,
              fontSize: 13, fontWeight: 800, cursor: producing || readyScenes === 0 ? "not-allowed" : "pointer",
              fontFamily: "var(--display)", letterSpacing: ".1em",
              boxShadow: producing || readyScenes === 0 ? "none" : `0 4px 20px ${C.accent}30`,
              transition: "all .2s" }}>
            {producing ? "🛠 Producing…" : readyScenes === 0 ? "Generate scenes first" : `▶ PRODUCE FINAL FILM (${readyScenes} scenes)`}
          </button>

          <div style={{ marginTop: 10, textAlign: "center", fontSize: 9, color: C.t3 }}>
            Voice modulation · ambient music · burnt subtitles · .srt transcript
          </div>
        </>
      )}
    </div>
  );
}
