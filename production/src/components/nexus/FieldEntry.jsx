"use client";

/**
 * FIELD ENTRY — 3-Click Strategy hub
 *
 * Single click-1 surface for the three field roles. Each role honours the
 * same contract: ≤3 taps from this screen to a meaningful clinical action.
 *
 *   Click 1 (here):    Pick role  → ASHA · Driver · Paramedic
 *   Click 2 (in role): Pick scenario / vehicle / trip
 *   Click 3 (in role): Big colored action button
 *
 * Sticky role: localStorage(medpod.local.field.role) so a returning user
 * lands directly on their role's screen — exit button to switch.
 */

import { useState, useEffect } from "react";
import { Stethoscope, Truck, HeartHandshake, ChevronRight, RefreshCw, Hospital, ArrowLeft } from "lucide-react";

import AshaForm from "./AshaForm";
import DriverApp from "./DriverApp";
import ParamedicApp from "./ParamedicApp";
import ParamedicCapture from "./ParamedicCapture";
import ClinicOnWheels from "./ClinicOnWheels";

const ROLE_KEY = "medpod.local.field.role";

const ROLES = [
  {
    id: "digital-clinic",
    label: "Digital Clinic · Doctor / Tech",
    sub: "Camp queue · AI triage · hub referral",
    detail: "Run the mobile clinic day — capture vitals, voice-note in Hindi/Marathi/Kannada, AI decides refer or treat-at-camp, one tap pushes a FHIR packet to the nearest partner hospital.",
    icon: Hospital,
    color: "#22c55e",
    Component: ClinicOnWheels,
    badge: "NEW",
  },
  {
    id: "asha",
    label: "ASHA Worker",
    sub: "Send a referral to 108",
    detail: "Mother & child · sick patient · injury — 3 taps to dispatch",
    icon: HeartHandshake,
    color: "#ec4899",
    Component: AshaForm,
  },
  {
    id: "driver",
    label: "Ambulance Driver",
    sub: "Update trip status",
    detail: "Pick vehicle → tap status → drive — one button per stage",
    icon: Truck,
    color: "#f97316",
    Component: DriverApp,
  },
  {
    id: "paramedic",
    label: "Paramedic · 3-click AI capture",
    sub: "Scan · Talk · Send",
    detail: "Camera reads pulse + breath · talk in Hindi/Marathi/English · AI fills the PCR · one tap to send to hospital",
    icon: Stethoscope,
    color: "#2e7bc4",
    Component: ParamedicCapture,
    badge: "NEW",
  },
  {
    id: "paramedic-classic",
    label: "Paramedic · classic PCR",
    sub: "Full 8-tab form",
    detail: "The legacy detailed PCR form — vitals table, PHC checklist, prenotification, CPR timer. Use when the 3-click capture isn't enough.",
    icon: Stethoscope,
    color: "#8a7e70",
    Component: ParamedicApp,
  },
];

function loadRole() {
  if (typeof window === "undefined") return null;
  const r = window.localStorage.getItem(ROLE_KEY);
  return ROLES.find((x) => x.id === r) || null;
}
function saveRole(id) {
  if (typeof window === "undefined") return;
  if (id) window.localStorage.setItem(ROLE_KEY, id);
  else window.localStorage.removeItem(ROLE_KEY);
}

