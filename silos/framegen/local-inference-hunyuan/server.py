#!/usr/bin/env python3
"""
FRAMEGEN — HunyuanVideo Local Inference Server
Tencent HunyuanVideo (13B params) — highest open-source quality, free, runs locally.

Adaptive to available unified memory:
  ≥ 64 GB  →  720p · 85 frames · model_cpu_offload
  ≥ 32 GB  →  480p · 61 frames · model_cpu_offload
  ≥ 16 GB  →  480p · 49 frames · sequential_cpu_offload  (M1 safe)

API (mirrors LTX-Video server format so Framegen polls identically):
    POST /predictions   { input: { prompt, negative_prompt, num_frames, image_url?, quality? } }
    GET  /predictions/:id
    GET  /health
    GET  /videos/:filename  ← generated .mp4 files
"""

import os, uuid, threading, time
from pathlib import Path

import torch
import psutil
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# ── output directory ───────────────────────────────────────────
VIDEOS_DIR = Path(os.environ.get("FRAMEGEN_VIDEOS", "/tmp/hunyuan-framegen-videos"))
VIDEOS_DIR.mkdir(parents=True, exist_ok=True)

# ── device + dtype ─────────────────────────────────────────────
if torch.backends.mps.is_available():
    DEVICE = "mps"
    # MPS: float16 (bfloat16 unsupported on M1; float16 safer on M2 too)
    TRANSFORMER_DTYPE = torch.float16
    PIPE_DTYPE        = torch.float16
elif torch.cuda.is_available():
    DEVICE = "cuda"
    # CUDA: bfloat16 transformer for efficiency, float16 VAE
    TRANSFORMER_DTYPE = torch.bfloat16
    PIPE_DTYPE        = torch.float16
else:
    DEVICE = "cpu"
    TRANSFORMER_DTYPE = torch.float32
    PIPE_DTYPE        = torch.float32

# ── adaptive quality based on available RAM ────────────────────
total_ram_gb = psutil.virtual_memory().total / (1024 ** 3)

if DEVICE == "mps":
    if total_ram_gb >= 64:
        OFFLOAD_MODE     = "model"      # enable_model_cpu_offload
        MAX_FRAMES       = 85           # ~3.5 s at 24 fps
        MAX_RES          = "720p"
        DEFAULT_W        = 1280
        DEFAULT_H        = 720
    elif total_ram_gb >= 32:
        OFFLOAD_MODE     = "model"
        MAX_FRAMES       = 61           # ~2.5 s at 24 fps
        MAX_RES          = "480p"
        DEFAULT_W        = 854
        DEFAULT_H        = 480
    else:
        # M1 / M2 base (16 GB) — most aggressive offload
        OFFLOAD_MODE     = "sequential"
        MAX_FRAMES       = 49           # ~2 s at 24 fps
        MAX_RES          = "480p"
        DEFAULT_W        = 854
        DEFAULT_H        = 480
elif DEVICE == "cuda":
    OFFLOAD_MODE         = "none"
    MAX_FRAMES           = 121          # 5 s at 24 fps
    MAX_RES              = "720p"
    DEFAULT_W            = 1280
    DEFAULT_H            = 720
else:
    OFFLOAD_MODE         = "sequential"
    MAX_FRAMES           = 25
    MAX_RES              = "480p"
    DEFAULT_W            = 854
    DEFAULT_H            = 480

PORT = int(os.environ.get("PORT", 8001))

print(f"\n🎬  FRAMEGEN — HunyuanVideo Local Inference")
print(f"   Device    : {DEVICE}  ({total_ram_gb:.0f} GB RAM detected)")
print(f"   Dtype     : transformer={TRANSFORMER_DTYPE}  pipe={PIPE_DTYPE}")
print(f"   Offload   : {OFFLOAD_MODE}")
print(f"   Max res   : {MAX_RES}  |  Max frames : {MAX_FRAMES}")
print(f"   Output    : {VIDEOS_DIR}")
print(f"\n   Loading HunyuanVideo… (first run downloads ~87 GB — go make coffee)\n")

# ── load model ────────────────────────────────────────────────
from diffusers import HunyuanVideoPipeline, HunyuanVideoTransformer3DModel
from diffusers.utils import export_to_video

# Transformer loaded in its own dtype to conserve peak memory during load
transformer = HunyuanVideoTransformer3DModel.from_pretrained(
    "hunyuanvideo-community/HunyuanVideo",
    subfolder="transformer",
    torch_dtype=TRANSFORMER_DTYPE,
)

