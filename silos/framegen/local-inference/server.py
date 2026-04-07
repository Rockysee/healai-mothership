#!/usr/bin/env python3
"""
FRAMEGEN — Local Inference Server
LTX-Video via Hugging Face diffusers running on Apple M1/M2/M3 (MPS/Metal GPU)

Usage:
    cd local-inference
    ./start.sh          ← installs deps + starts server
    python server.py    ← if deps already installed

API (mirrors Replicate's format so Framegen needs no changes):
    POST /predictions           { input: { prompt, negative_prompt, num_frames } }
    GET  /predictions/:id       { id, status, output, logs, error }
    GET  /health                { ok, device, model }
    GET  /videos/:filename      serve generated .mp4 files
"""

import os, uuid, threading, time
from pathlib import Path

import torch
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# ── output directory ──────────────────────────────────────────
VIDEOS_DIR = Path(os.environ.get("FRAMEGEN_VIDEOS", "/tmp/ltx-framegen-videos"))
VIDEOS_DIR.mkdir(parents=True, exist_ok=True)

# ── device selection ──────────────────────────────────────────
if torch.backends.mps.is_available():
    DEVICE = "mps"
    DTYPE  = torch.bfloat16
elif torch.cuda.is_available():
    DEVICE = "cuda"
    DTYPE  = torch.float16
else:
    DEVICE = "cpu"
    DTYPE  = torch.float32

print(f"\n🎬  FRAMEGEN Local Inference")
print(f"   Device : {DEVICE}")
print(f"   Dtype  : {DTYPE}")
print(f"   Videos : {VIDEOS_DIR}")
print(f"\n   Loading LTX-Video… (first run downloads ~8 GB)\n")

# ── load model ───────────────────────────────────────────────
from diffusers import LTXPipeline, LTXImageToVideoPipeline
from diffusers.utils import export_to_video

pipe = LTXPipeline.from_pretrained(
    "Lightricks/LTX-Video",
    torch_dtype=DTYPE,
)
pipe = pipe.to(DEVICE)

# Create identical pointer to I2V pipeline using same exact loaded VRAM weights
pipe_i2v = LTXImageToVideoPipeline(
    vae=pipe.vae,
    transformer=pipe.transformer,
    scheduler=pipe.scheduler,
    text_encoder=pipe.text_encoder,
    tokenizer=pipe.tokenizer,
).to(DEVICE)

# Memory optimisations for unified memory
pipe.enable_attention_slicing()
pipe_i2v.enable_attention_slicing()
try:
    pipe.vae.enable_tiling()        # halves VAE memory
except AttributeError:
    pass

print(f"   ✓ Dual T2V & I2V Models ready on {DEVICE}\n")

# ── FastAPI app ───────────────────────────────────────────────
app = FastAPI(title="Framegen Local Inference")
app.mount("/videos", StaticFiles(directory=str(VIDEOS_DIR)), name="videos")

# in-memory prediction store  { id → { status, output, error, logs } }
predictions: dict = {}
predictions_lock = threading.Lock()


# ── generation worker (runs in background thread) ─────────────
import urllib.request
from PIL import Image
from io import BytesIO

inference_lock = threading.Lock() # Strictly 1 active ML execution to prevent swapping

