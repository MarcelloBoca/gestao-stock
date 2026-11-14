import type { Metadata } from "next";
import Link from "next/link";
import { GESTAO, requireUser } from "@/lib/auth";
import { catalogo, lucroEstimado, pecaAAcabar } from "@/lib/catalogo";
import { diaIso, diaLongo, hora, mt, somarDias } from "@/lib/format";
import { listarVendas, relatorio, descricao } from "@/lib/vendas";
import { FORMAS, nomeForma } from "@/lib/types";
import Icon from "@/components/Icon";
import { LucroTile, PageHead } from "@/components/ui";

export const metadata: Metadata = { title: "Início" };
export const dynamic = "force-dynamic";

function comparacao(hoje: number, ontem: number): { texto: string; bom: boolean } | null {
  if (!ontem) return null;
  const pct = Math.round(((hoje - ontem) / ontem) * 100);
  if (pct === 0) return { texto: "igual a ontem", bom: true };
  return { texto: `${pct > 0 ? "+" : "−"}${Math.abs(pct)}% que ontem`, bom: pct > 0 };
}

/** RL-01: o dia da loja para a gestora e a administradora. */
export default async function InicioPage() {
  const { sb, user } = await requireUser(GESTAO);
  const hoje = diaIso();
  const admin = user.perfil === "administrador";
  const [rel, relOntem, ultimas, cat, falhas] = await Promise.all([
    relatorio(sb, hoje, hoje),
    relatorio(sb, somarDias(hoje, -1), somarDias(hoje, -1)),
    listarVendas(sb, hoje, hoje, { limite: 5 }),
    catalogo(sb),
    admin ? sb.from("envios_sms").select("id", { count: "exact", head: true }).eq("estado", "falhado").gte("dia", hoje) : Promise.resolve({ count: 0 }),
  ]);
  const pecasRepor = cat.pecas.filter(pecaAAcabar).map((p) => p.nome);
  const pecasVendidas = rel.por_produto.reduce((s, p) => s + p.quantidade, 0);
  const comp = comparacao(rel.total, relOntem.total);
  const maxForma = Math.max(1, ...FORMAS.map((f) => rel.por_forma[f.id] ?? 0));
  const acoes = [
    { href: "/vender", icon: "vender", t: "Vender" },
    { href: "/mercadoria", icon: "camiao", t: "Chegou mercadoria" },
    { href: "/pecas/nova", icon: "mais", t: "Nova peça" },
    { href: "/relatorios", icon: "grafico", t: "Relatórios" },
  ];

  return (
    <div className="c-page">
      <PageHead
        title={`Olá, ${user.nome.split(" ")[0]}`}
        sub={diaLongo(hoje)}
        action={<Link href="/vender" className="btn btn-primary c-so-pc"><Icon name="vender" size={16} /> Vender</Link>}
      />

      <section aria-labelledby="h-hoje" className="v-sec">
        <div className="v-sec-h"><h2 id="h-hoje">Resumo de hoje</h2><Link href="/relatorios">Ver relatório</Link></div>
        <dl className="v-dois" style={{ margin: 0 }}>
          <div className="v-hero">
            <div>
              <dt className="v-hero-k">Vendido hoje</dt>
              <dd className="v-hero-v" style={{ margin: 0 }}>{mt(rel.total)}</dd>
            </div>
            {comp ? <dd className={`v-hero-s${comp.bom ? " bom" : ""}`} style={{ margin: 0 }}>{comp.texto}</dd> : null}
          </div>
          <div className="v-tile">
            <dt className="v-tile-k">Peças vendidas</dt>
            <dd className="v-tile-v" style={{ margin: 0 }}>{pecasVendidas}</dd>
            <dd className="v-tile-s" style={{ margin: 0 }}>em {rel.vendas} {rel.vendas === 1 ? "venda" : "vendas"}</dd>
          </div>
          <LucroTile {...lucroEstimado(rel.por_produto, cat.pecas)} />
        </dl>
      </section>

      <section aria-labelledby="h-acoes" className="v-sec">
        <div className="v-sec-h"><h2 id="h-acoes">Ações rápidas</h2></div>
        <nav aria-label="Ações rápidas" className="v-acoes">
          {acoes.map((a) => (
            <Link key={a.href} href={a.href} className="v-accao"><span className="ic"><Icon name={a.icon} size={18} stroke={1.8} /></span>{a.t}</Link>
          ))}
        </nav>
      </section>

      {falhas.count ? (
        <Link href="/sms" className="c-aviso erro"><Icon name="aviso" size={18} /><span style={{ flex: 1 }}>O SMS de hoje não foi entregue a todos. Ver envios.</span><Icon name="seguir" size={16} /></Link>
      ) : null}
      {pecasRepor.length ? (
        <Link href="/pecas?f=acabar" className="c-aviso">
          <Icon name="aviso" size={18} />
          <span style={{ flex: 1 }}>
            {pecasRepor.length === 1 ? "1 peça está a acabar" : `${pecasRepor.length} peças estão a acabar`}: {pecasRepor.slice(0, 3).join(", ")}{pecasRepor.length > 3 ? "…" : ""}
          </span>
          <Icon name="seguir" size={16} />
        </Link>
      ) : null}

      <div className="v-colunas">
        <section aria-labelledby="h-ultimas" className="v-sec v-larga">
          <div className="v-sec-h"><h2 id="h-ultimas">Últimas vendas</h2><Link href="/vendas">Ver todas</Link></div>
          {ultimas.length === 0 ? <p className="empty">Ainda não há vendas hoje.</p> : (
            <div className="v-lista">
              {ultimas.map((v) => (
                <Link key={v.id} href={`/vendas/${v.id}`} className="v-row">
                  <span className="v-row-h">{hora(v.criada_em)}</span>
                  <span className="v-row-m"><span className={`v-row-t${v.estado === "anulada" ? " c-riscado" : ""}`}>{descricao(v)}</span><span className="v-row-s">{v.vendedor}, {nomeForma(v.forma)}</span></span>
                  <span className={`v-row-v${v.estado === "anulada" ? " c-riscado" : ""}`}>{mt(v.total)}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
        <div className="v-pilha v-estreita">
          <section aria-labelledby="h-pag" className="v-sec">
            <div className="v-sec-h"><h2 id="h-pag">Pagamentos de hoje</h2></div>
            {FORMAS.map((f) => {
              const v = rel.por_forma[f.id] ?? 0;
              return (
                <div key={f.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div className="c-entre" style={{ fontSize: 13 }}><span>{f.curto}</span><strong>{mt(v)}</strong></div>
                  <div className="v-barra"><span style={{ width: `${Math.round((v / maxForma) * 100)}%` }} /></div>
                </div>
              );
            })}
          </section>
          <section aria-labelledby="h-equipa" className="v-sec">
            <div className="v-sec-h"><h2 id="h-equipa">Equipa hoje</h2></div>
            {rel.por_vendedor.length === 0 ? <p className="empty" style={{ padding: 8 }}>Ninguém vendeu ainda.</p> : rel.por_vendedor.map((p) => (
              <div key={p.nome} className="v-quem">
                <span className="v-ini" aria-hidden="true">{p.nome.split(/\s+/).slice(0, 2).map((x) => x[0]).join("").toUpperCase()}</span>
                <span className="v-quem-t" style={{ flex: 1 }}><span className="v-quem-n">{p.nome}</span><span className="v-quem-f">{p.vendas} {p.vendas === 1 ? "venda" : "vendas"}</span></span>
                <strong style={{ fontSize: 14 }}>{mt(p.total)}</strong>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
