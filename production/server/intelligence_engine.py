"""
genextAI Intelligence Engine — v1.0
Next-Generation AI Pipeline for The Mothership

This module upgrades the AI from "static prompt → response" to a multi-signal
intelligence system that fuses:
  1. Emotional Context   — real-time voice biomarker stress scores
  2. Session Memory      — cross-conversation patterns & breakthroughs
  3. Behavioral Signals  — learning progress, engagement patterns, mood arcs
  4. Guardian Alerts     — AI-generated risk flags, predictive distress detection
  5. Adaptive Prompting  — dynamic system prompt that evolves with the user

Goldenhour Systems Pvt Ltd · ambulance.run
"""

import json
import os
import urllib.request
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field, asdict

# ═══════════════════════════════════════════════════════════════════════════════
# DATA MODELS
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class EmotionalState:
    """Real-time emotional snapshot from voice + text signals."""
    stress_score: float = 0.5          # 0.0 (calm) → 1.0 (crisis)
    mood_label: str = "neutral"        # focused, anxious, tired, excited, neutral
    energy_level: str = "moderate"     # low, moderate, high
    confidence: float = 0.5
    source: str = "inferred"           # "voice_biomarker", "text_sentiment", "inferred"
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class SessionMemory:
    """Persistent memory of user patterns across conversations."""
    breakthroughs: List[str] = field(default_factory=list)       # key insights user had
    recurring_themes: List[str] = field(default_factory=list)    # topics that keep coming up
    preferred_mentor: Optional[str] = None                       # which guru they gravitate to
    avg_stress_7d: float = 0.5                                   # rolling 7-day avg stress
    mood_arc: List[Dict] = field(default_factory=list)           # [{date, mood, score}]
    conversation_count: int = 0
    total_minutes: float = 0.0
    last_session: Optional[str] = None
    trigger_words: List[str] = field(default_factory=list)       # words that spike stress
    coping_strategies_tried: List[str] = field(default_factory=list)


@dataclass
class GuardianAlert:
    """AI-generated safety/wellbeing alert."""
    alert_id: str = ""
    severity: str = "info"             # info, nudge, warning, critical
    category: str = ""                 # screentime, anxiety_spike, restricted_app, distress
    title: str = ""
    description: str = ""
    action_taken: str = ""             # nudge_sent, flow_suggested, blocked, escalated
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    resolved: bool = False


# ═══════════════════════════════════════════════════════════════════════════════
# INTELLIGENCE ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

