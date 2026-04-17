"use client";
import { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import EinsteinAvatar from "./EinsteinAvatar";

// ═══════════════════════════════════════════════════════════════════════════════
// EINSTEIN PROVIDER — Global Context for Einstein Avatar
// Makes the avatar available across ALL pages as a floating widget.
// In the Mentor tab: full-size avatar as primary speaking interface.
// On every other tab: mini floating bubble (tap → navigate to Mentor).
// Goldenhour Systems Pvt Ltd
// ═══════════════════════════════════════════════════════════════════════════════

const EinsteinContext = createContext({
  mentorId: null,
  speaking: false,
  setSpeaking: () => {},
  setMentorId: () => {},
  avatarRef: { current: null },
  speak: () => {},
  stopSpeak: () => {},
});

export function useEinstein() {
  return useContext(EinsteinContext);
}

export default function EinsteinProvider({ children, currentView, onNavigateToMentor }) {
  const [mentorId, setMentorId] = useState("fox");
  const [speaking, setSpeaking] = useState(false);
  const [miniExpanded, setMiniExpanded] = useState(false);
  const avatarRef = useRef(null);

  // Speak via avatar + sync state
  const speak = useCallback(() => {
    setSpeaking(true);
    avatarRef.current?.startSpeaking();
  }, []);

  const stopSpeak = useCallback(() => {
    setSpeaking(false);
    avatarRef.current?.stopSpeaking();
  }, []);

  // Stop speaking when view changes
  useEffect(() => {
    stopSpeak();
  }, [currentView, stopSpeak]);

  const isMentorView = currentView === "mentor";

  return (
    <EinsteinContext.Provider value={{ mentorId, speaking, setSpeaking, setMentorId, avatarRef, speak, stopSpeak }}>
      {children}

      {/* ── Floating Mini-Einstein (all pages EXCEPT mentor) ── */}
      {!isMentorView && currentView !== "home" && currentView !== null && (
        <div
          className="fixed z-[55] transition-all duration-500"
          style={{
            bottom: "calc(100px + env(safe-area-inset-bottom, 0px))",
            right: "calc(16px + env(safe-area-inset-right, 0px))",
          }}
        >
          {/* Expanded bubble with label */}
          {miniExpanded && (
            <div
              className="absolute -top-12 right-0 whitespace-nowrap bg-white/10 backdrop-blur-xl border border-white/15 rounded-2xl px-3 py-1.5 text-[10px] text-white/60 font-mono tracking-wider uppercase shadow-xl animate-fadeIn"
              style={{ animationDuration: "0.2s" }}
            >
              Talk to Einstein
            </div>
          )}

          <button
            onClick={() => {
              if (onNavigateToMentor) onNavigateToMentor();
            }}
            onMouseEnter={() => setMiniExpanded(true)}
            onMouseLeave={() => setMiniExpanded(false)}
            className="relative group"
            title="Talk to AI Einstein"
          >
            {/* Glow ring */}
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-lg group-hover:bg-emerald-500/30 transition-all scale-110" />

            {/* Mini avatar */}
            <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-white/15 group-hover:border-emerald-500/40 shadow-2xl transition-all duration-300 group-hover:scale-110">
              <EinsteinAvatar
                ref={null}
                size={64}
                mentorId={mentorId}
                speaking={speaking}
                mini={true}
              />
            </div>

            {/* Active pulse */}
            {speaking && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-[#020205] animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            )}
          </button>
        </div>
      )}
    </EinsteinContext.Provider>
  );
}
