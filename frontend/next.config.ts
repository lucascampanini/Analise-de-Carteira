import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath,
  trailingSlash: true,
  images: { unoptimized: true },

  // Turbopack (padrão no Next.js 16) — canvas alias não é necessário no Turbopack
  // pois pdfjs-dist é carregado apenas via 'use client' + dynamic import no browser
  turbopack: {},

  webpack: (config) => {
    // pdfjs-dist tenta importar 'canvas' no Node — não existe no browser
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    return config;
  },
};

export default nextConfig;
