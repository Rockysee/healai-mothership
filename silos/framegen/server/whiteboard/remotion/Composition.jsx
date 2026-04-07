import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  spring,
} from "remotion";

// ── Layer colour palette (mirrors SyllabusStudio) ────────────────────────────
const LAYER_COLORS = {
  CRISIS_STAKES:       "#ff6b35",
  GHOST_LAYER:         "#4da6ff",
  VARIABLE_REVELATION: "#d4ff6e",
  OBSERVER_AI:         "#c084fc",
  TRIUMPH:             "#4dff9e",
};

// ── Word-by-word fade-in ──────────────────────────────────────────────────
function AnimatedWords({ text, startFrame, color = "#555", size = 22 }) {
  const frame = useCurrentFrame();
  const words  = (text || "").split(" ").filter(Boolean);
  return (
    <span>
      {words.map((word, i) => {
        const sf      = startFrame + i * 4;
        const opacity = interpolate(frame, [sf, sf + 10], [0, 1], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
          easing: Easing.out(Easing.quad),
        });
        const ty = interpolate(frame, [sf, sf + 10], [8, 0], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
        });
        return (
          <span
            key={i}
            style={{
              opacity,
              display:     "inline-block",
              transform:   `translateY(${ty}px)`,
              marginRight: "0.3em",
              fontSize:    size,
              color,
              fontFamily:  "'Segoe UI', system-ui, sans-serif",
              lineHeight:  1.6,
            }}
          >
            {word}
          </span>
        );
      })}
    </span>
  );
}

// ── Equation block — pops in with a spring ───────────────────────────────
function EquationBox({ text, startFrame }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: frame - startFrame, fps, config: { stiffness: 120, damping: 12 } });
  const opacity  = Math.min(1, progress);
  const scale    = interpolate(progress, [0, 1], [0.8, 1]);
  return (
    <div
      style={{
        opacity,
        transform:      `scale(${scale})`,
        display:        "inline-block",
        background:     "#fff8e1",
        border:         "2.5px solid #c0392b",
        borderRadius:   9,
        padding:        "10px 26px",
        marginBottom:   18,
        fontSize:       34,
        fontFamily:     "'Courier New', monospace",
        color:          "#c0392b",
        fontWeight:     700,
        letterSpacing:  "0.06em",
      }}
    >
      {text}
    </div>
  );
}

// ── Key-fact line — slides in from left ──────────────────────────────────
function FactLine({ text, startFrame, accent = "#1565c0" }) {
  const frame = useCurrentFrame();
  const tx = interpolate(frame, [startFrame, startFrame + 18], [-50, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const opacity = interpolate(frame, [startFrame, startFrame + 18], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        opacity,
        transform:   `translateX(${tx}px)`,
        display:     "flex",
        alignItems:  "flex-start",
        gap:         14,
        marginBottom: 14,
      }}
    >
      <div style={{ width: 4, minHeight: 28, background: accent, borderRadius: 2, flexShrink: 0, marginTop: 3 }} />
      <div style={{ fontSize: 24, color: "#2c3e50", fontFamily: "'Segoe UI', system-ui, sans-serif", lineHeight: 1.45 }}>
        {text}
      </div>
    </div>
  );
}

// ── Vijnana: Layer badge (top-right chip) ─────────────────────────────────
function LayerBadge({ layer }) {
  const frame = useCurrentFrame();
  const color = LAYER_COLORS[layer] || "#aaa";
  const opacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position:      "absolute",
        top:           22,
        right:         26,
        opacity,
        display:       "flex",
        alignItems:    "center",
        gap:           6,
        padding:       "4px 10px",
        background:    `${color}18`,
        border:        `1.5px solid ${color}55`,
        borderRadius:  20,
      }}
    >
      <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 11, fontWeight: 800, color, letterSpacing: ".07em", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        {layer}
      </span>
    </div>
  );
}

// ── Vijnana: Crisis hook subtitle ─────────────────────────────────────────
function CrisisSubtitle({ text, accent }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [14, 28], [0, 1], { extrapolateRight: "clamp" });
  const ty      = interpolate(frame, [14, 28], [6, 0],  { extrapolateRight: "clamp" });
  return (
    <div style={{
      opacity,
      transform:   `translateY(${ty}px)`,
      marginTop:   6,
      fontSize:    18,
      color:       accent || "#ff6b35",
      fontFamily:  "'Segoe UI', system-ui, sans-serif",
      fontStyle:   "italic",
      fontWeight:  600,
    }}>
      ⚡ {text}
    </div>
  );
}

