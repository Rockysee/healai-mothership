"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import useMapRouting from "@/hooks/useMapRouting";

const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false });
const Polyline = dynamic(() => import("react-leaflet").then((mod) => mod.Polyline), { ssr: false });

function statusColor(status) {
  if (["available"].includes(status)) return "#22c55e";
  if (["dispatched", "en_route", "on_scene", "transporting"].includes(status)) return "#f59e0b";
  return "#ef4444";
}

function safeSpeed(speed) {
  const n = Number(speed || 0);
  if (Number.isNaN(n)) return 0;
  return Math.abs(Math.round(n));
}

function createUnitIcon(status) {
  if (typeof window === "undefined" || !window.L) return null;
  const color = statusColor(status);
  return window.L.divIcon({
    className: "medpod-unit-marker",
    html: `<div style="width:16px;height:16px;border-radius:999px;background:${color};border:2px solid #fff;box-shadow:0 0 0 3px rgba(0,0,0,0.25)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8],
  });
}

function createHospitalIcon() {
  if (typeof window === "undefined" || !window.L) return null;
  return window.L.divIcon({
    className: "medpod-hospital-marker",
    html: `<div style="width:14px;height:14px;border-radius:3px;background:#2563eb;border:2px solid #fff;box-shadow:0 0 0 3px rgba(0,0,0,0.2)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -7],
  });
}

function kmFromMeters(distanceM) {
  return (Number(distanceM || 0) / 1000).toFixed(1);
}

function minFromSeconds(seconds) {
  return Math.round(Number(seconds || 0) / 60);
}

function nearestHospital(from, hospitals) {
  if (!from || !Array.isArray(hospitals) || hospitals.length === 0) return null;
  let best = null;
  let bestScore = Infinity;
  hospitals.forEach((h) => {
    if (typeof h.lat !== "number" || typeof h.lng !== "number") return;
    const score = Math.abs(from.lat - h.lat) + Math.abs(from.lng - h.lng);
    if (score < bestScore) {
      bestScore = score;
      best = h;
    }
  });
  return best;
}

