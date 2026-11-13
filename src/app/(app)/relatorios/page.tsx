import type { Metadata } from "next";
import Link from "next/link";
import { GESTAO, requireUser } from "@/lib/auth";
import { catalogo } from "@/lib/catalogo";
import { mt } from "@/lib/format";
import { lerPeriodo } from "@/lib/periodo";
import { FORMAS } from "@/lib/types";
import { relatorio } from "@/lib/vendas";
import { Escuro, Foto, PageHead } from "@/components/ui";
import { FiltroPeriodo } from "@/components/FiltroPeriodo";
import Icon from "@/components/Icon";

export const metadata: Metadata = { title: "Relatórios" };
export const dynamic = "force-dynamic";

/** RL-02..RL-04: vendas por período, forma de pagamento, peça, categoria e vendedora; stock disponível. */
export default async function RelatoriosPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { sb } = await requireUser(GESTAO);
  const vista = sp.v === "stock" ? "stock" : "vendas";
  const periodo = lerPeriodo(sp);
  const cat = await catalogo(sb);

  const abas = (
    <div className="c-chips igual" style={{ background: "var(--borda)", padding: 4, borderRadius: 16 }}>
      <Link href="/relatorios" className="c-chip" style={{ border: 0 }} aria-current={vista === "vendas" ? "true" : undefined}>Vendas</Link>
      <Link href="/relatorios?v=stock" className="c-chip" style={{ border: 0 }} aria-current={vista === "stock" ? "true" : undefined}>Stock disponível</Link>
    </div>
  );

  if (vista === "stock") {
    const filtro = typeof sp.c === "string" ? sp.c : "";
    const pecas = cat.pecas.filter((p) => p.activo && (!filtro || p.categoria_id === filtro));
    const grupos = cat.categorias.map((c) => {
      const ps = pecas.filter((p) => p.categoria_id === c.id);
      return { ...c, pecas: ps, qtd: ps.reduce((s, p) => s + p.stock, 0), valor: ps.reduce((s, p) => s + p.stock * p.preco, 0) };
    }).filter((g) => g.pecas.length);
    const qtd = grupos.reduce((s, g) => s + g.qtd, 0);
    const valor = grupos.reduce((s, g) => s + g.valor, 0);
    return (
      <div className="c-page" style={{ maxWidth: 900 }}>
        <PageHead title="Relatórios" />
        {abas}
        <div className="c-chips">
          <Link href="/relatorios?v=stock" className="c-chip" aria-current={!filtro ? "true" : undefined}>Tudo</Link>
          {cat.categorias.filter((c) => c.activa).map((c) => <Link key={c.id} href={`/relatorios?v=stock&c=${c.id}`} className="c-chip" aria-current={filtro === c.id ? "true" : undefined}>{c.nome}</Link>)}
        </div>
        <Escuro label="Peças na loja · valor a preço de venda" valor={mt(valor)} lado={`${qtd} ${qtd === 1 ? "peça" : "peças"}`} />
        {grupos.map((g) => (
          <div key={g.id} className="c-card">
            <div className="c-entre"><h2 className="c-card-t">{g.nome}</h2><b>{g.qtd} · {mt(g.valor)}</b></div>
            {g.pecas.map((p) => (
              <Link key={p.id} href={`/pecas/${p.id}`} className="c-entre" style={{ alignItems: "center", textDecoration: "none", color: "inherit", paddingBottom: 10, borderBottom: "1px solid var(--linha)" }}>
                <Foto path={p.foto} categoria={p.categoria} alt={p.nome} className="c-mini" />
                <span className="c-linha-m"><b>{p.nome}</b><span className="c-linha-s">{mt(p.preco)} cada</span></span>
                <span style={{ textAlign: "right" }}><b>{p.stock}</b><br /><span className="c-linha-s">{mt(p.stock * p.preco)}</span></span>
              </Link>
            ))}
          </div>
        ))}
      </div>
    );
  }

  const rel = await relatorio(sb, periodo.de, periodo.ate);
  const maxForma = Math.max(1, ...Object.values(rel.por_forma));
  const maxCat = Math.max(1, ...rel.por_categoria.map((c) => c.total));
  const fotos = new Map(cat.pecas.map((p) => [p.id, p]));
  return (
    <div className="c-page" style={{ maxWidth: 1100 }}>
      <PageHead title="Como correu" sub={periodo.titulo} />
      {abas}
      <FiltroPeriodo base="/relatorios" periodo={periodo} />
      <Escuro label="Vendido" valor={mt(rel.total)} lado={`${rel.vendas} ${rel.vendas === 1 ? "venda" : "vendas"}`} />
      <div className="c-tiles" style={{ alignItems: "start" }}>
        <div className="c-card">
          <h2 className="c-card-t">Como pagaram</h2>
          {FORMAS.map((f) => {
            const v = rel.por_forma[f.id] ?? 0;
            return (
              <div key={f.id} className="stack" style={{ gap: 6 }}>
                <div className="c-entre" style={{ alignItems: "center" }}>
                  <span style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 700 }}><span style={{ color: "var(--rosa-texto)" }}><Icon name={f.icon} size={20} /></span>{f.nome}</span>
                  <b>{mt(v)}</b>
                </div>
                <div className="c-barra"><span style={{ width: `${(v / maxForma) * 100}%` }} /></div>
              </div>
            );
          })}
        </div>
        <div className="c-card">
          <h2 className="c-card-t">Peças mais vendidas</h2>
          {rel.por_produto.length === 0 ? <p className="empty">Sem vendas neste período.</p> : rel.por_produto.slice(0, 8).map((p, i) => {
            const x = fotos.get(p.id);
            return (
              <div key={p.id} className="c-entre" style={{ alignItems: "center" }}>
                <b style={{ color: "var(--rosa-texto)", width: 18 }}>{i + 1}</b>
                <Foto path={x?.foto} categoria={x?.categoria} alt={p.nome} size={48} />
                <span className="c-linha-m"><b>{p.nome}</b><span className="c-linha-s">{p.quantidade} {p.quantidade === 1 ? "vendida" : "vendidas"}</span></span>
                <b>{mt(p.total)}</b>
              </div>
            );
          })}
        </div>
        <div className="c-card">
          <h2 className="c-card-t">Por vendedora</h2>
          {rel.por_vendedor.length === 0 ? <p className="empty">Sem vendas.</p> : rel.por_vendedor.map((v) => (
            <div key={v.nome} className="c-entre" style={{ alignItems: "center" }}>
              <span className="c-avatar">{v.nome.charAt(0).toUpperCase()}</span>
              <span className="c-linha-m"><b>{v.nome}</b><span className="c-linha-s">{v.vendas} {v.vendas === 1 ? "venda" : "vendas"}</span></span>
              <b>{mt(v.total)}</b>
            </div>
          ))}
          <h2 className="c-card-t" style={{ marginTop: 8 }}>Por tipo de peça</h2>
          {rel.por_categoria.map((c) => (
            <div key={c.nome} className="stack" style={{ gap: 6 }}>
              <div className="c-entre"><b>{c.nome}</b><b>{mt(c.total)}</b></div>
              <div className="c-barra"><span style={{ width: `${(c.total / maxCat) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
