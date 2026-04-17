"use client";

import { useState, useEffect, useRef } from "react";
import {
  Navigation, Phone, MapPin, Clock, CheckCircle2, AlertTriangle,
  Siren, Truck, User, RefreshCw, ChevronRight, Radio,
  Building2,
} from "lucide-react";
import { useDispatchData, useFleetData } from "../../hooks/useNexusData";

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const STATUS_FLOW = [
  { status: "dispatched",   next: "en_route",    btnLabel: "EN ROUTE",      btnColor: "#8b5cf6", emoji: "🚨" },
  { status: "en_route",     next: "on_scene",    btnLabel: "ON SCENE",      btnColor: "#ef4444", emoji: "📍" },
  { status: "on_scene",     next: "transporting",btnLabel: "TRANSPORTING",  btnColor: "#f97316", emoji: "🚑" },
  { status: "transporting", next: "at_hospital", btnLabel: "AT HOSPITAL",   btnColor: "#06b6d4", emoji: "🏥" },
  { status: "at_hospital",  next: "completed",   btnLabel: "COMPLETE TRIP", btnColor: "#22c55e", emoji: "✅" },
];

const STATUS_META = {
  pending:      { label: "Pending",      color: "#f59e0b" },
  dispatched:   { label: "Dispatched",   color: "#3b82f6" },
  en_route:     { label: "En Route",     color: "#8b5cf6" },
  on_scene:     { label: "On Scene",     color: "#ef4444" },
  transporting: { label: "Transporting", color: "#f97316" },
  at_hospital:  { label: "At Hospital",  color: "#06b6d4" },
  completed:    { label: "Completed",    color: "#22c55e" },
  cancelled:    { label: "Cancelled",    color: "#6b7280" },
};

const STATUS_SEQUENCE = ["dispatched", "en_route", "on_scene", "transporting", "at_hospital", "completed"];

const PRIORITY_COLOR = { 1: "#ef4444", 2: "#f59e0b", 3: "#22c55e", 4: "#6b7280" };
const PRIORITY_LABEL = { 1: "P1 CRITICAL", 2: "P2 URGENT", 3: "P3 STANDARD", 4: "P4 LOW" };

// ─────────────────────────────────────────────────────────────
// ELAPSED TIMER HOOK
// ─────────────────────────────────────────────────────────────
function useElapsedTimer(startIso) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!startIso) { setElapsed(0); return; }
    const startMs = new Date(startIso).getTime();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startIso]);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

