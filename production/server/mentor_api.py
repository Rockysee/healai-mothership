"""
Mothership API — v1.2
Endpoints:
  POST /api/mentor       → AI mentor conversation (Gemini)
  POST /api/voice        → Acoustic biomarker analysis (voice_analyzer.py)
  POST /api/lead         → WhatsApp lead webhook (integrations.py)
  GET  /api/health       → Service health check

Run standalone: uvicorn server.mentor_api:app --reload --port 8001
Or mount into existing api.py as a sub-router.

Goldenhour Systems Pvt Ltd · ambulance.run
"""

import os
import sys
import json
import tempfile
import subprocess
import urllib.request
import io
from pathlib import Path
from typing import List, Optional, Dict, Any

import numpy as np
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ─── Path bootstrap so we can import sibling modules ────────────────────────
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from voice_analyzer import create_analyzer
from integrations import create_orchestrator
from server.knowledge_base import get_system_prompt
from server.profile_manager import get_profile_manager

# ────────────────────────────────────────────────────────────────────────────

app = FastAPI(title="Mothership API", version="1.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── genextAI (powered by Google Generative Language API) ──
GENEXTAI_KEY   = os.environ.get("GENEXTAI_API_KEY", "") or os.environ.get("GEMINI_API_KEY", "")
GENEXTAI_MODEL = "gemini-2.0-flash"
GENEXTAI_URL   = (
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GENEXTAI_MODEL}:generateContent"
)

_analyzer     = create_analyzer()
_orchestrator = create_orchestrator()


# ═══════════════════════════════════════════════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

class ChatMessage(BaseModel):
    role: str
    content: str


class MentorRequest(BaseModel):
    mentorId: str
    systemPrompt: str
    message: str
    history: Optional[List[ChatMessage]] = []
    userMetadata: Optional[Dict[str, Any]] = None # { archetype, healthScore, name }


class MentorResponse(BaseModel):
    response: str
    mentorId: str


class LeadPayload(BaseModel):
    name: str
    whatsapp: str
    archetypeId: str
    archetypeTitle: str
    healthScore: int


