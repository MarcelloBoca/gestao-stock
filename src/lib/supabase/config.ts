export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** Domínio técnico dos emails internos: cada pessoa entra só com o nome de utilizador. */
export const EMAIL_DOMAIN = "utilizadores.solachic.app";
export const emailDe = (username: string) => `${username}@${EMAIL_DOMAIN}`;

/** Sem uso durante 12 horas, a aplicação pede nova entrada (CT-06). */
export const INACTIVITY_MS = 12 * 60 * 60 * 1000;
export const ACTIVITY_COOKIE = "sola_actividade";

export function fotoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/fotos/${path}`;
}
