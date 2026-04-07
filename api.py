"""
GoldenOS Mental Health API
FastAPI service exposing Resilience Matrix endpoints for MedRoute integration.

Endpoints:
  POST /screen      — PHQ-9 screening → health score + risk level
  POST /voice       — Audio file → stress score + interpretation
  GET  /patient/{id} — Fetch latest checkpoint for a patient
  POST /crisis      — Trigger crisis escalation (Tele-MANAS / ambulance.run)
  GET  /health      — Service health check

Run locally:  uvicorn api:app --reload --port 8000
Docs:         http://localhost:8000/docs
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import numpy as np
import soundfile as sf
import io
from datetime import datetime

from resilience_matrix import create_user_matrix, ResilienceLevel
from voice_analyzer import create_analyzer
from data_encryption import create_vault
from integrations import create_orchestrator
from repository import ProfileRepository

app = FastAPI(
    title="GoldenOS Mental Health API",
    description="Resilience Matrix screening and triage API for Mothership integration.",
    version="2.0.0",
    contact={"name": "Goldenhour Systems", "email": "hemant.thackeray@gmail.com"},
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Persistent Store ──────────────────────────────────────────────────────────
_repo = ProfileRepository()
_vault = create_vault()
_analyzer = create_analyzer()
_orchestrator = create_orchestrator()


# ── Schemas ────────────────────────────────────────────────────────────────────

class PHQ9Request(BaseModel):
    patient_id: str
    scores: List[int]
    run_reference: Optional[str] = None

class ScreeningResponse(BaseModel):
    patient_id: str
    phq9_total: int
    health_score: float
    mental_health: str
    resilience: str
    risk_flag: bool
    risk_label: str
    timestamp: str
    run_reference: Optional[str]

class VoiceResponse(BaseModel):
    patient_id: str
    stress_score: float
    confidence: float
    pitch_stability: float
    interpretation: str
    timestamp: str

class CrisisRequest(BaseModel):
    patient_id: str
    risk_level: str
    health_score: float
    phone_number: Optional[str] = None
    run_reference: Optional[str] = None

class PatientCheckpoint(BaseModel):
    patient_id: str
    health_score: float
    mental_health: str
    resilience: str
    risk_flag: bool
    timestamp: str
    screening_count: int

class LeadRequest(BaseModel):
    name: str
    whatsapp: str
    archetypeId: str
    archetypeTitle: str
    healthScore: float

class ProfileRequest(BaseModel):
    user_id: str
    archetype: Optional[Dict[str, Any]] = None
    lead: Optional[Dict[str, Any]] = None
    last_assessed: Optional[int] = None


# ── Risk label helper ──────────────────────────────────────────────────────────
def risk_label(phq9_total: int) -> str:
    if phq9_total < 5:  return "Minimal"
    if phq9_total < 10: return "Mild"
    if phq9_total < 15: return "Moderate"
    if phq9_total < 20: return "Moderately Severe"
    return "Severe"


# ── Endpoints ──────────────────────────────────────────────────────────────────

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "Mothership API",
        "version": "2.0.0",
        "timestamp": datetime.now().isoformat(),
    }


@app.post("/screen", response_model=ScreeningResponse)
def screen_patient(req: PHQ9Request):
    if len(req.scores) != 9:
        raise HTTPException(400, "Exactly 9 scores required.")
    
    matrix = _repo.get_matrix(req.patient_id)
    score_dict = {f"q_{i}": v for i, v in enumerate(req.scores)}
    cp = matrix.update_from_screening(score_dict)
    
    _repo.save_checkpoint(req.patient_id, cp)
    total = sum(req.scores)

    _vault.encrypt_health_record(
        req.patient_id,
        {"phq9_total": total, "run_ref": req.run_reference, "ts": cp.timestamp.isoformat()},
        purpose="screening",
    )

    return ScreeningResponse(
        patient_id=req.patient_id,
        phq9_total=total,
        health_score=round(cp.score, 1),
        mental_health=cp.mental_health.value,
        resilience=cp.resilience.value,
        risk_flag=cp.risk_flag,
        risk_label=risk_label(total),
        timestamp=cp.timestamp.isoformat(),
        run_reference=req.run_reference,
    )


@app.post("/voice", response_model=VoiceResponse)
async def analyze_voice(
    patient_id: str,
    file: UploadFile = File(...),
):
    contents = await file.read()
    try:
        audio, sr = sf.read(io.BytesIO(contents))
        if audio.ndim > 1: audio = audio.mean(axis=1)
        audio = audio.astype(np.float32)
    except Exception as e:
        raise HTTPException(400, f"Could not parse audio file: {e}")

    result = _analyzer.analyze_audio_array(audio, sr)
    matrix = _repo.get_matrix(patient_id)
    matrix.integrate_acoustic_marker(result.stress_score)
    
    # Save markers and the updated checkpoint if any
    _repo.save_acoustic_markers(patient_id, matrix.acoustic_markers)
    if matrix.checkpoints:
        _repo.save_checkpoint(patient_id, matrix.checkpoints[-1])

    _vault.encrypt_health_record(
        patient_id,
        {"stress": result.stress_score, "ts": result.timestamp.isoformat()},
        purpose="voice",
    )

    return VoiceResponse(
        patient_id=patient_id,
        stress_score=round(result.stress_score, 3),
        confidence=round(result.overall_confidence, 3),
        pitch_stability=round(result.pitch_features["pitch_stability"], 3),
        interpretation=result.interpretation,
        timestamp=result.timestamp.isoformat(),
    )


@app.get("/patient/{patient_id}", response_model=PatientCheckpoint)
def get_patient(patient_id: str):
    matrix = _repo.get_matrix(patient_id)
    cp = matrix.get_current_checkpoint()
    if not cp:
        raise HTTPException(404, f"No data found for patient '{patient_id}'.")

    return PatientCheckpoint(
        patient_id=patient_id,
        health_score=round(cp.score, 1),
        mental_health=cp.mental_health.value,
        resilience=cp.resilience.value,
        risk_flag=cp.risk_flag,
        timestamp=cp.timestamp.isoformat(),
        screening_count=len(matrix.checkpoints),
    )


@app.post("/crisis")
def trigger_crisis(req: CrisisRequest):
    results = _orchestrator.escalate_crisis(
        user_id=req.patient_id,
        risk_level=req.risk_level,
        score=req.health_score,
        phone_number=req.phone_number,
    )

    _vault.encrypt_health_record(
        req.patient_id,
        {
            "crisis_triggered": True,
            "risk_level": req.risk_level,
            "run_ref": req.run_reference,
            "ts": datetime.now().isoformat(),
        },
        purpose="crisis_escalation",
    )

    return {
        "status": "escalated",
        "patient_id": req.patient_id,
        "run_reference": req.run_reference,
        "results": results,
        "tele_manas_hotline": "14416",
        "timestamp": datetime.now().isoformat(),
    }


@app.post("/lead")
def save_lead(req: LeadRequest):
    """Save lead from frontend assessment gate."""
    user_id = f"lead_{int(datetime.now().timestamp())}" # In real app, associate with session
    _repo.save_lead(user_id, req.dict())
    return {"status": "success", "lead_id": user_id}


@app.get("/profile/{user_id}")
def get_profile(user_id: str):
    """Fetch user profile summary (archetype, lead, trajectory)."""
    profile = _repo.get_profile(user_id)
    if not profile:
        raise HTTPException(404, "Profile not found")
    return profile


@app.post("/profile")
def update_profile(user_id: str, req: Dict[str, Any]):
    """Update profile data from frontend."""
    # Special handling for user_id in query vs body
    _repo.profiles_ref.document(user_id).set(req, merge=True)
    return {"status": "success"}
