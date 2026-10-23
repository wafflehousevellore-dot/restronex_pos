import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  turbopack: { root: __dirname },
  allowedDevOrigins: [
    "*.e2b.app",
    "*.e2b.dev",
    "*.amazonaws.com",
    "*.arena.ai",
    ...(process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes("localhost")
      ? [new URL(process.env.NEXT_PUBLIC_APP_URL).hostname]
      : []),
  ],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: isProd ? "SAMEORIGIN" : "ALLOWALL" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, e2b-traffic-access-token, x-e2b-token, x-forwarded-proto" },
          { key: "Access-Control-Allow-Origin", value: process.env.NEXT_PUBLIC_APP_URL || "*" },
        ],
      },
    ];
  },
};

export default nextConfig;
