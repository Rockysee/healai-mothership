import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/framegen/:path*",
        destination: "http://127.0.0.1:3002/api/:path*",
      },
      {
        source: "/api/syllabus/:path*",
        destination: "http://127.0.0.1:3002/api/syllabus/:path*",
      },
      {
        source: "/api/whiteboard/:path*",
        destination: "http://127.0.0.1:3002/api/whiteboard/:path*",
      },
      {
        source: "/api/projects/:path*",
        destination: "http://127.0.0.1:3002/api/projects/:path*",
      },
      {
        source: "/api/poll/:path*",
        destination: "http://127.0.0.1:3002/api/poll/:path*",
      },
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8000/:path*",
      },
    ];
  },
};

export default nextConfig;
