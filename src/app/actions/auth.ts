"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { ACTIVITY_COOKIE, SUPABASE_KEY, SUPABASE_URL, emailDe } from "@/lib/supabase/config";
import { mensagemErro, requireUser } from "@/lib/auth";
import { esquecerPessoa, lembrarPessoa } from "@/lib/pessoas";
import { pinActivo, pinFraco, pinValido, senhaDoPin } from "@/lib/pin";
import type { ActionState, Perfil } from "@/lib/types";

const WRONG = "Utilizador ou palavra-passe errados. Verifique e tente de novo.";
const PIN_ERRADO = "PIN errado. Tente de novo.";
const SEM_PIN = "A entrada com PIN ainda não está ligada. Entre com a palavra-passe.";
const BLOQUEADA = "Demasiadas tentativas erradas. A conta fica bloqueada durante 10 minutos.";

const txt = (fd: FormData, k: string, max = 200) => String(fd.get(k) ?? "").slice(0, max);
const normalizar = (u: string) => u.trim().toLowerCase();
const valido = (u: string) => /^[a-z0-9._-]{3,32}$/.test(u);

function safeNext(value: string): string {
  return value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/login") ? value : "/";
}

async function marcarActividade() {
  const jar = await cookies();
  jar.set(ACTIVITY_COOKIE, String(Date.now()), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30,
  });
}

/** CT-01: entrar com utilizador e palavra-passe; 5 tentativas erradas bloqueiam a conta 10 minutos. */
export async function login(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let target = "/";
  try {
    const username = normalizar(txt(fd, "username", 64));
    const password = txt(fd, "password", 128);
    target = safeNext(txt(fd, "next", 300));
    if (!username || !password) return { error: "Escreva o utilizador e a palavra-passe." };
    if (!valido(username)) return { error: WRONG };

    const sb = await supabaseServer();
    const { data: bloqueada } = await sb.rpc("conta_bloqueada", { p_username: username });
    if (bloqueada) return { error: "Demasiadas tentativas erradas. Tente de novo daqui a 10 minutos." };

    const { data, error } = await sb.auth.signInWithPassword({ email: emailDe(username), password });
    if (error || !data.user) {
      if (/banned/i.test(error?.message ?? "")) return { error: "Esta conta foi desactivada. Fale com a administradora." };
      await sb.rpc("registar_tentativa_falhada", { p_username: username });
      const { data: agora } = await sb.rpc("conta_bloqueada", { p_username: username });
      return { error: agora ? BLOQUEADA : WRONG };
    }
    const { data: u } = await sb.from("utilizadores").select("activo, nome, perfil").eq("id", data.user.id).maybeSingle();
    if (!u?.activo) {
      await sb.auth.signOut();
      return { error: "Esta conta foi desactivada. Fale com a administradora." };
    }
    await sb.rpc("limpar_tentativas");
    await marcarActividade();
    await lembrarPessoa({ u: username, n: String(u.nome ?? username).slice(0, 80), p: u.perfil as Perfil });
  } catch (error) {
    return { error: mensagemErro(error) };
  }
  redirect(target);
}

/** Entrar com o nome (escolhido ou escrito) e o PIN de 4 números; os mesmos limites de tentativas. */
export async function entrarComPin(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let target = "/";
  try {
    if (!pinActivo()) return { error: SEM_PIN };
    const username = normalizar(txt(fd, "username", 64));
    const pin = txt(fd, "pin", 8);
    target = safeNext(txt(fd, "next", 300));
    if (!username) return { error: "Escreva o seu utilizador." };
    if (!pinValido(pin)) return { error: "O PIN tem 4 números." };
    if (!valido(username)) return { error: "Utilizador ou PIN errados. Verifique e tente de novo." };

    const sb = await supabaseServer();
    const { data: bloqueada } = await sb.rpc("conta_bloqueada", { p_username: username });
    if (bloqueada) return { error: "Demasiadas tentativas erradas. Tente de novo daqui a 10 minutos." };

    const { data, error } = await sb.auth.signInWithPassword({ email: emailDe(username), password: senhaDoPin(username, pin) });
    if (error || !data.user) {
      if (/banned/i.test(error?.message ?? "")) return { error: "Esta conta foi desactivada. Fale com a administradora." };
      await sb.rpc("registar_tentativa_falhada", { p_username: username });
      const { data: agora } = await sb.rpc("conta_bloqueada", { p_username: username });
      return { error: agora ? BLOQUEADA : PIN_ERRADO };
    }
    const { data: u } = await sb.from("utilizadores").select("activo, nome, perfil").eq("id", data.user.id).maybeSingle();
    if (!u?.activo) {
      await sb.auth.signOut();
      return { error: "Esta conta foi desactivada. Fale com a administradora." };
    }
    await sb.rpc("limpar_tentativas");
    await marcarActividade();
    await lembrarPessoa({ u: username, n: String(u.nome ?? username).slice(0, 80), p: u.perfil as Perfil });
  } catch (error) {
    return { error: mensagemErro(error) };
  }
  redirect(target);
}

