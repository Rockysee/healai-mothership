"use client";

import { useMemo, useState, useCallback } from "react";
import { createMapProvider } from "@/lib/maps/providers/mapProvider";

export default function useMapRouting(providerId) {
  const provider = useMemo(() => createMapProvider(providerId), [providerId]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const geocodeFirst = useCallback(async (query) => {
    if (!query?.trim()) return null;
    setLoading(true);
    setError("");
    try {
      const results = await provider.geocode(query.trim(), 5);
      return results[0] || null;
    } catch (e) {
      setError(e.message || "Geocoding failed");
      return null;
    } finally {
      setLoading(false);
    }
  }, [provider]);

  const computeRoute = useCallback(async (from, to) => {
    setLoading(true);
    setError("");
    try {
      const route = await provider.route(from, to);
      return route;
    } catch (e) {
      setError(e.message || "Routing failed");
      return null;
    } finally {
      setLoading(false);
    }
  }, [provider]);

  return {
    providerId: provider.id,
    loading,
    error,
    geocodeFirst,
    computeRoute,
  };
}
