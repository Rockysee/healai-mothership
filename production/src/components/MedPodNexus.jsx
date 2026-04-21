"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import {
  Activity, Truck, Users, Package, Brain, MapPin, Clock,
  AlertTriangle, ChevronRight, RefreshCw, Zap, Heart,
  Radio, Shield, Plus, Phone, Navigation, Thermometer,
  Stethoscope, Siren, CircleDot, ArrowUpRight, Wifi,
  WifiOff, CheckCircle2, XCircle, BarChart3, Building2,
  UserCog, FileText, Clipboard, DollarSign, Search,
  ChevronDown, ChevronUp, Eye, Edit3, Save, X,
  Layers, Target, Gauge, Bell, Hospital, Briefcase,
  GraduationCap, BookOpen, MessageCircle, Send, Bot, Lightbulb,
  Flame, Award, HelpCircle, RotateCcw, Scan,
} from "lucide-react";
import "../styles/leaflet-overrides.css";
// NB: medpod-brand.css is now imported globally from src/app/globals.css
// so the Uyire palette applies across every silo, not just MedPod.
import {
  useCommandData, useDispatchData, useFleetData, useCrewData,
  useHospitalData, useStockData, useCRMData, usePCRData, useBrainData,
  useBillingData, useComplianceData, usePatientData, useAuditData,
  usePaymentData, useBroadcastData, useMentorData,
} from "../hooks/useNexusData";
import GsplPcrForm from "./nexus/GsplPcrForm";
import FieldEntry from "./nexus/FieldEntry";
import IndiaCoverageMap from "./nexus/IndiaCoverageMap";
import BarcodeScanPanel from "./nexus/BarcodeScanPanel";
import DispatchQuickCreate from "./nexus/DispatchQuickCreate";
import InlineEditRow from "./nexus/InlineEditRow";
import AadhaarAttestPanel from "./nexus/AadhaarAttestPanel";
import DocumentsPanel from "./nexus/DocumentsPanel";
import EmergencyFloater from "./nexus/EmergencyFloater";
import AdminPanel from "./nexus/AdminPanel";
import { useNexusAudit } from "../hooks/useNexusAudit";

// Dynamically import FleetMap to handle SSR
const FleetMap = dynamic(() => import("./nexus/FleetMap"), {
  ssr: false,
  loading: () => (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "600px", background: "rgba(0,0,0,0.3)", borderRadius: "14px",
      color: "rgba(255,255,255,0.5)", fontSize: "13px"
    }}>
      Loading map...
    </div>
  ),
});

// ═══════════════════════════════════════════════════════════════
// MEDPOD NEXUS — Full EMS Command Center
// Proxy: /api/nexus/* → http://localhost:8001/api/v1/*
// ═══════════════════════════════════════════════════════════════

const API = "/api/nexus";

const PRIORITY_MAP = {
  1: { label: "P1 CRITICAL", color: "#ef4444", bg: "rgba(239,68,68,0.12)", pulse: true },
  2: { label: "P2 URGENT",   color: "#f59e0b", bg: "rgba(245,158,11,0.10)", pulse: false },
  3: { label: "P3 STANDARD", color: "#22c55e", bg: "rgba(34,197,94,0.08)",  pulse: false },
  4: { label: "P4 LOW",      color: "#6b7280", bg: "rgba(107,114,128,0.08)",pulse: false },
};

const STATUS_COLOR = {
  pending:      { dot: "#f59e0b", label: "Pending" },
  dispatched:   { dot: "#3b82f6", label: "Dispatched" },
  en_route:     { dot: "#8b5cf6", label: "En Route" },
  on_scene:     { dot: "#ef4444", label: "On Scene" },
  transporting: { dot: "#f97316", label: "Transporting" },
  at_hospital:  { dot: "#06b6d4", label: "At Hospital" },
  completed:    { dot: "#22c55e", label: "Completed" },
  cancelled:    { dot: "#6b7280", label: "Cancelled" },
};

const EMERGENCY_TYPES = [
  "heart_stroke", "accident", "maternity", "respiratory",
  "chest_pain", "drowning", "electric_shock", "burns", "disaster", "other"
];

