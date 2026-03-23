import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: "/dashboard/usage", destination: "/dashboard/ai-usage", permanent: true }];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
