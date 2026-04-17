export const runtime = "nodejs";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const limit = Number(searchParams.get("limit") || 5);

    if (!q) {
      return Response.json({ error: "q is required" }, { status: 400 });
    }

    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", q);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", String(Math.max(1, Math.min(limit, 10))));
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("countrycodes", "in");

    const upstream = await fetch(url.toString(), {
      headers: {
        "User-Agent": "Healai-MedPodNexus/1.0",
        "Accept": "application/json",
      },
      cache: "no-store",
    });

    if (!upstream.ok) {
      return Response.json({ error: `Nominatim error ${upstream.status}` }, { status: 502 });
    }

    const raw = await upstream.json();
    const results = Array.isArray(raw)
      ? raw.map((item) => ({
          lat: Number(item.lat),
          lng: Number(item.lon),
          display_name: item.display_name,
          importance: item.importance || 0,
          type: item.type || "unknown",
        }))
      : [];

    return Response.json({ provider: "nominatim", results });
  } catch (error) {
    return Response.json({ error: error.message || "geocode failed" }, { status: 500 });
  }
}
