import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloud Run: standalone server.js output consumed by the Dockerfile.
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "media.licdn.com" },
      { protocol: "https", hostname: "*.licdn.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
