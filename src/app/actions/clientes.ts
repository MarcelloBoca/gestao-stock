"use server";

import { revalidatePath } from "next/cache";
import { GESTAO, mensagemErro, requireUser } from "@/lib/auth";
import type { ActionState } from "@/lib/types";

/** Gestão: mudar o nome e o contacto de um cliente, ou marcar que não quer mensagens. */
export async function guardarCliente(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { sb } = await requireUser(GESTAO);
    const id = String(fd.get("id") ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: "Cliente não encontrado." };
    const nome = String(fd.get("nome") ?? "").trim().slice(0, 80);
    const contacto = String(fd.get("contacto") ?? "").trim().slice(0, 30);
    if (!nome) return { error: "Escreva o nome do cliente." };
    const { error } = await sb.rpc("guardar_cliente", {
      p_id: id, p_nome: nome, p_contacto: contacto || null, p_aceita: fd.get("aceita") === "1",
    });
    if (error) return { error: mensagemErro(error) };
    revalidatePath("/clientes");
    return { ok: true, message: "Cliente guardado." };
  } catch (e) {
    return { error: mensagemErro(e) };
  }
}
