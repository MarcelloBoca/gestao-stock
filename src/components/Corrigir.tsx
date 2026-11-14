"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import Icon from "./Icon";
import { Foto } from "./ui";
import { corrigirVenda } from "@/app/actions/vendas";
import { nomeVariante } from "@/lib/cores";
import { mt } from "@/lib/format";
import { FORMAS } from "@/lib/types";
import type { Peca } from "@/lib/catalogo";

type Linha = { variante_id: string; quantidade: number };

export default function Corrigir({ id, pecas, inicial, forma: formaInicial, naVenda }: {
  id: string; pecas: Peca[]; inicial: Linha[]; forma: string; naVenda: Record<string, number>;
}) {
  const router = useRouter();
  const [linhas, setLinhas] = useState<Linha[]>(inicial);
  const [forma, setForma] = useState(formaInicial === "cartao" ? "" : formaInicial);
  const [motivo, setMotivo] = useState("");
  const [nova, setNova] = useState("");
  const [erro, setErro] = useState("");
  const [pending, start] = useTransition();

  const info = useMemo(() => {
    const m = new Map<string, { peca: Peca; v: Peca["variantes"][number] }>();
    pecas.forEach((p) => p.variantes.forEach((v) => m.set(v.id, { peca: p, v })));
    return m;
  }, [pecas]);
  const disponivel = (vid: string) => (info.get(vid)?.v.stock ?? 0) + (naVenda[vid] ?? 0);
  const total = linhas.reduce((s, l) => s + (info.get(l.variante_id)?.peca.preco ?? 0) * l.quantidade, 0);

  const mudar = (i: number, patch: Partial<Linha>) => setLinhas((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const tirar = (i: number) => setLinhas((ls) => ls.filter((_, j) => j !== i));
  function juntar() {
    if (!nova) return;
    if (linhas.some((l) => l.variante_id === nova)) { setErro("Essa peça já está na venda. Mude a quantidade."); return; }
    setLinhas((ls) => [...ls, { variante_id: nova, quantidade: 1 }]);
    setNova("");
  }
  function guardar() {
    setErro("");
    if (!linhas.length) return setErro("A venda tem de ficar com pelo menos uma peça. Para tirar tudo, anule a venda.");
    if (!forma) return setErro("Escolha como o cliente pagou.");
    if (!motivo.trim()) return setErro("Escreva o motivo da correcção.");
    start(async () => {
      const r = await corrigirVenda(id, forma, linhas, motivo);
      if (r.error) return setErro(r.error);
      router.push(`/vendas/${id}`);
      router.refresh();
    });
  }

  return (
    <div className="stack-md" style={{ gap: 16 }}>
      <div className="c-card">
        <h2 className="c-card-t">Peças da venda</h2>
        {linhas.map((l, i) => {
          const x = info.get(l.variante_id);
          if (!x) return null;
          const max = disponivel(l.variante_id);
          return (
            <div key={l.variante_id} className="stack-md" style={{ gap: 8, paddingBottom: 12, borderBottom: "1px solid var(--linha)" }}>
              <div className="c-entre" style={{ alignItems: "center" }}>
                <Foto path={x.peca.foto} categoria={x.peca.categoria} alt={x.peca.nome} className="c-mini" />
                <div className="c-linha-m"><span className="c-linha-t" style={{ fontSize: 16 }}>{x.peca.nome}</span><span className="c-linha-s">{mt(x.peca.preco)} cada</span></div>
                <button type="button" className="c-icon-btn" aria-label={`Tirar ${x.peca.nome}`} onClick={() => tirar(i)}><Icon name="lixo" size={20} /></button>
              </div>
              <div className="inline">
                {x.peca.variantes.length > 1 ? (
                  <select className="select on-card" style={{ flex: 1, minWidth: 160 }} aria-label="Cor e número" value={l.variante_id}
                    onChange={(e) => mudar(i, { variante_id: e.target.value })}>
                    {x.peca.variantes.map((v) => (
                      <option key={v.id} value={v.id} disabled={v.id !== l.variante_id && linhas.some((o) => o.variante_id === v.id)}>
                        {nomeVariante(v) || "Única"} · há {disponivel(v.id)}
                      </option>
                    ))}
                  </select>
                ) : <span className="c-linha-s" style={{ flex: 1 }}>{nomeVariante(x.v)}</span>}
                <div className="c-qtd">
                  <button type="button" aria-label="Menos uma" disabled={l.quantidade <= 1} onClick={() => mudar(i, { quantidade: l.quantidade - 1 })}><Icon name="menos" size={18} /></button>
                  <output>{l.quantidade}</output>
                  <button type="button" aria-label="Mais uma" disabled={l.quantidade >= max} onClick={() => mudar(i, { quantidade: l.quantidade + 1 })}><Icon name="mais" size={18} /></button>
                </div>
              </div>
            </div>
          );
        })}
        <div className="inline">
          <select className="select on-card" style={{ flex: 1, minWidth: 180 }} aria-label="Juntar outra peça" value={nova} onChange={(e) => setNova(e.target.value)}>
            <option value="">Juntar outra peça…</option>
            {pecas.map((p) => (
              <optgroup key={p.id} label={p.nome}>
                {p.variantes.map((v) => <option key={v.id} value={v.id} disabled={disponivel(v.id) <= 0}>{p.nome}{nomeVariante(v) ? `, ${nomeVariante(v)}` : ""} · há {disponivel(v.id)}</option>)}
              </optgroup>
            ))}
          </select>
          <button type="button" className="c-pequeno" onClick={juntar} disabled={!nova}><Icon name="mais" size={18} /> Juntar</button>
        </div>
        <div className="c-entre"><span style={{ color: "var(--suave)", fontSize: 17 }}>Novo total</span><span className="c-total-v">{mt(total)}</span></div>
      </div>
      <p className="c-rot">Como pagou o cliente?</p>
      <div className="c-opts" style={{ ["--cols" as string]: 2 }}>
        {FORMAS.map((f) => (
          <button key={f.id} type="button" className="c-opt" style={{ minHeight: 72 }} aria-pressed={forma === f.id} onClick={() => setForma(f.id)}>
            <Icon name={f.icon} size={16} /> {f.nome}
          </button>
        ))}
      </div>
      <div className="field">
        <label className="label" htmlFor="motivo">Porque vai corrigir? (obrigatório)</label>
        <input id="motivo" className="input" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={300} placeholder="Ex.: registada duas vezes" />
      </div>
      {erro ? <p className="alert alert-error" role="alert">{erro}</p> : null}
      <button type="button" className="c-cta" onClick={guardar} disabled={pending}><Icon name="certo" size={16} /> {pending ? "A guardar…" : "Guardar correcção"}</button>
    </div>
  );
}