// ─────────────────────────────────────────────────────────────
// DRIVER APP
// ─────────────────────────────────────────────────────────────
export default function DriverApp() {
  const { trips, activeTrips, loading, refresh, updateTripStatus } = useDispatchData();
  const { ambulances } = useFleetData();

  const [selectedAmbulance, setSelectedAmbulance] = useState("");
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  // Find the active trip for the selected ambulance
  const ambulanceTrips = activeTrips.filter(
    (t) => selectedAmbulance && String(t.ambulance_id) === String(selectedAmbulance)
  );

  const myTrip = selectedTripId
    ? trips.find((t) => String(t.id) === String(selectedTripId))
    : ambulanceTrips.length === 1
    ? ambulanceTrips[0]
    : null;

  const timer = useElapsedTimer(myTrip?.en_route_at || myTrip?.created_at);
  const currentFlow = STATUS_FLOW.find((f) => f.status === myTrip?.status);

  const handleStatusUpdate = async (nextStatus) => {
    if (!myTrip) return;
    setUpdating(true);
    const res = await updateTripStatus(myTrip.id, nextStatus);
    if (res) {
      setStatusMsg({ ok: true, text: `Status → ${STATUS_META[nextStatus]?.label}` });
    } else {
      setStatusMsg({ ok: false, text: "Update failed — check connection" });
    }
    setTimeout(() => setStatusMsg(null), 3500);
    setUpdating(false);
  };

  const openMaps = (address) => {
    if (!address) return;
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const callNumber = (phone) => {
    if (!phone) return;
    window.location.href = `tel:${phone}`;
  };

  return (
    <div style={{ maxWidth: 540, margin: "0 auto" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "rgba(249,115,22,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Truck size={18} style={{ color: "#f97316" }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
              Driver Console
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>
              MedPod Field Terminal
            </div>
          </div>
        </div>
        <button
          onClick={refresh}
          style={{
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, width: 32, height: 32,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "#fff",
          }}
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* ── Ambulance Selector ── */}
      <div className="glass-card" style={{ borderRadius: 12, padding: 14, marginBottom: 12 }}>
        <div style={{
          fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)",
          textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8,
        }}>
          Select Your Vehicle
        </div>
        <select
          value={selectedAmbulance}
          onChange={(e) => { setSelectedAmbulance(e.target.value); setSelectedTripId(null); }}
          style={{
            width: "100%", background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
            padding: "10px 12px", color: "#fff", fontSize: 13, outline: "none",
          }}
        >
          <option value="">— Select ambulance registration —</option>
          {ambulances.map((a) => (
            <option key={a.id} value={a.id}>
              {a.registration_number || a.vehicle_number || `Amb #${a.id}`}
              {a.type ? ` · ${a.type}` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* ── Multi-trip selector ── */}
      {selectedAmbulance && ambulanceTrips.length > 1 && (
        <div className="glass-card" style={{ borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)",
            textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8,
          }}>
            Select Active Trip
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {ambulanceTrips.map((t) => {
              const isSelected = String(selectedTripId) === String(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTripId(t.id)}
                  style={{
                    textAlign: "left", padding: "10px 12px", borderRadius: 8,
                    background: isSelected ? "rgba(249,115,22,0.15)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${isSelected ? "rgba(249,115,22,0.4)" : "rgba(255,255,255,0.08)"}`,
                    color: "#fff", cursor: "pointer", fontSize: 12,
                  }}
                >
                  Trip #{t.trip_no || t.id} · {t.patient_name || "Unknown Patient"} ·{" "}
                  <span style={{ color: STATUS_META[t.status]?.color }}>
                    {STATUS_META[t.status]?.label || t.status}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── No trip message ── */}
      {selectedAmbulance && !myTrip && ambulanceTrips.length === 0 && (
        <div className="glass-card" style={{ borderRadius: 14, padding: 32, textAlign: "center" }}>
          <Siren size={28} style={{ color: "rgba(255,255,255,0.15)", marginBottom: 8 }} />
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>
            No active trip assigned
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>
            All clear — awaiting dispatch
          </div>
        </div>
      )}

      {/* ── Active Trip UI ── */}
      {myTrip && (
        <>
          {/* Priority + Status Banner */}
          <div
            className="glass-card"
            style={{
              borderRadius: 14, padding: 16, marginBottom: 10,
              borderLeft: `3px solid ${PRIORITY_COLOR[myTrip.priority] || "#f59e0b"}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{
                fontSize: 11, fontWeight: 800,
                color: PRIORITY_COLOR[myTrip.priority] || "#f59e0b",
                fontFamily: "'SF Mono', monospace", letterSpacing: "0.06em",
              }}>
                {PRIORITY_LABEL[myTrip.priority] || "PRIORITY UNKNOWN"}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 700,
                color: STATUS_META[myTrip.status]?.color || "#fff",
                background: `${STATUS_META[myTrip.status]?.color || "#fff"}22`,
                padding: "3px 10px", borderRadius: 6,
              }}>
                ● {STATUS_META[myTrip.status]?.label || myTrip.status}
              </span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", marginBottom: 2 }}>
              {myTrip.patient_name || "Patient"}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
              {myTrip.type_of_emergency || "Emergency"} · Trip #{myTrip.trip_no || myTrip.id}
            </div>
          </div>

          {/* Route Info */}
          <div className="glass-card" style={{ borderRadius: 14, padding: 16, marginBottom: 10 }}>
            {/* Pickup */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: "rgba(34,197,94,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <MapPin size={14} style={{ color: "#22c55e" }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)",
                  textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2,
                }}>
                  Pickup
                </div>
                <div style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>
                  {myTrip.pickup_address || myTrip.incident_address || "—"}
                </div>
              </div>
              <button
                onClick={() => openMaps(myTrip.pickup_address || myTrip.incident_address)}
                style={{
                  background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)",
                  borderRadius: 8, padding: "6px 10px", color: "#22c55e",
                  fontSize: 11, fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 4,
                }}
              >
                <Navigation size={12} /> Maps
              </button>
            </div>

            {/* Divider arrow */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 14, marginBottom: 10 }}>
              <div style={{ width: 2, height: 16, background: "rgba(255,255,255,0.1)", borderRadius: 1 }} />
              <ChevronRight size={11} style={{ color: "rgba(255,255,255,0.3)" }} />
            </div>

            {/* Destination */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: "rgba(6,182,212,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <Building2 size={14} style={{ color: "#06b6d4" }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)",
                  textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2,
                }}>
                  Destination Hospital
                </div>
                <div style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>
                  {myTrip.destination_name || myTrip.hospital_name || myTrip.dest_hospital || "Hospital"}
                </div>
                {myTrip.hospital_phone && (
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>
                    {myTrip.hospital_phone}
                  </div>
                )}
              </div>
              <button
                onClick={() => openMaps(myTrip.destination_name || myTrip.hospital_name || myTrip.dest_hospital)}
                style={{
                  background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.25)",
                  borderRadius: 8, padding: "6px 10px", color: "#06b6d4",
                  fontSize: 11, fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 4,
                }}
              >
                <Navigation size={12} /> Maps
              </button>
            </div>
          </div>

          {/* Progress Strip */}
          <div className="glass-card" style={{ borderRadius: 14, padding: 14, marginBottom: 10 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)",
              textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12,
            }}>
              Trip Progress
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
              {STATUS_SEQUENCE.map((s, i) => {
                const currentIdx = STATUS_SEQUENCE.indexOf(myTrip.status);
                const thisIdx = i;
                const done = currentIdx > thisIdx;
                const current = currentIdx === thisIdx;
                const meta = STATUS_META[s];
                return (
                  <div key={s} style={{ display: "flex", alignItems: "center", flex: i < STATUS_SEQUENCE.length - 1 ? 1 : 0 }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: "50%",
                      background: done || current ? meta.color : "rgba(255,255,255,0.15)",
                      boxShadow: current ? `0 0 8px ${meta.color}` : "none",
                      flexShrink: 0, transition: "all 0.3s",
                    }} />
                    {i < STATUS_SEQUENCE.length - 1 && (
                      <div style={{
                        flex: 1, height: 2,
                        background: done ? meta.color : "rgba(255,255,255,0.08)",
                        transition: "all 0.3s",
                      }} />
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", marginTop: 6 }}>
              {STATUS_SEQUENCE.map((s, i) => (
                <div
                  key={s}
                  style={{
                    flex: i < STATUS_SEQUENCE.length - 1 ? 1 : 0,
                    fontSize: 8, fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.04em", whiteSpace: "nowrap", paddingRight: 4,
                    color: myTrip.status === s
                      ? STATUS_META[s].color
                      : "rgba(255,255,255,0.25)",
                  }}
                >
                  {STATUS_META[s].label}
                </div>
              ))}
            </div>
          </div>

          {/* THE BIG STATUS BUTTON */}
          {currentFlow && (
            <button
              onClick={() => handleStatusUpdate(currentFlow.next)}
              disabled={updating}
              style={{
                width: "100%", padding: "22px 16px", borderRadius: 16, marginBottom: 10,
                background: updating
                  ? "rgba(255,255,255,0.06)"
                  : `linear-gradient(135deg, ${currentFlow.btnColor}, ${currentFlow.btnColor}cc)`,
                border: "none", color: "#fff",
                fontSize: 20, fontWeight: 900, letterSpacing: "0.06em",
                cursor: updating ? "not-allowed" : "pointer",
                boxShadow: updating ? "none" : `0 8px 28px ${currentFlow.btnColor}55`,
                transition: "all 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
              }}
            >
              {updating
                ? <RefreshCw size={22} className="animate-spin" />
                : <span style={{ fontSize: 24 }}>{currentFlow.emoji}</span>}
              <span>{updating ? "UPDATING..." : `▶ ${currentFlow.btnLabel}`}</span>
            </button>
          )}

          {/* Completed state */}
          {myTrip.status === "completed" && (
            <div
              className="glass-card"
              style={{
                borderRadius: 16, padding: 24, marginBottom: 10,
                textAlign: "center", borderColor: "rgba(34,197,94,0.3)",
              }}
            >
              <CheckCircle2 size={36} style={{ color: "#22c55e", marginBottom: 8 }} />
              <div style={{ fontSize: 16, fontWeight: 800, color: "#22c55e" }}>Trip Completed</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
                Return to base or await reassignment
              </div>
            </div>
          )}

          {/* Status toast */}
          {statusMsg && (
            <div style={{
              padding: "10px 14px", borderRadius: 10, marginBottom: 10,
              background: statusMsg.ok ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
              border: `1px solid ${statusMsg.ok ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
              fontSize: 12, fontWeight: 700,
              color: statusMsg.ok ? "#22c55e" : "#ef4444",
            }}>
              {statusMsg.ok ? "✓ " : "⚠ "}{statusMsg.text}
            </div>
          )}

          {/* Quick Contacts */}
          <div className="glass-card" style={{ borderRadius: 14, padding: 14, marginBottom: 10 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)",
              textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10,
            }}>
              Quick Contacts
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button
                onClick={() => callNumber(myTrip.dispatch_phone || myTrip.dispatch_contact)}
                style={{
                  padding: "14px 8px", borderRadius: 12,
                  background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)",
                  color: "#3b82f6", cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                }}
              >
                <Radio size={22} />
                <span style={{ fontSize: 11, fontWeight: 700 }}>Dispatch</span>
              </button>
              <button
                onClick={() => callNumber(myTrip.relative_phone || myTrip.caller_phone || myTrip.patient_phone)}
                style={{
                  padding: "14px 8px", borderRadius: 12,
                  background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.25)",
                  color: "#f97316", cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                }}
              >
                <User size={22} />
                <span style={{ fontSize: 11, fontWeight: 700 }}>Patient / Family</span>
              </button>
              <button
                onClick={() => callNumber(myTrip.hospital_phone || myTrip.dest_hospital_phone)}
                style={{
                  padding: "14px 8px", borderRadius: 12,
                  background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.25)",
                  color: "#06b6d4", cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                }}
              >
                <Building2 size={22} />
                <span style={{ fontSize: 11, fontWeight: 700 }}>Hospital</span>
              </button>
              <button
                onClick={() => callNumber("112")}
                style={{
                  padding: "14px 8px", borderRadius: 12,
                  background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)",
                  color: "#ef4444", cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                }}
              >
                <AlertTriangle size={22} />
                <span style={{ fontSize: 11, fontWeight: 700 }}>Emergency (112)</span>
              </button>
            </div>
          </div>

          {/* Trip timer */}
          <div
            className="glass-card"
            style={{
              borderRadius: 12, padding: "10px 16px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Clock size={13} style={{ color: "rgba(255,255,255,0.35)" }} />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>
                Trip Timer
              </span>
            </div>
            <span style={{
              fontSize: 20, fontWeight: 900, color: "#fff",
              fontFamily: "'SF Mono', monospace", letterSpacing: "0.04em",
            }}>
              {timer}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
