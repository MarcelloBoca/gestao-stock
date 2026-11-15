import { mt } from "./format";
import { nomeForma, PERFIS, type Perfil } from "./types";

type J = Record<string, any> | null; // eslint-disable-line @typescript-eslint/no-explicit-any
const TIPO: Record<string, string> = { entrada: "Entrada", devolucao: "Devolução", defeito: "Defeito", ajuste: "Acerto de contagem" };

const pecas = (j: J) => ((j?.linhas ?? []) as { peca: string; quantidade: number }[]).map((l) => `${l.peca}${l.quantidade > 1 ? ` × ${l.quantidade}` : ""}`).join("; ");

/** Etiqueta curta, cor e frase simples para cada acção do registo (CT-07). */
export function descrever(accao: string, antes: J, depois: J): { etiqueta: string; tom: "ok" | "pouco" | "zero" | "rosa" | "cinza"; texto: string } {
  switch (accao) {
    case "venda_registada":
      return { etiqueta: "Venda", tom: "ok", texto: `${mt(depois?.total)} · ${nomeForma(depois?.forma_pagamento)} · ${pecas(depois)}` };
    case "venda_corrigida":
      return { etiqueta: "Venda corrigida", tom: "pouco", texto: `De ${mt(antes?.total)} (${pecas(antes)}) para ${mt(depois?.total)} (${pecas(depois)}). Motivo: ${depois?.motivo ?? "—"}.` };
    case "venda_anulada":
      return { etiqueta: "Venda anulada", tom: "zero", texto: `${mt(antes?.total)} · ${pecas(antes)}. As peças voltaram ao stock. Motivo: ${depois?.motivo ?? "—"}.` };
    case "movimento_stock":
      return { etiqueta: TIPO[depois?.tipo] ?? "Stock", tom: "ok", texto: `${depois?.peca}: ${depois?.quantidade > 0 ? "+" : "−"}${Math.abs(depois?.quantidade ?? 0)} (fica com ${depois?.stock}).${depois?.motivo ? ` Motivo: ${depois.motivo}.` : ""}` };
    case "preco_alterado":
      return { etiqueta: "Preço alterado", tom: "rosa", texto: `${depois?.nome}: de ${mt(antes?.preco_venda)} para ${mt(depois?.preco_venda)}.` };
    case "cliente_editado":
      return { etiqueta: "Cliente editado", tom: "cinza", texto: `${depois?.nome}${depois?.aceita_mensagens === false ? " (não quer mensagens)" : ""}.` };
    case "custo_alterado":
      return { etiqueta: "Custo alterado", tom: "rosa", texto: `${depois?.peca}: ${antes?.custo === null || antes?.custo === undefined ? "sem custo" : mt(antes.custo)} para ${depois?.custo === null || depois?.custo === undefined ? "sem custo" : mt(depois.custo)}.` };
    case "produto_criado":
      return { etiqueta: "Peça nova", tom: "rosa", texto: `${depois?.nome} · ${mt(depois?.preco_venda)}.` };
    case "produto_editado":
      return { etiqueta: "Peça editada", tom: "rosa", texto: `${depois?.nome}${antes?.activo !== depois?.activo ? (depois?.activo ? " voltou à venda." : " saiu de venda.") : "."}` };
    case "conta_criada":
      return { etiqueta: "Conta criada", tom: "cinza", texto: `${depois?.nome} (${depois?.username}), ${PERFIS[depois?.perfil as Perfil]?.toLowerCase() ?? depois?.perfil}.` };
    case "senha_reposta":
      return { etiqueta: "PIN novo", tom: "cinza", texto: `PIN (ou palavra-passe) de ${depois?.username} reposto.` };
    case "perfil_mudado":
      return { etiqueta: "Função mudada", tom: "cinza", texto: `De ${PERFIS[antes?.perfil as Perfil] ?? antes?.perfil} para ${PERFIS[depois?.perfil as Perfil] ?? depois?.perfil}.` };
    case "conta_desactivada":
      return { etiqueta: "Conta desactivada", tom: "zero", texto: "A conta deixou de poder entrar." };
    case "conta_activada":
      return { etiqueta: "Conta activada", tom: "ok", texto: "A conta voltou a poder entrar." };
    case "nome_mudado":
      return { etiqueta: "Nome mudado", tom: "cinza", texto: `De ${antes?.nome} para ${depois?.nome}.` };
    case "sms_definicoes":
      return { etiqueta: "SMS", tom: "cinza", texto: "Definições de SMS mudadas." };
    default:
      return { etiqueta: accao, tom: "cinza", texto: "" };
  }
}

export const GRUPOS: Record<string, string[]> = {
  vendas: ["venda_registada", "venda_corrigida", "venda_anulada"],
  stock: ["movimento_stock"],
  precos: ["preco_alterado", "custo_alterado", "produto_criado", "produto_editado"],
  contas: ["conta_criada", "senha_reposta", "perfil_mudado", "conta_desactivada", "conta_activada", "nome_mudado"],
};
