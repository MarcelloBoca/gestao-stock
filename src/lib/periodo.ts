import { diaCurto, diaIso, diaLongo, inicioMes, inicioSemana, somarDias, validoIso } from "./format";

export type Periodo = { p: "hoje" | "ontem" | "semana" | "mes" | "datas"; de: string; ate: string; titulo: string; texto: string; dias: number };

/** Período escolhido nos filtros (hoje, semana de segunda a sábado, mês ou datas). */
export function lerPeriodo(sp: Record<string, string | string[] | undefined>): Periodo {
  const hoje = diaIso();
  const p = typeof sp.p === "string" ? sp.p : "hoje";
  const fim = (q: Omit<Periodo, "texto" | "dias">): Periodo => {
    const dias = Math.round((Date.parse(q.ate) - Date.parse(q.de)) / 86400000) + 1;
    const intervalo = q.de === q.ate ? diaCurto(q.de) : `${diaCurto(q.de)} a ${diaCurto(q.ate)}`;
    const nome = { hoje: "hoje", ontem: "ontem", semana: "esta semana", mes: "este mês", datas: "" }[q.p];
    return { ...q, dias, texto: nome ? `${nome}, ${intervalo}` : intervalo };
  };
  if (p === "ontem") { const d = somarDias(hoje, -1); return fim({ p, de: d, ate: d, titulo: diaLongo(d) }); }
  if (p === "semana") { const de = inicioSemana(hoje); return fim({ p, de, ate: hoje, titulo: `Esta semana (desde ${diaCurto(de)})` }); }
  if (p === "mes") { const de = inicioMes(hoje); return fim({ p, de, ate: hoje, titulo: `Este mês (desde ${diaCurto(de)})` }); }
  if (p === "datas") {
    let de = typeof sp.de === "string" && validoIso(sp.de) ? sp.de : hoje;
    let ate = typeof sp.ate === "string" && validoIso(sp.ate) ? sp.ate : de;
    if (ate < de) [de, ate] = [ate, de];
    if (ate > hoje) ate = hoje;
    if (de > ate) de = ate;
    if (Date.parse(ate) - Date.parse(de) > 366 * 86400000) de = somarDias(ate, -366);
    return fim({ p, de, ate, titulo: de === ate ? diaLongo(de) : `De ${diaCurto(de)} a ${diaCurto(ate)}` });
  }
  return fim({ p: "hoje", de: hoje, ate: hoje, titulo: diaLongo(hoje) });
}
