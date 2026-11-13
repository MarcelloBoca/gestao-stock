import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { ACTIVITY_COOKIE } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

/** Termina a sessão (botão Sair, conta desactivada ou sessão expirada). */
export async function GET(request: Request) {
  const sb = await supabaseServer();
  await sb.auth.signOut();
  const response = NextResponse.redirect(new URL("/login?saiu=1", request.url));
  response.cookies.set(ACTIVITY_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