# ═══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def _webm_to_numpy(audio_bytes: bytes, target_sr: int = 16000):
    """
    Convert WebM/OGG/any browser audio bytes → mono numpy float32 array.
    Requires ffmpeg on PATH. Falls back to silence array on error.
    """
    try:
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
            f.write(audio_bytes)
            src_path = f.name

        result = subprocess.run(
            [
                "ffmpeg", "-y",
                "-i", src_path,
                "-ac", "1",            # mono
                "-ar", str(target_sr), # resample
                "-f", "f32le",         # raw float32 little-endian
                "-",                   # stdout
            ],
            capture_output=True,
            timeout=15,
        )
        os.unlink(src_path)

        if result.returncode != 0:
            return np.zeros(target_sr * 3, dtype=np.float32), target_sr

        audio = np.frombuffer(result.stdout, dtype=np.float32)
        return audio, target_sr

    except Exception:
        return np.zeros(target_sr * 3, dtype=np.float32), target_sr


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/mentor", response_model=MentorResponse)
def chat_with_mentor(req: MentorRequest):
    """Send a message to an AI mentor via genextAI."""
    if not GENEXTAI_KEY:
        raise HTTPException(500, "GENEXTAI_API_KEY not configured. Set GENEXTAI_API_KEY in .env.local")

    contents = []
    for msg in (req.history or []):
        role = "user" if msg.role == "user" else "model"
        contents.append({"role": role, "parts": [{"text": msg.content}]})
    contents.append({"role": "user", "parts": [{"text": req.message}]})

    # Inject Mothership Knowledge Base
    meta = req.userMetadata or {}
    kb_prompt = get_system_prompt(meta.get("archetype"), meta.get("healthScore"))
    full_system_prompt = f"{kb_prompt}\n\nUSER-SPECIFIC INSTRUCTION:\n{req.systemPrompt}"

    payload = json.dumps({
        "system_instruction": {"parts": [{"text": full_system_prompt}]},
        "contents": contents,
        "generationConfig": {
            "temperature": 0.8,
            "maxOutputTokens": 300,
        },
    }).encode("utf-8")

    try:
        api_req = urllib.request.Request(
            f"{GENEXTAI_URL}?key={GENEXTAI_KEY}",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(api_req, timeout=15) as res:
            data = json.loads(res.read().decode())
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            return MentorResponse(response=text, mentorId=req.mentorId)
    except Exception as e:
        raise HTTPException(502, f"AI engine error: {str(e)}")


@app.post("/api/voice")
async def analyze_voice(audio: UploadFile = File(...)):
    """
    Receive a browser audio recording (WebM/OGG) and return acoustic stress score.
    Bridges to voice_analyzer.py → AcousticBiomarkerAnalyzer.

    Returns:
        {
          "stress_score": float (0.0–1.0),
          "interpretation": str,
          "confidence": float,
          "features": { pitch, prosody, temporal }
        }
    """
    audio_bytes = await audio.read()

    if len(audio_bytes) < 500:
        raise HTTPException(400, "Audio file too small — minimum 500 bytes required.")

    audio_data, sample_rate = _webm_to_numpy(audio_bytes)

    if len(audio_data) < sample_rate:
        raise HTTPException(400, "Audio too short — minimum 1 second required.")

    result = _analyzer.analyze_audio_array(audio_data, sample_rate)

    return {
        "stress_score":    result.stress_score,
        "interpretation":  result.interpretation,
        "confidence":      result.overall_confidence,
        "features": {
            "pitch":    result.pitch_features,
            "prosody":  result.prosody_features,
            "temporal": result.temporal_features,
        },
    }


@app.post("/api/profile")
def save_user_profile(user_id: str, data: Dict[str, Any]):
    """Save or update a user profile (archetype, scores, etc.)"""
    mgr = get_profile_manager()
    return mgr.save_profile(user_id, data)


@app.get("/api/profile/{user_id}")
def load_user_profile(user_id: str):
    """Load a user profile"""
    mgr = get_profile_manager()
    profile = mgr.load_profile(user_id)
    if not profile:
        raise HTTPException(404, "Profile not found")
    return profile


@app.post("/api/lead")
def capture_lead(lead: LeadPayload):
    """
    Register a new lead (name + WhatsApp) captured after the archetype assessment.
    1. Fires a Make.com webhook with lead data.
    2. Sends a personalised WhatsApp welcome message.

    Returns combined status from both integrations.
    """
    # Compose personalised WhatsApp onboarding message
    wa_message = (
        f"Hi {lead.name}! 🌟\n\n"
        f"You've been identified as *{lead.archetypeTitle}* "
        f"with a Resilience Score of *{lead.healthScore}/100*.\n\n"
        f"Your 5-Day Wellbeing Challenge starts now:\n"
        f"Day 1 → 10-min morning breathwork\n"
        f"Day 2 → Gratitude voice note\n"
        f"Day 3 → Digital sunset at 9 PM\n"
        f"Day 4 → Talk to your AI Life Guru\n"
        f"Day 5 → Voice mood check-in\n\n"
        f"Reply *START* to begin your journey. 💚\n"
        f"— The Mothership, Goldenhour Systems"
    )

    results = {
        "lead": {
            "name":           lead.name,
            "whatsapp":       lead.whatsapp,
            "archetypeId":    lead.archetypeId,
            "archetypeTitle": lead.archetypeTitle,
            "healthScore":    lead.healthScore,
        }
    }

    # Make.com webhook (re-uses orchestrator but with "new_lead" payload)
    if _orchestrator.make_webhook_url:
        import urllib.request as ur
        payload = json.dumps({
            "event":          "new_lead",
            "name":           lead.name,
            "whatsapp":       lead.whatsapp,
            "archetypeId":    lead.archetypeId,
            "archetypeTitle": lead.archetypeTitle,
            "healthScore":    lead.healthScore,
        }).encode("utf-8")
        try:
            req = ur.Request(
                _orchestrator.make_webhook_url,
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with ur.urlopen(req, timeout=10) as r:
                results["make_webhook"] = {"status": "success", "http_status": r.status}
        except Exception as e:
            results["make_webhook"] = {"status": "error", "message": str(e)}
    else:
        results["make_webhook"] = {"status": "skipped", "message": "MAKE_COM_WEBHOOK_URL not set"}

    # WhatsApp welcome message
    results["whatsapp"] = _orchestrator.send_whatsapp_support(lead.whatsapp, wa_message)

    return results


@app.get("/api/health")
def health():
    return {
        "status":            "ok",
        "service":           "mothership-api",
        "version":           "1.2.0",
        "genextai_configured": bool(GENEXTAI_KEY),
        "make_configured":   bool(_orchestrator.make_webhook_url),
        "whatsapp_configured": bool(_orchestrator.whatsapp_token),
    }
