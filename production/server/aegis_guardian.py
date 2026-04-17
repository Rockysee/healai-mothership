"""
═══════════════════════════════════════════════════════════════════════════════
 A.E.G.I.S. — Adaptive Empathic Guardian Intelligence System
 The Mothership · Guardian Shield · genextAI Intelligence Layer
 Goldenhour Systems Pvt Ltd · ambulance.run
═══════════════════════════════════════════════════════════════════════════════

 AEGIS is NOT surveillance software.
 It is a transparent, consent-based digital wellbeing intelligence that:
   1. The child KNOWS exists and understands what it does
   2. NO covert monitoring — no keystroke logging, no screen recording,
      no message interception, no audio capture
   3. Consent-first — children opt-in to check-ins and mood tracking
   4. Privacy by design — AES-256 encrypted data vault
   5. Alerts go to BOTH parent AND child — never behind the child's back

 Core Capabilities:
   → Screen Time Intelligence  — app category tracking, daily/weekly reports
   → Exchange Monitor          — messaging pattern detection (volume, timing,
                                  sentiment shifts — NEVER message content)
   → Profanity Detection       — real-time language filter on outbound text
                                  (typed text only, flagged + optionally blocked)
   → Retina Intelligence       — Apple TrueDepth / ARKit face tracking for
                                  focus depth, attention intensity, gaze duration
   → Facial Expression Mood    — real-time facial AU (Action Unit) analysis to
                                  measure mood shifts: joy, frustration, fatigue,
                                  surprise, boredom, distress — without recording
   → Mood Fusion Engine        — cross-references voice biomarkers, mood
                                  check-ins, screen time patterns, exchange
                                  timing, facial expression data, and attention
                                  metrics to detect distress early
   → Parental Sharing          — transparent dashboard shared with parent
                                  via secure link; child sees what parent sees
   → Smart Alerts              — 7-day distress pattern detection, escalation
                                  to both parent AND child simultaneously
   → COPPA + India DPDP Act    — compliant data handling

 v1.0 · April 2026
═══════════════════════════════════════════════════════════════════════════════
"""

import json
import os
from datetime import datetime, timedelta
from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional
from collections import defaultdict


# ═══════════════════════════════════════════════════════════════════════════════
# AEGIS SYSTEM PROMPT — The Guardian's AI Identity
# ═══════════════════════════════════════════════════════════════════════════════

AEGIS_SYSTEM_PROMPT = """
You are A.E.G.I.S. — the Adaptive Empathic Guardian Intelligence System.
You are the protective intelligence layer of The Mothership, built by Goldenhour Systems.

YOUR IDENTITY:
- You are a digital wellbeing guardian — NOT a surveillance tool
- You protect through transparency, empathy, and early detection
- You work WITH children and families, never behind anyone's back
- You are clinically precise but emotionally warm in delivery
- You speak like a wise, caring older sibling — never preachy, never alarmist

YOUR CORE PRINCIPLES:
1. TRANSPARENCY FIRST: Every alert goes to both parent AND child simultaneously
2. CONSENT-BASED: You only track what the user has opted into
3. NO CONTENT SNOOPING: You analyze patterns (timing, volume, duration) — NEVER message content
4. PRIVACY BY DESIGN: All data encrypted, minimal retention, user-controlled deletion
5. EMPOWERMENT OVER CONTROL: Teach self-regulation, don't enforce restriction

YOUR CAPABILITIES:
- Screen Time Analysis: Track app categories (learning, social, gaming, creative, utility)
   and daily/weekly patterns. Flag when thresholds are exceeded.
- Exchange Pattern Monitor: Track messaging frequency, response timing, and platform usage
   WITHOUT reading content. Detect unusual spikes (cyberbullying pattern, obsessive checking,
   late-night messaging) by metadata only.
- Mood Fusion: Cross-reference voice biomarker stress scores, mood check-in history,
   screen time patterns, and exchange timing to build a holistic emotional picture.
- Distress Detection: If mood check-ins show consistent distress over 7+ days, or if
   voice biomarkers + screen patterns converge on anxiety, generate a Smart Alert.
- Parental Dashboard: Summarize trends in parent-friendly language. Never share raw data
   that could be used punitively. Frame everything as "how can we help" not "what did they do."

ALERT SEVERITY LEVELS:
- 🟢 INFO: Positive trend, milestone reached, healthy pattern detected
- 🔵 NUDGE: Gentle suggestion (screen break, movement, social check-in)
- 🟡 WATCH: Pattern forming that needs attention (rising screen time, mood dip)
- 🟠 ALERT: Confirmed concerning pattern (7-day distress, midnight usage spike)
- 🔴 CRITICAL: Immediate attention needed (crisis-level mood + isolation pattern)
  → Recommend Tele-MANAS (14416) to BOTH parent and child

SCREEN TIME INTELLIGENCE RULES:
- Categories: Learning, Social Media, Gaming, Creative (art/music/coding), Communication, Utility
- Healthy baseline: personalized per age group (configurable by family)
- Default thresholds (configurable):
  · Ages 6-9:   2hr total, max 30min gaming, max 15min social
  · Ages 10-12: 3hr total, max 45min gaming, max 30min social
  · Ages 13-17: 4hr total, max 60min gaming, max 45min social
- Learning time is ALWAYS encouraged and reported positively
- Creative time (coding, art, music production) is reported as productive
- Nudge after 80% of daily threshold; Alert at 100%; Block only if family configured it

EXCHANGE MONITOR RULES:
- Track: message volume per hour, platform switching frequency, response latency patterns
- DO NOT track: message content, contact names (hashed only), media attachments
- Red flags (metadata only):
  · Sudden spike in messaging volume (>3x baseline) — possible conflict or crisis
  · Dramatic drop in messaging (>70% below baseline for 3+ days) — possible isolation
  · Midnight-to-5AM messaging pattern — sleep disruption
  · Rapid platform switching (>5 switches in 10 min) — possible evasion or distress
  · One-sided long messages with no replies — possible venting/cry for help
- All flags are probabilistic and framed as "might need a check-in" — never accusatory

WHEN GENERATING REPORTS:
- Lead with positives: "3 hours of learning content this week — impressive consistency"
- Frame concerns constructively: "Late-night messaging increased — worth a gentle check-in"
- Always include actionable suggestions: "Try setting a wind-down alarm at 9:30 PM together"
- End with encouragement: "Overall trajectory is positive — keep building these habits"

WHEN SPEAKING TO THE CHILD:
- Use warm, age-appropriate language
- Never shame or lecture
- Celebrate self-regulation: "You put the phone down after 45 min — that's real discipline"
- Frame limits positively: "Your eyes need rest to keep being awesome tomorrow"

WHEN SPEAKING TO THE PARENT:
- Clinical precision with warm framing
- Aggregated trends, never granular surveillance data
- Focus on "how to help" not "what they did wrong"
- Remind parents: "Your child can see this same dashboard"

PROFANITY INTELLIGENCE RULES:
- Monitor outbound text only (typed by the child) — not inbound messages from others
- Categories: mild_profanity, moderate_profanity, severe_profanity, slurs, threats, sexual, bullying
- NEVER store actual text — only SHA-256 hash + severity + category
- Escalation ladder:
  · First occurrence (mild): Silent log, no disruption
  · Repeated mild (3+ in 1 hour): Gentle nudge — "Hey, your words have power — use them wisely"
  · Moderate/severe: Flagged to parent + child dashboard simultaneously
  · Threats or bullying language: Immediate alert to both parent and child
  · Hate speech / slurs: Blocked if family configured blocking; otherwise flagged as critical
- Context matters: gaming chat profanity ≠ social media bullying. Weight severity by platform.
- Never shame — educate: "That word can really hurt someone. Here's why..."

RETINA INTELLIGENCE (Apple TrueDepth / ARKit):
- All processing happens ON-DEVICE via ARKit face tracking APIs
- NO camera images or video ever leave the device — only derived numerical metrics
- Metrics captured (consent-first, child can disable anytime):
  · Focus Depth: derived from gaze fixation stability + pupil dilation proxy
  · Attention Intensity: gaze-on-screen percentage + minimal head movement
  · Blink Rate: normal 15-20/min; stress indicator >25/min; fatigue indicator <10/min
  · Head Position: forward lean = engagement; slump = fatigue; constant shifting = distraction
  · Session Duration: how long a focus state is sustained before breaking
- Use these to:
  · Detect deep focus (flow state candidate) — celebrate it, don't interrupt
  · Detect fatigue before the child notices — suggest a break proactively
  · Measure attention quality per app — "You're 3x more focused in Khan Academy than TikTok"
  · Build personalized focus profiles — "Your peak attention window is 4-6 PM"
- Report to parent: aggregated focus scores, not raw gaze data
- NEVER use to punish — only to optimize: "Your focus drops after 25 min. Try 25-min blocks."

FACIAL EXPRESSION MOOD INTELLIGENCE:
- Uses ARKit facial Action Units (AU) — purely geometric, not image-based
- 52 blend shapes processed on-device → reduced to 6 mood dimensions:
  · Joy (AU6+AU12): cheek raise + smile → positive engagement
  · Frustration (AU4+AU24): brow lower + lip press → difficulty or anger
  · Fatigue (AU43+low blink): heavy eyelids + slow blinks → needs rest
  · Surprise (AU1+2+5): raised brows + wide eyes → discovery or shock
  · Boredom (low AU4+gaze drift): flat expression + wandering gaze
  · Distress (AU1+4+15): inner brow raise + frown → sadness or anxiety
- Mood changes during different activities are the key signal:
  · Frustration spike during homework → suggest a break or different approach
  · Joy during learning content → reinforce: "That topic lights you up!"
  · Distress during social media → flag: possible cyberbullying or comparison anxiety
  · Sustained boredom → suggest switching activities
- Alert parent only if: distress sustained >30 min, OR frustration escalating across days
- NEVER record or transmit facial images — this is non-negotiable
- Child can see their own mood timeline — builds emotional self-awareness

COMPLIANCE:
- COPPA (Children's Online Privacy Protection Act) — no data collection under 13 without verified parental consent
- India DPDP Act (Digital Personal Data Protection) — data minimization, purpose limitation, user rights
- Apple App Store privacy guidelines — on-device processing, no facial data transmission
- ARKit usage disclosure — transparent in-app notice explaining what face tracking does
- All data deletable on request by either parent or child (age 14+)
"""


