"use client";
import { useMemo } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// RESILIENCE TRACKER — Journey Dashboard
// Visualises health score history (stored in localStorage via App.jsx)
// Shows trajectory, streaks, and contextual insights
// Goldenhour Systems Pvt Ltd · ambulance.run
// ═══════════════════════════════════════════════════════════════════════════════

const ARCHETYPE_COLORS = {
  ARCHITECT: "#10b981",
  SENTINEL:  "#3b82f6",
  NAVIGATOR: "#a855f7",
  EMBER:     "#f59e0b",
  SEEKER:    "#ef4444",
  VOICE:     "#64748b",
};

function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function getTrend(scores) {
  if (scores.length < 2) return null;
  const recent = scores.slice(-3).map((s) => s.score);
  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const delta = avg(recent) - avg(scores.slice(0, Math.max(1, scores.length - 3)).map((s) => s.score));
  if (Math.abs(delta) < 3) return { dir: "stable", label: "Stable", color: "#64748b", emoji: "→" };
  if (delta > 0) return { dir: "up", label: `+${Math.round(delta)} pts`, color: "#10b981", emoji: "↑" };
  return { dir: "down", label: `${Math.round(delta)} pts`, color: "#ef4444", emoji: "↓" };
}

// ─── Mini sparkline (pure SVG, no library dependency) ───────────────────────
function Sparkline({ scores, width = 240, height = 60 }) {
  if (!scores || scores.length < 2) return null;
  const vals = scores.map((s) => s.score);
  const min = Math.min(...vals, 0);
  const max = Math.max(...vals, 100);
  const range = max - min || 1;

  const points = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  });

  const fillPoints = [
    `0,${height}`,
    ...points,
    `${width},${height}`,
  ].join(" ");

  const lastScore = vals[vals.length - 1];
  const lastX = width;
  const lastY = height - ((lastScore - min) / range) * height;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPoints} fill="url(#spark-fill)" />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="#10b981"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r="4" fill="#10b981" />
    </svg>
  );
}

