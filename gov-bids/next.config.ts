import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray package-lock.json in the home directory made Next trace above the
  // repo and warn on every build. Pin the root to this project.
  outputFileTracingRoot: __dirname,
  /* config options here */
};

export default nextConfig;
