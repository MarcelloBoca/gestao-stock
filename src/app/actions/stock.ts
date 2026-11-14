"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { GESTAO, mensagemErro, requireUser } from "@/lib/auth";
import { parseMT } from "@/lib/format";
import type { ActionState } from "@/lib/types";

const uuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);
const TIPOS = ["entrada", "devolucao", "defeito", "ajuste"];

/** ST-02/ST-03: criar ou editar uma peça, com foto e variantes de cor e número. */
export async function guardarPeca(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let id = "";
  try {
    const { sb } = await requireUser(GESTAO);
    const existente = String(fd.get("id") ?? "");
    const nome = String(fd.get("nome") ?? "").trim().slice(0, 120);
    const categoria = String(fd.get("categoria") ?? "");
    const preco = parseMT(String(fd.get("preco") ?? ""));
    const minimo = Math.max(0, Math.min(999, Number(fd.get("minimo") ?? 1) || 0));
    const activo = fd.get("activo") === null ? true : fd.get("activo") === "1";
    if (!nome) return { error: "Escreva o nome da peça." };
    if (!uuid(categoria)) return { error: "Escolha o tipo de peça." };
    if (!preco || preco <= 0) return { error: "Escreva o preço (maior que zero)." };
    const custoTxt = String(fd.get("custo") ?? "").trim();
    const custo = custoTxt ? parseMT(custoTxt) : null;
    if (custoTxt && (custo === null || custo < 0)) return { error: "O custo não é válido. Escreva só o valor (ex.: 1300)." };

    // cores e números novos escritos à mão
    let cores = fd.getAll("cor").map(String).filter(uuid);
    let tamanhos = fd.getAll("tamanho").map(String).filter(uuid);
    for (const [tabela, campo, lista] of [["cores", "novaCor", cores], ["tamanhos", "novoTamanho", tamanhos]] as const) {
      const nomes = String(fd.get(campo) ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 10);
      for (const n of nomes) {
        const { data: ja } = await sb.from(tabela).select("id").ilike("nome", n).maybeSingle();
        if (ja) { lista.push(ja.id); continue; }
        const row: Record<string, unknown> = tabela === "tamanhos" ? { nome: n.slice(0, 20), ordem: /^\d+$/.test(n) ? 100 + Number(n) : 60 } : { nome: n.charAt(0).toUpperCase() + n.slice(1, 40) };
        const { data: novo, error } = await sb.from(tabela).insert(row as never).select("id").single();
        if (error) return { error: mensagemErro(error) };
        lista.push(novo.id);
      }
    }
    cores = Array.from(new Set(cores));
    tamanhos = Array.from(new Set(tamanhos));
    const variantes: { tamanho_id: string | null; cor_id: string | null }[] = [];
    for (const c of cores.length ? cores : [null]) for (const t of tamanhos.length ? tamanhos : [null]) variantes.push({ cor_id: c, tamanho_id: t });

    // foto (opcional)
    let foto: string | null = null;
    const ficheiro = fd.get("foto");
    if (ficheiro instanceof File && ficheiro.size > 0) {
      if (ficheiro.size > 5 * 1024 * 1024) return { error: "A foto é demasiado grande (máximo 5 MB)." };
      const ext = ficheiro.type === "image/png" ? "png" : ficheiro.type === "image/webp" ? "webp" : "jpg";
      if (!["image/jpeg", "image/png", "image/webp"].includes(ficheiro.type)) return { error: "A foto tem de ser JPG, PNG ou WebP." };
      foto = `produtos/${randomUUID()}.${ext}`;
      const { error } = await sb.storage.from("fotos").upload(foto, ficheiro, { contentType: ficheiro.type, upsert: false });
      if (error) return { error: "Não foi possível carregar a foto. Tente de novo." };
    }

    const { data, error } = await sb.rpc("guardar_produto", {
      p_id: uuid(existente) ? existente : null, p_categoria: categoria, p_nome: nome, p_preco: preco,
      p_stock_minimo: minimo, p_foto_path: foto, p_activo: activo, p_variantes: variantes,
    });
    if (error) return { error: mensagemErro(error) };
    id = data as string;
    if (fd.has("custo")) {
      const { error: e2 } = await sb.rpc("definir_custo", { p_produto: id, p_custo: custo });
      if (e2) return { error: `A peça foi guardada, mas o custo não: ${mensagemErro(e2)}` };
    }
    revalidatePath("/", "layout");
  } catch (e) {
    return { error: mensagemErro(e) };
  }
  redirect(`/pecas/${id}?ok=1`);
}

/** ST-04/ST-05: chegou mercadoria, devolução, defeito ou acerto de contagem. */
export async function registarMovimento(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { sb } = await requireUser(GESTAO);
    const variante = String(fd.get("variante") ?? "");
    const tipo = String(fd.get("tipo") ?? "");
    let qtd = Math.trunc(Number(fd.get("quantidade") ?? 0));
    const motivo = String(fd.get("motivo") ?? "").trim().slice(0, 300);
    if (!uuid(variante)) return { error: "Escolha a peça (e a cor e o número)." };
    if (!TIPOS.includes(tipo)) return { error: "Escolha o que aconteceu." };
    if (!qtd) return { error: "Escreva quantas peças." };
    if (tipo === "ajuste" && fd.get("sentido") === "tirar") qtd = -Math.abs(qtd);
    if (tipo !== "entrada" && !motivo) return { error: "Escreva o motivo." };
    const { error } = await sb.rpc("registar_movimento", { p_variante: variante, p_tipo: tipo, p_quantidade: qtd, p_motivo: motivo || null });
    if (error) return { error: mensagemErro(error) };
    revalidatePath("/", "layout");
    const msg = tipo === "entrada" ? `Entraram ${Math.abs(qtd)} ${Math.abs(qtd) === 1 ? "peça" : "peças"}.` : tipo === "devolucao" ? "Devolução registada; a peça voltou ao stock." : tipo === "defeito" ? "Peça com defeito retirada do stock." : "Contagem acertada.";
    return { ok: true, message: msg };
  } catch (e) {
    return { error: mensagemErro(e) };
  }
}
