/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["*"],
  cacheComponents: true,
  turbopack: {},
  env: {
    NEXT_PUBLIC_SOCKET_URL: process.env.SOCKET_URL || "http://localhost:3001",
  },
};

export default nextConfig;