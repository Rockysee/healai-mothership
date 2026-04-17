const DEFAULT_PROVIDER = (process.env.NEXT_PUBLIC_MAP_PROVIDER || "osm").toLowerCase();

function toCoord(input) {
  if (!input || Number.isNaN(Number(input.lat)) || Number.isNaN(Number(input.lng))) return null;
  return { lat: Number(input.lat), lng: Number(input.lng) };
}

function createOsmProvider() {
  return {
    id: "osm",
    async geocode(query, limit = 5) {
      const res = await fetch(`/api/maps/geocode?q=${encodeURIComponent(query)}&limit=${limit}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Geocode failed");
      return data.results || [];
    },
    async route(from, to) {
      const src = toCoord(from);
      const dst = toCoord(to);
      if (!src || !dst) throw new Error("Invalid route coordinates");

      const url = `/api/maps/route?fromLat=${src.lat}&fromLng=${src.lng}&toLat=${dst.lat}&toLng=${dst.lng}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Route failed");
      return data;
    },
  };
}

function createGoogleProvider() {
  return {
    id: "google",
    async geocode(query, limit = 5) {
      const res = await fetch(`/api/maps/google/geocode?q=${encodeURIComponent(query)}&limit=${limit}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Google geocode failed");
      return data.results || [];
    },
    async route(from, to) {
      const src = toCoord(from);
      const dst = toCoord(to);
      if (!src || !dst) throw new Error("Invalid route coordinates");

      const url = `/api/maps/google/route?fromLat=${src.lat}&fromLng=${src.lng}&toLat=${dst.lat}&toLng=${dst.lng}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Google route failed");
      return data;
    },
  };
}

export function createMapProvider(providerId = DEFAULT_PROVIDER) {
  if (providerId === "google") return createGoogleProvider();
  return createOsmProvider();
}
