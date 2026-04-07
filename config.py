"""
Configuration Module
Loads settings from environment variables or Streamlit secrets
"""

import os
from dataclasses import dataclass, field
from typing import Optional


def _get_secret(key: str, default: str = "") -> str:
    """
    Try Streamlit secrets first, then environment variables, then default.
    Safe to call outside of a Streamlit context.
    """
    try:
        import streamlit as st
        if hasattr(st, "secrets") and key in st.secrets:
            return st.secrets[key]
    except Exception:
        pass
    return os.environ.get(key, default)


@dataclass
class Settings:
    # ── Security ────────────────────────────────────────────────────
    master_key: str = field(
        default_factory=lambda: _get_secret(
            "RESILIENCE_MASTER_KEY", "dev-key-change-before-production"
        )
    )

    # ── Integrations ────────────────────────────────────────────────
    make_com_webhook_url: str = field(
        default_factory=lambda: _get_secret("MAKE_COM_WEBHOOK_URL", "")
    )
    tele_manas_api_key: str = field(
        default_factory=lambda: _get_secret("TELE_MANAS_API_KEY", "")
    )
    whatsapp_access_token: str = field(
        default_factory=lambda: _get_secret("WHATSAPP_ACCESS_TOKEN", "")
    )

    # ── App behaviour ────────────────────────────────────────────────
    app_name: str = "The Resilience Matrix"
    version: str = "1.0.0"
    debug: bool = field(
        default_factory=lambda: os.environ.get("DEBUG", "false").lower() == "true"
    )

    # ── Compliance ───────────────────────────────────────────────────
    compliance_mode: str = "MHCA2017"       # Mental Healthcare Act 2017
    data_retention_days: int = 90
    require_consent: bool = True

    # ── Crisis thresholds ────────────────────────────────────────────
    crisis_phq9_threshold: int = 20          # PHQ-9 score triggering crisis alert
    high_risk_phq9_threshold: int = 15       # PHQ-9 score triggering high-risk flag

    # ── Voice analysis ───────────────────────────────────────────────
    voice_stress_threshold: float = 0.65    # Stress score considered high
    min_audio_duration_seconds: float = 3.0

    @property
    def integrations_enabled(self) -> bool:
        return bool(self.make_com_webhook_url or self.tele_manas_api_key)

    @property
    def is_production(self) -> bool:
        return (
            self.master_key != "dev-key-change-before-production"
            and not self.debug
        )


# Singleton instance — import this everywhere
settings = Settings()
