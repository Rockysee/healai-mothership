/**
 * A.E.G.I.S. — Adaptive Empathic Guardian Intelligence System
 * Next.js App Router API Route
 *
 * Endpoints (via action parameter):
 *   POST /api/aegis  { action: "screen_time",   ... }  → Record screen time
 *   POST /api/aegis  { action: "exchange",       ... }  → Record exchange metadata
 *   POST /api/aegis  { action: "profanity",      ... }  → Scan text for profanity
 *   POST /api/aegis  { action: "focus",          ... }  → Record retina focus snapshot
 *   POST /api/aegis  { action: "facial",         ... }  → Record facial expression
 *   POST /api/aegis  { action: "configure",      ... }  → Set user thresholds
 *   POST /api/aegis  { action: "analysis",       ... }  → Full cross-silo analysis
 *   POST /api/aegis  { action: "daily_report",   ... }  → Daily screen time report
 *   POST /api/aegis  { action: "weekly_summary", ... }  → Weekly summary
 *   POST /api/aegis  { action: "parental_share", ... }  → Parental sharing dashboard
 *   POST /api/aegis  { action: "alerts",         ... }  → Get alerts
 *   POST /api/aegis  { action: "acknowledge",    ... }  → Acknowledge an alert
 *   POST /api/aegis  { action: "focus_profile",  ... }  → Get focus intelligence profile
 *   POST /api/aegis  { action: "mood_timeline",  ... }  → Get facial mood timeline
 *   POST /api/aegis  { action: "emotion_by_app", ... }  → Emotion breakdown by app
 *   POST /api/aegis  { action: "profanity_summary", ... } → Profanity event summary
 *
 * Note: In production, the Python AEGIS engine runs as a FastAPI microservice.
 * This JS route provides a lightweight in-memory equivalent for the Next.js app,
 * matching the Python API 1:1. When the Python server is running, the frontend
 * can call either endpoint.
 *
 * Goldenhour Systems Pvt Ltd · ambulance.run
 */

// ── In-memory AEGIS state (mirrors Python AegisGuardian class) ──────────────
const state = {
  screenTime: {},      // userId → [entries]
  exchangeMeta: {},    // userId → [entries]
  alerts: {},          // userId → [alerts]
  focusSnapshots: {},  // userId → [snapshots]
  facialReadings: {},  // userId → [readings]
  profanityEvents: {}, // userId → [events]
  config: {},          // userId → config
};

// ── App category classification ─────────────────────────────────────────────
const APP_CATEGORIES = {
  learning:      ["duolingo","khan_academy","vijnana","healai","coursera","brilliant","photomath","quizlet","notion","obsidian"],
  social_media:  ["instagram","snapchat","tiktok","twitter","reddit","threads","youtube_shorts","facebook"],
  gaming:        ["roblox","minecraft","fortnite","pubg","cod","genshin","subway","among_us","clash"],
  creative:      ["garage_band","procreate","canva","capcut","figma","scratch","replit","vs_code","blender"],
  communication: ["whatsapp","imessage","telegram","discord","signal","facetime","zoom","google_meet"],
  utility:       ["settings","calculator","files","clock","calendar","maps","weather","notes","reminders"],
  streaming:     ["youtube","netflix","spotify","apple_music","prime_video","hotstar","jio_cinema"],
};

function classifyApp(appId) {
  const lower = (appId || "").toLowerCase().replace(/\s+/g, "_");
  for (const [cat, apps] of Object.entries(APP_CATEGORIES)) {
    if (apps.some(a => lower.includes(a))) return cat;
  }
  return "utility";
}

// ── Profanity lexicon ───────────────────────────────────────────────────────
const PROFANITY = {
  mild:     ["damn","hell","crap","sucks","stupid","idiot","dumb","shut up","wtf"],
  moderate: ["ass","bastard","bitch","dick","piss","shit","screw you","bullshit"],
  severe:   ["fuck","fucking","motherfucker","stfu","asshole","cunt"],
  slur:     ["retard","retarded","fag","faggot","tranny"],
  threat:   ["kill you","kill yourself","kys","die","hurt you","beat you up"],
  bullying: ["ugly","fat","loser","nobody likes you","kys","go die","worthless","pathetic"],
};