def _generate(pred_id: str, prompt: str, negative_prompt: str, num_frames: int, image_url: str):
    def update(**kw):
        with predictions_lock:
            predictions[pred_id].update(kw)

    try:
        update(status="processing", logs="Waiting in queue…")
        with inference_lock: # Thread freezes here if GPU isn't ready
            update(status="processing", logs="Generating frames on M1 GPU (NOS active)…")

            # M1 MPS memory budget: 25 frames ≈ 1.5s @ 16fps, generates in ~3-5 min on M1 16GB
            # 49 frames hits 8-12 min which causes client timeout
            frames_clamped = max(25, min(int(num_frames), 25))
            steps = 20  # 20 steps: fast enough on M1, still good quality
            
            if image_url:
                try:
                    if image_url.startswith("http"):
                        req = urllib.request.Request(image_url, headers={'User-Agent': 'Mozilla/5.0'})
                        with urllib.request.urlopen(req) as response:
                            input_img = Image.open(BytesIO(response.read())).convert("RGB")
                    else:
                        input_img = Image.open(image_url).convert("RGB")
                        
                    input_img = input_img.resize((704, 480))
                    result = pipe_i2v(
                        image=input_img,
                        prompt=prompt,
                        negative_prompt=negative_prompt or "blurry, low quality",
                        num_frames=frames_clamped,
                        width=704, height=480,
                        num_inference_steps=steps,
                        guidance_scale=3.0,
                    )
                except Exception as img_err:
                    print(f"   ! I2V load failed ({img_err}), falling back to T2V")
                    result = pipe(
                        prompt=prompt,
                        negative_prompt=negative_prompt or "blurry, low quality",
                        num_frames=frames_clamped,
                        width=704, height=480,
                        num_inference_steps=steps, guidance_scale=3.0,
                    )
            else:
                result = pipe(
                    prompt=prompt,
                    negative_prompt=negative_prompt or "blurry, low quality, static, no motion",
                    num_frames=frames_clamped,
                    width=704, height=480,
                    num_inference_steps=steps,
                    guidance_scale=3.0,
                )

            frames = result.frames[0]   # list of PIL Images

            out_path = VIDEOS_DIR / f"{pred_id}.mp4"
            export_to_video(frames, str(out_path), fps=16)

            update(status="succeeded", output=f"http://localhost:8000/videos/{pred_id}.mp4", logs="Done ✓")
            print(f"   ✓ {pred_id[:8]}… complete → {out_path.name}")

    except Exception as exc:
        update(status="failed", error=str(exc), logs=str(exc))
        print(f"   ✗ {pred_id[:8]}… failed: {exc}")
    finally:
        # Free MPS VRAM after every generation so next run doesn't OOM
        if torch.backends.mps.is_available():
            torch.mps.empty_cache()
            print("   ♻ MPS cache cleared")



# ── endpoints ─────────────────────────────────────────────────
class PredictionRequest(BaseModel):
    input: dict


@app.post("/predictions")
def create_prediction(req: PredictionRequest):
    pred_id        = str(uuid.uuid4())
    prompt         = req.input.get("prompt", "")
    negative_prompt= req.input.get("negative_prompt", "")
    num_frames     = req.input.get("num_frames", 25)   # 25 = ~1.5s @ 16fps, ~3-5min on M1 16GB
    image_url      = req.input.get("image_url", None)

    with predictions_lock:
        predictions[pred_id] = {
            "status": "starting",
            "output": None,
            "error":  None,
            "logs":   "Queued…",
        }

    t = threading.Thread(
        target=_generate,
        args=(pred_id, prompt, negative_prompt, num_frames, image_url),
        daemon=True,
    )
    t.start()

    return {"id": pred_id, "status": "starting"}


@app.get("/predictions/{pred_id}")
def get_prediction(pred_id: str):
    with predictions_lock:
        pred = predictions.get(pred_id)
    if not pred:
        return JSONResponse(
            status_code=404,
            content={"status": "failed", "error": "Prediction not found"},
        )
    return {
        "id":     pred_id,
        "status": pred["status"],
        "output": pred.get("output"),
        "error":  pred.get("error"),
        "logs":   pred.get("logs", ""),
    }


@app.get("/health")
def health():
    return {
        "ok":     True,
        "device": DEVICE,
        "model":  "LTX-Video (Lightricks/LTX-Video)",
        "dtype":  str(DTYPE),
    }


