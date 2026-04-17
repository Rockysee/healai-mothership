/**
 * healai_session_store.js
 * Central session data manager for AIRjun.
 * Writes to / reads from localStorage — consumed by FlowSection, GuardianSection, AssessSection.
 *
 * localStorage keys:
 *   healai_sessions       — array of SessionRecord
 *   healai_flow_log       — array of FlowEvent
 *   healai_mood_log       — array of MoodEntry
 *   healai_streak         — integer (consecutive study days)
 *   healai_session_date   — string (today's date, for once-per-day mood gate)
 */

// ── Types (JSDoc) ──────────────────────────────────────────────────────────

/**
 * @typedef {Object} SessionRecord
 * @property {string}   date             — e.g. "Fri Apr 03 2026"
 * @property {number}   startTime        — Date.now() at session open
 * @property {number}   [endTime]        — Date.now() at session close
 * @property {number}   [duration]       — ms (endTime - startTime)
 * @property {number}   [mood]           — 1-5 mood score
 * @property {number}   [energy]         — 1-5 energy score
 * @property {number}   [breatheRounds]  — BREATHE rounds completed
 * @property {number}   [pomodorosCompleted] — Pomodoro rounds completed
 * @property {boolean}  [flowAchieved]   — true if FLOW detected this session
 * @property {number}   [flowDuration]   — ms in FLOW state
 * @property {string}   [cogState]       — last cogState: CRITICAL_ANXIETY|TIRED|NORMAL|FOCUSED
 */

/**
 * @typedef {Object} FlowEvent
 * @property {string}  type       — 'FLOW_ACHIEVED'
 * @property {number}  timestamp  — Date.now()
 * @property {number}  duration   — ms in flow state
 * @property {string}  [archetype]
 */

/**
 * @typedef {Object} MoodEntry
 * @property {number}  timestamp
 * @property {number}  mood     — 1-5
 * @property {number}  energy   — 1-5
 */

// ── Read helpers ───────────────────────────────────────────────────────────

export function getSessions()  { return JSON.parse(localStorage.getItem('healai_sessions')  || '[]'); }
export function getFlowLog()   { return JSON.parse(localStorage.getItem('healai_flow_log')  || '[]'); }
export function getMoodLog()   { return JSON.parse(localStorage.getItem('healai_mood_log')  || '[]'); }
export function getStreak()    { return parseInt(localStorage.getItem('healai_streak')      || '0'); }

export function getTodaySessions() {
  const today = new Date().toDateString();
  return getSessions().filter(s => s.date === today);
}
export function getTodayFlow() {
  const today = new Date().toDateString();
  return getFlowLog().filter(f => new Date(f.timestamp).toDateString() === today);
}
export function getLatestMood() {
  const log = getMoodLog();
  return log.length > 0 ? log[log.length - 1] : null;
}
export function getTodayStudyMinutes() {
  return Math.floor(getTodaySessions().reduce((sum, s) => sum + (s.duration || 0), 0) / 60000);
}

// ── Write helpers ──────────────────────────────────────────────────────────

/**
 * Start a new session record. Returns the session index for later update.
 */
export function startSession(mood, energy) {
  const sessions = getSessions();
  const record = {
    date: new Date().toDateString(),
    startTime: Date.now(),
    mood: mood || null,
    energy: energy || null,
    breatheRounds: 0,
    pomodorosCompleted: 0,
    flowAchieved: false,
    flowDuration: 0,
    cogState: 'NORMAL',
  };
  sessions.push(record);
  localStorage.setItem('healai_sessions', JSON.stringify(sessions));
  return sessions.length - 1; // index
}

/**
 * Update an open session by index.
 * @param {number} index
 * @param {Partial<SessionRecord>} updates
 */
export function updateSession(index, updates) {
  const sessions = getSessions();
  if (index < 0 || index >= sessions.length) return;
  sessions[index] = { ...sessions[index], ...updates };
  localStorage.setItem('healai_sessions', JSON.stringify(sessions));
}

/**
 * Close a session — stamps endTime and duration.
 * @param {number} index
 */
export function closeSession(index) {
  const sessions = getSessions();
  if (index < 0 || index >= sessions.length) return;
  const now = Date.now();
  sessions[index].endTime = now;
  sessions[index].duration = now - (sessions[index].startTime || now);
  localStorage.setItem('healai_sessions', JSON.stringify(sessions));
  _updateStreak();
}

/**
 * Log a FLOW achievement event.
 * @param {number} durationMs — how long the FLOW state lasted
 * @param {string} [archetype]
 */
