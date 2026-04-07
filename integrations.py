"""
Integrations Module
Orchestrates external integrations: Make.com webhooks,
Tele-MANAS API, WhatsApp Business API
"""

import os
import json
import urllib.request
import urllib.error
from datetime import datetime
from typing import Optional, Dict, Any


class IntegrationOrchestrator:
    """Manages external service integrations for crisis escalation."""

    def __init__(self):
        self.make_webhook_url = os.environ.get("MAKE_COM_WEBHOOK_URL", "")
        self.tele_manas_api_key = os.environ.get("TELE_MANAS_API_KEY", "")
        self.whatsapp_token = os.environ.get("WHATSAPP_ACCESS_TOKEN", "")

    # ── Make.com webhook ────────────────────────────────────────────

    def trigger_crisis_webhook(
        self, user_id: str, risk_level: str, score: float
    ) -> Dict[str, Any]:
        """
        Send a crisis alert to Make.com webhook.
        Returns a result dict with status and message.
        """
        if not self.make_webhook_url:
            return {
                "status": "skipped",
                "message": "MAKE_COM_WEBHOOK_URL not configured.",
            }

        payload = json.dumps({
            "user_id": user_id,
            "risk_level": risk_level,
            "score": score,
            "timestamp": datetime.now().isoformat(),
            "source": "resilience_matrix",
        }).encode("utf-8")

        try:
            req = urllib.request.Request(
                self.make_webhook_url,
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=10) as response:
                return {
                    "status": "success",
                    "http_status": response.status,
                    "message": "Crisis alert sent to Make.com.",
                }
        except urllib.error.URLError as e:
            return {"status": "error", "message": str(e)}

    # ── Tele-MANAS ──────────────────────────────────────────────────

    def connect_tele_manas(self, user_id: str, language: str = "en") -> Dict[str, Any]:
        """
        Initiate a Tele-MANAS counselling session.
        Returns connection details or a mock response if not configured.
        """
        if not self.tele_manas_api_key:
            return {
                "status": "demo",
                "message": (
                    "Tele-MANAS API not configured. "
                    "Call 14416 or visit https://telemanas.mohfw.gov.in"
                ),
                "hotline": "14416",
            }

        # Placeholder for real Tele-MANAS API integration
        return {
            "status": "initiated",
            "session_id": f"tm_{user_id}_{int(datetime.now().timestamp())}",
            "language": language,
            "message": "Connecting you to a Tele-MANAS counsellor...",
        }

    # ── WhatsApp Business API ───────────────────────────────────────

    def send_whatsapp_support(
        self, phone_number: str, message: str
    ) -> Dict[str, Any]:
        """Send a WhatsApp support message via Meta Business API."""
        if not self.whatsapp_token:
            return {
                "status": "skipped",
                "message": "WHATSAPP_ACCESS_TOKEN not configured.",
            }

        # Placeholder for Meta WhatsApp Cloud API call
        return {
            "status": "demo",
            "message": f"WhatsApp message would be sent to {phone_number}.",
        }

    # ── Convenience: full crisis escalation flow ────────────────────

    def escalate_crisis(
        self,
        user_id: str,
        risk_level: str,
        score: float,
        phone_number: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Run all crisis escalation steps in sequence."""
        results = {}

        results["webhook"] = self.trigger_crisis_webhook(user_id, risk_level, score)
        results["tele_manas"] = self.connect_tele_manas(user_id)

        if phone_number:
            msg = (
                f"🆘 Resilience Matrix Alert: Your mental health score indicates "
                f"you may need support. Please call 14416 (Tele-MANAS) or "
                f"AASRA: 9820466726."
            )
            results["whatsapp"] = self.send_whatsapp_support(phone_number, msg)

        return results


def create_orchestrator() -> IntegrationOrchestrator:
    """Factory function to create an IntegrationOrchestrator."""
    return IntegrationOrchestrator()
