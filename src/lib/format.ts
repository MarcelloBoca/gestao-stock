/** "12.500 MT" (separador de milhares com ponto; centavos só se existirem). */
export function mt(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  const neg = n < 0;
  const abs = Math.abs(n);
  const whole = Math.floor(Math.round(abs * 100) / 100);
  const cents = Math.round((abs - whole) * 100);
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${neg ? "−" : ""}${grouped}${cents ? "," + String(cents).padStart(2, "0") : ""} MT`;
}

/** Lê "2500", "2.500", "2 500,50" e devolve o número, ou null. */
export function parseMT(input: string | null | undefined): number | null {
  if (!input) return null;
  let raw = String(input).replace(/[\s ]/g, "").replace(/MT$/i, "");
  if (!raw) return null;
  if (raw.includes(",")) raw = raw.replace(/\./g, "").replace(",", ".");
  else if (!/^\d+\.\d{1,2}$/.test(raw)) raw = raw.replace(/\./g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return null;
  return Number(raw);
}

export const TZ = "Africa/Maputo";

/** Dia AAAA-MM-DD no fuso de Maputo. */
export function diaIso(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}
export function validoIso(v: string | null | undefined): v is string {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}
export function somarDias(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}
/** Segunda-feira da semana do dia indicado. */
export function inicioSemana(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return somarDias(iso, wd === 0 ? -6 : 1 - wd);
}
export function inicioMes(iso: string): string {
  return iso.slice(0, 8) + "01";
}

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

/** "Sexta, 13 de Novembro" */
export function diaLongo(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const mes = MESES[m - 1];
  return `${DIAS[wd]}, ${d} de ${mes.charAt(0).toUpperCase()}${mes.slice(1)}`;
}
/** "13 Nov" */
export function diaCurto(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  const mes = MESES[m - 1];
  return `${d} ${mes.charAt(0).toUpperCase()}${mes.slice(1, 3)}`;
}
/** "16:48" em hora de Maputo */
export function hora(ts: string | Date): string {
  return new Intl.DateTimeFormat("pt-PT", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(ts));
}
/** Início de um dia de Maputo como instante UTC (ISO). Maputo não tem hora de verão (UTC+2). */
export function inicioDiaUtc(iso: string): string {
  return new Date(`${iso}T00:00:00+02:00`).toISOString();
}
