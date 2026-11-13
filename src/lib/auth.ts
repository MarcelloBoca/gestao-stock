import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { supabaseServer } from "./supabase/server";
import type { Perfil } from "./types";

export type Utilizador = { id: string; nome: string; username: string; perfil: Perfil; activo: boolean };

/** Sessão actual e conta da loja. Validada no servidor em cada página e acção. */
export const getContext = cache(async () => {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  if (!data.user) return null;
  const { data: u } = await sb.from("utilizadores").select("id, nome, username, perfil, activo").eq("id", data.user.id).maybeSingle();
  if (!u || !u.activo) return null;
  return { sb, user: u as Utilizador };
});

export async function requireUser(perfis?: Perfil[]) {
  const ctx = await getContext();
  if (!ctx) redirect("/login?saiu=1");
  if (perfis && !perfis.includes(ctx.user.perfil)) redirect("/");
  return ctx;
}

export const GESTAO: Perfil[] = ["administrador", "gestor"];
export const ADMIN: Perfil[] = ["administrador"];

export class UserError extends Error {}

/** Mensagem para mostrar ao utilizador a partir de um erro do Supabase ou da aplicação. */
export function mensagemErro(error: unknown): string {
  if (error instanceof UserError) return error.message;
  const msg = typeof error === "object" && error && "message" in error ? String((error as { message: unknown }).message) : "";
  const m = msg.match(/^(DADOS|STOCK|PERMISSAO|SESSAO): (.*)$/s);
  if (m) return m[2];
  if (msg.includes("violates check constraint") || msg.includes("violates")) return "Os dados não são válidos. Verifique e tente de novo.";
  if (msg.includes("duplicate key")) return "Já existe um registo com esse nome.";
  if (msg.includes("fetch failed") || msg.includes("network")) return "Sem ligação à internet. Verifique a rede e tente de novo.";
  console.error(error);
  return "Ocorreu um erro. Tente de novo.";
}
