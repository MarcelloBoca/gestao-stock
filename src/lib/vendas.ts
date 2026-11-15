import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { inicioDiaUtc, somarDias } from "./format";
import { nomeVariante } from "./cores";

export type LinhaVenda = { id: string; variante_id: string; produto_id: string; nome: string; detalhe: string; foto: string | null; categoria: string; quantidade: number; preco: number; subtotal: number; substituida: boolean };
export type Venda = { id: string; criada_em: string; forma: string; total: number; estado: "normal" | "corrigida" | "anulada"; motivo: string | null; vendedor_id: string; vendedor: string; cliente: { id: string; nome: string; contacto: string | null } | null; linhas: LinhaVenda[] };

const SELECT =
  "id, criada_em, forma_pagamento, total, estado, motivo, vendedor_id, cliente_id, utilizadores(nome), clientes(id, nome, contacto), linhas_venda(id, quantidade, preco_unitario, subtotal, substituida, variante_id, variantes(produto_id, tamanhos(nome), cores(nome), produtos(nome, foto_path, categorias(nome))))";

type R = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function mapear(v: R): Venda {
  return {
    id: v.id, criada_em: v.criada_em, forma: v.forma_pagamento, total: Number(v.total), estado: v.estado, motivo: v.motivo ?? null,
    vendedor_id: v.vendedor_id, vendedor: v.utilizadores?.nome ?? "",
    cliente: v.clientes ? { id: v.clientes.id, nome: v.clientes.nome, contacto: v.clientes.contacto ?? null } : null,
    linhas: (v.linhas_venda ?? []).map((l: R) => ({
      id: l.id, variante_id: l.variante_id, produto_id: l.variantes?.produto_id, nome: l.variantes?.produtos?.nome ?? "",
      detalhe: nomeVariante({ cor: l.variantes?.cores?.nome ?? null, tamanho: l.variantes?.tamanhos?.nome ?? null }),
      foto: l.variantes?.produtos?.foto_path ?? null, categoria: l.variantes?.produtos?.categorias?.nome ?? "",
      quantidade: l.quantidade, preco: Number(l.preco_unitario), subtotal: Number(l.subtotal), substituida: Boolean(l.substituida),
    })).sort((a: LinhaVenda, b: LinhaVenda) => Number(a.substituida) - Number(b.substituida)),
  };
}

/** Vendas entre dois dias de Maputo (inclusive), mais recentes primeiro. As regras de acesso limitam o que cada perfil vê. */
export async function listarVendas(sb: SupabaseClient, de: string, ate: string, opts: { vendedor?: string; estado?: string; limite?: number } = {}): Promise<Venda[]> {
  let q = sb.from("vendas").select(SELECT).gte("criada_em", inicioDiaUtc(de)).lt("criada_em", inicioDiaUtc(somarDias(ate, 1))).order("criada_em", { ascending: false });
  if (opts.vendedor) q = q.eq("vendedor_id", opts.vendedor);
  if (opts.estado) q = q.eq("estado", opts.estado);
  q = q.limit(opts.limite ?? 300);
  const { data, error } = await q;
  if (error) throw error;
  return (data as R[]).map(mapear);
}

export async function obterVenda(sb: SupabaseClient, id: string): Promise<Venda | null> {
  const { data, error } = await sb.from("vendas").select(SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapear(data as R) : null;
}

export const linhasActivas = (v: Venda) => v.linhas.filter((l) => !l.substituida);
export const descricao = (v: Venda) =>
  linhasActivas(v).map((l) => `${l.nome}${l.detalhe ? ", " + l.detalhe : ""}${l.quantidade > 1 ? ` × ${l.quantidade}` : ""}`).join(" · ");

export type Relatorio = {
  total: number; vendas: number; por_forma: Record<string, number>;
  por_vendedor: { nome: string; total: number; vendas: number }[];
  por_produto: { id: string; nome: string; quantidade: number; total: number }[];
  por_categoria: { nome: string; total: number }[];
};
export async function relatorio(sb: SupabaseClient, de: string, ate: string): Promise<Relatorio> {
  const { data, error } = await sb.rpc("relatorio_vendas", { p_inicio: de, p_fim: ate });
  if (error) throw error;
  const r = data as R;
  return {
    total: Number(r.total ?? 0), vendas: Number(r.vendas ?? 0),
    por_forma: Object.fromEntries(Object.entries(r.por_forma ?? {}).map(([k, v]) => [k, Number(v)])),
    por_vendedor: (r.por_vendedor ?? []).map((x: R) => ({ nome: x.nome, total: Number(x.total), vendas: Number(x.vendas) })),
    por_produto: (r.por_produto ?? []).map((x: R) => ({ id: x.id, nome: x.nome, quantidade: Number(x.quantidade), total: Number(x.total) })),
    por_categoria: (r.por_categoria ?? []).map((x: R) => ({ nome: x.nome, total: Number(x.total) })),
  };
}
