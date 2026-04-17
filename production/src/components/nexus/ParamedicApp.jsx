"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Heart, Activity, Save, Plus, Trash2, RefreshCw,
  Zap, Wind, Droplets, Siren, User,
} from "lucide-react";
import {
  useDispatchData, usePCRData, useHospitalData,
} from "../../hooks/useNexusData";

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const PRIORITY_COLOR = { 1: "#ef4444", 2: "#f59e0b", 3: "#22c55e", 4: "#6b7280" };
const PRIORITY_LABEL = { 1: "P1 CRITICAL", 2: "P2 URGENT", 3: "P3 STANDARD", 4: "P4 LOW" };

const STATUS_ACTIVE = ["dispatched", "en_route", "on_scene", "transporting"];

const STATUS_META = {
  dispatched:   "Dispatched",
  en_route:     "En Route",
  on_scene:     "On Scene",
  transporting: "Transporting",
};

// 6 quick-action buttons with PHC key, label, color, icon
const QUICK_ACTIONS = [
  { key: "phc_cpr",       label: "CPR",       color: "#ef4444", Icon: Heart },
  { key: "phc_aed",       label: "AED/DEFIB", color: "#ef4444", Icon: Zap },
  { key: "phc_eti",       label: "AIRWAY",    color: "#f97316", Icon: Wind },
  { key: "phc_iv_fluids", label: "IV ACCESS", color: "#22c55e", Icon: Droplets },
  { key: "phc_oxygen",    label: "O₂",        color: "#06b6d4", Icon: Activity },
  { key: "phc_ecg",       label: "ECG",       color: "#3b82f6", Icon: Activity },
];

// All 16 PHC items for the full checklist
const PHC_ITEMS = [
  { key: "phc_cpr",            label: "CPR",                color: "#ef4444" },
  { key: "phc_aed",            label: "AED / Defibrillation", color: "#ef4444" },
  { key: "phc_eti",            label: "ETI / Intubation",   color: "#f97316" },
  { key: "phc_opa_npa",        label: "OPA / NPA",          color: "#f97316" },
  { key: "phc_bag_mask",       label: "Bag-Valve Mask",     color: "#f97316" },
  { key: "phc_oxygen",         label: "O₂ Therapy",         color: "#06b6d4" },
  { key: "phc_suction",        label: "Suction",            color: "#8b5cf6" },
  { key: "phc_iv_fluids",      label: "IV Fluids",          color: "#22c55e" },
  { key: "phc_ecg",            label: "ECG",                color: "#3b82f6" },
  { key: "phc_telemetry",      label: "Telemetry",          color: "#3b82f6" },
  { key: "phc_c_collar",       label: "C-Collar",           color: "#f59e0b" },
  { key: "phc_splinting",      label: "Splinting",          color: "#f59e0b" },
  { key: "phc_wound_care",     label: "Wound Care",         color: "#f59e0b" },
  { key: "phc_ryles_tube",     label: "Ryle's Tube",        color: "#8b5cf6" },
  { key: "phc_ventilator",     label: "Ventilator",         color: "#ec4899" },
  { key: "phc_own_medication", label: "Own Medication",     color: "#6b7280" },
];

const VITAL_ROWS = [
  { key: "vs_pulse_rate", label: "Pulse Rate",    unit: "bpm",  inputMode: "numeric" },
  { key: "vs_bp",         label: "Blood Pressure",unit: "mmHg", inputMode: "text" },
  { key: "vs_spo2",       label: "SpO₂",          unit: "%",    inputMode: "numeric" },
  { key: "vs_respiration",label: "Respiration",   unit: "/min", inputMode: "numeric" },
  { key: "vs_gcs_total",  label: "GCS",           unit: "/15",  inputMode: "numeric" },
];

