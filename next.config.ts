import type { NextConfig } from "next";

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
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https: https://*.blob.vercel-storage.com",
      "font-src 'self' data:",
      "connect-src 'self' ws: wss: https:",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

// Build allowedDevOrigins dynamically from environment
// On Vercel, the platform handles origins automatically — this is only needed for local dev
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const appUrlHost = appUrl.replace(/^https?:\/\//, "");
const allowedDevOrigins = [
  "127.0.0.1",
  "localhost",
  "localhost:3000",
  appUrlHost, // e.g. "tenet.space-z.ai" or "localhost:3000"
  "tenet.space-z.ai", // explicitly allow the custom domain
];

const nextConfig: NextConfig = {
  // NOTE: "output: standalone" removed — Vercel handles builds natively and doesn't need it.
  // standalone output is for Docker/self-hosted deployments only and can cause issues on Vercel.
  reactStrictMode: true,
  allowedDevOrigins,
  // Turbopack serverExternalPackages: packages that should NOT be bundled
  // by Turbopack and should be resolved at runtime instead.
  // xlsx (SheetJS) has known Turbopack resolution issues — exclude it.
  serverExternalPackages: ["xlsx"],
  // Vercel serverless function max duration — some API routes (OCR, AI analysis)
  // take longer than the default 10s timeout. Set to 60s for Pro/Enterprise plans.
  // On Hobby plan, the effective max is 10s regardless of this config.
  experimental: {
    maxDuration: 60,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  // Rewrite /uploads/* to the API route that serves local files.
  // This is needed for local dev where uploaded files are stored on the filesystem.
  // In production (Vercel), files are stored in Vercel Blob with absolute URLs,
  // so these rewrites won't be triggered (Blob URLs bypass Next.js routing).
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
