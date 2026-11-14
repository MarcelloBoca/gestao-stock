import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Variante = { id: string; tamanho: string | null; tamanho_id: string | null; ordem: number; cor: string | null; cor_id: string | null; stock: number; activa: boolean };
export type Peca = {
  id: string; nome: string; preco: number; stock_minimo: number; activo: boolean; foto: string | null;
  categoria_id: string; categoria: string; categoria_activa: boolean; variantes: Variante[]; stock: number;
};
export type Lista = { id: string; nome: string; ordem?: number };

type Row = Record<string, unknown>;

/** Catálogo completo com stock de cada variante. `soAVenda` deixa só o que se pode vender. */
export async function catalogo(sb: SupabaseClient, soAVenda = false): Promise<{ pecas: Peca[]; tamanhos: Lista[]; cores: Lista[]; categorias: (Lista & { activa: boolean })[] }> {
  const [p, v, s, t, c, cat] = await Promise.all([
    sb.from("produtos").select("id, nome, preco_venda, stock_minimo, activo, foto_path, categoria_id").order("nome"),
    sb.from("variantes").select("id, produto_id, tamanho_id, cor_id, activa"),
    sb.from("stock_variantes").select("variante_id, stock"),
    sb.from("tamanhos").select("id, nome, ordem").order("ordem"),
    sb.from("cores").select("id, nome").order("nome"),
    sb.from("categorias").select("id, nome, activa").order("nome"),
  ]);
  for (const r of [p, v, s, t, c, cat]) if (r.error) throw r.error;
  const tam = new Map((t.data as Row[]).map((x) => [x.id as string, x]));
  const cor = new Map((c.data as Row[]).map((x) => [x.id as string, x]));
  const cats = new Map((cat.data as Row[]).map((x) => [x.id as string, x]));
  const stock = new Map((s.data as Row[]).map((x) => [x.variante_id as string, Number(x.stock ?? 0)]));
  const porProduto = new Map<string, Variante[]>();
  for (const x of v.data as Row[]) {
    const tt = x.tamanho_id ? tam.get(x.tamanho_id as string) : null;
    const cc = x.cor_id ? cor.get(x.cor_id as string) : null;
    const lista = porProduto.get(x.produto_id as string) ?? [];
    lista.push({
      id: x.id as string, tamanho_id: (x.tamanho_id as string) ?? null, tamanho: (tt?.nome as string) ?? null, ordem: Number(tt?.ordem ?? 0),
      cor_id: (x.cor_id as string) ?? null, cor: (cc?.nome as string) ?? null, stock: stock.get(x.id as string) ?? 0, activa: Boolean(x.activa),
    });
    porProduto.set(x.produto_id as string, lista);
  }
  let pecas: Peca[] = (p.data as Row[]).map((x) => {
    const cc = cats.get(x.categoria_id as string);
    const vs = (porProduto.get(x.id as string) ?? []).sort((a, b) => (a.cor ?? "").localeCompare(b.cor ?? "") || a.ordem - b.ordem);
    return {
      id: x.id as string, nome: x.nome as string, preco: Number(x.preco_venda), stock_minimo: Number(x.stock_minimo ?? 0),
      activo: Boolean(x.activo), foto: (x.foto_path as string) ?? null, categoria_id: x.categoria_id as string,
      categoria: (cc?.nome as string) ?? "", categoria_activa: Boolean(cc?.activa ?? true), variantes: vs,
      stock: vs.filter((y) => y.activa).reduce((sum, y) => sum + y.stock, 0),
    };
  });
  if (soAVenda) {
    pecas = pecas
      .filter((x) => x.activo && x.categoria_activa)
      .map((x) => ({ ...x, variantes: x.variantes.filter((y) => y.activa) }))
      .filter((x) => x.variantes.length > 0);
  }
  return {
    pecas,
    tamanhos: (t.data as Row[]).map((x) => ({ id: x.id as string, nome: x.nome as string, ordem: Number(x.ordem) })),
    cores: (c.data as Row[]).map((x) => ({ id: x.id as string, nome: x.nome as string })),
    categorias: (cat.data as Row[]).map((x) => ({ id: x.id as string, nome: x.nome as string, activa: Boolean(x.activa) })),
  };
}

/** Variantes com stock igual ou abaixo do mínimo (ST-08), da mais baixa para a mais alta. */
export function aRepor(pecas: Peca[]) {
  const out: { peca: Peca; variante: Variante }[] = [];
  for (const p of pecas) {
    if (!p.activo) continue;
    for (const v of p.variantes) if (v.activa && v.stock <= p.stock_minimo) out.push({ peca: p, variante: v });
  }
  return out.sort((a, b) => a.variante.stock - b.variante.stock);
}

/** A peça está a acabar quando alguma cor/número ainda tem stock mas já não passa do mínimo (esgotadas não contam). */
export const pecaAAcabar = (p: Peca) => p.activo && p.variantes.some((v) => v.activa && v.stock > 0 && v.stock <= Math.max(1, p.stock_minimo));

export { nomeVariante } from "./cores";
