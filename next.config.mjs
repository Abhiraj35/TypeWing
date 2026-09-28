/** @type {import('next').NextConfig} */
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";
const isEu = posthogHost.includes("eu.i.posthog.com") || posthogHost.includes("eu.posthog.com");
const posthogAssetsHost = isEu
  ? "https://eu-assets.i.posthog.com"
  : "https://us-assets.i.posthog.com";
const posthogApiHost = isEu
  ? "https://eu.i.posthog.com"
  : "https://us.i.posthog.com";

const nextConfig = {
  allowedDevOrigins: ["*"],
  cacheComponents: true,
  turbopack: {},
  env: {
    NEXT_PUBLIC_SOCKET_URL:
      process.env.NEXT_PUBLIC_SOCKET_URL || process.env.SOCKET_URL || "http://localhost:3001",
  },
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: `${posthogAssetsHost}/static/:path*`,
      },
      {
        source: "/ingest/:path*",
        destination: `${posthogApiHost}/:path*`,
      },
    ];
  },
};

export default nextConfig;