export function logFlowAchieved(durationMs, archetype) {
  const log = getFlowLog();
  log.push({
    type: 'FLOW_ACHIEVED',
    timestamp: Date.now(),
    duration: durationMs,
    archetype: archetype || localStorage.getItem('healai_archetype') || null,
  });
  localStorage.setItem('healai_flow_log', JSON.stringify(log));
}

/**
 * Log a mood entry.
 * @param {number} mood   1-5
 * @param {number} energy 1-5
 */
export function logMood(mood, energy) {
  const log = getMoodLog();
  log.push({ timestamp: Date.now(), mood, energy });
  localStorage.setItem('healai_mood_log', JSON.stringify(log));
}

/**
 * Increment BREATHE rounds for the current (last) session.
 */
export function addBreatheRound() {
  const sessions = getSessions();
  if (sessions.length === 0) return;
  const last = sessions[sessions.length - 1];
  last.breatheRounds = (last.breatheRounds || 0) + 1;
  localStorage.setItem('healai_sessions', JSON.stringify(sessions));
}

/**
 * Increment completed Pomodoros for the current (last) session.
 */
export function addPomodoro() {
  const sessions = getSessions();
  if (sessions.length === 0) return;
  const last = sessions[sessions.length - 1];
  last.pomodorosCompleted = (last.pomodorosCompleted || 0) + 1;
  localStorage.setItem('healai_sessions', JSON.stringify(sessions));
}

/**
 * Mark FLOW as achieved in the current (last) session.
 * @param {number} durationMs
 */
export function markFlowInSession(durationMs) {
  const sessions = getSessions();
  if (sessions.length === 0) return;
  const last = sessions[sessions.length - 1];
  last.flowAchieved = true;
  last.flowDuration = (last.flowDuration || 0) + durationMs;
  localStorage.setItem('healai_sessions', JSON.stringify(sessions));
}

/**
 * Update cogState in the current (last) session.
 * @param {'CRITICAL_ANXIETY'|'TIRED'|'NORMAL'|'FOCUSED'} state
 */
export function setCogState(state) {
  const sessions = getSessions();
  if (sessions.length === 0) return;
  sessions[sessions.length - 1].cogState = state;
  localStorage.setItem('healai_sessions', JSON.stringify(sessions));
}

// ── Streak logic ───────────────────────────────────────────────────────────

function _updateStreak() {
  const today = new Date().toDateString();
  const lastDate = localStorage.getItem('healai_last_study_date');
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  if (lastDate === today) return; // already counted today
  const current = getStreak();
  const newStreak = lastDate === yesterday ? current + 1 : 1;
  localStorage.setItem('healai_streak', String(newStreak));
  localStorage.setItem('healai_last_study_date', today);
}

// ── Guardian summary (used by GuardianSection) ─────────────────────────────

/**
 * Returns a complete summary for Guardian display.
 */
export function getGuardianSummary() {
  const today = new Date().toDateString();
  const todaySessions = getTodaySessions();
  const todayFlow    = getTodayFlow();
  const latestMood   = getLatestMood();
  const streak       = getStreak();
  const studyMinutes = getTodayStudyMinutes();
  const flowAchieved = todayFlow.length > 0;
  const flowDuration = todayFlow.reduce((s, f) => s + (f.duration || 0), 0);
  const breatheTotal = todaySessions.reduce((s, x) => s + (x.breatheRounds || 0), 0);
  const pomodoroTotal = todaySessions.reduce((s, x) => s + (x.pomodorosCompleted || 0), 0);

  // Build alerts
  const alerts = [];
  if (flowAchieved) alerts.push({ type: 'flow', icon: '🟢', msg: `Flow state achieved · ${Math.round(flowDuration / 60000)} min deep focus` });
  if (streak >= 7) alerts.push({ type: 'streak', icon: '🏆', msg: `${streak}-day streak — incredible consistency` });
  else if (streak >= 3) alerts.push({ type: 'streak', icon: '🔵', msg: `${streak}-day study streak — keep going` });
  if (latestMood && latestMood.mood <= 2) alerts.push({ type: 'mood', icon: '🟡', msg: `Low energy logged — shorter focused sessions recommended` });
  if (studyMinutes > 60) alerts.push({ type: 'fatigue', icon: '🟡', msg: `${studyMinutes} min studied today — a break will improve retention` });
  if (studyMinutes === 0 && todaySessions.length === 0) alerts.push({ type: 'start', icon: '⚪', msg: `No session yet today — start when ready` });

  return {
    studyMinutes,
    flowAchieved,
    flowDuration: Math.round(flowDuration / 60000),
    breatheRounds: breatheTotal,
    pomodorosCompleted: pomodoroTotal,
    mood: latestMood?.mood || null,
    energy: latestMood?.energy || null,
    streak,
    alerts,
  };
}
