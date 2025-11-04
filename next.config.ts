import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a self-contained server in .next/standalone for easier deploys
  output: "standalone",
  
  // Expose public environment variables to the client bundle
  env: {
    NEXT_PUBLIC_ABLY_API_KEY: process.env.NEXT_PUBLIC_ABLY_API_KEY,
  },
};

export default nextConfig;