/** @type {import('next').NextConfig} */

const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.clarity.ms",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https: https://www.clarity.ms https://*.blob.vercel-storage.com",
      "font-src 'self' data:",
      "connect-src 'self' ws: wss: https: https://www.clarity.ms https://*.clarity.ms https://*.blob.vercel-storage.com",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const appUrlHost = appUrl.replace(/^https?:\/\//, "");

const allowedDevOrigins = [
  "127.0.0.1",
  "localhost",
  "localhost:3000",
  appUrlHost,
  "tenet.space-z.ai",
  "*.space-z.ai",
  "tenetbid.vercel.app",
];

const nextConfig = {
  reactStrictMode: true,

  allowedDevOrigins,

  serverExternalPackages: ["xlsx", "pdfkit", "sharp"],

  // Performance optimizations for faster loading & Vercel free tier
  compress: true,

  // Tree-shake heavy packages at import time
  experimental: {
    optimizePackageImports: [
      "recharts",
    ],
  },

  async headers() {
    // In dev, never cache static chunks (Turbopack reuses filenames with HMR updates).
    // In production, Vercel handles caching automatically.
    const staticHeaders = process.env.NODE_ENV === 'production'
      ? [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }]
      : [{ key: "Cache-Control", value: "no-store" }];
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        source: "/_next/static/(.*)",
        headers: staticHeaders,
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: "/api/uploads/:path*",
      },
    ];
  },
};

export default nextConfig;
