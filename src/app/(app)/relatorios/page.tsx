import type { Metadata } from "next";
import Link from "next/link";
import { GESTAO, requireUser } from "@/lib/auth";
import { catalogo, lucroEstimado } from "@/lib/catalogo";
import { diaCurto, diaIso, hora, mt, somarDias } from "@/lib/format";
import { lerPeriodo } from "@/lib/periodo";
import { FORMAS } from "@/lib/types";
import { listarVendas, relatorio } from "@/lib/vendas";
import { Escuro, Foto, LucroTile, PageHead } from "@/components/ui";
import Icon from "@/components/Icon";
import { FiltroPeriodo } from "@/components/FiltroPeriodo";

export const metadata: Metadata = { title: "Relatórios" };
export const dynamic = "force-dynamic";

const DIA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

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

  const [rel, vendas] = await Promise.all([relatorio(sb, periodo.de, periodo.ate), listarVendas(sb, periodo.de, periodo.ate, { limite: 3000 })]);
  const fotos = new Map(cat.pecas.map((p) => [p.id, p]));
  const pecasVendidas = rel.por_produto.reduce((s, p) => s + p.quantidade, 0);
  const maxForma = Math.max(1, ...Object.values(rel.por_forma));
  const maxCat = Math.max(1, ...rel.por_categoria.map((c) => c.total));
  const maxPessoa = Math.max(1, ...rel.por_vendedor.map((c) => c.total));

  // Gráfico: por hora (1 dia), por dia (até 14), por semana (até 70) ou por mês.
  const validas = vendas.filter((v) => v.estado !== "anulada");
  let barras: { l: string; v: number }[] = [];
  let grafTitulo = "Vendido por dia";
  if (periodo.dias === 1) {
    grafTitulo = "Vendido por hora";
    const h = new Map<number, number>();
    for (const v of validas) { const x = Number(hora(v.criada_em).slice(0, 2)); h.set(x, (h.get(x) ?? 0) + v.total); }
    const horas = Array.from(h.keys());
    const ini = Math.min(9, ...horas), fimH = Math.max(18, ...horas);
    for (let x = ini; x <= fimH; x++) barras.push({ l: `${x}h`, v: h.get(x) ?? 0 });
  } else {
    const porDia = new Map<string, number>();
    for (const v of validas) { const d = diaIso(new Date(v.criada_em)); porDia.set(d, (porDia.get(d) ?? 0) + v.total); }
    const dias: string[] = [];
    for (let d = periodo.de; d <= periodo.ate; d = somarDias(d, 1)) dias.push(d);
    if (dias.length <= 14) {
      barras = dias.map((d) => ({ l: `${DIA[new Date(d + "T12:00:00Z").getUTCDay()]} ${Number(d.slice(8))}`, v: porDia.get(d) ?? 0 }));
    } else if (dias.length <= 70) {
      grafTitulo = "Vendido por semana";
      for (let i = 0; i < dias.length; i += 7) {
        const ch = dias.slice(i, i + 7);
        barras.push({ l: `${Number(ch[0].slice(8))}–${diaCurto(ch[ch.length - 1])}`, v: ch.reduce((s, d) => s + (porDia.get(d) ?? 0), 0) });
      }
    } else {
      grafTitulo = "Vendido por mês";
      const m = new Map<string, number>();
      for (const d of dias) m.set(d.slice(0, 7), (m.get(d.slice(0, 7)) ?? 0) + (porDia.get(d) ?? 0));
      barras = Array.from(m.entries()).map(([k, v]) => ({ l: `${MES[Number(k.slice(5)) - 1]} ${k.slice(2, 4)}`, v }));
    }
  }
  const maxBarra = Math.max(1, ...barras.map((b) => b.v));
  const melhor = barras.reduce((a, b) => (b.v > a.v ? b : a), { l: "", v: 0 });
  const curto = (v: number) => (v >= 1000000 ? `${(v / 1000000).toFixed(1).replace(".", ",")} M` : v >= 1000 ? `${Math.round(v / 100) / 10} mil`.replace(".", ",") : String(v));

  return (
    <div className="c-page" style={{ maxWidth: 1100 }}>
      <PageHead
        title="Relatórios"
        sub="Vendas e peças por período"
        action={
          <a href={`/relatorios/pdf?${new URLSearchParams(periodo.p === "datas" ? { p: "datas", de: periodo.de, ate: periodo.ate } : { p: periodo.p }).toString()}`} className="btn" download>
            <Icon name="exportar" size={16} /> Exportar PDF
          </a>
        }
      />
      {abas}
      <FiltroPeriodo base="/relatorios" periodo={periodo} hoje={diaIso()} />
      <div className="v-dois">
        <div className="v-hero">
          <div><p className="v-hero-k">Total vendido</p><p className="v-hero-v">{mt(rel.total)}</p></div>
          <p className="v-hero-s">{rel.vendas} {rel.vendas === 1 ? "venda" : "vendas"}</p>
        </div>
        <div className="v-tile borda"><p className="v-tile-k">Peças vendidas</p><p className="v-tile-v">{pecasVendidas}</p><p className="v-tile-s">unidades</p></div>
        <LucroTile {...lucroEstimado(rel.por_produto, cat.pecas)} borda />
      </div>
      <section aria-labelledby="h-graf" className="v-sec">
        <div className="v-sec-h"><h2 id="h-graf">{grafTitulo}</h2>{melhor.v ? <span className="muted" style={{ fontSize: 14 }}>{barras.length > 1 ? "Melhor: " : ""}{melhor.l}, {mt(melhor.v)}</span> : null}</div>
        {rel.total === 0 ? <p className="muted" style={{ margin: 0 }}>Não houve vendas neste período.</p> : (
          <div role="img" aria-label={`${grafTitulo}: ${barras.map((b) => `${b.l} ${mt(b.v)}`).join(", ")}`}
            style={{ display: "flex", alignItems: "flex-end", gap: barras.length > 20 ? 3 : 8, height: 190, paddingTop: 10, overflowX: "auto" }}>
            {barras.map((b) => (
              <div key={b.l} style={{ flex: `1 0 ${barras.length > 20 ? 18 : 24}px`, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end" }}>
                <span style={{ fontSize: 11, color: "var(--fraco)", whiteSpace: "nowrap", minHeight: 13 }}>{b.v && barras.length <= 14 ? curto(b.v) : ""}</span>
                <div style={{ width: "100%", maxWidth: 44, height: `${Math.round((b.v / maxBarra) * 100)}%`, minHeight: 2, borderRadius: "5px 5px 2px 2px", background: b.v === maxBarra ? "var(--rosa-texto)" : "#e3c6d7" }} />
                <span style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>{b.l}</span>
              </div>
            ))}
          </div>
        )}
      </section>
      <div className="v-colunas">
        <section aria-labelledby="h-top" className="v-sec">
          <div className="v-sec-h"><h2 id="h-top">Peças mais vendidas</h2></div>
          {rel.por_produto.length === 0 ? <p className="empty">Sem vendas neste período.</p> : (
            <ol className="v-lista" style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {rel.por_produto.slice(0, 8).map((p, i) => {
                const x = fotos.get(p.id);
                return (
                  <li key={p.id} className="v-row">
                    <strong style={{ color: "var(--rosa-texto)", width: 16 }}>{i + 1}</strong>
                    <Foto path={x?.foto} categoria={x?.categoria} alt="" size={36} />
                    <span className="v-row-m"><span className="v-row-t">{p.nome}</span><span className="v-row-s">{p.quantidade} un.</span></span>
                    <span className="v-row-v">{mt(p.total)}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
        <section aria-labelledby="h-quem" className="v-sec">
          <div className="v-sec-h"><h2 id="h-quem">Por vendedora</h2></div>
          {rel.por_vendedor.length === 0 ? <p className="empty">Sem vendas.</p> : rel.por_vendedor.map((v) => (
            <div key={v.nome} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div className="c-entre" style={{ fontSize: 14 }}><span><strong>{v.nome}</strong> <span className="muted">{v.vendas} {v.vendas === 1 ? "venda" : "vendas"}</span></span><strong>{mt(v.total)}</strong></div>
              <div className="v-barra"><span style={{ width: `${Math.round((v.total / maxPessoa) * 100)}%` }} /></div>
            </div>
          ))}
        </section>
        <section aria-labelledby="h-pag" className="v-sec">
          <div className="v-sec-h"><h2 id="h-pag">Por forma de pagamento</h2></div>
          {FORMAS.map((f) => {
            const v = rel.por_forma[f.id] ?? 0;
            return (
              <div key={f.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div className="c-entre" style={{ fontSize: 14 }}><span>{f.curto}</span><strong>{mt(v)}</strong></div>
                <div className="v-barra"><span style={{ width: `${Math.round((v / maxForma) * 100)}%` }} /></div>
              </div>
            );
          })}
        </section>
        <section aria-labelledby="h-cat" className="v-sec">
          <div className="v-sec-h"><h2 id="h-cat">Por tipo de peça</h2></div>
          {rel.por_categoria.length === 0 ? <p className="empty">Sem vendas.</p> : rel.por_categoria.map((c) => (
            <div key={c.nome} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div className="c-entre" style={{ fontSize: 14 }}><span>{c.nome}</span><strong>{mt(c.total)}</strong></div>
              <div className="v-barra"><span style={{ width: `${Math.round((c.total / maxCat) * 100)}%` }} /></div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
