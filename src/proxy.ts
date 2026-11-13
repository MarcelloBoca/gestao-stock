import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { ACTIVITY_COOKIE, INACTIVITY_MS, SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

const PUBLICAS = ["/login", "/primeiro-acesso", "/sair"];

// Renova a sessão do Supabase, termina-a após 12 h sem uso e envia para a entrada quem não tem sessão.
// As permissões são verificadas a sério no servidor (requireUser) e na base de dados.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const sb = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await sb.auth.getUser();
  const { pathname, search } = request.nextUrl;
  const publica = PUBLICAS.includes(pathname);

  if (data.user) {
    const last = Number(request.cookies.get(ACTIVITY_COOKIE)?.value ?? 0);
    if (last && Date.now() - last > INACTIVITY_MS) {
      await sb.auth.signOut();
      const url = new URL("/login", request.url);
      url.searchParams.set("saiu", "1");
      const redirect = NextResponse.redirect(url);
      response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
      redirect.cookies.delete(ACTIVITY_COOKIE);
      return redirect;
    }
    response.cookies.set(ACTIVITY_COOKIE, String(Date.now()), {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  }

  if (publica) return response;
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new NextResponse("Sessão expirada. Entre novamente.", { status: 401 });
  }
  const url = new URL("/login", request.url);
  if (pathname !== "/") url.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