@app.post("/api/scan-faces")
async def scan_faces(req: Request):
    try:
        data = await req.json()
        ref_image = data.get("ref_image")
        videos_dir = data.get("videos_dir")
        target_sec = float(data.get("target_sec", 5.0))
        
        import asyncio
        loop = asyncio.get_event_loop()
        
        def run_cv_scan():
            import cv2
            import glob
            import os
            import subprocess
            import tempfile
            import torch
            from uuid import uuid4
            from facenet_pytorch import MTCNN, InceptionResnetV1
            from PIL import Image
            
            if not os.path.exists(ref_image):
                return {"error": f"Reference image not found at {ref_image}"}
                
            device = torch.device('mps' if torch.backends.mps.is_available() else 'cpu')
            mtcnn = MTCNN(keep_all=False, device=device)
            resnet = InceptionResnetV1(pretrained='vggface2').eval().to(device)
            
            ref_pil = Image.open(ref_image).convert('RGB')
            ref_tensor = mtcnn(ref_pil)
            if ref_tensor is None:
                return {"error": "No face found in reference image"}
            ref_encoding = resnet(ref_tensor.unsqueeze(0).to(device)).detach().cpu()
            
            vid_files = glob.glob(os.path.join(videos_dir, "**/*.mp4"), recursive=True)
            if not vid_files:
                return {"error": f"No MP4 files found in archives: {videos_dir}"}
                
            found_segments = []
            total_found_sec = 0.0
            
            for vid in vid_files:
                cap = cv2.VideoCapture(vid)
                fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
                frame_skip = int(fps / 2) # Sample 2 frames per second
                
                current_seg_start = None
                frame_idx = 0
                
                while cap.isOpened() and total_found_sec < target_sec:
                    ret, frame = cap.read()
                    if not ret: break
                    
                    if frame_idx % frame_skip == 0:
                        rgb_frame = cv2.cvtColor(cv2.resize(frame, (0, 0), fx=0.5, fy=0.5), cv2.COLOR_BGR2RGB)
                        pil_frame = Image.fromarray(rgb_frame)
                        
                        try:
                            # We use MTCNN to get faces
                            face_tensors = mtcnn(pil_frame)
                            match = False
                            if face_tensors is not None:
                                if len(face_tensors.shape) == 3: face_tensors = face_tensors.unsqueeze(0)
                                encs = resnet(face_tensors.to(device)).detach().cpu()
                                
                                for enc in encs:
                                    dist = (ref_encoding - enc.unsqueeze(0)).norm().item()
                                    if dist < 0.8: # Threshold for Facenet
                                        match = True
                                        break
                                        
                            sec = frame_idx / fps
                            if match:
                                if current_seg_start is None: current_seg_start = sec
                            else:
                                if current_seg_start is not None:
                                    duration = sec - current_seg_start
                                    if duration >= 1.0: # Enforce 1 second minimum loop
                                        found_segments.append({"file": vid, "start": current_seg_start, "duration": duration})
                                        total_found_sec += duration
                                    current_seg_start = None
                        except Exception as e:
                            pass # Skip frame if MTCNN fails tracking
                                
                    frame_idx += 1
                    
                if current_seg_start is not None and total_found_sec < target_sec:
                    sec = frame_idx / fps
                    duration = sec - current_seg_start
                    if duration >= 1.0:
                        found_segments.append({"file": vid, "start": current_seg_start, "duration": duration})
                        total_found_sec += duration
                        
                cap.release()
                if total_found_sec >= target_sec: break
                    
            if not found_segments:
                return {"error": "Could not find enough matching footage in the archive for this actor."}
                
            out_name = f"archive_{uuid4().hex[:8]}.mp4"
            out_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "media", "outputs", out_name)
            os.makedirs(os.path.dirname(out_path), exist_ok=True)
            
            with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
                for seg in found_segments:
                    f.write(f"file '{os.path.abspath(seg['file'])}'\n")
                    f.write(f"inpoint {seg['start']}\n")
                    f.write(f"duration {seg['duration']}\n")
                concat_path = f.name
                
            # Splicing sequence
            subprocess.run([
                "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat_path,
                "-c:v", "libx264", "-c:a", "aac", "-t", str(target_sec), out_path
            ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            
            os.remove(concat_path)
            # Match Framegen absolute media serving path
            return {"output": f"http://localhost:{int(os.environ.get('PORT', 8080))}/media/outputs/{out_name}", "segments": found_segments}
            
        return await loop.run_in_executor(None, run_cv_scan)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}



# ── Netflix-Style Face Archive Endpoints ─────────────────────────────────

FACE_INDEX_SUFFIX = ".face_index.json"
_face_model_lock = threading.Lock()
_face_models = {}

def _get_face_models():
    """Lazy-load MTCNN + InceptionResnetV1 — only when first needed."""
    global _face_models
    with _face_model_lock:
        if not _face_models:
            from facenet_pytorch import MTCNN, InceptionResnetV1
            device = torch.device('mps' if torch.backends.mps.is_available() else 'cpu')
            _face_models['mtcnn'] = MTCNN(keep_all=True, device=device)
            _face_models['resnet'] = InceptionResnetV1(pretrained='vggface2').eval().to(device)
            _face_models['device'] = device
        return _face_models


def _index_video(video_path: str, force: bool = False) -> dict:
    """Build or load a per-video face embedding index. Cache-first, zero re-work."""
    import cv2, json
    from PIL import Image

    index_path = video_path + FACE_INDEX_SUFFIX
    if not force and os.path.exists(index_path):
        with open(index_path) as f:
            return json.load(f)

    models = _get_face_models()
    mtcnn, resnet, device = models['mtcnn'], models['resnet'], models['device']

    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    frame_skip = max(1, int(fps / 2))  # sample ~2 fps
    frame_idx = 0
    entries = []

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        if frame_idx % frame_skip == 0:
            try:
                rgb = cv2.cvtColor(cv2.resize(frame, (0, 0), fx=0.5, fy=0.5), cv2.COLOR_BGR2RGB)
                pil = Image.fromarray(rgb)
                boxes, probs = mtcnn.detect(pil)
                faces = mtcnn(pil)
                if faces is not None and boxes is not None:
                    import torch as _torch
                    if len(faces.shape) == 3:
                        faces = faces.unsqueeze(0)
                    encs = resnet(faces.to(device)).detach().cpu()
                    for i, enc in enumerate(encs):
                        confidence = float(probs[i]) if probs is not None else 0.9
                        entries.append({
                            "ts": round(frame_idx / fps, 3),
                            "enc": enc.tolist(),
                            "conf": confidence,
                        })
            except Exception:
                pass
        frame_idx += 1
    cap.release()

    result = {"video": video_path, "fps": fps, "frames": frame_idx, "entries": entries}
    with open(index_path, "w") as f:
        import json as _json
        _json.dump(result, f)
    return result


def _search_index(index: dict, ref_enc_list: list, threshold: float = 0.75) -> list:
    """Find continuous clips where reference face appears."""
    import torch as _torch
    ref = _torch.tensor(ref_enc_list)
    matches = []
    for entry in index.get("entries", []):
        enc = _torch.tensor(entry["enc"])
        dist = (ref - enc).norm().item()
        if dist < threshold:
            matches.append({"ts": entry["ts"], "dist": dist})

    # Merge adjacent timestamps into continuous clips
    clips, gap = [], 1.5
    for m in sorted(matches, key=lambda x: x["ts"]):
        if clips and m["ts"] - clips[-1]["end"] < gap:
            clips[-1]["end"] = m["ts"]
            clips[-1]["score"] = min(clips[-1]["score"], m["dist"])
        else:
            clips.append({"start": m["ts"], "end": m["ts"] + 2.0, "score": m["dist"]})
    return [{"start": c["start"], "duration": round(c["end"] - c["start"] + 0.5, 2),
             "score": round(1 - c["score"], 3)} for c in clips if c["end"] - c["start"] > 0.5]


@app.post("/api/face-index")
async def face_index_endpoint(req: Request):
    """Lazy per-video face indexer — returns immediately if cache exists."""
    try:
        data = await req.json()
        video_path = data.get("video_path", "")
        force = data.get("force", False)
        if not os.path.exists(video_path):
            return JSONResponse({"error": f"Video not found: {video_path}"}, status_code=404)
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, lambda: _index_video(video_path, force))
        return {"indexed": True, "segments": len(result.get("entries", [])),
                "cached": os.path.exists(video_path + FACE_INDEX_SUFFIX), "video": video_path}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.post("/api/face-search-video")
