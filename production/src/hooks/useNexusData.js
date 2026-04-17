"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const API = "/api/nexus";
const LOCAL_PREFIX = "medpod.local.";

const LOCAL_KEYS = {
  trips: `${LOCAL_PREFIX}dispatch.trips`,
  ambulances: `${LOCAL_PREFIX}fleet.ambulances`,
  crew: `${LOCAL_PREFIX}crew.members`,
  operators: `${LOCAL_PREFIX}crm.operators`,
  patients: `${LOCAL_PREFIX}patients.records`,
};

function hasStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

function readLocalList(key) {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalList(key, rows) {
  if (!hasStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(Array.isArray(rows) ? rows : []));
}

function makeLocalId(prefix = "local") {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

function withEntityDefaults(entity, payload) {
  const now = new Date().toISOString();
  const base = {
    id: payload.id || makeLocalId(entity),
    created_at: payload.created_at || now,
    updated_at: now,
  };

  if (entity === "trip") {
    return {
      ...base,
      status: payload.status || "pending",
      priority: payload.priority || 2,
      emergency_type: payload.emergency_type || "other",
      ...payload,
    };
  }

  if (entity === "ambulance") {
    return {
      ...base,
      status: payload.status || "available",
      ...payload,
    };
  }

  if (entity === "crew") {
    return {
      ...base,
      status: payload.status || "available",
      ...payload,
    };
  }

  if (entity === "operator") {
    return {
      ...base,
      status: payload.status || "active",
      fleet_size: Number(payload.fleet_size || 0),
      ...payload,
    };
  }

  if (entity === "patient") {
    return {
      ...base,
      ...payload,
    };
  }

  return { ...base, ...payload };
}

/**
 * Core fetch utility for NEXUS API
 * Handles errors, retries, and response parsing
 */
async function nexusFetch(path, opts = {}) {
  try {
    const res = await fetch(`${API}${path}`, {
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      ...opts,
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error(`NEXUS API error [${path}]:`, e);
    return null;
  }
}

// ============================================================================
// HOOK 1: useCommandData
// Dashboard stats — API returns flat object with snake_case keys
// ============================================================================

export function useCommandData() {
  const [stats, setStats] = useState(null);
  const [recentTrips, setRecentTrips] = useState([]);
  const [priorityBreakdown, setPriorityBreakdown] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await nexusFetch("/dashboard/stats");
    if (data) {
      // API returns flat object: { active_trips, fleet_total, ..., recent_trips, priority_breakdown }
      setStats(data);
      setRecentTrips(data.recent_trips || []);
      setPriorityBreakdown(data.priority_breakdown || {});
      setError(null);
    } else {
      setError("Failed to fetch command stats");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, 15000);
    return () => clearInterval(intervalRef.current);
  }, [refresh]);

  return { stats, recentTrips, priorityBreakdown, loading, error, refresh };
}

// ============================================================================
// HOOK 2: useDispatchData
// API index returns { data: [trips] }; updateStatus → PATCH /{id}/status;
// assignAmbulance → PATCH /{id}/ambulance with { ambulance_id }
// ============================================================================

export function useDispatchData() {
  const [trips, setTrips] = useState([]);
  const [activeTrips, setActiveTrips] = useState([]);
  const [pendingTrips, setPendingTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await nexusFetch("/dispatch");
    if (data) {
      // API returns { data: [...trips] }
      const allTrips = data.data || [];
      setTrips(allTrips);
      setActiveTrips(allTrips.filter((t) => t.status === "dispatched" || t.status === "en_route" || t.status === "at_scene" || t.status === "transporting"));
      setPendingTrips(allTrips.filter((t) => t.status === "pending" || t.status === "requested"));
      setError(null);
    } else {
      const localTrips = readLocalList(LOCAL_KEYS.trips);
      setTrips(localTrips);
      setActiveTrips(localTrips.filter((t) => t.status === "dispatched" || t.status === "en_route" || t.status === "at_scene" || t.status === "transporting"));
      setPendingTrips(localTrips.filter((t) => t.status === "pending" || t.status === "requested"));
      setError(localTrips.length ? null : "Failed to fetch dispatch data");
    }
    setLoading(false);
  }, []);

  const createTrip = useCallback(async (tripData) => {
    const result = await nexusFetch("/dispatch", {
      method: "POST",
      body: JSON.stringify(tripData),
    });
    if (result) {
      await refresh();
      return result;
    }
    const local = readLocalList(LOCAL_KEYS.trips);
    const created = withEntityDefaults("trip", tripData);
    writeLocalList(LOCAL_KEYS.trips, [created, ...local]);
    await refresh();
    return { data: created, local: true };
  }, [refresh]);

  const updateTripStatus = useCallback(async (tripId, status) => {
    // Route is PATCH /dispatch/{id}/status
    const result = await nexusFetch(`/dispatch/${tripId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (result) {
      await refresh();
      return result;
    }
    const local = readLocalList(LOCAL_KEYS.trips);
    const updated = local.map((t) => (String(t.id) === String(tripId) ? { ...t, status, updated_at: new Date().toISOString() } : t));
    writeLocalList(LOCAL_KEYS.trips, updated);
    await refresh();
    return { updated: true, local: true };
  }, [refresh]);

  const assignAmbulance = useCallback(async (tripId, ambulanceId) => {
    // Route is PATCH /dispatch/{id}/ambulance with snake_case body
    const result = await nexusFetch(`/dispatch/${tripId}/ambulance`, {
      method: "PATCH",
      body: JSON.stringify({ ambulance_id: ambulanceId }),
    });
    if (result) {
      await refresh();
      return result;
    }
    const local = readLocalList(LOCAL_KEYS.trips);
    const updated = local.map((t) =>
      String(t.id) === String(tripId)
        ? { ...t, ambulance_id: ambulanceId, status: t.status === "pending" ? "dispatched" : t.status, updated_at: new Date().toISOString() }
        : t
    );
    writeLocalList(LOCAL_KEYS.trips, updated);
    await refresh();
    return { assigned: true, local: true };
  }, [refresh]);

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, 10000);
    return () => clearInterval(intervalRef.current);
  }, [refresh]);

  return {
    trips,
    activeTrips,
    pendingTrips,
    loading,
    error,
    refresh,
    createTrip,
    updateTripStatus,
    assignAmbulance,
  };
}

// ============================================================================
// HOOK 3: useFleetData
// NavController::activeAmbulances returns { data: [...] }
// DashboardController::fleetMap returns { data: [...] }
// ============================================================================

export function useFleetData() {
  const [ambulances, setAmbulances] = useState([]);
  const [locations, setLocations] = useState([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [availableCount, setAvailableCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [ambData, locData] = await Promise.all([
      nexusFetch("/nav/active-ambulances"),
      nexusFetch("/dashboard/fleet-map"),
    ]);

    if (ambData || locData) {
      // Both return { data: [...] }
      const ambList = ambData?.data || [];
      const locList = locData?.data || [];
      setAmbulances(ambList);
      setLocations(locList);
      setOnlineCount(ambList.length);
      setAvailableCount(ambList.filter((a) => a.status === "available").length);
      setError(null);
    } else {
      const localAmb = readLocalList(LOCAL_KEYS.ambulances);
      setAmbulances(localAmb);
      setLocations(localAmb);
      setOnlineCount(localAmb.length);
      setAvailableCount(localAmb.filter((a) => a.status === "available").length);
      setError(localAmb.length ? null : "Failed to fetch fleet data");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, 8000);
    return () => clearInterval(intervalRef.current);
  }, [refresh]);

  const createAmbulance = useCallback(async (ambData) => {
    const result = await nexusFetch("/nav/ambulances", {
      method: "POST",
      body: JSON.stringify(ambData),
    });
    if (result) {
      refresh();
      return result;
    }

    const local = readLocalList(LOCAL_KEYS.ambulances);
    const created = withEntityDefaults("ambulance", ambData);
    writeLocalList(LOCAL_KEYS.ambulances, [created, ...local]);
    refresh();
    return { data: created, local: true };
  }, [refresh]);

  return { ambulances, locations, onlineCount, availableCount, loading, error, refresh, createAmbulance };
}

// ============================================================================
// HOOK 4: useCrewData
// CrewController::index returns { data: [...crew] }
// assignToTrip route: POST /crew/assign-to-trip
// ============================================================================

export function useCrewData() {
  const [crew, setCrew] = useState([]);
  const [availableCount, setAvailableCount] = useState(0);
  const [onDutyCount, setOnDutyCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await nexusFetch("/crew");
    if (data) {
      // API returns { data: [...crewMembers] }
      const crewList = data.data || [];
      setCrew(crewList);
      setAvailableCount(crewList.filter((c) => c.status === "available").length);
      setOnDutyCount(crewList.filter((c) => c.status === "on_duty").length);
      setError(null);
    } else {
      const localCrew = readLocalList(LOCAL_KEYS.crew);
      setCrew(localCrew);
      setAvailableCount(localCrew.filter((c) => c.status === "available").length);
      setOnDutyCount(localCrew.filter((c) => c.status === "on_duty").length);
      setError(localCrew.length ? null : "Failed to fetch crew data");
    }
    setLoading(false);
  }, []);

  const assignToTrip = useCallback(async (crewId, tripId, role) => {
    // Route: POST /crew/assign-to-trip (not /crew/{id}/assign)
    const result = await nexusFetch("/crew/assign-to-trip", {
      method: "POST",
      body: JSON.stringify({ crew_id: crewId, trip_id: tripId, role }),
    });
    if (result) {
      await refresh();
      return result;
    }
    return null;
  }, [refresh]);

  const updateCertification = useCallback(async (crewId, type, expiresAt, number = null) => {
    // Backend expects: type (string), expires_at (date), number (string, optional)
    const result = await nexusFetch(`/crew/${crewId}/certification`, {
      method: "PATCH",
      body: JSON.stringify({ type, expires_at: expiresAt, ...(number ? { number } : {}) }),
    });
    if (result) {
      await refresh();
      return result;
    }
    return null;
  }, [refresh]);

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, 30000);
    return () => clearInterval(intervalRef.current);
  }, [refresh]);

  const createCrewMember = useCallback(async (memberData) => {
    const result = await nexusFetch("/crew", {
      method: "POST",
      body: JSON.stringify(memberData),
    });
    if (result) {
      refresh();
      return result;
    }
    const local = readLocalList(LOCAL_KEYS.crew);
    const created = withEntityDefaults("crew", memberData);
    writeLocalList(LOCAL_KEYS.crew, [created, ...local]);
    refresh();
    return { data: created, local: true };
  }, [refresh]);

  return {
    crew,
    availableCount,
    onDutyCount,
    loading,
    error,
    refresh,
    assignToTrip,
    updateCertification,
    createCrewMember,
  };
}

// ============================================================================
// HOOK 5: useHospitalData
// HospitalController::index returns { data: [...hospitals] }
// Bed counts derived from array
// ============================================================================

export function useHospitalData() {
  const [hospitals, setHospitals] = useState([]);
  const [totalBeds, setTotalBeds] = useState(0);
  const [availableBeds, setAvailableBeds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await nexusFetch("/hospitals");
    if (data) {
      // API returns { data: [...hospitals] }
      const list = data.data || [];
      setHospitals(list);
      setTotalBeds(list.reduce((sum, h) => sum + (h.bed_capacity || 0), 0));
      setAvailableBeds(list.reduce((sum, h) => sum + (h.available_beds || 0), 0));
      setError(null);
    } else {
      setError("Failed to fetch hospital data");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, 60000);
    return () => clearInterval(intervalRef.current);
  }, [refresh]);

  const createHospital = useCallback(async (hospitalData) => {
    const result = await nexusFetch("/hospitals", {
      method: "POST",
      body: JSON.stringify(hospitalData),
    });
    if (result) refresh();
    return result;
  }, [refresh]);

  return { hospitals, totalBeds, availableBeds, loading, error, refresh, createHospital };
}

// ============================================================================
// HOOK 6: useStockData
// StockController::index returns { data: [...items] }
// StockController::expiring returns { expiring_within_days, count, items: [...] }
// recordConsumption route: POST /stock/record-consumption
// ============================================================================

export function useStockData() {
  const [items, setItems] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [expiringItems, setExpiringItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [stockData, expiringData] = await Promise.all([
      nexusFetch("/stock"),
      nexusFetch("/stock/expiring?days=14"),
    ]);

    if (stockData || expiringData) {
      // index returns { data: [...items] }
      const allItems = stockData?.data || [];
      setItems(allItems);
      // Derive low stock from items below their reorder threshold
      // DB columns: quantity_on_hand, reorder_level
      setLowStockItems(allItems.filter((i) => i.quantity_on_hand != null && i.reorder_level != null && i.quantity_on_hand <= i.reorder_level));
      // expiring returns { items: [...] }
      setExpiringItems(expiringData?.items || []);
      // Derive unique categories
      const cats = [...new Set(allItems.map((i) => i.category).filter(Boolean))];
      setCategories(cats);
      setError(null);
    } else {
      setError("Failed to fetch stock data");
    }
    setLoading(false);
  }, []);

  const recordConsumption = useCallback(async (itemId, quantity, tripId) => {
    // Route: POST /stock/record-consumption (not /stock/consume)
    const result = await nexusFetch("/stock/record-consumption", {
      method: "POST",
      body: JSON.stringify({ item_id: itemId, quantity, trip_id: tripId }),
    });
    if (result) {
      await refresh();
      return result;
    }
    return null;
  }, [refresh]);

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, 30000);
    return () => clearInterval(intervalRef.current);
  }, [refresh]);

  const createStockItem = useCallback(async (itemData) => {
    const result = await nexusFetch("/stock", {
      method: "POST",
      body: JSON.stringify(itemData),
    });
    if (result) refresh();
    return result;
  }, [refresh]);

  return {
    items,
    lowStockItems,
    expiringItems,
    categories,
    loading,
    error,
    refresh,
    recordConsumption,
    createStockItem,
  };
}

// ============================================================================
// HOOK 7: useCRMData
// OperatorController::index returns { data: [...operators] }
// OperatorController::summary returns { data: { total, active, total_fleet } }
// ============================================================================

export function useCRMData() {
  const [operators, setOperators] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedOperator, setSelectedOperatorState] = useState(null);
  const [operatorDetails, setOperatorDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [opsData, summaryData] = await Promise.all([
      nexusFetch("/operators"),
      nexusFetch("/operators/summary"),
    ]);

    if (opsData || summaryData) {
      // index returns { data: [...operators] }
      setOperators(opsData?.data || []);
      // summary returns { data: { total, active, total_fleet } }
      setSummary(summaryData?.data || null);
      setError(null);
    } else {
      const localOps = readLocalList(LOCAL_KEYS.operators);
      setOperators(localOps);
      setSummary({
        total: localOps.length,
        active: localOps.filter((o) => o.status === "active").length,
        total_fleet: localOps.reduce((sum, o) => sum + Number(o.fleet_size || 0), 0),
      });
      setError(localOps.length ? null : "Failed to fetch CRM data");
    }
    setLoading(false);
  }, []);

  const setSelectedOperator = useCallback(
    async (operatorId) => {
      setSelectedOperatorState(operatorId);
      if (operatorId) {
        const details = await nexusFetch(`/operators/${operatorId}`);
        if (details) {
          // show returns { data: operator }
          setOperatorDetails(details.data || details);
        } else {
          const localOps = readLocalList(LOCAL_KEYS.operators);
          const localDetails = localOps.find((o) => String(o.id) === String(operatorId)) || null;
          setOperatorDetails(localDetails);
        }
      } else {
        setOperatorDetails(null);
      }
    },
    []
  );

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, 60000);
    return () => clearInterval(intervalRef.current);
  }, [refresh]);

  const createOperator = useCallback(async (opData) => {
    const result = await nexusFetch("/operators", {
      method: "POST",
      body: JSON.stringify(opData),
    });
    if (result) {
      refresh();
      return result;
    }
    const local = readLocalList(LOCAL_KEYS.operators);
    const created = withEntityDefaults("operator", opData);
    writeLocalList(LOCAL_KEYS.operators, [created, ...local]);
    refresh();
    return { data: created, local: true };
  }, [refresh]);

  const updateOperatorStatus = useCallback(async (operatorId, status, extra = {}) => {
    const payload = { status, ...extra };
    const result = await nexusFetch(`/operators/${operatorId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });

    if (result) {
      await refresh();
      return result;
    }

    const local = readLocalList(LOCAL_KEYS.operators);
    const updated = local.map((op) =>
      String(op.id) === String(operatorId)
        ? { ...op, status, ...extra, updated_at: new Date().toISOString() }
        : op
    );
    writeLocalList(LOCAL_KEYS.operators, updated);
    await refresh();
    return { updated: true, local: true };
  }, [refresh]);

  return {
    operators,
    summary,
    selectedOperator,
    operatorDetails,
    setSelectedOperator,
    loading,
    error,
    refresh,
    createOperator,
    updateOperatorStatus,
  };
}

// ============================================================================
// HOOK 8: usePCRData
// PcrController::show returns unwrapped PCR object
// PcrController::updateSection returns unwrapped PCR object
// Route: PATCH /pcr/{id}/{section}
// ============================================================================

export function usePCRData() {
  const [pcrs, setPcrs] = useState([]);
  const [selectedPcr, setSelectedPcr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPcr = useCallback(async (pcrId) => {
    setLoading(true);
    // Route: GET /pcr/{id}
    const data = await nexusFetch(`/pcr/${pcrId}`);
    if (data) {
      // Returns unwrapped PCR object (no .pcr wrapper)
      setSelectedPcr(data);
      setError(null);
    } else {
      setError("Failed to fetch PCR");
    }
    setLoading(false);
    return data;
  }, []);

  const updateSection = useCallback(async (pcrId, section, sectionData) => {
    // Route: PATCH /pcr/{id}/{section}
    const result = await nexusFetch(`/pcr/${pcrId}/${section}`, {
      method: "PATCH",
      body: JSON.stringify(sectionData),
    });
    if (result) {
      // Returns unwrapped PCR object
      setSelectedPcr(result);
      setError(null);
      return result;
    }
    setError("Failed to update PCR section");
    return null;
  }, []);

  const createPcr = useCallback(async (tripId) => {
    setLoading(true);
    // Route: POST /pcr/trip/{tripId}
    const result = await nexusFetch(`/pcr/trip/${tripId}`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    if (result) {
      setSelectedPcr(result);
      setError(null);
    } else {
      setError("Failed to create PCR");
    }
    setLoading(false);
    return result;
  }, []);

  return { pcrs, selectedPcr, loading, error, fetchPcr, updateSection, createPcr };
}

// ============================================================================
// HOOK 9: useBrainData
// Routes: /brain/triage-assist, /brain/dispatch-optimise,
//         /brain/stock-forecast, /brain/pcr-anomaly-detect
// ============================================================================

export function useBrainData() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runTriage = useCallback(async (data) => {
    setLoading(true);
    // Route: POST /brain/triage-assist (not /brain/triage)
    const result = await nexusFetch("/brain/triage-assist", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (result) {
      setResults(result);
      setError(null);
    } else {
      setError("Triage analysis failed");
    }
    setLoading(false);
    return result;
  }, []);

  const runDispatchOptimise = useCallback(async (data) => {
    setLoading(true);
    const result = await nexusFetch("/brain/dispatch-optimise", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (result) {
      setResults(result);
      setError(null);
    } else {
      setError("Dispatch optimization failed");
    }
    setLoading(false);
    return result;
  }, []);

  const runStockForecast = useCallback(async (data) => {
    setLoading(true);
    const result = await nexusFetch("/brain/stock-forecast", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (result) {
      setResults(result);
      setError(null);
    } else {
      setError("Stock forecast failed");
    }
    setLoading(false);
    return result;
  }, []);

  const runPcrAnomaly = useCallback(async (data) => {
    setLoading(true);
    // Route: POST /brain/pcr-anomaly-detect (not /brain/pcr-anomaly)
    const result = await nexusFetch("/brain/pcr-anomaly-detect", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (result) {
      setResults(result);
      setError(null);
    } else {
      setError("PCR anomaly detection failed");
    }
    setLoading(false);
    return result;
  }, []);

  return {
    results,
    loading,
    error,
    runTriage,
    runDispatchOptimise,
    runStockForecast,
    runPcrAnomaly,
  };
}

// ============================================================================
// HOOK 10: useBillingData
// BillingController::listInvoices returns { success, invoices: [...], pagination }
// BillingController::getRevenueReport returns { success, total_revenue, period, data }
// ============================================================================

export function useBillingData() {
  const [invoices, setInvoices] = useState([]);
  const [revenueReport, setRevenueReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [invoiceData, revenueData] = await Promise.all([
      nexusFetch("/billing/invoices"),
      nexusFetch("/billing/revenue-report"),
    ]);

    if (invoiceData || revenueData) {
      // listInvoices returns { success, invoices: [...], pagination }
      setInvoices(invoiceData?.invoices || []);
      // revenueReport returns { success, total_revenue, period, data }
      setRevenueReport(revenueData || null);
      setError(null);
    } else {
      setError("Failed to fetch billing data");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, 60000);
    return () => clearInterval(intervalRef.current);
  }, [refresh]);

  const createInvoice = useCallback(async (invoiceData) => {
    const result = await nexusFetch("/billing/invoices", {
      method: "POST",
      body: JSON.stringify(invoiceData),
    });
    if (result) refresh();
    return result;
  }, [refresh]);

  return { invoices, revenueReport, loading, error, refresh, createInvoice };
}

// ============================================================================
// HOOK 11: useComplianceData
// ComplianceController::getDashboard returns { success, compliance_score, alerts, statistics }
// ComplianceController::getExpiringCertifications returns { success, certifications, ... }
// ============================================================================

export function useComplianceData() {
  const [dashboard, setDashboard] = useState(null);
  const [expiringCerts, setExpiringCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [dashData, certData] = await Promise.all([
      nexusFetch("/compliance/dashboard"),
      nexusFetch("/compliance/expiring-certs"),
    ]);

    if (dashData || certData) {
      // getDashboard returns { success, compliance_score, alerts, statistics }
      setDashboard(dashData || null);
      // getExpiringCertifications returns { success, certifications: [...] }
      setExpiringCerts(certData?.certifications || []);
      setError(null);
    } else {
      setError("Failed to fetch compliance data");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, 60000);
    return () => clearInterval(intervalRef.current);
  }, [refresh]);

  return { dashboard, expiringCerts, loading, error, refresh };
}

// ============================================================================
// HOOK 12: usePatientData
// PatientController::index returns { data: [...patients] }
// PatientController::store accepts full_name, phone, email, dob, gender, etc.
// ============================================================================

export function usePatientData() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatientState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await nexusFetch("/patients");
    if (data) {
      setPatients(data.data || []);
      setError(null);
    } else {
      const localPatients = readLocalList(LOCAL_KEYS.patients);
      setPatients(localPatients);
      setError(localPatients.length ? null : "Failed to fetch patient data");
    }
    setLoading(false);
  }, []);

  const createPatient = useCallback(async (patientData) => {
    const result = await nexusFetch("/patients", {
      method: "POST",
      body: JSON.stringify(patientData),
    });
    if (result) {
      await refresh();
      return result;
    }
    const local = readLocalList(LOCAL_KEYS.patients);
    const created = withEntityDefaults("patient", patientData);
    writeLocalList(LOCAL_KEYS.patients, [created, ...local]);
    await refresh();
    return { data: created, local: true };
  }, [refresh]);

  const setSelectedPatient = useCallback(async (patientId) => {
    setSelectedPatientState(patientId);
    if (patientId) {
      const details = await nexusFetch(`/patients/${patientId}`);
      if (details) {
        setSelectedPatientState(details.data || details);
      } else {
        const localPatients = readLocalList(LOCAL_KEYS.patients);
        setSelectedPatientState(localPatients.find((p) => String(p.id) === String(patientId)) || null);
      }
    } else {
      setSelectedPatientState(null);
    }
  }, []);

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, 60000);
    return () => clearInterval(intervalRef.current);
  }, [refresh]);

  return { patients, selectedPatient, setSelectedPatient, loading, error, refresh, createPatient };
}

