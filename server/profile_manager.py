import os
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime
from typing import Dict, Any, Optional

class ProfileManager:
    def __init__(self):
        # Service account is in the same directory as this file
        service_account_path = os.path.join(os.path.dirname(__file__), "firebase-service-account.json")
        
        try:
            if not firebase_admin._apps:
                cred = credentials.Certificate(service_account_path)
                firebase_admin.initialize_app(cred)
            
            self.db = firestore.client()
            self.collection = self.db.collection("mothership_profiles")
            print(f"   [FIREBASE] ProfileManager initialized for project: {firebase_admin.get_app().project_id}")
        except Exception as e:
            print(f"   [FIREBASE ERROR] Could not initialize Firestore: {e}")
            self.db = None

    def save_profile(self, user_id: str, data: Dict[str, Any]):
        if not self.db:
            return {}
            
        try:
            doc_ref = self.collection.document(user_id)
            data["updated_at"] = datetime.now().isoformat()
            
            # Merge to preserve existing data
            doc_ref.set(data, merge=True)
            # return the merged result (minimal approximation)
            return data
        except Exception as e:
            print(f"   [FIREBASE ERROR] save_profile failed: {e}")
            return {}

    def load_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        if not self.db:
            return None
            
        try:
            doc = self.collection.document(user_id).get()
            if doc.exists:
                return doc.to_dict()
            return None
        except Exception as e:
            print(f"   [FIREBASE ERROR] load_profile failed: {e}")
            return None

_manager = ProfileManager()

def get_profile_manager():
    return _manager
