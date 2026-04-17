import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // ── MedPod NEXUS (Laravel at :8001) ──
      {
        source: "/api/nexus/:path*",
        destination: "http://127.0.0.1:8001/api/v1/:path*",
      },
      // ── FastAPI backend (Python at :8000) ──
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8000/:path*",
      },
    ];
  },
};

export default nextConfig;
