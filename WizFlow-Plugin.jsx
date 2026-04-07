import { useState, useEffect, useRef } from "react";

const ACID = "#39FF14";
const TEAL = "#00BFA5";
const NAVY = "#0A1628";
const DARK = "#0D1117";
const PANEL = "#161B22";
const BORDER = "#30363D";
const TEXT = "#C9D1D9";
const MUTED = "#8B949E";
const ORANGE = "#F97316";
const BLUE = "#58A6FF";
const RED = "#F85149";

// ─── Sample Data ───
const SAMPLE_FEATURES = [
  {
    id: 1,
    name: "Notification Bell",
    description: "A notification bell in the top nav. Clicking it shows a dropdown with unread notifications. Each notification is clickable and marks as read. Badge shows unread count.",
    status: "generated"
  },
  {
    id: 2,
    name: "User Dashboard",
    description: "A user dashboard with sidebar navigation, main content area showing analytics charts, and a settings gear icon.",
    status: "pending"
  },
  {
    id: 3,
    name: "Search with Autocomplete",
    description: "A search bar with real-time autocomplete dropdown, recent searches, and keyboard navigation support.",
    status: "pending"
  }
];

const GENERATED_OUTPUT = {
  dom: `<div class="nav__notification" data-wized-id="notification-bell">
  <button class="nav__notification-trigger"
    data-wized-action="toggleVariable:isNotifOpen">
    <span class="nav__notification-icon">🔔</span>
    <span class="nav__notification-badge"
      data-wized-id="notif-badge"
      data-wized-condition="variables.unreadCount > 0">
      {{variables.unreadCount}}
    </span>
  </button>
  <div class="nav__notification-dropdown"
    data-wized-id="notif-dropdown"
    data-wized-condition="variables.isNotifOpen">
    <div class="nav__notification-item"
      data-wized-loop="variables.notifications"
      data-wized-action="executeRequest:markAsRead">
      <p class="nav__notification-text">
        {{item.message}}
      </p>
      <span class="nav__notification-time">
        {{item.time}}
      </span>
    </div>
  </div>
</div>`,
  stateMap: [
    { variable: "isNotifOpen", type: "Boolean", default: "false", consumedBy: "notif-dropdown" },
    { variable: "notifications", type: "Array", default: "[]", consumedBy: "notif-dropdown (loop)" },
    { variable: "unreadCount", type: "Number", default: "0", consumedBy: "notif-badge" },
  ],
  actionLogic: [
    {
      request: "fetchNotifications",
      trigger: "On Page Load",
      endpoint: "GET /api/notifications",
      chain: [
        "Set Variable: notifications = response.data",
        "Set Variable: unreadCount = response.data.filter(n => !n.read).length"
      ]
    },
    {
      request: "markAsRead",
      trigger: "On Click .nav__notification-item",
      endpoint: "PATCH /api/notifications/{{item.id}}",
      chain: [
        "Set Variable: unreadCount = unreadCount - 1",
        "Trigger Animation: fadeOut(clicked item)"
      ]
    }
  ]
};

// ─── Typing Animation Hook ───
function useTypewriter(text, speed = 12, trigger = true) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!trigger) { setDisplayed(""); setDone(false); return; }
    setDisplayed(""); setDone(false);
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(iv); setDone(true); }
    }, speed);
    return () => clearInterval(iv);
  }, [text, trigger]);
  return [displayed, done];
}

// ─── Components ───
function Badge({ children, color = ACID }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 4,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: 1,
      textTransform: "uppercase",
      background: color + "18",
      color: color,
      border: `1px solid ${color}40`,
    }}>{children}</span>
  );
}

function GlowDot({ color = ACID, pulse = false }) {
  return (
    <span style={{
      display: "inline-block", width: 8, height: 8, borderRadius: "50%",
      background: color,
      boxShadow: `0 0 6px ${color}80`,
      animation: pulse ? "pulse 2s ease-in-out infinite" : "none",
    }} />
  );
}