pipe = HunyuanVideoPipeline.from_pretrained(
    "hunyuanvideo-community/HunyuanVideo",
    transformer=transformer,
    torch_dtype=PIPE_DTYPE,
)

# ── apply memory strategy ─────────────────────────────────────
if OFFLOAD_MODE == "sequential":
    # Each transformer layer offloaded to CPU between forward passes.
    # Slowest but fits in 16 GB MPS.
    pipe.enable_sequential_cpu_offload()
elif OFFLOAD_MODE == "model":
    # Whole sub-modules offloaded between uses. Faster than sequential.
    pipe.enable_model_cpu_offload()
else:
    # CUDA with plenty of VRAM — keep everything on GPU
    pipe = pipe.to(DEVICE)

# VAE tiling + slicing — cut peak memory during decode by ~50 %
pipe.vae.enable_tiling()
try:
    pipe.vae.enable_slicing()
except AttributeError:
    pass

print(f"   ✓ HunyuanVideo ready  [{OFFLOAD_MODE} offload, {MAX_RES} max, {MAX_FRAMES} max frames]\n")

# ── optional I2V pipeline (lazy-loaded on first I2V request) ──
_pipe_i2v       = None
_pipe_i2v_lock  = threading.Lock()
_i2v_available  = None   # None = untested, True / False after first attempt

def _get_i2v_pipe():
    """Lazy-load HunyuanVideo-I2V — shares VAE from T2V pipe to save RAM."""
    global _pipe_i2v, _i2v_available
    with _pipe_i2v_lock:
        if _i2v_available is not None:
            return _pipe_i2v

        try:
            from diffusers import HunyuanVideoImageToVideoPipeline
            _pipe_i2v = HunyuanVideoImageToVideoPipeline.from_pretrained(
                "hunyuanvideo-community/HunyuanVideo-I2V",
                vae=pipe.vae,           # share VAE — saves ~4 GB
                torch_dtype=PIPE_DTYPE,
            )
            if OFFLOAD_MODE == "sequential":
                _pipe_i2v.enable_sequential_cpu_offload()
            elif OFFLOAD_MODE == "model":
                _pipe_i2v.enable_model_cpu_offload()
            else:
                _pipe_i2v = _pipe_i2v.to(DEVICE)

            _i2v_available = True
            print("   ✓ HunyuanVideo-I2V loaded (shared VAE)")
        except Exception as e:
            _i2v_available = False
            print(f"   ⚠  HunyuanVideo-I2V unavailable ({e}) — I2V requests fall back to T2V")

        return _pipe_i2v


# ── FastAPI app ────────────────────────────────────────────────
app = FastAPI(title="Framegen HunyuanVideo Inference")
app.mount("/videos", StaticFiles(directory=str(VIDEOS_DIR)), name="videos")

predictions:      dict = {}
predictions_lock        = threading.Lock()
inference_lock          = threading.Lock()   # strictly 1 active generation


# ── generation worker ──────────────────────────────────────────
import urllib.request
from PIL import Image
from io import BytesIO

def _load_image(url: str) -> Image.Image | None:
    """Load an image from URL or file path; return None on failure."""
    try:
        if url.startswith("data:"):
            # base64-encoded data URL
            import base64, re
            match = re.match(r"data:image/[^;]+;base64,(.+)", url, re.DOTALL)
            if match:
                data = base64.b64decode(match.group(1))
                return Image.open(BytesIO(data)).convert("RGB")
        elif url.startswith("http"):
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=30) as r:
                return Image.open(BytesIO(r.read())).convert("RGB")
        else:
            return Image.open(url).convert("RGB")
    except Exception as e:
        print(f"   ! Image load failed ({e})")
        return None


def _resolve_resolution(quality: str, requested_w: int, requested_h: int):
    """Return (width, height) clamped to hardware limit."""
    if quality == "720p" and MAX_RES == "720p":
        return 1280, 720
    return 854, 480   # 480p default / fallback