// ── Vijnana: Mentor card (slides in from right at 60% of scene) ───────────
function MentorCard({ name, quote, durationFrames }) {
  const frame   = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Appear at ~55% of scene duration
  const startF  = Math.floor(durationFrames * 0.55);
  const tx = interpolate(frame, [startF, startF + 22], [340, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const opacity = interpolate(frame, [startF, startF + 22], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  if (frame < startF - 5) return null;
  return (
    <div style={{
      position:    "absolute",
      bottom:      110,
      right:       50,
      width:       310,
      opacity,
      transform:   `translateX(${tx}px)`,
      background:  "rgba(30,20,50,0.92)",
      border:      "1.5px solid #c084fc55",
      borderRadius: 11,
      padding:     "12px 16px",
      backdropFilter: "blur(4px)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 18 }}>🏛</span>
        <span style={{ fontSize: 12, fontWeight: 800, color: "#c084fc", fontFamily: "'Segoe UI', system-ui, sans-serif", letterSpacing: ".05em" }}>
          OBSERVER — {name}
        </span>
      </div>
      {quote && (
        <div style={{ fontSize: 13, color: "#e0d4f5", fontStyle: "italic", fontFamily: "'Segoe UI', system-ui, sans-serif", lineHeight: 1.5 }}>
          "{quote}"
        </div>
      )}
    </div>
  );
}

// ── Main composition ──────────────────────────────────────────────────────
export const WhiteboardComposition = ({
  title             = "",
  narration         = "",
  equations         = [],
  keyFacts          = [],
  accent            = "#1565c0",
  durationFrames    = 300,
  fps               = 30,
  // ── Vijnana Engine fields ──
  layer             = "",   // "CRISIS_STAKES" | "GHOST_LAYER" | "VARIABLE_REVELATION" | "OBSERVER_AI" | "TRIUMPH"
  crisisHook        = "",
  historicalMentor  = "",
  mentorQuote       = "",
}) => {
  const frame = useCurrentFrame();
  const { fps: cfps } = useVideoConfig();

  // Resolve accent from layer colour if layer is set
  const resolvedAccent = layer ? (LAYER_COLORS[layer] || accent) : accent;

  // Title spring entrance
  const titleProgress = spring({ frame, fps: cfps, config: { stiffness: 70, damping: 14 } });
  const titleY  = interpolate(titleProgress, [0, 1], [-24, 0]);

  // Accent bar grows from left
  const barW = interpolate(frame, [10, 38], [0, 100], { extrapolateRight: "clamp" });

  // Background tint for CRISIS and TRIUMPH layers
  const bgTint = layer === "CRISIS_STAKES"
    ? "rgba(255,107,53,0.04)"
    : layer === "TRIUMPH"
      ? "rgba(77,255,158,0.04)"
      : "transparent";

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#f8f8f8",
        padding:         "54px 60px",
        boxSizing:       "border-box",
        fontFamily:      "'Segoe UI', system-ui, sans-serif",
      }}
    >
      {/* Layer-tinted background overlay */}
      {bgTint !== "transparent" && (
        <div style={{ position: "absolute", inset: 0, background: bgTint, pointerEvents: "none" }} />
      )}

      {/* Layer badge (Vijnana) */}
      {layer ? (
        <LayerBadge layer={layer} />
      ) : (
        <div style={{ position: "absolute", top: 22, right: 26, fontSize: 26, opacity: 0.35 }}>✏️</div>
      )}

      {/* Title */}
      <div style={{ opacity: titleProgress, transform: `translateY(${titleY}px)`, marginBottom: 6 }}>
        <div style={{ fontSize: 44, fontWeight: 800, color: "#1a1a1a", lineHeight: 1.2 }}>
          {title}
        </div>
        <div style={{ marginTop: 10, height: 3, background: resolvedAccent, width: `${barW}%`, borderRadius: 2 }} />
        {/* Crisis hook subtitle (Vijnana CRISIS_STAKES scenes) */}
        {crisisHook && <CrisisSubtitle text={crisisHook} accent={LAYER_COLORS.CRISIS_STAKES} />}
      </div>

      {/* Content area */}
      <div style={{ marginTop: crisisHook ? 22 : 30 }}>
        {/* Equations */}
        {equations.slice(0, 2).map((eq, i) => (
          <div key={i}>
            <EquationBox text={eq} startFrame={22 + i * 24} />
          </div>
        ))}

        {/* Key facts */}
        <div style={{ marginTop: equations.length ? 14 : 0 }}>
          {keyFacts.slice(0, 3).map((fact, i) => (
            <FactLine key={i} text={fact} startFrame={50 + i * 22} accent={resolvedAccent} />
          ))}
        </div>
      </div>

      {/* Narration caption — word-by-word at bottom */}
      <div
        style={{
          position:     "absolute",
          bottom:       46,
          left:         60,
          right:        historicalMentor ? 380 : 60,   // shrink if mentor card is present
          borderTop:    "1px solid #ddd",
          paddingTop:   14,
        }}
      >
        <AnimatedWords text={narration} startFrame={85} color="#666" size={22} />
      </div>

      {/* Mentor card (Vijnana OBSERVER_AI scenes) */}
      {historicalMentor && (
        <MentorCard
          name={historicalMentor}
          quote={mentorQuote}
          durationFrames={durationFrames}
        />
      )}
    </AbsoluteFill>
  );
};
