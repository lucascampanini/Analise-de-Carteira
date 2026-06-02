import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },

  turbopack: {},

  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    config.module.rules.push({
      test: /pdf\.worker(\.min)?\.mjs$/,
      type: 'asset/resource',
    });
    return config;
  },
};

export default nextConfig;
