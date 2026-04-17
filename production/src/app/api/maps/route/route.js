export const runtime = "nodejs";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fromLat = Number(searchParams.get("fromLat"));
    const fromLng = Number(searchParams.get("fromLng"));
    const toLat = Number(searchParams.get("toLat"));
    const toLng = Number(searchParams.get("toLng"));

    if ([fromLat, fromLng, toLat, toLng].some((v) => Number.isNaN(v))) {
      return Response.json({ error: "fromLat/fromLng/toLat/toLng are required" }, { status: 400 });
    }

    const coords = `${fromLng},${fromLat};${toLng},${toLat}`;
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;

    const upstream = await fetch(osrmUrl, {
      headers: { "Accept": "application/json" },
      cache: "no-store",
    });

    if (!upstream.ok) {
      return Response.json({ error: `OSRM error ${upstream.status}` }, { status: 502 });
    }

    const raw = await upstream.json();
    const best = raw?.routes?.[0];

    if (!best) {
      return Response.json({ error: "No route found" }, { status: 404 });
    }

    const coordinates = Array.isArray(best.geometry?.coordinates)
      ? best.geometry.coordinates.map(([lng, lat]) => [lat, lng])
      : [];

    return Response.json({
      provider: "osrm",
      distance_m: Number(best.distance || 0),
      duration_s: Number(best.duration || 0),
      coordinates,
    });
  } catch (error) {
    return Response.json({ error: error.message || "route failed" }, { status: 500 });
  }
}