export default function FleetMap({ height = "600px", compact = false }) {
  const envProvider = (process.env.NEXT_PUBLIC_MAP_PROVIDER || "osm").toLowerCase();
  const [tracking, setTracking] = useState({ units: [], hospitals: [], source_files: [], generated_at: null });
  const [pickupQuery, setPickupQuery] = useState("");
  const [dropQuery, setDropQuery] = useState("");
  const [routePlan, setRoutePlan] = useState(null);
  const [routeLabel, setRouteLabel] = useState("No planned route");
  const [providerSelection, setProviderSelection] = useState(envProvider === "google" ? "google" : "osm");
  const [loading, setLoading] = useState(true);
  const [leafletReady, setLeafletReady] = useState(false);
  const mapRef = useRef(null);
  const { providerId, loading: routeLoading, error: routeError, geocodeFirst, computeRoute } = useMapRouting(providerSelection);

  useEffect(() => {
    let active = true;
    import("leaflet")
      .then(() => {
        if (active) setLeafletReady(true);
      })
      .catch(() => {
        if (active) setLeafletReady(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !window.L) return;
    const points = [
      ...tracking.units.filter((u) => typeof u.lat === "number" && typeof u.lng === "number").map((u) => [u.lat, u.lng]),
      ...tracking.hospitals.filter((h) => typeof h.lat === "number" && typeof h.lng === "number").map((h) => [h.lat, h.lng]),
      ...(routePlan?.coordinates || []),
    ];
    if (!points.length) return;
    mapRef.current.fitBounds(window.L.latLngBounds(points), { padding: [28, 28], maxZoom: 14 });
  }, [tracking.units, tracking.hospitals, routePlan]);

  const planAddressRoute = async () => {
    const from = await geocodeFirst(pickupQuery);
    const to = await geocodeFirst(dropQuery);
    if (!from || !to) {
      setRoutePlan(null);
      setRouteLabel("Address lookup failed");
      return;
    }

    const route = await computeRoute(from, to);
    if (!route) {
      setRoutePlan(null);
      setRouteLabel("Route unavailable");
      return;
    }

    setRoutePlan(route);
    setRouteLabel(`${kmFromMeters(route.distance_m)} km · ${minFromSeconds(route.duration_s)} min`);
  };

  const planAutoRoute = async () => {
    const active = tracking.units.find((u) => ["dispatched", "en_route", "on_scene", "transporting"].includes(u.status)) || tracking.units[0];
    if (!active || typeof active.lat !== "number" || typeof active.lng !== "number") {
      setRouteLabel("No active MedPod found");
      setRoutePlan(null);
      return;
    }

    const targetHospital = nearestHospital(active, tracking.hospitals);
    if (!targetHospital) {
      setRouteLabel("No hospital coordinates available");
      setRoutePlan(null);
      return;
    }

    const route = await computeRoute(
      { lat: active.lat, lng: active.lng },
      { lat: targetHospital.lat, lng: targetHospital.lng }
    );
    if (!route) {
      setRoutePlan(null);
      setRouteLabel("Auto-route unavailable");
      return;
    }

    setRoutePlan(route);
    setRouteLabel(`${active.call_sign || active.id} → ${targetHospital.name} · ${kmFromMeters(route.distance_m)} km · ${minFromSeconds(route.duration_s)} min`);
  };

  useEffect(() => {
    let isActive = true;

    const fetchTracking = async () => {
      try {
        const res = await fetch("/api/medpods/tracking");
        const data = await res.json();
        if (isActive) {
          setTracking({
            units: Array.isArray(data.units) ? data.units : [],
            hospitals: Array.isArray(data.hospitals) ? data.hospitals : [],
            source_files: Array.isArray(data.source_files) ? data.source_files : [],
            generated_at: data.generated_at || null,
          });
        }
      } catch {
        if (isActive) {
          setTracking((prev) => ({ ...prev, units: [], hospitals: [] }));
        }
      } finally {
        if (isActive) setLoading(false);
      }
    };

    fetchTracking();
    const interval = setInterval(fetchTracking, 8000);
    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, []);

  const showFallbackFeed = !leafletReady;

  return (
    <div
      style={{
        position: "relative",
        height: compact ? "300px" : height,
        borderRadius: "14px",
        overflow: "hidden",
        background: "rgba(0,0,0,0.35)",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      {!showFallbackFeed && (
        <MapContainer
          center={[28.6139, 77.209]}
          zoom={compact ? 10 : 11}
          style={{ width: "100%", height: "100%" }}
          whenReady={(event) => {
            mapRef.current = event.target;
          }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          {tracking.units.map((unit) => {
            if (typeof unit.lat !== "number" || typeof unit.lng !== "number") return null;
            return (
              <Marker key={unit.id || unit.call_sign} position={[unit.lat, unit.lng]} icon={createUnitIcon(unit.status)}>
                <Popup>
                  <div style={{ fontSize: 12, minWidth: 220 }}>
                    <strong>{unit.call_sign || unit.id}</strong>
                    <br />
                    Status: {unit.status || "unknown"}
                    <br />
                    Speed: {safeSpeed(unit.speed)} km/h
                    <br />
                    Source: {unit.source_file || "feed"}
                    <br />
                    Updated: {unit.last_update ? new Date(unit.last_update).toLocaleTimeString() : "--"}
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {tracking.units.map((unit) => {
            if (!Array.isArray(unit.track) || unit.track.length < 2) return null;
            return (
              <Polyline
                key={`track-${unit.id || unit.call_sign}`}
                pathOptions={{ color: statusColor(unit.status), weight: 2, opacity: 0.6 }}
                positions={unit.track.map((p) => [p.lat, p.lng])}
              />
            );
          })}

          {routePlan?.coordinates?.length > 1 && (
            <Polyline
              pathOptions={{ color: "#38bdf8", weight: 4, opacity: 0.85 }}
              positions={routePlan.coordinates}
            />
          )}

          {tracking.hospitals.map((hospital) => {
            if (typeof hospital.lat !== "number" || typeof hospital.lng !== "number") return null;
            return (
              <Marker key={hospital.id || hospital.name} position={[hospital.lat, hospital.lng]} icon={createHospitalIcon()}>
                <Popup>
                  <div style={{ fontSize: 12, minWidth: 200 }}>
                    <strong>{hospital.name}</strong>
                    <br />
                    Available beds: {hospital.available_beds ?? "--"}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      )}

      {showFallbackFeed && (
        <div style={{ padding: 14, height: "100%", overflowY: "auto", color: "rgba(255,255,255,0.9)", fontSize: 11 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Open-source map is initializing</div>
          <div style={{ color: "rgba(255,255,255,0.65)", marginBottom: 10 }}>Leaflet assets are still loading. Live feed is shown below.</div>
          <div style={{ marginBottom: 8, color: "#60a5fa", fontWeight: 700 }}>Live MedPod feed (from Amb_Ref)</div>
          {tracking.units.slice(0, 8).map((u) => (
            <div key={u.id} style={{ padding: "8px 10px", borderRadius: 10, background: "rgba(255,255,255,0.05)", marginBottom: 6 }}>
              <div style={{ fontWeight: 700 }}>{u.call_sign} · {u.status}</div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontFamily: "monospace" }}>
                {u.lat?.toFixed?.(5)}, {u.lng?.toFixed?.(5)} · {safeSpeed(u.speed)} km/h
              </div>
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          position: "absolute",
          left: 10,
          top: 10,
          zIndex: 25,
          background: "rgba(3,7,18,0.78)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 12,
          padding: "10px 12px",
          color: "#fff",
          fontSize: 10,
          width: compact ? 220 : 290,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Route Planner ({providerId.toUpperCase()})</div>
        <select
          value={providerSelection}
          onChange={(e) => {
            setProviderSelection(e.target.value);
            setRoutePlan(null);
            setRouteLabel("No planned route");
          }}
          style={{ width: "100%", marginBottom: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", color: "#fff", borderRadius: 8, padding: "7px 9px", fontSize: 11 }}
        >
          <option value="osm">OSM (Nominatim + OSRM)</option>
          <option value="google">Google (Geocoding + Directions)</option>
        </select>
        <input
          value={pickupQuery}
          onChange={(e) => setPickupQuery(e.target.value)}
          placeholder="Pickup address"
          style={{ width: "100%", marginBottom: 6, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", color: "#fff", borderRadius: 8, padding: "7px 9px", fontSize: 11 }}
        />
        <input
          value={dropQuery}
          onChange={(e) => setDropQuery(e.target.value)}
          placeholder="Drop address"
          style={{ width: "100%", marginBottom: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", color: "#fff", borderRadius: 8, padding: "7px 9px", fontSize: 11 }}
        />
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={planAddressRoute}
            disabled={routeLoading}
            style={{ flex: 1, border: "none", borderRadius: 8, padding: "7px 8px", cursor: "pointer", background: "#0ea5e9", color: "#fff", fontWeight: 700, fontSize: 10 }}
          >
            Route by Address
          </button>
          <button
            onClick={planAutoRoute}
            disabled={routeLoading}
            style={{ flex: 1, border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, padding: "7px 8px", cursor: "pointer", background: "rgba(255,255,255,0.06)", color: "#fff", fontWeight: 700, fontSize: 10 }}
          >
            Auto Unit→Hospital
          </button>
        </div>
        <div style={{ marginTop: 8, opacity: 0.85 }}>{routeLabel}</div>
        {routeError && <div style={{ marginTop: 4, color: "#fca5a5" }}>{routeError}</div>}
      </div>

      <div
        style={{
          position: "absolute",
          right: 10,
          top: 10,
          zIndex: 20,
          background: "rgba(0,0,0,0.55)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10,
          padding: "8px 10px",
          color: "#fff",
          fontSize: 10,
          minWidth: 170,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Tracking Feed</div>
        <div style={{ opacity: 0.8, marginBottom: 4 }}>Units: {tracking.units.length}</div>
        <div style={{ opacity: 0.8, marginBottom: 4 }}>Hospitals: {tracking.hospitals.length}</div>
        <div style={{ opacity: 0.8 }}>Sync: {tracking.generated_at ? new Date(tracking.generated_at).toLocaleTimeString() : "--"}</div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 10,
          bottom: 10,
          zIndex: 20,
          background: "rgba(0,0,0,0.55)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10,
          padding: "8px 10px",
          color: "#fff",
          fontSize: 10,
          maxWidth: 290,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Folder Sources</div>
        {tracking.source_files.map((f) => (
          <div key={f.name} style={{ opacity: 0.78 }}>
            {f.relative_path} · {f.records}
          </div>
        ))}
      </div>

      {loading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.35)",
            color: "#fff",
            fontSize: 13,
            zIndex: 30,
          }}
        >
          Updating positions...
        </div>
      )}
    </div>
  );
}
