"use server";

import { revalidatePath } from "next/cache";
import { ADMIN, mensagemErro, requireUser } from "@/lib/auth";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import { pinActivo, pinFraco, pinValido, senhaDoPin } from "@/lib/pin";
import type { ActionState } from "@/lib/types";

const NOMES: Record<string, string> = {
  criar: "Conta criada. Dê o utilizador e o PIN à pessoa.",
  repor_senha: "PIN novo guardado. Dê-o à pessoa.",
  mudar_perfil: "Função mudada.",
  desactivar: "Conta desactivada. Esta pessoa já não consegue entrar.",
  activar: "Conta activada.",
  mudar_nome: "Nome mudado.",
};

/** CT-02/CT-03/CT-05: a administradora gere as contas (a função no Supabase volta a verificar o perfil). */
export async function gerirConta(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { sb } = await requireUser(ADMIN);
    const accao = String(fd.get("accao") ?? "");
    if (!NOMES[accao]) return { error: "Acção desconhecida." };
    let password: FormDataEntryValue | null = fd.get("password");
    if (accao === "criar" || accao === "repor_senha") {
      // A administradora dá um PIN de 4 números; o Supabase recebe a palavra-passe derivada dele.
      if (!pinActivo()) return { error: "A entrada com PIN ainda não está ligada neste servidor (falta a chave PIN_SECRET)." };
      const pin = String(fd.get("pin") ?? "");
      if (!pinValido(pin)) return { error: "O PIN tem de ter 4 números." };
      if (pinFraco(pin)) return { error: "Esse PIN é fácil de adivinhar. Evite números iguais ou seguidos (1111, 1234)." };
      if (pin !== String(fd.get("confirm") ?? "")) return { error: "Os dois PINs não são iguais." };
      let username = String(fd.get("username") ?? "").trim().toLowerCase();
      if (accao === "repor_senha") {
        const { data: u } = await sb.from("utilizadores").select("username").eq("id", String(fd.get("id") ?? "")).maybeSingle();
        if (!u?.username) return { error: "Conta não encontrada." };
        username = String(u.username);
      }
      if (!/^[a-z0-9._-]{3,32}$/.test(username)) return { error: "O utilizador só pode ter letras sem acentos, números, ponto ou hífen (3 a 32)." };
      password = senhaDoPin(username, pin);
    }
    const { data } = await sb.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return { error: "A sessão terminou. Entre de novo." };
    const res = await fetch(`${SUPABASE_URL}/functions/v1/contas`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        accao, id: fd.get("id"), nome: fd.get("nome"), username: typeof fd.get("username") === "string" ? String(fd.get("username")).trim().toLowerCase() : fd.get("username"), password, perfil: fd.get("perfil"),
      }),
      cache: "no-store",
    });
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!res.ok || !body.ok) return { error: body.error ?? "Não foi possível guardar. Tente de novo." };
    revalidatePath("/funcionarias");
    return { ok: true, message: NOMES[accao] };
  } catch (e) {
    return { error: mensagemErro(e) };
  }
}

/** NT-04: destinatários e hora do SMS. */
export async function gerirSms(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { sb } = await requireUser(ADMIN);
    const accao = String(fd.get("accao") ?? "");
    if (accao === "juntar") {
      const nome = String(fd.get("nome") ?? "").trim().slice(0, 80);
      let numero = String(fd.get("numero") ?? "").replace(/[\s-]/g, "");
      if (/^8\d{8}$/.test(numero)) numero = `+258${numero}`;
      if (!nome) return { error: "Escreva o nome." };
      if (!/^\+?[0-9]{9,15}$/.test(numero)) return { error: "Escreva o número (ex.: 84 123 4567)." };
      const { error } = await sb.from("destinatarios_sms").insert({ nome, numero });
      if (error) return { error: error.message.includes("duplicate") ? "Esse número já está na lista." : mensagemErro(error) };
      revalidatePath("/sms");
      return { ok: true, message: `${nome} passa a receber o SMS seguinte.` };
    }
    if (accao === "activo") {
      const id = String(fd.get("id") ?? "");
      const activo = fd.get("valor") === "1";
      const { error } = await sb.from("destinatarios_sms").update({ activo }).eq("id", id);
      if (error) return { error: mensagemErro(error) };
      revalidatePath("/sms");
      return { ok: true, message: activo ? "Volta a receber o SMS." : "Deixa de receber o SMS." };
    }
    if (accao === "hora") {
      const hora = String(fd.get("hora") ?? "");
      if (!/^\d{2}:\d{2}$/.test(hora)) return { error: "Escolha a hora." };
      const { error } = await sb.from("definicoes").update({ hora_sms: hora }).eq("id", true);
      if (error) return { error: mensagemErro(error) };
      revalidatePath("/sms");
      return { ok: true, message: `O SMS passa a sair às ${hora}.` };
    }
    return { error: "Acção desconhecida." };
  } catch (e) {
    return { error: mensagemErro(e) };
  }
}