function scanProfanity(text) {
  const lower = (text || "").toLowerCase();
  const hits = [];
  const order = ["mild","moderate","severe","slur","threat","bullying"];
  for (const [sev, words] of Object.entries(PROFANITY)) {
    for (const w of words) {
      if (lower.includes(w)) hits.push({ severity: sev, word: w });
    }
  }
  if (!hits.length) return { clean: true, severity: null, action: "none" };
  const worst = hits.sort((a, b) => order.indexOf(b.severity) - order.indexOf(a.severity))[0];
  const action = ["threat","bullying","slur"].includes(worst.severity) ? "blocked"
    : worst.severity === "severe" ? "flagged"
    : worst.severity === "moderate" ? "flagged" : "logged";
  return { clean: false, severity: worst.severity, action, count: hits.length };
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function getConfig(userId) {
  return state.config[userId] || {
    age: 14, daily_limit_min: 240, gaming_limit_min: 60,
    social_limit_min: 45, bedtime: "22:00", wake_time: "07:00",
    block_on_exceed: false,
  };
}

function today() { return new Date().toISOString().slice(0, 10); }
function nowISO() { return new Date().toISOString(); }

function pushAlert(userId, alert) {
  if (!state.alerts[userId]) state.alerts[userId] = [];
  state.alerts[userId].push({ ...alert, timestamp: nowISO(), resolved: false,
    acknowledged_by_child: false, acknowledged_by_parent: false });
}

function todayEntries(userId) {
  const d = today();
  return (state.screenTime[userId] || []).filter(e => e.date === d);
}

// ── POST Handler ────────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const body = await request.json();
    const { action, userId = "default", ...data } = body;

    if (!action) return Response.json({ error: "action required" }, { status: 400 });

    switch (action) {

      // ── Configure thresholds ────────────────────────────────────────
      case "configure": {
        const { age = 14, daily_limit_min, gaming_limit_min, social_limit_min,
                bedtime = "22:00", wake_time = "07:00", block_on_exceed = false } = data;
        const defaults = age <= 9 ? [120, 30, 15] : age <= 12 ? [180, 45, 30] : [240, 60, 45];
        state.config[userId] = {
          age, bedtime, wake_time, block_on_exceed,
          daily_limit_min: daily_limit_min ?? defaults[0],
          gaming_limit_min: gaming_limit_min ?? defaults[1],
          social_limit_min: social_limit_min ?? defaults[2],
        };
        return Response.json({ configured: true, config: state.config[userId] });
      }

      // ── Record screen time ──────────────────────────────────────────
      case "screen_time": {
        const { appId, appName, durationMin, startTime } = data;
        if (!appId || !durationMin) return Response.json({ error: "appId and durationMin required" }, { status: 400 });
        const entry = {
          app_id: appId, app_name: appName || appId,
          category: classifyApp(appId), duration_min: durationMin,
          start_time: startTime || nowISO(), end_time: nowISO(), date: today(),
        };
        if (!state.screenTime[userId]) state.screenTime[userId] = [];
        state.screenTime[userId].push(entry);

        // Threshold alerts
        const cfg = getConfig(userId);
        const entries = todayEntries(userId);
        const total = entries.reduce((s, e) => s + e.duration_min, 0);
        const pct = total / cfg.daily_limit_min * 100;
        const alerts = [];

        if (pct >= 100) {
          const a = { alert_id: `st_daily_${today()}`, severity: "alert", category: "screentime",
            title: "Daily Screen Time Limit Reached",
            child_message: `${Math.round(total)} min used — time for a real-world break!`,
            parent_message: `Daily limit reached: ${Math.round(total)}/${cfg.daily_limit_min} min.` };
          pushAlert(userId, a); alerts.push(a);
        } else if (pct >= 80) {
          const a = { alert_id: `st_80_${today()}`, severity: "nudge", category: "screentime",
            title: "Approaching Daily Limit",
            child_message: `${Math.round(pct)}% used — ${Math.round(cfg.daily_limit_min - total)} min left.`,
            parent_message: `Screen time at ${Math.round(pct)}% of limit.` };
          pushAlert(userId, a); alerts.push(a);
        }

        return Response.json({ recorded: true, entry, alerts, total_today_min: Math.round(total), threshold_pct: Math.round(pct) });
      }

      // ── Record exchange metadata ────────────────────────────────────
      case "exchange": {
        const { platform, direction, messageLengthBucket, contactHash, responseLatencySec } = data;
        const entry = { platform, direction, message_length_bucket: messageLengthBucket,
          contact_hash: contactHash, response_latency_sec: responseLatencySec, timestamp: nowISO() };
        if (!state.exchangeMeta[userId]) state.exchangeMeta[userId] = [];
        state.exchangeMeta[userId].push(entry);
        return Response.json({ recorded: true });
      }

      // ── Scan profanity ──────────────────────────────────────────────
      case "profanity": {
        const { text, platform = "unknown", context = "outbound_chat" } = data;
        if (!text) return Response.json({ error: "text required" }, { status: 400 });
        const result = scanProfanity(text);
        if (!result.clean) {
          if (!state.profanityEvents[userId]) state.profanityEvents[userId] = [];
          state.profanityEvents[userId].push({
            timestamp: nowISO(), platform, severity: result.severity,
            action: result.action, context,
          });
          if (result.action !== "logged") {
            const a = { alert_id: `prof_${Date.now()}`, severity: result.severity === "threat" ? "alert" : "watch",
              category: "profanity", title: `Language Flag: ${result.severity}`,
              child_message: "Your words have power — choose them wisely.",
              parent_message: `Outbound text flagged (${result.severity}) on ${platform}.` };
            pushAlert(userId, a);
          }
        }
        return Response.json(result);
      }

      // ── Record retina focus snapshot ────────────────────────────────
      case "focus": {
        const { focusDepth, attentionIntensity, gazeOnScreenPct, blinkRate = 15,
                headTiltDeg = 0, sessionDurationSec = 0, appId: fAppId = "" } = data;
        const snap = {
          timestamp: nowISO(), focus_depth: Math.max(0, Math.min(1, focusDepth || 0)),
          attention_intensity: Math.max(0, Math.min(1, attentionIntensity || 0)),
          gaze_on_screen_pct: gazeOnScreenPct, blink_rate: blinkRate,
          head_tilt_deg: headTiltDeg, session_duration_sec: sessionDurationSec, app_id: fAppId,
        };
        if (!state.focusSnapshots[userId]) state.focusSnapshots[userId] = [];
        state.focusSnapshots[userId].push(snap);

        const alerts = [];
        // Flow state detection
        if (snap.focus_depth > 0.85 && snap.attention_intensity > 0.8 && sessionDurationSec > 900) {
          const a = { alert_id: `flow_${Date.now()}`, severity: "info", category: "focus",
            title: "Deep Focus — Flow State! 🎯",
            child_message: `${Math.round(sessionDurationSec/60)} min of deep focus — your brain is in the zone!`,
            parent_message: `Flow state: ${Math.round(sessionDurationSec/60)} min sustained deep focus.` };
          pushAlert(userId, a); alerts.push(a);
        }
        // Fatigue
        if (blinkRate < 8 && (focusDepth || 0) < 0.3) {
          const a = { alert_id: `fatigue_${Date.now()}`, severity: "nudge", category: "focus",
            title: "Eye Fatigue Detected",
            child_message: "Your eyes need a break — try the 20-20-20 rule!",
            parent_message: `Low blink rate (${blinkRate}/min) + low focus. Screen fatigue.` };
          pushAlert(userId, a); alerts.push(a);
        }
        // Stress blink rate
        if (blinkRate > 28) {
          const a = { alert_id: `stress_blink_${Date.now()}`, severity: "watch", category: "focus",
            title: "Elevated Stress Signal",
            child_message: "Blink rate is elevated — take 3 deep breaths.",
            parent_message: `Blink rate: ${blinkRate}/min (normal: 15-20). Stress indicator.` };
          pushAlert(userId, a); alerts.push(a);
        }

        return Response.json({ recorded: true, snapshot: snap, alerts });
      }

      // ── Record facial expression ────────────────────────────────────
      case "facial": {
        const { joy = 0, frustration = 0, fatigue: fat = 0, surprise = 0,
                boredom = 0, distress = 0, confidence = 0.5, sessionApp = "" } = data;
        const emotions = { joy, frustration, fatigue: fat, surprise, boredom, distress };
        const dominant = Object.entries(emotions).sort((a, b) => b[1] - a[1])[0];
        const reading = {
          timestamp: nowISO(), joy, frustration, fatigue: fat, surprise, boredom, distress,
          dominant_mood: dominant[1] >= 0.15 ? dominant[0] : "neutral",
          confidence, session_app: sessionApp,
        };
        if (!state.facialReadings[userId]) state.facialReadings[userId] = [];
        state.facialReadings[userId].push(reading);

        const alerts = [];
        // Distress during social media
        if (distress > 0.5 && classifyApp(sessionApp) === "social_media") {
          const a = { alert_id: `face_social_${Date.now()}`, severity: "watch", category: "facial_mood",
            title: "Distress During Social Media",
            child_message: "Something online seems to be upsetting you. Close the app if it's not making you feel good.",
            parent_message: `Distress (${Math.round(distress*100)}%) on ${sessionApp}.` };
          pushAlert(userId, a); alerts.push(a);
        }
        // Joy during learning
        if (joy > 0.6 && classifyApp(sessionApp) === "learning") {
          const a = { alert_id: `face_joy_${Date.now()}`, severity: "info", category: "facial_mood",
            title: "Joyful Learning! ✨",
            child_message: `You're loving ${sessionApp} right now — ride the wave!`,
            parent_message: `Positive engagement on ${sessionApp} (joy: ${Math.round(joy*100)}%).` };
          pushAlert(userId, a); alerts.push(a);
        }

        return Response.json({ recorded: true, reading, alerts });
      }

      // ── Full cross-silo analysis ────────────────────────────────────
      case "analysis": {
        const { moodScore, voiceStress } = data;
        const cfg = getConfig(userId);
        const entries = todayEntries(userId);
        const total = entries.reduce((s, e) => s + e.duration_min, 0);
        const byCategory = {};
        entries.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + e.duration_min; });

        const signals = [];
        // Screen time
        const pct = total / cfg.daily_limit_min * 100;
        signals.push(pct > 120 ? 0.6 : pct > 100 ? 0.4 : 0.2);
        // Social vs learning
        const social = byCategory.social_media || 0;
        const learning = byCategory.learning || 0;
        signals.push(social > learning * 2 && social > 30 ? 0.5 : 0.2);
        // Voice
        if (voiceStress != null) signals.push(voiceStress);
        // Mood
        if (moodScore != null) signals.push(1.0 - moodScore / 100);
        // Focus
        const snaps = state.focusSnapshots[userId] || [];
        if (snaps.length) {
          const avgFocus = snaps.reduce((s, x) => s + x.focus_depth, 0) / snaps.length;
          signals.push(Math.max(0, 0.8 - avgFocus));
        }
        // Facial
        const readings = state.facialReadings[userId] || [];
        const recent = readings.slice(-10);
        if (recent.length) {
          const avgDist = recent.reduce((s, r) => s + r.distress, 0) / recent.length;
          const avgJoy = recent.reduce((s, r) => s + r.joy, 0) / recent.length;
          signals.push(Math.max(0, Math.min(1, avgDist - avgJoy * 0.5 + 0.2)));
        }
        // Profanity
        const profEvents = (state.profanityEvents[userId] || []).filter(e => e.timestamp.slice(0,10) === today());
        if (profEvents.length) {
          const sevW = { mild: 0.1, moderate: 0.3, severe: 0.5, slur: 0.7, threat: 0.9, bullying: 0.85 };
          let ps = 0;
          profEvents.forEach(e => { ps += (sevW[e.severity] || 0.1) * Math.min(1, 1); });
          signals.push(Math.min(1, ps));
        }

        const fusion = signals.length ? signals.reduce((a, b) => a + b) / signals.length : 0.3;
        const status = fusion > 0.75 ? "critical" : fusion > 0.55 ? "alert" : fusion > 0.4 ? "watch" : fusion > 0.25 ? "stable" : "thriving";

        return Response.json({
          fusion_score: +fusion.toFixed(3), status,
          screen: { total_min: Math.round(total), threshold_pct: Math.round(pct), by_category: byCategory },
          active_alerts: (state.alerts[userId] || []).filter(a => !a.resolved).slice(-20),
          signal_count: signals.length,
        });
      }

      // ── Daily report ────────────────────────────────────────────────
      case "daily_report": {
        const d = data.date || today();
        const entries = (state.screenTime[userId] || []).filter(e => e.date === d);
        const byCategory = {};
        const byApp = {};
        let longest = 0;
        entries.forEach(e => {
          byCategory[e.category] = (byCategory[e.category] || 0) + e.duration_min;
          byApp[e.app_name] = (byApp[e.app_name] || 0) + e.duration_min;
          if (e.duration_min > longest) longest = e.duration_min;
        });
        const total = Object.values(byCategory).reduce((a, b) => a + b, 0);
        const cfg = getConfig(userId);
        return Response.json({
          date: d, total_minutes: Math.round(total),
          threshold_pct: Math.round(total / cfg.daily_limit_min * 100),
          by_category: byCategory, by_app: byApp,
          longest_session_min: Math.round(longest),
          learning_min: Math.round(byCategory.learning || 0),
          creative_min: Math.round(byCategory.creative || 0),
          social_min: Math.round(byCategory.social_media || 0),
          gaming_min: Math.round(byCategory.gaming || 0),
        });
      }

      // ── Weekly summary ──────────────────────────────────────────────
      case "weekly_summary": {
        const days = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
          const entries = (state.screenTime[userId] || []).filter(e => e.date === d);
          const byCategory = {};
          entries.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + e.duration_min; });
          const total = Object.values(byCategory).reduce((a, b) => a + b, 0);
          days.push({ date: d, screen_minutes: Math.round(total),
            learning: Math.round(byCategory.learning || 0),
            gaming: Math.round(byCategory.gaming || 0),
            social: Math.round(byCategory.social_media || 0),
            creative: Math.round(byCategory.creative || 0) });
        }
        return Response.json({ days: days.reverse(), config: getConfig(userId),
          active_alerts: (state.alerts[userId] || []).filter(a => !a.resolved).slice(-10) });
      }

      // ── Parental sharing ────────────────────────────────────────────
      case "parental_share": {
        return Response.json({
          transparency_note: "This dashboard shows the same data visible to your child.",
          today: { screen: todayEntries(userId), alerts: (state.alerts[userId] || []).slice(-20) },
          config: getConfig(userId),
          focus_profile: (() => {
            const snaps = state.focusSnapshots[userId] || [];
            if (!snaps.length) return null;
            return { avg_focus: +(snaps.reduce((s, x) => s + x.focus_depth, 0) / snaps.length).toFixed(3),
              total_snapshots: snaps.length };
          })(),
          profanity: (() => {
            const events = state.profanityEvents[userId] || [];
            return { total: events.length, recent: events.slice(-5) };
          })(),
        });
      }

      // ── Get alerts ──────────────────────────────────────────────────
      case "alerts": {
        const { severity, unresolvedOnly, category: cat } = data;
        let alerts = state.alerts[userId] || [];
        if (severity) alerts = alerts.filter(a => a.severity === severity);
        if (cat) alerts = alerts.filter(a => a.category === cat);
        if (unresolvedOnly) alerts = alerts.filter(a => !a.resolved);
        return Response.json({ alerts: alerts.slice(-50) });
      }

      // ── Acknowledge alert ───────────────────────────────────────────
      case "acknowledge": {
        const { alertId, by = "child" } = data;
        const alerts = state.alerts[userId] || [];
        const found = alerts.find(a => a.alert_id === alertId);
        if (found) {
          if (by === "child") found.acknowledged_by_child = true;
          else found.acknowledged_by_parent = true;
          if (found.acknowledged_by_child && found.acknowledged_by_parent) found.resolved = true;
        }
        return Response.json({ acknowledged: !!found });
      }

      // ── Focus profile ───────────────────────────────────────────────
      case "focus_profile": {
        const snaps = state.focusSnapshots[userId] || [];
        if (!snaps.length) return Response.json({ status: "no_data" });
        const appFocus = {};
        snaps.forEach(s => {
          if (!appFocus[s.app_id]) appFocus[s.app_id] = [];
          appFocus[s.app_id].push(s.focus_depth);
        });
        const appAvg = Object.entries(appFocus).map(([app, vals]) =>
          [app, +(vals.reduce((a, b) => a + b) / vals.length).toFixed(3)]).sort((a, b) => b[1] - a[1]);
        return Response.json({
          status: "active", total_snapshots: snaps.length,
          avg_focus: +(snaps.reduce((s, x) => s + x.focus_depth, 0) / snaps.length).toFixed(3),
          best_focus_apps: appAvg.slice(0, 3), worst_focus_apps: appAvg.slice(-3),
          flow_states: snaps.filter(s => s.focus_depth > 0.85 && s.session_duration_sec > 900).length,
        });
      }

      // ── Mood timeline ───────────────────────────────────────────────
      case "mood_timeline": {
        const hours = data.hours || 24;
        const cutoff = new Date(Date.now() - hours * 3600000).toISOString();
        const readings = (state.facialReadings[userId] || []).filter(r => r.timestamp >= cutoff);
        return Response.json({ readings });
      }

      // ── Emotion by app ──────────────────────────────────────────────
      case "emotion_by_app": {
        const appEmotions = {};
        (state.facialReadings[userId] || []).forEach(r => {
          const app = r.session_app || "unknown";
          if (!appEmotions[app]) appEmotions[app] = { joy: [], frustration: [], distress: [], boredom: [] };
          appEmotions[app].joy.push(r.joy);
          appEmotions[app].frustration.push(r.frustration);
          appEmotions[app].distress.push(r.distress);
          appEmotions[app].boredom.push(r.boredom);
        });
        const result = {};
        for (const [app, emos] of Object.entries(appEmotions)) {
          result[app] = {};
          for (const [emo, vals] of Object.entries(emos)) {
            result[app][emo] = +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(3);
          }
        }
        return Response.json({ emotion_by_app: result });
      }

      // ── Profanity summary ──────────────────────────────────────────
      case "profanity_summary": {
        const days = data.days || 7;
        const cutoff = new Date(Date.now() - days * 86400000).toISOString();
        const events = (state.profanityEvents[userId] || []).filter(e => e.timestamp >= cutoff);
        const bySeverity = {};
        events.forEach(e => { bySeverity[e.severity] = (bySeverity[e.severity] || 0) + 1; });
        return Response.json({ total: events.length, by_severity: bySeverity,
          trend: events.length > 10 ? "escalating" : events.length > 0 ? "occasional" : "clean" });
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    console.error("AEGIS API error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
