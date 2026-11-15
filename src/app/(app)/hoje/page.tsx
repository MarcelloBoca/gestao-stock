import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { diaIso, diaLongo, hora, mt } from "@/lib/format";
import { nomeForma } from "@/lib/types";
import { descricao, linhasActivas, listarVendas } from "@/lib/vendas";
import { PageHead } from "@/components/ui";
import { EstadoPill } from "@/components/VendaUi";
import Icon from "@/components/Icon";

export const metadata: Metadata = { title: "As minhas vendas" };
export const dynamic = "force-dynamic";

/** VD-05: cada pessoa vê as suas vendas do dia. */
export default async function HojePage() {
  const { sb, user } = await requireUser();
  const hoje = diaIso();
  const vendas = await listarVendas(sb, hoje, hoje, { vendedor: user.id });
  const validas = vendas.filter((v) => v.estado !== "anulada");
  const total = validas.reduce((s, v) => s + v.total, 0);
  const pecas = validas.reduce((s, v) => s + linhasActivas(v).reduce((a, l) => a + l.quantidade, 0), 0);
  return (
    <div className="c-page c-narrow" style={{ maxWidth: 900 }}>
      <PageHead title="As minhas vendas" sub={`${user.nome}, ${diaLongo(hoje)}`}
        action={<Link href="/vender" className="btn btn-primary c-so-pc"><Icon name="mais" size={16} /> Nova venda</Link>} />
      <div className="v-dois">
        <div className="v-hero">
          <div><p className="v-hero-k">Vendi hoje</p><p className="v-hero-v">{mt(total)}</p></div>
        </div>
        <div className="v-tile borda"><p className="v-tile-k">Vendas</p><p className="v-tile-v">{validas.length}</p></div>
        <div className="v-tile borda"><p className="v-tile-k">Peças</p><p className="v-tile-v">{pecas}</p></div>
      </div>
      <section aria-labelledby="h-hoje" className="v-sec">
        <div className="v-sec-h"><h2 id="h-hoje">Hoje</h2></div>
        {vendas.length === 0 ? <p className="empty">Ainda não registou vendas hoje.</p> : (
          <div className="v-lista">
            {vendas.map((v) => (
              <div key={v.id} className="v-row">
                <span className="v-row-h">{hora(v.criada_em)}</span>
                <span className="v-row-m">
                  <span className={`v-row-t${v.estado === "anulada" ? " c-riscado" : ""}`}>{descricao(v)}</span>
                  <span className="v-row-s">{nomeForma(v.forma)} {v.estado !== "normal" ? <EstadoPill estado={v.estado} /> : null}</span>
                </span>
                <span className={`v-row-v${v.estado === "anulada" ? " c-riscado" : ""}`}>{mt(v.total)}</span>
              </div>
            ))}
          </div>
        )}
        <p className="hint">Enganou-se numa venda? Peça à gestora para a corrigir.</p>
      </section>
    </div>
  );
}