function CodeBlock({ code, language = "html" }) {
  const lines = code.split("\n");
  return (
    <div style={{
      background: "#0D1117",
      border: `1px solid ${BORDER}`,
      borderRadius: 8,
      overflow: "hidden",
      fontSize: 12,
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "8px 12px",
        borderBottom: `1px solid ${BORDER}`,
        background: "#161B22",
      }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: RED }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#F0C000" }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: ACID }} />
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: 1 }}>{language}</span>
      </div>
      <pre style={{
        margin: 0, padding: 12, overflowX: "auto",
        maxHeight: 320, overflowY: "auto",
      }}>
        {lines.map((line, i) => (
          <div key={i} style={{ display: "flex", minHeight: 20 }}>
            <span style={{ width: 32, color: MUTED, textAlign: "right", marginRight: 12, userSelect: "none", flexShrink: 0 }}>{i + 1}</span>
            <span style={{ color: highlightSyntax(line) }}>{line}</span>
          </div>
        ))}
      </pre>
    </div>
  );
}

function highlightSyntax(line) {
  if (line.includes("data-wized")) return ACID;
  if (line.includes("class=")) return BLUE;
  if (line.includes("{{")) return ORANGE;
  if (line.trim().startsWith("<!--")) return MUTED;
  return TEXT;
}

