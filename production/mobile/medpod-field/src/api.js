const API_BASE = process.env.EXPO_PUBLIC_MEDPOD_API_BASE || "http://localhost:8001/api/v1";

async function request(path, opts = {}) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(opts.headers || {}),
      },
      ...opts,
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.warn("MedPod API error", path, error?.message || error);
    return null;
  }
}

export async function fetchDispatchTrips() {
  const data = await request("/dispatch");
  return data?.data || [];
}

export async function updateTripStatus(tripId, status) {
  return request(`/dispatch/${tripId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function fetchHospitals() {
  const data = await request("/hospitals");
  return data?.data || [];
}

export async function createPcr(tripId) {
  return request(`/pcr/trip/${tripId}`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function updatePcrSection(pcrId, section, payload) {
  return request(`/pcr/${pcrId}/${section}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
