import Link from "next/link";
import type { Periodo } from "@/lib/periodo";

/** Filtro de período: Hoje, Semana, Mês ou Outros dias (com datas). Funciona sem JavaScript. */
export function FiltroPeriodo({ base, periodo, extra = {} }: { base: string; periodo: Periodo; extra?: Record<string, string> }) {
  const url = (p: string) => `${base}?${new URLSearchParams({ ...extra, p }).toString()}`;
  return (
    <div className="stack-md">
      <div className="c-chips igual">
        {[["hoje", "Hoje"], ["semana", "Semana"], ["mes", "Mês"], ["datas", "Outros dias"]].map(([k, l]) => (
          <Link key={k} href={url(k)} className="c-chip" aria-current={periodo.p === k ? "true" : undefined}>{l}</Link>
        ))}
      </div>
      {periodo.p === "datas" ? (
        <form action={base} className="inline" style={{ alignItems: "flex-end" }}>
          {Object.entries(extra).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          <input type="hidden" name="p" value="datas" />
          <div className="field" style={{ flex: 1, minWidth: 140 }}>
            <label className="label" htmlFor="de">De</label>
            <input id="de" name="de" type="date" className="input" defaultValue={periodo.de} />
          </div>
          <div className="field" style={{ flex: 1, minWidth: 140 }}>
            <label className="label" htmlFor="ate">Até</label>
            <input id="ate" name="ate" type="date" className="input" defaultValue={periodo.ate} />
          </div>
          <button type="submit" className="c-pequeno">Ver</button>
        </form>
      ) : null}
    </div>
  );
}
