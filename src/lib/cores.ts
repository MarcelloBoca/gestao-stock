/** Cor de amostra para cada nome de cor (cores novas ficam em cinza). */
const MAPA: Record<string, string> = {
  preto: "#1b1418", branco: "#ffffff", bege: "#d9bf9b", castanho: "#7a4b2a", vermelho: "#b42a47", rosa: "#ecb0dc",
  azul: "#2f5fa8", verde: "#2e7d4f", amarelo: "#e8c23a", cinza: "#9a9a9a", cinzento: "#9a9a9a", dourado: "#c9a227",
  prateado: "#c0c0c0", laranja: "#e07b2a", roxo: "#6a3aa2", lilás: "#b59ad8", nude: "#e3c3a8", vinho: "#6e1f34",
};
export function corHex(nome: string | null | undefined): string {
  return MAPA[(nome ?? "").trim().toLowerCase()] ?? "#cfc6cb";
}

export type EstadoStock = "ok" | "pouco" | "zero";
export function estadoStock(stock: number, minimo = 1): EstadoStock {
  if (stock <= 0) return "zero";
  if (stock <= Math.max(1, minimo)) return "pouco";
  return "ok";
}
export function textoStock(stock: number): string {
  if (stock <= 0) return "acabou";
  if (stock === 1) return "último";
  return `há ${stock}`;
}

export function nomeVariante(v: { cor: string | null; tamanho: string | null }): string {
  return [v.cor, v.tamanho ? (/^\d/.test(v.tamanho) ? `nº ${v.tamanho}` : v.tamanho) : null].filter(Boolean).join(" · ");
}
