import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack(config, { dev }) {
    // The filesystem pack cache (.next/cache/webpack/*.pack.gz) is unreliable on
    // Windows and breaks when .next is cleaned concurrently (e.g. a build running
    // while the dev server is up). Keep the dev server cache in memory only.
    if (dev) {
      config.cache = false;
    }
    return config;
  },
  async rewrites() {
    return [
      { source: "/v1/:path*", destination: "/api/v1/:path*" },
      { source: "/v1beta/:path*", destination: "/api/v1beta/:path*" },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "*" },
          { key: "Access-Control-Allow-Private-Network", value: "true" },
        ],
      },
    ];
  },
};

export default nextConfig;
