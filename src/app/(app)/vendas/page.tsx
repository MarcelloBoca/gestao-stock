import type { Metadata } from "next";
import Link from "next/link";
import { GESTAO, requireUser } from "@/lib/auth";
import { diaCurto, diaIso, hora, mt } from "@/lib/format";
import { lerPeriodo } from "@/lib/periodo";
import { FORMAS, nomeForma } from "@/lib/types";
import { descricao, linhasActivas, listarVendas, relatorio } from "@/lib/vendas";
import { PageHead } from "@/components/ui";
import { EstadoPill } from "@/components/VendaUi";
import { FiltroPeriodo } from "@/components/FiltroPeriodo";

export const metadata: Metadata = { title: "Vendas" };
export const dynamic = "force-dynamic";

const TITULO: Record<string, string> = { hoje: "Vendas de hoje", ontem: "Vendas de ontem", semana: "Vendas desta semana", mes: "Vendas deste mês", datas: "Vendas" };

/** RL-05 e VD-06/07: vendas da loja com filtros; tocar numa venda para a corrigir ou anular. */
export default async function VendasPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { sb } = await requireUser(GESTAO);
  const periodo = lerPeriodo(sp);
  const estado = typeof sp.estado === "string" && ["normal", "corrigida", "anulada"].includes(sp.estado) ? sp.estado : "";
  const vendedor = typeof sp.vendedor === "string" && /^[0-9a-f-]{36}$/i.test(sp.vendedor) ? sp.vendedor : "";
  const forma = typeof sp.forma === "string" && FORMAS.some((f) => f.id === sp.forma) ? sp.forma : "";
  const [todas, rel, pessoas] = await Promise.all([
    listarVendas(sb, periodo.de, periodo.ate, { estado: estado || undefined, vendedor: vendedor || undefined, limite: 500 }),
    relatorio(sb, periodo.de, periodo.ate),
    sb.from("utilizadores").select("id, nome").order("nome"),
  ]);
  const vendas = forma ? todas.filter((v) => v.forma === forma) : todas;
  const validas = vendas.filter((v) => v.estado !== "anulada");
  const filtrado = Boolean(estado || vendedor || forma);
  const total = filtrado ? validas.reduce((s, v) => s + v.total, 0) : rel.total;
  const nVendas = filtrado ? validas.length : rel.vendas;
  const pecas = validas.reduce((s, v) => s + linhasActivas(v).reduce((a, l) => a + l.quantidade, 0), 0);
  const curto = periodo.p === "hoje" || periodo.p === "ontem" || periodo.de === periodo.ate;

  return (
    <div className="c-page" style={{ maxWidth: 1000 }}>
      <PageHead title="Vendas da loja" sub={periodo.titulo} />
      <FiltroPeriodo
        base="/vendas"
        periodo={periodo}
        hoje={diaIso()}
        filtros={[
          { name: "vendedor", label: "Vendedora", value: vendedor, options: [{ value: "", label: "Todas" }, ...(pessoas.data ?? []).map((p) => ({ value: p.id as string, label: p.nome as string }))] },
          { name: "forma", label: "Pagamento", value: forma, options: [{ value: "", label: "Todos" }, ...FORMAS.map((f) => ({ value: f.id, label: f.curto }))] },
          { name: "estado", label: "Estado", value: estado, options: [{ value: "", label: "Todas" }, { value: "normal", label: "Normais" }, { value: "corrigida", label: "Corrigidas" }, { value: "anulada", label: "Anuladas" }] },
        ]}
      />
      <div className="v-dois">
        <div className="v-hero">
          <div><p className="v-hero-k">Total vendido</p><p className="v-hero-v">{mt(total)}</p></div>
          <p className="v-hero-s">{nVendas} {nVendas === 1 ? "venda" : "vendas"}</p>
        </div>
        <div className="v-tile borda"><p className="v-tile-k">Peças vendidas</p><p className="v-tile-v">{pecas}</p><p className="v-tile-s">unidades</p></div>
        <div className="v-tile borda"><p className="v-tile-k">Anuladas</p><p className="v-tile-v">{vendas.length - validas.length}</p><p className="v-tile-s">não contam no total</p></div>
      </div>
      <section aria-labelledby="h-lista" className="v-sec">
        <div className="v-sec-h"><h2 id="h-lista">{TITULO[periodo.p]}</h2><span className="muted" style={{ fontSize: 13 }}>{vendas.length === 1 ? "1 venda" : `${vendas.length} vendas`}</span></div>
        {vendas.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
            <p className="muted" style={{ margin: 0 }}>{filtrado ? "Nenhuma venda com estes filtros." : "Não há vendas neste período."}</p>
            {filtrado ? <Link href={`/vendas?p=${periodo.p}${periodo.p === "datas" ? `&de=${periodo.de}&ate=${periodo.ate}` : ""}`} className="btn">Limpar filtros</Link> : null}
          </div>
        ) : (
          <div className="v-lista">
            {vendas.map((v) => {
              const anulada = v.estado === "anulada";
              return (
                <Link key={v.id} href={`/vendas/${v.id}`} className="v-row">
                  <span className="v-row-h">{curto ? hora(v.criada_em) : diaCurto(diaIso(new Date(v.criada_em)))}</span>
                  <span className="v-row-m">
                    <span className={`v-row-t${anulada ? " c-riscado" : ""}`}>{descricao(v)}</span>
                    <span className="v-row-s">{v.vendedor}, {nomeForma(v.forma)}{curto ? "" : `, ${hora(v.criada_em)}`} {v.estado !== "normal" ? <EstadoPill estado={v.estado} /> : null}</span>
                  </span>
                  <span className={`v-row-v${anulada ? " c-riscado" : ""}`}>{mt(v.total)}</span>
                </Link>
              );
            })}
          </div>
        )}
        <p className="hint">Toque numa venda para a corrigir ou anular.</p>
      </section>
    </div>
  );
}
