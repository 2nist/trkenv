const path = require("path");

const tracingRoot =
  process.env.WORKSPACE_ROOT && process.env.WORKSPACE_ROOT.trim().length > 0
    ? process.env.WORKSPACE_ROOT
    : process.cwd();

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  eslint: {
    // Disable ESLint during builds to allow inline styles
    ignoreDuringBuilds: true,
  },
  experimental: {
    // Safe fallback prevents path.relative(undefined) crashes in dev
    outputFileTracingRoot: tracingRoot,
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/songs",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/:path*",
        destination: "/:path*",
      },
    ];
  },
};
module.exports = nextConfig;