async def face_search_video(req: Request):
    """Search a video's cached index for a reference face embedding."""
    try:
        data = await req.json()
        video_path = data.get("video_path", "")
        ref_image_path = data.get("ref_image_path", "")
        ref_enc_list = data.get("ref_enc")  # pre-computed embedding (optional)
        threshold = float(data.get("threshold", 0.75))
        target_sec = float(data.get("target_sec", 5.0))

        if not os.path.exists(video_path):
            return JSONResponse({"error": f"Video not found"}, status_code=404)

        async def run():
            # Compute ref encoding if not passed directly
            if ref_enc_list is None:
                if not ref_image_path or not os.path.exists(ref_image_path):
                    return {"error": "ref_image_path required if ref_enc not provided"}
                from PIL import Image
                models = _get_face_models()
                ref_pil = Image.open(ref_image_path).convert("RGB")
                ref_tensor = models['mtcnn'](ref_pil)
                if ref_tensor is None:
                    return {"error": "No face detected in reference image"}
                if len(ref_tensor.shape) == 3:
                    ref_tensor = ref_tensor.unsqueeze(0)
                enc = models['resnet'](ref_tensor.to(models['device'])).detach().cpu()
                enc_list = enc[0].tolist()
            else:
                enc_list = ref_enc_list

            index = _index_video(video_path)
            clips = _search_index(index, enc_list, threshold)
            # Trim to target_sec total
            out, total = [], 0.0
            for c in clips:
                if total >= target_sec:
                    break
                out.append(c)
                total += c["duration"]
            return {"clips": out, "video": video_path, "total_sec": round(total, 2)}

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, lambda: asyncio.run(run()) if not asyncio.get_event_loop().is_running() else None) or await run()
    except Exception as e:
        import traceback; traceback.print_exc()
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/api/face-index-status")
async def face_index_status(videos_dir: str = ""):
    """List all indexed video archives and their coverage stats."""
    import glob, json
    search_dirs = [videos_dir] if videos_dir else []
    # Auto-discover common media directories
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    for d in ["media/videos", "media/outputs", "media"]:
        p = os.path.join(base, d)
        if os.path.isdir(p):
            search_dirs.append(p)

    indexed = []
    for d in search_dirs:
        for idx_file in glob.glob(os.path.join(d, "**", "*" + FACE_INDEX_SUFFIX), recursive=True):
            video_file = idx_file[:-len(FACE_INDEX_SUFFIX)]
            if not os.path.exists(video_file):
                continue
            try:
                with open(idx_file) as f:
                    data = json.load(f)
                indexed.append({
                    "video": video_file,
                    "basename": os.path.basename(video_file),
                    "segments": len(data.get("entries", [])),
                    "frames": data.get("frames", 0),
                    "size_mb": round(os.path.getsize(video_file) / 1e6, 1),
                    "indexed_at": os.path.getmtime(idx_file),
                })
            except Exception:
                pass
    return {"indexed": indexed, "total": len(indexed)}


