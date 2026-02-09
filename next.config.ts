import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for kiosk deployment (no server needed)
  output: "export",

  // Use empty turbopack config (Next.js 16 default)
  turbopack: {},
};

export default nextConfig;
