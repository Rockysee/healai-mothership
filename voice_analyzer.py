"""
Voice Analyzer Module
Acoustic Biomarker Analysis for Stress Detection
"""

import numpy as np
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class VoiceAnalysisResult:
    stress_score: float          # 0.0 (no stress) to 1.0 (high stress)
    overall_confidence: float    # 0.0 to 1.0
    pitch_features: dict
    prosody_features: dict
    temporal_features: dict
    interpretation: str
    timestamp: datetime = field(default_factory=datetime.now)


class AcousticBiomarkerAnalyzer:
    """Analyzes audio arrays for stress biomarkers."""

    def analyze_audio_array(
        self, audio_data: np.ndarray, sample_rate: int
    ) -> VoiceAnalysisResult:
        """
        Analyze a numpy audio array for stress indicators.

        Args:
            audio_data: 1D numpy array of audio samples (mono, float)
            sample_rate: Sample rate in Hz

        Returns:
            VoiceAnalysisResult with all computed features
        """
        audio_data = audio_data.astype(np.float32)

        # ── Pitch features ──────────────────────────────────────────
        pitch_features = self._extract_pitch_features(audio_data, sample_rate)

        # ── Prosody features ────────────────────────────────────────
        prosody_features = self._extract_prosody_features(audio_data, sample_rate)

        # ── Temporal features ───────────────────────────────────────
        temporal_features = self._extract_temporal_features(audio_data, sample_rate)

        # ── Stress score (composite) ────────────────────────────────
        stress_score = self._compute_stress_score(
            pitch_features, prosody_features, temporal_features
        )

        # ── Confidence (based on signal quality) ────────────────────
        rms = float(np.sqrt(np.mean(audio_data ** 2)))
        confidence = min(1.0, rms * 10) if rms > 0.001 else 0.3

        interpretation = self._interpret_stress(stress_score)

        return VoiceAnalysisResult(
            stress_score=stress_score,
            overall_confidence=confidence,
            pitch_features=pitch_features,
            prosody_features=prosody_features,
            temporal_features=temporal_features,
            interpretation=interpretation,
        )

    # ── Feature extraction helpers ──────────────────────────────────

    def _extract_pitch_features(self, audio: np.ndarray, sr: int) -> dict:
        """Estimate pitch-related features using zero-crossing rate as proxy."""
        frame_len = int(sr * 0.025)  # 25ms frames
        hop = int(sr * 0.010)        # 10ms hop

        zcr_values = []
        for start in range(0, len(audio) - frame_len, hop):
            frame = audio[start: start + frame_len]
            zcr = float(np.mean(np.abs(np.diff(np.sign(frame)))) / 2)
            zcr_values.append(zcr)

        if not zcr_values:
            return {"pitch_mean": 0.0, "pitch_std": 0.0, "pitch_stability": 1.0, "pitch_range": 0.0}

        arr = np.array(zcr_values)
        mean_val = float(np.mean(arr))
        std_val = float(np.std(arr))
        stability = float(1.0 - min(1.0, std_val / (mean_val + 1e-6)))

        return {
            "pitch_mean": mean_val,
            "pitch_std": std_val,
            "pitch_stability": stability,
            "pitch_range": float(np.ptp(arr)),
        }

    def _extract_prosody_features(self, audio: np.ndarray, sr: int) -> dict:
        """Extract energy/loudness-based prosody features."""
        frame_len = int(sr * 0.025)
        hop = int(sr * 0.010)

        energies = []
        for start in range(0, len(audio) - frame_len, hop):
            frame = audio[start: start + frame_len]
            energies.append(float(np.mean(frame ** 2)))

        if not energies:
            return {"energy_mean": 0.0, "energy_std": 0.0, "speaking_rate_proxy": 0.0}

        arr = np.array(energies)
        # Speaking rate proxy: number of energy peaks per second
        threshold = float(np.mean(arr)) * 0.5
        peaks = np.sum((arr[1:-1] > arr[:-2]) & (arr[1:-1] > arr[2:]) & (arr[1:-1] > threshold))
        duration = len(audio) / sr
        speaking_rate = float(peaks) / max(duration, 0.1)

        return {
            "energy_mean": float(np.mean(arr)),
            "energy_std": float(np.std(arr)),
            "speaking_rate_proxy": speaking_rate,
        }

    def _extract_temporal_features(self, audio: np.ndarray, sr: int) -> dict:
        """Extract pause and speech ratio features."""
        frame_len = int(sr * 0.025)
        hop = int(sr * 0.010)
        rms_threshold = 0.01

        silent_frames = 0
        total_frames = 0

        for start in range(0, len(audio) - frame_len, hop):
            frame = audio[start: start + frame_len]
            rms = float(np.sqrt(np.mean(frame ** 2)))
            total_frames += 1
            if rms < rms_threshold:
                silent_frames += 1

        silence_ratio = silent_frames / max(total_frames, 1)
        speech_ratio = 1.0 - silence_ratio
        duration = len(audio) / sr

        return {
            "duration_seconds": round(duration, 2),
            "speech_ratio": round(speech_ratio, 3),
            "silence_ratio": round(silence_ratio, 3),
            "total_frames": total_frames,
        }

    def _compute_stress_score(
        self, pitch: dict, prosody: dict, temporal: dict
    ) -> float:
        """Combine features into a single stress score (0.0–1.0)."""
        # Low pitch stability → higher stress
        pitch_stress = 1.0 - pitch.get("pitch_stability", 1.0)

        # High energy variance → higher stress
        energy_mean = prosody.get("energy_mean", 0.0)
        energy_std = prosody.get("energy_std", 0.0)
        energy_cv = energy_std / (energy_mean + 1e-6)
        energy_stress = min(1.0, energy_cv)

        # Very high or very low speech ratio → stress signal
        speech_ratio = temporal.get("speech_ratio", 0.5)
        temporal_stress = abs(speech_ratio - 0.6) * 2  # 0.6 is "normal"
        temporal_stress = min(1.0, temporal_stress)

        # Weighted composite
        stress = (
            0.45 * pitch_stress
            + 0.35 * energy_stress
            + 0.20 * temporal_stress
        )
        return round(min(1.0, max(0.0, stress)), 3)

    def _interpret_stress(self, score: float) -> str:
        if score < 0.25:
            return "Low stress detected. Voice patterns suggest calm and relaxed state."
        elif score < 0.50:
            return "Mild stress detected. Some tension in vocal patterns, but within normal range."
        elif score < 0.75:
            return "Moderate stress detected. Voice patterns indicate elevated stress levels."
        else:
            return "High stress detected. Voice patterns suggest significant emotional distress."


def create_analyzer() -> AcousticBiomarkerAnalyzer:
    """Factory function to create an AcousticBiomarkerAnalyzer."""
    return AcousticBiomarkerAnalyzer()
