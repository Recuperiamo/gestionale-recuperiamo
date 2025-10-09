import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a self-contained server in .next/standalone for easier deploys
  output: "standalone",
};

export default nextConfig;