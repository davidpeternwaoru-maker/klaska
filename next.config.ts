import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Host-agnostic build: emits a self-contained server in `.next/standalone`
  // that runs with plain `node server.js` on any Node host or in a Docker
  // container — no Vercel-specific features required to deploy.
  output: "standalone",
};

export default nextConfig;