function StateMapTable({ data }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
        <thead>
          <tr>
            {["Variable", "Type", "Default", "Consumed By"].map(h => (
              <th key={h} style={{
                padding: "10px 12px", textAlign: "left",
                borderBottom: `2px solid ${TEAL}`,
                color: TEAL, fontWeight: 600,
                fontSize: 10, textTransform: "uppercase", letterSpacing: 1,
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
              <td style={{ padding: "8px 12px", color: ACID }}>{row.variable}</td>
              <td style={{ padding: "8px 12px", color: BLUE }}>{row.type}</td>
              <td style={{ padding: "8px 12px", color: ORANGE }}>{row.default}</td>
              <td style={{ padding: "8px 12px", color: TEXT }}>{row.consumedBy}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActionChain({ data }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {data.map((action, i) => (
        <div key={i} style={{
          background: PANEL,
          border: `1px solid ${BORDER}`,
          borderRadius: 8,
          padding: 16,
          borderLeft: `3px solid ${TEAL}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <GlowDot color={TEAL} />
            <span style={{ color: TEAL, fontWeight: 700, fontFamily: "monospace", fontSize: 13 }}>{action.request}</span>
          </div>
          <div style={{ fontSize: 12, color: MUTED, marginBottom: 8 }}>
            <span style={{ color: BLUE }}>Trigger:</span> {action.trigger} &nbsp;|&nbsp;
            <span style={{ color: ORANGE }}>Endpoint:</span> {action.endpoint}
          </div>
          <div style={{ fontSize: 12, paddingLeft: 16 }}>
            {action.chain.map((step, j) => (
              <div key={j} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ color: ACID }}>→</span>
                <span style={{ color: TEXT }}>{step}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main App ───
export default function WizFlow() {
  const [activeView, setActiveView] = useState("dashboard");
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [activeTab, setActiveTab] = useState("dom");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [featureInput, setFeatureInput] = useState("");
  const [showOutput, setShowOutput] = useState(false);
  const inputRef = useRef(null);

  const genSteps = [
    "Parsing feature request...",
    "Generating BEM class hierarchies...",
    "Mapping Wized attributes...",
    "Building State Map variables...",
    "Constructing Action Logic chains...",
    "Validating Behavioral Markings...",
    "Output ready ✓",
  ];

  const [typedStep, stepDone] = useTypewriter(
    isGenerating ? genSteps[generationStep] || "" : "",
    20,
    isGenerating
  );

  useEffect(() => {
    if (stepDone && isGenerating && generationStep < genSteps.length - 1) {
      const t = setTimeout(() => setGenerationStep(s => s + 1), 400);
      return () => clearTimeout(t);
    }
    if (stepDone && generationStep === genSteps.length - 1) {
      const t = setTimeout(() => { setIsGenerating(false); setShowOutput(true); }, 800);
      return () => clearTimeout(t);
    }
  }, [stepDone, generationStep, isGenerating]);

  function handleGenerate() {
    if (!featureInput.trim()) return;
    setIsGenerating(true);
    setGenerationStep(0);
    setShowOutput(false);
  }

  const tabs = [
    { key: "dom", label: "DOM Structure", icon: "◇" },
    { key: "state", label: "State Map", icon: "⬡" },
    { key: "actions", label: "Action Logic", icon: "⚡" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: DARK,
      color: TEXT,
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        * { box-sizing: border-box; scrollbar-width: thin; scrollbar-color: ${BORDER} transparent; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${BORDER}; border-radius: 3px; }
        input:focus, textarea:focus { outline: none; }
      `}</style>

      {/* ─── Header ─── */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 24px",
        borderBottom: `1px solid ${BORDER}`,
        background: PANEL,
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 6,
            background: `linear-gradient(135deg, ${TEAL}, ${ACID})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 900, fontSize: 16, color: DARK,
          }}>W</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: 1.5, color: "#FFF" }}>WIZ-FLOW</div>
            <div style={{ fontSize: 10, color: MUTED, letterSpacing: 0.5 }}>Behavioral Markings Engine</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["dashboard", "generate", "library"].map(v => (
            <button key={v} onClick={() => { setActiveView(v); setShowOutput(false); setIsGenerating(false); }}
              style={{
                padding: "6px 16px", borderRadius: 6, border: "none",
                cursor: "pointer", fontSize: 12, fontWeight: 600,
                textTransform: "capitalize",
                background: activeView === v ? TEAL + "20" : "transparent",
                color: activeView === v ? TEAL : MUTED,
                transition: "all 0.2s",
              }}>{v}</button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <GlowDot color={ACID} pulse />
          <span style={{ fontSize: 11, color: MUTED }}>Claude Connected</span>
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>

        {/* ─── Dashboard View ─── */}
        {activeView === "dashboard" && (
          <div style={{ animation: "slideIn 0.4s ease" }}>
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: "#FFF", marginBottom: 4 }}>Plugin Dashboard</h2>
              <p style={{ color: MUTED, fontSize: 13 }}>Webflow → Wized bridge powered by Behavioral Markings</p>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 32 }}>
              {[
                { label: "Features Generated", value: "47", delta: "+12 this week", color: ACID },
                { label: "Active Variables", value: "183", delta: "across 6 projects", color: TEAL },
                { label: "Request Chains", value: "94", delta: "15 complex multi-step", color: BLUE },
                { label: "Interactions Recorded", value: "31", delta: "replayable patterns", color: ORANGE },
              ].map((s, i) => (
                <div key={i} style={{
                  background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 8,
                  padding: 16, borderTop: `2px solid ${s.color}`,
                }}>
                  <div style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{s.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: s.color, fontFamily: "monospace" }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{s.delta}</div>
                </div>
              ))}
            </div>

            {/* Recent Features */}
            <h3 style={{ fontSize: 14, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Recent Feature Requests</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {SAMPLE_FEATURES.map(f => (
                <div key={f.id}
                  onClick={() => { setSelectedFeature(f); setActiveView("generate"); setFeatureInput(f.description); if (f.status === "generated") setShowOutput(true); }}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 8,
                    padding: "14px 18px", cursor: "pointer",
                    transition: "border-color 0.2s",
                  }}
                  onMouseOver={e => e.currentTarget.style.borderColor = TEAL}
                  onMouseOut={e => e.currentTarget.style.borderColor = BORDER}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <GlowDot color={f.status === "generated" ? ACID : MUTED} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "#FFF" }}>{f.name}</div>
                      <div style={{ fontSize: 12, color: MUTED, maxWidth: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.description}</div>
                    </div>
                  </div>
                  <Badge color={f.status === "generated" ? ACID : MUTED}>{f.status}</Badge>
                </div>
              ))}
            </div>

            {/* Architecture Overview */}
            <div style={{ marginTop: 32, background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: TEAL, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>Behavioral Markings Flow</h3>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, flexWrap: "wrap" }}>
                {[
                  { label: "Feature Request", sub: "Natural Language", color: ORANGE },
                  { label: "Claude Plugin", sub: "Behavioral Engine", color: TEAL },
                  { label: "DOM Structure", sub: "BEM + data-wized-*", color: ACID },
                  { label: "Webflow Import", sub: "Visual Layer", color: BLUE },
                  { label: "Wized Config", sub: "Logic Layer", color: ACID },
                ].map((step, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center" }}>
                    <div style={{
                      padding: "12px 16px", borderRadius: 8,
                      border: `1px solid ${step.color}40`,
                      background: step.color + "10",
                      textAlign: "center", minWidth: 130,
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: step.color }}>{step.label}</div>
                      <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{step.sub}</div>
                    </div>
                    {i < 4 && <span style={{ color: ACID, margin: "0 8px", fontSize: 16 }}>→</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Generate View ─── */}
        {activeView === "generate" && (
          <div style={{ animation: "slideIn 0.4s ease" }}>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: "#FFF", marginBottom: 4 }}>Generate Behavioral Markings</h2>
              <p style={{ color: MUTED, fontSize: 13 }}>Describe a feature → get DOM, State Map, and Action Logic</p>
            </div>

            {/* Input */}
            <div style={{
              background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 8,
              padding: 20, marginBottom: 24,
            }}>
              <label style={{ fontSize: 11, color: TEAL, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, display: "block", marginBottom: 8 }}>Feature Request</label>
              <textarea
                ref={inputRef}
                value={featureInput}
                onChange={e => setFeatureInput(e.target.value)}
                placeholder="Describe your feature in natural language... e.g., 'I need a notification bell in the top nav with unread count badge and dropdown'"
                style={{
                  width: "100%", minHeight: 100, padding: 14,
                  background: DARK, border: `1px solid ${BORDER}`, borderRadius: 6,
                  color: TEXT, fontSize: 13, fontFamily: "inherit",
                  resize: "vertical",
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                <span style={{ fontSize: 11, color: MUTED }}>{featureInput.length} chars</span>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !featureInput.trim()}
                  style={{
                    padding: "10px 28px", borderRadius: 6, border: "none",
                    background: isGenerating ? BORDER : `linear-gradient(135deg, ${TEAL}, ${ACID})`,
                    color: DARK, fontWeight: 700, fontSize: 13,
                    cursor: isGenerating ? "not-allowed" : "pointer",
                    letterSpacing: 0.5,
                  }}
                >
                  {isGenerating ? "Generating..." : "⚡ Generate Markings"}
                </button>
              </div>
            </div>

            {/* Generation Progress */}
            {isGenerating && (
              <div style={{
                background: PANEL, border: `1px solid ${TEAL}30`, borderRadius: 8,
                padding: 20, marginBottom: 24,
                borderLeft: `3px solid ${TEAL}`,
              }}>
                <div style={{ fontSize: 11, color: TEAL, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, marginBottom: 12 }}>Processing Pipeline</div>
                {genSteps.map((step, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "4px 0", opacity: i <= generationStep ? 1 : 0.3,
                    transition: "opacity 0.3s",
                  }}>
                    <span style={{ fontSize: 12, color: i < generationStep ? ACID : i === generationStep ? TEAL : MUTED }}>
                      {i < generationStep ? "✓" : i === generationStep ? "▸" : "○"}
                    </span>
                    <span style={{
                      fontSize: 12, fontFamily: "monospace",
                      color: i < generationStep ? ACID : i === generationStep ? TEAL : MUTED,
                    }}>
                      {i === generationStep ? typedStep : step}
                    </span>
                  </div>
                ))}
                {/* Progress bar */}
                <div style={{ marginTop: 12, height: 3, background: BORDER, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", background: `linear-gradient(90deg, ${TEAL}, ${ACID})`,
                    width: `${((generationStep + 1) / genSteps.length) * 100}%`,
                    transition: "width 0.5s ease",
                    borderRadius: 2,
                  }} />
                </div>
              </div>
            )}

            {/* Output Tabs */}
            {showOutput && (
              <div style={{ animation: "slideIn 0.5s ease" }}>
                <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
                  {tabs.map(t => (
                    <button key={t.key} onClick={() => setActiveTab(t.key)}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "10px 20px", borderRadius: "8px 8px 0 0",
                        border: `1px solid ${activeTab === t.key ? TEAL : BORDER}`,
                        borderBottom: activeTab === t.key ? `2px solid ${TEAL}` : `1px solid ${BORDER}`,
                        background: activeTab === t.key ? TEAL + "10" : PANEL,
                        color: activeTab === t.key ? TEAL : MUTED,
                        cursor: "pointer", fontWeight: 600, fontSize: 12,
                      }}>
                      <span>{t.icon}</span> {t.label}
                    </button>
                  ))}
                </div>

                <div style={{
                  background: PANEL, border: `1px solid ${BORDER}`, borderRadius: "0 8px 8px 8px",
                  padding: 20,
                }}>
                  {activeTab === "dom" && (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <div>
                          <Badge color={ACID}>BEM Convention</Badge>
                          <span style={{ marginLeft: 8 }}><Badge color={BLUE}>Webflow-Ready</Badge></span>
                        </div>
                        <button onClick={() => navigator.clipboard?.writeText(GENERATED_OUTPUT.dom)} style={{
                          padding: "6px 14px", borderRadius: 4, border: `1px solid ${BORDER}`,
                          background: "transparent", color: MUTED, cursor: "pointer", fontSize: 11,
                        }}>📋 Copy</button>
                      </div>
                      <CodeBlock code={GENERATED_OUTPUT.dom} language="html" />
                      <div style={{ marginTop: 12, padding: 12, background: ACID + "08", borderRadius: 6, border: `1px solid ${ACID}20` }}>
                        <span style={{ fontSize: 11, color: ACID, fontWeight: 600 }}>✦ Wized Attributes Detected: </span>
                        <span style={{ fontSize: 11, color: MUTED }}>3 data-wized-id · 2 data-wized-action · 2 data-wized-condition · 1 data-wized-loop</span>
                      </div>
                    </div>
                  )}
                  {activeTab === "state" && (
                    <div>
                      <div style={{ marginBottom: 16 }}>
                        <Badge color={TEAL}>3 Variables</Badge>
                        <span style={{ marginLeft: 8 }}><Badge color={ORANGE}>Auto-Tracked</Badge></span>
                      </div>
                      <StateMapTable data={GENERATED_OUTPUT.stateMap} />
                      <div style={{ marginTop: 16, padding: 12, background: TEAL + "08", borderRadius: 6, border: `1px solid ${TEAL}20` }}>
                        <span style={{ fontSize: 11, color: TEAL, fontWeight: 600 }}>⬡ Variable Binding: </span>
                        <span style={{ fontSize: 11, color: MUTED }}>All variables are auto-bound to their consuming elements via data-wized-id references</span>
                      </div>
                    </div>
                  )}
                  {activeTab === "actions" && (
                    <div>
                      <div style={{ marginBottom: 16 }}>
                        <Badge color={BLUE}>2 Request Chains</Badge>
                        <span style={{ marginLeft: 8 }}><Badge color={ACID}>Production-Ready</Badge></span>
                      </div>
                      <ActionChain data={GENERATED_OUTPUT.actionLogic} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Library View ─── */}
        {activeView === "library" && (
          <div style={{ animation: "slideIn 0.4s ease" }}>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: "#FFF", marginBottom: 4 }}>Interaction Schema Library</h2>
              <p style={{ color: MUTED, fontSize: 13 }}>Recorded patterns for AI replay and team knowledge sharing</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
              {[
                { name: "Auth Flow", desc: "Login → Dashboard redirect with token storage", patterns: 4, replays: 23, color: TEAL },
                { name: "CRUD Operations", desc: "Create, Read, Update, Delete with optimistic UI", patterns: 8, replays: 41, color: ACID },
                { name: "Search + Filter", desc: "Autocomplete with debounced API calls", patterns: 3, replays: 17, color: BLUE },
                { name: "Notification System", desc: "Real-time bell with mark-as-read flow", patterns: 2, replays: 12, color: ORANGE },
                { name: "Multi-Step Form", desc: "Wizard with validation and progress tracking", patterns: 6, replays: 34, color: TEAL },
                { name: "Data Table", desc: "Sortable, filterable, paginated data grid", patterns: 5, replays: 28, color: ACID },
              ].map((item, i) => (
                <div key={i} style={{
                  background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 8,
                  padding: 18, borderLeft: `3px solid ${item.color}`,
                  cursor: "pointer", transition: "transform 0.2s",
                }}
                  onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"}
                  onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#FFF", marginBottom: 4 }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: MUTED }}>{item.desc}</div>
                    </div>
                    <Badge color={item.color}>{item.patterns} patterns</Badge>
                  </div>
                  <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
                    <span style={{ fontSize: 11, color: MUTED }}>▶ {item.replays} replays</span>
                    <span style={{ fontSize: 11, color: ACID }}>✓ Production verified</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Moat Metric */}
            <div style={{
              marginTop: 24, padding: 20, background: PANEL,
              border: `1px solid ${ACID}30`, borderRadius: 8,
              textAlign: "center",
            }}>
              <div style={{ fontSize: 11, color: TEAL, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600, marginBottom: 8 }}>Institutional Moat Score</div>
              <div style={{ fontSize: 48, fontWeight: 900, fontFamily: "monospace", color: ACID }}>87<span style={{ fontSize: 20, color: MUTED }}>/100</span></div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>28 recorded patterns · 155 replays · 6 team members trained</div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Footer ─── */}
      <footer style={{
        borderTop: `1px solid ${BORDER}`,
        padding: "12px 24px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: PANEL,
        marginTop: 48,
      }}>
        <span style={{ fontSize: 11, color: MUTED }}>CXO Scale · Wiz-Flow v1.0</span>
        <span style={{ fontSize: 11, color: MUTED }}>Behavioral Markings Engine · {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}