class IntelligenceEngine:
    """
    Next-gen AI orchestrator. Sits between the UI and the LLM,
    enriching every interaction with multi-signal context.
    """

    def __init__(self):
        self._sessions: Dict[str, SessionMemory] = {}
        self._emotional_states: Dict[str, EmotionalState] = {}
        self._alerts: Dict[str, List[GuardianAlert]] = {}
        self._api_key = os.environ.get("GENEXTAI_API_KEY", "") or os.environ.get("GEMINI_API_KEY", "")

    # ── Emotional State Management ─────────────────────────────────────────

    def update_emotional_state(self, user_id: str, stress_score: float,
                                mood_label: str = "neutral",
                                source: str = "voice_biomarker") -> EmotionalState:
        """Update user's real-time emotional state from voice or text analysis."""
        energy = "low" if stress_score > 0.7 else "high" if stress_score < 0.3 else "moderate"
        state = EmotionalState(
            stress_score=round(stress_score, 3),
            mood_label=mood_label,
            energy_level=energy,
            confidence=0.85 if source == "voice_biomarker" else 0.6,
            source=source,
        )
        self._emotional_states[user_id] = state

        # Append to mood arc in session memory
        mem = self._get_or_create_memory(user_id)
        mem.mood_arc.append({
            "date": datetime.now().isoformat(),
            "mood": mood_label,
            "score": round(stress_score, 3),
        })
        # Keep last 50 entries
        if len(mem.mood_arc) > 50:
            mem.mood_arc = mem.mood_arc[-50:]

        # Recalculate 7-day rolling average
        week_ago = (datetime.now() - timedelta(days=7)).isoformat()
        recent = [m["score"] for m in mem.mood_arc if m["date"] >= week_ago]
        if recent:
            mem.avg_stress_7d = round(sum(recent) / len(recent), 3)

        # Auto-generate guardian alerts based on patterns
        self._auto_detect_alerts(user_id, state, mem)

        return state

    def get_emotional_state(self, user_id: str) -> Optional[EmotionalState]:
        return self._emotional_states.get(user_id)

    # ── Session Memory ─────────────────────────────────────────────────────

    def _get_or_create_memory(self, user_id: str) -> SessionMemory:
        if user_id not in self._sessions:
            self._sessions[user_id] = SessionMemory()
        return self._sessions[user_id]

    def record_session(self, user_id: str, mentor_id: str, duration_min: float,
                       breakthroughs: List[str] = None, themes: List[str] = None):
        """Record session metadata for long-term intelligence."""
        mem = self._get_or_create_memory(user_id)
        mem.conversation_count += 1
        mem.total_minutes += duration_min
        mem.last_session = datetime.now().isoformat()
        mem.preferred_mentor = mentor_id

        if breakthroughs:
            mem.breakthroughs.extend(breakthroughs)
            mem.breakthroughs = mem.breakthroughs[-20:]  # keep last 20

        if themes:
            for theme in themes:
                if theme not in mem.recurring_themes:
                    mem.recurring_themes.append(theme)
            mem.recurring_themes = mem.recurring_themes[-15:]

    def get_session_memory(self, user_id: str) -> Dict:
        mem = self._get_or_create_memory(user_id)
        return asdict(mem)

    # ── Guardian Alert System ──────────────────────────────────────────────

    def _auto_detect_alerts(self, user_id: str, state: EmotionalState, mem: SessionMemory):
        """AI-powered pattern detection for guardian alerts."""
        if user_id not in self._alerts:
            self._alerts[user_id] = []

        alerts = self._alerts[user_id]
        now = datetime.now().isoformat()

        # Pattern 1: Acute stress spike
        if state.stress_score > 0.75 and state.confidence > 0.6:
            alerts.append(GuardianAlert(
                alert_id=f"stress_{now}",
                severity="warning",
                category="anxiety_spike",
                title="Stress Spike Detected",
                description=f"Voice biomarker stress score: {state.stress_score:.0%}. "
                            f"Mood: {state.mood_label}.",
                action_taken="flow_suggested",
                timestamp=now,
            ))

        # Pattern 2: Sustained elevated stress (3+ readings above 0.6 in last hour)
        one_hour_ago = (datetime.now() - timedelta(hours=1)).isoformat()
        recent_moods = [m for m in mem.mood_arc if m["date"] >= one_hour_ago]
        high_stress_count = sum(1 for m in recent_moods if m["score"] > 0.6)
        if high_stress_count >= 3:
            # Don't duplicate if we already flagged this
            existing = [a for a in alerts if a.category == "sustained_stress"
                        and a.timestamp >= one_hour_ago and not a.resolved]
            if not existing:
                alerts.append(GuardianAlert(
                    alert_id=f"sustained_{now}",
                    severity="warning",
                    category="sustained_stress",
                    title="Sustained Elevated Stress",
                    description=f"{high_stress_count} elevated readings in the last hour. "
                                f"7-day average: {mem.avg_stress_7d:.0%}.",
                    action_taken="nudge_sent",
                    timestamp=now,
                ))

        # Pattern 3: Crisis threshold (score > 0.9)
        if state.stress_score > 0.9:
            alerts.append(GuardianAlert(
                alert_id=f"crisis_{now}",
                severity="critical",
                category="distress",
                title="Critical Distress Level",
                description="Stress score exceeds crisis threshold. "
                            "Recommending immediate Tele-MANAS escalation (14416).",
                action_taken="escalated",
                timestamp=now,
            ))

        # Pattern 4: Positive trend (stress dropping after intervention)
        if len(recent_moods) >= 2:
            last_two = recent_moods[-2:]
            if last_two[0]["score"] > 0.6 and last_two[1]["score"] < 0.4:
                alerts.append(GuardianAlert(
                    alert_id=f"recovery_{now}",
                    severity="info",
                    category="recovery",
                    title="Stress Recovery Detected",
                    description=f"Dropped from {last_two[0]['score']:.0%} to {last_two[1]['score']:.0%}. "
                                f"Intervention appears effective.",
                    action_taken="logged",
                    timestamp=now,
                ))

        # Keep last 100 alerts
        self._alerts[user_id] = alerts[-100:]

    def get_alerts(self, user_id: str, severity: str = None,
                   unresolved_only: bool = False) -> List[Dict]:
        alerts = self._alerts.get(user_id, [])
        if severity:
            alerts = [a for a in alerts if a.severity == severity]
        if unresolved_only:
            alerts = [a for a in alerts if not a.resolved]
        return [asdict(a) for a in alerts]

    def resolve_alert(self, user_id: str, alert_id: str) -> bool:
        alerts = self._alerts.get(user_id, [])
        for a in alerts:
            if a.alert_id == alert_id:
                a.resolved = True
                return True
        return False

    # ── Adaptive Prompt Engineering ────────────────────────────────────────

    def build_enhanced_system_prompt(self, user_id: str, mentor_id: str,
                                      base_prompt: str, archetype: str = None,
                                      health_score: int = None) -> str:
        """
        Build a next-gen system prompt that fuses:
        - Base mentor personality
        - Real-time emotional context
        - Session history & breakthroughs
        - Adaptive communication style
        """
        sections = [base_prompt]

        # 1. Emotional Context Layer
        emo = self._emotional_states.get(user_id)
        if emo:
            sections.append(f"""
REAL-TIME EMOTIONAL CONTEXT (from {emo.source}):
- Current Stress Level: {emo.stress_score:.0%} ({emo.mood_label})
- Energy: {emo.energy_level}
- Confidence in reading: {emo.confidence:.0%}

ADAPTIVE RESPONSE RULES:
{self._get_emotional_response_rules(emo)}""")

        # 2. Session Memory Layer
        mem = self._get_or_create_memory(user_id)
        if mem.conversation_count > 0:
            memory_context = f"\nSESSION INTELLIGENCE (cross-conversation memory):\n"
            memory_context += f"- Sessions completed: {mem.conversation_count}\n"
            memory_context += f"- Total engagement: {mem.total_minutes:.0f} min\n"
            memory_context += f"- 7-day stress average: {mem.avg_stress_7d:.0%}\n"

            if mem.breakthroughs:
                recent_b = mem.breakthroughs[-3:]
                memory_context += f"- Recent breakthroughs: {'; '.join(recent_b)}\n"
                memory_context += "→ Reference these breakthroughs when relevant to reinforce growth.\n"

            if mem.recurring_themes:
                memory_context += f"- Recurring themes: {', '.join(mem.recurring_themes[-5:])}\n"
                memory_context += "→ These themes matter to this user. Weave them in naturally.\n"

            if mem.coping_strategies_tried:
                memory_context += f"- Strategies tried: {', '.join(mem.coping_strategies_tried[-5:])}\n"
                memory_context += "→ Don't repeat strategies they've already tried. Suggest new ones.\n"

            sections.append(memory_context)

        # 3. Archetype Context Layer
        if archetype:
            sections.append(f"""
USER PROFILE:
- Archetype: {archetype}
- Resilience Score: {health_score or 'unknown'}/100
Tailor depth and pace to someone in the '{archetype}' phase.""")

        # 4. Guardian Awareness Layer
        active_alerts = self.get_alerts(user_id, unresolved_only=True)
        critical = [a for a in active_alerts if a["severity"] in ("warning", "critical")]
        if critical:
            alert_desc = "; ".join([a["title"] for a in critical[:3]])
            sections.append(f"""
⚠ GUARDIAN ALERTS ACTIVE: {alert_desc}
- Adjust your tone to be more nurturing and grounding.
- If distress is critical, gently guide toward professional help (Tele-MANAS: 14416).
- Do NOT ignore these signals — they are confirmed by acoustic biomarkers.""")

        return "\n\n".join(sections)

    def _get_emotional_response_rules(self, emo: EmotionalState) -> str:
        """Generate dynamic response rules based on emotional state."""
        if emo.stress_score > 0.75:
            return """- User is in HIGH STRESS. Use shorter sentences. Lead with grounding.
- Start with a breath cue or body check before any cognitive work.
- Avoid challenging questions — use supportive, reflective language.
- If stress persists, gently suggest taking a break or talking to someone."""
        elif emo.stress_score > 0.5:
            return """- User shows MODERATE STRESS. Balance empathy with gentle activation.
- Acknowledge their state before diving into content.
- Offer one micro-intervention (breathwork, reframe, movement prompt).
- Keep energy warm but not overwhelming."""
        elif emo.stress_score > 0.3:
            return """- User is STABLE. Full range of coaching techniques available.
- Can use direct questioning, pattern interrupts, reframes.
- Good time for deeper exploration and breakthrough work.
- Match their energy — they're in a productive zone."""
        else:
            return """- User is CALM/GROUNDED. Optimal state for deep work.
- Can challenge assumptions, explore edges, push for growth.
- This is the ideal window for insight and transformation.
- Use this momentum — don't waste it on surface-level dialogue."""

    # ── AI-Powered Analysis Endpoints ──────────────────────────────────────

    def analyze_patterns(self, user_id: str) -> Dict[str, Any]:
        """
        Cross-silo intelligence: analyze patterns across mood, learning,
        and behavioral data for Guardian dashboard.
        """
        mem = self._get_or_create_memory(user_id)
        alerts = self.get_alerts(user_id)
        emo = self._emotional_states.get(user_id)

        # Compute mood trend
        mood_trend = "stable"
        if len(mem.mood_arc) >= 3:
            recent_3 = [m["score"] for m in mem.mood_arc[-3:]]
            if all(recent_3[i] > recent_3[i+1] for i in range(len(recent_3)-1)):
                mood_trend = "improving"
            elif all(recent_3[i] < recent_3[i+1] for i in range(len(recent_3)-1)):
                mood_trend = "declining"

        # Compute alert summary
        alert_counts = {}
        for a in alerts:
            cat = a.get("category", "unknown")
            alert_counts[cat] = alert_counts.get(cat, 0) + 1

        # Peak focus times (from mood arc)
        focus_windows = []
        for m in mem.mood_arc:
            if m["score"] < 0.35:  # low stress = high focus potential
                try:
                    dt = datetime.fromisoformat(m["date"])
                    focus_windows.append(dt.strftime("%I:%M %p"))
                except:
                    pass

        return {
            "user_id": user_id,
            "mood_trend": mood_trend,
            "avg_stress_7d": mem.avg_stress_7d,
            "current_stress": emo.stress_score if emo else None,
            "current_mood": emo.mood_label if emo else None,
            "total_sessions": mem.conversation_count,
            "engagement_minutes": mem.total_minutes,
            "recurring_themes": mem.recurring_themes[-5:],
            "breakthroughs": mem.breakthroughs[-5:],
            "coping_strategies": mem.coping_strategies_tried,
            "alert_summary": alert_counts,
            "active_alerts": [a for a in alerts if not a.get("resolved", False)],
            "peak_focus_times": focus_windows[-5:] if focus_windows else [],
            "recommendation": self._generate_recommendation(mem, emo, mood_trend),
        }

    def _generate_recommendation(self, mem: SessionMemory,
                                   emo: Optional[EmotionalState],
                                   mood_trend: str) -> str:
        """Generate a cross-silo AI recommendation for the Guardian dashboard."""
        if emo and emo.stress_score > 0.75:
            return ("High stress detected. Recommend guided breathwork session "
                    "before continuing any learning activities.")
        if mood_trend == "declining":
            return ("Mood trend is declining over recent sessions. Consider "
                    "switching to a lighter activity or taking a wellness break.")
        if mood_trend == "improving":
            return ("Positive trajectory! This is an optimal window for "
                    "challenging material or deeper self-exploration.")
        if mem.conversation_count > 5 and not mem.breakthroughs:
            return ("Multiple sessions without recorded breakthroughs. "
                    "Consider trying a different mentor style or topic approach.")
        if mem.avg_stress_7d > 0.6:
            return ("7-day stress average is elevated. Recommend more "
                    "somatic/body-based sessions and movement breaks.")
        return ("Engagement is healthy. Continue current learning path "
                "and monitor for any stress pattern changes.")

    # ── AI Text Sentiment Analysis (fallback when no voice data) ──────────

    def analyze_text_sentiment(self, text: str) -> Dict[str, Any]:
        """
        Quick text sentiment analysis using keyword heuristics.
        Used when voice biomarker data isn't available.
        """
        text_lower = text.lower()

        # Stress/negative indicators
        stress_words = [
            "stressed", "anxious", "worried", "scared", "overwhelmed",
            "can't", "hopeless", "tired", "exhausted", "panic",
            "angry", "frustrated", "confused", "lost", "stuck",
            "crying", "hurt", "alone", "afraid", "depressed",
        ]
        # Positive indicators
        calm_words = [
            "happy", "calm", "peaceful", "grateful", "excited",
            "hopeful", "confident", "relaxed", "proud", "motivated",
            "inspired", "focused", "clear", "strong", "alive",
        ]
        # Crisis indicators
        crisis_words = [
            "suicide", "kill myself", "end it", "no point", "want to die",
            "self-harm", "cutting", "overdose",
        ]

        stress_hits = sum(1 for w in stress_words if w in text_lower)
        calm_hits = sum(1 for w in calm_words if w in text_lower)
        crisis_hits = sum(1 for w in crisis_words if w in text_lower)

        if crisis_hits > 0:
            return {"stress_score": 0.95, "mood": "distress", "crisis_flag": True,
                    "confidence": 0.7, "source": "text_sentiment"}

        total = max(stress_hits + calm_hits, 1)
        stress_ratio = stress_hits / total
        score = min(1.0, max(0.0, 0.3 + stress_ratio * 0.5))

        mood = "anxious" if stress_ratio > 0.6 else "neutral" if stress_ratio > 0.3 else "focused"

        return {"stress_score": round(score, 3), "mood": mood, "crisis_flag": False,
                "confidence": 0.5, "source": "text_sentiment"}

    # ── Extract Breakthroughs from Conversation ────────────────────────────

    def extract_insights(self, user_id: str, conversation: List[Dict]) -> Dict:
        """
        Analyze a completed conversation to extract breakthroughs,
        themes, and coping strategies mentioned.
        """
        if not conversation:
            return {"breakthroughs": [], "themes": [], "strategies": []}

        user_messages = [m["content"] for m in conversation if m.get("role") == "user"]
        assistant_messages = [m["content"] for m in conversation if m.get("role") == "assistant"]
        all_text = " ".join(user_messages + assistant_messages).lower()

        # Theme detection
        theme_keywords = {
            "relationships": ["relationship", "partner", "family", "friend", "parent", "love"],
            "career": ["work", "job", "career", "boss", "office", "promotion", "colleague"],
            "anxiety": ["anxiety", "anxious", "worry", "panic", "nervous", "fear"],
            "self-worth": ["worth", "enough", "imposter", "deserve", "confidence", "self-esteem"],
            "purpose": ["purpose", "meaning", "direction", "lost", "calling", "mission"],
            "academic": ["exam", "study", "school", "grade", "homework", "test", "marks"],
            "health": ["sleep", "exercise", "diet", "energy", "body", "pain", "fatigue"],
            "creativity": ["create", "art", "music", "write", "design", "imagine", "express"],
        }
        detected_themes = []
        for theme, keywords in theme_keywords.items():
            if any(kw in all_text for kw in keywords):
                detected_themes.append(theme)

        # Strategy detection
        strategy_keywords = {
            "breathwork": ["breath", "breathing", "inhale", "exhale", "pranayama"],
            "journaling": ["journal", "write down", "diary", "writing"],
            "meditation": ["meditat", "mindful", "sitting", "silence", "mantra"],
            "movement": ["walk", "exercise", "yoga", "stretch", "run", "dance"],
            "reframing": ["reframe", "perspective", "different way", "look at it"],
            "grounding": ["ground", "5-4-3-2-1", "senses", "feel your feet"],
            "social_support": ["talk to someone", "friend", "therapist", "counsel"],
        }
        detected_strategies = []
        for strategy, keywords in strategy_keywords.items():
            if any(kw in all_text for kw in keywords):
                detected_strategies.append(strategy)

        # Breakthrough detection (user expressing realization)
        breakthrough_markers = [
            "i realize", "i never thought", "that makes sense", "wow",
            "i see it now", "you're right", "i get it", "aha",
            "i didn't see", "that's exactly", "breakthrough",
        ]
        breakthroughs = []
        for msg in user_messages:
            msg_lower = msg.lower()
            if any(marker in msg_lower for marker in breakthrough_markers):
                # Capture the essence (first 100 chars)
                breakthroughs.append(msg[:100].strip())

        # Update session memory
        mem = self._get_or_create_memory(user_id)
        if breakthroughs:
            mem.breakthroughs.extend(breakthroughs[:3])
        if detected_themes:
            for t in detected_themes:
                if t not in mem.recurring_themes:
                    mem.recurring_themes.append(t)
        if detected_strategies:
            for s in detected_strategies:
                if s not in mem.coping_strategies_tried:
                    mem.coping_strategies_tried.append(s)

        return {
            "breakthroughs": breakthroughs[:3],
            "themes": detected_themes,
            "strategies": detected_strategies,
        }


# ═══════════════════════════════════════════════════════════════════════════════
# SINGLETON
# ═══════════════════════════════════════════════════════════════════════════════

_engine = IntelligenceEngine()

def get_intelligence_engine() -> IntelligenceEngine:
    return _engine
