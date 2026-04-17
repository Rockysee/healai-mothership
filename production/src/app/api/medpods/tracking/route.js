import { promises as fs } from "fs";
import path from "path";

const SOURCE_FILES = [
  "medpod_live_feed.json",
  "medpod_manifest.json",
  "medpod_skeletons.json",
  "medpod_working_notes.json",
  "medpod_audit_report.json",
];

const BASE_LAT = 28.6139;
const BASE_LNG = 77.209;
const STATUS_ROTATION = ["available", "dispatched", "en_route", "on_scene", "transporting", "offline"];

function hashString(input) {
  let h = 2166136261;
  const str = String(input || "");
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

function seededRange(seed, min, max) {
  const normalized = (seed % 100000) / 100000;
  return min + (max - min) * normalized;
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

async function readJsonSafe(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function buildUnitFromRecord(record, idx, sourceName, nowIso) {
  const ref = record?.file || record?.path || `${sourceName}#${idx + 1}`;
  const key = `${ref}-${sourceName}`;
  const h = hashString(key);

  const lat = clamp(BASE_LAT + seededRange(h, -0.16, 0.16), 28.35, 28.95);
  const lng = clamp(BASE_LNG + seededRange(h >> 1, -0.16, 0.16), 76.95, 77.55);
  const speed = Math.round(seededRange(h >> 2, 18, 72));
  const heading = Math.round(seededRange(h >> 3, 0, 360));
  const status = STATUS_ROTATION[h % STATUS_ROTATION.length];

  const track = Array.from({ length: 6 }).map((_, i) => {
    const step = i * 0.0018;
    return {
      lat: +(lat - step * ((h % 2 === 0) ? 1 : -1)).toFixed(6),
      lng: +(lng - step * ((h % 3 === 0) ? -1 : 1)).toFixed(6),
    };
  });

  return {
    id: `MP-${String(idx + 1).padStart(3, "0")}`,
    call_sign: `MedPod-${String((h % 97) + 1).padStart(2, "0")}`,
    status,
    lat: +lat.toFixed(6),
    lng: +lng.toFixed(6),
    speed,
    heading,
    last_update: nowIso,
    source_file: sourceName,
    source_ref: ref,
    track,
  };
}

function normalizeLiveFeedUnit(unit, idx, sourceName, nowIso) {
  const fallback = buildUnitFromRecord(unit || {}, idx, sourceName, nowIso);
  const hasLat = typeof unit?.lat === "number";
  const hasLng = typeof unit?.lng === "number";

  return {
    ...fallback,
    id: unit?.id || `LIVE-${String(idx + 1).padStart(3, "0")}`,
    call_sign: unit?.call_sign || fallback.call_sign,
    status: unit?.status || fallback.status,
    lat: hasLat ? unit.lat : fallback.lat,
    lng: hasLng ? unit.lng : fallback.lng,
    speed: Math.abs(Math.round(Number(unit?.speed ?? fallback.speed ?? 0))),
    source_file: sourceName,
    source_ref: unit?.call_sign || fallback.source_ref,
  };
}

export async function GET() {
  const workspaceRoot = process.cwd();
  const sourceDir = path.join(workspaceRoot, "Amb_Ref");
  const nowIso = new Date().toISOString();

  const loaded = await Promise.all(
    SOURCE_FILES.map(async (name) => {
      const absPath = path.join(sourceDir, name);
      const data = await readJsonSafe(absPath);
      const rows = Array.isArray(data)
        ? data
        : Array.isArray(data?.files)
          ? data.files
          : Array.isArray(data?.findings)
            ? data.findings
            : [];

      return {
        name,
        absPath,
        count: rows.length,
        rows,
      };
    })
  );

  const units = [];
  loaded.forEach((src) => {
    const rowLimit = src.name === "medpod_live_feed.json" ? src.rows.length : 4;
    src.rows.slice(0, rowLimit).forEach((row, idx) => {
      if (src.name === "medpod_live_feed.json") {
        units.push(normalizeLiveFeedUnit(row, units.length + idx, src.name, nowIso));
      } else {
        units.push(buildUnitFromRecord(row, units.length + idx, src.name, nowIso));
      }
    });
  });

  const dedupedUnits = units
    .filter((u, i, arr) => arr.findIndex((x) => x.id === u.id) === i)
    .slice(0, 14);

  const hospitals = [
    { id: "H-01", name: "Medanta Command Hospital", lat: 28.4507, lng: 77.0405, available_beds: 11 },
    { id: "H-02", name: "AIIMS Trauma Center", lat: 28.5672, lng: 77.2100, available_beds: 7 },
    { id: "H-03", name: "Fortis Emergency Hub", lat: 28.4595, lng: 77.0722, available_beds: 9 },
  ];

  return Response.json({
    generated_at: nowIso,
    source_directory: "Amb_Ref",
    source_files: loaded.map((f) => ({
      name: f.name,
      relative_path: `Amb_Ref/${f.name}`,
      records: f.count,
    })),
    units: dedupedUnits,
    hospitals,
    meta: {
      total_units: dedupedUnits.length,
      available_units: dedupedUnits.filter((u) => u.status === "available").length,
      moving_units: dedupedUnits.filter((u) => ["en_route", "transporting", "dispatched"].includes(u.status)).length,
    },
  });
}
