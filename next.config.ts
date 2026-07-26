import type { NextConfig } from "next";

// Security response headers applied to every route (Helmet-equivalent). Kept
// conservative so they don't break the app's own inline styles/scripts; tighten
// the CSP further once a nonce pipeline is in place.
const securityHeaders = [
  // Force HTTPS for 2 years incl. subdomains (ignored on plain HTTP/localhost).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Don't let the browser MIME-sniff responses.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Disallow being framed (clickjacking) — app is not embedded anywhere.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  // Send only the origin as referrer to other sites.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Turn off powerful browser features the app doesn't use.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  // Host-agnostic build: emits a self-contained server in `.next/standalone`
  // that runs with plain `node server.js` on any Node host or in Docker.
  output: "standalone",
  // Cap request body size for Server Actions (defence against oversized payloads).
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
  poweredByHeader: false, // don't advertise the framework
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
