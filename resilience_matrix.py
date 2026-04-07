"""
Resilience Matrix Core Module
Dual-Continua Model for Mental Health Triage
"""

from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional


class MentalHealthState(Enum):
    FLOURISHING = "flourishing"
    STABLE = "stable"
    LANGUISHING = "languishing"
    DISTRESSED = "distressed"
    CRISIS = "crisis"


class ResilienceLevel(Enum):
    HIGH = "high"
    MODERATE = "moderate"
    LOW = "low"


@dataclass
class HealthCheckpoint:
    user_id: str
    score: float
    mental_health: MentalHealthState
    resilience: ResilienceLevel
    risk_flag: bool
    timestamp: datetime = field(default_factory=datetime.now)
    notes: str = ""


class ResilienceMatrix:
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.checkpoints: List[HealthCheckpoint] = []
        self.acoustic_markers: List[float] = []

    def _compute_mental_health_state(self, score: float) -> MentalHealthState:
        if score >= 80:
            return MentalHealthState.FLOURISHING
        elif score >= 60:
            return MentalHealthState.STABLE
        elif score >= 40:
            return MentalHealthState.LANGUISHING
        elif score >= 20:
            return MentalHealthState.DISTRESSED
        else:
            return MentalHealthState.CRISIS

    def _compute_resilience(self, score: float, acoustic_avg: Optional[float]) -> ResilienceLevel:
        """Compute resilience based on score and acoustic stress markers."""
        base = score
        if acoustic_avg is not None:
            # High stress (acoustic_avg close to 1.0) lowers resilience
            base -= acoustic_avg * 20

        if base >= 65:
            return ResilienceLevel.HIGH
        elif base >= 35:
            return ResilienceLevel.MODERATE
        else:
            return ResilienceLevel.LOW

    def add_checkpoint(self, score: float, notes: str = "") -> HealthCheckpoint:
        """Add a new health checkpoint based on a screening score (0–100)."""
        acoustic_avg = (
            sum(self.acoustic_markers) / len(self.acoustic_markers)
            if self.acoustic_markers
            else None
        )

        mental_health = self._compute_mental_health_state(score)
        resilience = self._compute_resilience(score, acoustic_avg)
        risk_flag = mental_health in (MentalHealthState.DISTRESSED, MentalHealthState.CRISIS)

        checkpoint = HealthCheckpoint(
            user_id=self.user_id,
            score=score,
            mental_health=mental_health,
            resilience=resilience,
            risk_flag=risk_flag,
            notes=notes,
        )
        self.checkpoints.append(checkpoint)
        return checkpoint

    def integrate_acoustic_marker(self, stress_score: float) -> None:
        """Integrate a voice stress score (0.0–1.0) into the matrix."""
        self.acoustic_markers.append(max(0.0, min(1.0, stress_score)))

        # Recompute the latest checkpoint if one exists
        if self.checkpoints:
            latest = self.checkpoints[-1]
            self.add_checkpoint(latest.score, notes="Updated with acoustic marker")

    def get_current_checkpoint(self) -> Optional[HealthCheckpoint]:
        """Return the most recent checkpoint, or None if none exist."""
        return self.checkpoints[-1] if self.checkpoints else None

    def get_trajectory(self) -> List[HealthCheckpoint]:
        """Return all checkpoints for trajectory visualization."""
        return self.checkpoints

    def phq9_to_score(self, phq9_total: int) -> float:
        """Convert a PHQ-9 total (0–27) to a 0–100 health score."""
        # Invert: lower PHQ-9 = higher health score
        return max(0.0, 100.0 - (phq9_total / 27.0) * 100.0)

    def update_from_screening(self, phq9_scores: dict) -> HealthCheckpoint:
        """Update matrix from PHQ-9 screening responses."""
        total = sum(phq9_scores.values())
        health_score = self.phq9_to_score(total)
        return self.add_checkpoint(health_score, notes=f"PHQ-9 total: {total}")


def create_user_matrix(user_id: str) -> ResilienceMatrix:
    """Factory function to create a ResilienceMatrix for a user."""
    return ResilienceMatrix(user_id)
