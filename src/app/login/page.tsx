import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { pessoasDoAparelho } from "@/lib/pessoas";
import { pinActivo } from "@/lib/pin";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Entrar" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const next = typeof params.next === "string" && params.next.startsWith("/") && !params.next.startsWith("//") ? params.next : "/";
  const notice = params.saiu === "1" ? "A sessão terminou. Entre de novo." : undefined;
  const sb = await supabaseServer();
  const { data } = await sb.rpc("existe_administrador");
  const pessoas = await pessoasDoAparelho();
  return <LoginForm next={next} notice={notice} firstAccess={data === false} pessoas={pessoas} pin={pinActivo()} senha={params.senha === "1"} />;
}
