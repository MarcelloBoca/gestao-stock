import "server-only";
import { cookies } from "next/headers";
import type { Perfil } from "./types";

/**
 * Pessoas que já entraram neste aparelho, para aparecerem no ecrã de entrada
 * (basta tocar no nome e escrever o PIN). Fica só neste aparelho, num cookie.
 * Assim a lista de contas da loja nunca é mostrada a quem nunca entrou aqui.
 */
export type PessoaAparelho = { u: string; n: string; p: Perfil };

const COOKIE = "sola_pessoas";
const MAX = 8;
const PERFIS: Perfil[] = ["administrador", "gestor", "vendedor"];

function valida(x: unknown): x is PessoaAparelho {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return typeof o.u === "string" && /^[a-z0-9._-]{3,32}$/.test(o.u) && typeof o.n === "string" && o.n.length <= 80 && PERFIS.includes(o.p as Perfil);
}

export async function pessoasDoAparelho(): Promise<PessoaAparelho[]> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return [];
  try {
    const lista = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    return Array.isArray(lista) ? lista.filter(valida).slice(0, MAX) : [];
  } catch {
    return [];
  }
}

async function gravar(lista: PessoaAparelho[]) {
  const jar = await cookies();
  if (!lista.length) {
    jar.delete(COOKIE);
    return;
  }
  jar.set(COOKIE, Buffer.from(JSON.stringify(lista.slice(0, MAX))).toString("base64url"), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365,
  });
}

/** Põe (ou actualiza) a pessoa no topo da lista deste aparelho. */
export async function lembrarPessoa(p: PessoaAparelho) {
  const lista = (await pessoasDoAparelho()).filter((x) => x.u !== p.u);
  await gravar([p, ...lista]);
}

export async function esquecerPessoa(username: string) {
  await gravar((await pessoasDoAparelho()).filter((x) => x.u !== username));
}
