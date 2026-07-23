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
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' ws: wss: https:",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "localhost:81",
    "localhost:3000",
    // Add your production domain here, e.g.:
    // "tenetbid.com",
    // "tenet.space-z.ai",
  ],
  // Turbopack serverExternalPackages: packages that should NOT be bundled
  // by Turbopack and should be resolved at runtime instead.
  // xlsx (SheetJS) has known Turbopack resolution issues — exclude it.
  serverExternalPackages: ["xlsx"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