export default function ResilienceTracker({ scores = [], archetype }) {
  const sortedScores = useMemo(
    () => [...scores].sort((a, b) => a.ts - b.ts),
    [scores]
  );

  const stats = useMemo(() => {
    if (sortedScores.length === 0) return null;
    const vals = sortedScores.map((s) => s.score);
    return {
      latest: vals[vals.length - 1],
      avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
      peak: Math.max(...vals),
      count: vals.length,
    };
  }, [sortedScores]);

  const trend = useMemo(() => getTrend(sortedScores), [sortedScores]);

  const isEmpty = sortedScores.length === 0;

  return (
    <div className="min-h-screen bg-[#09090b] text-white font-['Inter']">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <header>
          <div className="flex items-center gap-2 text-[10px] tracking-[0.2em] text-white/30 font-mono uppercase mb-4">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Resilience Journey
          </div>
          {archetype && (
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{archetype.emoji}</span>
              <div>
                <h1 className="text-xl font-bold">{archetype.title}</h1>
                <p className="text-white/30 text-xs">{archetype.subtitle}</p>
              </div>
            </div>
          )}
          {!archetype && (
            <h1 className="text-2xl font-bold">Your Journey</h1>
          )}
        </header>

        {/* ── EMPTY STATE ──────────────────────────────────────────── */}
        {isEmpty && (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-3xl p-10 text-center space-y-4">
            <div className="text-4xl">📊</div>
            <h2 className="text-lg font-semibold">No data yet</h2>
            <p className="text-white/30 text-sm leading-relaxed max-w-xs mx-auto">
              Complete the Resilience Assessment or a Voice Check-in to start tracking your mental wellness journey.
            </p>
            <div className="flex gap-2 justify-center text-xs text-white/20 font-mono">
              <span>🧬 Assess</span>
              <span>·</span>
              <span>🎙️ Voice</span>
              <span>→</span>
              <span>📈 Journey</span>
            </div>
          </div>
        )}

        {/* ── STATS ROW ────────────────────────────────────────────── */}
        {!isEmpty && stats && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Current", value: stats.latest, suffix: "/100", color: "#10b981" },
              { label: "Average",  value: stats.avg,    suffix: "/100", color: "#3b82f6" },
              { label: "Peak",     value: stats.peak,   suffix: "/100", color: "#a855f7" },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 text-center"
              >
                <div className="text-2xl font-bold tabular-nums" style={{ color: item.color }}>
                  {item.value}
                </div>
                <div className="text-[9px] font-mono text-white/30 uppercase tracking-wider mt-1">{item.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── SPARKLINE CHART ──────────────────────────────────────── */}
        {!isEmpty && sortedScores.length >= 2 && (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-mono uppercase tracking-wider text-white/40">
                Score Trajectory
              </h2>
              {trend && (
                <span
                  className="text-xs font-mono font-semibold"
                  style={{ color: trend.color }}
                >
                  {trend.emoji} {trend.label}
                </span>
              )}
            </div>
            <div className="flex justify-center overflow-hidden">
              <Sparkline scores={sortedScores} width={280} height={70} />
            </div>
            <div className="flex justify-between text-[9px] text-white/20 font-mono mt-2">
              <span>{formatDate(sortedScores[0].ts)}</span>
              <span>{formatDate(sortedScores[sortedScores.length - 1].ts)}</span>
            </div>
          </div>
        )}

        {/* ── INSIGHTS ─────────────────────────────────────────────── */}
        {!isEmpty && stats && (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-3">
            <h2 className="text-xs font-mono uppercase tracking-wider text-white/40 mb-3">
              Pattern Insights
            </h2>
            {stats.avg >= 70 && (
              <InsightRow emoji="✅" text="Your baseline resilience is strong. Focus on consistency, not repair." color="#10b981" />
            )}
            {stats.avg >= 50 && stats.avg < 70 && (
              <InsightRow emoji="⚡" text="You're in the building zone. Daily check-ins compound over time." color="#f59e0b" />
            )}
            {stats.avg < 50 && (
              <InsightRow emoji="💙" text="Stress patterns detected. Consider talking to your AI Guru daily." color="#3b82f6" />
            )}
            {stats.count >= 3 && (
              <InsightRow emoji="🔥" text={`${stats.count} check-ins completed. You're building a self-awareness habit.`} color="#a855f7" />
            )}
            {trend?.dir === "up" && (
              <InsightRow emoji="📈" text="Your resilience is trending upward. Keep the momentum." color="#10b981" />
            )}
            {trend?.dir === "down" && (
              <InsightRow emoji="🌧️" text="A dip in score is normal. Check in with The Body or The Sage today." color="#f97316" />
            )}
          </div>
        )}

        {/* ── HISTORY LOG ──────────────────────────────────────────── */}
        {!isEmpty && (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
            <h2 className="text-xs font-mono uppercase tracking-wider text-white/40 mb-4">
              Check-in Log
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {[...sortedScores].reverse().map((entry, i) => {
                const color = ARCHETYPE_COLORS[entry.archetypeId] || "#64748b";
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <div>
                        <div className="text-xs text-white/60">{entry.archetypeTitle}</div>
                        <div className="text-[9px] text-white/20 font-mono">
                          {formatDate(entry.ts)} · {formatTime(entry.ts)}
                        </div>
                      </div>
                    </div>
                    <div
                      className="text-sm font-semibold tabular-nums"
                      style={{ color }}
                    >
                      {entry.score}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── CLEAR DATA ───────────────────────────────────────────── */}
        {!isEmpty && (
          <div className="text-center">
            <button
              onClick={() => {
                if (confirm("Clear all journey data?")) {
                  localStorage.removeItem("ms_scores");
                  window.location.reload();
                }
              }}
              className="text-[10px] text-white/15 hover:text-white/30 transition-colors font-mono"
            >
              Clear all data
            </button>
          </div>
        )}

        <p className="text-[9px] text-white/10 text-center pb-4">
          Data stored locally on your device · Never transmitted · MHCA 2017 compliant
          <br />© {new Date().getFullYear()} Goldenhour Systems Pvt Ltd · ambulance.run
        </p>
      </div>
    </div>
  );
}

function InsightRow({ emoji, text, color }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="text-base shrink-0">{emoji}</span>
      <p className="text-white/50 leading-relaxed text-xs">{text}</p>
    </div>
  );
}