/** Tirar uma pessoa da lista deste aparelho (não mexe na conta). */
export async function esquecerNoAparelho(username: string): Promise<void> {
  await esquecerPessoa(normalizar(String(username).slice(0, 64)));
}

/** Escolher ou mudar o próprio PIN. Pede o PIN actual, ou a palavra-passe para quem ainda não tem PIN. */
export async function mudarPin(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { user } = await requireUser();
    if (!pinActivo()) return { error: "A entrada com PIN ainda não está ligada neste servidor (falta a chave PIN_SECRET)." };
    const actual = txt(fd, "current", 128);
    const pin = txt(fd, "pin", 8);
    if (!actual) return { error: "Escreva o seu PIN actual (ou a palavra-passe, se ainda não tem PIN)." };
    if (!pinValido(pin)) return { error: "O PIN novo tem de ter 4 números." };
    if (pinFraco(pin)) return { error: "Esse PIN é fácil de adivinhar. Evite números iguais ou seguidos (1111, 1234)." };
    if (pin !== txt(fd, "confirm", 8)) return { error: "Os dois PINs não são iguais." };
    const sb = await supabaseServer();
    const email = emailDe(user.username);
    let certo = false;
    if (pinValido(actual)) certo = !(await sb.auth.signInWithPassword({ email, password: senhaDoPin(user.username, actual) })).error;
    if (!certo) certo = !(await sb.auth.signInWithPassword({ email, password: actual })).error;
    if (!certo) return { error: "O PIN ou a palavra-passe actual não está certo." };
    const { error } = await sb.auth.updateUser({ password: senhaDoPin(user.username, pin) });
    if (error) return { error: "Não foi possível guardar o PIN. Tente de novo." };
    await sb.auth.signOut({ scope: "others" });
    return { ok: true, message: "PIN guardado. Da próxima vez, entre com o PIN novo. As sessões noutros aparelhos terminaram." };
  } catch (error) {
    return { error: mensagemErro(error) };
  }
}

/** Primeiro acesso: cria a conta da administradora (protegido pelo código SETUP_CODE guardado no Supabase). */
export async function primeiroAcesso(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let username = "";
  try {
    username = normalizar(txt(fd, "username", 64));
    const password = txt(fd, "password", 128);
    if (password !== txt(fd, "confirm", 128)) return { error: "As duas palavras-passe não são iguais." };
    const res = await fetch(`${SUPABASE_URL}/functions/v1/contas`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
      body: JSON.stringify({ accao: "primeiro_acesso", codigo: txt(fd, "code"), nome: txt(fd, "name", 80), username, password }),
      cache: "no-store",
    });
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!res.ok || !body.ok) return { error: body.error ?? "Não foi possível criar a conta. Tente de novo." };
    const sb = await supabaseServer();
    const { error } = await sb.auth.signInWithPassword({ email: emailDe(username), password });
    if (error) return { error: "A conta foi criada. Entre com o seu utilizador." };
    await marcarActividade();
  } catch (error) {
    return { error: mensagemErro(error) };
  }
  redirect("/");
}

/** CT-05: mudar a própria palavra-passe. */
export async function mudarPalavraPasse(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { user } = await requireUser();
    const actual = txt(fd, "current", 128);
    const nova = txt(fd, "password", 128);
    if (nova.length < 8) return { error: "A palavra-passe tem de ter pelo menos 8 caracteres." };
    if (nova !== txt(fd, "confirm", 128)) return { error: "As duas palavras-passe não são iguais." };
    if (nova === actual) return { error: "Escolha uma palavra-passe diferente da anterior." };
    const sb = await supabaseServer();
    const { error: e1 } = await sb.auth.signInWithPassword({ email: emailDe(user.username), password: actual });
    if (e1) return { error: "A palavra-passe actual não está certa." };
    const { error } = await sb.auth.updateUser({ password: nova });
    if (error) return { error: "Não foi possível mudar a palavra-passe. Tente de novo." };
    await sb.auth.signOut({ scope: "others" });
    return { ok: true, message: "Palavra-passe mudada. As sessões noutros aparelhos terminaram." };
  } catch (error) {
    return { error: mensagemErro(error) };
  }
}
