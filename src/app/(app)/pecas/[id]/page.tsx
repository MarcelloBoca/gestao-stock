import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GESTAO, requireUser } from "@/lib/auth";
import { catalogo } from "@/lib/catalogo";
import { corHex, estadoStock, nomeVariante } from "@/lib/cores";
import { diaCurto, diaIso, hora, mt } from "@/lib/format";
import { Foto, PageHead, Pill } from "@/components/ui";
import Icon from "@/components/Icon";

export const metadata: Metadata = { title: "Peça" };
export const dynamic = "force-dynamic";

const TIPO: Record<string, string> = { entrada: "Entrada", venda: "Venda", devolucao: "Devolução", defeito: "Defeito", ajuste: "Acerto de contagem", correccao: "Correcção de venda" };

/** ST-06: stock por cor e número, e o histórico que explica a quantidade. */
export default async function PecaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { sb } = await requireUser(GESTAO);
  const { pecas } = await catalogo(sb);
  const p = pecas.find((x) => x.id === id);
  if (!p) notFound();
  const vs = p.variantes.filter((v) => v.activa);
  const cores = Array.from(new Set(vs.map((v) => v.cor)));
  const tams = Array.from(new Map(vs.filter((v) => v.tamanho).map((v) => [v.tamanho, v.ordem])).entries()).sort((a, b) => a[1] - b[1]).map(([t]) => t as string);
  const { data: movs } = await sb
    .from("movimentos_stock")
    .select("id, tipo, quantidade, motivo, criado_em, variante_id, utilizadores(nome)")
    .in("variante_id", p.variantes.map((v) => v.id).length ? p.variantes.map((v) => v.id) : ["00000000-0000-0000-0000-000000000000"])
    .order("criado_em", { ascending: false })
    .limit(20);
  const vNome = new Map(p.variantes.map((v) => [v.id, nomeVariante(v)]));

  return (
    <div className="c-page c-narrow" style={{ maxWidth: 760 }}>
      <PageHead title={p.nome} back={{ href: "/pecas", label: "Peças" }} />
      {sp.ok ? <p className="alert alert-ok" role="status">Peça guardada.</p> : null}
      {!p.activo ? <p className="alert alert-warn">Esta peça está fora de venda.</p> : null}
      <div className="c-entre" style={{ alignItems: "center", justifyContent: "flex-start", gap: 16 }}>
        <Foto path={p.foto} categoria={p.categoria} alt={p.nome} size={112} />
        <div className="stack">
          <p className="p" style={{ fontSize: 24, fontWeight: 800 }}>{mt(p.preco)}</p>
          <p className="p muted">{p.categoria} · {p.stock} {p.stock === 1 ? "peça" : "peças"} na loja</p>
          <p className="p muted" style={{ fontSize: 14 }}>Avisa quando restarem {p.stock_minimo}</p>
        </div>
      </div>
      <div className="c-card">
        <h2 className="c-card-t">Quantas há de cada</h2>
        {tams.length ? (
          <div className="c-tabela" style={{ gridTemplateColumns: `minmax(90px, 1.4fr) repeat(${tams.length}, minmax(0, 1fr))`, overflowX: "auto" }}>
            <span />
            {tams.map((t) => <span key={t} className="h">{t}</span>)}
            {cores.map((c) => (
              <Fragment key={c ?? "sem-cor"}>
                <span className="c">{c ? <span className="c-bolinha" style={{ background: corHex(c) }} /> : null}{c ?? "—"}</span>
                {tams.map((t) => {
                  const v = vs.find((x) => x.cor === c && x.tamanho === t);
                  return <span key={`${c}-${t}`} className={`q ${v ? estadoStock(v.stock, p.stock_minimo) : "nada"}`}>{v ? v.stock : "·"}</span>;
                })}
              </Fragment>
            ))}
          </div>
        ) : (
          vs.map((v) => (
            <div key={v.id} className="c-entre" style={{ alignItems: "center" }}>
              <span className="c" style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 700 }}>{v.cor ? <span className="c-bolinha" style={{ background: corHex(v.cor) }} /> : null}{v.cor ?? "Peça única"}</span>
              <Pill tone={estadoStock(v.stock, p.stock_minimo)}>{v.stock}</Pill>
            </div>
          ))
        )}
        <div className="c-chips" style={{ gap: 6 }}>
          <Pill tone="zero">0 = acabou</Pill><Pill tone="pouco">a acabar</Pill><Pill tone="ok">tudo bem</Pill>
        </div>
      </div>
      <Link href={`/mercadoria?peca=${p.id}`} className="c-cta"><Icon name="caixa" /> Chegou mercadoria desta peça</Link>
      <div className="inline" style={{ flexWrap: "nowrap" }}>
        <Link href={`/pecas/${p.id}/editar`} className="c-outline"><Icon name="preco" size={22} /> Mudar preço</Link>
        <Link href={`/pecas/${p.id}/editar`} className="c-outline"><Icon name="lapis" size={22} /> Editar peça</Link>
      </div>
      <div className="c-card">
        <h2 className="c-card-t">Histórico</h2>
        {(movs ?? []).length === 0 ? <p className="empty">Ainda sem movimentos.</p> : (movs ?? []).map((m) => {
          const quem = (m.utilizadores as unknown as { nome: string } | null)?.nome ?? "";
          return (
            <div key={m.id} className="c-entre" style={{ alignItems: "center", paddingBottom: 10, borderBottom: "1px solid var(--linha)" }}>
              <div className="c-linha-m">
                <span style={{ fontWeight: 800 }}>{TIPO[m.tipo] ?? m.tipo}{vNome.get(m.variante_id) ? ` · ${vNome.get(m.variante_id)}` : ""}</span>
                <span className="c-linha-s">{diaCurto(diaIso(new Date(m.criado_em)))}, {hora(m.criado_em)} · {quem}{m.motivo ? ` · ${m.motivo}` : ""}</span>
              </div>
              <b style={{ color: m.quantidade > 0 ? "var(--paga)" : "var(--porpagar)", fontSize: 17 }}>{m.quantidade > 0 ? `+${m.quantidade}` : `−${Math.abs(m.quantidade)}`}</b>
            </div>
          );
        })}
      </div>
    </div>
  );
}
