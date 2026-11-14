import "server-only";
import { createHmac } from "crypto";

/**
 * Entrada com PIN de 4 números.
 *
 * O Supabase continua a guardar uma palavra-passe (com bcrypt), mas essa palavra-passe é
 * derivada do PIN com uma chave secreta que só existe no servidor (PIN_SECRET). Assim:
 * - o PIN nunca é guardado nem enviado para o Supabase;
 * - quem tiver uma cópia da base de dados não consegue adivinhar os PINs sem a chave;
 * - os limites de tentativas que já existem (5 erradas bloqueiam 10 minutos) continuam a valer.
 *
 * Mudar PIN_SECRET invalida todos os PINs: cada pessoa terá de receber um PIN novo.
 */
export const PIN_SECRET = process.env.PIN_SECRET ?? "";
export const pinActivo = () => PIN_SECRET.length >= 32;

export const pinValido = (pin: string) => /^\d{4}$/.test(pin);

/** Palavra-passe guardada no Supabase para um utilizador e um PIN. */
export function senhaDoPin(username: string, pin: string): string {
  if (!pinActivo()) throw new Error("PIN_SECRET em falta");
  const mac = createHmac("sha256", PIN_SECRET).update(`sola-pin:v1:${username.trim().toLowerCase()}:${pin}`).digest("base64url");
  return `Pin.${mac}`;
}

/** PINs demasiado fáceis de adivinhar. */
export function pinFraco(pin: string): boolean {
  if (/^(\d)\1{3}$/.test(pin)) return true; // 0000, 1111…
  const d = pin.split("").map(Number);
  const sobe = d.every((x, i) => i === 0 || x === d[i - 1] + 1);
  const desce = d.every((x, i) => i === 0 || x === d[i - 1] - 1);
  return sobe || desce; // 1234, 4321…
}
