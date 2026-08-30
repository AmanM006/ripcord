import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/tf-api/:path*',
        destination: 'http://trueforge:8790/api/v1/:path*'
      }
    ]
  }
};

export default nextConfig;
