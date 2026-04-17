import firebase_admin
from firebase_admin import credentials, firestore
import os
from datetime import datetime
from typing import Optional, Dict, Any, List
from resilience_matrix import ResilienceMatrix, HealthCheckpoint, MentalHealthState, ResilienceLevel

class ProfileRepository:
    def __init__(self):
        # Initialize Firebase Admin SDK
        cert_path = os.path.join(os.path.dirname(__file__), "firebase-service-account.json")
        if not firebase_admin._apps:
            cred = credentials.Certificate(cert_path)
            firebase_admin.initialize_app(cred)
        
        self.db = firestore.client()
        self.profiles_ref = self.db.collection("mothership_profiles")

    def get_matrix(self, user_id: str) -> ResilienceMatrix:
        """Fetch or create a ResilienceMatrix for a user from Firestore."""
        matrix = ResilienceMatrix(user_id)
        
        # Load checkpoints from Firestore
        checkpoints_ref = self.profiles_ref.document(user_id).collection("checkpoints")
        docs = checkpoints_ref.order_by("timestamp", direction=firestore.Query.ASCENDING).stream()
        
        for doc in docs:
            data = doc.to_dict()
            cp = HealthCheckpoint(
                user_id=user_id,
                score=data["score"],
                mental_health=MentalHealthState(data["mental_health"]),
                resilience=ResilienceLevel(data["resilience"]),
                risk_flag=data["risk_flag"],
                timestamp=data["timestamp"],
                notes=data.get("notes", "")
            )
            matrix.checkpoints.append(cp)
            
        # Load acoustic markers
        doc_ref = self.profiles_ref.document(user_id).get()
        if doc_ref.exists:
            data = doc_ref.to_dict()
            matrix.acoustic_markers = data.get("acoustic_markers", [])
            
        return matrix

    def save_checkpoint(self, user_id: str, checkpoint: HealthCheckpoint):
        """Save a new checkpoint to Firestore."""
        doc_ref = self.profiles_ref.document(user_id).collection("checkpoints").document()
        doc_ref.set({
            "score": checkpoint.score,
            "mental_health": checkpoint.mental_health.value,
            "resilience": checkpoint.resilience.value,
            "risk_flag": checkpoint.risk_flag,
            "timestamp": checkpoint.timestamp,
            "notes": checkpoint.notes
        })
        
        # Update profile summary
        self.profiles_ref.document(user_id).set({
            "last_assessed": checkpoint.timestamp,
            "latest_score": checkpoint.score,
            "latest_mental_health": checkpoint.mental_health.value
        }, merge=True)

    def save_acoustic_markers(self, user_id: str, markers: List[float]):
        """Save acoustic markers to Firestore."""
        self.profiles_ref.document(user_id).set({
            "acoustic_markers": markers
        }, merge=True)

    def save_lead(self, user_id: str, lead_data: Dict[str, Any]):
        """Save lead information (name, WhatsApp) to Firestore."""
        self.profiles_ref.document(user_id).set({
            "lead": lead_data,
            "sync_ts": datetime.now()
        }, merge=True)

    def get_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Fetch the full profile summary from Firestore."""
        doc = self.profiles_ref.document(user_id).get()
        return doc.to_dict() if doc.exists else None