# ═══════════════════════════════════════════════════════════════════════════════
# DATA MODELS
# ═══════════════════════════════════════════════════════════════════════════════

APP_CATEGORIES = {
    "learning":       ["duolingo", "khan_academy", "vijnana", "healai_learn", "coursera",
                       "brilliant", "photomath", "quizlet", "notion", "obsidian"],
    "social_media":   ["instagram", "snapchat", "tiktok", "twitter_x", "reddit",
                       "threads", "youtube_shorts", "facebook"],
    "gaming":         ["roblox", "minecraft", "fortnite", "pubg", "cod_mobile",
                       "genshin", "subway_surfers", "among_us", "clash_royale"],
    "creative":       ["garage_band", "procreate", "canva", "capcut", "figma",
                       "scratch", "replit", "vs_code", "blender"],
    "communication":  ["whatsapp", "imessage", "telegram", "discord", "signal",
                       "facetime", "zoom", "google_meet"],
    "utility":        ["settings", "calculator", "files", "clock", "calendar",
                       "maps", "weather", "notes", "reminders"],
    "streaming":      ["youtube", "netflix", "spotify", "apple_music", "prime_video",
                       "hotstar", "jio_cinema"],
}


@dataclass
class ScreenTimeEntry:
    """Single app usage session."""
    app_id: str = ""
    app_name: str = ""
    category: str = "utility"
    start_time: str = ""
    end_time: str = ""
    duration_min: float = 0.0
    date: str = ""  # YYYY-MM-DD


@dataclass
class ExchangeMetadata:
    """Messaging pattern metadata — NEVER message content."""
    platform: str = ""                  # whatsapp, imessage, discord, etc.
    timestamp: str = ""
    direction: str = "sent"             # sent | received
    message_length_bucket: str = ""     # short (<50 chars) | medium | long (>300 chars)
    # NEVER store actual content, contact names are hashed
    contact_hash: str = ""
    response_latency_sec: Optional[float] = None  # time since last received msg


@dataclass
class ProfanityEvent:
    """Flagged profanity event — text hash only, NOT the actual content."""
    timestamp: str = ""
    platform: str = ""                  # which app the text was typed in
    severity: str = "mild"              # mild, moderate, severe, hate_speech
    category: str = ""                  # profanity, slur, threat, sexual, bullying
    action_taken: str = "flagged"       # flagged, warned, blocked
    text_hash: str = ""                 # SHA-256 hash — never store actual text
    context: str = ""                   # "outbound_chat", "social_post", "search_query"


@dataclass
class RetinaFocusSnapshot:
    """
    Apple Intelligence / TrueDepth camera focus metrics.
    Uses ARKit face tracking — processes on-device, NEVER records or transmits
    raw camera data. Only derived numerical metrics are stored.
    """
    timestamp: str = ""
    focus_depth: float = 0.0            # 0.0 (distracted) → 1.0 (deep focus)
    attention_intensity: float = 0.0    # 0.0 (wandering) → 1.0 (locked-in)
    gaze_on_screen_pct: float = 0.0     # % of time eyes on screen (vs looking away)
    blink_rate_per_min: float = 15.0    # normal: 15-20; high stress: 25+; fatigue: <10
    head_tilt_deg: float = 0.0          # forward lean (engagement) vs slump (fatigue)
    session_duration_sec: float = 0.0
    app_id: str = ""                    # what app was active during this reading


@dataclass
class FacialExpressionReading:
    """
    Facial Action Unit (AU) analysis for mood detection.
    Derived from ARKit blendShapes — processed entirely on-device.
    NO images, NO video, NO raw camera data ever leaves the device.
    Only numerical AU coefficients and derived mood labels are stored.
    """
    timestamp: str = ""
    # Primary emotions (0.0 → 1.0 intensity)
    joy: float = 0.0                    # AU6 (cheek raise) + AU12 (lip corner pull)
    frustration: float = 0.0            # AU4 (brow lower) + AU24 (lip press)
    fatigue: float = 0.0                # AU43 (eyes close) + low blink rate
    surprise: float = 0.0               # AU1+2 (inner+outer brow raise) + AU5 (upper lid)
    boredom: float = 0.0                # AU4 low + gaze drift + reduced AU12
    distress: float = 0.0               # AU1+4 (brow furrow) + AU15 (lip corner depress)
    # Composite mood label
    dominant_mood: str = "neutral"       # joy, frustration, fatigue, surprise, boredom, distress, neutral
    confidence: float = 0.0
    session_app: str = ""               # what app was active


@dataclass
class ScreenTimeReport:
    """Daily screen time summary."""
    user_id: str = ""
    date: str = ""
    total_minutes: float = 0.0
    by_category: Dict[str, float] = field(default_factory=dict)
    by_app: Dict[str, float] = field(default_factory=dict)
    top_app: str = ""
    longest_session_min: float = 0.0
    threshold_pct: float = 0.0          # % of daily threshold used
    pickups: int = 0                     # how many times device was unlocked
    first_use: str = ""                  # time of first use
    last_use: str = ""                   # time of last use
    learning_minutes: float = 0.0
    creative_minutes: float = 0.0
    social_minutes: float = 0.0
    gaming_minutes: float = 0.0


@dataclass
class ExchangeReport:
    """Daily exchange pattern summary — no content, only metadata patterns."""
    user_id: str = ""
    date: str = ""
    total_messages: int = 0
    sent: int = 0
    received: int = 0
    platforms_used: List[str] = field(default_factory=list)
    peak_hour: str = ""                 # busiest messaging hour
    late_night_count: int = 0           # messages between midnight-5am
    avg_response_latency_sec: float = 0.0
    platform_switches: int = 0          # how often they switched apps
    longest_gap_hours: float = 0.0      # longest period with zero messaging
    volume_vs_baseline: float = 1.0     # ratio vs 7-day avg (1.0 = normal)


@dataclass
class AegisAlert:
    """Guardian alert — always shared with BOTH parent and child."""
    alert_id: str = ""
    severity: str = "info"              # info, nudge, watch, alert, critical
    category: str = ""                  # screentime, exchange, mood, distress, positive
    title: str = ""
    child_message: str = ""             # age-appropriate message for the child
    parent_message: str = ""            # clinical summary for the parent
    action_suggestion: str = ""         # what both can do about it
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    resolved: bool = False
    acknowledged_by_child: bool = False
    acknowledged_by_parent: bool = False


# ═══════════════════════════════════════════════════════════════════════════════
# AEGIS GUARDIAN ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

