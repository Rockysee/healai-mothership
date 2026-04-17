import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  RefreshControl,
} from "react-native";
import {
  fetchDispatchTrips,
  fetchHospitals,
  createPcr,
  updatePcrSection,
} from "../api";

const ACTIVE_STATUSES = ["dispatched", "en_route", "on_scene", "transporting"];

const QUICK_ACTIONS = [
  { key: "phc_cpr", label: "CPR" },
  { key: "phc_aed", label: "AED" },
  { key: "phc_eti", label: "AIRWAY" },
  { key: "phc_iv_fluids", label: "IV" },
  { key: "phc_oxygen", label: "O2" },
  { key: "phc_ecg", label: "ECG" },
];

export default function ParamedicScreen() {
  const [trips, setTrips] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedTripId, setSelectedTripId] = useState(null);
  const [pcrId, setPcrId] = useState(null);

  const [actions, setActions] = useState({});
  const [vitals, setVitals] = useState({ hr: "", bp: "", spo2: "", rr: "", gcs: "" });
  const [med, setMed] = useState({ name: "", dose: "", route: "IV" });
  const [note, setNote] = useState("");

  const activeTrips = useMemo(
    () => trips.filter((t) => ACTIVE_STATUSES.includes(t.status)),
    [trips]
  );
  const trip = activeTrips.find((t) => String(t.id) === String(selectedTripId)) || null;

  const load = useCallback(async () => {
    setLoading(true);
    const [tripRows, hospitalRows] = await Promise.all([fetchDispatchTrips(), fetchHospitals()]);
    setTrips(tripRows || []);
    setHospitals(hospitalRows || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createTripPcr = async () => {
    if (!trip) return;
    setSaving(true);
    const result = await createPcr(trip.id);
    if (result?.id) setPcrId(result.id);
    setSaving(false);
  };

  const toggleAction = (key) => {
    setActions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const saveVitals = async () => {
    if (!pcrId) return;
    setSaving(true);
    await updatePcrSection(pcrId, "vital_signs", {
      vs_pulse_rate_scene: vitals.hr,
      vs_bp_scene: vitals.bp,
      vs_spo2_scene: vitals.spo2,
      vs_respiration_scene: vitals.rr,
      vs_gcs_total_scene: vitals.gcs,
    });
    setSaving(false);
  };

  const saveActions = async () => {
    if (!pcrId) return;
    setSaving(true);
    await updatePcrSection(pcrId, "pre_hospital_care", actions);
    setSaving(false);
  };

  const saveMedication = async () => {
    if (!pcrId || !med.name) return;
    setSaving(true);
    await updatePcrSection(pcrId, "medications", {
      logs: [
        {
          drug: med.name,
          dose: med.dose,
          route: med.route,
          at: new Date().toISOString(),
        },
      ],
    });
    setSaving(false);
  };

  const savePrenotify = async () => {
    if (!pcrId) return;
    setSaving(true);
    await updatePcrSection(pcrId, "destinations", {
      comments_receiving_hospital: note,
      dest_hospital_name: hospitals[0]?.name || hospitals[0]?.hospital_name || "Hospital",
    });
    setSaving(false);
  };

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      <Text style={styles.title}>Paramedic Console</Text>
      <Text style={styles.subtitle}>Touch-first emergency controls</Text>

      <View style={styles.card}>
        <Text style={styles.section}>Active Trips</Text>
        {activeTrips.length === 0 && <Text style={styles.meta}>No active trips.</Text>}
        {activeTrips.map((t) => {
          const selected = String(t.id) === String(selectedTripId);
          return (
            <TouchableOpacity
              key={t.id}
              style={[styles.tripButton, selected && styles.tripButtonActive]}
              onPress={() => {
                setSelectedTripId(t.id);
                setPcrId(null);
              }}
            >
              <Text style={styles.tripText}>{t.patient_name || "Patient"} | #{t.trip_no || t.id}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {trip && !pcrId && (
        <TouchableOpacity style={styles.mainButton} onPress={createTripPcr}>
          <Text style={styles.mainButtonText}>{saving ? "Creating..." : "Create PCR"}</Text>
        </TouchableOpacity>
      )}

      {trip && pcrId && (
        <>
          <View style={styles.card}>
            <Text style={styles.section}>Quick Actions</Text>
            <View style={styles.grid}>
              {QUICK_ACTIONS.map((a) => (
                <TouchableOpacity
                  key={a.key}
                  style={[styles.action, actions[a.key] && styles.actionActive]}
                  onPress={() => toggleAction(a.key)}
                >
                  <Text style={[styles.actionText, actions[a.key] && styles.actionTextActive]}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.secondary} onPress={saveActions}>
              <Text style={styles.secondaryText}>{saving ? "Saving..." : "Save Actions"}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.section}>Vitals</Text>
            <View style={styles.vitalsRow}>
              <TextInput value={vitals.hr} onChangeText={(v) => setVitals((p) => ({ ...p, hr: v }))} placeholder="HR" placeholderTextColor="#64748b" style={styles.input} />
              <TextInput value={vitals.bp} onChangeText={(v) => setVitals((p) => ({ ...p, bp: v }))} placeholder="BP" placeholderTextColor="#64748b" style={styles.input} />
              <TextInput value={vitals.spo2} onChangeText={(v) => setVitals((p) => ({ ...p, spo2: v }))} placeholder="SpO2" placeholderTextColor="#64748b" style={styles.input} />
            </View>
            <View style={styles.vitalsRow}>
              <TextInput value={vitals.rr} onChangeText={(v) => setVitals((p) => ({ ...p, rr: v }))} placeholder="RR" placeholderTextColor="#64748b" style={styles.input} />
              <TextInput value={vitals.gcs} onChangeText={(v) => setVitals((p) => ({ ...p, gcs: v }))} placeholder="GCS" placeholderTextColor="#64748b" style={styles.input} />
            </View>
            <TouchableOpacity style={styles.secondary} onPress={saveVitals}>
              <Text style={styles.secondaryText}>{saving ? "Saving..." : "Save Vitals"}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.section}>Medication</Text>
            <TextInput value={med.name} onChangeText={(v) => setMed((p) => ({ ...p, name: v }))} placeholder="Drug name" placeholderTextColor="#64748b" style={styles.inputFull} />
            <View style={styles.vitalsRow}>
              <TextInput value={med.dose} onChangeText={(v) => setMed((p) => ({ ...p, dose: v }))} placeholder="Dose" placeholderTextColor="#64748b" style={styles.input} />
              <TextInput value={med.route} onChangeText={(v) => setMed((p) => ({ ...p, route: v }))} placeholder="Route" placeholderTextColor="#64748b" style={styles.input} />
            </View>
            <TouchableOpacity style={styles.secondary} onPress={saveMedication}>
              <Text style={styles.secondaryText}>{saving ? "Saving..." : "Save Medication"}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.section}>Hospital Prenotify</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Condition summary for hospital"
              placeholderTextColor="#64748b"
              style={styles.textarea}
              multiline
            />
            <TouchableOpacity style={styles.secondary} onPress={savePrenotify}>
              <Text style={styles.secondaryText}>{saving ? "Sending..." : "Send Prenotify"}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#050914" },
  container: { padding: 16, gap: 12, paddingBottom: 40 },
  title: { color: "#f8fafc", fontSize: 24, fontWeight: "800" },
  subtitle: { color: "#94a3b8" },
  card: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  section: { color: "#22c55e", fontWeight: "700", fontSize: 14 },
  meta: { color: "#94a3b8" },
  tripButton: {
    backgroundColor: "#111827",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1f2937",
    padding: 10,
  },
  tripButtonActive: { borderColor: "#22c55e", backgroundColor: "#052e16" },
  tripText: { color: "#e2e8f0", fontWeight: "600" },
  mainButton: {
    minHeight: 64,
    borderRadius: 14,
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
  },
  mainButtonText: { color: "#fff", fontSize: 20, fontWeight: "900" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  action: {
    minWidth: "31%",
    flexGrow: 1,
    minHeight: 56,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#334155",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0b1220",
  },
  actionActive: { borderColor: "#f97316", backgroundColor: "#7c2d12" },
  actionText: { color: "#cbd5e1", fontWeight: "700" },
  actionTextActive: { color: "#fed7aa" },
  secondary: {
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: "#1d4ed8",
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryText: { color: "#eff6ff", fontWeight: "700" },
  vitalsRow: { flexDirection: "row", gap: 8 },
  input: {
    flex: 1,
    backgroundColor: "#0b1220",
    color: "#f8fafc",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#334155",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputFull: {
    backgroundColor: "#0b1220",
    color: "#f8fafc",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#334155",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textarea: {
    backgroundColor: "#0b1220",
    color: "#f8fafc",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#334155",
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 100,
    textAlignVertical: "top",
  },
});