export default function FieldEntry() {
  // Initialise role synchronously from localStorage to avoid the paint-1
  // flash. The useState initialiser runs once on mount — no observable
  // transition, no hydration spinner blinking into the role chip.
  const [role, setRoleState] = useState(() =>
    typeof window !== "undefined" ? loadRole() : null
  );
  const setRole = (r) => setRoleState(r);
  // Track hydration only so we can render with a short fade-in (keeps
  // SSR + client markup identical on first paint, then fades to avoid
  // any perceived flicker on slower devices).
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);

  // Role active → render the role component with an Exit affordance
  if (role) {
    const RoleComponent = role.Component;
    const exitToHub = () => { saveRole(null); setRole(null); };
    return (
      <div>
        {/* Role chip strip — confirms the active role, gives an obvious
            Back button to return to the role hub. Both affordances live
            left-of-label (back) and right-of-label (change role) so the
            button is always visible against the cream brand surface. */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 14, padding: "10px 12px", borderRadius: 14,
          background: `${role.color}14`, border: `1.5px solid ${role.color}55`,
          gap: 10,
        }}>
          <button
            onClick={exitToHub}
            title="Back to role hub"
            style={{
              padding: "7px 12px", borderRadius: 10,
              background: "white",
              border: `1.5px solid ${role.color}55`,
              color: role.color, fontSize: 12, fontWeight: 800,
              cursor: "pointer", letterSpacing: "0.04em",
              display: "flex", alignItems: "center", gap: 6,
              flexShrink: 0,
              boxShadow: `0 2px 6px ${role.color}18`,
            }}
          >
            <ArrowLeft size={14} /> BACK
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0, justifyContent: "center" }}>
            <role.icon size={15} style={{ color: role.color, flexShrink: 0 }} />
            <span style={{
              fontSize: 12, fontWeight: 800, color: role.color,
              letterSpacing: "0.06em", overflow: "hidden",
              textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {role.label.toUpperCase()}
            </span>
          </div>

          <button
            onClick={exitToHub}
            title="Change role"
            style={{
              padding: "7px 12px", borderRadius: 10,
              background: "transparent",
              border: `1.5px solid ${role.color}55`,
              color: role.color, fontSize: 11, fontWeight: 800,
              cursor: "pointer", letterSpacing: "0.04em",
              flexShrink: 0,
            }}
          >
            CHANGE ROLE
          </button>
        </div>

        {/* AshaForm accepts onExit — others ignore the prop harmlessly */}
        <RoleComponent onExit={exitToHub} />
      </div>
    );
  }

  // Hub: Click 1 — pick role
  return (
    <div style={{ maxWidth: 540, margin: "0 auto", padding: "0 4px" }}>
      <div style={{ marginBottom: 18, textAlign: "center" }}>
        <div style={{
          display: "inline-block", padding: "4px 12px", borderRadius: 999,
          background: "rgba(46,123,196,0.10)", border: "1px solid rgba(46,123,196,0.22)",
          fontSize: 9, fontWeight: 800, color: "#2e7bc4", letterSpacing: "0.1em",
        }}>3-CLICK FIELD CONSOLE</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#2a2320", marginTop: 10, letterSpacing: "-0.02em" }}>
          Who are you on this device?
        </div>
        <div style={{ fontSize: 11, color: "#8a7e70", marginTop: 4 }}>
          One tap now — your role is remembered for next time.
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {ROLES.map((r) => {
          const Icon = r.icon;
          return (
            <button
              key={r.id}
              onClick={() => { saveRole(r.id); setRole(r); }}
              style={{
                width: "100%", padding: "16px 16px", borderRadius: 14,
                background: "#ffffff", border: `1.5px solid ${r.color}35`,
                color: "#2a2320", cursor: "pointer", textAlign: "left",
                display: "flex", alignItems: "center", gap: 14,
                transition: "transform 0.15s, box-shadow 0.15s",
                boxShadow: "0 1px 0 rgba(42,35,32,0.02), 0 4px 14px -6px rgba(42,35,32,0.07)",
              }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                background: `${r.color}14`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon size={22} style={{ color: r.color }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#2a2320" }}>{r.label}</span>
                  {r.badge && (
                    <span style={{
                      fontSize: 9, fontWeight: 800, letterSpacing: "0.1em",
                      padding: "2px 7px", borderRadius: 999,
                      background: `${r.color}18`, color: r.color,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      {r.badge}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: r.color, marginBottom: 3, letterSpacing: "0.03em" }}>
                  {r.sub}
                </div>
                <div style={{ fontSize: 10, color: "#8a7e70", lineHeight: 1.45 }}>
                  {r.detail}
                </div>
              </div>
              <ChevronRight size={16} style={{ color: "#8a7e70", flexShrink: 0 }} />
            </button>
          );
        })}
      </div>

      <div style={{
        marginTop: 14, padding: "10px 14px", borderRadius: 10,
        background: "#f3ece0", border: "1px solid #e8dfd2",
        fontSize: 10, color: "#8a7e70", lineHeight: 1.6, textAlign: "center",
      }}>
        Field flows are offline-first. Anything you submit while offline queues locally
        and syncs when network returns. Every action is logged in the audit trail.
      </div>
    </div>
  );
}