class AegisGuardian:
    """
    The core AEGIS intelligence engine.
    Processes screen time, exchange metadata, and mood data
    to generate transparent wellbeing intelligence.
    """

    def __init__(self):
        self._screen_time: Dict[str, List[ScreenTimeEntry]] = defaultdict(list)
        self._exchange_meta: Dict[str, List[ExchangeMetadata]] = defaultdict(list)
        self._alerts: Dict[str, List[AegisAlert]] = defaultdict(list)
        self._daily_reports: Dict[str, Dict[str, ScreenTimeReport]] = defaultdict(dict)
        self._exchange_reports: Dict[str, Dict[str, ExchangeReport]] = defaultdict(dict)
        self._user_config: Dict[str, Dict] = {}  # per-user thresholds and preferences

    # ── Configuration ──────────────────────────────────────────────────────

    def configure_user(self, user_id: str, age: int = 14,
                       daily_limit_min: int = None,
                       gaming_limit_min: int = None,
                       social_limit_min: int = None,
                       bedtime: str = "22:00",
                       wake_time: str = "07:00",
                       block_on_exceed: bool = False):
        """Set up family-configured thresholds."""
        # Default thresholds by age
        if daily_limit_min is None:
            if age <= 9:
                daily_limit_min = 120
            elif age <= 12:
                daily_limit_min = 180
            else:
                daily_limit_min = 240

        if gaming_limit_min is None:
            gaming_limit_min = 30 if age <= 9 else 45 if age <= 12 else 60

        if social_limit_min is None:
            social_limit_min = 15 if age <= 9 else 30 if age <= 12 else 45

        self._user_config[user_id] = {
            "age": age,
            "daily_limit_min": daily_limit_min,
            "gaming_limit_min": gaming_limit_min,
            "social_limit_min": social_limit_min,
            "bedtime": bedtime,
            "wake_time": wake_time,
            "block_on_exceed": block_on_exceed,
        }

    def get_config(self, user_id: str) -> Dict:
        return self._user_config.get(user_id, {
            "age": 14, "daily_limit_min": 240, "gaming_limit_min": 60,
            "social_limit_min": 45, "bedtime": "22:00", "wake_time": "07:00",
            "block_on_exceed": False,
        })

    # ── Screen Time Tracking ──────────────────────────────────────────────

    def classify_app(self, app_id: str) -> str:
        """Classify an app into a category."""
        app_lower = app_id.lower().replace(" ", "_")
        for category, apps in APP_CATEGORIES.items():
            if any(a in app_lower for a in apps):
                return category
        return "utility"

    def record_screen_time(self, user_id: str, app_id: str, app_name: str,
                           duration_min: float, start_time: str = None) -> Dict:
        """Record a screen time session. Returns alert if threshold breached."""
        now = datetime.now()
        entry = ScreenTimeEntry(
            app_id=app_id,
            app_name=app_name,
            category=self.classify_app(app_id),
            start_time=start_time or now.isoformat(),
            end_time=now.isoformat(),
            duration_min=round(duration_min, 1),
            date=now.strftime("%Y-%m-%d"),
        )
        self._screen_time[user_id].append(entry)

        # Keep last 30 days
        cutoff = (now - timedelta(days=30)).strftime("%Y-%m-%d")
        self._screen_time[user_id] = [
            e for e in self._screen_time[user_id] if e.date >= cutoff
        ]

        # Check thresholds and generate alerts
        alerts = self._check_screen_time_thresholds(user_id, entry)
        return {"recorded": True, "entry": asdict(entry), "alerts": [asdict(a) for a in alerts]}

    def _check_screen_time_thresholds(self, user_id: str, new_entry: ScreenTimeEntry) -> List[AegisAlert]:
        """Check if any screen time thresholds are breached."""
        config = self.get_config(user_id)
        today = datetime.now().strftime("%Y-%m-%d")
        today_entries = [e for e in self._screen_time[user_id] if e.date == today]
        alerts = []

        # Total daily screen time
        total_min = sum(e.duration_min for e in today_entries)
        daily_limit = config["daily_limit_min"]
        pct = total_min / max(daily_limit, 1) * 100

        if pct >= 100:
            alerts.append(AegisAlert(
                alert_id=f"st_daily_{today}",
                severity="alert",
                category="screentime",
                title="Daily Screen Time Limit Reached",
                child_message=f"You've used {int(total_min)} min today — that's your full daily target! "
                              f"Your eyes and brain deserve a break. How about some offline time?",
                parent_message=f"Daily screen time limit reached: {int(total_min)}/{daily_limit} min. "
                               f"Top category: {self._top_category_today(user_id)}.",
                action_suggestion="Take a 15-minute break together — walk, snack, or just chat.",
            ))
        elif pct >= 80:
            alerts.append(AegisAlert(
                alert_id=f"st_80pct_{today}",
                severity="nudge",
                category="screentime",
                title="Approaching Daily Limit",
                child_message=f"You've used {int(pct)}% of your screen time today. "
                              f"About {int(daily_limit - total_min)} min left — use it wisely!",
                parent_message=f"Screen time at {int(pct)}% of daily limit ({int(total_min)}/{daily_limit} min).",
                action_suggestion="Plan the remaining screen time together for highest-value activities.",
            ))

        # Category-specific: gaming
        gaming_min = sum(e.duration_min for e in today_entries if e.category == "gaming")
        if gaming_min >= config["gaming_limit_min"]:
            alerts.append(AegisAlert(
                alert_id=f"st_gaming_{today}",
                severity="watch",
                category="screentime",
                title="Gaming Limit Reached",
                child_message=f"You've gamed for {int(gaming_min)} min — solid session! "
                              f"Time to switch to something else.",
                parent_message=f"Gaming: {int(gaming_min)}/{config['gaming_limit_min']} min today.",
                action_suggestion="Suggest switching to a creative app or learning content.",
            ))

        # Category-specific: social media
        social_min = sum(e.duration_min for e in today_entries if e.category == "social_media")
        if social_min >= config["social_limit_min"]:
            alerts.append(AegisAlert(
                alert_id=f"st_social_{today}",
                severity="watch",
                category="screentime",
                title="Social Media Limit Reached",
                child_message=f"You've spent {int(social_min)} min on social media today. "
                              f"Real connections > scrolling — text a friend instead?",
                parent_message=f"Social media: {int(social_min)}/{config['social_limit_min']} min today.",
                action_suggestion="Encourage direct messaging a real friend instead of scrolling feeds.",
            ))

        # Late night usage
        try:
            entry_hour = datetime.fromisoformat(new_entry.start_time).hour
            bedtime_hour = int(config["bedtime"].split(":")[0])
            if entry_hour >= bedtime_hour or entry_hour < int(config["wake_time"].split(":")[0]):
                alerts.append(AegisAlert(
                    alert_id=f"st_latenight_{new_entry.start_time}",
                    severity="watch",
                    category="screentime",
                    title="After-Bedtime Usage",
                    child_message="Hey night owl — screens this late mess with your sleep hormones. "
                                  "Your brain does its best repair work while you sleep!",
                    parent_message=f"Device used after bedtime ({config['bedtime']}): "
                                   f"{new_entry.app_name} for {new_entry.duration_min:.0f} min.",
                    action_suggestion="Set a device wind-down routine together — maybe audiobook instead?",
                ))
        except (ValueError, IndexError):
            pass

        # Store alerts
        for a in alerts:
            self._alerts[user_id].append(a)

        return alerts

    def _top_category_today(self, user_id: str) -> str:
        today = datetime.now().strftime("%Y-%m-%d")
        entries = [e for e in self._screen_time[user_id] if e.date == today]
        cat_totals = defaultdict(float)
        for e in entries:
            cat_totals[e.category] += e.duration_min
        if not cat_totals:
            return "none"
        return max(cat_totals, key=cat_totals.get)

    # ── Exchange Metadata Tracking ────────────────────────────────────────

    def record_exchange(self, user_id: str, platform: str, direction: str,
                        message_length_bucket: str, contact_hash: str,
                        response_latency_sec: float = None) -> Dict:
        """
        Record messaging metadata. NEVER accepts message content.
        Only: platform, direction, length bucket, hashed contact, timing.
        """
        entry = ExchangeMetadata(
            platform=platform,
            timestamp=datetime.now().isoformat(),
            direction=direction,
            message_length_bucket=message_length_bucket,
            contact_hash=contact_hash,
            response_latency_sec=response_latency_sec,
        )
        self._exchange_meta[user_id].append(entry)

        # Keep last 30 days
        cutoff = (datetime.now() - timedelta(days=30)).isoformat()
        self._exchange_meta[user_id] = [
            e for e in self._exchange_meta[user_id] if e.timestamp >= cutoff
        ]

        # Check exchange patterns
        alerts = self._check_exchange_patterns(user_id)
        return {"recorded": True, "alerts": [asdict(a) for a in alerts]}

    def _check_exchange_patterns(self, user_id: str) -> List[AegisAlert]:
        """Analyze messaging patterns for concerning trends."""
        config = self.get_config(user_id)
        now = datetime.now()
        today = now.strftime("%Y-%m-%d")
        alerts = []

        all_entries = self._exchange_meta[user_id]
        today_entries = [e for e in all_entries if e.timestamp[:10] == today]

        if len(today_entries) < 5:
            return alerts  # Not enough data

        # Pattern 1: Late-night messaging (midnight to 5am)
        late_night = [e for e in today_entries
                      if 0 <= datetime.fromisoformat(e.timestamp).hour < 5]
        if len(late_night) >= 3:
            existing = [a for a in self._alerts[user_id]
                        if a.category == "exchange" and "late-night" in a.title.lower()
                        and a.timestamp[:10] == today]
            if not existing:
                alerts.append(AegisAlert(
                    alert_id=f"ex_latenight_{today}",
                    severity="watch",
                    category="exchange",
                    title="Late-Night Messaging Detected",
                    child_message="You've been messaging past midnight — your brain needs sleep "
                                  "to process everything from today. Set a message curfew?",
                    parent_message=f"{len(late_night)} messages exchanged between midnight and 5 AM. "
                                   f"Platforms: {', '.join(set(e.platform for e in late_night))}.",
                    action_suggestion="Discuss a messaging curfew together. Consider device-free bedroom.",
                ))

        # Pattern 2: Volume spike (>3x 7-day average)
        week_ago = (now - timedelta(days=7)).isoformat()
        week_entries = [e for e in all_entries if e.timestamp >= week_ago]
        if week_entries:
            days_with_data = len(set(e.timestamp[:10] for e in week_entries))
            if days_with_data > 0:
                avg_daily = len(week_entries) / max(days_with_data, 1)
                today_count = len(today_entries)
                if avg_daily > 0 and today_count > avg_daily * 3:
                    alerts.append(AegisAlert(
                        alert_id=f"ex_spike_{today}",
                        severity="alert",
                        category="exchange",
                        title="Unusual Messaging Spike",
                        child_message="You've been messaging way more than usual today. "
                                      "Everything okay? Sometimes a break helps.",
                        parent_message=f"Today: {today_count} messages vs 7-day avg of {avg_daily:.0f}/day "
                                       f"({today_count/avg_daily:.1f}x normal). Possible conflict or crisis.",
                        action_suggestion="Check in casually — 'How was your day?' works better than interrogation.",
                    ))

        # Pattern 3: Dramatic drop (isolation signal)
        if len(week_entries) >= 14:  # need enough data
            days_data = defaultdict(int)
            for e in week_entries:
                days_data[e.timestamp[:10]] += 1
            recent_3 = sorted(days_data.keys())[-3:]
            if len(recent_3) == 3:
                recent_avg = sum(days_data[d] for d in recent_3) / 3
                older_avg = sum(v for k, v in days_data.items() if k not in recent_3) / max(len(days_data) - 3, 1)
                if older_avg > 0 and recent_avg < older_avg * 0.3:
                    alerts.append(AegisAlert(
                        alert_id=f"ex_isolation_{today}",
                        severity="alert",
                        category="exchange",
                        title="Social Withdrawal Pattern",
                        child_message="You've been quieter than usual online. "
                                      "That's okay — but if something's weighing on you, "
                                      "talking helps more than silence.",
                        parent_message=f"Messaging dropped to {recent_avg:.0f}/day from "
                                       f"{older_avg:.0f}/day average. Possible social withdrawal.",
                        action_suggestion="Initiate a low-pressure conversation. "
                                          "Don't ask 'what's wrong' — try 'want to grab food?'",
                    ))

        # Pattern 4: Rapid platform switching (evasion/distress signal)
        if len(today_entries) >= 10:
            # Count platform switches in rolling 10-min windows
            sorted_entries = sorted(today_entries, key=lambda e: e.timestamp)
            for i in range(len(sorted_entries) - 5):
                window = sorted_entries[i:i+6]
                platforms = set(e.platform for e in window)
                try:
                    window_span = (datetime.fromisoformat(window[-1].timestamp) -
                                   datetime.fromisoformat(window[0].timestamp)).total_seconds()
                    if len(platforms) >= 4 and window_span <= 600:  # 4+ platforms in 10 min
                        existing = [a for a in self._alerts[user_id]
                                    if a.category == "exchange" and "switching" in a.title.lower()
                                    and a.timestamp[:10] == today]
                        if not existing:
                            alerts.append(AegisAlert(
                                alert_id=f"ex_switching_{today}",
                                severity="nudge",
                                category="exchange",
                                title="Rapid App Switching",
                                child_message="You've been jumping between apps quickly. "
                                              "Take a breath — focused time > scattered time.",
                                parent_message=f"{len(platforms)} platforms used within 10 minutes. "
                                               f"May indicate distraction or agitation.",
                                action_suggestion="Suggest a single-app focus block or a screen break.",
                            ))
                        break
                except (ValueError, TypeError):
                    pass

        for a in alerts:
            self._alerts[user_id].append(a)

        return alerts

    # ── Profanity Detection ───────────────────────────────────────────────

    # Profanity lexicon — severity-tagged (expandable, load from file in production)
    PROFANITY_LEXICON = {
        "mild": [
            "damn", "hell", "crap", "sucks", "stupid", "idiot", "dumb",
            "shut up", "wtf", "omg", "lmao", "bruh",
        ],
        "moderate": [
            "ass", "bastard", "bitch", "dick", "piss", "shit",
            "screw you", "pissed", "bullshit",
        ],
        "severe": [
            "fuck", "fucking", "motherfucker", "fucker", "stfu",
            "asshole", "cock", "cunt",
        ],
        "slur": [
            # Intentionally minimal — in production, load from encrypted slur DB
            # that covers racial, ethnic, gender, orientation, and disability slurs
            "retard", "retarded", "fag", "faggot", "tranny",
        ],
        "threat": [
            "kill you", "kill yourself", "kys", "die", "hurt you",
            "beat you up", "i'll find you", "watch your back",
        ],
        "bullying": [
            "ugly", "fat", "loser", "nobody likes you", "kys",
            "go die", "worthless", "pathetic", "kill yourself",
        ],
    }

    def scan_profanity(self, user_id: str, text: str, platform: str = "unknown",
                       context: str = "outbound_chat") -> Dict:
        """
        Scan outbound text for profanity. Returns detection result + any alerts.
        NEVER stores the actual text — only a hash + metadata.
        """
        import hashlib
        text_lower = text.lower().strip()
        text_hash = hashlib.sha256(text.encode()).hexdigest()[:16]

        detections = []
        for severity, words in self.PROFANITY_LEXICON.items():
            for word in words:
                if word in text_lower:
                    detections.append({"word_category": severity, "matched": word})

        if not detections:
            return {"clean": True, "detections": [], "action": "none"}

        # Determine worst severity
        severity_order = ["mild", "moderate", "severe", "slur", "threat", "bullying"]
        worst = max(detections, key=lambda d: severity_order.index(d["word_category"]))
        worst_severity = worst["word_category"]

        # Map to action
        if worst_severity in ("threat", "bullying"):
            action = "blocked"
            alert_severity = "alert"
        elif worst_severity in ("slur",):
            config = self.get_config(user_id)
            action = "blocked" if config.get("block_on_exceed") else "flagged"
            alert_severity = "alert"
        elif worst_severity == "severe":
            action = "flagged"
            alert_severity = "watch"
        elif worst_severity == "moderate":
            action = "flagged"
            alert_severity = "nudge"
        else:
            action = "logged"
            alert_severity = "info"

        # Record event
        event = ProfanityEvent(
            timestamp=datetime.now().isoformat(),
            platform=platform,
            severity=worst_severity,
            category=worst_severity,
            action_taken=action,
            text_hash=text_hash,
            context=context,
        )

        if not hasattr(self, '_profanity_events'):
            self._profanity_events = defaultdict(list)
        self._profanity_events[user_id].append(event)

        # Check for repeated mild profanity (3+ in 1 hour)
        one_hour_ago = (datetime.now() - timedelta(hours=1)).isoformat()
        recent_mild = [e for e in self._profanity_events[user_id]
                       if e.timestamp >= one_hour_ago and e.severity == "mild"]
        if len(recent_mild) >= 3 and worst_severity == "mild":
            alert_severity = "nudge"
            action = "warned"

        # Generate alerts for non-trivial detections
        alerts = []
        if alert_severity != "info":
            alert = AegisAlert(
                alert_id=f"profanity_{text_hash}",
                severity=alert_severity,
                category="profanity",
                title=f"Language Flag: {worst_severity.replace('_', ' ').title()}",
                child_message=self._profanity_child_message(worst_severity, action),
                parent_message=f"Outbound text flagged as {worst_severity} on {platform}. "
                               f"Action: {action}. Context: {context}.",
                action_suggestion=self._profanity_action_suggestion(worst_severity),
            )
            alerts.append(alert)
            self._alerts[user_id].append(alert)

        return {
            "clean": False,
            "severity": worst_severity,
            "action": action,
            "detection_count": len(detections),
            "alerts": [asdict(a) for a in alerts],
        }

    def _profanity_child_message(self, severity: str, action: str) -> str:
        messages = {
            "mild": "Your words carry weight — even casual language shapes how people see you. "
                    "Choose words that build, not burn.",
            "moderate": "That language is stronger than you might think. "
                        "Would you say it to someone's face? Words online are permanent.",
            "severe": "Whoa — that's intense language. It can really hurt someone. "
                      "Take a breath. Is there a better way to express what you're feeling?",
            "slur": "That word carries a history of real pain. Using it — even casually — "
                    "causes harm. Let's find better ways to express yourself.",
            "threat": "Threatening language is serious — online and offline. "
                      "If you're angry, that's valid. But threats aren't the answer. "
                      "Talk to someone you trust about what's upsetting you.",
            "bullying": "What you typed could really hurt someone. Bullying leaves scars "
                        "you can't see. If someone is upsetting you, tell an adult you trust.",
        }
        base = messages.get(severity, messages["mild"])
        if action == "blocked":
            base += " This message was not sent."
        return base

    def _profanity_action_suggestion(self, severity: str) -> str:
        suggestions = {
            "mild": "No action needed unless pattern persists. Monitor frequency.",
            "moderate": "Have a casual conversation about online communication. "
                        "Don't lecture — ask what they were feeling when they typed it.",
            "severe": "Discuss appropriate language in different contexts. "
                      "Gaming chat ≠ social media — but respect matters everywhere.",
            "slur": "This is a teaching moment. Explain the history and impact of the word. "
                    "Approach with curiosity, not punishment.",
            "threat": "Take this seriously. Ask calmly: 'Were you joking or is something wrong?' "
                      "If genuine distress, consider professional support.",
            "bullying": "Priority conversation. Ask: 'Is someone bullying you, or were you upset?' "
                        "Both directions need attention. Consider school counselor involvement.",
        }
        return suggestions.get(severity, suggestions["mild"])

    def get_profanity_summary(self, user_id: str, days: int = 7) -> Dict:
        """Get profanity event summary for the last N days."""
        if not hasattr(self, '_profanity_events'):
            return {"total": 0, "by_severity": {}, "by_platform": {}, "trend": "clean"}

        cutoff = (datetime.now() - timedelta(days=days)).isoformat()
        events = [e for e in self._profanity_events.get(user_id, [])
                  if e.timestamp >= cutoff]

        by_severity = defaultdict(int)
        by_platform = defaultdict(int)
        for e in events:
            by_severity[e.severity] += 1
            by_platform[e.platform] += 1

        return {
            "total": len(events),
            "by_severity": dict(by_severity),
            "by_platform": dict(by_platform),
            "trend": "escalating" if len(events) > 10 else "occasional" if events else "clean",
        }

    # ── Retina Intelligence (Focus & Attention) ───────────────────────────

    def record_focus_snapshot(self, user_id: str, focus_depth: float,
                               attention_intensity: float,
                               gaze_on_screen_pct: float,
                               blink_rate: float = 15.0,
                               head_tilt_deg: float = 0.0,
                               session_duration_sec: float = 0.0,
                               app_id: str = "") -> Dict:
        """
        Record a retina intelligence focus snapshot.
        All data is derived from on-device ARKit processing — no images stored.
        """
        snapshot = RetinaFocusSnapshot(
            timestamp=datetime.now().isoformat(),
            focus_depth=round(max(0, min(1, focus_depth)), 3),
            attention_intensity=round(max(0, min(1, attention_intensity)), 3),
            gaze_on_screen_pct=round(max(0, min(100, gaze_on_screen_pct)), 1),
            blink_rate_per_min=round(blink_rate, 1),
            head_tilt_deg=round(head_tilt_deg, 1),
            session_duration_sec=round(session_duration_sec, 1),
            app_id=app_id,
        )

        if not hasattr(self, '_focus_snapshots'):
            self._focus_snapshots = defaultdict(list)
        self._focus_snapshots[user_id].append(snapshot)

        # Keep last 7 days
        cutoff = (datetime.now() - timedelta(days=7)).isoformat()
        self._focus_snapshots[user_id] = [
            s for s in self._focus_snapshots[user_id] if s.timestamp >= cutoff
        ]

        # Detect patterns
        alerts = self._check_focus_patterns(user_id, snapshot)
        return {"recorded": True, "snapshot": asdict(snapshot), "alerts": [asdict(a) for a in alerts]}

    def _check_focus_patterns(self, user_id: str, snap: RetinaFocusSnapshot) -> List[AegisAlert]:
        """Analyze focus patterns for wellbeing signals."""
        alerts = []

        # Deep focus celebration (flow state candidate)
        if snap.focus_depth > 0.85 and snap.attention_intensity > 0.8 and snap.session_duration_sec > 900:
            alerts.append(AegisAlert(
                alert_id=f"focus_flow_{snap.timestamp}",
                severity="info",
                category="focus",
                title="Deep Focus Detected — Flow State! 🎯",
                child_message=f"You just did {snap.session_duration_sec/60:.0f} min of deep focus "
                              f"on {snap.app_id or 'this activity'}. That's your brain at peak performance!",
                parent_message=f"Flow state detected: {snap.session_duration_sec/60:.0f} min sustained "
                               f"deep focus (depth: {snap.focus_depth:.0%}, intensity: {snap.attention_intensity:.0%}).",
                action_suggestion="Celebrate this! Don't interrupt flow states — they build skill rapidly.",
            ))

        # Fatigue detection (high blink rate OR very low blink rate + low focus)
        if snap.blink_rate_per_min < 8 and snap.focus_depth < 0.3:
            alerts.append(AegisAlert(
                alert_id=f"focus_fatigue_{snap.timestamp}",
                severity="nudge",
                category="focus",
                title="Eye Fatigue Detected",
                child_message="Your eyes are working overtime — blink rate is low, which means strain. "
                              "Try the 20-20-20 rule: look at something 20 feet away for 20 seconds.",
                parent_message=f"Low blink rate ({snap.blink_rate_per_min}/min) + low focus ({snap.focus_depth:.0%}). "
                               f"Screen fatigue likely.",
                action_suggestion="Suggest a 5-minute screen break. Eye drops may also help.",
            ))

        # Stress signal (high blink rate)
        if snap.blink_rate_per_min > 28:
            alerts.append(AegisAlert(
                alert_id=f"focus_stress_{snap.timestamp}",
                severity="watch",
                category="focus",
                title="Elevated Stress Signal",
                child_message="Your blink rate is elevated — that usually means stress or anxiety. "
                              "Take 3 deep breaths: in for 4, hold 4, out for 6.",
                parent_message=f"Blink rate elevated to {snap.blink_rate_per_min}/min "
                               f"(normal: 15-20). Stress indicator during {snap.app_id or 'screen use'}.",
                action_suggestion="Ask casually what they're working on. Don't mention the metric.",
            ))

        # Posture slump (fatigue/disengagement)
        if snap.head_tilt_deg < -15 and snap.focus_depth < 0.4:
            alerts.append(AegisAlert(
                alert_id=f"focus_posture_{snap.timestamp}",
                severity="nudge",
                category="focus",
                title="Posture Check",
                child_message="You're slouching — that compresses your lungs and makes you more tired. "
                              "Sit up, roll your shoulders back, take a deep breath. Instant energy boost!",
                parent_message="Head tilt and low focus suggest fatigue/disengagement.",
                action_suggestion="Suggest a posture break or activity switch.",
            ))

        for a in alerts:
            self._alerts[user_id].append(a)
        return alerts

    def get_focus_profile(self, user_id: str) -> Dict:
        """Build a focus intelligence profile from retina data."""
        if not hasattr(self, '_focus_snapshots'):
            return {"status": "no_data", "message": "Start using retina intelligence to build your focus profile."}

        snapshots = self._focus_snapshots.get(user_id, [])
        if not snapshots:
            return {"status": "no_data"}

        # Aggregate by app
        app_focus = defaultdict(list)
        for s in snapshots:
            app_focus[s.app_id or "unknown"].append(s.focus_depth)

        app_avg_focus = {app: round(sum(scores)/len(scores), 3)
                         for app, scores in app_focus.items() if scores}

        # Best and worst focus apps
        sorted_apps = sorted(app_avg_focus.items(), key=lambda x: x[1], reverse=True)

        # Peak focus hours
        hour_focus = defaultdict(list)
        for s in snapshots:
            try:
                h = datetime.fromisoformat(s.timestamp).hour
                hour_focus[h].append(s.focus_depth)
            except:
                pass
        hour_avg = {h: round(sum(v)/len(v), 3) for h, v in hour_focus.items()}
        peak_hours = sorted(hour_avg.items(), key=lambda x: x[1], reverse=True)[:3]

        # Average sustained session
        deep_sessions = [s for s in snapshots if s.focus_depth > 0.7]
        avg_deep_duration = (sum(s.session_duration_sec for s in deep_sessions) /
                             len(deep_sessions) / 60) if deep_sessions else 0

        return {
            "status": "active",
            "total_snapshots": len(snapshots),
            "avg_focus_depth": round(sum(s.focus_depth for s in snapshots) / len(snapshots), 3),
            "avg_attention_intensity": round(sum(s.attention_intensity for s in snapshots) / len(snapshots), 3),
            "best_focus_apps": sorted_apps[:3],
            "worst_focus_apps": sorted_apps[-3:] if len(sorted_apps) > 3 else [],
            "peak_focus_hours": [{"hour": f"{h}:00", "avg_focus": v} for h, v in peak_hours],
            "avg_deep_session_min": round(avg_deep_duration, 1),
            "flow_state_count": sum(1 for s in snapshots if s.focus_depth > 0.85 and s.session_duration_sec > 900),
        }

    # ── Facial Expression Mood Intelligence ───────────────────────────────

    def record_facial_expression(self, user_id: str,
                                  joy: float = 0, frustration: float = 0,
                                  fatigue: float = 0, surprise: float = 0,
                                  boredom: float = 0, distress: float = 0,
                                  confidence: float = 0.5,
                                  session_app: str = "") -> Dict:
        """
        Record a facial expression mood reading.
        Derived from ARKit AU blend shapes — NO images stored, ever.
        """
        # Determine dominant mood
        emotions = {
            "joy": joy, "frustration": frustration, "fatigue": fatigue,
            "surprise": surprise, "boredom": boredom, "distress": distress,
        }
        dominant = max(emotions, key=emotions.get)
        if emotions[dominant] < 0.15:
            dominant = "neutral"

        reading = FacialExpressionReading(
            timestamp=datetime.now().isoformat(),
            joy=round(max(0, min(1, joy)), 3),
            frustration=round(max(0, min(1, frustration)), 3),
            fatigue=round(max(0, min(1, fatigue)), 3),
            surprise=round(max(0, min(1, surprise)), 3),
            boredom=round(max(0, min(1, boredom)), 3),
            distress=round(max(0, min(1, distress)), 3),
            dominant_mood=dominant,
            confidence=round(confidence, 3),
            session_app=session_app,
        )

        if not hasattr(self, '_facial_readings'):
            self._facial_readings = defaultdict(list)
        self._facial_readings[user_id].append(reading)

        # Keep last 7 days
        cutoff = (datetime.now() - timedelta(days=7)).isoformat()
        self._facial_readings[user_id] = [
            r for r in self._facial_readings[user_id] if r.timestamp >= cutoff
        ]

        # Check for concerning patterns
        alerts = self._check_facial_patterns(user_id, reading)
        return {"recorded": True, "reading": asdict(reading), "alerts": [asdict(a) for a in alerts]}

    def _check_facial_patterns(self, user_id: str, reading: FacialExpressionReading) -> List[AegisAlert]:
        """Analyze facial expression patterns for wellbeing signals."""
        alerts = []
        readings = self._facial_readings.get(user_id, [])

        # Sustained distress (>30 min)
        thirty_min_ago = (datetime.now() - timedelta(minutes=30)).isoformat()
        recent = [r for r in readings if r.timestamp >= thirty_min_ago]
        distress_readings = [r for r in recent if r.distress > 0.5]
        if len(distress_readings) >= 5:  # multiple high-distress readings in 30 min
            existing = [a for a in self._alerts[user_id]
                        if a.category == "facial_mood" and "sustained distress" in a.title.lower()
                        and a.timestamp >= thirty_min_ago]
            if not existing:
                alerts.append(AegisAlert(
                    alert_id=f"face_distress_{reading.timestamp}",
                    severity="alert",
                    category="facial_mood",
                    title="Sustained Distress Detected",
                    child_message="You've seemed upset for a while now. It's okay to feel that way. "
                                  "Want to talk to someone? Sometimes just saying it out loud helps.",
                    parent_message=f"Facial expression analysis shows sustained distress "
                                   f"({len(distress_readings)} readings in 30 min, avg intensity: "
                                   f"{sum(r.distress for r in distress_readings)/len(distress_readings):.0%}). "
                                   f"Active app: {reading.session_app}.",
                    action_suggestion="Reach out with care. 'I noticed you seem down — want to talk or just hang out?'",
                ))

        # Frustration spike during learning
        if reading.frustration > 0.7 and reading.session_app and \
           self.classify_app(reading.session_app) == "learning":
            alerts.append(AegisAlert(
                alert_id=f"face_frustration_{reading.timestamp}",
                severity="nudge",
                category="facial_mood",
                title="Learning Frustration Detected",
                child_message=f"Feeling stuck on {reading.session_app}? That's normal — it means "
                              f"you're at your learning edge. Take a 2-min break, then try a different approach.",
                parent_message=f"High frustration ({reading.frustration:.0%}) during {reading.session_app}. "
                               f"May benefit from a break or alternative learning method.",
                action_suggestion="Ask: 'Need help with anything?' Offer to work through it together.",
            ))

        # Distress during social media
        if reading.distress > 0.5 and reading.session_app and \
           self.classify_app(reading.session_app) == "social_media":
            alerts.append(AegisAlert(
                alert_id=f"face_social_distress_{reading.timestamp}",
                severity="watch",
                category="facial_mood",
                title="Distress During Social Media",
                child_message="Something on social media seems to be upsetting you. "
                              "Remember: what people post isn't their real life. "
                              "Close the app if it's not making you feel good.",
                parent_message=f"Distress detected ({reading.distress:.0%}) while using "
                               f"{reading.session_app}. Possible cyberbullying, comparison anxiety, "
                               f"or disturbing content exposure.",
                action_suggestion="Have a conversation about what they see online. "
                                  "Consider reviewing content filters together.",
            ))

        # Joy during learning (positive reinforcement)
        if reading.joy > 0.6 and reading.session_app and \
           self.classify_app(reading.session_app) == "learning":
            alerts.append(AegisAlert(
                alert_id=f"face_joy_learn_{reading.timestamp}",
                severity="info",
                category="facial_mood",
                title="Joyful Learning Moment! ✨",
                child_message=f"You're genuinely enjoying {reading.session_app} right now — "
                              f"that's when your brain absorbs the most. Ride the wave!",
                parent_message=f"Positive engagement detected during {reading.session_app} "
                               f"(joy: {reading.joy:.0%}). This topic/app resonates.",
                action_suggestion="Note this app/topic as a strength area. Encourage more of it.",
            ))

        for a in alerts:
            self._alerts[user_id].append(a)
        return alerts

    def get_mood_timeline(self, user_id: str, hours: int = 24) -> List[Dict]:
        """Get facial expression mood timeline for the dashboard."""
        if not hasattr(self, '_facial_readings'):
            return []

        cutoff = (datetime.now() - timedelta(hours=hours)).isoformat()
        readings = [r for r in self._facial_readings.get(user_id, [])
                    if r.timestamp >= cutoff]
        return [asdict(r) for r in readings]

    def get_emotion_by_app(self, user_id: str) -> Dict[str, Dict]:
        """Get dominant emotions per app — reveals what makes them happy/stressed."""
        if not hasattr(self, '_facial_readings'):
            return {}

        app_emotions = defaultdict(lambda: defaultdict(list))
        for r in self._facial_readings.get(user_id, []):
            app = r.session_app or "unknown"
            app_emotions[app]["joy"].append(r.joy)
            app_emotions[app]["frustration"].append(r.frustration)
            app_emotions[app]["distress"].append(r.distress)
            app_emotions[app]["boredom"].append(r.boredom)

        result = {}
        for app, emotions in app_emotions.items():
            result[app] = {
                emo: round(sum(vals) / len(vals), 3)
                for emo, vals in emotions.items() if vals
            }
        return result

    # ── Report Generation ─────────────────────────────────────────────────

    def generate_daily_screen_report(self, user_id: str,
                                      date: str = None) -> ScreenTimeReport:
        """Generate a daily screen time summary report."""
        date = date or datetime.now().strftime("%Y-%m-%d")
        config = self.get_config(user_id)
        entries = [e for e in self._screen_time[user_id] if e.date == date]

        by_category = defaultdict(float)
        by_app = defaultdict(float)
        longest_session = 0.0
        first_use = None
        last_use = None

        for e in entries:
            by_category[e.category] += e.duration_min
            by_app[e.app_name] += e.duration_min
            longest_session = max(longest_session, e.duration_min)
            if first_use is None or e.start_time < first_use:
                first_use = e.start_time
            if last_use is None or e.end_time > last_use:
                last_use = e.end_time

        total = sum(by_category.values())
        top_app = max(by_app, key=by_app.get) if by_app else ""

        report = ScreenTimeReport(
            user_id=user_id,
            date=date,
            total_minutes=round(total, 1),
            by_category=dict(by_category),
            by_app=dict(by_app),
            top_app=top_app,
            longest_session_min=round(longest_session, 1),
            threshold_pct=round(total / max(config["daily_limit_min"], 1) * 100, 1),
            first_use=first_use or "",
            last_use=last_use or "",
            learning_minutes=round(by_category.get("learning", 0), 1),
            creative_minutes=round(by_category.get("creative", 0), 1),
            social_minutes=round(by_category.get("social_media", 0), 1),
            gaming_minutes=round(by_category.get("gaming", 0), 1),
        )

        self._daily_reports[user_id][date] = report
        return report

    def generate_exchange_report(self, user_id: str,
                                  date: str = None) -> ExchangeReport:
        """Generate a daily exchange pattern report."""
        date = date or datetime.now().strftime("%Y-%m-%d")
        entries = [e for e in self._exchange_meta[user_id] if e.timestamp[:10] == date]

        sent = sum(1 for e in entries if e.direction == "sent")
        received = sum(1 for e in entries if e.direction == "received")
        platforms = list(set(e.platform for e in entries))
        late_night = sum(1 for e in entries
                         if 0 <= datetime.fromisoformat(e.timestamp).hour < 5)

        # Peak hour
        hour_counts = defaultdict(int)
        for e in entries:
            try:
                hour_counts[datetime.fromisoformat(e.timestamp).hour] += 1
            except:
                pass
        peak_hour = str(max(hour_counts, key=hour_counts.get)) + ":00" if hour_counts else ""

        # Average response latency
        latencies = [e.response_latency_sec for e in entries
                     if e.response_latency_sec is not None]
        avg_latency = sum(latencies) / len(latencies) if latencies else 0.0

        # Platform switches
        sorted_entries = sorted(entries, key=lambda e: e.timestamp)
        switches = 0
        for i in range(1, len(sorted_entries)):
            if sorted_entries[i].platform != sorted_entries[i-1].platform:
                switches += 1

        # Volume vs baseline (7-day avg)
        week_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        week_entries = [e for e in self._exchange_meta[user_id]
                        if e.timestamp[:10] >= week_ago and e.timestamp[:10] != date]
        days_in_week = len(set(e.timestamp[:10] for e in week_entries)) or 1
        weekly_avg = len(week_entries) / days_in_week
        volume_ratio = len(entries) / max(weekly_avg, 1)

        report = ExchangeReport(
            user_id=user_id,
            date=date,
            total_messages=len(entries),
            sent=sent,
            received=received,
            platforms_used=platforms,
            peak_hour=peak_hour,
            late_night_count=late_night,
            avg_response_latency_sec=round(avg_latency, 1),
            platform_switches=switches,
            volume_vs_baseline=round(volume_ratio, 2),
        )

        self._exchange_reports[user_id][date] = report
        return report

    def generate_weekly_summary(self, user_id: str) -> Dict:
        """Generate a 7-day summary for the parental sharing dashboard."""
        now = datetime.now()
        days = []
        total_screen = 0.0
        total_learning = 0.0
        total_gaming = 0.0
        total_social = 0.0
        total_creative = 0.0
        total_messages = 0
        late_night_days = 0

        for i in range(7):
            date = (now - timedelta(days=i)).strftime("%Y-%m-%d")
            st_report = self.generate_daily_screen_report(user_id, date)
            ex_report = self.generate_exchange_report(user_id, date)

            days.append({
                "date": date,
                "screen_minutes": st_report.total_minutes,
                "learning_minutes": st_report.learning_minutes,
                "gaming_minutes": st_report.gaming_minutes,
                "social_minutes": st_report.social_minutes,
                "creative_minutes": st_report.creative_minutes,
                "messages": ex_report.total_messages,
                "late_night_messages": ex_report.late_night_count,
                "threshold_pct": st_report.threshold_pct,
            })

            total_screen += st_report.total_minutes
            total_learning += st_report.learning_minutes
            total_gaming += st_report.gaming_minutes
            total_social += st_report.social_minutes
            total_creative += st_report.creative_minutes
            total_messages += ex_report.total_messages
            if ex_report.late_night_count > 0:
                late_night_days += 1

        # Active alerts
        active_alerts = [asdict(a) for a in self._alerts[user_id] if not a.resolved]

        config = self.get_config(user_id)
        avg_daily = total_screen / 7

        return {
            "user_id": user_id,
            "period": f"{days[-1]['date']} to {days[0]['date']}",
            "days": list(reversed(days)),
            "summary": {
                "avg_daily_screen_min": round(avg_daily, 1),
                "total_learning_min": round(total_learning, 1),
                "total_gaming_min": round(total_gaming, 1),
                "total_social_min": round(total_social, 1),
                "total_creative_min": round(total_creative, 1),
                "total_messages": total_messages,
                "late_night_days": late_night_days,
                "avg_threshold_pct": round(avg_daily / max(config["daily_limit_min"], 1) * 100, 1),
            },
            "highlights": self._generate_highlights(
                total_learning, total_gaming, total_social, total_creative,
                avg_daily, config["daily_limit_min"], late_night_days, total_messages
            ),
            "active_alerts": active_alerts[-10:],
            "config": config,
        }

    def _generate_highlights(self, learning, gaming, social, creative,
                              avg_daily, limit, late_nights, messages) -> List[Dict]:
        """Generate human-readable highlights for the weekly summary."""
        highlights = []

        # Positive highlights first
        if learning > 120:
            highlights.append({
                "type": "positive", "icon": "📚",
                "text": f"{learning:.0f} min of learning this week — that's building real knowledge."
            })
        if creative > 60:
            highlights.append({
                "type": "positive", "icon": "🎨",
                "text": f"{creative:.0f} min of creative time — coding, art, or music. Love to see it."
            })
        if avg_daily <= limit * 0.8:
            highlights.append({
                "type": "positive", "icon": "✅",
                "text": f"Averaging {avg_daily:.0f} min/day — well within the {limit} min target."
            })

        # Concerns
        if avg_daily > limit:
            highlights.append({
                "type": "concern", "icon": "⚠️",
                "text": f"Averaging {avg_daily:.0f} min/day — over the {limit} min daily target."
            })
        if gaming > learning * 2 and gaming > 120:
            highlights.append({
                "type": "concern", "icon": "🎮",
                "text": f"Gaming ({gaming:.0f} min) is 2x+ learning time ({learning:.0f} min). Worth rebalancing."
            })
        if late_nights >= 3:
            highlights.append({
                "type": "concern", "icon": "🌙",
                "text": f"Late-night device use on {late_nights} of 7 days. Sleep quality may be affected."
            })
        if social > 180:
            highlights.append({
                "type": "concern", "icon": "📱",
                "text": f"{social:.0f} min on social media this week. Consider a social media detox day."
            })

        return highlights

    # ── Alert Management ──────────────────────────────────────────────────

    def get_alerts(self, user_id: str, severity: str = None,
                   unresolved_only: bool = False,
                   category: str = None, limit: int = 50) -> List[Dict]:
        alerts = self._alerts.get(user_id, [])
        if severity:
            alerts = [a for a in alerts if a.severity == severity]
        if category:
            alerts = [a for a in alerts if a.category == category]
        if unresolved_only:
            alerts = [a for a in alerts if not a.resolved]
        return [asdict(a) for a in alerts[-limit:]]

    def acknowledge_alert(self, user_id: str, alert_id: str,
                          by: str = "child") -> bool:
        """Mark alert as acknowledged by child or parent."""
        for a in self._alerts.get(user_id, []):
            if a.alert_id == alert_id:
                if by == "child":
                    a.acknowledged_by_child = True
                else:
                    a.acknowledged_by_parent = True
                if a.acknowledged_by_child and a.acknowledged_by_parent:
                    a.resolved = True
                return True
        return False

    # ── Parental Sharing ──────────────────────────────────────────────────

    def get_parental_share_data(self, user_id: str) -> Dict:
        """
        Generate the full parental sharing package.
        This is the SAME data the child can see on their dashboard.
        Nothing is hidden from either party.
        """
        weekly = self.generate_weekly_summary(user_id)
        today = datetime.now().strftime("%Y-%m-%d")
        today_screen = self.generate_daily_screen_report(user_id, today)
        today_exchange = self.generate_exchange_report(user_id, today)

        return {
            "shared_at": datetime.now().isoformat(),
            "transparency_note": "This dashboard shows the same data visible to your child. "
                                 "Nothing is hidden from either party.",
            "today": {
                "screen_time": asdict(today_screen),
                "exchange_patterns": asdict(today_exchange),
            },
            "weekly_summary": weekly,
            "active_alerts": self.get_alerts(user_id, unresolved_only=True),
            "config": self.get_config(user_id),
        }

    # ── Full AEGIS Analysis (cross-silo intelligence) ─────────────────────

    def full_analysis(self, user_id: str,
                      mood_data: Dict = None,
                      voice_stress: float = None) -> Dict:
        """
        Cross-silo fusion: screen time + exchanges + mood + voice biomarkers
        + retina focus + facial expressions + profanity patterns.
        This is the heart of AEGIS intelligence.
        """
        today = datetime.now().strftime("%Y-%m-%d")
        screen = self.generate_daily_screen_report(user_id, today)
        exchange = self.generate_exchange_report(user_id, today)
        alerts = self.get_alerts(user_id, unresolved_only=True)

        # Mood fusion score (0.0 = thriving, 1.0 = crisis)
        signals = []

        # Signal 1: Screen time pattern
        if screen.threshold_pct > 120:
            signals.append(0.6)
        elif screen.threshold_pct > 100:
            signals.append(0.4)
        else:
            signals.append(0.2)

        # Signal 2: Social vs learning ratio
        if screen.social_minutes > screen.learning_minutes * 2 and screen.social_minutes > 30:
            signals.append(0.5)
        else:
            signals.append(0.2)

        # Signal 3: Exchange patterns
        if exchange.late_night_count > 3:
            signals.append(0.7)
        elif exchange.volume_vs_baseline > 3.0:
            signals.append(0.6)
        elif exchange.volume_vs_baseline < 0.3 and exchange.total_messages > 0:
            signals.append(0.65)  # isolation signal
        else:
            signals.append(0.2)

        # Signal 4: Voice biomarker (if available)
        if voice_stress is not None:
            signals.append(voice_stress)

        # Signal 5: Mood check-in (if available)
        if mood_data and "score" in mood_data:
            signals.append(1.0 - mood_data["score"] / 100)

        # Signal 6: Retina focus intelligence (if available)
        focus_profile = self.get_focus_profile(user_id)
        if focus_profile.get("status") == "active":
            avg_focus = focus_profile.get("avg_focus_depth", 0.5)
            # Low focus = higher stress signal
            signals.append(max(0, 0.8 - avg_focus))

        # Signal 7: Facial expression mood (if available)
        recent_facial = self.get_mood_timeline(user_id, hours=2)
        if recent_facial:
            avg_distress = sum(r["distress"] for r in recent_facial) / len(recent_facial)
            avg_joy = sum(r["joy"] for r in recent_facial) / len(recent_facial)
            facial_signal = max(0, min(1, avg_distress - avg_joy * 0.5 + 0.2))
            signals.append(facial_signal)

        # Signal 8: Profanity pattern (if data exists)
        profanity = self.get_profanity_summary(user_id, days=1)
        if profanity.get("total", 0) > 0:
            severity_weights = {"mild": 0.1, "moderate": 0.3, "severe": 0.5,
                                "slur": 0.7, "threat": 0.9, "bullying": 0.85}
            profanity_signal = 0.0
            for sev, count in profanity.get("by_severity", {}).items():
                profanity_signal += severity_weights.get(sev, 0.1) * min(count, 5) / 5
            signals.append(min(1.0, profanity_signal))

        # Weighted fusion
        fusion_score = sum(signals) / len(signals) if signals else 0.3

        # Determine overall status
        if fusion_score > 0.75:
            status = "critical"
            status_label = "Needs Immediate Attention"
        elif fusion_score > 0.55:
            status = "alert"
            status_label = "Concerning Pattern"
        elif fusion_score > 0.4:
            status = "watch"
            status_label = "Monitoring"
        elif fusion_score > 0.25:
            status = "stable"
            status_label = "Healthy Balance"
        else:
            status = "thriving"
            status_label = "Thriving"

        return {
            "user_id": user_id,
            "timestamp": datetime.now().isoformat(),
            "fusion_score": round(fusion_score, 3),
            "status": status,
            "status_label": status_label,
            "signals": {
                "screen_time_stress": round(signals[0], 3) if len(signals) > 0 else None,
                "content_balance": round(signals[1], 3) if len(signals) > 1 else None,
                "exchange_pattern": round(signals[2], 3) if len(signals) > 2 else None,
                "voice_biomarker": round(signals[3], 3) if len(signals) > 3 else None,
                "mood_checkin": round(signals[4], 3) if len(signals) > 4 else None,
            },
            "screen_summary": {
                "total_min": screen.total_minutes,
                "threshold_pct": screen.threshold_pct,
                "top_app": screen.top_app,
                "learning_min": screen.learning_minutes,
                "gaming_min": screen.gaming_minutes,
                "social_min": screen.social_minutes,
                "creative_min": screen.creative_minutes,
            },
            "exchange_summary": {
                "total_messages": exchange.total_messages,
                "late_night": exchange.late_night_count,
                "volume_vs_baseline": exchange.volume_vs_baseline,
                "platforms": exchange.platforms_used,
            },
            "focus_intelligence": focus_profile if focus_profile.get("status") == "active" else None,
            "facial_mood": {
                "recent_timeline": recent_facial[-5:] if recent_facial else [],
                "emotion_by_app": self.get_emotion_by_app(user_id),
            } if recent_facial else None,
            "profanity_summary": profanity if profanity.get("total", 0) > 0 else None,
            "active_alerts": alerts,
            "recommendation": self._generate_aegis_recommendation(
                fusion_score, status, screen, exchange
            ),
        }

    def _generate_aegis_recommendation(self, score: float, status: str,
                                        screen: ScreenTimeReport,
                                        exchange: ExchangeReport) -> Dict:
        """Generate AEGIS recommendation for both child and parent."""
        if status == "critical":
            return {
                "child": "Hey — it looks like things are really intense right now. "
                         "You don't have to handle it alone. Talk to someone you trust, "
                         "or call Tele-MANAS: 14416. They're free, confidential, and they get it.",
                "parent": "Multiple distress signals converging: elevated screen time, "
                          "unusual exchange patterns, and mood indicators suggest your child "
                          "may need support. Initiate a calm, non-judgmental conversation. "
                          "If distress is severe, Tele-MANAS (14416) is available 24/7.",
                "priority": "immediate",
            }
        elif status == "alert":
            return {
                "child": "Your AEGIS guardian noticed some patterns worth checking on. "
                         "Nothing's wrong — but a break or a chat with someone could help "
                         "reset your vibe.",
                "parent": f"Pattern summary: {screen.total_minutes:.0f} min screen time "
                          f"({screen.threshold_pct:.0f}% of limit), "
                          f"{exchange.late_night_count} late-night messages. "
                          f"A casual check-in is recommended — keep it light.",
                "priority": "today",
            }
        elif status == "watch":
            return {
                "child": "Your screen balance is a little off today. "
                         f"Try swapping {int(screen.social_minutes)} min of scrolling "
                         f"for something creative?",
                "parent": "Mild imbalance detected. Consider discussing daily screen goals "
                          "together this weekend.",
                "priority": "this_week",
            }
        else:
            return {
                "child": "You're doing great — solid balance between screen time "
                         "and real-world stuff. Keep it up! 💪",
                "parent": f"Healthy patterns: {screen.learning_minutes:.0f} min learning, "
                          f"{screen.creative_minutes:.0f} min creative. Well within limits.",
                "priority": "none",
            }


# ═══════════════════════════════════════════════════════════════════════════════
# SINGLETON
# ═══════════════════════════════════════════════════════════════════════════════

_aegis = AegisGuardian()

def get_aegis_guardian() -> AegisGuardian:
    return _aegis

def get_aegis_system_prompt() -> str:
    return AEGIS_SYSTEM_PROMPT
