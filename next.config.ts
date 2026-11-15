import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Voltar a uma página vista há menos de 30 s é instantâneo; as acções que gravam limpam esta memória.
  experimental: { staleTimes: { dynamic: 30 }, serverActions: { bodySizeLimit: "6mb" } },
  images: { unoptimized: true },
  // O PDF dos relatórios leva o logótipo: garante que o ficheiro vai com a função no servidor.
  outputFileTracingIncludes: { "/relatorios/pdf": ["./public/logo-solachic.png"] },
};

export default nextConfig;