const COMMON_DRUGS = [
  "Adrenaline (Epinephrine)", "Amiodarone", "Atropine", "Aspirin",
  "GTN (Nitroglycerin)", "Midazolam", "Morphine",
  "Normal Saline 0.9%", "Ringer's Lactate",
  "Dextrose 25%", "Dextrose 50%", "Ondansetron",
  "Salbutamol Nebulizer", "Adenosine", "Sodium Bicarbonate", "Other",
];

const ROUTES = ["IV", "IM", "SC", "SL", "Nebulization", "Oral", "Rectal", "Topical", "IO"];

// ─────────────────────────────────────────────────────────────
// CPR TIMER SUB-COMPONENT
// ─────────────────────────────────────────────────────────────
function CPRTimer() {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [cycles, setCycles] = useState(0);
  const startRef = useRef(null);
  const intervalRef = useRef(null);

  const startStop = () => {
    if (running) {
      clearInterval(intervalRef.current);
      setRunning(false);
    } else {
      startRef.current = Date.now() - elapsed * 1000;
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      }, 1000);
      setRunning(true);
    }
  };

  const reset = () => {
    clearInterval(intervalRef.current);
    setRunning(false);
    setElapsed(0);
    setCycles(0);
  };

  useEffect(() => () => clearInterval(intervalRef.current), []);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  // Pulse reminder at every 2-minute boundary (±2 s)
  const cycleAlert = running && elapsed > 0 && elapsed % 120 < 3;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div style={{
        fontSize: 40, fontWeight: 900, fontFamily: "'SF Mono', monospace",
        color: running ? (cycleAlert ? "#f59e0b" : "#ef4444") : "#fff",
        letterSpacing: "0.04em", lineHeight: 1, transition: "color 0.3s",
      }}>
        {mm}:{ss}
      </div>

      {cycleAlert && (
        <div style={{
          fontSize: 11, color: "#f59e0b", fontWeight: 800, letterSpacing: "0.06em",
          animationName: "pulse-g", animationDuration: "1s",
          animationTimingFunction: "ease-in-out", animationIterationCount: "infinite",
        }}>
          ⚠ CYCLE CHANGE
        </div>
      )}

      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
        Cycles completed: <strong style={{ color: "#fff" }}>{cycles}</strong>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
        <button
          onClick={startStop}
          style={{
            padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 800,
            cursor: "pointer",
            background: running ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.85)",
            border: `1px solid ${running ? "rgba(239,68,68,0.4)" : "transparent"}`,
            color: "#fff",
          }}
        >
          {running ? "⏸ PAUSE" : "▶ START"}
        </button>
        <button
          onClick={() => setCycles((c) => c + 1)}
          disabled={!running}
          style={{
            padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 800,
            cursor: running ? "pointer" : "not-allowed",
            background: "rgba(245,158,11,0.15)",
            border: "1px solid rgba(245,158,11,0.3)",
            color: "#f59e0b", opacity: running ? 1 : 0.4,
          }}
        >
          + Cycle
        </button>
        <button
          onClick={reset}
          style={{
            padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 800,
            cursor: "pointer",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.5)",
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PARAMEDIC APP
// ─────────────────────────────────────────────────────────────
export default function ParamedicApp() {
  const { trips, loading: dispLoading, refresh: dispRefresh } = useDispatchData();
  const { createPcr, updateSection } = usePCRData();
  const { hospitals } = useHospitalData();

  const [selectedTripId, setSelectedTripId] = useState(null);
  const [pcrId, setPcrId] = useState(null);
  const [section, setSection] = useState("actions");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);

  // ── State buckets ──
  const [phc, setPhc] = useState({});
  const [vitals, setVitals] = useState({});
  const [meds, setMeds] = useState([]);
  const [newMed, setNewMed] = useState({ drug: "", dose: "", route: "IV", time: "" });
  const [prenotif, setPrenotif] = useState({ hospital_id: "", eta: "", note: "" });
  const [prenotifSent, setPrenotifSent] = useState(false);

  const activeTrips = trips.filter((t) => STATUS_ACTIVE.includes(t.status));
  const myTrip = selectedTripId ? trips.find((t) => String(t.id) === String(selectedTripId)) : null;

  // ── Helpers ──
  const showMsg = (ok, text) => {
    setSaveMsg({ ok, text });
    setTimeout(() => setSaveMsg(null), 3500);
  };

  const nowHHMM = () => new Date().toTimeString().slice(0, 5);

  const togglePhc = (key) => {
    setPhc((prev) => {
      if (prev[key]) {
        const { [key]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: nowHHMM() };
    });
  };

  const setVital = (key, tp, val) =>
    setVitals((prev) => ({ ...prev, [`${key}_${tp}`]: val }));

  const addMed = () => {
    if (!newMed.drug) return;
    setMeds((prev) => [...prev, { ...newMed, time: newMed.time || nowHHMM(), id: Date.now() }]);
    setNewMed({ drug: "", dose: "", route: "IV", time: "" });
  };

  const removeMed = (id) => setMeds((prev) => prev.filter((m) => m.id !== id));

  // ── Trip selection ──
  const handleSelectTrip = (tripId) => {
    setSelectedTripId(tripId);
    setPcrId(null);
    setPhc({});
    setVitals({});
    setMeds([]);
    setPrenotif({ hospital_id: "", eta: "", note: "" });
    setPrenotifSent(false);
    setSection("actions");
  };

  // ── Create PCR ──
  const handleCreatePcr = async () => {
    if (!myTrip) return;
    setSaving(true);
    const result = await createPcr(myTrip.id);
    if (result) {
      setPcrId(result.id);
      showMsg(true, `PCR #${result.id} created`);
    } else {
      showMsg(false, "Failed to create PCR — check connection");
    }
    setSaving(false);
  };

  // ── Save handlers ──
  const saveVitals = async () => {
    if (!pcrId) return;
    setSaving(true);
    const data = {};
    VITAL_ROWS.forEach((row) => {
      ["scene", "travel", "hospital"].forEach((tp) => {
        const v = vitals[`${row.key}_${tp}`];
        if (v) data[`${row.key}_${tp}`] = v;
      });
    });
    const ok = await updateSection(pcrId, "vital_signs", data);
    showMsg(!!ok, ok ? "Vitals saved to PCR" : "Save failed");
    setSaving(false);
  };

  const savePhc = async () => {
    if (!pcrId) return;
    setSaving(true);
    const data = {};
    PHC_ITEMS.forEach((item) => { data[item.key] = !!phc[item.key]; });
    const ok = await updateSection(pcrId, "pre_hospital_care", data);
    showMsg(!!ok, ok ? "PHC saved to PCR" : "Save failed");
    setSaving(false);
  };

  const saveMeds = async () => {
    if (!pcrId) return;
    setSaving(true);
    const ok = await updateSection(pcrId, "medications", { logs: meds });
    showMsg(!!ok, ok ? "Medications saved to PCR" : "Save failed");
    setSaving(false);
  };

  const sendPrenotif = async () => {
    if (!pcrId || !prenotif.hospital_id) return;
    setSaving(true);
    const hospital = hospitals.find((h) => String(h.id) === String(prenotif.hospital_id));
    const ok = await updateSection(pcrId, "destinations", {
      dest_hospital_name: hospital?.name || hospital?.hospital_name || prenotif.hospital_id,
      comments_receiving_hospital: prenotif.note,
      arrival_time_hospital: prenotif.eta,
    });
    if (ok) { setPrenotifSent(true); showMsg(true, "Prenotification recorded in PCR"); }
    else { showMsg(false, "Send failed"); }
    setSaving(false);
  };

  // ── Nav tabs ──
  const NAV_TABS = [
    { id: "actions",  label: "⚡ Actions" },
    { id: "vitals",   label: "🫀 Vitals" },
    { id: "phc",      label: "PHC" },
    { id: "meds",     label: "💊 Meds" },
    { id: "hospital", label: "🏥 Prenotif" },
  ];

  // ── Shared styles ──
  const inputStyle = {
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 12, outline: "none",
    width: "100%",
  };

  const saveBtnStyle = (active) => ({
    width: "100%", padding: "12px 16px", borderRadius: 10, border: "none", fontSize: 13,
    fontWeight: 700, cursor: active ? "pointer" : "not-allowed",
    background: active ? "linear-gradient(135deg, #3b82f6, #2563eb)" : "rgba(255,255,255,0.06)",
    color: active ? "#fff" : "rgba(255,255,255,0.3)",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
  });

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "rgba(239,68,68,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Heart size={18} style={{ color: "#ef4444" }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
              Paramedic Console
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>
              MedPod Field Terminal
            </div>
          </div>
        </div>
        <button
          onClick={dispRefresh}
          style={{
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, width: 32, height: 32,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "#fff",
          }}
        >
          <RefreshCw size={13} className={dispLoading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* ── Trip Selector ── */}
      <div className="glass-card" style={{ borderRadius: 12, padding: 14, marginBottom: 12 }}>
        <div style={{
          fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)",
          textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8,
        }}>
          Select Active Trip
        </div>

        {activeTrips.length === 0 && (
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", padding: "6px 0" }}>
            No active trips at the moment
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {activeTrips.map((t) => {
            const isSelected = String(selectedTripId) === String(t.id);
            return (
              <button
                key={t.id}
                onClick={() => handleSelectTrip(t.id)}
                style={{
                  textAlign: "left", padding: "10px 14px", borderRadius: 10,
                  background: isSelected ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${isSelected ? "rgba(239,68,68,0.35)" : "rgba(255,255,255,0.08)"}`,
                  color: "#fff", cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>
                    {t.patient_name || "Unknown Patient"}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 800,
                    color: PRIORITY_COLOR[t.priority] || "#f59e0b",
                    fontFamily: "monospace",
                  }}>
                    {PRIORITY_LABEL[t.priority] || `P${t.priority}`}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>
                  {t.type_of_emergency || "Emergency"} · Trip #{t.trip_no || t.id}
                  {" · "}<span style={{ color: "rgba(255,255,255,0.6)" }}>
                    {STATUS_META[t.status] || t.status}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Create PCR button ── */}
      {myTrip && !pcrId && (
        <button
          onClick={handleCreatePcr}
          disabled={saving}
          style={{
            width: "100%", padding: "16px 16px", borderRadius: 12, marginBottom: 12,
            background: "linear-gradient(135deg, #ef4444, #b91c1c)",
            border: "none", color: "#fff", fontSize: 14, fontWeight: 800,
            cursor: saving ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          {saving ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />}
          {saving ? "Creating PCR..." : "CREATE PCR FOR THIS TRIP"}
        </button>
      )}

      {/* ── Active panel ── */}
      {myTrip && pcrId && (
        <>
          {/* Patient banner */}
          <div
            className="glass-card"
            style={{
              borderRadius: 14, padding: 14, marginBottom: 10,
              borderLeft: `3px solid ${PRIORITY_COLOR[myTrip.priority] || "#f59e0b"}`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>
                {myTrip.patient_name || "Patient"}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>
                {myTrip.chief_complaint || myTrip.type_of_emergency} · PCR #{pcrId}
              </div>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 800,
              color: PRIORITY_COLOR[myTrip.priority] || "#f59e0b",
              background: `${PRIORITY_COLOR[myTrip.priority] || "#f59e0b"}22`,
              padding: "4px 10px", borderRadius: 8, fontFamily: "monospace",
            }}>
              {PRIORITY_LABEL[myTrip.priority]}
            </span>
          </div>

          {/* Section nav */}
          <div style={{ display: "flex", gap: 4, marginBottom: 12, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            {NAV_TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setSection(t.id)}
                style={{
                  padding: "7px 12px", borderRadius: 10, fontSize: 11, fontWeight: 700,
                  cursor: "pointer", whiteSpace: "nowrap",
                  background: section === t.id ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${section === t.id ? "rgba(239,68,68,0.35)" : "rgba(255,255,255,0.08)"}`,
                  color: section === t.id ? "#ef4444" : "rgba(255,255,255,0.5)",
                  transition: "all 0.2s",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Save message */}
          {saveMsg && (
            <div style={{
              padding: "10px 14px", borderRadius: 10, marginBottom: 10,
              background: saveMsg.ok ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
              border: `1px solid ${saveMsg.ok ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
              fontSize: 12, fontWeight: 700,
              color: saveMsg.ok ? "#22c55e" : "#ef4444",
            }}>
              {saveMsg.ok ? "✓ " : "⚠ "}{saveMsg.text}
            </div>
          )}

          {/* ═══════════════════════════════
              SECTION: EMERGENCY ACTIONS
          ═══════════════════════════════ */}
          {section === "actions" && (
            <div>
              {/* CPR Timer */}
              <div
                className="glass-card"
                style={{ borderRadius: 14, padding: 20, marginBottom: 10, borderLeft: "3px solid #ef4444" }}
              >
                <div style={{
                  fontSize: 11, fontWeight: 700, color: "#ef4444",
                  textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16,
                }}>
                  ♥ CPR Timer
                </div>
                <CPRTimer />
              </div>

              {/* Quick action pad */}
              <div className="glass-card" style={{ borderRadius: 14, padding: 16, marginBottom: 10 }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)",
                  textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12,
                }}>
                  Quick Interventions — tap to log time
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  {QUICK_ACTIONS.map(({ key, label, color, Icon }) => {
                    const active = !!phc[key];
                    return (
                      <button
                        key={key}
                        onClick={() => togglePhc(key)}
                        style={{
                          padding: "16px 8px", borderRadius: 14, cursor: "pointer",
                          background: active ? `${color}22` : "rgba(255,255,255,0.04)",
                          border: `2px solid ${active ? color : "rgba(255,255,255,0.1)"}`,
                          color: active ? color : "rgba(255,255,255,0.5)",
                          display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                          transition: "all 0.15s",
                          boxShadow: active ? `0 0 14px ${color}44` : "none",
                        }}
                      >
                        <Icon size={24} />
                        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.03em" }}>
                          {label}
                        </span>
                        {active && (
                          <span style={{ fontSize: 9, fontFamily: "monospace", opacity: 0.8 }}>
                            {phc[key]}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════
              SECTION: VITALS
          ═══════════════════════════════ */}
          {section === "vitals" && (
            <div className="glass-card" style={{ borderRadius: 14, padding: 16, marginBottom: 10 }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)",
                textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14,
              }}>
                Vital Signs — 3 Timepoints
              </div>

              {/* Column headers */}
              <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 6, marginBottom: 8 }}>
                <div />
                {["At Scene", "In Transit", "At Hospital"].map((tp) => (
                  <div key={tp} style={{ fontSize: 10, color: "#3b82f6", fontWeight: 700, textAlign: "center" }}>
                    {tp}
                  </div>
                ))}
              </div>

              {VITAL_ROWS.map((row) => (
                <div
                  key={row.key}
                  style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 6, marginBottom: 8, alignItems: "center" }}
                >
                  <div>
                    <div style={{ fontSize: 11, color: "#fff", fontWeight: 700 }}>{row.label}</div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)" }}>{row.unit}</div>
                  </div>
                  {["scene", "travel", "hospital"].map((tp) => (
                    <input
                      key={tp}
                      type="text"
                      inputMode={row.inputMode}
                      placeholder="—"
                      value={vitals[`${row.key}_${tp}`] || ""}
                      onChange={(e) => setVital(row.key, tp, e.target.value)}
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 8, padding: "9px 6px",
                        color: "#fff", fontSize: 15, fontWeight: 700,
                        textAlign: "center", width: "100%", outline: "none",
                        fontFamily: "'SF Mono', monospace",
                      }}
                    />
                  ))}
                </div>
              ))}

              <button onClick={saveVitals} disabled={saving} style={saveBtnStyle(!saving)}>
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                Save Vitals to PCR
              </button>
            </div>
          )}

          {/* ═══════════════════════════════
              SECTION: PRE-HOSPITAL CARE
          ═══════════════════════════════ */}
          {section === "phc" && (
            <div className="glass-card" style={{ borderRadius: 14, padding: 16, marginBottom: 10 }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)",
                textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12,
              }}>
                Pre-Hospital Care — tap to mark done
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {PHC_ITEMS.map(({ key, label, color }) => {
                  const active = !!phc[key];
                  return (
                    <button
                      key={key}
                      onClick={() => togglePhc(key)}
                      style={{
                        padding: "12px 10px", borderRadius: 10, cursor: "pointer", textAlign: "left",
                        background: active ? `${color}18` : "rgba(255,255,255,0.04)",
                        border: `1px solid ${active ? `${color}55` : "rgba(255,255,255,0.1)"}`,
                        color: active ? color : "rgba(255,255,255,0.6)",
                        transition: "all 0.15s",
                        display: "flex", flexDirection: "column", gap: 2,
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700 }}>
                        {active ? "✓ " : "○ "}{label}
                      </span>
                      {active && (
                        <span style={{ fontSize: 9, fontFamily: "monospace", opacity: 0.7 }}>
                          {phc[key]}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={savePhc}
                disabled={saving}
                style={{
                  ...saveBtnStyle(!saving),
                  marginTop: 12,
                  background: !saving ? "linear-gradient(135deg, #22c55e, #16a34a)" : "rgba(255,255,255,0.06)",
                }}
              >
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                Save PHC to PCR
              </button>
            </div>
          )}

          {/* ═══════════════════════════════
              SECTION: MEDICATIONS
          ═══════════════════════════════ */}
          {section === "meds" && (
            <div>
              {/* Add medication */}
              <div className="glass-card" style={{ borderRadius: 14, padding: 16, marginBottom: 10 }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)",
                  textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12,
                }}>
                  Log Medication
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <select
                    value={newMed.drug}
                    onChange={(e) => setNewMed((m) => ({ ...m, drug: e.target.value }))}
                    style={{
                      ...inputStyle,
                      color: newMed.drug ? "#fff" : "rgba(255,255,255,0.4)",
                    }}
                  >
                    <option value="">Select Drug</option>
                    {COMMON_DRUGS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    <input
                      type="text"
                      placeholder="Dose"
                      value={newMed.dose}
                      onChange={(e) => setNewMed((m) => ({ ...m, dose: e.target.value }))}
                      style={{ ...inputStyle }}
                    />
                    <select
                      value={newMed.route}
                      onChange={(e) => setNewMed((m) => ({ ...m, route: e.target.value }))}
                      style={{ ...inputStyle }}
                    >
                      {ROUTES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <input
                      type="time"
                      value={newMed.time}
                      onChange={(e) => setNewMed((m) => ({ ...m, time: e.target.value }))}
                      style={{ ...inputStyle }}
                    />
                  </div>
                  <button
                    onClick={addMed}
                    disabled={!newMed.drug}
                    style={{
                      padding: "12px 16px", borderRadius: 10, border: "none",
                      background: newMed.drug
                        ? "linear-gradient(135deg, #f97316, #ea580c)"
                        : "rgba(255,255,255,0.06)",
                      color: newMed.drug ? "#fff" : "rgba(255,255,255,0.3)",
                      fontSize: 13, fontWeight: 800,
                      cursor: newMed.drug ? "pointer" : "not-allowed",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}
                  >
                    <Plus size={14} /> LOG MEDICATION
                  </button>
                </div>
              </div>

              {/* Log list */}
              {meds.length > 0 && (
                <div className="glass-card" style={{ borderRadius: 14, padding: 16, marginBottom: 10 }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)",
                    textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10,
                  }}>
                    Administered ({meds.length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {meds.map((med) => (
                      <div
                        key={med.id}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "8px 12px", borderRadius: 8,
                          background: "rgba(249,115,22,0.08)",
                          border: "1px solid rgba(249,115,22,0.2)",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>
                            {med.drug}
                          </div>
                          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", fontFamily: "monospace" }}>
                            {med.dose} · {med.route} · {med.time}
                          </div>
                        </div>
                        <button
                          onClick={() => removeMed(med.id)}
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: "rgba(255,255,255,0.3)", padding: 4,
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={saveMeds}
                    disabled={saving}
                    style={{
                      ...saveBtnStyle(!saving),
                      marginTop: 10,
                      background: !saving ? "linear-gradient(135deg, #f97316, #ea580c)" : "rgba(255,255,255,0.06)",
                    }}
                  >
                    {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                    Save Medications to PCR
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════
              SECTION: HOSPITAL PRENOTIFICATION
          ═══════════════════════════════ */}
          {section === "hospital" && (
            <div className="glass-card" style={{ borderRadius: 14, padding: 16, marginBottom: 10 }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: "#06b6d4",
                textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14,
              }}>
                🏥 Hospital Prenotification
              </div>

              {prenotifSent && (
                <div style={{
                  padding: "10px 14px", borderRadius: 10, marginBottom: 12,
                  background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)",
                  fontSize: 12, color: "#22c55e", fontWeight: 700,
                }}>
                  ✓ Prenotification recorded in PCR
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 700, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Receiving Hospital
                  </div>
                  <select
                    value={prenotif.hospital_id}
                    onChange={(e) => setPrenotif((p) => ({ ...p, hospital_id: e.target.value }))}
                    style={{ ...inputStyle, color: prenotif.hospital_id ? "#fff" : "rgba(255,255,255,0.4)" }}
                  >
                    <option value="">Select hospital</option>
                    {hospitals.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name || h.hospital_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 700, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    ETA
                  </div>
                  <input
                    type="time"
                    value={prenotif.eta}
                    onChange={(e) => setPrenotif((p) => ({ ...p, eta: e.target.value }))}
                    style={{ ...inputStyle }}
                  />
                </div>

                <div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 700, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Patient Condition Summary
                  </div>
                  <textarea
                    value={prenotif.note}
                    onChange={(e) => setPrenotif((p) => ({ ...p, note: e.target.value }))}
                    rows={5}
                    placeholder={`Patient: ${myTrip?.patient_name || "—"}\nChief complaint: ${myTrip?.chief_complaint || myTrip?.type_of_emergency || "—"}\nVitals: HR ___ BP ___ SpO₂ ___\nAirway: intact / secured\nIV: established / none`}
                    style={{
                      ...inputStyle,
                      resize: "vertical",
                      fontFamily: "inherit",
                      lineHeight: 1.6,
                    }}
                  />
                </div>

                <button
                  onClick={sendPrenotif}
                  disabled={saving || !prenotif.hospital_id}
                  style={{
                    padding: "16px 16px", borderRadius: 12, border: "none",
                    background: prenotif.hospital_id
                      ? "linear-gradient(135deg, #06b6d4, #0891b2)"
                      : "rgba(255,255,255,0.06)",
                    color: prenotif.hospital_id ? "#fff" : "rgba(255,255,255,0.3)",
                    fontSize: 15, fontWeight: 800,
                    cursor: prenotif.hospital_id ? "pointer" : "not-allowed",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    boxShadow: prenotif.hospital_id ? "0 6px 20px rgba(6,182,212,0.35)" : "none",
                  }}
                >
                  {saving ? <RefreshCw size={16} className="animate-spin" /> : "🏥"}
                  SEND PRENOTIFICATION
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