@app.post("/api/face-encode")
async def face_encode(req: Request):
    """Encode a reference image → 512-dim embedding for use in subsequent searches."""
    try:
        data = await req.json()
        ref_image_path = data.get("ref_image_path", "")
        if not os.path.exists(ref_image_path):
            return JSONResponse({"error": "Image not found"}, status_code=404)

        def run():
            from PIL import Image
            models = _get_face_models()
            pil = Image.open(ref_image_path).convert("RGB")
            tensor = models['mtcnn'](pil)
            if tensor is None:
                return {"error": "No face detected"}
            if len(tensor.shape) == 3:
                tensor = tensor.unsqueeze(0)
            enc = models['resnet'](tensor.to(models['device'])).detach().cpu()
            return {"encoding": enc[0].tolist()}

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, run)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


# ── TTS / Voice Synthesis ──────────────────────────────────────
# Uses edge-tts (Microsoft neural voices, free, no API key)
import asyncio as _asyncio
import edge_tts as _edge_tts

TTS_DIR = Path(os.environ.get("FRAMEGEN_TTS", "/tmp/framegen-tts"))
TTS_DIR.mkdir(parents=True, exist_ok=True)

# Character role → voice mapping (full Microsoft Neural voice names)
VOICE_MAP = {
    "narrator":    "en-US-GuyNeural",
    "protagonist": "en-US-AriaNeural",
    "hero":        "en-GB-RyanNeural",
    "villain":     "en-US-ChristopherNeural",
    "scientist":   "en-US-EricNeural",
    "teacher":     "en-US-AmberNeural",
    "child":       "en-US-AnaNeural",
    "elder":       "en-US-DavisNeural",
    "default":     "en-US-GuyNeural",
}