def _generate(pred_id: str, prompt: str, negative_prompt: str,
              num_frames: int, image_url: str, quality: str):

    def update(**kw):
        with predictions_lock:
            predictions[pred_id].update(kw)

    try:
        update(status="processing", logs="Waiting in queue…")

        with inference_lock:
            update(status="processing", logs="Loading into GPU memory…")

            frames_clamped = min(int(num_frames), MAX_FRAMES)
            width, height  = _resolve_resolution(quality, DEFAULT_W, DEFAULT_H)

            # HunyuanVideo: 50 steps default — reduce on memory-constrained hardware
            steps = 50 if OFFLOAD_MODE == "none" else (40 if OFFLOAD_MODE == "model" else 30)

            input_image = _load_image(image_url) if image_url else None

            if input_image is not None:
                # Try dedicated I2V pipeline first
                i2v_pipe = _get_i2v_pipe()
                if i2v_pipe is not None and _i2v_available:
                    try:
                        update(logs=f"I2V — {width}×{height} · {frames_clamped} frames · {steps} steps…")
                        input_image_resized = input_image.resize((width, height), Image.LANCZOS)
                        result = i2v_pipe(
                            image=input_image_resized,
                            prompt=prompt,
                            negative_prompt=negative_prompt or "blurry, low quality, static, no motion",
                            num_frames=frames_clamped,
                            height=height,
                            width=width,
                            num_inference_steps=steps,
                            guidance_scale=6.0,
                            generator=torch.Generator(device="cpu"),
                        )
                    except Exception as i2v_err:
                        print(f"   ! I2V failed ({i2v_err}), falling back to T2V")
                        input_image = None   # force T2V path below
                else:
                    print("   ! I2V unavailable, falling back to T2V")
                    input_image = None

            if input_image is None:
                # Pure T2V generation
                update(logs=f"T2V — {width}×{height} · {frames_clamped} frames · {steps} steps…")
                result = pipe(
                    prompt=prompt,
                    negative_prompt=negative_prompt or "blurry, low quality, static, no motion",
                    num_frames=frames_clamped,
                    height=height,
                    width=width,
                    num_inference_steps=steps,
                    guidance_scale=6.0,
                    # embedded_guidance_scale is important for HunyuanVideo quality
                    embedded_guidance_scale=6.0,
                    generator=torch.Generator(device="cpu"),
                )

            # Export frames → .mp4 @ 24 fps
            frames    = result.frames[0]
            out_path  = VIDEOS_DIR / f"{pred_id}.mp4"
            export_to_video(frames, str(out_path), fps=24)

            update(
                status="succeeded",
                output=f"http://localhost:{PORT}/videos/{pred_id}.mp4",
                logs=f"Done ✓  ({width}×{height} · {frames_clamped} frames)",
            )
            print(f"   ✓ {pred_id[:8]}… → {out_path.name}  ({width}×{height}, {frames_clamped}f)")

    except Exception as exc:
        update(status="failed", error=str(exc), logs=str(exc))
        print(f"   ✗ {pred_id[:8]}… failed: {exc}")
    finally:
        if torch.backends.mps.is_available():
            torch.mps.empty_cache()
            print("   ♻ MPS cache cleared")
        elif torch.cuda.is_available():
            torch.cuda.empty_cache()
            print("   ♻ CUDA cache cleared")


# ── endpoints ──────────────────────────────────────────────────
class PredictionRequest(BaseModel):
    input: dict


@app.post("/predictions")
def create_prediction(req: PredictionRequest):
    pred_id         = str(uuid.uuid4())
    prompt          = req.input.get("prompt", "")
    negative_prompt = req.input.get("negative_prompt", "")
    num_frames      = req.input.get("num_frames", 49)
    image_url       = req.input.get("image_url", None)
    quality         = req.input.get("quality", "480p")   # "480p" | "720p"

    if not prompt.strip():
        return JSONResponse(status_code=400, content={"error": "prompt is required"})

    with predictions_lock:
        predictions[pred_id] = {
            "status": "starting",
            "output": None,
            "error":  None,
            "logs":   "Queued…",
        }

    t = threading.Thread(
        target=_generate,
        args=(pred_id, prompt, negative_prompt, num_frames, image_url, quality),
        daemon=True,
    )
    t.start()

    return {"id": pred_id, "status": "starting"}


@app.get("/predictions/{pred_id}")
def get_prediction(pred_id: str):
    with predictions_lock:
        pred = predictions.get(pred_id)
    if not pred:
        return JSONResponse(status_code=404, content={"status": "failed", "error": "Prediction not found"})
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
        "ok":          True,
        "device":      DEVICE,
        "model":       "HunyuanVideo (hunyuanvideo-community/HunyuanVideo)",
        "dtype":       str(PIPE_DTYPE),
        "offload":     OFFLOAD_MODE,
        "max_frames":  MAX_FRAMES,
        "max_res":     MAX_RES,
        "ram_gb":      round(total_ram_gb, 1),
        "i2v":         _i2v_available,
    }


# ── entry point ────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    print(f"   Server → http://localhost:{PORT}\n")
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="warning")
