import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: false,
  allowedDevOrigins: [
    "preview-chat-a088b4be-1390-42d4-93af-93ceb3d81549.space-z.ai",
    "127.0.0.1",
    "localhost",
  ],
};

export default nextConfig;
