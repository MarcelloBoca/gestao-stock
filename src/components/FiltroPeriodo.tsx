"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Periodo } from "@/lib/periodo";

export type FiltroExtra = { name: string; label: string; value: string; options: { value: string; label: string }[] };

const PERIODOS = [
  ["hoje", "Hoje"],
  ["ontem", "Ontem"],
  ["semana", "Esta semana"],
  ["mes", "Este mês"],
  ["datas", "Escolher datas"],
] as const;

/**
 * Filtros numa caixa: o período numa lista (Hoje, Ontem, Esta semana, Este mês ou datas) e,
 * opcionalmente, outros filtros. Escolher numa lista aplica logo; as datas pedem "Ver".
 * Sem JavaScript, o botão "Ver" envia o formulário.
 */
export function FiltroPeriodo({ base, periodo, extra = {}, filtros = [], hoje }: {
  base: string; periodo: Periodo; extra?: Record<string, string>; filtros?: FiltroExtra[]; hoje: string;
}) {
  const router = useRouter();
  const [p, setP] = useState<string>(periodo.p);
  const [de, setDe] = useState(periodo.de);
  const [ate, setAte] = useState(periodo.ate);
  const [vals, setVals] = useState<Record<string, string>>(Object.fromEntries(filtros.map((f) => [f.name, f.value])));
  const [erro, setErro] = useState("");

  function ir(over: { p?: string; de?: string; ate?: string; vals?: Record<string, string> }) {
    const pp = over.p ?? p;
    const v = over.vals ?? vals;
    const q: Record<string, string> = { ...extra, p: pp };
    if (pp === "datas") { q.de = over.de ?? de; q.ate = over.ate ?? ate; }
    for (const [k, x] of Object.entries(v)) if (x) q[k] = x;
    router.push(`${base}?${new URLSearchParams(q).toString()}`);
  }
  function verDatas(e: React.FormEvent) {
    e.preventDefault();
    if (!de || !ate) return setErro("Escolha as duas datas.");
    if (de > ate) return setErro("A data inicial tem de ser antes da data final.");
    if (ate > hoje) return setErro("A data final não pode ser depois de hoje.");
    setErro("");
    ir({ p: "datas" });
  }
  const temFiltro = filtros.some((f) => vals[f.name]);
  const pendente = p === "datas" && (periodo.p !== "datas" || de !== periodo.de || ate !== periodo.ate);

  return (
    <form action={base} onSubmit={verDatas} className="v-filtros" aria-label="Filtrar">
      {Object.entries(extra).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <div className="v-filtros-l">
        <div className="field largo">
          <label className="label" htmlFor="f-periodo">Período</label>
          <select id="f-periodo" name="p" className="select" value={p} onChange={(e) => { const v = e.target.value; setP(v); setErro(""); if (v !== "datas") ir({ p: v }); }}>
            {PERIODOS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
        {p === "datas" ? (
          <>
            <div className="field">
              <label className="label" htmlFor="f-de">De</label>
              <input id="f-de" name="de" type="date" className="input" value={de} max={hoje} onChange={(e) => setDe(e.target.value)} />
            </div>
            <div className="field">
              <label className="label" htmlFor="f-ate">Até</label>
              <input id="f-ate" name="ate" type="date" className="input" value={ate} max={hoje} onChange={(e) => setAte(e.target.value)} />
            </div>
          </>
        ) : null}
        {filtros.map((f) => (
          <div key={f.name} className="field">
            <label className="label" htmlFor={`f-${f.name}`}>{f.label}</label>
            <select id={`f-${f.name}`} name={f.name} className="select" value={vals[f.name] ?? ""}
              onChange={(e) => { const v = { ...vals, [f.name]: e.target.value }; setVals(v); ir({ vals: v }); }}>
              {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        ))}
        {pendente ? <button type="submit" className="btn btn-primary" style={{ flex: "1 1 120px" }}>Ver</button> : null}
        <noscript><button type="submit" className="btn">Ver</button></noscript>
      </div>
      {erro ? <p className="alert alert-error" role="alert">{erro}</p> : null}
      <div className="c-entre" style={{ alignItems: "center", flexWrap: "wrap" }}>
        <p className="v-estado" role="status">
          A mostrar <strong>{periodo.texto}</strong> ({periodo.dias === 1 ? "1 dia" : `${periodo.dias} dias`})
          {pendente ? <span style={{ color: "var(--parcial)" }}>, datas novas por aplicar</span> : null}
        </p>
        {temFiltro ? <Link href={`${base}?${new URLSearchParams({ ...extra, p: periodo.p, ...(periodo.p === "datas" ? { de: periodo.de, ate: periodo.ate } : {}) })}`} className="v-link">Limpar filtros</Link> : null}
      </div>
    </form>
  );
}