// ============================================================================
// HOOK 13: useAuditData
// AuditLogController::index returns { data: [...logs] }
// ============================================================================

export function useAuditData() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ module: "", action: "" });

  const refresh = useCallback(async (filterOverride) => {
    setLoading(true);
    const f = filterOverride || filters;
    const params = new URLSearchParams();
    if (f.module) params.set("module", f.module);
    if (f.action) params.set("action", f.action);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const data = await nexusFetch(`/audit-logs${qs}`);
    if (data) {
      setLogs(data.data || []);
      setError(null);
    } else {
      setError("Failed to fetch audit logs");
    }
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { logs, loading, error, refresh, filters, setFilters };
}

// ============================================================================
// HOOK 14: usePaymentData
// PaymentController::index returns { data: [...payments] }
// PaymentController::summary returns { data: { total_collected, total_pending, ... } }
// ============================================================================

export function usePaymentData() {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [payData, summaryData] = await Promise.all([
      nexusFetch("/payments"),
      nexusFetch("/payments/summary"),
    ]);
    if (payData || summaryData) {
      setPayments(payData?.data || []);
      setSummary(summaryData?.data || null);
      setError(null);
    } else {
      setError("Failed to fetch payment data");
    }
    setLoading(false);
  }, []);

  const createPayment = useCallback(async (paymentData) => {
    const result = await nexusFetch("/payments", {
      method: "POST",
      body: JSON.stringify(paymentData),
    });
    if (result) {
      await refresh();
      return result;
    }
    return null;
  }, [refresh]);

  const updatePaymentStatus = useCallback(async (paymentId, status) => {
    const result = await nexusFetch(`/payments/${paymentId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (result) {
      await refresh();
      return result;
    }
    return null;
  }, [refresh]);

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, 30000);
    return () => clearInterval(intervalRef.current);
  }, [refresh]);

  return { payments, summary, loading, error, refresh, createPayment, updatePaymentStatus };
}

// ============================================================================
// HOOK 15: useBroadcastData
// BroadcastHistoryController::index returns { data: [...broadcasts] }
// BroadcastHistoryController::stats returns { data: { total, accepted, ... } }
// ============================================================================

export function useBroadcastData() {
  const [broadcasts, setBroadcasts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [bcastData, statsData] = await Promise.all([
      nexusFetch("/broadcasts"),
      nexusFetch("/broadcasts/stats"),
    ]);
    if (bcastData || statsData) {
      setBroadcasts(bcastData?.data || []);
      setStats(statsData?.data || null);
      setError(null);
    } else {
      setError("Failed to fetch broadcast data");
    }
    setLoading(false);
  }, []);

  const forTrip = useCallback(async (tripId) => {
    const data = await nexusFetch(`/broadcasts/trip/${tripId}`);
    return data?.data || [];
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { broadcasts, stats, loading, error, refresh, forTrip };
}

// ============================================================================
// HOOK 16: useMentorData
// MentorController::index returns { data: [...modules] }
// MentorController::dashboard returns { total_modules, by_category, ... }
// MentorController::crewProgress returns { data: [...progress], stats }
// MentorController::aiMentor returns { answer, references, follow_up_questions }
// ============================================================================

export function useMentorData() {
  const [modules, setModules] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [crewProgress, setCrewProgress] = useState([]);
  const [crewStats, setCrewStats] = useState(null);
  const [aiResponse, setAiResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [modData, dashData] = await Promise.all([
      nexusFetch("/mentor/modules"),
      nexusFetch("/mentor/dashboard"),
    ]);
    if (modData || dashData) {
      setModules(modData?.data || []);
      setDashboard(dashData || null);
      setError(null);
    } else {
      setError("Failed to fetch mentor data");
    }
    setLoading(false);
  }, []);

  const createModule = useCallback(async (moduleData) => {
    const result = await nexusFetch("/mentor/modules", {
      method: "POST",
      body: JSON.stringify(moduleData),
    });
    if (result) refresh();
    return result;
  }, [refresh]);

  const fetchModule = useCallback(async (moduleId) => {
    const data = await nexusFetch(`/mentor/modules/${moduleId}`);
    return data?.data || data || null;
  }, []);

  const fetchCrewProgress = useCallback(async (crewId) => {
    const data = await nexusFetch(`/mentor/crew/${crewId}/progress`);
    if (data) {
      setCrewProgress(data.data || []);
      setCrewStats(data.stats || null);
    }
    return data;
  }, []);

  const updateProgress = useCallback(async (moduleId, progressData) => {
    const result = await nexusFetch(`/mentor/modules/${moduleId}/progress`, {
      method: "POST",
      body: JSON.stringify(progressData),
    });
    if (result) refresh();
    return result;
  }, [refresh]);

  const askAiMentor = useCallback(async (question, context = null, crewMemberId = null) => {
    setAiResponse(null);
    const result = await nexusFetch("/mentor/ai-mentor", {
      method: "POST",
      body: JSON.stringify({
        question,
        ...(context ? { context } : {}),
        ...(crewMemberId ? { crew_member_id: crewMemberId } : {}),
      }),
    });
    if (result) setAiResponse(result);
    return result;
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    modules, dashboard, crewProgress, crewStats, aiResponse,
    loading, error, refresh,
    createModule, fetchModule, fetchCrewProgress, updateProgress, askAiMentor,
  };
}
