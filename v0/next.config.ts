import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.fashn.ai",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
