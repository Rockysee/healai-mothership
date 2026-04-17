"use client";
/**
 * useAegis — Client-side hook for the AEGIS Guardian Intelligence System
 *
 * Provides:
 *  1. Screen time auto-tracking (Page Visibility API + app session timing)
 *  2. Focus detection via TrueDepth camera (ARKit bridge — iOS/macOS Safari)
 *  3. Facial expression mood detection (ARKit AU blend shapes)
 *  4. Profanity scanning for outbound text
 *  5. Full analysis dashboard data
 *  6. Parental sharing endpoint
 *  7. Alert management
 *
 * Usage:
 *   const aegis = useAegis("user123");
 *   aegis.recordScreenTime("instagram", "Instagram", 15);
 *   aegis.scanProfanity("some text", "discord");
 *   const analysis = await aegis.getFullAnalysis();
 *
 * Goldenhour Systems Pvt Ltd · ambulance.run
 */

import { useState, useEffect, useCallback, useRef } from "react";

const API = "/api/aegis";

async function post(action, userId, data = {}) {
  try {
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, userId, ...data }),
    });
    return res.json();
  } catch (err) {
    console.error(`[AEGIS] ${action} failed:`, err);
    return { error: err.message };
  }
}

export default function useAegis(userId = "default") {
  const [analysis, setAnalysis] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [config, setConfig] = useState(null);
  const [focusProfile, setFocusProfile] = useState(null);
  const [moodTimeline, setMoodTimeline] = useState([]);
  const sessionStart = useRef(Date.now());
  const currentApp = useRef("healai_app");

  // ── Auto-track page visibility (basic screen time) ──────────────────
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        // Page went hidden — record the session
        const durationMin = (Date.now() - sessionStart.current) / 60000;
        if (durationMin > 0.5) {
          post("screen_time", userId, {
            appId: currentApp.current,
            appName: currentApp.current,
            durationMin: Math.round(durationMin * 10) / 10,
            startTime: new Date(sessionStart.current).toISOString(),
          });
        }
      } else {
        // Page became visible — start new session
        sessionStart.current = Date.now();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [userId]);

  // ── Screen Time ─────────────────────────────────────────────────────
  const recordScreenTime = useCallback(
    (appId, appName, durationMin, startTime) =>
      post("screen_time", userId, { appId, appName, durationMin, startTime }),
    [userId]
  );

  // ── Exchange Metadata ───────────────────────────────────────────────
  const recordExchange = useCallback(
    (platform, direction, messageLengthBucket, contactHash, responseLatencySec) =>
      post("exchange", userId, { platform, direction, messageLengthBucket, contactHash, responseLatencySec }),
    [userId]
  );

  // ── Profanity Scanning ──────────────────────────────────────────────
  const scanProfanity = useCallback(
    (text, platform = "unknown", context = "outbound_chat") =>
      post("profanity", userId, { text, platform, context }),
    [userId]
  );

  // ── Retina Focus Intelligence ───────────────────────────────────────
  const recordFocus = useCallback(
    (focusDepth, attentionIntensity, gazeOnScreenPct, blinkRate, headTiltDeg, sessionDurationSec, appId) =>
      post("focus", userId, { focusDepth, attentionIntensity, gazeOnScreenPct, blinkRate, headTiltDeg, sessionDurationSec, appId }),
    [userId]
  );

  // ── Facial Expression Mood ──────────────────────────────────────────
  const recordFacialExpression = useCallback(
    ({ joy, frustration, fatigue, surprise, boredom, distress, confidence, sessionApp }) =>
      post("facial", userId, { joy, frustration, fatigue, surprise, boredom, distress, confidence, sessionApp }),
    [userId]
  );

  // ── Configuration ───────────────────────────────────────────────────
  const configure = useCallback(
    async (cfg) => {
      const res = await post("configure", userId, cfg);
      if (res.config) setConfig(res.config);
      return res;
    },
    [userId]
  );

  // ── Full Analysis ───────────────────────────────────────────────────
  const getFullAnalysis = useCallback(
    async (moodScore, voiceStress) => {
      const res = await post("analysis", userId, { moodScore, voiceStress });
      setAnalysis(res);
      return res;
    },
    [userId]
  );

  // ── Reports ─────────────────────────────────────────────────────────
  const getDailyReport = useCallback(
    (date) => post("daily_report", userId, { date }),
    [userId]
  );

  const getWeeklySummary = useCallback(
    () => post("weekly_summary", userId),
    [userId]
  );

  const getParentalShare = useCallback(
    () => post("parental_share", userId),
    [userId]
  );

  // ── Alerts ──────────────────────────────────────────────────────────
  const getAlerts = useCallback(
    async (opts = {}) => {
      const res = await post("alerts", userId, opts);
      setAlerts(res.alerts || []);
      return res.alerts || [];
    },
    [userId]
  );

  const acknowledgeAlert = useCallback(
    (alertId, by = "child") => post("acknowledge", userId, { alertId, by }),
    [userId]
  );

  // ── Focus Profile ───────────────────────────────────────────────────
  const getFocusProfile = useCallback(
    async () => {
      const res = await post("focus_profile", userId);
      setFocusProfile(res);
      return res;
    },
    [userId]
  );

  // ── Mood Timeline ──────────────────────────────────────────────────
  const getMoodTimeline = useCallback(
    async (hours = 24) => {
      const res = await post("mood_timeline", userId, { hours });
      setMoodTimeline(res.readings || []);
      return res.readings || [];
    },
    [userId]
  );

  // ── Emotion by App ─────────────────────────────────────────────────
  const getEmotionByApp = useCallback(
    () => post("emotion_by_app", userId),
    [userId]
  );

  // ── Profanity Summary ──────────────────────────────────────────────
  const getProfanitySummary = useCallback(
    (days = 7) => post("profanity_summary", userId, { days }),
    [userId]
  );

  // ── Set current app context (for auto-tracking) ─────────────────────
  const setCurrentApp = useCallback((appId) => {
    // Save current session before switching
    const durationMin = (Date.now() - sessionStart.current) / 60000;
    if (durationMin > 0.5) {
      post("screen_time", userId, {
        appId: currentApp.current,
        appName: currentApp.current,
        durationMin: Math.round(durationMin * 10) / 10,
      });
    }
    currentApp.current = appId;
    sessionStart.current = Date.now();
  }, [userId]);

  return {
    // State
    analysis,
    alerts,
    config,
    focusProfile,
    moodTimeline,

    // Actions
    recordScreenTime,
    recordExchange,
    scanProfanity,
    recordFocus,
    recordFacialExpression,
    configure,
    getFullAnalysis,
    getDailyReport,
    getWeeklySummary,
    getParentalShare,
    getAlerts,
    acknowledgeAlert,
    getFocusProfile,
    getMoodTimeline,
    getEmotionByApp,
    getProfanitySummary,
    setCurrentApp,
  };
}
