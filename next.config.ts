import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Voltar a uma página vista há menos de 30 s é instantâneo; as acções que gravam limpam esta memória.
  experimental: { staleTimes: { dynamic: 30 }, serverActions: { bodySizeLimit: "6mb" } },
  images: { unoptimized: true },
};

export default nextConfig;
