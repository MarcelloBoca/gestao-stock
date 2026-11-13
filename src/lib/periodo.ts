import { diaCurto, diaIso, diaLongo, inicioMes, inicioSemana, validoIso } from "./format";

export type Periodo = { p: "hoje" | "semana" | "mes" | "datas"; de: string; ate: string; titulo: string };

/** Período escolhido nos filtros (hoje, semana de segunda a sábado, mês ou datas). */
export function lerPeriodo(sp: Record<string, string | string[] | undefined>): Periodo {
  const hoje = diaIso();
  const p = typeof sp.p === "string" ? sp.p : "hoje";
  if (p === "semana") { const de = inicioSemana(hoje); return { p, de, ate: hoje, titulo: `Esta semana (desde ${diaCurto(de)})` }; }
  if (p === "mes") { const de = inicioMes(hoje); return { p, de, ate: hoje, titulo: `Este mês (desde ${diaCurto(de)})` }; }
  if (p === "datas") {
    let de = typeof sp.de === "string" && validoIso(sp.de) ? sp.de : hoje;
    let ate = typeof sp.ate === "string" && validoIso(sp.ate) ? sp.ate : de;
    if (ate < de) [de, ate] = [ate, de];
    return { p, de, ate, titulo: de === ate ? diaLongo(de) : `De ${diaCurto(de)} a ${diaCurto(ate)}` };
  }
  return { p: "hoje", de: hoje, ate: hoje, titulo: diaLongo(hoje) };
}
