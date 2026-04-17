// ─── streaming chat (SSE) ──────────────────────────────────────
export async function chatStream({ messages, systemPrompt, onDelta, onDone, onError }) {
  const res = await fetch("/api/chat", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ messages, systemPrompt }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    onError?.(e.error || `Server error ${res.status}`);
    return;
  }

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
        if (evt === "delta") onDelta?.(d.text);
        if (evt === "done")  onDone?.();
        if (evt === "error") onError?.(d.message);
      } catch {}
    }
  }
}

// ─── video generation ──────────────────────────────────────────
export async function startGeneration({ prompt, negativePrompt, model, numFrames, sceneId, imageUrl = null }) {
  const r = await fetch("/api/generate-scene", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ prompt, negativePrompt, model, numFrames, sceneId, imageUrl }),
  });
  return r.json();
}

export async function startImageGeneration({ prompt, aspectRatio = "16:9" }) {
  const r = await fetch("/api/generate-image", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ prompt, aspectRatio }),
  });
  return r.json();
}

// ─── character reference image upload ─────────────────────────
// Accepts a File object from <input type="file">, returns { url }
export async function uploadRefImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64    = reader.result.split(",")[1];
        const ext       = file.name.split(".").pop().toLowerCase();
        const r = await fetch("/api/upload-ref", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ imageData: base64, ext }),
        });
        if (!r.ok) throw new Error("Upload failed");
        resolve(await r.json());   // { url: "/refs/abc.jpg" }
      } catch (e) { reject(e); }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// poll until succeeded/failed
export async function pollUntilDone(provider, id, onProgress) {
  for (let i = 0; i < 300; i++) {    // 300 × 4s = 20 min max
    await delay(4000);
    const r    = await fetch(`/api/poll/${provider}/${id}`);
    const data = await r.json();
    onProgress?.(data.status, data.logs);
    if (data.status === "succeeded") return data;
    if (data.status === "failed")    throw new Error(data.error || "Generation failed");
  }
  throw new Error("Timed out after 20 minutes — LTX-Video may still be generating. Refresh to check.");
}

// ─── ADMIN MEDIA ───────────────────────────────────────────────
// Helper function for JSON fetch requests
async function fetchJSON(url, options = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  const body = options.body ? JSON.stringify(options.body) : undefined;

  const res = await fetch(url, { ...options, headers, body });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Server error ${res.status}`);
  }
  return res.json();
}

export async function fetchMediaLibrary() {
  const r = await fetch("/api/media/library");
  if (!r.ok) throw new Error("Failed to load generic media library");
  return r.json(); // { photos: { Root: [], folders... }, videos: { Root: [], folders... } }
}

export async function fetchMediaFolders() {
  const r = await fetch("/api/media/folders");
  return r.ok ? r.json() : { photos: ["Root"], videos: ["Root"] };
}

export async function createMediaFolder(type, name) {
  const r = await fetch("/api/media/folder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, name }),
  });
  if (!r.ok) throw new Error("Folder creation failed");
  return r.json();
}

export async function uploadMedia(type, folder, files) {
  const encoded = await Promise.all(
    Array.from(files).map(file =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ data: reader.result.split(",")[1], name: file.name });
        reader.onerror = reject;
        reader.readAsDataURL(file);
      })
    )
  );
  const res = await fetch("/api/media/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, folder: folder !== "Root" ? folder : undefined, files: encoded }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Upload failed");
  }
  return res.json();
}

// ─── photo repository (legacy) ──────────────────────────────────
export async function listPhotos() {
  const r = await fetch("/api/photos");
  if (!r.ok) throw new Error("Failed to load photo library");
  return r.json();   // { photos: [{ filename, url, thumbUrl }] }
}

// Legacy uploader
export async function uploadPhotos(files) {
  const items = await Promise.all(
    Array.from(files).map(file =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({
          imageData: reader.result.split(",")[1],
          filename:  file.name,
        });
        reader.onerror = reject;
        reader.readAsDataURL(file);
      })
    )
  );
  const r = await fetch("/api/upload-photo", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ files: items }),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.error || "Photo upload failed");
  }
  return r.json();   // { saved, photos }
}

export async function kenBurns({ photoFile, cameraMove = "zoom-in", durationSec = 5 }) {
  const r = await fetch("/api/ken-burns", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ photoFile, cameraMove, durationSec }),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.error || "Ken Burns conversion failed");
  }
  return r.json();   // { videoUrl }
}

export async function stitchScenes({ sceneFiles, projectTitle }) {
  const r = await fetch("/api/stitch", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ sceneFiles, projectTitle }),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.error || `Stitch failed (${r.status})`);
  }
  return r.json();
}

// ─── youtube integration ───────────────────────────────────────
export async function searchYoutube(query) {
  const r = await fetch(`/api/youtube/search?q=${encodeURIComponent(query)}`);
  if (!r.ok) throw new Error("Search failed");
  return r.json();
}

export async function downloadYoutube(url, startSec, durationSec) {
  const r = await fetch("/api/youtube/download", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, startSec, durationSec })
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.error || "Download failed");
  }
  return r.json();
}

// ─── users ─────────────────────────────────────────────────────
export const usersAPI = {
  list:   ()     => fetch("/api/users").then(r => r.json()),
  create: (name) => fetch("/api/users", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ name }) }).then(r => r.json()),
};

// ─── projects ──────────────────────────────────────────────────
export const db = {
  health:  ()           => fetch("/api/health").then(r => r.json()),
  list:    (userId)     => fetch("/api/projects", { headers: { "x-user-id": userId } }).then(r => r.json()),
  save:    (userId, data) => fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json", "x-user-id": userId }, body: JSON.stringify(data) }).then(r => r.json()),
  load:    (userId, id) => fetch(`/api/projects/${id}`, { headers: { "x-user-id": userId } }).then(r => r.json()),
  delete:  (userId, id) => fetch(`/api/projects/${id}`, { method: "DELETE", headers: { "x-user-id": userId } }),
};

const delay = ms => new Promise(r => setTimeout(r, ms));

// ─── Face Archive APIs ─────────────────────────────────────────
export async function faceSearch({ query, sceneId, targetSec, refImagePath, onStatus, onIntent, onClip, onInfo, onDone, onError }) {
  const res = await fetch("/api/face-search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, sceneId, targetSec, refImagePath }),
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
          if (evt === "status") onStatus?.(d.message);
          if (evt === "intent") onIntent?.(d);
          if (evt === "clip")   onClip?.(d);
          if (evt === "info")   onInfo?.(d.message);
          if (evt === "done")   onDone?.(d);
          if (evt === "error")  onError?.(d.message);
        } catch {}
      }
    }
  }
}

export async function faceIndexList() {
  const r = await fetch("/api/face-index-list");
  return r.json();
}

// ─── Anchor Pull (face-match archive → auto-populate scenes) ───
// Streams SSE events: status | clip | assignment | done | error
export async function anchorPull({
  characters, scenes, threshold = 0.55,
  onStatus, onClip, onAssignment, onDone, onError,
}) {
  const res = await fetch("/api/anchor-pull", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ characters, scenes, threshold }),
  });
  if (!res.ok) { onError?.(`Server error ${res.status}`); return; }

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
      if (line.startsWith("data: ")) {
        try {
          const d = JSON.parse(line.slice(6));
          if (evt === "status")     onStatus?.(d);
          if (evt === "clip")       onClip?.(d);
          if (evt === "assignment") onAssignment?.(d);
          if (evt === "done")       onDone?.(d);
          if (evt === "error")      onError?.(d.message);
        } catch {}
      }
    }
  }
}

// ─── SCRIPTWRITER FADE IN APIS ────────────────────────────────
export async function generateScriptStream({ messages, systemPrompt, onDelta, onDone, onError }) {
  const res = await fetch(`/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, systemPrompt }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    onError?.(err.error || `Server error ${res.status}`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop();

    let event = null;
    for (const line of lines) {
      if (line.startsWith("event: ")) { event = line.slice(7).trim(); continue; }
      if (line.startsWith("data: ")) {
        try {
          const d = JSON.parse(line.slice(6));
          if (event === "delta") onDelta?.(d.text);
          if (event === "done") onDone?.();
          if (event === "error") onError?.(d.message);
        } catch {}
      }
    }
  }
}

