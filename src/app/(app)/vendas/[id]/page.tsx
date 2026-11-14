import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GESTAO, requireUser } from "@/lib/auth";
import { diaLongo, diaIso, hora, mt } from "@/lib/format";
import { nomeForma } from "@/lib/types";
import { obterVenda } from "@/lib/vendas";
import { anularVenda } from "@/app/actions/vendas";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Foto, PageHead } from "@/components/ui";
import { EstadoPill } from "@/components/VendaUi";
import Icon from "@/components/Icon";

export const metadata: Metadata = { title: "Venda" };
export const dynamic = "force-dynamic";

export default async function VendaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { sb } = await requireUser(GESTAO);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const v = await obterVenda(sb, id);
  if (!v) notFound();
  const activas = v.linhas.filter((l) => !l.substituida);
  const antigas = v.linhas.filter((l) => l.substituida);
  return (
    <div className="c-page c-narrow" style={{ maxWidth: 640 }}>
      <PageHead title={`Venda das ${hora(v.criada_em)}`} sub={`${diaLongo(diaIso(new Date(v.criada_em)))} · ${v.vendedor} · ${nomeForma(v.forma)}`} back={{ href: "/vendas", label: "Vendas" }} />
      {v.estado !== "normal" ? (
        <p className={`alert ${v.estado === "anulada" ? "alert-error" : "alert-warn"}`}>
          <span><EstadoPill estado={v.estado} /> {v.motivo ? `Motivo: ${v.motivo}` : null}</span>
        </p>
      ) : null}
      <div className="c-card">
        {activas.map((l) => (
          <div key={l.id} className="c-entre" style={{ alignItems: "center", paddingBottom: 12, borderBottom: "1px solid var(--linha)" }}>
            <Foto path={l.foto} categoria={l.categoria} alt={l.nome} className="c-mini" />
            <div className="c-linha-m">
              <span className="c-linha-t" style={{ fontSize: 16 }}>{l.nome}</span>
              <span className="c-linha-s">{[l.detalhe, `${l.quantidade} × ${mt(l.preco)}`].filter(Boolean).join(" · ")}</span>
            </div>
            <b>{mt(l.subtotal)}</b>
          </div>
        ))}
        <div className="c-entre">
          <span style={{ fontSize: 17, color: "var(--suave)" }}>Total</span>
          <span className={`c-total-v${v.estado === "anulada" ? " c-riscado" : ""}`}>{mt(v.total)}</span>
        </div>
      </div>
      {antigas.length ? (
        <details className="c-card c-mais">
          <summary className="c-card-t" style={{ fontSize: 16 }}>Peças antes da correcção</summary>
          {antigas.map((l) => <p key={l.id} className="p muted">{l.nome}{l.detalhe ? `, ${l.detalhe}` : ""} × {l.quantidade} · {mt(l.subtotal)}</p>)}
        </details>
      ) : null}
      {v.estado !== "anulada" ? (
        <>
          <Link href={`/vendas/${v.id}/corrigir`} className="c-cta escuro"><Icon name="lapis" size={16} /> Corrigir esta venda</Link>
          <details className="c-card c-mais">
            <summary className="c-outline perigo"><Icon name="x" size={16} /> Anular esta venda</summary>
            <ActionForm action={anularVenda} confirmText="Anular esta venda? As peças voltam ao stock.">
              <input type="hidden" name="id" value={v.id} />
              <div className="field">
                <label className="label" htmlFor="motivo">Porque vai anular? (obrigatório)</label>
                <input id="motivo" name="motivo" className="input on-card" required maxLength={300} placeholder="Ex.: o cliente desistiu" />
              </div>
              <SubmitButton className="btn btn-danger" pendingText="A anular…">Confirmar anulação</SubmitButton>
            </ActionForm>
          </details>
          <p className="p muted" style={{ fontSize: 14 }}>Corrigir e anular pedem o motivo, acertam o stock e ficam no registo de acções.</p>
        </>
      ) : null}
    </div>
  );
}