// ── Reusable ──────────────────────────────────────────────────
function Pill({ color, bg, children, pulse }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700,
      color, background: bg, letterSpacing: "0.06em",
      fontFamily: "'SF Mono', 'Fira Code', monospace",
    }}>
      {pulse && <span style={{
        width: 6, height: 6, borderRadius: "50%", background: color,
        animation: "pulse-g 1.5s ease-in-out infinite",
      }} />}
      {children}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, accent = "#22c55e", sub, onClick, hero = false }) {
  return (
    <div
      className={`glass-card${hero ? " medpod-stat-hero" : ""}`}
      onClick={onClick}
      style={{
        borderRadius: 14,
        padding: hero ? "24px 28px" : "16px 18px",
        display: "flex", flexDirection: "column",
        gap: hero ? 16 : 8,
        minWidth: 0,
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.2s",
        justifyContent: hero ? "space-between" : "flex-start",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Icon size={hero ? 18 : 14} style={{ color: accent, opacity: 0.85 }} />
        <span style={{
          fontSize: hero ? 12 : 10,
          color: "rgba(255,255,255,0.45)",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: hero ? "0.12em" : "0.08em",
        }}>{label}</span>
      </div>
      <span
        className="medpod-stat-value"
        style={{
          fontSize: hero ? 56 : 28,
          fontWeight: 700,
          color: "#fff",
          letterSpacing: "-0.03em",
          lineHeight: 1,
        }}
      >{value}</span>
      {sub && (
        <span style={{
          fontSize: hero ? 12 : 10,
          color: "rgba(255,255,255,0.35)",
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: "0.02em",
        }}>{sub}</span>
      )}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, accent = "#22c55e", action }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: `${accent}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={14} style={{ color: accent }} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>{title}</span>
      </div>
      {action}
    </div>
  );
}

function Input({ placeholder, value, onChange, style: s }) {
  return (
    <input placeholder={placeholder} value={value} onChange={onChange}
      style={{
        background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 12, outline: "none",
        width: "100%", ...s,
      }}
    />
  );
}

function Select({ value, onChange, children, style: s }) {
  return (
    <select value={value} onChange={onChange}
      style={{
        background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 12, outline: "none",
        width: "100%", ...s,
      }}
    >
      {children}
    </select>
  );
}

function EmptyState({ icon: Icon, message, sub }) {
  return (
    <div className="glass-card" style={{
      borderRadius: 14, padding: 32, textAlign: "center",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
    }}>
      <Icon size={28} style={{ color: "rgba(255,255,255,0.15)" }} />
      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>{message}</span>
      {sub && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{sub}</span>}
    </div>
  );
}

// ── API helper ────────────────────────────────────────────────
async function nexusFetch(path, opts = {}) {
  try {
    const res = await fetch(`${API}${path}`, {
      headers: { "Content-Type": "application/json", Accept: "application/json", ...opts.headers },
      ...opts,
    });
    if (!res.ok) throw new Error(`${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("[NEXUS]", path, err.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// TAB CONFIG — Two-level navigation
//
// 18 destinations grouped under 5 functional clusters. Group strip
// is the primary nav; sub-tab strip appears under the active group.
// Default landing: Live Ops → Command. Sticky-per-group via
// localStorage so a returning operator lands where they left off.
// ═══════════════════════════════════════════════════════════════
const TAB_GROUPS = [
  {
    id: "live",
    label: "Live Ops",
    icon: Siren,
    accent: "#ef4444",
    tabs: [
      { id: "command",    label: "Command",    icon: Target },
      { id: "dispatch",   label: "Dispatch",   icon: Siren },
      { id: "field",      label: "Field",      icon: Users },
      { id: "broadcasts", label: "Broadcasts", icon: Radio },
    ],
  },
  {
    id: "fleet",
    label: "Fleet & Crew",
    icon: Truck,
    accent: "#3b82f6",
    tabs: [
      { id: "fleet",      label: "Fleet",      icon: Truck },
      { id: "crew",       label: "HRMS",       icon: UserCog },
      { id: "stock",      label: "Inventory",  icon: Package },
      { id: "compliance", label: "Compliance", icon: Shield },
    ],
  },
  {
    id: "care",
    label: "Care & Hospitals",
    icon: Building2,
    accent: "#06b6d4",
    tabs: [
      { id: "hospitals",  label: "Hospitals",  icon: Building2 },
      { id: "pcr",        label: "PCR",        icon: Clipboard },
      { id: "patients",   label: "Patients",   icon: Heart },
    ],
  },
  {
    id: "biz",
    label: "Business",
    icon: Briefcase,
    accent: "#8b5cf6",
    tabs: [
      { id: "crm",      label: "CRM",      icon: Briefcase },
      { id: "billing",  label: "Billing",  icon: DollarSign },
      { id: "payments", label: "Payments", icon: Zap },
      { id: "mentor",   label: "Mentor",   icon: GraduationCap },
    ],
  },
  {
    id: "intel",
    label: "AI & Audit",
    icon: Brain,
    accent: "#22c55e",
    tabs: [
      { id: "india", label: "India",     icon: MapPin },
      { id: "brain", label: "AI Brain",  icon: Brain },
      { id: "audit", label: "Audit Log", icon: Eye },
      { id: "admin", label: "Admin",     icon: Shield },
    ],
  },
];

// Flat lookup for legacy tab-id callers (CommandCenter onNavigate, etc.)
const TAB_LOOKUP = TAB_GROUPS.reduce((acc, g) => {
  g.tabs.forEach((t) => { acc[t.id] = { ...t, groupId: g.id, accent: g.accent }; });
  return acc;
}, {});

const GROUP_STICKY_KEY = "medpod.nexus.lastTab";
function loadStickyTab() {
  if (typeof window === "undefined") return { group: "live", tab: "command" };
  try {
    const raw = window.localStorage.getItem(GROUP_STICKY_KEY);
    if (!raw) return { group: "live", tab: "command" };
    const parsed = JSON.parse(raw);
    if (TAB_LOOKUP[parsed.tab]) {
      return { group: TAB_LOOKUP[parsed.tab].groupId, tab: parsed.tab };
    }
  } catch {}
  return { group: "live", tab: "command" };
}
function saveStickyTab(tab) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(GROUP_STICKY_KEY, JSON.stringify({ tab })); } catch {}
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function MedPodNexus() {
  const { stats, recentTrips, loading: cmdLoading, error: cmdError, refresh } = useCommandData();
  // Read sticky tab synchronously during state init so the correct tab
  // renders on paint 1 — no flash of the default tab before settle.
  const [tab, setTabRaw] = useState(() => {
    if (typeof window === "undefined") return "command";
    return loadStickyTab().tab;
  });
  const [groupId, setGroupId] = useState(() => {
    if (typeof window === "undefined") return "live";
    return loadStickyTab().group;
  });
  const setTab = useCallback((nextTab) => {
    const meta = TAB_LOOKUP[nextTab];
    if (meta) {
      setGroupId(meta.groupId);
      setTabRaw(nextTab);
      saveStickyTab(nextTab);
    } else {
      setTabRaw(nextTab);
    }
  }, []);
  // When the group changes via the primary strip, jump to its first tab
  const switchGroup = useCallback((nextGroupId) => {
    const grp = TAB_GROUPS.find((g) => g.id === nextGroupId);
    if (!grp) return;
    setGroupId(nextGroupId);
    const firstTab = grp.tabs[0]?.id;
    if (firstTab) {
      setTabRaw(firstTab);
      saveStickyTab(firstTab);
    }
  }, []);
  const activeGroup = TAB_GROUPS.find((g) => g.id === groupId) || TAB_GROUPS[0];
  const online = !cmdError && stats !== null;
  const loading = cmdLoading;
  const lastSync = new Date();

  return (
    <div className="medpod-shell">
    <div className="silo-content medpod-content">
      {/* Brand header — Healai product (under Uyire umbrella) */}
      <div style={{
        display: "flex", alignItems: "flex-end", justifyContent: "space-between",
        gap: 16, marginBottom: 24, flexWrap: "wrap",
      }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span className="medpod-brand-chip">
              {online ? "NEXUS ONLINE" : "NEXUS OFFLINE"}
            </span>
            <span style={{
              fontSize: 10, color: "var(--muted)",
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "0.12em", textTransform: "uppercase",
            }}>
              a uyire product
            </span>
          </div>
          <h1 className="medpod-page-title" style={{ marginTop: 4 }}>
            <span style={{ fontStyle: "normal", fontWeight: 600 }}>Healai</span>
            <span style={{ color: "var(--muted)", fontWeight: 400 }}> · </span>
            <span>MedPod</span>
          </h1>
          <p className="medpod-page-sub" style={{ maxWidth: 560 }}>
            <span style={{ fontWeight: 700, color: "var(--ink)" }}>3 Easy Clicks. Save a Life.</span>
            <span style={{ color: "var(--muted)" }}> — emergency-management platform. MARS-proven, NABH-aligned, ready for hospital-scale deployment.</span>
            {lastSync && (
              <span style={{ marginLeft: 10, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
                · sync {lastSync.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <button onClick={refresh} style={{
          background: "var(--health-08, rgba(46,123,196,0.08))",
          border: "1px solid var(--health-25, rgba(46,123,196,0.25))",
          borderRadius: 10, padding: "10px 16px",
          display: "flex", alignItems: "center", gap: 8,
          cursor: "pointer", color: "var(--health, #2e7bc4)",
          fontSize: 12, fontWeight: 700, letterSpacing: "0.04em",
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          REFRESH
        </button>
      </div>

      {/* PRIMARY group strip — 5 functional clusters. Icons + labels.
          Cards-not-tabs visual to read as the spine of the console. */}
      <div className="medpod-tabstrip" style={{
        display: "flex", gap: 6, marginBottom: 10,
        overflowX: "auto", WebkitOverflowScrolling: "touch",
        paddingBottom: 4, marginLeft: -8, paddingLeft: 8,
        marginRight: -8, paddingRight: 8,
      }}>
        {TAB_GROUPS.map((g) => {
          const Icon = g.icon;
          const active = groupId === g.id;
          return (
            <button key={g.id} onClick={() => switchGroup(g.id)} style={{
              padding: "10px 14px",
              border: `1px solid ${active ? g.accent : "var(--warm, rgba(0,0,0,0.08))"}`,
              borderRadius: 12,
              background: active ? `${g.accent}14` : "rgba(255,255,255,0.5)",
              color: active ? g.accent : "var(--ink, #2a2320)",
              fontSize: 12,
              fontWeight: active ? 800 : 600,
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: "0.01em",
              cursor: "pointer",
              whiteSpace: "nowrap",
              display: "flex", alignItems: "center", gap: 8,
              transition: "all 0.18s",
              flexShrink: 0,
            }}>
              <Icon size={14} style={{ color: g.accent }} />
              {g.label}
            </button>
          );
        })}
      </div>

      {/* SECONDARY sub-tab strip — children of the active group only */}
      <div className="medpod-tabstrip" style={{
        display: "flex", gap: 2, marginBottom: 24,
        overflowX: "auto", WebkitOverflowScrolling: "touch",
        paddingBottom: 4, marginLeft: -8, paddingLeft: 8,
        marginRight: -8, paddingRight: 8,
        borderBottom: "1px solid var(--warm, rgba(0,0,0,0.06))",
      }}>
        {activeGroup.tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "8px 12px",
              border: "none",
              borderBottom: `2px solid ${active ? activeGroup.accent : "transparent"}`,
              borderRadius: 0,
              background: "transparent",
              color: active ? activeGroup.accent : "var(--muted, rgba(0,0,0,0.45))",
              fontSize: 11,
              fontWeight: active ? 700 : 500,
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: "0.02em",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "color 0.18s, border-color 0.18s",
              marginBottom: -1,
            }}>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {tab === "command"   && <CommandCenter stats={stats} recentTrips={recentTrips} onNavigate={setTab} />}
      {tab === "india"     && <IndiaCoverageMap />}
      {tab === "dispatch"  && <DispatchBoard onRefresh={refresh} />}
      {tab === "fleet"     && <FleetPanel />}
      {tab === "crew"      && <HRMSPanel />}
      {tab === "hospitals" && <HospitalPanel />}
      {tab === "stock"     && <StockPanel />}
      {tab === "crm"        && <CRMPanel />}
      {tab === "patients"   && <PatientsPanel />}
      {tab === "pcr"        && <PCRPanel />}
      {tab === "billing"    && <BillingPanel />}
      {tab === "payments"   && <PaymentsPanel />}
      {tab === "compliance" && <CompliancePanel />}
      {tab === "broadcasts" && <BroadcastsPanel />}
      {tab === "audit"      && <AuditLogPanel />}
      {tab === "mentor"     && <MentorPanel />}
      {tab === "brain"      && <BrainPanel />}
      {tab === "field"      && <FieldEntry />}
      {tab === "admin"      && <AdminPanel />}
    </div>
    {/* Persistent Emergency floater — global on every MedPod tab */}
    <MedPodEmergencyFloater />
    </div>
  );
}

// Lightweight wrapper so the floater can reach useDispatchData().createTrip
// without turning the main MedPodNexus function into a mega-context mess.
function MedPodEmergencyFloater() {
  const { createTrip } = useDispatchData();
  return <EmergencyFloater createTrip={createTrip} />;
}

// ═══════════════════════════════════════════════════════════════
// COMMAND CENTER — Aggregated dashboard
// ═══════════════════════════════════════════════════════════════
function CommandCenter({ stats, recentTrips, onNavigate }) {
  const s = stats || {};
  const { expiringItems = [] } = useStockData();
  const { crew = [] } = useCrewData();
  const { ambulances = [] } = useFleetData();

  // Shelf-life triage — red < 7d, amber 8-14d, green 15-30d
  const expiringBuckets = useMemo(() => {
    const now = Date.now();
    const buckets = { red: 0, amber: 0, green: 0 };
    for (const item of expiringItems) {
      const exp = item?.expiry_date ? new Date(item.expiry_date).getTime() : null;
      if (!exp) continue;
      const days = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
      if (days <= 7)       buckets.red   += 1;
      else if (days <= 14) buckets.amber += 1;
      else if (days <= 30) buckets.green += 1;
    }
    return buckets;
  }, [expiringItems]);

  // Federal-compliance expiry rollup: crew licenses + vehicle fitness/permit/insurance/PUC
  const complianceBuckets = useMemo(() => {
    const now = Date.now();
    const buckets = { expired: 0, red: 0, amber: 0, green: 0 };
    const check = (dateStr) => {
      if (!dateStr) return;
      const t = new Date(dateStr).getTime();
      if (Number.isNaN(t)) return;
      const days = Math.ceil((t - now) / (1000 * 60 * 60 * 24));
      if (days < 0) buckets.expired += 1;
      else if (days <= 30) buckets.red   += 1;
      else if (days <= 90) buckets.amber += 1;
      else buckets.green += 1;
    };
    for (const m of crew) {
      check(m.certification_expiry);
      check(m.license_expiry);
    }
    for (const a of ambulances) {
      check(a.fitness_expiry);
      check(a.permit_expiry);
      check(a.insurance_expiry);
      check(a.puc_expiry);
    }
    return buckets;
  }, [crew, ambulances]);

  const expiringAccent = expiringBuckets.red > 0 ? "#ef4444"
                        : expiringBuckets.amber > 0 ? "#f59e0b"
                        : "#22c55e";
  const expiringTotal = expiringBuckets.red + expiringBuckets.amber + expiringBuckets.green;
  const expiringSub = expiringBuckets.red > 0
    ? `${expiringBuckets.red} within 7 days · ${expiringBuckets.amber} in 14`
    : expiringBuckets.amber > 0
      ? `${expiringBuckets.amber} within 14 days`
      : `${expiringBuckets.green} within 30 days`;

  // Compliance expiry card
  const complianceAccent = complianceBuckets.expired > 0 ? "#ef4444"
                         : complianceBuckets.red > 0    ? "#ef4444"
                         : complianceBuckets.amber > 0  ? "#f59e0b"
                         : "#22c55e";
  const complianceTotal = complianceBuckets.expired + complianceBuckets.red + complianceBuckets.amber;
  const complianceSub = complianceBuckets.expired > 0
    ? `${complianceBuckets.expired} EXPIRED · ${complianceBuckets.red} due <30d`
    : complianceBuckets.red > 0
      ? `${complianceBuckets.red} due within 30 days`
      : complianceBuckets.amber > 0
        ? `${complianceBuckets.amber} due within 90 days`
        : "All current";

  return (
    <div>
      <SectionHeader icon={Target} title="Command Center" accent="#22c55e" />

      {/* Stat grid — Active Trips reads as the hero (2x), supporting cards
          flow around it. Per design direction §"Stat card hierarchy". */}
      <div className="medpod-stat-grid" style={{ marginBottom: 24 }}>
        <StatCard
          hero
          icon={Siren}
          label="Active Trips"
          value={s.active_trips || 0}
          accent="#ef4444"
          sub={`of ${s.total_trips || 0} total · ${s.trips_pending || 0} pending`}
          onClick={() => onNavigate("dispatch")}
        />
        <StatCard icon={Truck} label="Fleet" value={s.fleet_available || 0} accent="#3b82f6" sub={`of ${s.fleet_total || 0} units`} onClick={() => onNavigate("fleet")} />
        <StatCard icon={Users} label="Crew" value={s.crew_available || 0} accent="#8b5cf6" sub={`${s.crew_on_duty || 0} on duty`} onClick={() => onNavigate("crew")} />
        <StatCard icon={Building2} label="Beds" value={s.hospital_beds_available || 0} accent="#06b6d4" sub={`${s.hospitals || 0} hospitals`} onClick={() => onNavigate("hospitals")} />
        <StatCard icon={AlertTriangle} label="Low Stock" value={s.stock_low || 0} accent="#f59e0b" sub={`${s.stock_items || 0} items`} onClick={() => onNavigate("stock")} />
        <StatCard
          icon={Clock}
          label="Expiring Soon"
          value={expiringTotal}
          accent={expiringAccent}
          sub={expiringSub}
          onClick={() => onNavigate("stock")}
        />
        <StatCard
          icon={Shield}
          label="Compliance"
          value={complianceTotal}
          accent={complianceAccent}
          sub={complianceSub}
          onClick={() => onNavigate("crew")}
        />
      </div>

      {/* Live Operations · pending & ongoing trips on the left,
          fleet map in the centre. Stacks vertically on small screens. */}
      <div className="medpod-ops-grid" style={{ marginBottom: 16 }}>
        <ActiveTripsSidebar onNavigate={onNavigate} />
        <div>
          <SectionHeader icon={MapPin} title="Fleet Positions" accent="#3b82f6" />
          <div style={{ borderRadius: 14, overflow: "hidden" }}>
            <FleetMap height="540px" />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <RecentTripsWidget trips={recentTrips} />
    </div>
  );
}

// ── Active Trips Sidebar — Pending + Ongoing ────────────────────
// Filters out completed/cancelled. Red dot = P1, orange = P2/3,
// slate = P4. Tap a trip to jump to Dispatch tab.
function ActiveTripsSidebar({ onNavigate }) {
  const { trips } = useDispatchData();
  const active = useMemo(
    () => (trips || []).filter((t) => !["completed", "cancelled"].includes(t.status)),
    [trips]
  );
  const pendingCount  = active.filter((t) => t.status === "pending").length;
  const ongoingCount  = active.length - pendingCount;

  const priorityDot = (p) => {
    if (p === 1) return "#ef4444";
    if (p === 2 || p === 3) return "#f59e0b";
    return "#64748b";
  };
  const statusColor = (s) => ({
    pending:       "#ef4444",
    dispatched:    "#3b82f6",
    en_route:      "#3b82f6",
    on_scene:      "#f59e0b",
    transporting:  "#8b5cf6",
    at_hospital:   "#06b6d4",
  }[s] || "#8a7e70");

  const timeAgo = (iso) => {
    if (!iso) return "";
    const m = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
    if (m < 1)  return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 540 }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 10,
      }}>
        <SectionHeader icon={Siren} title="Active Emergencies" accent="#ef4444" />
        <div style={{ display: "flex", gap: 4, marginTop: -6 }}>
          {pendingCount > 0 && (
            <span style={{
              padding: "2px 7px", borderRadius: 999,
              background: "rgba(239,68,68,0.14)", color: "#ef4444",
              fontSize: 9, fontWeight: 900, letterSpacing: "0.08em",
            }}>
              {pendingCount} NEW
            </span>
          )}
          {ongoingCount > 0 && (
            <span style={{
              padding: "2px 7px", borderRadius: 999,
              background: "rgba(59,130,246,0.14)", color: "#3b82f6",
              fontSize: 9, fontWeight: 900, letterSpacing: "0.08em",
            }}>
              {ongoingCount} LIVE
            </span>
          )}
        </div>
      </div>

      <div style={{
        flex: 1, overflowY: "auto",
        display: "flex", flexDirection: "column", gap: 6,
        paddingRight: 4,
        maxHeight: 540,
      }}>
        {active.length === 0 ? (
          <div style={{
            padding: "24px 14px", borderRadius: 12,
            background: "rgba(34,197,94,0.06)",
            border: "1px dashed rgba(34,197,94,0.25)",
            fontSize: 11, color: "#16a34a", textAlign: "center", lineHeight: 1.6,
          }}>
            ✓ No pending or ongoing emergencies
            <br />
            <span style={{ fontSize: 10, color: "#8a7e70", fontWeight: 600 }}>
              Fleet is idle · all clear
            </span>
          </div>
        ) : (
          active.map((t) => {
            const dot = priorityDot(t.priority);
            const sColor = statusColor(t.status);
            return (
              <button
                key={t.id}
                onClick={() => onNavigate("dispatch")}
                style={{
                  textAlign: "left", cursor: "pointer",
                  padding: "10px 12px", borderRadius: 12,
                  background: "white", border: "1px solid rgba(0,0,0,0.08)",
                  display: "flex", flexDirection: "column", gap: 4,
                  transition: "transform 0.12s, border-color 0.12s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${sColor}55`;
                  e.currentTarget.style.transform = "translateX(2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(0,0,0,0.08)";
                  e.currentTarget.style.transform = "translateX(0)";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    width: 10, height: 10, borderRadius: "50%",
                    background: dot, flexShrink: 0,
                    boxShadow: t.priority === 1 ? `0 0 0 3px ${dot}22` : "none",
                    animation: t.priority === 1 ? "pulse-g 1.5s ease-in-out infinite" : "none",
                  }} />
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#2a2320", textTransform: "capitalize" }}>
                    {(t.emergency_type || "emergency").replace(/_/g, " ")}
                  </span>
                  <span style={{ marginLeft: "auto", fontSize: 9, color: "#8a7e70", fontFamily: "'JetBrains Mono', monospace" }}>
                    {String(t.id).slice(0, 8)}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{
                    fontSize: 9, fontWeight: 800, letterSpacing: "0.06em",
                    padding: "2px 7px", borderRadius: 4,
                    background: `${sColor}18`, color: sColor,
                    textTransform: "uppercase",
                  }}>
                    {(t.status || "").replace(/_/g, " ")}
                  </span>
                  <span style={{ fontSize: 10, color: "#8a7e70" }}>
                    {timeAgo(t.created_at || t.dispatch_created_at)}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: "#8a7e70", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t.incident_address || t.location || "Location pending"}
                </div>
                {t.ambulance?.call_sign && (
                  <div style={{ fontSize: 10, color: "#3b82f6", fontWeight: 700 }}>
                    🚑 {t.ambulance.call_sign}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>

      <button
        onClick={() => onNavigate("dispatch")}
        style={{
          marginTop: 10, padding: "10px 14px", borderRadius: 10,
          background: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.25)",
          color: "#ef4444", fontSize: 11, fontWeight: 800,
          letterSpacing: "0.06em", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}
      >
        OPEN DISPATCH BOARD →
      </button>
    </div>
  );
}

// ── Recent Trips Widget ───────────────────────────────────────
function RecentTripsWidget({ trips: propTrips }) {
  const trips = propTrips || [];

  return (
    <div>
      <SectionHeader icon={Activity} title="Recent Dispatches" accent="#f59e0b" />
      {trips.length === 0 ? (
        <EmptyState icon={Activity} message="No dispatch data" sub="Trips will appear when created" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {trips.map((trip, i) => {
            const pr = PRIORITY_MAP[trip.priority] || PRIORITY_MAP[3];
            const st = STATUS_COLOR[trip.status] || STATUS_COLOR.pending;
            return (
              <div key={trip.id || i} className="glass-card" style={{ borderRadius: 10, padding: "10px 14px", borderLeft: `3px solid ${pr.color}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", fontFamily: "monospace" }}>
                      {trip.episode_id?.slice(0, 8) || trip.id?.toString().slice(0, 8)}
                    </span>
                    <Pill color={pr.color} bg={pr.bg} pulse={pr.pulse}>{pr.label}</Pill>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: st.dot }} />
                    <span style={{ fontSize: 10, color: st.dot, fontWeight: 600 }}>{st.label}</span>
                  </div>
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
                  {trip.incident_address || trip.emergency_type || "—"}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DISPATCH BOARD — Emergency creation + trip management
// ═══════════════════════════════════════════════════════════════
function DispatchBoard({ onRefresh }) {
  const { trips: dispatchTrips, loading: dLoading, refresh: dRefresh, createTrip, updateTripStatus, assignAmbulance } = useDispatchData();
  const [creating, setCreating] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [selected, setSelected] = useState(null);
  const EMPTY_FORM = {
    caller_phone: "", incident_address: "", priority: 2,
    emergency_type: "accident", requester_type: "user",
    patient_name: "", patient_contact: "",
    relative_name: "", relative_contact: "",
    drop_address: "", is_scheduled: false,
  };
  const [form, setForm] = useState(EMPTY_FORM);

  const handleCreate = async () => {
    if (!form.caller_phone && !form.incident_address) return;
    await createTrip({
      ...form,
      incident_lat: 28.6139 + (Math.random() - 0.5) * 0.05,
      incident_lng: 77.2090 + (Math.random() - 0.5) * 0.05,
    });
    setCreating(false);
    setForm(EMPTY_FORM);
    onRefresh();
  };

  const handleQuickCreate = async (body) => {
    const resp = await createTrip(body);
    onRefresh();
    return resp;
  };

  const activeTrips = dispatchTrips.filter(t => !["completed", "cancelled"].includes(t.status));
  const doneTrips   = dispatchTrips.filter(t => t.status === "completed").slice(0, 5);
  const NEXT_STATUS = { pending: "dispatched", dispatched: "en_route", en_route: "on_scene", on_scene: "transporting", transporting: "at_hospital", at_hospital: "completed" };

  return (
    <div>
      <SectionHeader icon={Siren} title="Emergency Dispatch" accent="#d24b3a" />

      {/* Ops grid — sidebar left · map right (mirrors Command Center) */}
      <div className="medpod-ops-grid">

        {/* ── LEFT SIDEBAR ──────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

          {/* Action bar */}
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => { setCreating(!creating); setAdvancedMode(false); }}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "10px 0", borderRadius: 10,
                background: creating ? "rgba(210,75,58,0.18)" : "#d24b3a",
                border: `1.5px solid ${creating ? "rgba(210,75,58,0.4)" : "#d24b3a"}`,
                color: creating ? "#d24b3a" : "#fff",
                fontSize: 12, fontWeight: 800, cursor: "pointer",
                letterSpacing: "0.05em",
                boxShadow: creating ? "none" : "0 4px 14px rgba(210,75,58,0.3)",
                transition: "all 0.2s",
              }}
            >
              {creating ? <X size={14} /> : <Plus size={14} />}
              {creating ? "CANCEL" : "NEW EMERGENCY"}
            </button>
            {creating && (
              <button
                onClick={() => setAdvancedMode(!advancedMode)}
                style={{
                  padding: "10px 12px", borderRadius: 10,
                  background: advancedMode ? "rgba(46,123,196,0.12)" : "#f3ece0",
                  border: `1.5px solid ${advancedMode ? "rgba(46,123,196,0.3)" : "#e8dfd2"}`,
                  color: advancedMode ? "#2e7bc4" : "#8a7e70",
                  fontSize: 10, fontWeight: 700, cursor: "pointer", letterSpacing: "0.04em",
                  whiteSpace: "nowrap",
                }}
              >
                {advancedMode ? "QUICK" : "ADVANCED"}
              </button>
            )}
          </div>

          {/* 3-Click Quick Create */}
          {creating && !advancedMode && (
            <DispatchQuickCreate onCreate={handleQuickCreate} onCancel={() => setCreating(false)} />
          )}

          {/* Advanced 11-field form */}
          {creating && advancedMode && (
            <div style={{
              background: "#fff", border: "1.5px solid #f3ece0", borderLeft: "3px solid #d24b3a",
              borderRadius: 12, padding: 14,
            }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#d24b3a", marginBottom: 10, letterSpacing: "0.08em" }}>
                EMERGENCY REGISTRATION
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                <Input placeholder="Caller phone" value={form.caller_phone} onChange={e => setForm(f => ({ ...f, caller_phone: e.target.value }))} />
                <Select value={form.emergency_type} onChange={e => setForm(f => ({ ...f, emergency_type: e.target.value }))}>
                  {EMERGENCY_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                </Select>
                <div style={{ gridColumn: "1 / -1" }}>
                  <Input placeholder="Incident address (pickup)" value={form.incident_address} onChange={e => setForm(f => ({ ...f, incident_address: e.target.value }))} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <Input placeholder="Drop-off address" value={form.drop_address} onChange={e => setForm(f => ({ ...f, drop_address: e.target.value }))} />
                </div>
                <Select value={form.requester_type} onChange={e => setForm(f => ({ ...f, requester_type: e.target.value }))}>
                  <option value="user">User / Caller</option>
                  <option value="hospital">Hospital</option>
                  <option value="operator">Operator</option>
                </Select>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#8a7e70", cursor: "pointer" }}>
                  <input type="checkbox" checked={form.is_scheduled} onChange={e => setForm(f => ({ ...f, is_scheduled: e.target.checked }))} style={{ accentColor: "#2e7bc4" }} />
                  Scheduled transport
                </label>
                <Input placeholder="Patient name"  value={form.patient_name}    onChange={e => setForm(f => ({ ...f, patient_name: e.target.value }))} />
                <Input placeholder="Patient phone" value={form.patient_contact} onChange={e => setForm(f => ({ ...f, patient_contact: e.target.value }))} />
                <Input placeholder="Relative name" value={form.relative_name}   onChange={e => setForm(f => ({ ...f, relative_name: e.target.value }))} />
                <Input placeholder="Relative phone" value={form.relative_contact} onChange={e => setForm(f => ({ ...f, relative_contact: e.target.value }))} />
              </div>
              {/* Priority selector */}
              <div style={{ display: "flex", gap: 5, margin: "10px 0 8px" }}>
                {[1, 2, 3, 4].map(p => (
                  <button key={p} onClick={() => setForm(f => ({ ...f, priority: p }))} style={{
                    flex: 1, padding: "6px 0", borderRadius: 6, fontSize: 10, fontWeight: 700,
                    background: form.priority === p ? PRIORITY_MAP[p].bg : "#f3ece0",
                    border: `1.5px solid ${form.priority === p ? PRIORITY_MAP[p].color + "60" : "#e8dfd2"}`,
                    color: form.priority === p ? PRIORITY_MAP[p].color : "#8a7e70",
                    cursor: "pointer",
                  }}>P{p}</button>
                ))}
              </div>
              <button onClick={handleCreate} style={{
                width: "100%", padding: "10px", borderRadius: 8, fontWeight: 800, fontSize: 12,
                background: "#d24b3a", border: "none", color: "#fff", cursor: "pointer",
                boxShadow: "0 4px 14px rgba(210,75,58,0.3)", letterSpacing: "0.05em",
              }}>
                DISPATCH EMERGENCY
              </button>
            </div>
          )}

          {/* ── Active Trips ───────────────────────────────────── */}
          <div style={{
            fontSize: 10, fontWeight: 700, color: "#8a7e70",
            letterSpacing: "0.09em", textTransform: "uppercase",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span>Active · {activeTrips.length}</span>
            <button onClick={() => { dRefresh(); onRefresh?.(); }} style={{
              background: "none", border: "none", color: "#2e7bc4",
              fontSize: 10, fontWeight: 700, cursor: "pointer", letterSpacing: "0.05em",
            }}>↻ REFRESH</button>
          </div>

          <div style={{
            display: "flex", flexDirection: "column", gap: 7,
            overflowY: "auto", maxHeight: 460,
            paddingRight: 2,
          }}>
            {activeTrips.length === 0 ? (
              <div style={{
                padding: "20px 14px", borderRadius: 12, textAlign: "center",
                background: "#f3ece0", border: "1px solid #e8dfd2",
              }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>✓</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#2a2320" }}>All clear</div>
                <div style={{ fontSize: 10, color: "#8a7e70", marginTop: 3 }}>No active dispatches</div>
              </div>
            ) : (
              activeTrips.map(trip => {
                const pr   = PRIORITY_MAP[trip.priority] || PRIORITY_MAP[3];
                const st   = STATUS_COLOR[trip.status]   || STATUS_COLOR.pending;
                const next = NEXT_STATUS[trip.status];
                const isOpen = selected === trip.id;

                return (
                  <div
                    key={trip.id}
                    onClick={() => setSelected(isOpen ? null : trip.id)}
                    style={{
                      background: "#fff", borderRadius: 12, padding: "11px 13px",
                      border: "1px solid #f3ece0", borderLeft: `3px solid ${pr.color}`,
                      cursor: "pointer", transition: "box-shadow 0.2s",
                      boxShadow: isOpen ? `0 4px 16px ${pr.color}18` : "0 1px 0 rgba(42,35,32,0.02)",
                    }}
                  >
                    {/* Row 1: ID + priority + status */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "#2a2320", fontFamily: "monospace" }}>
                          {trip.episode_id?.slice(0, 8) || `#${trip.id?.toString().slice(0, 6)}`}
                        </span>
                        <Pill color={pr.color} bg={pr.bg} pulse={pr.pulse}>{pr.label}</Pill>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: st.dot }} />
                        <span style={{ fontSize: 9, fontWeight: 700, color: st.dot }}>{st.label}</span>
                      </div>
                    </div>

                    {/* Row 2: type + address */}
                    {trip.emergency_type && (
                      <div style={{ fontSize: 9, fontWeight: 700, color: pr.color, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 3 }}>
                        {trip.emergency_type.replace(/_/g, " ")}
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 5, marginBottom: 4 }}>
                      <MapPin size={10} style={{ color: "#8a7e70", flexShrink: 0, marginTop: 1 }} />
                      <span style={{ fontSize: 10, color: "#8a7e70", lineHeight: 1.4 }}>
                        {trip.incident_address || "Address pending"}
                      </span>
                    </div>

                    {/* Row 3: meta pills */}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {trip.caller_phone  && <MetaItem icon={Phone} text={trip.caller_phone} />}
                      {trip.patient_name  && <MetaItem icon={Heart} text={trip.patient_name} />}
                      {trip.ambulance?.call_sign && <MetaItem icon={Truck} text={trip.ambulance.call_sign} color="#2e7bc4" />}
                    </div>

                    {/* Expanded: advance + cancel buttons */}
                    {isOpen && (
                      <div style={{ marginTop: 9, paddingTop: 9, borderTop: "1px solid #f3ece0", display: "flex", flexDirection: "column", gap: 6 }}>
                        {next && (
                          <button
                            onClick={e => { e.stopPropagation(); updateTripStatus(trip.id, next); }}
                            style={{
                              width: "100%", padding: "8px 0", borderRadius: 8,
                              background: `${st.dot}14`, border: `1.5px solid ${st.dot}40`,
                              color: st.dot, fontSize: 11, fontWeight: 700, cursor: "pointer",
                              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                              letterSpacing: "0.05em",
                            }}
                          >
                            <ArrowUpRight size={12} />
                            ADVANCE → {(STATUS_COLOR[next]?.label || next).toUpperCase()}
                          </button>
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); updateTripStatus(trip.id, "cancelled"); }}
                          style={{
                            width: "100%", padding: "7px 0", borderRadius: 8,
                            background: "transparent", border: "1.5px solid #f3ece0",
                            color: "#8a7e70", fontSize: 10, fontWeight: 700, cursor: "pointer",
                            letterSpacing: "0.05em",
                          }}
                        >
                          CANCEL TRIP
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* ── Completed (mini log) ───────────────────────────── */}
          {doneTrips.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#8a7e70", letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: 6 }}>
                Completed · {doneTrips.length}
              </div>
              {doneTrips.map(trip => (
                <div key={trip.id} style={{
                  borderRadius: 8, padding: "7px 12px", marginBottom: 4,
                  background: "#f3ece0", border: "1px solid #e8dfd2",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#2a2320", fontFamily: "monospace" }}>
                    {trip.episode_id?.slice(0, 8) || `#${trip.id?.toString().slice(0, 6)}`}
                  </span>
                  <span style={{ fontSize: 9, color: "#8a7e70" }}>
                    {trip.completed_at ? new Date(trip.completed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "done"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: Fleet Map ────────────────────────────────── */}
        <div>
          <SectionHeader icon={MapPin} title="Live Fleet Positions" accent="#2e7bc4" />
          <div style={{ borderRadius: 14, overflow: "hidden" }}>
            <FleetMap height="540px" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaItem({ icon: Icon, text, color = "rgba(255,255,255,0.25)" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <Icon size={10} style={{ color }} />
      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}>{text}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FLEET PANEL — Asset management
// ═══════════════════════════════════════════════════════════════
function FleetPanel() {
  const { ambulances, locations, onlineCount, availableCount, loading, refresh, createAmbulance, updateAmbulance } = useFleetData();
  const [feedUnits, setFeedUnits] = useState([]);
  const [feedFiles, setFeedFiles] = useState([]);
  const [creating, setCreating] = useState(false);
  const [docsUnit, setDocsUnit] = useState(null);
  const [checkingRc, setCheckingRc] = useState(null);

  const runParivahanCheck = async (unit) => {
    if (!unit?.registration_number) return;
    setCheckingRc(unit.id);
    try {
      const res = await fetch("/api/nexus/federal/parivahan/rc-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicle_no: unit.registration_number }),
      });
      const json = await res.json();
      if (res.ok) {
        await updateAmbulance(unit.id, {
          fitness_expiry:   json.data.fitness_expiry,
          permit_expiry:    json.data.permit_expiry,
          insurance_expiry: json.data.insurance_expiry,
          puc_expiry:       json.data.puc_expiry,
          rc_last_checked_at: json.data.checked_at,
        });
      }
    } catch (e) {
      console.warn("[fleet] parivahan check failed", e);
    } finally {
      setCheckingRc(null);
    }
  };
  const [form, setForm] = useState({
    call_sign: "", vehicle_type: "", registration_number: "", station_id: "",
    operator_id: "", permit_no: "", permit_expiry: "", year_of_make: "",
  });

  useEffect(() => {
    let active = true;

    const readFolderFeed = async () => {
      try {
        const res = await fetch("/api/medpods/tracking");
        const data = await res.json();
        if (!active) return;
        setFeedUnits(Array.isArray(data.units) ? data.units : []);
        setFeedFiles(Array.isArray(data.source_files) ? data.source_files : []);
      } catch {
        if (!active) return;
        setFeedUnits([]);
        setFeedFiles([]);
      }
    };

    readFolderFeed();
    const timer = setInterval(readFolderFeed, 10000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const handleCreate = async () => {
    if (!form.call_sign || !form.vehicle_type || !form.registration_number) return;
    await createAmbulance(form);
    setCreating(false);
    setForm({ call_sign: "", vehicle_type: "", registration_number: "", station_id: "", operator_id: "", permit_no: "", permit_expiry: "", year_of_make: "" });
  };

  // Merge location data into ambulances
  const units = ambulances.length > 0 ? ambulances : (locations.length > 0 ? locations : feedUnits);
  const AMB_STATUS = { available: "#22c55e", dispatched: "#3b82f6", offline: "#6b7280", maintenance: "#f59e0b" };

  return (
    <div>
      <SectionHeader icon={Truck} title="Fleet & Asset Management" accent="#3b82f6"
        action={
          <button onClick={() => setCreating(!creating)} style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "6px 12px", borderRadius: 8,
            background: creating ? "rgba(59,130,246,0.25)" : "rgba(59,130,246,0.12)",
            border: "1px solid rgba(59,130,246,0.3)",
            color: "#3b82f6", fontSize: 10, fontWeight: 700, cursor: "pointer",
          }}>
            {creating ? <X size={12} /> : <Plus size={12} />}
            {creating ? "CANCEL" : "NEW AMBULANCE"}
          </button>
        }
      />

      {creating && (
        <div className="glass-card" style={{ borderRadius: 14, padding: 16, marginBottom: 14, borderLeft: "3px solid #3b82f6" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#3b82f6", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Ambulance Registration
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Input placeholder="Call sign *" value={form.call_sign} onChange={e => setForm(f => ({ ...f, call_sign: e.target.value }))} />
            <Select value={form.vehicle_type} onChange={e => setForm(f => ({ ...f, vehicle_type: e.target.value }))}>
              <option value="">Vehicle type *</option>
              <option value="BLS">BLS</option>
              <option value="ALS">ALS</option>
              <option value="MICU">MICU</option>
            </Select>
            <Input placeholder="Registration number *" value={form.registration_number} onChange={e => setForm(f => ({ ...f, registration_number: e.target.value }))} />
            <Input placeholder="Station ID" value={form.station_id} onChange={e => setForm(f => ({ ...f, station_id: e.target.value }))} />
            <Input placeholder="Operator ID" value={form.operator_id} onChange={e => setForm(f => ({ ...f, operator_id: e.target.value }))} />
            <Input placeholder="Permit no." value={form.permit_no} onChange={e => setForm(f => ({ ...f, permit_no: e.target.value }))} />
            <input type="date" value={form.permit_expiry} onChange={e => setForm(f => ({ ...f, permit_expiry: e.target.value }))} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 12, outline: "none" }} />
            <Input placeholder="Year e.g. 2023" value={form.year_of_make} onChange={e => setForm(f => ({ ...f, year_of_make: e.target.value }))} />
          </div>
          <button onClick={handleCreate} style={{
            width: "100%", padding: "10px", borderRadius: 8, fontWeight: 700, fontSize: 12, marginTop: 10,
            background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", border: "none", color: "#fff", cursor: "pointer",
          }}>REGISTER AMBULANCE</button>
        </div>
      )}

      {/* Summary */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto" }}>
        {Object.entries(AMB_STATUS).map(([status, color]) => {
          const count = units.filter(u => u.status === status).length;
          return <StatCard key={status} icon={Truck} label={status} value={count} accent={color} />;
        })}
      </div>

      {feedFiles.length > 0 && (
        <div className="glass-card" style={{ borderRadius: 12, padding: "10px 12px", marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
            Folder Feed Source (Amb_Ref)
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {feedFiles.map((f) => (
              <span key={f.name} style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", fontFamily: "monospace" }}>
                {f.relative_path} · {f.records}
              </span>
            ))}
          </div>
        </div>
      )}

      {units.length === 0 ? (
        <EmptyState icon={Truck} message="No fleet data" sub="Units appear when registered" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {units.map((amb, i) => {
            const color = AMB_STATUS[amb.status] || "#6b7280";
            // Feed-only units (from /api/medpods/tracking) have no DB id → not editable
            const hasId = !!amb.id && typeof amb.id === "string" && amb.id.startsWith("amb");

            // Nearest compliance deadline across fitness / permit / insurance / puc
            const deadlines = [
              amb.fitness_expiry, amb.permit_expiry, amb.insurance_expiry, amb.puc_expiry,
            ].filter(Boolean);
            let nearestDeadline = null;
            let nearestLabel = null;
            for (const d of deadlines) {
              const t = new Date(d).getTime();
              if (Number.isNaN(t)) continue;
              if (nearestDeadline == null || t < nearestDeadline) {
                nearestDeadline = t;
                nearestLabel = d === amb.fitness_expiry ? "FIT"
                             : d === amb.permit_expiry ? "PER"
                             : d === amb.insurance_expiry ? "INS" : "PUC";
              }
            }
            const nearestDays = nearestDeadline != null ? Math.ceil((nearestDeadline - Date.now()) / 86400000) : null;
            const rcColor = nearestDays == null ? null
                          : nearestDays < 0 ? "#ef4444"
                          : nearestDays <= 30 ? "#ef4444"
                          : nearestDays <= 90 ? "#f59e0b"
                          : "#22c55e";

            return (
            <div key={amb.id || i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <InlineEditRow
                row={amb}
                accent="#3b82f6"
                canEdit={hasId}
                fields={[
                  { key: "call_sign",           label: "Call sign",    type: "text",   editable: true },
                  { key: "vehicle_type",        label: "Type",         type: "select", editable: true,
                    options: [
                      { value: "BLS",     label: "BLS · Basic" },
                      { value: "ALS",     label: "ALS · Advanced" },
                      { value: "MICU",    label: "MICU · Mobile ICU" },
                      { value: "Cardiac", label: "Cardiac" },
                      { value: "Neonatal",label: "Neonatal" },
                    ] },
                  { key: "status",              label: "Status",       type: "select", editable: true,
                    options: [
                      { value: "available",   label: "Available" },
                      { value: "dispatched",  label: "Dispatched" },
                      { value: "maintenance", label: "Maintenance" },
                      { value: "offline",     label: "Offline" },
                    ] },
                  { key: "registration_number", label: "Reg #",        type: "text",   editable: true },
                  { key: "permit_no",           label: "Permit #",     type: "text",   editable: true },
                  { key: "permit_expiry",       label: "Permit expiry",type: "date",   editable: true },
                  { key: "year_of_make",        label: "Year",         type: "number", editable: true },
                  { key: "station_id",          label: "Station",      type: "text",   editable: true },
                ]}
                onSave={(id, patch) => updateAmbulance(id, patch)}
                renderView={(r) => (
                  <div style={{ borderRadius: 12, padding: "12px 14px", background: "white", border: "1px solid rgba(0,0,0,0.08)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingRight: hasId ? 34 : 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Truck size={18} style={{ color }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: "#2a2320" }}>
                            {r.call_sign || `Unit #${r.id}`}
                          </div>
                          <div style={{ fontSize: 10, color: "#8a7e70" }}>
                            {r.vehicle_type || r.type || "ALS"}
                            {r.registration_number && ` · ${r.registration_number}`}
                            {r.operator_id && ` · Op #${r.operator_id}`}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        {rcColor && (
                          <span
                            title="Nearest compliance deadline (Fitness/Permit/Insurance/PUC)"
                            style={{
                              fontSize: 9, fontWeight: 800, letterSpacing: "0.04em",
                              padding: "3px 8px", borderRadius: 999,
                              background: `${rcColor}18`, color: rcColor,
                            }}
                          >
                            {nearestLabel} {nearestDays < 0 ? `EXPIRED ${-nearestDays}d` : `${nearestDays}d`}
                          </span>
                        )}
                        <Pill color={color} bg={`${color}18`}>{r.status || "unknown"}</Pill>
                      </div>
                    </div>
                    {(r.current_lat || r.lat) && (
                      <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                        <Navigation size={10} style={{ color: "#8a7e70" }} />
                        <span style={{ fontSize: 9, color: "#8a7e70", fontFamily: "'JetBrains Mono', monospace" }}>
                          {Number(r.current_lat || r.lat).toFixed(4)}, {Number(r.current_lng || r.lng).toFixed(4)}
                        </span>
                        {r.permit_no && <span style={{ fontSize: 9, color: "#8a7e70" }}>Permit: {r.permit_no}</span>}
                        {r.rc_last_checked_at && (
                          <span style={{ fontSize: 9, color: "#16a34a" }}>
                            ✓ Parivahan {new Date(r.rc_last_checked_at).toLocaleDateString("en-IN")}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              />
              {/* Federal-compliance action bar */}
              {hasId && (
                <div style={{ display: "flex", gap: 6, paddingLeft: 6 }}>
                  <button
                    onClick={() => runParivahanCheck(amb)}
                    disabled={!amb.registration_number || checkingRc === amb.id}
                    style={{
                      padding: "5px 10px", borderRadius: 8,
                      background: "rgba(46,123,196,0.08)",
                      border: "1px solid rgba(46,123,196,0.3)",
                      color: "#2e7bc4", fontSize: 10, fontWeight: 800, letterSpacing: "0.04em",
                      cursor: checkingRc === amb.id ? "wait" : "pointer",
                      opacity: amb.registration_number ? 1 : 0.4,
                      display: "flex", alignItems: "center", gap: 4,
                    }}
                  >
                    🚗 {checkingRc === amb.id ? "CHECKING PARIVAHAN…" : "CHECK PARIVAHAN RC"}
                  </button>
                  <button
                    onClick={() => setDocsUnit(amb)}
                    style={{
                      padding: "5px 10px", borderRadius: 8,
                      background: "rgba(139,92,246,0.08)",
                      border: "1px solid rgba(139,92,246,0.3)",
                      color: "#8b5cf6", fontSize: 10, fontWeight: 800, letterSpacing: "0.04em",
                      cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 4,
                    }}
                  >
                    📄 DOCUMENTS {Array.isArray(amb.documents) && amb.documents.length > 0 ? `(${amb.documents.length})` : ""}
                  </button>
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}

      {/* Fleet documents modal */}
      {docsUnit && (
        <DocumentsPanel
          entity="fleet"
          entityId={docsUnit.id}
          entityName={docsUnit.call_sign || `Unit ${docsUnit.id}`}
          documents={Array.isArray(docsUnit.documents) ? docsUnit.documents : []}
          onSave={(patch) => updateAmbulance(docsUnit.id, patch)}
          onClose={() => setDocsUnit(null)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// HRMS PANEL — Crew management
// ═══════════════════════════════════════════════════════════════
function HRMSPanel() {
  const { crew, availableCount, onDutyCount, loading, refresh, createCrewMember, updateCrewMember } = useCrewData();
  const [attestingMember, setAttestingMember] = useState(null);    // crew row
  const [docsMember, setDocsMember] = useState(null);              // crew row

  const handleAttested = async (kyc) => {
    if (!attestingMember) return setAttestingMember(null);
    try {
      await updateCrewMember(attestingMember.id, {
        aadhaar_ref_id:       kyc.aadhaar_ref_id,
        aadhaar_masked:       kyc.aadhaar_masked,
        aadhaar_verified_at:  kyc.verified_at,
        kyc_name:             kyc.name,
        kyc_dob:              kyc.dob,
        kyc_gender:           kyc.gender,
      });
    } catch (e) {
      console.warn("[HRMS] attest save failed", e);
    } finally {
      setAttestingMember(null);
    }
  };
  const [filter, setFilter] = useState("all");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "", employee_id: "", role: "", phone: "", email: "", dob: "",
    blood_group: "", license_number: "", city: "", state: "", address: "",
  });

  const handleCreate = async () => {
    if (!form.name || !form.employee_id || !form.role) return;
    await createCrewMember(form);
    setCreating(false);
    setForm({ name: "", employee_id: "", role: "", phone: "", email: "", dob: "", blood_group: "", license_number: "", city: "", state: "", address: "" });
  };

  const CREW_STATUS = { available: "#22c55e", on_duty: "#3b82f6", off_duty: "#6b7280" };
  const ROLES = { paramedic: "#8b5cf6", emt: "#3b82f6", driver: "#f59e0b", doctor: "#ef4444" };
  const filtered = filter === "all" ? crew : crew.filter(c => c.status === filter || c.role === filter);

  return (
    <div>
      <SectionHeader icon={UserCog} title="Human Resources" accent="#8b5cf6"
        action={
          <button onClick={() => setCreating(!creating)} style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "6px 12px", borderRadius: 8,
            background: creating ? "rgba(139,92,246,0.25)" : "rgba(139,92,246,0.12)",
            border: "1px solid rgba(139,92,246,0.3)",
            color: "#8b5cf6", fontSize: 10, fontWeight: 700, cursor: "pointer",
          }}>
            {creating ? <X size={12} /> : <Plus size={12} />}
            {creating ? "CANCEL" : "NEW CREW"}
          </button>
        }
      />

      {creating && (
        <div className="glass-card" style={{ borderRadius: 14, padding: 16, marginBottom: 14, borderLeft: "3px solid #8b5cf6" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#8b5cf6", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Crew Member Registration
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Input placeholder="Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <Input placeholder="Employee ID *" value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))} />
            <Select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="">Role *</option>
              <option value="paramedic">Paramedic</option>
              <option value="emt">EMT</option>
              <option value="driver">Driver</option>
              <option value="doctor">Doctor</option>
            </Select>
            <Input placeholder="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            <Input placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            <input type="date" value={form.dob} onChange={e => setForm(f => ({ ...f, dob: e.target.value }))} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 12, outline: "none" }} />
            <Select value={form.blood_group} onChange={e => setForm(f => ({ ...f, blood_group: e.target.value }))}>
              <option value="">Blood Group</option>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(bg => <option key={bg} value={bg}>{bg}</option>)}
            </Select>
            <Input placeholder="License number" value={form.license_number} onChange={e => setForm(f => ({ ...f, license_number: e.target.value }))} />
            <Input placeholder="City" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
            <Input placeholder="State" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} />
            <div style={{ gridColumn: "1 / -1" }}>
              <Input placeholder="Address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
          </div>
          <button onClick={handleCreate} style={{
            width: "100%", padding: "10px", borderRadius: 8, fontWeight: 700, fontSize: 12, marginTop: 10,
            background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", border: "none", color: "#fff", cursor: "pointer",
          }}>REGISTER CREW MEMBER</button>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12, overflowX: "auto" }}>
        {["all", "available", "on_duty", "paramedic", "emt", "driver", "doctor"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "5px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600,
            background: filter === f ? "rgba(139,92,246,0.12)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${filter === f ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.06)"}`,
            color: filter === f ? "#8b5cf6" : "rgba(255,255,255,0.4)", cursor: "pointer", textTransform: "capitalize",
          }}>
            {f.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto" }}>
        <StatCard icon={Users} label="Total" value={crew.length} accent="#8b5cf6" />
        <StatCard icon={CheckCircle2} label="Available" value={crew.filter(c => c.status === "available").length} accent="#22c55e" />
        <StatCard icon={Activity} label="On Duty" value={crew.filter(c => c.status === "on_duty").length} accent="#3b82f6" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} message="No crew data" sub="Personnel appear when registered" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((m, i) => {
            const statusColor = CREW_STATUS[m.status] || "#6b7280";
            const roleColor = ROLES[m.role] || "#6b7280";

            // License / cert expiry in days
            const expiryDate = m.certification_expiry || m.license_expiry || null;
            const expiryDays = expiryDate ? Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000) : null;
            const expiryColor =
              expiryDays == null ? null
              : expiryDays < 0 ? "#ef4444"
              : expiryDays <= 30 ? "#ef4444"
              : expiryDays <= 90 ? "#f59e0b"
              : "#22c55e";
            const isAttested = !!m.aadhaar_verified_at;

            return (
            <div key={m.id || i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <InlineEditRow
                row={m}
                accent="#8b5cf6"
                fields={[
                  { key: "full_name",      label: "Name",          type: "text",   editable: true },
                  { key: "role",           label: "Role",          type: "select", editable: true,
                    options: [
                      { value: "paramedic", label: "Paramedic" },
                      { value: "emt",       label: "EMT" },
                      { value: "driver",    label: "Driver" },
                      { value: "doctor",    label: "Doctor" },
                      { value: "nurse",     label: "Nurse" },
                    ] },
                  { key: "status",         label: "Status",        type: "select", editable: true,
                    options: [
                      { value: "available",  label: "Available" },
                      { value: "on_duty",    label: "On duty" },
                      { value: "off_duty",   label: "Off duty" },
                      { value: "on_leave",   label: "On leave" },
                    ] },
                  { key: "phone",                label: "Phone",              type: "tel",    editable: true },
                  { key: "email",                label: "Email",              type: "email",  editable: true },
                  { key: "license_number",       label: "License #",          type: "text",   editable: true },
                  { key: "certification_expiry", label: "Cert expiry",        type: "date",   editable: true },
                  { key: "station_id",           label: "Station",            type: "text",   editable: true },
                ]}
                onSave={(id, patch) => updateCrewMember(id, patch)}
                renderView={(r) => {
                  const displayName = r.kyc_name || r.full_name || r.name || `Crew #${r.id}`;
                  return (
                    <div style={{ borderRadius: 12, padding: "12px 14px", background: "white", border: "1px solid rgba(0,0,0,0.08)" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, paddingRight: 34 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${roleColor}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: roleColor }}>
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 13, fontWeight: 800, color: "#2a2320" }}>{displayName}</span>
                              {isAttested && (
                                <span
                                  title={`UIDAI verified · ${new Date(r.aadhaar_verified_at).toLocaleDateString("en-IN")}`}
                                  style={{
                                    padding: "1px 6px", borderRadius: 4,
                                    background: "rgba(34,197,94,0.14)", color: "#16a34a",
                                    fontSize: 8, fontWeight: 900, letterSpacing: "0.08em",
                                    display: "inline-flex", alignItems: "center", gap: 3,
                                  }}
                                >
                                  ✓ AADHAAR
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 10, color: "#8a7e70" }}>
                              {r.role || "EMT"}{r.station_id ? ` · ${r.station_id}` : ""}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          {expiryColor && (
                            <span style={{
                              fontSize: 9, fontWeight: 800, letterSpacing: "0.04em",
                              padding: "3px 8px", borderRadius: 999,
                              background: `${expiryColor}18`, color: expiryColor,
                            }}>
                              {expiryDays < 0 ? `EXPIRED ${-expiryDays}d` : `LIC ${expiryDays}d`}
                            </span>
                          )}
                          <Pill color={statusColor} bg={`${statusColor}18`}>{r.status || "—"}</Pill>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 10, color: "#8a7e70" }}>
                        {r.phone && <span>📞 {r.phone}</span>}
                        {r.email && <span>✉️ {r.email}</span>}
                        {r.license_number && <span>Lic: {r.license_number}</span>}
                        {r.aadhaar_masked && <span style={{ color: "#16a34a", fontFamily: "'JetBrains Mono', monospace" }}>🆔 {r.aadhaar_masked}</span>}
                      </div>
                    </div>
                  );
                }}
              />
              {/* Federal-compliance action bar */}
              <div style={{ display: "flex", gap: 6, paddingLeft: 6 }}>
                <button
                  onClick={() => setAttestingMember(m)}
                  style={{
                    padding: "5px 10px", borderRadius: 8,
                    background: isAttested ? "rgba(34,197,94,0.08)" : "rgba(46,123,196,0.08)",
                    border: `1px solid ${isAttested ? "rgba(34,197,94,0.3)" : "rgba(46,123,196,0.3)"}`,
                    color: isAttested ? "#16a34a" : "#2e7bc4",
                    fontSize: 10, fontWeight: 800, cursor: "pointer", letterSpacing: "0.04em",
                    display: "flex", alignItems: "center", gap: 4,
                  }}
                >
                  🛡 {isAttested ? "RE-ATTEST AADHAAR" : "ATTEST AADHAAR"}
                </button>
                <button
                  onClick={() => setDocsMember(m)}
                  style={{
                    padding: "5px 10px", borderRadius: 8,
                    background: "rgba(139,92,246,0.08)",
                    border: "1px solid rgba(139,92,246,0.3)",
                    color: "#8b5cf6",
                    fontSize: 10, fontWeight: 800, cursor: "pointer", letterSpacing: "0.04em",
                    display: "flex", alignItems: "center", gap: 4,
                  }}
                >
                  📄 DOCUMENTS {Array.isArray(m.documents) && m.documents.length > 0 ? `(${m.documents.length})` : ""}
                </button>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Attestation modal */}
      {attestingMember && (
        <AadhaarAttestPanel
          prefillName={attestingMember.full_name || attestingMember.name}
          onComplete={handleAttested}
          onCancel={() => setAttestingMember(null)}
        />
      )}

      {/* Documents modal */}
      {docsMember && (
        <DocumentsPanel
          entity="crew"
          entityId={docsMember.id}
          entityName={docsMember.full_name || docsMember.name || `Crew #${docsMember.id}`}
          documents={Array.isArray(docsMember.documents) ? docsMember.documents : []}
          onSave={(patch) => updateCrewMember(docsMember.id, patch)}
          onClose={() => setDocsMember(null)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// HOSPITAL PANEL
// ═══════════════════════════════════════════════════════════════
function HospitalPanel() {
  const { hospitals, totalBeds, availableBeds, loading, refresh, createHospital, updateHospital } = useHospitalData();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "", type: "", phone: "", emergency_contact: "", bed_capacity: "",
    available_beds: "", address: "",
  });

  const handleCreate = async () => {
    if (!form.name || !form.type) return;
    await createHospital(form);
    setCreating(false);
    setForm({ name: "", type: "", phone: "", emergency_contact: "", bed_capacity: "", available_beds: "", address: "" });
  };

  return (
    <div>
      <SectionHeader icon={Building2} title="Hospital Network" accent="#06b6d4"
        action={
          <button onClick={() => setCreating(!creating)} style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "6px 12px", borderRadius: 8,
            background: creating ? "rgba(6,182,212,0.25)" : "rgba(6,182,212,0.12)",
            border: "1px solid rgba(6,182,212,0.3)",
            color: "#06b6d4", fontSize: 10, fontWeight: 700, cursor: "pointer",
          }}>
            {creating ? <X size={12} /> : <Plus size={12} />}
            {creating ? "CANCEL" : "NEW HOSPITAL"}
          </button>
        }
      />

      {creating && (
        <div className="glass-card" style={{ borderRadius: 14, padding: 16, marginBottom: 14, borderLeft: "3px solid #06b6d4" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#06b6d4", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Hospital Registration
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Input placeholder="Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <Select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="">Type *</option>
              <option value="General">General</option>
              <option value="Multi-Specialty">Multi-Specialty</option>
              <option value="Trauma Center">Trauma Center</option>
              <option value="Cardiac">Cardiac</option>
              <option value="Maternity">Maternity</option>
              <option value="Eye">Eye</option>
              <option value="Government">Government</option>
              <option value="Private">Private</option>
            </Select>
            <Input placeholder="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            <Input placeholder="Emergency contact" value={form.emergency_contact} onChange={e => setForm(f => ({ ...f, emergency_contact: e.target.value }))} />
            <Input placeholder="Bed capacity" type="number" value={form.bed_capacity} onChange={e => setForm(f => ({ ...f, bed_capacity: e.target.value }))} />
            <Input placeholder="Available beds" type="number" value={form.available_beds} onChange={e => setForm(f => ({ ...f, available_beds: e.target.value }))} />
            <div style={{ gridColumn: "1 / -1" }}>
              <Input placeholder="Address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
          </div>
          <button onClick={handleCreate} style={{
            width: "100%", padding: "10px", borderRadius: 8, fontWeight: 700, fontSize: 12, marginTop: 10,
            background: "linear-gradient(135deg, #06b6d4, #0891b2)", border: "none", color: "#fff", cursor: "pointer",
          }}>REGISTER HOSPITAL</button>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto" }}>
        <StatCard icon={Building2} label="Hospitals" value={hospitals.length} accent="#06b6d4" />
        <StatCard icon={Heart} label="Total Beds" value={hospitals.reduce((s, h) => s + (h.bed_capacity || 0), 0)} accent="#8b5cf6" />
        <StatCard icon={CheckCircle2} label="Available" value={hospitals.reduce((s, h) => s + (h.available_beds || 0), 0)} accent="#22c55e" />
      </div>

      {hospitals.length === 0 ? (
        <EmptyState icon={Building2} message="No hospital data" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {hospitals.map((h, i) => {
            const bedPct = h.bed_capacity ? Math.round((h.available_beds / h.bed_capacity) * 100) : 0;
            const bedColor = bedPct > 30 ? "#22c55e" : bedPct > 10 ? "#f59e0b" : "#ef4444";
            return (
              <InlineEditRow
                key={h.id || i}
                row={h}
                accent="#06b6d4"
                fields={[
                  { key: "name",              label: "Name",            type: "text",   editable: true },
                  { key: "area",              label: "Area",            type: "text",   editable: true },
                  { key: "city",              label: "City",            type: "text",   editable: true },
                  { key: "bed_capacity",      label: "Bed capacity",    type: "number", editable: true },
                  { key: "available_beds",    label: "Available beds",  type: "number", editable: true },
                  { key: "phone",             label: "Phone",           type: "tel",    editable: true },
                  { key: "rating",            label: "Rating",          type: "number", editable: true },
                  { key: "fee",               label: "Consult fee",     type: "number", editable: true },
                  { key: "website",           label: "Website",         type: "text",   editable: true },
                ]}
                onSave={(id, patch) => updateHospital(id, patch)}
                renderView={(r) => (
                  <div style={{ borderRadius: 12, padding: 14, background: "white", border: "1px solid rgba(0,0,0,0.08)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, paddingRight: 34 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#2a2320" }}>{r.name}</div>
                        <div style={{ fontSize: 10, color: "#8a7e70", marginTop: 2 }}>
                          {[r.area, r.city].filter(Boolean).join(" · ") || "—"}
                          {r.rating != null && <span> · ★ {r.rating}</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: bedColor }}>{r.available_beds || 0}</div>
                        <div style={{ fontSize: 9, color: "#8a7e70", letterSpacing: "0.04em" }}>of {r.bed_capacity || 0} beds</div>
                      </div>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: "rgba(0,0,0,0.06)" }}>
                      <div style={{ height: "100%", borderRadius: 2, background: bedColor, width: `${bedPct}%`, transition: "width 0.3s" }} />
                    </div>
                    {(r.phone || r.fee || r.specialties) && (
                      <div style={{ marginTop: 8, display: "flex", gap: 12, fontSize: 10, color: "#8a7e70", flexWrap: "wrap" }}>
                        {r.phone && <span>📞 {r.phone}</span>}
                        {r.fee != null && <span>💰 ₹{r.fee}</span>}
                        {Array.isArray(r.specialties) && r.specialties.length > 0 && (
                          <span>· {r.specialties.slice(0, 3).join(", ")}</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STOCK / INVENTORY PANEL
// ═══════════════════════════════════════════════════════════════
function StockPanel() {
  const { items, lowStockItems, expiringItems, loading, refresh, createStockItem, updateStockItem } = useStockData();
  const [filter, setFilter] = useState("all");
  const [creating, setCreating] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanHint, setScanHint] = useState(null);
  const [form, setForm] = useState({
    name: "", category: "", sku: "", quantity_on_hand: "", reorder_level: "",
    unit: "", expiry_date: "", manufacturer: "", unit_cost: "", batch_number: "",
  });

  const handleCreate = async () => {
    if (!form.name || !form.category || !form.sku) return;
    await createStockItem(form);
    setCreating(false);
    setScanHint(null);
    setForm({ name: "", category: "", sku: "", quantity_on_hand: "", reorder_level: "", unit: "", expiry_date: "", manufacturer: "", unit_cost: "", batch_number: "" });
  };

  const handleScanDetect = (parsed /* { gtin, lot, expiry_date, name?, manufacturer?, category?, unit? } */) => {
    setScanning(false);
    setCreating(true);
    setForm((f) => ({
      ...f,
      name:         parsed.name         || f.name,
      manufacturer: parsed.manufacturer || f.manufacturer,
      category:     parsed.category     || f.category,
      unit:         parsed.unit         || f.unit,
      sku:          parsed.gtin         || f.sku,
      expiry_date:  parsed.expiry_date  || f.expiry_date,
      batch_number: parsed.lot          || f.batch_number,
    }));
    setScanHint({
      matched: !!parsed.name,
      gtin: parsed.gtin,
      lot: parsed.lot,
      expiry: parsed.expiry_date,
    });
  };

  const stock = items;
  const expiring = expiringItems;
  const lowStock = lowStockItems;
  const CATS = { medicine: "#ef4444", equipment: "#3b82f6", consumable: "#22c55e" };
  const filtered = filter === "all" ? stock : stock.filter(s => s.category === filter);

  return (
    <div>
      <SectionHeader icon={Package} title="Inventory Management" accent="#22c55e"
        action={
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setScanning(true)} style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "6px 12px", borderRadius: 8,
              background: "rgba(46,123,196,0.14)",
              border: "1px solid rgba(46,123,196,0.3)",
              color: "#2e7bc4", fontSize: 10, fontWeight: 700, cursor: "pointer",
              letterSpacing: "0.04em",
            }}>
              <Scan size={12} /> SCAN BARCODE
            </button>
            <button onClick={() => setCreating(!creating)} style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "6px 12px", borderRadius: 8,
              background: creating ? "rgba(34,197,94,0.25)" : "rgba(34,197,94,0.12)",
              border: "1px solid rgba(34,197,94,0.3)",
              color: "#22c55e", fontSize: 10, fontWeight: 700, cursor: "pointer",
            }}>
              {creating ? <X size={12} /> : <Plus size={12} />}
              {creating ? "CANCEL" : "NEW ITEM"}
            </button>
          </div>
        }
      />

      {scanning && (
        <BarcodeScanPanel
          onDetect={handleScanDetect}
          onCancel={() => setScanning(false)}
        />
      )}

      {scanHint && (
        <div style={{
          marginBottom: 12, padding: "10px 14px", borderRadius: 10,
          background: scanHint.matched ? "rgba(34,197,94,0.08)" : "rgba(46,123,196,0.08)",
          border: `1px solid ${scanHint.matched ? "rgba(34,197,94,0.25)" : "rgba(46,123,196,0.25)"}`,
          fontSize: 11, color: scanHint.matched ? "#16a34a" : "#2e7bc4",
          display: "flex", alignItems: "center", gap: 8, fontWeight: 600,
        }}>
          <CheckCircle2 size={13} />
          <span>
            {scanHint.matched ? "Catalog match · " : "Scanned · "}
            GTIN {scanHint.gtin}
            {scanHint.expiry && ` · expires ${scanHint.expiry}`}
            {scanHint.lot && ` · lot ${scanHint.lot}`}
            {" — fields below auto-filled. Add quantity + save."}
          </span>
        </div>
      )}

      {creating && (
        <div className="glass-card" style={{ borderRadius: 14, padding: 16, marginBottom: 14, borderLeft: "3px solid #22c55e" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#22c55e", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Stock Item Registration
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Input placeholder="Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <Select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              <option value="">Category *</option>
              <option value="medicine">Medicine</option>
              <option value="equipment">Equipment</option>
              <option value="consumable">Consumable</option>
            </Select>
            <Input placeholder="SKU *" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} />
            <Input placeholder="Quantity on hand" type="number" value={form.quantity_on_hand} onChange={e => setForm(f => ({ ...f, quantity_on_hand: e.target.value }))} />
            <Input placeholder="Reorder level" type="number" value={form.reorder_level} onChange={e => setForm(f => ({ ...f, reorder_level: e.target.value }))} />
            <Input placeholder="e.g. units, ml, pcs" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />
            <input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 12, outline: "none" }} />
            <Input placeholder="Manufacturer" value={form.manufacturer} onChange={e => setForm(f => ({ ...f, manufacturer: e.target.value }))} />
            <Input placeholder="Cost per unit" value={form.unit_cost} onChange={e => setForm(f => ({ ...f, unit_cost: e.target.value }))} />
            <Input placeholder="Batch number" value={form.batch_number} onChange={e => setForm(f => ({ ...f, batch_number: e.target.value }))} />
          </div>
          <button onClick={handleCreate} style={{
            width: "100%", padding: "10px", borderRadius: 8, fontWeight: 700, fontSize: 12, marginTop: 10,
            background: "linear-gradient(135deg, #22c55e, #16a34a)", border: "none", color: "#fff", cursor: "pointer",
          }}>ADD STOCK ITEM</button>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto" }}>
        <StatCard icon={Package} label="Total Items" value={stock.length} accent="#22c55e" />
        <StatCard icon={AlertTriangle} label="Low Stock" value={lowStock.length} accent="#ef4444" />
        <StatCard icon={Clock} label="Expiring" value={expiring.length} accent="#f59e0b" />
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
        {["all", "medicine", "equipment", "consumable"].map(c => (
          <button key={c} onClick={() => setFilter(c)} style={{
            padding: "5px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600, textTransform: "capitalize",
            background: filter === c ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${filter === c ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.06)"}`,
            color: filter === c ? "#22c55e" : "rgba(255,255,255,0.4)", cursor: "pointer",
          }}>
            {c}
          </button>
        ))}
      </div>

      {/* Low Stock Alerts */}
      {lowStock.length > 0 && filter === "all" && (
        <div style={{ marginBottom: 16 }}>
          <SectionHeader icon={AlertTriangle} title="Low Stock Alerts" accent="#ef4444" />
          {lowStock.map((item, i) => (
            <div key={item.id || i} className="glass-card" style={{ borderRadius: 10, padding: "10px 14px", marginBottom: 4, borderLeft: "3px solid #ef4444" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>{item.name}</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: "#ef4444" }}>{item.quantity_on_hand ?? 0}</span>
              </div>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                Reorder at {item.reorder_level || 5} · {item.category} {item.ambulance_id ? `· Ambulance #${item.ambulance_id}` : item.station_id ? `· Station #${item.station_id}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Full Inventory */}
      {filtered.length === 0 ? (
        <EmptyState icon={Package} message="No stock data" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((item, i) => {
            const qty = item.quantity_on_hand ?? 0;
            const reorder = item.reorder_level || 5;
            const pct = Math.min(100, (qty / (reorder * 3)) * 100);
            const barColor = qty <= reorder ? "#ef4444" : pct < 50 ? "#f59e0b" : "#22c55e";
            const catColor = CATS[item.category] || "#6b7280";
            return (
              <InlineEditRow
                key={item.id || i}
                row={item}
                accent="#22c55e"
                fields={[
                  { key: "name",              label: "Name",         type: "text",   editable: true },
                  { key: "category",          label: "Category",     type: "select", editable: true,
                    options: [
                      { value: "medicine",    label: "Medicine" },
                      { value: "equipment",   label: "Equipment" },
                      { value: "consumable",  label: "Consumable" },
                    ] },
                  { key: "quantity",          label: "Quantity",     type: "number", editable: true },
                  { key: "reorder_threshold", label: "Reorder at",   type: "number", editable: true },
                  { key: "unit",              label: "Unit",         type: "text",   editable: true },
                  { key: "expiry_date",       label: "Expiry",       type: "date",   editable: true },
                  { key: "supplier",          label: "Supplier",     type: "text",   editable: true },
                  { key: "cost_per_unit",     label: "Cost / unit",  type: "number", editable: true },
                  { key: "sku",               label: "SKU / GTIN",   type: "text",   editable: true },
                ]}
                onSave={(id, patch) => updateStockItem(id, patch)}
                renderView={(r) => {
                  const q = r.quantity ?? r.quantity_on_hand ?? 0;
                  const reorder = r.reorder_threshold ?? r.reorder_level ?? 5;
                  const pctLocal = Math.min(100, (q / (reorder * 3)) * 100);
                  const barLocal = q <= reorder ? "#ef4444" : pctLocal < 50 ? "#f59e0b" : "#22c55e";
                  return (
                    <div style={{
                      borderRadius: 12, padding: "12px 14px",
                      background: "white", border: "1px solid rgba(0,0,0,0.08)",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, paddingRight: 34 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#2a2320", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {r.name}
                          </span>
                          <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 4, background: `${catColor}15`, color: catColor, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                            {r.category}
                          </span>
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 800, color: barLocal }}>
                          {q} <span style={{ fontSize: 10, fontWeight: 500, color: "#8a7e70" }}>{r.unit || "units"}</span>
                        </span>
                      </div>
                      <div style={{ height: 3, borderRadius: 2, background: "rgba(0,0,0,0.06)" }}>
                        <div style={{ height: "100%", borderRadius: 2, background: barLocal, width: `${pctLocal}%` }} />
                      </div>
                      {(r.expiry_date || r.supplier || r.sku) && (
                        <div style={{ marginTop: 6, fontSize: 10, color: "#8a7e70", display: "flex", gap: 10, flexWrap: "wrap" }}>
                          {r.expiry_date && <span>Exp: {new Date(r.expiry_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>}
                          {r.supplier    && <span>· {r.supplier}</span>}
                          {r.sku         && <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>· {r.sku}</span>}
                        </div>
                      )}
                    </div>
                  );
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CRM PANEL — Operator management
// ═══════════════════════════════════════════════════════════════
function CRMPanel() {
  const { operators, summary, selectedOperator, setSelectedOperator, loading, refresh, createOperator, updateOperatorStatus } = useCRMData();
  const [creating, setCreating] = useState(false);
  const [creatingEnquiry, setCreatingEnquiry] = useState(false);
  const [enquiryFilter, setEnquiryFilter] = useState("all");
  const [form, setForm] = useState({
    company_name: "", proprietor_name: "", proprietor_lastname: "", phone: "", email: "",
    city: "", state: "", pincode: "", fleet_size: "", address: "",
  });
  const [enquiryForm, setEnquiryForm] = useState({
    company_name: "", contact_name: "", phone: "", city: "", notes: "",
  });

  const handleCreate = async () => {
    if (!form.company_name || !form.proprietor_name) return;
    await createOperator(form);
    setCreating(false);
    setForm({ company_name: "", proprietor_name: "", proprietor_lastname: "", phone: "", email: "", city: "", state: "", pincode: "", fleet_size: "", address: "" });
  };

  const handleCreateEnquiry = async () => {
    if (!enquiryForm.company_name || !enquiryForm.contact_name) return;
    await createOperator({
      company_name: enquiryForm.company_name,
      proprietor_name: enquiryForm.contact_name,
      phone: enquiryForm.phone,
      city: enquiryForm.city,
      address: enquiryForm.notes,
      fleet_size: 0,
      status: "pending",
      enquiry_stage: "new",
      enquiry_created_at: new Date().toISOString(),
    });
    setCreatingEnquiry(false);
    setEnquiryForm({ company_name: "", contact_name: "", phone: "", city: "", notes: "" });
  };

  const handleConvertEnquiry = async (operatorId) => {
    if (!operatorId) return;
    await updateOperatorStatus(operatorId, "active", { enquiry_stage: "converted" });
  };

  const pendingEnquiries = operators.filter((o) => String(o.status || "").toLowerCase() === "pending").length;
  const convertedEnquiries = operators.filter((o) => String(o.enquiry_stage || "").toLowerCase() === "converted").length;
  const filteredOperators = operators.filter((op) => {
    const isPending = String(op.status || "").toLowerCase() === "pending";
    const isConverted = String(op.enquiry_stage || "").toLowerCase() === "converted";
    if (enquiryFilter === "pending") return isPending;
    if (enquiryFilter === "converted") return isConverted;
    if (enquiryFilter === "operators") return !isPending;
    return true;
  });

  return (
    <div>
      <SectionHeader icon={Briefcase} title="Operator CRM" accent="#22c55e"
        action={
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button onClick={() => setCreatingEnquiry(!creatingEnquiry)} style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "6px 12px", borderRadius: 8,
              background: creatingEnquiry ? "rgba(245,158,11,0.25)" : "rgba(245,158,11,0.12)",
              border: "1px solid rgba(245,158,11,0.3)",
              color: "#f59e0b", fontSize: 10, fontWeight: 700, cursor: "pointer",
            }}>
              {creatingEnquiry ? <X size={12} /> : <Plus size={12} />}
              {creatingEnquiry ? "CANCEL" : "NEW ENQUIRY"}
            </button>
            <button onClick={() => setCreating(!creating)} style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "6px 12px", borderRadius: 8,
              background: creating ? "rgba(34,197,94,0.25)" : "rgba(34,197,94,0.12)",
              border: "1px solid rgba(34,197,94,0.3)",
              color: "#22c55e", fontSize: 10, fontWeight: 700, cursor: "pointer",
            }}>
              {creating ? <X size={12} /> : <Plus size={12} />}
              {creating ? "CANCEL" : "NEW OPERATOR"}
            </button>
          </div>
        }
      />

      {creatingEnquiry && (
        <div className="glass-card" style={{ borderRadius: 14, padding: 16, marginBottom: 14, borderLeft: "3px solid #f59e0b" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Enquiry Capture
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Input placeholder="Company name *" value={enquiryForm.company_name} onChange={e => setEnquiryForm(f => ({ ...f, company_name: e.target.value }))} />
            <Input placeholder="Contact name *" value={enquiryForm.contact_name} onChange={e => setEnquiryForm(f => ({ ...f, contact_name: e.target.value }))} />
            <Input placeholder="Phone" value={enquiryForm.phone} onChange={e => setEnquiryForm(f => ({ ...f, phone: e.target.value }))} />
            <Input placeholder="City" value={enquiryForm.city} onChange={e => setEnquiryForm(f => ({ ...f, city: e.target.value }))} />
            <div style={{ gridColumn: "1 / -1" }}>
              <Input placeholder="Enquiry notes" value={enquiryForm.notes} onChange={e => setEnquiryForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <button onClick={handleCreateEnquiry} style={{
            width: "100%", padding: "10px", borderRadius: 8, fontWeight: 700, fontSize: 12, marginTop: 10,
            background: "linear-gradient(135deg, #f59e0b, #d97706)", border: "none", color: "#fff", cursor: "pointer",
          }}>CREATE ENQUIRY</button>
        </div>
      )}

      {creating && (
        <div className="glass-card" style={{ borderRadius: 14, padding: 16, marginBottom: 14, borderLeft: "3px solid #22c55e" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#22c55e", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Operator Registration
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Input placeholder="Company name *" value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} />
            <Input placeholder="Proprietor name *" value={form.proprietor_name} onChange={e => setForm(f => ({ ...f, proprietor_name: e.target.value }))} />
            <Input placeholder="Proprietor lastname" value={form.proprietor_lastname} onChange={e => setForm(f => ({ ...f, proprietor_lastname: e.target.value }))} />
            <Input placeholder="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            <Input placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            <Input placeholder="City" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
            <Input placeholder="State" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} />
            <Input placeholder="Pincode" value={form.pincode} onChange={e => setForm(f => ({ ...f, pincode: e.target.value }))} />
            <Input placeholder="Fleet size" type="number" value={form.fleet_size} onChange={e => setForm(f => ({ ...f, fleet_size: e.target.value }))} />
            <div style={{ gridColumn: "1 / -1" }}>
              <Input placeholder="Address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
          </div>
          <button onClick={handleCreate} style={{
            width: "100%", padding: "10px", borderRadius: 8, fontWeight: 700, fontSize: 12, marginTop: 10,
            background: "linear-gradient(135deg, #22c55e, #16a34a)", border: "none", color: "#fff", cursor: "pointer",
          }}>REGISTER OPERATOR</button>
        </div>
      )}

      {summary && (
        <div style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto" }}>
          <StatCard icon={Briefcase} label="Operators" value={summary.total || 0} accent="#22c55e" />
          <StatCard icon={CheckCircle2} label="Active" value={summary.active || 0} accent="#3b82f6" />
          <StatCard icon={Truck} label="Total Fleet" value={summary.total_fleet || 0} accent="#8b5cf6" />
          <StatCard icon={Clock} label="Enquiries" value={pendingEnquiries} accent="#f59e0b" sub="pending follow-up" />
          <StatCard icon={CheckCircle2} label="Converted" value={convertedEnquiries} accent="#22c55e" sub="enquiries converted" />
        </div>
      )}

      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {[
          { id: "all", label: "All" },
          { id: "pending", label: "Pending Enquiries" },
          { id: "converted", label: "Converted" },
          { id: "operators", label: "Operators" },
        ].map((f) => {
          const active = enquiryFilter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setEnquiryFilter(f.id)}
              style={{
                padding: "5px 10px",
                borderRadius: 7,
                border: `1px solid ${active ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.1)"}`,
                background: active ? "rgba(34,197,94,0.14)" : "rgba(255,255,255,0.04)",
                color: active ? "#22c55e" : "rgba(255,255,255,0.55)",
                fontSize: 10,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {filteredOperators.length === 0 ? (
        <EmptyState icon={Briefcase} message="No operator data" sub="CRM entries appear when operators are registered" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filteredOperators.map((op, i) => (
            <div key={op.id || i} className="glass-card glass-hover" style={{ borderRadius: 12, padding: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{op.company_name}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>
                    {op.proprietor_name} {op.proprietor_lastname || ""} · {op.city || ""}, {op.state || ""}
                  </div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>
                    Enquiry ID: {op.id || "—"}
                    {op.enquiry_created_at || op.created_at
                      ? ` · ${new Date(op.enquiry_created_at || op.created_at).toLocaleString()}`
                      : ""}
                  </div>
                </div>
                <Pill color={op.status === "active" ? "#22c55e" : "#6b7280"} bg={op.status === "active" ? "rgba(34,197,94,0.1)" : "rgba(107,114,128,0.1)"}>
                  {op.status}
                </Pill>
              </div>
              {String(op.status || "").toLowerCase() === "pending" && (
                <div style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <Pill color="#f59e0b" bg="rgba(245,158,11,0.12)">ENQUIRY</Pill>
                  <button
                    onClick={() => handleConvertEnquiry(op.id)}
                    style={{
                      padding: "4px 8px",
                      borderRadius: 6,
                      border: "1px solid rgba(34,197,94,0.35)",
                      background: "rgba(34,197,94,0.12)",
                      color: "#22c55e",
                      fontSize: 9,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    CONVERT TO OPERATOR
                  </button>
                </div>
              )}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <MetaItem icon={Truck} text={`Fleet: ${op.fleet_size || 0}`} color="#3b82f6" />
                {op.phone && <MetaItem icon={Phone} text={op.phone} />}
                {op.email && <MetaItem icon={Activity} text={op.email} />}
              </div>
              {op.contacts && op.contacts.length > 0 && (
                <div style={{ marginTop: 8, paddingTop: 6, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                  {op.contacts.map((c, ci) => (
                    <div key={ci} style={{ display: "flex", gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 9, color: "#22c55e", fontWeight: 600, textTransform: "uppercase" }}>{c.priority}</span>
                      <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>{c.contact_type}: {c.details}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PCR PANEL — GSPL PCR Form (exact replica)
// Component: GsplPcrForm (imported from ./nexus/GsplPcrForm.jsx)
// ═══════════════════════════════════════════════════════════════
// Old PCR_SECTION_FORMS + PcrField helpers removed — replaced by GsplPcrForm

function PCRPanel() {
  const { pcrs, selectedPcr, loading, fetchPcr, updateSection, createPcr } = usePCRData();
  const { writeAudit } = useNexusAudit({ role: "operator" });
  const [tripId, setTripId] = useState("");
  const [loadedData, setLoadedData] = useState(null);
  const [mode, setMode] = useState("lookup"); // "lookup" | "form"

  // Flatten all section_* JSON columns into a single object for the GSPL form
  const flattenPcrSections = (pcr) => {
    if (!pcr) return {};
    const flat = {};
    const sectionKeys = [
      "demographics","vitals","assessment","treatment","medications",
      "procedures","history","allergies","injury","cardiac","airway",
      "disposition","narrative","billing","crew_signatures"
    ];
    sectionKeys.forEach(s => {
      const data = pcr[`section_${s}`];
      if (data && typeof data === "object") Object.assign(flat, data);
    });
    return flat;
  };

  // Reverse: split flat form data back into section_* columns for API save
  const splitToSections = (formData) => {
    // Map GSPL fields → PCR section columns
    const sections = {
      demographics: {},
      vitals: {},
      assessment: {},
      treatment: {},
      medications: {},
      procedures: {},
      history: {},
      allergies: {},
      injury: {},
      cardiac: {},
      airway: {},
      disposition: {},
      narrative: {},
      billing: {},
      crew_signatures: {},
    };

    // Demographics
    ["patient_name","age","weight","blood_group","sex","occupation",
     "ration_card","insurance_company","id_mark","patient_address","pincode",
     "chief_complaint","duration","breathing","date","trip_no","city",
     "vehicle_location","driver_id","driver_name","incident_id","ambulance_no",
     "ambulance_type","location_code","relative_name","relative_phone",
     "attendant_name","attendant_phone","detail_address"
    ].forEach(k => { if (formData[k] !== undefined) sections.demographics[k] = formData[k]; });

    // Consciousness (AVPU)
    ["consciousness_alert","consciousness_verbal","consciousness_pain","consciousness_unresponsive"
    ].forEach(k => { if (formData[k] !== undefined) sections.assessment[k] = formData[k]; });

    // Timeline
    ["time_call_received","time_dispatch","time_crew_notified","time_en_route",
     "time_at_scene","time_patient_contact","time_left_scene","time_at_destination",
     "time_available","time_back_in_service","time_in_station"
    ].forEach(k => { if (formData[k] !== undefined) sections.disposition[k] = formData[k]; });

    // Past Illness → history
    ["pi_dm","pi_respiratory","pi_htn","pi_epilepsy","pi_hiv","pi_behavioural",
     "pi_cad","pi_surgeries","pi_stroke","pi_trauma"
    ].forEach(k => { if (formData[k] !== undefined) sections.history[k] = formData[k]; });

    // History of Medication → medications
    ["hm_antibiotics","hm_diuretics","hm_antidiabetics","hm_bronchodilators",
     "hm_antihypertensives","hm_antidepressants","hm_anticoagulants",
     "hm_antianginals","hm_nsaids","hm_anticancer"
    ].forEach(k => { if (formData[k] !== undefined) sections.medications[k] = formData[k]; });

    // Type of Case → injury
    ["type_of_emergency","cause","anatomical_area","mechanism_of_injury",
     "presenting_symptom_1","presenting_symptom_2","presenting_symptom_3"
    ].forEach(k => { if (formData[k] !== undefined) sections.injury[k] = formData[k]; });

    // Vital Signs → vitals (all vs_* fields)
    Object.keys(formData).filter(k => k.startsWith("vs_")).forEach(k => {
      sections.vitals[k] = formData[k];
    });

    // Pregnancy → cardiac (reusing section for pregnancy data)
    ["pregnancy","lmpdd","gravida","para","living","dead","abortions",
     "abnormal_bleeding","apgar_a","apgar_p","apgar_g","apgar_aa","apgar_r",
     "time_of_birth","baby_sex","aid_en_route","delivery_hospital_name",
     "delivery_hospital_phone"
    ].forEach(k => { if (formData[k] !== undefined) sections.cardiac[k] = formData[k]; });

    // Pre Hospital Care → treatment
    Object.keys(formData).filter(k => k.startsWith("phc_")).forEach(k => {
      sections.treatment[k] = formData[k];
    });

    // Events During Transport → airway
    if (formData.edt_status !== undefined) sections.airway.edt_status = formData.edt_status;

    // Physician Name & Advice → procedures
    ["dr_name","no_of_times","medicines_used"
    ].forEach(k => { if (formData[k] !== undefined) sections.procedures[k] = formData[k]; });

    // Operational decisions + equipment handover + signoff → disposition
    ["delay_reaching_patient","destination_determination","reason_not_serving",
     "reason_not_proceeded_code","traffic_condition_code","transport_decline_form_signed",
     "refusal_against_medical","self_determination","refusal_against_transport",
     "restraints_used","destination_diversion","medical_decline_form_signed",
     "treated_and_discharged","other_medical_authorities","do_not_resuscitate",
     "equipment_1","equipment_2","equipment_3","equipment_4","equipment_5","equipment_6",
     "receiver_name_sign","receiver_contact","emt_id_no","emt_name","emt_signed_by",
     "dest_hospital_name","dest_hospital_phone","arrival_time_hospital",
     "comments_receiving_hospital","hospital_signed_by","hospital_seal",
     "designation","date_time","patient_attendant_sign"
    ].forEach(k => { if (formData[k] !== undefined) sections.disposition[k] = formData[k]; });

    // EMT Summary → narrative
    if (formData.emt_summary_notes !== undefined) sections.narrative.emt_summary_notes = formData.emt_summary_notes;

    // Sub-pages: Patient Transfer → billing
    Object.keys(formData).filter(k => k.startsWith("pt_")).forEach(k => {
      sections.billing[k] = formData[k];
    });

    // Fuel Mileage → billing
    Object.keys(formData).filter(k => k.startsWith("fm_")).forEach(k => {
      sections.billing[k] = formData[k];
    });

    // Petty Cash → billing
    Object.keys(formData).filter(k => k.startsWith("pc_")).forEach(k => {
      sections.billing[k] = formData[k];
    });

    // EMT Handing → crew_signatures
    Object.keys(formData).filter(k => k.startsWith("eh_")).forEach(k => {
      sections.crew_signatures[k] = formData[k];
    });

    // Allergies
    if (formData.allergies !== undefined) sections.allergies.allergies = formData.allergies;
    if (formData.habits !== undefined) sections.allergies.habits = formData.habits;
    if (formData.family_doctor !== undefined) sections.allergies.family_doctor = formData.family_doctor;
    if (formData.medical_advice !== undefined) sections.allergies.medical_advice = formData.medical_advice;

    return sections;
  };

  const loadPcr = async (id) => {
    const r = await fetchPcr(id);
    writeAudit({
      event: "PCR_OPENED",
      module: "NEXUS-PCR",
      payload: { pcr_id: id, found: !!r },
    });
    if (r) {
      setLoadedData(flattenPcrSections(r));
      setMode("form");
    }
  };

  const handleSave = async (formData) => {
    if (!selectedPcr?.id) return;
    const sections = splitToSections(formData);
    const sectionsTouched = [];
    for (const [sectionName, data] of Object.entries(sections)) {
      if (Object.keys(data).length > 0) {
        await updateSection(selectedPcr.id, sectionName, data);
        sectionsTouched.push(sectionName);
      }
    }
    writeAudit({
      event: "PCR_SECTIONS_SAVED",
      module: "NEXUS-PCR",
      payload: {
        pcr_id: selectedPcr.id,
        sections_touched: sectionsTouched,
        section_count: sectionsTouched.length,
      },
    });
  };

  const startNewPcr = () => {
    setLoadedData({});
    setMode("form");
  };

  return (
    <div>
      <SectionHeader icon={Clipboard} title="Pre-Hospital Care Record" accent="#f97316" />

      {mode === "lookup" ? (
        <>
          {/* Trip ID Lookup */}
          <div className="glass-card" style={{ borderRadius: 14, padding: 14, marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <Input placeholder="PCR ID (numeric)" value={tripId} onChange={e => setTripId(e.target.value)} />
              <button onClick={() => loadPcr(tripId)} style={{
                padding: "8px 16px", borderRadius: 8, background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.3)",
                color: "#f97316", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
              }}>
                <Search size={12} style={{ marginRight: 4 }} />LOAD
              </button>
              <button onClick={startNewPcr} style={{
                padding: "8px 16px", borderRadius: 8, background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)",
                color: "#22c55e", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
              }}>
                <Plus size={12} style={{ marginRight: 4 }} />NEW
              </button>
            </div>
          </div>
          <EmptyState icon={Clipboard} message="Enter a PCR ID or create new" sub="Load an existing patient care record or start a blank GSPL form" />
        </>
      ) : (
        <>
          <button onClick={() => setMode("lookup")} style={{
            padding: "6px 12px", borderRadius: 8, marginBottom: 12,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.5)", fontSize: 10, fontWeight: 700, cursor: "pointer",
          }}>
            &larr; Back to Lookup
          </button>
          <GsplPcrForm
            tripId={tripId}
            existingData={loadedData}
            onSave={handleSave}
          />
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// AI BRAIN PANEL
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// PATIENTS PANEL — nexus_patients registry
// ═══════════════════════════════════════════════════════════════
function PatientsPanel() {
  const { patients, loading, refresh, createPatient } = usePatientData();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    full_name: "", phone: "", email: "", dob: "", gender: "",
    blood_group: "", address: "", insurance_provider: "", insurance_id: "",
  });

  const handleCreate = async () => {
    if (!form.full_name) return;
    await createPatient(form);
    setCreating(false);
    setForm({ full_name: "", phone: "", email: "", dob: "", gender: "", blood_group: "", address: "", insurance_provider: "", insurance_id: "" });
  };

  return (
    <div>
      <SectionHeader icon={Heart} title="Patient Registry" accent="#ec4899"
        action={
          <button onClick={() => setCreating(!creating)} style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "6px 12px", borderRadius: 8,
            background: creating ? "rgba(236,72,153,0.25)" : "rgba(236,72,153,0.12)",
            border: "1px solid rgba(236,72,153,0.3)",
            color: "#ec4899", fontSize: 10, fontWeight: 700, cursor: "pointer",
          }}>
            {creating ? <X size={12} /> : <Plus size={12} />}
            {creating ? "CANCEL" : "NEW PATIENT"}
          </button>
        }
      />

      <div style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto" }}>
        <StatCard icon={Heart} label="Total Patients" value={patients.length} accent="#ec4899" />
        <StatCard icon={Shield} label="Insured" value={patients.filter(p => p.insurance_provider).length} accent="#22c55e" />
      </div>

      {creating && (
        <div className="glass-card" style={{ borderRadius: 14, padding: 16, marginBottom: 14, borderLeft: "3px solid #ec4899" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#ec4899", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Patient Registration
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Input placeholder="Full name *" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            <Input placeholder="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            <Input placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            <input type="date" value={form.dob} onChange={e => setForm(f => ({ ...f, dob: e.target.value }))} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 12, outline: "none" }} />
            <Select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
              <option value="">Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </Select>
            <Select value={form.blood_group} onChange={e => setForm(f => ({ ...f, blood_group: e.target.value }))}>
              <option value="">Blood Group</option>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(bg => <option key={bg} value={bg}>{bg}</option>)}
            </Select>
            <div style={{ gridColumn: "1 / -1" }}>
              <Input placeholder="Address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
            <Input placeholder="Insurance provider" value={form.insurance_provider} onChange={e => setForm(f => ({ ...f, insurance_provider: e.target.value }))} />
            <Input placeholder="Insurance / Policy ID" value={form.insurance_id} onChange={e => setForm(f => ({ ...f, insurance_id: e.target.value }))} />
          </div>
          <button onClick={handleCreate} style={{
            width: "100%", padding: "10px", borderRadius: 8, fontWeight: 700, fontSize: 12, marginTop: 10,
            background: "linear-gradient(135deg, #ec4899, #db2777)", border: "none", color: "#fff", cursor: "pointer",
          }}>REGISTER PATIENT</button>
        </div>
      )}

      {patients.length === 0 ? (
        <EmptyState icon={Heart} message="No patient records" sub="Patients appear when registered" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {patients.map((p, i) => (
            <div key={p.id || i} className="glass-card glass-hover" style={{ borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{p.full_name}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>
                    {p.gender || "—"} · {p.blood_group || "—"} {p.dob ? `· DOB: ${new Date(p.dob).toLocaleDateString()}` : ""}
                  </div>
                </div>
                {p.insurance_provider && (
                  <Pill color="#22c55e" bg="rgba(34,197,94,0.1)">Insured</Pill>
                )}
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {p.phone && <MetaItem icon={Phone} text={p.phone} />}
                {p.email && <MetaItem icon={Activity} text={p.email} />}
                {p.insurance_provider && <MetaItem icon={Shield} text={`${p.insurance_provider} #${p.insurance_id || "—"}`} color="#22c55e" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// BILLING PANEL — nexus_invoices
// ═══════════════════════════════════════════════════════════════
function BillingPanel() {
  const { invoices, revenueReport, loading, refresh, createInvoice } = useBillingData();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    trip_id: "", operator_id: "", patient_id: "", base_amount: "",
    tax_amount: "", discount_amount: "", due_date: "", payment_method: "",
  });

  const handleCreate = async () => {
    if (!form.trip_id || !form.base_amount) return;
    await createInvoice(form);
    setCreating(false);
    setForm({ trip_id: "", operator_id: "", patient_id: "", base_amount: "", tax_amount: "", discount_amount: "", due_date: "", payment_method: "" });
  };

  const STATUS_COLORS = { draft: "#6b7280", sent: "#3b82f6", paid: "#22c55e", overdue: "#ef4444", cancelled: "#6b7280" };

  return (
    <div>
      <SectionHeader icon={DollarSign} title="Billing & Invoices" accent="#10b981"
        action={
          <button onClick={() => setCreating(!creating)} style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "6px 12px", borderRadius: 8,
            background: creating ? "rgba(16,185,129,0.25)" : "rgba(16,185,129,0.12)",
            border: "1px solid rgba(16,185,129,0.3)",
            color: "#10b981", fontSize: 10, fontWeight: 700, cursor: "pointer",
          }}>
            {creating ? <X size={12} /> : <Plus size={12} />}
            {creating ? "CANCEL" : "NEW INVOICE"}
          </button>
        }
      />

      {creating && (
        <div className="glass-card" style={{ borderRadius: 14, padding: 16, marginBottom: 14, borderLeft: "3px solid #10b981" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#10b981", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Invoice Generation
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Input placeholder="Trip ID (UUID)" value={form.trip_id} onChange={e => setForm(f => ({ ...f, trip_id: e.target.value }))} />
            <Input placeholder="Operator ID" value={form.operator_id} onChange={e => setForm(f => ({ ...f, operator_id: e.target.value }))} />
            <Input placeholder="Patient ID" value={form.patient_id} onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))} />
            <Input placeholder="0.00" type="number" step="0.01" value={form.base_amount} onChange={e => setForm(f => ({ ...f, base_amount: e.target.value }))} />
            <Input placeholder="0.00" type="number" step="0.01" value={form.tax_amount} onChange={e => setForm(f => ({ ...f, tax_amount: e.target.value }))} />
            <Input placeholder="0.00" type="number" step="0.01" value={form.discount_amount} onChange={e => setForm(f => ({ ...f, discount_amount: e.target.value }))} />
            <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 12, outline: "none" }} />
            <Select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}>
              <option value="">Payment Method</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="UPI">UPI</option>
              <option value="Insurance">Insurance</option>
              <option value="Prepaid">Prepaid</option>
              <option value="Corporate">Corporate</option>
            </Select>
          </div>
          <button onClick={handleCreate} style={{
            width: "100%", padding: "10px", borderRadius: 8, fontWeight: 700, fontSize: 12, marginTop: 10,
            background: "linear-gradient(135deg, #10b981, #059669)", border: "none", color: "#fff", cursor: "pointer",
          }}>GENERATE INVOICE</button>
        </div>
      )}

      {revenueReport && (
        <div style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto" }}>
          <StatCard icon={DollarSign} label="Total Revenue" value={`₹${(revenueReport.total_revenue || 0).toLocaleString()}`} accent="#10b981" />
          <StatCard icon={FileText} label="Invoices" value={invoices.length} accent="#3b82f6" />
          <StatCard icon={AlertTriangle} label="Overdue" value={invoices.filter(inv => inv.status === "overdue").length} accent="#ef4444" />
          <StatCard icon={CheckCircle2} label="Paid" value={invoices.filter(inv => inv.status === "paid").length} accent="#22c55e" />
        </div>
      )}

      {invoices.length === 0 ? (
        <EmptyState icon={DollarSign} message="No invoices yet" sub="Invoices are generated from completed trips" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {invoices.map((inv, i) => {
            const sc = STATUS_COLORS[inv.status] || "#6b7280";
            return (
              <div key={inv.id || i} className="glass-card glass-hover" style={{ borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", fontFamily: "monospace" }}>{inv.invoice_number}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>
                      {inv.trip_id ? `Trip: ${inv.trip_id.slice(0, 8)}` : "—"} {inv.due_date ? `· Due: ${new Date(inv.due_date).toLocaleDateString()}` : ""}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: sc }}>₹{(inv.total_amount || 0).toLocaleString()}</div>
                    <Pill color={sc} bg={`${sc}15`}>{inv.status}</Pill>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <MetaItem icon={DollarSign} text={`Base: ₹${inv.base_amount || 0}`} />
                  <MetaItem icon={Activity} text={`Tax: ₹${inv.tax_amount || 0}`} />
                  {inv.discount_amount > 0 && <MetaItem icon={Zap} text={`Disc: ₹${inv.discount_amount}`} color="#f59e0b" />}
                  {inv.payment_method && <MetaItem icon={CheckCircle2} text={inv.payment_method} color="#22c55e" />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PAYMENTS PANEL — nexus_emergency_payments
// ═══════════════════════════════════════════════════════════════
function PaymentsPanel() {
  const { payments, summary, loading, refresh, createPayment, updatePaymentStatus } = usePaymentData();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    trip_id: "", payment_type: "", payment_mode: "", amount: "",
  });

  const handleCreate = async () => {
    if (!form.trip_id || !form.payment_type || !form.payment_mode || !form.amount) return;
    await createPayment(form);
    setCreating(false);
    setForm({ trip_id: "", payment_type: "", payment_mode: "", amount: "" });
  };

  const MODE_COLORS = { cash: "#22c55e", card: "#3b82f6", upi: "#8b5cf6", insurance: "#06b6d4", prepaid: "#f59e0b", corporate: "#ec4899" };
  const STATUS_COLORS = { pending: "#f59e0b", collected: "#22c55e", waived: "#6b7280", refunded: "#ef4444" };

  return (
    <div>
      <SectionHeader icon={Zap} title="Emergency Payments" accent="#8b5cf6"
        action={
          <button onClick={() => setCreating(!creating)} style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "6px 12px", borderRadius: 8,
            background: creating ? "rgba(139,92,246,0.25)" : "rgba(139,92,246,0.12)",
            border: "1px solid rgba(139,92,246,0.3)",
            color: "#8b5cf6", fontSize: 10, fontWeight: 700, cursor: "pointer",
          }}>
            {creating ? <X size={12} /> : <Plus size={12} />}
            {creating ? "CANCEL" : "NEW PAYMENT"}
          </button>
        }
      />

      {creating && (
        <div className="glass-card" style={{ borderRadius: 14, padding: 16, marginBottom: 14, borderLeft: "3px solid #8b5cf6" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#8b5cf6", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Payment Recording
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Input placeholder="Trip ID (UUID) *" value={form.trip_id} onChange={e => setForm(f => ({ ...f, trip_id: e.target.value }))} />
            <Select value={form.payment_type} onChange={e => setForm(f => ({ ...f, payment_type: e.target.value }))}>
              <option value="">Payment Type *</option>
              <option value="emergency">Emergency</option>
              <option value="scheduled">Scheduled</option>
              <option value="transfer">Transfer</option>
            </Select>
            <Select value={form.payment_mode} onChange={e => setForm(f => ({ ...f, payment_mode: e.target.value }))}>
              <option value="">Payment Mode *</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="upi">UPI</option>
              <option value="insurance">Insurance</option>
              <option value="prepaid">Prepaid</option>
              <option value="corporate">Corporate</option>
            </Select>
            <Input placeholder="0.00" type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          </div>
          <button onClick={handleCreate} style={{
            width: "100%", padding: "10px", borderRadius: 8, fontWeight: 700, fontSize: 12, marginTop: 10,
            background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", border: "none", color: "#fff", cursor: "pointer",
          }}>RECORD PAYMENT</button>
        </div>
      )}

      {summary && (
        <div style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto" }}>
          <StatCard icon={CheckCircle2} label="Collected" value={`₹${(summary.total_collected || 0).toLocaleString()}`} accent="#22c55e" />
          <StatCard icon={Clock} label="Pending" value={`₹${(summary.total_pending || 0).toLocaleString()}`} accent="#f59e0b" />
          <StatCard icon={XCircle} label="Waived" value={`₹${(summary.total_waived || 0).toLocaleString()}`} accent="#6b7280" />
        </div>
      )}

      {summary?.by_mode && (
        <div className="glass-card" style={{ borderRadius: 12, padding: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", marginBottom: 8, textTransform: "uppercase" }}>By Payment Mode</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {Object.entries(summary.by_mode).map(([mode, amount]) => (
              <div key={mode} style={{ padding: "4px 10px", borderRadius: 6, background: `${MODE_COLORS[mode] || "#6b7280"}12`, border: `1px solid ${MODE_COLORS[mode] || "#6b7280"}30` }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: MODE_COLORS[mode] || "#6b7280", textTransform: "uppercase" }}>{mode}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", marginLeft: 6 }}>₹{amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {payments.length === 0 ? (
        <EmptyState icon={Zap} message="No payment records" sub="Payments are logged during trip completion" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {payments.map((pay, i) => {
            const mc = MODE_COLORS[pay.payment_mode] || "#6b7280";
            const sc = STATUS_COLORS[pay.status] || "#6b7280";
            return (
              <div key={pay.id || i} className="glass-card" style={{ borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Pill color={mc} bg={`${mc}15`}>{pay.payment_mode}</Pill>
                    <Pill color={sc} bg={`${sc}15`}>{pay.status}</Pill>
                    <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>{pay.payment_type}</span>
                  </div>
                  <span style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>₹{(pay.amount || 0).toLocaleString()}</span>
                </div>
                {pay.trip_id && <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>Trip: {pay.trip_id.slice(0, 8)}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMPLIANCE PANEL — certs, shifts, compliance score
// ═══════════════════════════════════════════════════════════════
function CompliancePanel() {
  const { dashboard, expiringCerts, loading, refresh } = useComplianceData();

  return (
    <div>
      <SectionHeader icon={Shield} title="Compliance & Safety" accent="#06b6d4" />

      {dashboard && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto" }}>
            <StatCard icon={Shield} label="Compliance Score" value={`${dashboard.compliance_score || 0}%`} accent={dashboard.compliance_score >= 80 ? "#22c55e" : dashboard.compliance_score >= 50 ? "#f59e0b" : "#ef4444"} />
            <StatCard icon={Users} label="Total Crew" value={dashboard.statistics?.total_crew || 0} accent="#3b82f6" />
            <StatCard icon={CheckCircle2} label="Certified" value={dashboard.statistics?.certified_crew || 0} accent="#22c55e" />
            <StatCard icon={AlertTriangle} label="Expiring Soon" value={dashboard.statistics?.expiring_soon || 0} accent="#f59e0b" />
          </div>
          {dashboard.alerts && (
            <div className="glass-card" style={{ borderRadius: 12, padding: 12, marginBottom: 14, borderLeft: "3px solid #f59e0b" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b", marginBottom: 6, textTransform: "uppercase" }}>Alerts</div>
              <div style={{ display: "flex", gap: 16 }}>
                <span style={{ fontSize: 11, color: "#fff" }}><strong style={{ color: "#ef4444" }}>{dashboard.alerts.expired_certifications || 0}</strong> expired certifications</span>
                <span style={{ fontSize: 11, color: "#fff" }}><strong style={{ color: "#f59e0b" }}>{dashboard.alerts.expiring_certifications || 0}</strong> expiring soon</span>
              </div>
            </div>
          )}
        </>
      )}

      <SectionHeader icon={AlertTriangle} title="Expiring Certifications" accent="#f59e0b" />
      {expiringCerts.length === 0 ? (
        <EmptyState icon={CheckCircle2} message="All certifications current" sub="No expiring certifications found" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {expiringCerts.map((cert, i) => {
            const daysLeft = cert.expires_at ? Math.ceil((new Date(cert.expires_at) - new Date()) / 86400000) : null;
            const urgency = daysLeft !== null && daysLeft < 7 ? "#ef4444" : daysLeft !== null && daysLeft < 30 ? "#f59e0b" : "#22c55e";
            return (
              <div key={cert.id || i} className="glass-card" style={{ borderRadius: 10, padding: "10px 14px", borderLeft: `3px solid ${urgency}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{cert.type}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>
                      Crew #{cert.crew_member_id} {cert.number ? `· #${cert.number}` : ""}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: urgency }}>{daysLeft !== null ? `${daysLeft}d` : "—"}</div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>{cert.expires_at ? new Date(cert.expires_at).toLocaleDateString() : "—"}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// BROADCASTS PANEL — nexus_broadcast_history
// ═══════════════════════════════════════════════════════════════
function BroadcastsPanel() {
  const { broadcasts, stats, loading, refresh } = useBroadcastData();

  const RESP_COLORS = { pending: "#f59e0b", accepted: "#22c55e", rejected: "#ef4444", timeout: "#6b7280" };

  return (
    <div>
      <SectionHeader icon={Radio} title="Dispatch Broadcasts" accent="#6366f1" />

      {stats && (
        <div style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto" }}>
          <StatCard icon={Radio} label="Total Sent" value={stats.total || 0} accent="#6366f1" />
          <StatCard icon={CheckCircle2} label="Accepted" value={stats.accepted || 0} accent="#22c55e" />
          <StatCard icon={XCircle} label="Rejected" value={stats.rejected || 0} accent="#ef4444" />
          <StatCard icon={Clock} label="Timeout" value={stats.timeout || 0} accent="#6b7280" />
        </div>
      )}
      {stats?.avg_response_seconds && (
        <div className="glass-card" style={{ borderRadius: 10, padding: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Avg Response: </span>
          <span style={{ fontSize: 13, fontWeight: 800, color: "#6366f1" }}>{stats.avg_response_seconds.toFixed(1)}s</span>
        </div>
      )}

      {broadcasts.length === 0 ? (
        <EmptyState icon={Radio} message="No broadcast history" sub="Broadcasts appear when dispatching ambulances" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {broadcasts.map((b, i) => {
            const rc = RESP_COLORS[b.response] || "#6b7280";
            return (
              <div key={b.id || i} className="glass-card" style={{ borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", fontFamily: "monospace" }}>
                      Trip: {b.trip_id?.slice(0, 8) || "—"}
                    </span>
                    <MetaItem icon={Truck} text={`Amb #${b.ambulance_id}`} color="#3b82f6" />
                    {b.operator_id && <MetaItem icon={Briefcase} text={`Op #${b.operator_id}`} />}
                  </div>
                  <Pill color={rc} bg={`${rc}15`}>{b.response}</Pill>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  {b.response_time_seconds && <MetaItem icon={Clock} text={`${b.response_time_seconds}s`} />}
                  {b.distance_km && <MetaItem icon={Navigation} text={`${b.distance_km} km`} />}
                  <MetaItem icon={Clock} text={new Date(b.created_at).toLocaleString()} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// AUDIT LOG PANEL — nexus_audit_logs
// ═══════════════════════════════════════════════════════════════
function AuditLogPanel() {
  const { logs, loading, refresh, filters, setFilters } = useAuditData();

  const MODULES = ["dispatch", "pcr", "nav", "stock", "crew", "brain", "billing", "compliance", "operators", "hospitals", "patients"];
  const ACTION_COLORS = { create: "#22c55e", update: "#3b82f6", delete: "#ef4444", view: "#6b7280", login: "#8b5cf6", export: "#f59e0b" };

  return (
    <div>
      <SectionHeader icon={Eye} title="System Audit Log" accent="#6b7280" />

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto" }}>
        <Select value={filters.module} onChange={e => { setFilters(f => ({ ...f, module: e.target.value })); }} style={{ maxWidth: 160 }}>
          <option value="">All Modules</option>
          {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
        </Select>
        <Select value={filters.action} onChange={e => { setFilters(f => ({ ...f, action: e.target.value })); }} style={{ maxWidth: 160 }}>
          <option value="">All Actions</option>
          {Object.keys(ACTION_COLORS).map(a => <option key={a} value={a}>{a}</option>)}
        </Select>
        <button onClick={() => refresh(filters)} style={{
          padding: "8px 16px", borderRadius: 8, background: "rgba(107,114,128,0.12)", border: "1px solid rgba(107,114,128,0.3)",
          color: "#6b7280", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
        }}>
          <Search size={12} style={{ marginRight: 4 }} />FILTER
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <StatCard icon={Eye} label="Log Entries" value={logs.length} accent="#6b7280" />
      </div>

      {logs.length === 0 ? (
        <EmptyState icon={Eye} message="No audit logs" sub="System actions are logged automatically" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {logs.map((log, i) => {
            const ac = ACTION_COLORS[log.action] || "#6b7280";
            return (
              <div key={log.id || i} className="glass-card" style={{ borderRadius: 8, padding: "8px 12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Pill color="#3b82f6" bg="rgba(59,130,246,0.1)">{log.module}</Pill>
                    <Pill color={ac} bg={`${ac}15`}>{log.action}</Pill>
                    {log.episode_token && <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>{log.episode_token.slice(0, 8)}</span>}
                  </div>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>
                    {log.created_at ? new Date(log.created_at).toLocaleString() : "—"}
                  </span>
                </div>
                {log.payload && (
                  <pre style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", marginTop: 4, whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 60, overflow: "hidden" }}>
                    {typeof log.payload === "string" ? log.payload : JSON.stringify(log.payload, null, 2)}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MENTOR PANEL — Training, Protocols, Crew Skills, AI Mentor
// ═══════════════════════════════════════════════════════════════
function MentorPanel() {
  const {
    modules, dashboard, crewProgress, crewStats, aiResponse,
    loading, error, refresh,
    createModule, fetchModule, fetchCrewProgress, updateProgress, askAiMentor,
  } = useMentorData();

  const [view, setView] = useState("dashboard"); // dashboard | modules | crew | ai
  const [creating, setCreating] = useState(false);
  const [selectedModule, setSelectedModule] = useState(null);
  const [crewId, setCrewId] = useState("");
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiContext, setAiContext] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [moduleFilter, setModuleFilter] = useState("all");

  const EMPTY_MODULE = {
    title: "", category: "protocol", description: "", content: "",
    difficulty: "beginner", duration_minutes: "", tags: "", created_by: "", status: "active",
  };
  const [form, setForm] = useState(EMPTY_MODULE);

  const CATS = { protocol: "#3b82f6", skill: "#8b5cf6", certification: "#f59e0b", scenario: "#ef4444", quiz: "#22c55e" };
  const DIFFS = { beginner: "#22c55e", intermediate: "#f59e0b", advanced: "#ef4444" };
  const PROG_STATUS = { not_started: "#6b7280", in_progress: "#3b82f6", completed: "#22c55e", failed: "#ef4444" };
  const VIEWS = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "modules",   label: "Training Modules", icon: BookOpen },
    { id: "crew",      label: "Crew Progress", icon: Award },
    { id: "ai",        label: "AI Mentor", icon: Bot },
  ];

  const handleCreateModule = async () => {
    if (!form.title || !form.category) return;
    const payload = {
      ...form,
      duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
      tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
    };
    await createModule(payload);
    setCreating(false);
    setForm(EMPTY_MODULE);
  };

  const handleLoadCrewProgress = async () => {
    if (!crewId) return;
    await fetchCrewProgress(crewId);
  };

  const handleAskMentor = async () => {
    if (!aiQuestion.trim()) return;
    setAiLoading(true);
    setChatHistory(prev => [...prev, { role: "user", text: aiQuestion }]);
    const result = await askAiMentor(aiQuestion, aiContext || null);
    if (result) {
      setChatHistory(prev => [...prev, {
        role: "mentor",
        text: result.answer || result.data?.answer || "No response available.",
        references: result.references || result.data?.references || [],
        followUps: result.follow_up_questions || result.data?.follow_up_questions || [],
      }]);
    }
    setAiQuestion("");
    setAiLoading(false);
  };

  const filteredModules = moduleFilter === "all" ? modules : modules.filter(m => m.category === moduleFilter);

  // ── DASHBOARD VIEW ──
  const renderDashboard = () => (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto" }}>
        <StatCard icon={BookOpen} label="Total Modules" value={dashboard?.total_modules || modules.length} accent="#8b5cf6" />
        <StatCard icon={Users} label="Active Learners" value={dashboard?.total_active_learners || 0} accent="#3b82f6" />
        <StatCard icon={CheckCircle2} label="Avg Completion" value={`${Math.round(dashboard?.average_completion_rate || 0)}%`} accent="#22c55e" />
      </div>

      {dashboard?.by_category && (
        <div className="glass-card" style={{ borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", marginBottom: 8, textTransform: "uppercase" }}>Modules by Category</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {Object.entries(dashboard.by_category).map(([cat, count]) => (
              <div key={cat} style={{ padding: "6px 12px", borderRadius: 8, background: `${CATS[cat] || "#6b7280"}12`, border: `1px solid ${CATS[cat] || "#6b7280"}30` }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: CATS[cat] || "#6b7280", textTransform: "uppercase" }}>{cat}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginLeft: 8 }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {dashboard?.recent_completions && dashboard.recent_completions.length > 0 && (
        <div>
          <SectionHeader icon={Award} title="Recent Completions" accent="#22c55e" />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {dashboard.recent_completions.map((c, i) => (
              <div key={i} className="glass-card" style={{ borderRadius: 10, padding: "10px 14px", borderLeft: "3px solid #22c55e" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>{c.module?.title || `Module #${c.training_module_id}`}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>Crew #{c.crew_member_id} {c.completed_at ? `· ${new Date(c.completed_at).toLocaleDateString()}` : ""}</div>
                  </div>
                  {c.score !== null && (
                    <span style={{ fontSize: 16, fontWeight: 800, color: c.score >= 80 ? "#22c55e" : c.score >= 60 ? "#f59e0b" : "#ef4444" }}>{c.score}%</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ── MODULES VIEW ──
  const renderModules = () => (
    <div>
      {/* Category filters */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12, overflowX: "auto" }}>
        {["all", "protocol", "skill", "certification", "scenario", "quiz"].map(c => (
          <button key={c} onClick={() => setModuleFilter(c)} style={{
            padding: "5px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600, textTransform: "capitalize",
            background: moduleFilter === c ? "rgba(139,92,246,0.12)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${moduleFilter === c ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.06)"}`,
            color: moduleFilter === c ? "#8b5cf6" : "rgba(255,255,255,0.4)", cursor: "pointer",
          }}>
            {c}
          </button>
        ))}
      </div>

      {/* Create form */}
      {creating && (
        <div className="glass-card" style={{ borderRadius: 14, padding: 16, marginBottom: 14, borderLeft: "3px solid #8b5cf6" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#8b5cf6", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            New Training Module
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Input placeholder="Title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <Select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              <option value="protocol">Protocol</option>
              <option value="skill">Skill</option>
              <option value="certification">Certification</option>
              <option value="scenario">Scenario</option>
              <option value="quiz">Quiz</option>
            </Select>
            <Select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </Select>
            <Input placeholder="Duration (minutes)" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))} />
            <Input placeholder="Tags (comma-separated)" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
            <Input placeholder="Author / Created by" value={form.created_by} onChange={e => setForm(f => ({ ...f, created_by: e.target.value }))} />
            <div style={{ gridColumn: "1 / -1" }}>
              <Input placeholder="Short description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <textarea placeholder="Training content / protocol text..." value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                style={{
                  width: "100%", minHeight: 120, resize: "vertical",
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 11,
                  fontFamily: "'SF Mono', monospace", outline: "none", lineHeight: 1.6, boxSizing: "border-box",
                }} />
            </div>
          </div>
          <button onClick={handleCreateModule} style={{
            width: "100%", padding: "10px", borderRadius: 8, fontWeight: 700, fontSize: 12, marginTop: 10,
            background: "linear-gradient(135deg, #8b5cf6, #7c3aed)", border: "none", color: "#fff", cursor: "pointer",
          }}>CREATE MODULE</button>
        </div>
      )}

      {/* Module list */}
      {filteredModules.length === 0 ? (
        <EmptyState icon={BookOpen} message="No training modules" sub="Create protocols, skills, and scenarios for your crew" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filteredModules.map((mod, i) => {
            const catColor = CATS[mod.category] || "#6b7280";
            const diffColor = DIFFS[mod.difficulty] || "#6b7280";
            return (
              <div key={mod.id || i} className="glass-card glass-hover" style={{ borderRadius: 12, padding: "14px", cursor: "pointer" }}
                onClick={() => setSelectedModule(selectedModule === mod.id ? null : mod.id)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{mod.title}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>
                      {mod.created_by ? `By ${mod.created_by}` : ""} {mod.duration_minutes ? `· ${mod.duration_minutes} min` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <Pill color={catColor} bg={`${catColor}15`}>{mod.category}</Pill>
                    <Pill color={diffColor} bg={`${diffColor}15`}>{mod.difficulty}</Pill>
                  </div>
                </div>
                {mod.description && (
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>{mod.description}</div>
                )}
                {mod.tags && Array.isArray(mod.tags) && mod.tags.length > 0 && (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {mod.tags.map((tag, ti) => (
                      <span key={ti} style={{ fontSize: 8, padding: "2px 6px", borderRadius: 4, background: "rgba(139,92,246,0.08)", color: "#8b5cf6", fontWeight: 600 }}>{tag}</span>
                    ))}
                  </div>
                )}
                {selectedModule === mod.id && mod.content && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <pre style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontFamily: "'SF Mono', monospace", whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.6 }}>
                      {mod.content}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── CREW PROGRESS VIEW ──
  const renderCrewProgress = () => (
    <div>
      <div className="glass-card" style={{ borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <Input placeholder="Crew Member ID" value={crewId} onChange={e => setCrewId(e.target.value)} />
          <button onClick={handleLoadCrewProgress} style={{
            padding: "8px 16px", borderRadius: 8, background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)",
            color: "#8b5cf6", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
          }}>
            <Search size={12} style={{ marginRight: 4 }} />LOAD
          </button>
        </div>
      </div>

      {crewStats && (
        <div style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto" }}>
          <StatCard icon={BookOpen} label="Total Assigned" value={crewStats.total || 0} accent="#8b5cf6" />
          <StatCard icon={CheckCircle2} label="Completed" value={crewStats.completed || 0} accent="#22c55e" />
          <StatCard icon={Activity} label="In Progress" value={crewStats.in_progress || 0} accent="#3b82f6" />
          <StatCard icon={Award} label="Avg Score" value={crewStats.avg_score ? `${Math.round(crewStats.avg_score)}%` : "—"} accent="#f59e0b" />
        </div>
      )}

      {crewProgress.length === 0 ? (
        <EmptyState icon={Award} message="Enter a Crew Member ID" sub="Load training progress and scores for a crew member" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {crewProgress.map((p, i) => {
            const sc = PROG_STATUS[p.status] || "#6b7280";
            return (
              <div key={p.id || i} className="glass-card" style={{ borderRadius: 10, padding: "10px 14px", borderLeft: `3px solid ${sc}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{p.module?.title || `Module #${p.training_module_id}`}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>
                      {p.module?.category ? `${p.module.category}` : ""} {p.started_at ? `· Started: ${new Date(p.started_at).toLocaleDateString()}` : ""}
                      {p.completed_at ? ` · Completed: ${new Date(p.completed_at).toLocaleDateString()}` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {p.score !== null && p.score !== undefined && (
                      <span style={{ fontSize: 16, fontWeight: 800, color: p.score >= 80 ? "#22c55e" : p.score >= 60 ? "#f59e0b" : "#ef4444" }}>{p.score}%</span>
                    )}
                    <Pill color={sc} bg={`${sc}15`}>{p.status?.replace(/_/g, " ")}</Pill>
                  </div>
                </div>
                {p.notes && <div style={{ marginTop: 6, fontSize: 10, color: "rgba(255,255,255,0.4)", fontStyle: "italic" }}>{p.notes}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── AI MENTOR CHAT VIEW ──
  const renderAiMentor = () => (
    <div>
      <div className="glass-card" style={{ borderRadius: 14, padding: 14, marginBottom: 14, borderLeft: "3px solid #06b6d4" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#06b6d4", marginBottom: 8, textTransform: "uppercase" }}>
          AI Clinical Mentor
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 12 }}>
          Ask clinical questions, request protocol guidance, or explore training scenarios.
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <Select value={aiContext} onChange={e => setAiContext(e.target.value)} style={{ maxWidth: 200 }}>
            <option value="">Context (optional)</option>
            <option value="cardiac">Cardiac</option>
            <option value="trauma">Trauma</option>
            <option value="airway">Airway Management</option>
            <option value="obstetric">Obstetric</option>
            <option value="pediatric">Pediatric</option>
            <option value="pharmacology">Pharmacology</option>
            <option value="bls">BLS Protocol</option>
            <option value="acls">ACLS Protocol</option>
          </Select>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input placeholder="Ask the AI Mentor a clinical question..."
            value={aiQuestion} onChange={e => setAiQuestion(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAskMentor()}
            style={{
              flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 12, outline: "none",
            }} />
          <button onClick={handleAskMentor} disabled={aiLoading} style={{
            padding: "10px 18px", borderRadius: 8,
            background: aiLoading ? "rgba(255,255,255,0.04)" : "linear-gradient(135deg, #06b6d4, #0891b2)",
            border: "none", color: "#fff", fontSize: 11, fontWeight: 700, cursor: aiLoading ? "wait" : "pointer",
          }}>
            {aiLoading ? <RotateCcw size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={12} />}
          </button>
        </div>
      </div>

      {/* Chat History */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {chatHistory.length === 0 && (
          <EmptyState icon={MessageCircle} message="Start a conversation" sub="Ask about protocols, clinical scenarios, drug dosages, or EMS procedures" />
        )}
        {chatHistory.map((msg, i) => (
          <div key={i} className="glass-card" style={{
            borderRadius: 12, padding: "12px 14px",
            borderLeft: `3px solid ${msg.role === "user" ? "#3b82f6" : "#06b6d4"}`,
            marginLeft: msg.role === "user" ? 40 : 0,
            marginRight: msg.role === "mentor" ? 40 : 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              {msg.role === "user"
                ? <Users size={12} style={{ color: "#3b82f6" }} />
                : <Bot size={12} style={{ color: "#06b6d4" }} />}
              <span style={{ fontSize: 9, fontWeight: 700, color: msg.role === "user" ? "#3b82f6" : "#06b6d4", textTransform: "uppercase" }}>
                {msg.role === "user" ? "You" : "AI Mentor"}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {msg.text}
            </div>
            {msg.references && msg.references.length > 0 && (
              <div style={{ marginTop: 8, paddingTop: 6, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>REFERENCES</div>
                {msg.references.map((ref, ri) => (
                  <div key={ri} style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 2 }}>• {ref}</div>
                ))}
              </div>
            )}
            {msg.followUps && msg.followUps.length > 0 && (
              <div style={{ marginTop: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>
                {msg.followUps.map((q, qi) => (
                  <button key={qi} onClick={() => { setAiQuestion(q); }}
                    style={{
                      padding: "4px 10px", borderRadius: 6, fontSize: 9, fontWeight: 600,
                      background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)",
                      color: "#06b6d4", cursor: "pointer",
                    }}>
                    <Lightbulb size={9} style={{ marginRight: 3 }} />{q}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // ── VIEW ROUTER ──
  const viewContent = { dashboard: renderDashboard, modules: renderModules, crew: renderCrewProgress, ai: renderAiMentor };

  return (
    <div>
      <SectionHeader icon={GraduationCap} title="Mentor & Training" accent="#8b5cf6"
        action={view === "modules" ? (
          <button onClick={() => setCreating(!creating)} style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "6px 12px", borderRadius: 8,
            background: creating ? "rgba(139,92,246,0.25)" : "rgba(139,92,246,0.12)",
            border: "1px solid rgba(139,92,246,0.3)",
            color: "#8b5cf6", fontSize: 10, fontWeight: 700, cursor: "pointer",
          }}>
            {creating ? <X size={12} /> : <Plus size={12} />}
            {creating ? "CANCEL" : "NEW MODULE"}
          </button>
        ) : null}
      />

      {/* View tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 14, overflowX: "auto" }}>
        {VIEWS.map(v => {
          const Icon = v.icon;
          const active = view === v.id;
          return (
            <button key={v.id} onClick={() => setView(v.id)} style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "6px 12px", borderRadius: 8, fontSize: 10, fontWeight: 700,
              background: active ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${active ? "rgba(139,92,246,0.4)" : "rgba(255,255,255,0.06)"}`,
              color: active ? "#8b5cf6" : "rgba(255,255,255,0.45)",
              cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s",
            }}>
              <Icon size={12} />{v.label}
            </button>
          );
        })}
      </div>

      {/* Active view */}
      {viewContent[view]?.()}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// AI BRAIN PANEL
// ═══════════════════════════════════════════════════════════════
function BrainPanel() {
  const { results, loading, runTriage, runDispatchOptimise, runStockForecast, runPcrAnomaly } = useBrainData();
  const [activeFunc, setActiveFunc] = useState(null);
  const [result, setResult] = useState(results);
  const [running, setRunning] = useState(loading);
  // Two session tokens — operator covers triage/dispatch/stock, auditor
  // covers pcr-anomaly (clinical-reviewer cohort, paramedic|physician|auditor).
  // Both auto-issued on mount so the user can press any button immediately.
  const [opToken, setOpToken] = useState(null);
  const [auditorToken, setAuditorToken] = useState(null);
  useEffect(() => {
    let cancelled = false;
    const day = new Date().toISOString().slice(0, 10);
    async function issue(role, setter) {
      try {
        const res = await fetch("/api/nexus/episode-tokens", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            episode_id: `${role}-session-${day}`,
            patient_ref: `${role}-console`,
            role,
            consent: { ai_triage_opt_in: true },
          }),
        });
        if (!res.ok || cancelled) return;
        const t = await res.json();
        setter(t.token);
      } catch { /* offline ok */ }
    }
    issue("operator", setOpToken);
    issue("auditor", setAuditorToken);
    return () => { cancelled = true; };
  }, []);

  // Payloads match validated FormRequest schemas exactly
  const FUNCTIONS = [
    {
      id: "triage", label: "Triage Assist", icon: Stethoscope, accent: "#ef4444",
      desc: "AI triage from patient vitals & symptoms", confidence: 0.85,
      payload: {
        vitals: { heart_rate: 110, systolic_bp: 85, diastolic_bp: 55, respiratory_rate: 24, oxygen_saturation: 91, temperature: 101.8 },
        symptoms: ["chest pain", "dyspnea", "diaphoresis"],
        age: 62, gender: "male",
        scene_description: "62yo male found diaphoretic with chest pain radiating to left arm",
      },
      handler: runTriage,
    },
    {
      id: "dispatch", label: "Dispatch Optimise", icon: Navigation, accent: "#3b82f6",
      desc: "Optimal ambulance by location + urgency", confidence: 0.80,
      payload: {
        emergency_location: { lat: 28.6139, lng: 77.2090 },
        emergency_type: "chest_pain",
        available_ambulances: [
          { id: "1", latitude: 28.6200, longitude: 77.2100, status: "available" },
          { id: "2", latitude: 28.6050, longitude: 77.2000, status: "available" },
          { id: "3", latitude: 28.6300, longitude: 77.2200, status: "available" },
        ],
        hospital_capacities: [
          { id: "1", latitude: 28.6180, longitude: 77.2150, available_beds: 12 },
          { id: "2", latitude: 28.6100, longitude: 77.1950, available_beds: 5 },
        ],
      },
      handler: runDispatchOptimise,
    },
    {
      id: "stock", label: "Stock Forecast", icon: BarChart3, accent: "#22c55e",
      desc: "Predict inventory needs from consumption", confidence: 0.75,
      payload: {
        item_id: "1",
        consumption_history: [12, 15, 8, 20, 14, 11, 18],
        current_quantity: 45,
        ambulance_id: "1",
      },
      handler: runStockForecast,
    },
    {
      id: "pcr", label: "PCR Anomaly Detect", icon: Shield, accent: "#8b5cf6",
      desc: "QA anomaly detection in patient records", confidence: 0.90,
      payload: {
        pcr_data: {
          vitals: { heart_rate: 45, oxygen_saturation: 88, respiratory_rate: 8 },
          medications: [{ name: "Epinephrine", dose: "1mg", time: "14:30" }],
          procedures: ["intubation", "IV_access"],
          narrative: "Patient found unresponsive, bradycardic with low SpO2",
        },
      },
      handler: runPcrAnomaly,
    },
  ];

  const run = async (func) => {
    setActiveFunc(func.id);
    // PCR anomaly needs the auditor token (clinical reviewer cohort).
    // Triage / dispatch / stock all accept the operator token.
    const tok = func.id === "pcr" ? auditorToken : opToken;
    const r = await func.handler(func.payload, tok ? { token: tok } : {});
    setResult(r);
  };

  return (
    <div>
      <SectionHeader icon={Brain} title="AI Brain" accent="#a855f7" />
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 14, lineHeight: 1.5 }}>
        5-layer PHI protection: gate → de-identify → inference → confidence → audit
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {FUNCTIONS.map(func => {
          const Icon = func.icon;
          const isActive = activeFunc === func.id;
          const isRunning = loading && isActive;
          return (
            <div key={func.id}>
              <button onClick={() => run(func)} disabled={loading} className="glass-card glass-hover"
                style={{ width: "100%", borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, cursor: loading ? "wait" : "pointer", textAlign: "left", transition: "all 0.2s" }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: `${func.accent}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {isRunning ? <RefreshCw size={18} style={{ color: func.accent, animation: "spin 1s linear infinite" }} /> : <Icon size={18} style={{ color: func.accent }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 2 }}>{func.label}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{func.desc}</div>
                </div>
                <div style={{ padding: "3px 8px", borderRadius: 6, fontSize: 9, fontWeight: 700, background: `${func.accent}15`, color: func.accent, fontFamily: "monospace" }}>
                  {(func.confidence * 100).toFixed(0)}%
                </div>
              </button>
              {isActive && result && (
                <div className="glass-card" style={{ borderRadius: 10, padding: 14, marginTop: 6, borderLeft: `3px solid ${func.accent}`, maxHeight: 200, overflowY: "auto" }}>
                  <pre style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "monospace", lineHeight: 1.5, margin: 0 }}>
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}
              {isActive && !loading && !result && (
                <div className="glass-card" style={{ borderRadius: 10, padding: 14, marginTop: 6, borderLeft: "3px solid rgba(239,68,68,0.5)" }}>
                  <span style={{ fontSize: 10, color: "#ef4444" }}>No response — check Brain API config</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