ALL_VOICES = [
    {"id": "en-US-GuyNeural",         "label": "Guy (Narrator)",      "role": "narrator"},
    {"id": "en-US-AriaNeural",        "label": "Aria (Protagonist)",  "role": "protagonist"},
    {"id": "en-GB-RyanNeural",        "label": "Ryan (Hero)",         "role": "hero"},
    {"id": "en-US-ChristopherNeural", "label": "Christopher (Villain)","role": "villain"},
    {"id": "en-US-EricNeural",        "label": "Eric (Scientist)",    "role": "scientist"},
    {"id": "en-US-AmberNeural",       "label": "Amber (Teacher)",     "role": "teacher"},
    {"id": "en-US-AnaNeural",         "label": "Ana (Child)",         "role": "child"},
    {"id": "en-US-DavisNeural",       "label": "Davis (Elder)",       "role": "elder"},
    {"id": "en-US-JennyNeural",       "label": "Jenny (Guide)",       "role": "default"},
    {"id": "en-IN-NeerjaNeural",      "label": "Neerja (India EN)",   "role": "default"},
]

@app.get("/tts/voices")
async def tts_voices():
    return {"voices": ALL_VOICES, "voiceMap": VOICE_MAP}

@app.post("/tts")
async def tts_generate(req: Request):
    """
    Generate speech audio from text.
    Body: { text, voice?, rate?, pitch?, outputId? }
    Returns: { audioFile: "/tts/<id>.mp3", durationSec }
    """
    try:
        data = await req.json()
        text  = data.get("text", "").strip()
        if not text:
            return JSONResponse({"error": "text is required"}, status_code=400)

        voice  = data.get("voice", VOICE_MAP["narrator"])
        rate   = data.get("rate", "+0%")     # e.g. "+10%" faster, "-10%" slower
        pitch  = data.get("pitch", "+0Hz")   # e.g. "+50Hz" higher
        out_id = data.get("outputId", str(uuid.uuid4()))
        out_file = TTS_DIR / f"{out_id}.mp3"

        # Run edge-tts in async thread
        communicate = _edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
        await communicate.save(str(out_file))

        # Probe duration via ffprobe
        import subprocess
        probe = subprocess.run(
            ["ffprobe", "-v", "quiet", "-print_format", "json",
             "-show_streams", str(out_file)],
            capture_output=True, text=True
        )
        duration_sec = 0.0
        try:
            import json as _json
            streams = _json.loads(probe.stdout).get("streams", [])
            if streams:
                duration_sec = float(streams[0].get("duration", 0))
        except Exception:
            pass

        return {
            "audioFile": f"/tts/{out_id}.mp3",
            "durationSec": round(duration_sec, 2),
            "outputId": out_id,
        }
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.post("/tts/batch")
async def tts_batch(req: Request):
    """
    Generate TTS for multiple scenes in parallel.
    Body: { scenes: [{id, text, voice?, rate?, pitch?}] }
    Returns: { results: [{id, audioFile, durationSec}] }
    """
    try:
        data   = await req.json()
        scenes = data.get("scenes", [])
        if not scenes:
            return JSONResponse({"error": "scenes list required"}, status_code=400)

        async def _gen_one(scene):
            out_id = str(uuid.uuid4())
            out_file = TTS_DIR / f"{out_id}.mp3"
            voice  = scene.get("voice", VOICE_MAP.get(scene.get("role",""), VOICE_MAP["narrator"]))
            rate   = scene.get("rate", "+0%")
            pitch  = scene.get("pitch", "+0Hz")
            text   = scene.get("text", "").strip()
            if not text:
                return {"id": scene.get("id"), "audioFile": None, "durationSec": 0}
            communicate = _edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
            await communicate.save(str(out_file))
            return {"id": scene.get("id"), "audioFile": f"/tts/{out_id}.mp3", "outputId": out_id, "durationSec": 0}

        results = await _asyncio.gather(*[_gen_one(s) for s in scenes])
        return {"results": list(results)}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


from fastapi.staticfiles import StaticFiles as _SM
# Serve TTS audio files
try:
    app.mount("/tts", _SM(directory=str(TTS_DIR), name="tts"))
except Exception:
    pass  # already mounted


# ── entry point ───────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    print(f"   Server → http://localhost:{port}\n")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="warning")

