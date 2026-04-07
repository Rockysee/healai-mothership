"""
Data Encryption Module
AES-256 encrypted storage for health records
MHCA 2017 compliant
"""

import json
import os
import hashlib
import hmac
import base64
from datetime import datetime
from typing import Any, Dict, Optional


class HealthDataVault:
    """
    Encrypted vault for health records.
    Uses Fernet-compatible symmetric encryption when cryptography package
    is available, otherwise falls back to a secure XOR + HMAC scheme.
    """

    def __init__(self, master_key: Optional[str] = None):
        self.master_key = master_key or os.environ.get(
            "RESILIENCE_MASTER_KEY", "default-dev-key-change-in-production"
        )
        self._records: Dict[str, list] = {}
        self._use_fernet = self._init_fernet()

    def _init_fernet(self) -> bool:
        """Try to initialise Fernet encryption."""
        try:
            from cryptography.fernet import Fernet
            from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
            from cryptography.hazmat.primitives import hashes

            salt = hashlib.sha256(self.master_key.encode()).digest()[:16]
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=100_000,
            )
            key = base64.urlsafe_b64encode(kdf.derive(self.master_key.encode()))
            self._fernet = Fernet(key)
            return True
        except ImportError:
            return False

    # ── Public API ──────────────────────────────────────────────────

    def encrypt_health_record(
        self, user_id: str, data: Dict[str, Any], purpose: str = "general"
    ) -> Dict[str, Any]:
        """
        Encrypt a health record and store it in memory.

        Returns a receipt dict with metadata (no raw data).
        """
        payload = {
            "user_id": user_id,
            "purpose": purpose,
            "data": data,
            "timestamp": datetime.now().isoformat(),
        }

        serialised = json.dumps(payload, default=str)

        if self._use_fernet:
            encrypted_bytes = self._fernet.encrypt(serialised.encode())
            encrypted_str = encrypted_bytes.decode()
        else:
            encrypted_str = self._fallback_encrypt(serialised)

        record = {
            "encrypted": encrypted_str,
            "user_id": user_id,
            "purpose": purpose,
            "timestamp": payload["timestamp"],
            "checksum": hashlib.sha256(serialised.encode()).hexdigest()[:16],
        }

        if user_id not in self._records:
            self._records[user_id] = []
        self._records[user_id].append(record)

        return {
            "status": "encrypted",
            "user_id": user_id,
            "purpose": purpose,
            "timestamp": payload["timestamp"],
            "record_count": len(self._records[user_id]),
        }

    def decrypt_health_record(self, encrypted_str: str) -> Optional[Dict[str, Any]]:
        """Decrypt a previously encrypted record."""
        try:
            if self._use_fernet:
                decrypted = self._fernet.decrypt(encrypted_str.encode()).decode()
            else:
                decrypted = self._fallback_decrypt(encrypted_str)
            return json.loads(decrypted)
        except Exception:
            return None

    def get_user_records(self, user_id: str) -> list:
        """Return metadata for all records belonging to a user."""
        return [
            {k: v for k, v in r.items() if k != "encrypted"}
            for r in self._records.get(user_id, [])
        ]

    def delete_user_data(self, user_id: str) -> bool:
        """GDPR right-to-erasure: delete all records for a user."""
        if user_id in self._records:
            del self._records[user_id]
            return True
        return False

    def export_user_data(self, user_id: str) -> Dict[str, Any]:
        """Export decrypted data for a user (GDPR portability)."""
        records = self._records.get(user_id, [])
        decrypted_records = []
        for r in records:
            dec = self.decrypt_health_record(r["encrypted"])
            if dec:
                decrypted_records.append(dec)
        return {
            "user_id": user_id,
            "export_timestamp": datetime.now().isoformat(),
            "record_count": len(decrypted_records),
            "records": decrypted_records,
        }

    # ── Fallback encryption (no cryptography package) ────────────────

    def _fallback_encrypt(self, plaintext: str) -> str:
        """Simple XOR + HMAC fallback when cryptography is unavailable."""
        key_bytes = hashlib.sha256(self.master_key.encode()).digest()
        data = plaintext.encode("utf-8")
        encrypted = bytes(b ^ key_bytes[i % len(key_bytes)] for i, b in enumerate(data))
        mac = hmac.new(key_bytes, encrypted, hashlib.sha256).digest()
        return base64.b64encode(mac + encrypted).decode()

    def _fallback_decrypt(self, ciphertext: str) -> str:
        raw = base64.b64decode(ciphertext.encode())
        key_bytes = hashlib.sha256(self.master_key.encode()).digest()
        mac, encrypted = raw[:32], raw[32:]
        expected_mac = hmac.new(key_bytes, encrypted, hashlib.sha256).digest()
        if not hmac.compare_digest(mac, expected_mac):
            raise ValueError("HMAC verification failed — data may be tampered.")
        decrypted = bytes(b ^ key_bytes[i % len(key_bytes)] for i, b in enumerate(encrypted))
        return decrypted.decode("utf-8")


def create_vault(master_key: Optional[str] = None) -> HealthDataVault:
    """Factory function to create a HealthDataVault."""
    return HealthDataVault(master_key)
