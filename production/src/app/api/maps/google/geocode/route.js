export const runtime = "nodejs";

function getGoogleApiKey() {
  return process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const limit = Number(searchParams.get("limit") || 5);
    const key = getGoogleApiKey();

    if (!q) {
      return Response.json({ error: "q is required" }, { status: 400 });
    }

    if (!key) {
      return Response.json({ error: "GOOGLE_MAPS_API_KEY is not configured" }, { status: 500 });
    }

    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("address", q);
    url.searchParams.set("key", key);
    url.searchParams.set("region", "in");

    const upstream = await fetch(url.toString(), { cache: "no-store" });
    const raw = await upstream.json();

    if (!upstream.ok || raw.status === "REQUEST_DENIED" || raw.status === "INVALID_REQUEST") {
      return Response.json({ error: raw.error_message || `Google Geocode error ${raw.status}` }, { status: 502 });
    }

    const results = Array.isArray(raw.results)
      ? raw.results.slice(0, Math.max(1, Math.min(limit, 10))).map((item) => ({
          lat: Number(item.geometry?.location?.lat),
          lng: Number(item.geometry?.location?.lng),
          display_name: item.formatted_address,
          importance: 1,
          type: item.types?.[0] || "unknown",
        }))
      : [];

    return Response.json({ provider: "google", results });
  } catch (error) {
    return Response.json({ error: error.message || "google geocode failed" }, { status: 500 });
  }
}
