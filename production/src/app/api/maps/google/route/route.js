export const runtime = "nodejs";

function getGoogleApiKey() {
  return process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fromLat = Number(searchParams.get("fromLat"));
    const fromLng = Number(searchParams.get("fromLng"));
    const toLat = Number(searchParams.get("toLat"));
    const toLng = Number(searchParams.get("toLng"));
    const key = getGoogleApiKey();

    if ([fromLat, fromLng, toLat, toLng].some((v) => Number.isNaN(v))) {
      return Response.json({ error: "fromLat/fromLng/toLat/toLng are required" }, { status: 400 });
    }

    if (!key) {
      return Response.json({ error: "GOOGLE_MAPS_API_KEY is not configured" }, { status: 500 });
    }

    const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
    url.searchParams.set("origin", `${fromLat},${fromLng}`);
    url.searchParams.set("destination", `${toLat},${toLng}`);
    url.searchParams.set("mode", "driving");
    url.searchParams.set("key", key);

    const upstream = await fetch(url.toString(), { cache: "no-store" });
    const raw = await upstream.json();

    if (!upstream.ok || raw.status !== "OK") {
      return Response.json({ error: raw.error_message || `Google Directions error ${raw.status}` }, { status: 502 });
    }

    const best = raw.routes?.[0];
    const leg = best?.legs?.[0];
    const polyline = best?.overview_polyline?.points || "";

    if (!best || !leg || !polyline) {
      return Response.json({ error: "No route found" }, { status: 404 });
    }

    // Decode Google encoded polyline to [lat, lng]
    const coordinates = [];
    let index = 0;
    let lat = 0;
    let lng = 0;
    while (index < polyline.length) {
      let b;
      let shift = 0;
      let result = 0;
      do {
        b = polyline.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = polyline.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
      lng += dlng;

      coordinates.push([lat / 1e5, lng / 1e5]);
    }

    return Response.json({
      provider: "google",
      distance_m: Number(leg.distance?.value || 0),
      duration_s: Number(leg.duration?.value || 0),
      coordinates,
    });
  } catch (error) {
    return Response.json({ error: error.message || "google route failed" }, { status: 500 });
  }
}
