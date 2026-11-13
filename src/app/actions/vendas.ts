"use server";

import { revalidatePath } from "next/cache";
import { GESTAO, mensagemErro, requireUser } from "@/lib/auth";
import { FORMAS, type ActionState } from "@/lib/types";

type Linha = { variante_id: string; quantidade: number };
const formaValida = (f: string) => FORMAS.some((x) => x.id === f);
const uuid = (v: unknown) => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);

function linhasValidas(linhas: unknown): Linha[] {
  if (!Array.isArray(linhas)) return [];
  return linhas
    .filter((l) => l && uuid(l.variante_id) && Number.isInteger(Number(l.quantidade)) && Number(l.quantidade) > 0)
    .map((l) => ({ variante_id: String(l.variante_id), quantidade: Number(l.quantidade) }));
}

/** VD-01..VD-04: confirmar a venda; a base de dados verifica o stock e baixa-o na mesma transacção. */
export async function registarVenda(forma: string, linhas: Linha[]): Promise<ActionState> {
  try {
    const { sb } = await requireUser();
    if (!formaValida(forma)) return { error: "Escolha como o cliente pagou." };
    const ls = linhasValidas(linhas);
    if (!ls.length) return { error: "O cesto está vazio." };
    const { data, error } = await sb.rpc("registar_venda", { p_forma: forma, p_linhas: ls });
    if (error) return { error: mensagemErro(error) };
    revalidatePath("/", "layout");
    return { ok: true, data: { id: data as string } };
  } catch (e) {
    return { error: mensagemErro(e) };
  }
}

/** VD-06: corrigir uma venda (gestora e administradora). */
export async function corrigirVenda(id: string, forma: string, linhas: Linha[], motivo: string): Promise<ActionState> {
  try {
    const { sb } = await requireUser(GESTAO);
    if (!uuid(id)) return { error: "Venda inválida." };
    if (!formaValida(forma)) return { error: "Escolha como o cliente pagou." };
    if (!motivo.trim()) return { error: "Escreva o motivo da correcção." };
    const ls = linhasValidas(linhas);
    if (!ls.length) return { error: "A venda tem de ficar com pelo menos uma peça. Para tirar tudo, anule a venda." };
    const { error } = await sb.rpc("corrigir_venda", { p_venda: id, p_forma: forma, p_linhas: ls, p_motivo: motivo.slice(0, 300) });
    if (error) return { error: mensagemErro(error) };
    revalidatePath("/", "layout");
    return { ok: true, message: "Venda corrigida. O stock foi acertado." };
  } catch (e) {
    return { error: mensagemErro(e) };
  }
}

/** VD-07: anular uma venda (gestora e administradora). */
export async function anularVenda(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { sb } = await requireUser(GESTAO);
    const id = String(fd.get("id") ?? "");
    const motivo = String(fd.get("motivo") ?? "").trim().slice(0, 300);
    if (!uuid(id)) return { error: "Venda inválida." };
    if (!motivo) return { error: "Escreva o motivo da anulação." };
    const { error } = await sb.rpc("anular_venda", { p_venda: id, p_motivo: motivo });
    if (error) return { error: mensagemErro(error) };
    revalidatePath("/", "layout");
    return { ok: true, message: "Venda anulada. As peças voltaram ao stock." };
  } catch (e) {
    return { error: mensagemErro(e) };
  }
}
