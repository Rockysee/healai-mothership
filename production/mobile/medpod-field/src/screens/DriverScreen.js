import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  RefreshControl,
} from "react-native";
import { fetchDispatchTrips, updateTripStatus } from "../api";

const STATUS_FLOW = {
  dispatched: "en_route",
  en_route: "on_scene",
  on_scene: "transporting",
  transporting: "at_hospital",
  at_hospital: "completed",
};

const STATUS_LABEL = {
  pending: "Pending",
  dispatched: "Dispatched",
  en_route: "En Route",
  on_scene: "On Scene",
  transporting: "Transporting",
  at_hospital: "At Hospital",
  completed: "Completed",
};

export default function DriverScreen() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const activeTrips = useMemo(
    () => trips.filter((t) => ["dispatched", "en_route", "on_scene", "transporting", "at_hospital"].includes(t.status)),
    [trips]
  );

  const trip = activeTrips[0] || null;

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchDispatchTrips();
    setTrips(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onAdvance = async () => {
    if (!trip) return;
    const next = STATUS_FLOW[trip.status];
    if (!next) return;
    setSaving(true);
    await updateTripStatus(trip.id, next);
    await load();
    setSaving(false);
  };

  const openMaps = async (address) => {
    if (!address) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    await Linking.openURL(url);
  };

  const callPhone = async (phone) => {
    if (!phone) return;
    await Linking.openURL(`tel:${phone}`);
  };

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      <Text style={styles.title}>Driver Console</Text>
      <Text style={styles.subtitle}>Android + iPhone field app</Text>

      {!trip && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>No active trip</Text>
          <Text style={styles.cardMeta}>Waiting for dispatch assignment.</Text>
        </View>
      )}

      {trip && (
        <>
          <View style={styles.card}>
            <Text style={styles.priority}>P{trip.priority || 2}</Text>
            <Text style={styles.patient}>{trip.patient_name || "Patient"}</Text>
            <Text style={styles.cardMeta}>
              {STATUS_LABEL[trip.status] || trip.status} | Trip #{trip.trip_no || trip.id}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Pickup</Text>
            <Text style={styles.address}>{trip.pickup_address || trip.incident_address || "-"}</Text>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => openMaps(trip.pickup_address || trip.incident_address)}>
              <Text style={styles.secondaryButtonText}>Open Maps</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Destination</Text>
            <Text style={styles.address}>{trip.destination_name || trip.hospital_name || "Hospital"}</Text>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => openMaps(trip.destination_name || trip.hospital_name)}>
              <Text style={styles.secondaryButtonText}>Navigate</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.mainButton} onPress={onAdvance} disabled={saving}>
            <Text style={styles.mainButtonText}>{saving ? "Updating..." : "Advance Status"}</Text>
          </TouchableOpacity>

          <View style={styles.quickRow}>
            <TouchableOpacity style={styles.quickButton} onPress={() => callPhone(trip.dispatch_phone || trip.dispatch_contact)}>
              <Text style={styles.quickText}>Dispatch</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickButton} onPress={() => callPhone(trip.hospital_phone || trip.dest_hospital_phone)}>
              <Text style={styles.quickText}>Hospital</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickButton} onPress={() => callPhone("112") }>
              <Text style={styles.quickText}>112</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#050914",
  },
  container: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  title: {
    color: "#f8fafc",
    fontSize: 24,
    fontWeight: "800",
  },
  subtitle: {
    color: "#94a3b8",
    marginBottom: 4,
  },
  card: {
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  cardTitle: {
    color: "#e2e8f0",
    fontSize: 18,
    fontWeight: "700",
  },
  cardMeta: {
    color: "#94a3b8",
    fontSize: 13,
  },
  priority: {
    color: "#f59e0b",
    fontWeight: "700",
    fontSize: 12,
  },
  patient: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "800",
  },
  sectionTitle: {
    color: "#22c55e",
    fontWeight: "700",
    fontSize: 13,
  },
  address: {
    color: "#e2e8f0",
    fontSize: 14,
    lineHeight: 20,
  },
  mainButton: {
    backgroundColor: "#22c55e",
    borderRadius: 16,
    minHeight: 68,
    justifyContent: "center",
    alignItems: "center",
  },
  mainButtonText: {
    color: "#052e16",
    fontSize: 22,
    fontWeight: "900",
  },
  secondaryButton: {
    alignSelf: "flex-start",
    backgroundColor: "#1d4ed8",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  secondaryButtonText: {
    color: "#eff6ff",
    fontWeight: "700",
  },
  quickRow: {
    flexDirection: "row",
    gap: 8,
  },
  quickButton: {
    flex: 1,
    minHeight: 56,
    borderRadius: 12,
    backgroundColor: "#1e293b",
    justifyContent: "center",
    alignItems: "center",
  },
  quickText: {
    color: "#e2e8f0",
    fontWeight: "700",
  },
});
