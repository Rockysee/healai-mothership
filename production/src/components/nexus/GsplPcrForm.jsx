"use client";
/**
 * ═══════════════════════════════════════════════════════════════════
 * GSPL PCR FORM — Exact replica of the GSPL Ambulance Run PCR
 * Source: https://pcrformambulancerun.firebaseapp.com/index.html
 *
 * Structure:
 *   Header Nav   → EMT Summary (modal) | Patient Transfer | Fuel Mileage | Petty Cash | EMT Handing
 *   Timeline     → 11 timestamp fields
 *   3-col layout → Basic Details | Patient Details | Other Details
 *   8 Subtabs    → Past Illness | History of Medication | Type of Case | Vital Signs
 *                   Pregnancy Details | Pre Hospital Care | Events During Transport | Physician Name & Advice
 *   Vital Signs  → 3-timepoint table (At Scene / During Travel / At Hospital)
 *   Operational   → Delay codes, refusal checkboxes, equipment handover, hospital sign-off
 *
 * All data stored in a single `formState` object and persisted via
 * the PCR API's JSON section columns.
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  Clipboard, Users, Heart, Activity, Clock, Save, X, Plus,
  ChevronRight, FileText, Thermometer, Shield, AlertTriangle,
  Stethoscope, Search, Edit3, CheckCircle2, Eye,
} from "lucide-react";

// ────────────────────────────────────────────────────────
// STYLE CONSTANTS (glass-morphism dark theme)
// ────────────────────────────────────────────────────────
const S = {
  accent: "#f97316",
  bg: "#020205",
  glass: "rgba(255,255,255,0.03)",
  glassBorder: "rgba(255,255,255,0.06)",
  label: "rgba(255,255,255,0.5)",
  text: "#fff",
  mutedText: "rgba(255,255,255,0.35)",
  input: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    padding: "7px 10px",
    color: "#fff",
    fontSize: 11,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  select: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    padding: "7px 10px",
    color: "#fff",
    fontSize: 11,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    appearance: "none",
  },
  sectionTitle: {
    fontSize: 11, fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.06em", marginBottom: 10,
  },
  card: {
    borderRadius: 14, padding: 14, marginBottom: 12,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
    backdropFilter: "blur(20px)",
  },
};

// ────────────────────────────────────────────────────────
// FIELD HELPERS
// ────────────────────────────────────────────────────────
function FLabel({ children }) {
  return <label style={{ fontSize: 10, color: S.label, fontWeight: 600, marginBottom: 2, display: "block" }}>{children}</label>;
}
function FInput({ label, name, placeholder, value, onChange, type = "text", style = {} }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, ...style }}>
      {label && <FLabel>{label}</FLabel>}
      <input type={type} name={name} placeholder={placeholder || label} value={value || ""}
        onChange={onChange} style={S.input} />
    </div>
  );
}
function FSelect({ label, name, options, value, onChange, style = {} }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, ...style }}>
      {label && <FLabel>{label}</FLabel>}
      <select name={name} value={value || ""} onChange={onChange} style={S.select}>
        <option value="">Select</option>
        {options.map(o => typeof o === "string"
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.value} value={o.value}>{o.label}</option>
        )}
      </select>
    </div>
  );
}
function FTime({ label, name, value, onChange, style = {} }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, ...style }}>
      {label && <FLabel>{label}</FLabel>}
      <input type="time" name={name} value={value || ""} onChange={onChange} style={S.input} />
    </div>
  );
}
function FCheckbox({ label, name, checked, onChange }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "rgba(255,255,255,0.7)", cursor: "pointer" }}>
      <input type="checkbox" name={name} checked={!!checked} onChange={onChange}
        style={{ accentColor: S.accent, width: 14, height: 14 }} />
      {label}
    </label>
  );
}
function FRadio({ label, name, value, selected, onChange }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "rgba(255,255,255,0.7)", cursor: "pointer" }}>
      <input type="radio" name={name} value={value} checked={selected === value} onChange={onChange}
        style={{ accentColor: S.accent, width: 14, height: 14 }} />
      {label}
    </label>
  );
}
function SectionCard({ title, accent = S.accent, children }) {
  return (
    <div style={{ ...S.card, borderLeft: `3px solid ${accent}` }}>
      {title && <div style={{ ...S.sectionTitle, color: accent }}>{title}</div>}
      {children}
    </div>
  );
}

// ────────────────────────────────────────────────────────
// 8 SUBTAB DEFINITIONS
// ────────────────────────────────────────────────────────
const SUBTABS = [
  { id: "pastIllness",           label: "Past Illness" },
  { id: "historyMedication",     label: "History of Medication" },
  { id: "typeOfCase",            label: "Type of Case" },
  { id: "vitalSigns",            label: "Vital Signs" },
  { id: "pregnancyDetails",      label: "Pregnancy Details" },
  { id: "preHospitalCare",       label: "Pre Hospital Care" },
  { id: "eventsDuringTransport", label: "Events During Transport" },
  { id: "nameAdvice",            label: "Physician Name & Advice" },
];

// ────────────────────────────────────────────────────────
// HEADER NAV PAGES
// ────────────────────────────────────────────────────────
const HEADER_PAGES = [
  { id: "main",            label: "PCR Form" },
  { id: "emtSummary",      label: "EMT Summary" },
  { id: "patientTransfer", label: "Patient Transfer" },
  { id: "fuelMileage",     label: "Fuel Mileage Record" },
  { id: "pettyCash",       label: "Petty Cash Record" },
  { id: "emtHanding",      label: "Handing & Take Over" },
];

// ────────────────────────────────────────────────────────
// DEFAULT FORM STATE (every single field from GSPL)
// ────────────────────────────────────────────────────────
function defaultFormState() {
  return {
    // ── Timeline (11 timestamps) ──
    time_call_received: "", time_dispatch: "", time_crew_notified: "",
    time_en_route: "", time_at_scene: "", time_patient_contact: "",
    time_left_scene: "", time_at_destination: "", time_available: "",
    time_back_in_service: "", time_in_station: "",

    // ── Basic Details ──
    date: "", trip_no: "", city: "", vehicle_location: "",
    driver_id: "", driver_name: "",

    // ── Patient Details ──
    patient_name: "", age: "", weight: "", blood_group: "",
    sex: "", occupation: "", ration_card: "", insurance_company: "",
    id_mark: "", patient_address: "", pincode: "",
    chief_complaint: "", duration: "", breathing: "",

    // ── Other Details ──
    incident_id: "", ambulance_no: "", ambulance_type: "",
    location_code: "", relative_name: "", relative_phone: "",
    attendant_name: "", attendant_phone: "",
    consciousness_alert: false, consciousness_verbal: false,
    consciousness_pain: false, consciousness_unresponsive: false,
    allergies: "", habits: "", family_doctor: "",
    medical_advice: "", extrication: "", good_samaritan: "",
    service: "", detail_address: "",

    // ── Past Illness ──
    pi_dm: false, pi_respiratory: false, pi_htn: false, pi_epilepsy: false,
    pi_hiv: false, pi_behavioural: false, pi_cad: false, pi_surgeries: false,
    pi_stroke: false, pi_trauma: false,

    // ── History of Medication ──
    hm_antibiotics: false, hm_diuretics: false, hm_antidiabetics: false,
    hm_bronchodilators: false, hm_antihypertensives: false,
    hm_antidepressants: false, hm_anticoagulants: false,
    hm_antianginals: false, hm_nsaids: false, hm_anticancer: false,

    // ── Type of Case ──
    type_of_emergency: "", cause: "", anatomical_area: "",
    mechanism_of_injury: "",
    presenting_symptom_1: "", presenting_symptom_2: "", presenting_symptom_3: "",

    // ── Vital Signs (3 timepoints × many rows) ──
    vs_pulse_rate_scene: "", vs_pulse_rate_travel: "", vs_pulse_rate_hospital: "",
    vs_pulse_rhythm_scene: "", vs_pulse_rhythm_travel: "", vs_pulse_rhythm_hospital: "",
    vs_pulse_volume_scene: "", vs_pulse_volume_travel: "", vs_pulse_volume_hospital: "",
    vs_bp_scene: "", vs_bp_travel: "", vs_bp_hospital: "",
    vs_respiration_scene: "", vs_respiration_travel: "", vs_respiration_hospital: "",
    vs_right_air_entry_scene: "", vs_right_air_entry_travel: "", vs_right_air_entry_hospital: "",
    vs_left_air_entry_scene: "", vs_left_air_entry_travel: "", vs_left_air_entry_hospital: "",
    vs_adventitious_scene: "", vs_adventitious_travel: "", vs_adventitious_hospital: "",
    vs_spo2_scene: "", vs_spo2_travel: "", vs_spo2_hospital: "",
    vs_pupils_right_size_scene: "", vs_pupils_right_size_travel: "", vs_pupils_right_size_hospital: "",
    vs_pupils_right_reaction_scene: "", vs_pupils_right_reaction_travel: "", vs_pupils_right_reaction_hospital: "",
    vs_pupils_left_size_scene: "", vs_pupils_left_size_travel: "", vs_pupils_left_size_hospital: "",
    vs_pupils_left_reaction_scene: "", vs_pupils_left_reaction_travel: "", vs_pupils_left_reaction_hospital: "",
    vs_gcs_e_scene: "", vs_gcs_v_scene: "", vs_gcs_m_scene: "",
    vs_gcs_e_travel: "", vs_gcs_v_travel: "", vs_gcs_m_travel: "",
    vs_gcs_e_hospital: "", vs_gcs_v_hospital: "", vs_gcs_m_hospital: "",

    // ── Pregnancy Details ──
    pregnancy: "", lmpdd: "",
    gravida: "", para: "", living: "", dead: "", abortions: "",
    abnormal_bleeding: "",
    apgar_a: "", apgar_p: "", apgar_g: "", apgar_aa: "", apgar_r: "",
    time_of_birth: "", baby_sex: "", aid_en_route: "",
    delivery_hospital_name: "", delivery_hospital_phone: "",

    // ── Pre Hospital Care (16 checkboxes) ──
    phc_aed: false, phc_opa_npa: false, phc_bag_mask: false,
    phc_ryles_tube: false, phc_c_collar: false, phc_splinting: false,
    phc_cpr: false, phc_suction: false, phc_ecg: false,
    phc_telemetry: false, phc_eti: false, phc_ventilator: false,
    phc_iv_fluids: false, phc_wound_care: false, phc_oxygen: false,
    phc_own_medication: false,

    // ── Events During Transport ──
    edt_status: "", // improved | status_quo | worsened | death

    // ── Physician Name & Advice ──
    dr_name: "", no_of_times: "", medicines_used: "",

    // ── Operational Decisions (container4) ──
    delay_reaching_patient: "",
    destination_determination: "",
    reason_not_serving: "",
    reason_not_proceeded_code: "",
    traffic_condition_code: "",
    transport_decline_form_signed: false,
    refusal_against_medical: false,
    self_determination: false,
    refusal_against_transport: false,
    restraints_used: false,
    destination_diversion: false,
    medical_decline_form_signed: false,
    treated_and_discharged: false,
    other_medical_authorities: false,
    do_not_resuscitate: false,

    // ── Equipment Handover ──
    equipment_1: "", equipment_2: "", equipment_3: "",
    equipment_4: "", equipment_5: "", equipment_6: "",
    receiver_name_sign: "", receiver_contact: "",

    // ── EMT Sign-off ──
    emt_id_no: "", emt_name: "", emt_signed_by: "",

    // ── Destination Hospital ──
    dest_hospital_name: "", dest_hospital_phone: "",
    arrival_time_hospital: "",
    comments_receiving_hospital: "",
    hospital_signed_by: "", hospital_seal: "",
    designation: "", date_time: "",
    patient_attendant_sign: "",

    // ── EMT Summary (modal page) ──
    emt_summary_notes: "",

    // ── Patient Transfer page ──
    pt_from_hospital: "", pt_to_hospital: "", pt_patient_name: "",
    pt_diagnosis: "", pt_referring_doctor: "", pt_transfer_reason: "",
    pt_condition_at_transfer: "", pt_vitals_at_transfer: "",
    pt_iv_lines: "", pt_medication_in_transit: "", pt_special_instructions: "",

    // ── Fuel Mileage page ──
    fm_vehicle_no: "", fm_date: "", fm_start_km: "", fm_end_km: "",
    fm_total_km: "", fm_fuel_filled: "", fm_fuel_cost: "",
    fm_fuel_station: "", fm_driver_sign: "",

    // ── Petty Cash page ──
    pc_date: "", pc_amount_received: "", pc_purpose: "",
    pc_amount_spent: "", pc_balance: "", pc_receipt_no: "",
    pc_approved_by: "", pc_remarks: "",

    // ── EMT Handing & Take Over page ──
    eh_date: "", eh_time: "", eh_outgoing_emt: "", eh_incoming_emt: "",
    eh_vehicle_condition: "", eh_equipment_status: "", eh_stock_status: "",
    eh_pending_issues: "", eh_outgoing_sign: "", eh_incoming_sign: "",
  };
}

// ════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════
export default function GsplPcrForm({ tripId: initialTripId, onSave, onClose, existingData }) {
  const [page, setPage] = useState("main");
  const [subtab, setSubtab] = useState("pastIllness");
  const [form, setForm] = useState(() => ({ ...defaultFormState(), ...(existingData || {}) }));
  const [showEmtSummaryModal, setShowEmtSummaryModal] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Generic field updater
  const F = useCallback((name) => ({
    value: form[name] ?? "",
    onChange: (e) => {
      const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
      setForm(prev => ({ ...prev, [name]: val }));
      setDirty(true);
    },
    name,
  }), [form]);

  // APGAR auto-sum
  const apgarSum = useMemo(() => {
    const vals = [form.apgar_a, form.apgar_p, form.apgar_g, form.apgar_aa, form.apgar_r];
    const nums = vals.map(v => parseInt(v) || 0);
    return nums.reduce((a, b) => a + b, 0);
  }, [form.apgar_a, form.apgar_p, form.apgar_g, form.apgar_aa, form.apgar_r]);

  // GCS auto-sum per timepoint
  const gcsSum = useCallback((tp) => {
    return (parseInt(form[`vs_gcs_e_${tp}`]) || 0) +
           (parseInt(form[`vs_gcs_v_${tp}`]) || 0) +
           (parseInt(form[`vs_gcs_m_${tp}`]) || 0);
  }, [form]);

  const handleSave = () => {
    if (onSave) onSave(form);
    setDirty(false);
  };

  // ────────────────────────────────────────────────────
  // RENDER: HEADER NAV BAR
  // ────────────────────────────────────────────────────
  const renderHeaderNav = () => (
    <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
      {HEADER_PAGES.map(p => (
        <button key={p.id} onClick={() => {
          if (p.id === "emtSummary") setShowEmtSummaryModal(true);
          else setPage(p.id);
        }} style={{
          padding: "6px 12px", borderRadius: 8, fontSize: 10, fontWeight: 700,
          background: page === p.id ? "rgba(249,115,22,0.15)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${page === p.id ? "rgba(249,115,22,0.4)" : "rgba(255,255,255,0.08)"}`,
          color: page === p.id ? "#f97316" : "rgba(255,255,255,0.5)",
          cursor: "pointer", transition: "all 0.15s",
        }}>
          {p.id === "emtSummary" ? "+ Add EMT Summary" : p.label}
        </button>
      ))}

      <div style={{ flex: 1 }} />
      <button onClick={handleSave} style={{
        padding: "6px 16px", borderRadius: 8, fontSize: 10, fontWeight: 700,
        background: dirty ? "linear-gradient(135deg, #f97316, #ea580c)" : "rgba(255,255,255,0.04)",
        border: dirty ? "none" : "1px solid rgba(255,255,255,0.08)",
        color: dirty ? "#fff" : "rgba(255,255,255,0.4)",
        cursor: "pointer",
      }}>
        <Save size={11} style={{ marginRight: 4 }} />
        {dirty ? "SAVE PCR" : "SAVED"}
      </button>
    </div>
  );

  // ────────────────────────────────────────────────────
  // RENDER: TIMELINE SECTION
  // ────────────────────────────────────────────────────
  const renderTimeline = () => {
    const fields = [
      { key: "time_call_received", label: "Call Received" },
      { key: "time_dispatch", label: "Dispatch" },
      { key: "time_crew_notified", label: "Crew Notified" },
      { key: "time_en_route", label: "En Route" },
      { key: "time_at_scene", label: "At Scene" },
      { key: "time_patient_contact", label: "Patient Contact" },
      { key: "time_left_scene", label: "Left Scene" },
      { key: "time_at_destination", label: "At Destination" },
      { key: "time_available", label: "Available" },
      { key: "time_back_in_service", label: "Back In Service" },
      { key: "time_in_station", label: "In Station" },
    ];
    return (
      <SectionCard title="Time Record" accent="#3b82f6">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8 }}>
          {fields.map(f => <FTime key={f.key} label={f.label} {...F(f.key)} />)}
        </div>
      </SectionCard>
    );
  };

  // ────────────────────────────────────────────────────
  // RENDER: BASIC DETAILS
  // ────────────────────────────────────────────────────
  const renderBasicDetails = () => (
    <SectionCard title="Basic Details" accent="#22c55e">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <FInput label="Date" type="date" {...F("date")} />
        <FInput label="Trip No" {...F("trip_no")} />
        <FInput label="City" {...F("city")} />
        <FInput label="Vehicle Location" {...F("vehicle_location")} />
        <FInput label="Driver ID" {...F("driver_id")} />
        <FInput label="Driver Name" {...F("driver_name")} />
      </div>
    </SectionCard>
  );

  // ────────────────────────────────────────────────────
  // RENDER: PATIENT DETAILS
  // ────────────────────────────────────────────────────
  const renderPatientDetails = () => (
    <SectionCard title="Patient Details" accent="#ec4899">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <FInput label="Patient Name" {...F("patient_name")} />
        <FInput label="Age" {...F("age")} />
        <FInput label="Weight (Kg)" {...F("weight")} />
        <FSelect label="Blood Group" {...F("blood_group")}
          options={["A+","A-","B+","B-","AB+","AB-","O+","O-"]} />
        <FSelect label="Sex" {...F("sex")} options={["Male","Female","Other"]} />
        <FInput label="Occupation" {...F("occupation")} />
        <FInput label="Ration Card No" {...F("ration_card")} />
        <FInput label="Insurance Company" {...F("insurance_company")} />
        <FInput label="ID Mark" {...F("id_mark")} />
        <div style={{ gridColumn: "1 / -1" }}>
          <FInput label="Patient Address" {...F("patient_address")} />
        </div>
        <FInput label="Pincode" {...F("pincode")} />
        <div style={{ gridColumn: "1 / -1" }}>
          <FInput label="Chief Complaint" {...F("chief_complaint")} />
        </div>
        <FInput label="Duration" {...F("duration")} />
        <FSelect label="Breathing" {...F("breathing")}
          options={["Normal","Abnormal","Absent"]} />
      </div>
    </SectionCard>
  );

  // ────────────────────────────────────────────────────
  // RENDER: OTHER DETAILS
  // ────────────────────────────────────────────────────
  const renderOtherDetails = () => (
    <SectionCard title="Other Details" accent="#8b5cf6">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <FInput label="Incident ID" {...F("incident_id")} />
        <FInput label="Ambulance No" {...F("ambulance_no")} />
        <div style={{ gridColumn: "1 / -1", display: "flex", gap: 12, flexWrap: "wrap" }}>
          <FLabel>Ambulance Type</FLabel>
          {["ALS","BLS","Patient Transport","Mortuary"].map(t => (
            <FRadio key={t} label={t} name="ambulance_type" value={t}
              selected={form.ambulance_type} onChange={F("ambulance_type").onChange} />
          ))}
        </div>
        <FInput label="Location Code" {...F("location_code")} />
        <FInput label="Relative Name" {...F("relative_name")} />
        <FInput label="Relative Phone" {...F("relative_phone")} />
        <FInput label="Attendant Name" {...F("attendant_name")} />
        <FInput label="Attendant Phone" {...F("attendant_phone")} />
        <div style={{ gridColumn: "1 / -1" }}>
          <FLabel>Consciousness (AVPU)</FLabel>
          <div style={{ display: "flex", gap: 14, marginTop: 4 }}>
            <FCheckbox label="Alert" {...F("consciousness_alert")} checked={form.consciousness_alert} />
            <FCheckbox label="Verbal" {...F("consciousness_verbal")} checked={form.consciousness_verbal} />
            <FCheckbox label="Pain" {...F("consciousness_pain")} checked={form.consciousness_pain} />
            <FCheckbox label="Unresponsive" {...F("consciousness_unresponsive")} checked={form.consciousness_unresponsive} />
          </div>
        </div>
        <FInput label="Allergies" {...F("allergies")} />
        <FInput label="Habits" {...F("habits")} />
        <FInput label="Family Doctor" {...F("family_doctor")} />
        <FInput label="Medical Advice" {...F("medical_advice")} />
        <FInput label="Extrication" {...F("extrication")} />
        <FInput label="Good Samaritan" {...F("good_samaritan")} />
        <FInput label="Service" {...F("service")} />
        <div style={{ gridColumn: "1 / -1" }}>
          <FInput label="Detailed Address" {...F("detail_address")} />
        </div>
      </div>
    </SectionCard>
  );

  // ────────────────────────────────────────────────────
  // SUBTAB: PAST ILLNESS
  // ────────────────────────────────────────────────────
  const renderPastIllness = () => {
    const items = [
      { key: "pi_dm", label: "DM (Diabetes Mellitus)" },
      { key: "pi_respiratory", label: "Respiratory" },
      { key: "pi_htn", label: "HTN (Hypertension)" },
      { key: "pi_epilepsy", label: "Epilepsy" },
      { key: "pi_hiv", label: "HIV" },
      { key: "pi_behavioural", label: "Behavioural" },
      { key: "pi_cad", label: "CAD (Coronary Artery Disease)" },
      { key: "pi_surgeries", label: "Surgeries" },
      { key: "pi_stroke", label: "Stroke" },
      { key: "pi_trauma", label: "Trauma" },
    ];
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {items.map(i => (
          <FCheckbox key={i.key} label={i.label} {...F(i.key)} checked={form[i.key]} />
        ))}
      </div>
    );
  };

  // ────────────────────────────────────────────────────
  // SUBTAB: HISTORY OF MEDICATION
  // ────────────────────────────────────────────────────
  const renderHistoryMedication = () => {
    const items = [
      { key: "hm_antibiotics", label: "Antibiotics" },
      { key: "hm_diuretics", label: "Diuretics" },
      { key: "hm_antidiabetics", label: "Antidiabetics" },
      { key: "hm_bronchodilators", label: "Bronchodilators" },
      { key: "hm_antihypertensives", label: "Antihypertensives" },
      { key: "hm_antidepressants", label: "Antidepressants" },
      { key: "hm_anticoagulants", label: "Anticoagulants" },
      { key: "hm_antianginals", label: "Antianginals" },
      { key: "hm_nsaids", label: "NSAIDs" },
      { key: "hm_anticancer", label: "Anticancer" },
    ];
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {items.map(i => (
          <FCheckbox key={i.key} label={i.label} {...F(i.key)} checked={form[i.key]} />
        ))}
      </div>
    );
  };

  // ────────────────────────────────────────────────────
  // SUBTAB: TYPE OF CASE
  // ────────────────────────────────────────────────────
  const renderTypeOfCase = () => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      <FSelect label="Type of Emergency" {...F("type_of_emergency")}
        options={[
          "Road Traffic Accident","Medical Emergency","Trauma","Burns",
          "Drowning","Poisoning","Snake Bite","Dog Bite",
          "Cardiac Emergency","Respiratory Emergency","Obstetric Emergency",
          "Paediatric Emergency","Other"
        ]} />
      <FSelect label="Cause" {...F("cause")}
        options={[
          "Vehicular","Fall","Assault","Self-inflicted","Industrial",
          "Sports","Burns","Blast","Electrocution","Drowning",
          "Hanging","Poisoning","Animal Bite","Unknown","Other"
        ]} />
      <FSelect label="Anatomical Area" {...F("anatomical_area")}
        options={[
          "Head","Face","Neck","Chest","Abdomen","Pelvis",
          "Spine","Upper Extremity","Lower Extremity","Multi-trauma","Other"
        ]} />
      <FSelect label="Mechanism of Injury" {...F("mechanism_of_injury")}
        options={[
          "Blunt","Penetrating","Thermal","Chemical","Electrical",
          "Radiation","Near Drowning","Asphyxia","Other"
        ]} />
      <FInput label="Presenting Symptom 1" {...F("presenting_symptom_1")} />
      <FInput label="Presenting Symptom 2" {...F("presenting_symptom_2")} />
      <div style={{ gridColumn: "1 / -1" }}>
        <FInput label="Presenting Symptom 3" {...F("presenting_symptom_3")} />
      </div>
    </div>
  );

  // ────────────────────────────────────────────────────
  // SUBTAB: VITAL SIGNS (3-timepoint table)
  // ────────────────────────────────────────────────────
  const renderVitalSigns = () => {
    const tps = ["scene", "travel", "hospital"];
    const tpLabels = ["At Scene", "During Travel", "At Hospital"];

    const selectRow = (label, key, options) => (
      <tr key={key}>
        <td style={cellStyle}>{label}</td>
        {tps.map(tp => (
          <td key={tp} style={cellStyle}>
            <select style={{ ...S.select, width: "90%" }}
              value={form[`vs_${key}_${tp}`] || ""}
              onChange={(e) => { setForm(p => ({ ...p, [`vs_${key}_${tp}`]: e.target.value })); setDirty(true); }}>
              <option value="">Select</option>
              {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </td>
        ))}
      </tr>
    );

    const inputRow = (label, key, placeholder) => (
      <tr key={key}>
        <td style={cellStyle}>{label}</td>
        {tps.map(tp => (
          <td key={tp} style={cellStyle}>
            <input style={{ ...S.input, width: "90%" }} placeholder={placeholder}
              value={form[`vs_${key}_${tp}`] || ""}
              onChange={(e) => { setForm(p => ({ ...p, [`vs_${key}_${tp}`]: e.target.value })); setDirty(true); }} />
          </td>
        ))}
      </tr>
    );

    const cellStyle = {
      padding: "6px 8px", fontSize: 11, color: "rgba(255,255,255,0.7)",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
    };
    const headerStyle = {
      ...cellStyle, fontWeight: 700, color: S.accent, fontSize: 10,
      textTransform: "uppercase", letterSpacing: "0.05em",
    };

    return (
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={headerStyle}>Parameter</th>
              {tpLabels.map(l => <th key={l} style={headerStyle}>{l}</th>)}
            </tr>
          </thead>
          <tbody>
            {inputRow("Pulse Rate", "pulse_rate", "/min")}
            {selectRow("Pulse Rhythm", "pulse_rhythm", ["Regular","Irregular"])}
            {selectRow("Volume", "pulse_volume", ["Normal","Thready"])}
            {inputRow("B.P", "bp", "mm Hg")}
            {inputRow("Respiration", "respiration", "Rate/min")}
            {selectRow("Right Air Entry", "right_air_entry", ["Yes","No"])}
            {selectRow("Left Air Entry", "left_air_entry", ["Yes","No"])}
            {selectRow("Adventitious Sounds", "adventitious", ["Creps","Rhonchi"])}
            {inputRow("SpO2", "spo2", "%")}
            {selectRow("Pupils Right Size", "pupils_right_size", ["Normal","Constricted","Dilated"])}
            {selectRow("Reaction to Light (R)", "pupils_right_reaction", ["Brisk","Sluggish","Non Reaching"])}
            {selectRow("Pupils Left Size", "pupils_left_size", ["Normal","Constricted","Dilated"])}
            {selectRow("Reaction to Light (L)", "pupils_left_reaction", ["Brisk","Sluggish","Non Reaching"])}

            {/* GCS row with E/V/M sub-inputs */}
            <tr>
              <td style={cellStyle}>Glasgow Coma Scale</td>
              {tps.map(tp => (
                <td key={tp} style={cellStyle}>
                  <div style={{ display: "flex", gap: 3 }}>
                    <input style={{ ...S.input, width: "30%" }} placeholder="E"
                      value={form[`vs_gcs_e_${tp}`] || ""}
                      onChange={(e) => { setForm(p => ({ ...p, [`vs_gcs_e_${tp}`]: e.target.value })); setDirty(true); }} />
                    <input style={{ ...S.input, width: "30%" }} placeholder="V"
                      value={form[`vs_gcs_v_${tp}`] || ""}
                      onChange={(e) => { setForm(p => ({ ...p, [`vs_gcs_v_${tp}`]: e.target.value })); setDirty(true); }} />
                    <input style={{ ...S.input, width: "30%" }} placeholder="M"
                      value={form[`vs_gcs_m_${tp}`] || ""}
                      onChange={(e) => { setForm(p => ({ ...p, [`vs_gcs_m_${tp}`]: e.target.value })); setDirty(true); }} />
                  </div>
                  <div style={{ fontSize: 9, color: S.accent, marginTop: 2, textAlign: "center" }}>
                    GCS = {gcsSum(tp)}
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  // ────────────────────────────────────────────────────
  // SUBTAB: PREGNANCY DETAILS (with APGAR auto-calc)
  // ────────────────────────────────────────────────────
  const renderPregnancyDetails = () => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      <FSelect label="Pregnancy" {...F("pregnancy")} options={["Yes","No"]} />
      <FInput label="LMP / DD" {...F("lmpdd")} />
      <FInput label="Gravida (G)" {...F("gravida")} />
      <FInput label="Para (P)" {...F("para")} />
      <FInput label="Living (L)" {...F("living")} />
      <FInput label="Dead (D)" {...F("dead")} />
      <FInput label="Abortions (A)" {...F("abortions")} />
      <FSelect label="Abnormal Bleeding" {...F("abnormal_bleeding")} options={["Yes","No"]} />

      {/* APGAR Score */}
      <div style={{ gridColumn: "1 / -1", marginTop: 8 }}>
        <div style={{ ...S.sectionTitle, color: "#ec4899", marginBottom: 8 }}>APGAR Score</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr) auto", gap: 6, alignItems: "end" }}>
          <FInput label="A (Appearance)" {...F("apgar_a")} placeholder="0-2" />
          <FInput label="P (Pulse)" {...F("apgar_p")} placeholder="0-2" />
          <FInput label="G (Grimace)" {...F("apgar_g")} placeholder="0-2" />
          <FInput label="A (Activity)" {...F("apgar_aa")} placeholder="0-2" />
          <FInput label="R (Respiration)" {...F("apgar_r")} placeholder="0-2" />
          <div style={{
            padding: "7px 14px", borderRadius: 8,
            background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.3)",
            textAlign: "center", minWidth: 60,
          }}>
            <div style={{ fontSize: 9, color: S.label }}>TOTAL</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: S.accent }}>{apgarSum}</div>
          </div>
        </div>
      </div>

      <FTime label="Time of Birth" {...F("time_of_birth")} />
      <FSelect label="Baby Sex" {...F("baby_sex")} options={["Male","Female"]} />
      <FInput label="Aid En-Route" {...F("aid_en_route")} />
      <FInput label="Hospital Name" {...F("delivery_hospital_name")} />
      <FInput label="Hospital Phone" {...F("delivery_hospital_phone")} />
    </div>
  );

  // ────────────────────────────────────────────────────
  // SUBTAB: PRE HOSPITAL CARE (16 checkboxes)
  // ────────────────────────────────────────────────────
  const renderPreHospitalCare = () => {
    const items = [
      { key: "phc_aed", label: "AED" },
      { key: "phc_opa_npa", label: "OPA / NPA" },
      { key: "phc_bag_mask", label: "Bag Mask" },
      { key: "phc_ryles_tube", label: "Ryles Tube" },
      { key: "phc_c_collar", label: "C Collar" },
      { key: "phc_splinting", label: "Splinting" },
      { key: "phc_cpr", label: "CPR" },
      { key: "phc_suction", label: "Suction" },
      { key: "phc_ecg", label: "ECG" },
      { key: "phc_telemetry", label: "Telemetry" },
      { key: "phc_eti", label: "ETI" },
      { key: "phc_ventilator", label: "Ventilator" },
      { key: "phc_iv_fluids", label: "IV Fluids" },
      { key: "phc_wound_care", label: "Wound Care" },
      { key: "phc_oxygen", label: "Oxygen" },
      { key: "phc_own_medication", label: "Own Medication" },
    ];
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
        {items.map(i => (
          <FCheckbox key={i.key} label={i.label} {...F(i.key)} checked={form[i.key]} />
        ))}
      </div>
    );
  };

  // ────────────────────────────────────────────────────
  // SUBTAB: EVENTS DURING TRANSPORT
  // ────────────────────────────────────────────────────
  const renderEventsDuringTransport = () => (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      {["Improved","Status Quo","Worsened","Death"].map(opt => (
        <FRadio key={opt} label={opt} name="edt_status" value={opt.toLowerCase().replace(" ", "_")}
          selected={form.edt_status} onChange={F("edt_status").onChange} />
      ))}
    </div>
  );

  // ────────────────────────────────────────────────────
  // SUBTAB: PHYSICIAN NAME & ADVICE
  // ────────────────────────────────────────────────────
  const renderNameAdvice = () => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
      <FInput label="Dr. Name" {...F("dr_name")} />
      <FInput label="No. of Times" {...F("no_of_times")} />
      <FInput label="Medicines Used" {...F("medicines_used")} />
    </div>
  );

  // ────────────────────────────────────────────────────
  // SUBTAB ROUTER
  // ────────────────────────────────────────────────────
  const subtabContent = {
    pastIllness: renderPastIllness,
    historyMedication: renderHistoryMedication,
    typeOfCase: renderTypeOfCase,
    vitalSigns: renderVitalSigns,
    pregnancyDetails: renderPregnancyDetails,
    preHospitalCare: renderPreHospitalCare,
    eventsDuringTransport: renderEventsDuringTransport,
    nameAdvice: renderNameAdvice,
  };

  // ────────────────────────────────────────────────────
  // RENDER: OPERATIONAL DECISIONS (container4)
  // ────────────────────────────────────────────────────
  const renderOperationalDecisions = () => (
    <SectionCard title="Operational Decisions" accent="#ef4444">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <FInput label="Delay in Reaching Patient" {...F("delay_reaching_patient")} />
        <FInput label="Destination Determination" {...F("destination_determination")} />
        <FInput label="Reason For Not Serving Patient" {...F("reason_not_serving")} />
        <FInput label="Reason if Not Proceeded Code" {...F("reason_not_proceeded_code")} />
        <FInput label="Traffic Condition Code" {...F("traffic_condition_code")} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 10 }}>
        <FCheckbox label="Transport Decline Form Signed" {...F("transport_decline_form_signed")} checked={form.transport_decline_form_signed} />
        <FCheckbox label="Refusal Against Medical Service" {...F("refusal_against_medical")} checked={form.refusal_against_medical} />
        <FCheckbox label="Self Determination" {...F("self_determination")} checked={form.self_determination} />
        <FCheckbox label="Refusal Against Transportation" {...F("refusal_against_transport")} checked={form.refusal_against_transport} />
        <FCheckbox label="Restraints Used" {...F("restraints_used")} checked={form.restraints_used} />
        <FCheckbox label="Destination Diversion" {...F("destination_diversion")} checked={form.destination_diversion} />
        <FCheckbox label="Medical Decline Form Signed" {...F("medical_decline_form_signed")} checked={form.medical_decline_form_signed} />
        <FCheckbox label="Treated And Discharged" {...F("treated_and_discharged")} checked={form.treated_and_discharged} />
        <FCheckbox label="Other Medical Authorities At Scene" {...F("other_medical_authorities")} checked={form.other_medical_authorities} />
        <FCheckbox label="Do Not Resuscitate" {...F("do_not_resuscitate")} checked={form.do_not_resuscitate} />
      </div>
    </SectionCard>
  );

  // ────────────────────────────────────────────────────
  // RENDER: EQUIPMENT HANDOVER + HOSPITAL SIGN-OFF
  // ────────────────────────────────────────────────────
  const renderHandoverSignoff = () => (
    <>
      <SectionCard title="Equipment Handover" accent="#06b6d4">
        <div style={{ fontSize: 10, color: S.label, marginBottom: 8 }}>
          Handed over Medical & disposable attached to patient. Medico legally significant material, equipment and others:
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[1,2,3,4,5,6].map(n => (
            <FInput key={n} label={`Item ${n}`} {...F(`equipment_${n}`)} placeholder={`${n}.`} />
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
          <FInput label="Received By (Name & Signature)" {...F("receiver_name_sign")} />
          <FInput label="Contact No" {...F("receiver_contact")} />
        </div>
      </SectionCard>

      <SectionCard title="EMT Sign-off" accent="#f59e0b">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <FInput label="EMT ID No" {...F("emt_id_no")} />
          <FInput label="Name" {...F("emt_name")} />
          <FInput label="Signed By" {...F("emt_signed_by")} />
        </div>
      </SectionCard>

      <SectionCard title="Destination Hospital" accent="#3b82f6">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <FInput label="Hospital Name" {...F("dest_hospital_name")} />
          <FInput label="Telephone" {...F("dest_hospital_phone")} />
          <FTime label="Arrival Time at Hospital" {...F("arrival_time_hospital")} />
        </div>
        <div style={{ marginTop: 8 }}>
          <FInput label="Comments of the Receiving Hospital" {...F("comments_receiving_hospital")} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 8 }}>
          <FInput label="Signed By" {...F("hospital_signed_by")} />
          <FInput label="Hospital Seal" {...F("hospital_seal")} />
          <FInput label="Designation" {...F("designation")} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
          <FInput label="Date / Time" type="datetime-local" {...F("date_time")} />
          <FInput label="Patient / Attendant LTI / Signature" {...F("patient_attendant_sign")} />
        </div>
      </SectionCard>
    </>
  );

  // ────────────────────────────────────────────────────
  // RENDER: EMT SUMMARY MODAL
  // ────────────────────────────────────────────────────
  const renderEmtSummaryModal = () => {
    if (!showEmtSummaryModal) return null;
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
      }} onClick={() => setShowEmtSummaryModal(false)}>
        <div style={{
          width: 600, maxHeight: "80vh", overflow: "auto",
          background: "#0a0a0f", borderRadius: 16, padding: 24,
          border: "1px solid rgba(255,255,255,0.1)",
        }} onClick={e => e.stopPropagation()}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: S.accent }}>EMT Summary</span>
            <button onClick={() => setShowEmtSummaryModal(false)} style={{
              background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer",
            }}><X size={16} /></button>
          </div>
          <textarea
            value={form.emt_summary_notes}
            onChange={(e) => { setForm(p => ({ ...p, emt_summary_notes: e.target.value })); setDirty(true); }}
            placeholder="Enter EMT summary notes..."
            style={{
              ...S.input, width: "100%", minHeight: 200, resize: "vertical",
              fontFamily: "'SF Mono', monospace", lineHeight: 1.6,
            }}
          />
          <button onClick={() => setShowEmtSummaryModal(false)} style={{
            marginTop: 12, padding: "8px 20px", borderRadius: 8,
            background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.3)",
            color: S.accent, fontSize: 11, fontWeight: 700, cursor: "pointer",
          }}>DONE</button>
        </div>
      </div>
    );
  };

  // ────────────────────────────────────────────────────
  // PAGE: PATIENT TRANSFER
  // ────────────────────────────────────────────────────
  const renderPatientTransferPage = () => (
    <div>
      <SectionCard title="Patient Transfer Record" accent="#06b6d4">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <FInput label="From Hospital" {...F("pt_from_hospital")} />
          <FInput label="To Hospital" {...F("pt_to_hospital")} />
          <FInput label="Patient Name" {...F("pt_patient_name")} />
          <FInput label="Diagnosis" {...F("pt_diagnosis")} />
          <FInput label="Referring Doctor" {...F("pt_referring_doctor")} />
          <FInput label="Transfer Reason" {...F("pt_transfer_reason")} />
          <FInput label="Condition at Transfer" {...F("pt_condition_at_transfer")} />
          <FInput label="Vitals at Transfer" {...F("pt_vitals_at_transfer")} />
          <FInput label="IV Lines" {...F("pt_iv_lines")} />
          <FInput label="Medication in Transit" {...F("pt_medication_in_transit")} />
          <div style={{ gridColumn: "1 / -1" }}>
            <FInput label="Special Instructions" {...F("pt_special_instructions")} />
          </div>
        </div>
      </SectionCard>
    </div>
  );

  // ────────────────────────────────────────────────────
  // PAGE: FUEL MILEAGE RECORD
  // ────────────────────────────────────────────────────
  const renderFuelMileagePage = () => (
    <div>
      <SectionCard title="Fuel Mileage Record" accent="#22c55e">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <FInput label="Vehicle No" {...F("fm_vehicle_no")} />
          <FInput label="Date" type="date" {...F("fm_date")} />
          <FInput label="Start KM" {...F("fm_start_km")} />
          <FInput label="End KM" {...F("fm_end_km")} />
          <FInput label="Total KM" {...F("fm_total_km")} />
          <FInput label="Fuel Filled (Litres)" {...F("fm_fuel_filled")} />
          <FInput label="Fuel Cost" {...F("fm_fuel_cost")} />
          <FInput label="Fuel Station" {...F("fm_fuel_station")} />
          <div style={{ gridColumn: "1 / -1" }}>
            <FInput label="Driver Signature" {...F("fm_driver_sign")} />
          </div>
        </div>
      </SectionCard>
    </div>
  );

  // ────────────────────────────────────────────────────
  // PAGE: PETTY CASH RECORD
  // ────────────────────────────────────────────────────
  const renderPettyCashPage = () => (
    <div>
      <SectionCard title="Petty Cash Usage Record" accent="#f59e0b">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <FInput label="Date" type="date" {...F("pc_date")} />
          <FInput label="Amount Received" {...F("pc_amount_received")} />
          <FInput label="Purpose" {...F("pc_purpose")} />
          <FInput label="Amount Spent" {...F("pc_amount_spent")} />
          <FInput label="Balance" {...F("pc_balance")} />
          <FInput label="Receipt No" {...F("pc_receipt_no")} />
          <FInput label="Approved By" {...F("pc_approved_by")} />
          <FInput label="Remarks" {...F("pc_remarks")} />
        </div>
      </SectionCard>
    </div>
  );

  // ────────────────────────────────────────────────────
  // PAGE: EMT HANDING & TAKE OVER
  // ────────────────────────────────────────────────────
  const renderEmtHandingPage = () => (
    <div>
      <SectionCard title="EMT Handing & Take Over" accent="#8b5cf6">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <FInput label="Date" type="date" {...F("eh_date")} />
          <FTime label="Time" {...F("eh_time")} />
          <FInput label="Outgoing EMT" {...F("eh_outgoing_emt")} />
          <FInput label="Incoming EMT" {...F("eh_incoming_emt")} />
          <FInput label="Vehicle Condition" {...F("eh_vehicle_condition")} />
          <FInput label="Equipment Status" {...F("eh_equipment_status")} />
          <FInput label="Stock Status" {...F("eh_stock_status")} />
          <FInput label="Pending Issues" {...F("eh_pending_issues")} />
          <FInput label="Outgoing EMT Signature" {...F("eh_outgoing_sign")} />
          <FInput label="Incoming EMT Signature" {...F("eh_incoming_sign")} />
        </div>
      </SectionCard>
    </div>
  );

  // ────────────────────────────────────────────────────
  // PAGE ROUTER
  // ────────────────────────────────────────────────────
  const pageRenderers = {
    patientTransfer: renderPatientTransferPage,
    fuelMileage: renderFuelMileagePage,
    pettyCash: renderPettyCashPage,
    emtHanding: renderEmtHandingPage,
  };

  // ════════════════════════════════════════════════════
  // MAIN RENDER
  // ════════════════════════════════════════════════════
  return (
    <div>
      {renderEmtSummaryModal()}
      {renderHeaderNav()}

      {page === "main" ? (
        <>
          {/* TIMELINE */}
          {renderTimeline()}

          {/* 3-COLUMN LAYOUT: Basic | Patient | Other */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {renderBasicDetails()}
            {renderPatientDetails()}
            {renderOtherDetails()}
          </div>

          {/* 8-SUBTAB NAVIGATION BAR */}
          <div style={{
            display: "flex", gap: 4, marginBottom: 12, marginTop: 4,
            overflowX: "auto", paddingBottom: 2,
          }}>
            {SUBTABS.map(st => {
              const active = subtab === st.id;
              return (
                <button key={st.id} onClick={() => setSubtab(st.id)} style={{
                  padding: "6px 12px", borderRadius: 8, fontSize: 10, fontWeight: 700,
                  background: active ? "rgba(249,115,22,0.15)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${active ? "rgba(249,115,22,0.4)" : "rgba(255,255,255,0.06)"}`,
                  color: active ? "#f97316" : "rgba(255,255,255,0.45)",
                  cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s",
                }}>
                  {st.label}
                </button>
              );
            })}
          </div>

          {/* SUBTAB CONTENT */}
          <SectionCard title={SUBTABS.find(s => s.id === subtab)?.label} accent="#f97316">
            {subtabContent[subtab]?.()}
          </SectionCard>

          {/* OPERATIONAL DECISIONS */}
          {renderOperationalDecisions()}

          {/* EQUIPMENT HANDOVER + HOSPITAL SIGN-OFF */}
          {renderHandoverSignoff()}
        </>
      ) : (
        /* SUB-PAGES */
        pageRenderers[page]?.()
      )}
    </div>
  );
}
