import { registerRoot, Composition } from "remotion";
import React from "react";
import { WhiteboardComposition }  from "./Composition.jsx";
import { ThreeDComposition }      from "./ThreeDComposition.jsx";
import { GraphComposition }       from "./GraphComposition.jsx";
import { PhysicsComposition }     from "./PhysicsComposition.jsx";

// ── Default props (used by Remotion Studio preview only) ─────────────────────
const DEFAULT_WB = {
  title:            "Sample Scene",
  narration:        "This is a sample narration for preview purposes.",
  equations:        ["v = d / t", "F = ma"],
  keyFacts:         ["Force equals mass times acceleration", "SI unit of force is Newton"],
  accent:           "#1565c0",
  durationFrames:   300,
  fps:              30,
  // Vijnana Engine fields (empty = standard whiteboard look)
  layer:            "",
  crisisHook:       "",
  historicalMentor: "",
  mentorQuote:      "",
};

const DEFAULT_3D = {
  title:          "Atomic Structure",
  narration:      "Electrons orbit the nucleus in defined energy shells.",
  model3d:        "atom",
  durationFrames: 300,
  fps:            30,
};

const DEFAULT_GRAPH = {
  title:          "Sine Wave",
  narration:      "The sine function oscillates between minus one and plus one.",
  graphType:      "sin",
  equations:      ["y = sin(x)"],
  keyFacts:       ["Period = 2π", "Amplitude = 1"],
  accent:         "#1565c0",
  durationFrames: 300,
  fps:            30,
};

const DEFAULT_PHYS = {
  title:          "Simple Pendulum",
  narration:      "A pendulum swings back and forth under the influence of gravity.",
  simulation:     "pendulum",
  simParams:      { length: 1.5, angle: 40 },
  keyFacts:       ["Period T = 2π√(L/g)", "Restoring force = mg sinθ"],
  accent:         "#1565c0",
  durationFrames: 300,
  fps:            30,
};

// ── Root — registers all compositions ────────────────────────────────────────
export const Root = () => (
  <>
    {/* General whiteboard — narrative / STEM text overlay */}
    <Composition
      id="WhiteboardComposition"
      component={WhiteboardComposition}
      durationInFrames={DEFAULT_WB.durationFrames}
      fps={DEFAULT_WB.fps}
      width={1280}
      height={720}
      defaultProps={DEFAULT_WB}
      calculateMetadata={({ props }) => ({
        durationInFrames: props.durationFrames || DEFAULT_WB.durationFrames,
        fps:              props.fps            || DEFAULT_WB.fps,
      })}
    />

    {/* Phase 1 — Three.js / R3F 3D models */}
    <Composition
      id="ThreeDComposition"
      component={ThreeDComposition}
      durationInFrames={DEFAULT_3D.durationFrames}
      fps={DEFAULT_3D.fps}
      width={1280}
      height={720}
      defaultProps={DEFAULT_3D}
      calculateMetadata={({ props }) => ({
        durationInFrames: props.durationFrames || DEFAULT_3D.durationFrames,
        fps:              props.fps            || DEFAULT_3D.fps,
      })}
    />

    {/* Phase 2 — Mafs animated math graphs */}
    <Composition
      id="GraphComposition"
      component={GraphComposition}
      durationInFrames={DEFAULT_GRAPH.durationFrames}
      fps={DEFAULT_GRAPH.fps}
      width={1280}
      height={720}
      defaultProps={DEFAULT_GRAPH}
      calculateMetadata={({ props }) => ({
        durationInFrames: props.durationFrames || DEFAULT_GRAPH.durationFrames,
        fps:              props.fps            || DEFAULT_GRAPH.fps,
      })}
    />

    {/* Phase 3 — Matter.js physics simulations */}
    <Composition
      id="PhysicsComposition"
      component={PhysicsComposition}
      durationInFrames={DEFAULT_PHYS.durationFrames}
      fps={DEFAULT_PHYS.fps}
      width={1280}
      height={720}
      defaultProps={DEFAULT_PHYS}
      calculateMetadata={({ props }) => ({
        durationInFrames: props.durationFrames || DEFAULT_PHYS.durationFrames,
        fps:              props.fps            || DEFAULT_PHYS.fps,
      })}
    />
  </>
);

registerRoot(Root);
