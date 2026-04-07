import { useState, useEffect, useCallback } from "react";

const C = {
  bg: "#080808", s1: "#0f0f0f", s2: "#151515", s3: "#1c1c1c",
  b1: "#222", b2: "#2e2e2e", b3: "#3a3a3a",
  text: "#ede9e3", t2: "#8a8078", t3: "#4a4440",
  accent: "#e8ff6e", blue: "#4da6ff", green: "#4dff9e",
  red: "#ff5555", orange: "#ff6b35", purple: "#c084fc",
};

const STATUS_META = {
  connected: { label: "Connected", color: C.green, dot: "🟢" },
  free:      { label: "Free / Local", color: C.green, dot: "🟢" },
  no_key:    { label: "No API Key", color: C.orange, dot: "🟡" },
  error:     { label: "Auth Error", color: C.red, dot: "🔴" },
  offline:   { label: "Offline", color: C.red, dot: "🔴" },
};

// Estimated cost per call type
const COST_PER_CALL = {
  claudeCalls:    0.02,   // ~avg Sonnet call
  replicateCalls: 0.07,   // ~avg video clip
  falCalls:       0.08,
  geminiCalls:    0,      // free tier
};

export default function CreditsPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/credits/status");
      const d = await r.json();
      setData(d);
      setLastRefresh(new Date());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const session = data?.session;
  const services = data?.services || [];

  // Estimate total session cost
  const estCost = session
    ? (session.claudeCalls    * COST_PER_CALL.claudeCalls) +
      (session.replicateCalls * COST_PER_CALL.replicateCalls) +
      (session.falCalls       * COST_PER_CALL.falCalls) +
      (session.geminiCalls    * COST_PER_CALL.geminiCalls)
    : 0;

  return (
    <div style={{ flex: 1, overflowY: "auto", background: C.bg, padding: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>💳 Credits & Billing</div>
          <div style={{ fontSize: 11, color: C.t2, marginTop: 3 }}>
            Live service status, session usage, and recharge links
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {lastRefresh && (
            <span style={{ fontSize: 10, color: C.t3 }}>
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button onClick={fetchStatus} disabled={loading}
            style={{ padding: "6px 14px", borderRadius: 7, border: `1px solid ${C.b2}`,
              background: C.s2, color: loading ? C.t3 : C.t2,
              fontSize: 11, cursor: loading ? "wait" : "pointer", fontFamily: "inherit" }}>
            {loading ? "⏳ Refreshing…" : "🔄 Refresh"}
          </button>
        </div>
      </div>

      {/* Session Cost Summary */}
      {session && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Claude Calls", value: session.claudeCalls, color: C.purple, sub: `~$${(session.claudeCalls * COST_PER_CALL.claudeCalls).toFixed(3)}` },
            { label: "Replicate Clips", value: session.replicateCalls, color: C.blue, sub: `~$${(session.replicateCalls * COST_PER_CALL.replicateCalls).toFixed(3)}` },
            { label: "FAL Calls", value: session.falCalls, color: C.orange, sub: `~$${(session.falCalls * COST_PER_CALL.falCalls).toFixed(3)}` },
            { label: "Gemini Calls", value: session.geminiCalls, color: C.green, sub: "FREE tier" },
          ].map(stat => (
            <div key={stat.label} style={{ padding: "14px 16px", background: C.s1,
              border: `1px solid ${C.b1}`, borderRadius: 10 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: 10, color: C.t2, marginTop: 4 }}>{stat.label}</div>
              <div style={{ fontSize: 10, color: C.t3, marginTop: 2 }}>{stat.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Total session cost bar */}
      {session && (
        <div style={{ padding: "12px 18px", background: `${C.accent}0d`, border: `1px solid ${C.accent}22`,
          borderRadius: 10, marginBottom: 24, display: "flex", alignItems: "center", gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: C.t2, fontWeight: 700 }}>SESSION COST ESTIMATE</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.accent, marginTop: 2 }}>
              ${estCost.toFixed(4)}
            </div>
          </div>
          <div style={{ fontSize: 10, color: C.t2, flex: 1, lineHeight: 1.7 }}>
            {session.uptimeMin} min uptime · {session.claudeCalls + session.replicateCalls + session.falCalls + session.geminiCalls} total API calls this session<br />
            Local LTX-Video renders are always FREE and not counted above.
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, color: C.t3, fontWeight: 700, letterSpacing: ".08em" }}>STARTED</div>
            <div style={{ fontSize: 10, color: C.t2 }}>
              {session.startedAt ? new Date(session.startedAt).toLocaleTimeString() : "—"}
            </div>
          </div>
        </div>
      )}

      {/* Service Cards */}
      <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, letterSpacing: ".1em", marginBottom: 12 }}>
        SERVICES
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {loading && !data && (
          <div style={{ textAlign: "center", padding: 40, color: C.t3, fontSize: 12 }}>
            ⏳ Checking service status…
          </div>
        )}
        {services.map(svc => {
          const meta = STATUS_META[svc.status] || STATUS_META.offline;
          return (
            <div key={svc.id} style={{ background: C.s1, border: `1px solid ${C.b1}`,
              borderRadius: 12, overflow: "hidden" }}>

              {/* Service header */}
              <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14,
                borderBottom: `1px solid ${C.b1}` }}>
                <div style={{ fontSize: 26 }}>{svc.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{svc.name}</div>
                  {svc.username && (
                    <div style={{ fontSize: 10, color: C.t2 }}>@{svc.username}</div>
                  )}
                  {svc.note && (
                    <div style={{ fontSize: 10, color: C.t3, marginTop: 1 }}>{svc.note}</div>
                  )}
                </div>

                {/* Status badge */}
                <div style={{ display: "flex", alignItems: "center", gap: 6,
                  padding: "4px 10px", borderRadius: 20,
                  background: `${meta.color}15`, border: `1px solid ${meta.color}30` }}>
                  <span style={{ fontSize: 8 }}>{meta.dot}</span>
                  <span style={{ fontSize: 10, color: meta.color, fontWeight: 700 }}>{meta.label}</span>
                </div>

                {/* Recharge button */}
                {svc.rechargeUrl && (
                  <a href={svc.rechargeUrl} target="_blank" rel="noreferrer"
                    style={{ padding: "7px 16px", borderRadius: 8,
                      background: svc.isFree ? "transparent" : "linear-gradient(135deg, #e8ff6e, #c8df50)",
                      border: svc.isFree ? `1px solid ${C.b2}` : "none",
                      color: svc.isFree ? C.t3 : C.bg,
                      fontSize: 11, fontWeight: 800, cursor: "pointer",
                      textDecoration: "none", whiteSpace: "nowrap" }}>
                    {svc.isFree ? "🔑 Manage Key" : "💳 Recharge →"}
                  </a>
                )}
              </div>

              {/* Balance + usage row */}
              <div style={{ padding: "10px 18px", display: "flex", alignItems: "center", gap: 20,
                flexWrap: "wrap", background: C.s2 }}>

                {/* Live balance */}
                <div>
                  <div style={{ fontSize: 9, color: C.t3, fontWeight: 700, letterSpacing: ".08em" }}>BALANCE</div>
                  <div style={{ fontSize: 16, fontWeight: 800,
                    color: svc.isFree ? C.green : svc.balance != null ? C.accent : C.t2, marginTop: 2 }}>
                    {svc.isFree ? "FREE ∞"
                      : svc.balance != null
                        ? `$${Number(svc.balance).toFixed(2)}`
                        : "See dashboard →"}
                  </div>
                </div>

                {/* Session calls */}
                {svc.sessionCalls != null && (
                  <div>
                    <div style={{ fontSize: 9, color: C.t3, fontWeight: 700, letterSpacing: ".08em" }}>THIS SESSION</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: C.blue, marginTop: 2 }}>
                      {svc.sessionCalls} calls
                    </div>
                  </div>
                )}

                {/* Models list */}
                {svc.models && (
                  <div style={{ marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {svc.models.map((m, i) => (
                      <span key={i} style={{ fontSize: 9, padding: "3px 8px", borderRadius: 12,
                        background: C.s3, border: `1px solid ${C.b2}`, color: C.t3 }}>
                        {m}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cost tips */}
      <div style={{ marginTop: 24, padding: "14px 18px", background: C.s1,
        border: `1px solid ${C.b1}`, borderRadius: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.t2, letterSpacing: ".08em", marginBottom: 10 }}>
          💡 COST REDUCTION TIPS
        </div>
        {[
          ["🖥️ Keep default video model on LTX-Video Local", "Saves ~$0.07 per scene vs cloud renders"],
          ["🔬 Gemini Six Sigma is free", "1,500 fact-checks/day at zero cost"],
          ["🧠 Claude Sonnet is your main cost", "Group multiple script edits into single messages to reduce call count"],
          ["📦 Use Archive clips", "Reuse rendered scenes to avoid re-rendering similar content"],
        ].map(([tip, detail]) => (
          <div key={tip} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
            <span style={{ fontSize: 11, minWidth: 280 }}>{tip}</span>
            <span style={{ fontSize: 10, color: C.t3 }}>{detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
