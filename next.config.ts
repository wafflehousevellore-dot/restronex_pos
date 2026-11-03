import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  turbopack: { root: __dirname },
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "recharts"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "api.qrserver.com" },
    ],
  },
  allowedDevOrigins: [
    "*.e2b.app",
    "*.e2b.dev",
    "*.amazonaws.com",
    "*.arena.ai",
    ...(process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes("localhost")
      ? [new URL(process.env.NEXT_PUBLIC_APP_URL).hostname]
      : []),
  ],
  async redirects() {
    return [
      {
        source: "/organization",
        destination: "/app/organization",
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: isProd ? "SAMEORIGIN" : "ALLOWALL" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, e2b-traffic-access-token, x-e2b-token, x-forwarded-proto" },
          { key: "Access-Control-Allow-Origin", value: process.env.NEXT_PUBLIC_APP_URL || "*" },
        ],
      },
    ];
  },
};

export default nextConfig;