export const scriptwriterAPI = {
  async listScripts() {
    const r = await fetch(`/api/scripts`);
    return r.json();
  },
  async saveScript(data) {
    const r = await fetch(`/api/scripts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return r.json();
  },
  async loadScript(id) {
    const r = await fetch(`/api/scripts/${id}`);
    if (!r.ok) throw new Error("Not found");
    return r.json();
  },
  async deleteScript(id) {
    await fetch(`/api/scripts/${id}`, { method: "DELETE" });
  },
  async health() {
    const r = await fetch(`/api/health`);
    const data = await r.json();
    return { ...data, apiKeySet: data.anthropic };
  },
};

// ─── Whiteboard renderer (Manim / Remotion) ────────────────────
// Starts a single-scene whiteboard render. Returns { jobId, provider }.
export async function renderWhiteboard({ scene, subject, equations, keyFacts, conceptName, visualStyle }) {
  const r = await fetch("/api/whiteboard/render", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ scene, subject, equations, keyFacts, conceptName, visualStyle }),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.error || "Whiteboard render failed");
  }
  return r.json(); // { jobId, provider, status }
}

// Returns { manim: { ready, note }, remotion: { ready, note } }
export async function fetchWhiteboardDeps() {
  const r = await fetch("/api/whiteboard/deps");
  if (!r.ok) throw new Error("Failed to fetch whiteboard deps");
  return r.json();
}

// Streams pip install manim output via SSE.
// onLine(text) — called for each output line
// onDone()     — called on success
// onError(msg) — called on failure
export async function installManim({ onLine, onDone, onError }) {
  const res = await fetch("/api/whiteboard/install-manim", { method: "POST" });
  if (!res.ok) { onError?.(`Server error ${res.status}`); return; }

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
        if (evt === "line")  onLine?.(d.text);
        if (evt === "done")  onDone?.();
        if (evt === "error") onError?.(d.message);
      } catch {}
    }
  }
}

// Polls until succeeded/failed. Calls onStatus({ status, provider, videoUrl?, error? }) each tick.
export async function pollWhiteboard(jobId, onStatus) {
  for (let i = 0; i < 90; i++) {          // 90 × 3 s = 4.5 min max
    await delay(3000);
    const r    = await fetch(`/api/whiteboard/poll/${jobId}`);
    const data = await r.json();
    onStatus?.(data);
    if (data.status === "succeeded") return data;
    if (data.status === "failed")    throw new Error(data.error || "Whiteboard render failed");
  }
  throw new Error("Whiteboard render timed out after 4.5 min");
}
