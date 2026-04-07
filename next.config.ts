import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    "https://preview-chat-0e1a819a-c7db-4ce8-a069-33f4ab184639.space.z.ai",
    "http://preview-chat-0e1a819a-c7db-4ce8-a069-33f4ab184639.space.z.ai",
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "http://21.0.10.7:3000",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
