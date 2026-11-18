import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  devIndicators: false,
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
      {
        source: "/app",
        destination: "/app/dashboard",
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
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, e2b-traffic-access-token, x-e2b-token, x-forwarded-proto" },
          { key: "Access-Control-Allow-Origin", value: process.env.NEXT_PUBLIC_APP_URL || "*" },
        ],
      },
      // Private application & portal routes — strictly noindex & nofollow
      {
        source: "/(app|staff|owner|platform|checkout|standard-checkout|order|qr|feedback|api|dashboard)/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet" },
        ],
      },
      {
        source: "/(login|sign-in|sign-up)",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet" },
        ],
      },
    ];
  },
};

export default nextConfig;
