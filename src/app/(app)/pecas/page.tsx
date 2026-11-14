import type { Metadata } from "next";
import Link from "next/link";
import { GESTAO, requireUser } from "@/lib/auth";
import { catalogo, pecaAAcabar as aAcabar, type Peca } from "@/lib/catalogo";
import { mt } from "@/lib/format";
import { Foto, PageHead } from "@/components/ui";
import { FiltroPecas } from "@/components/FiltroPecas";
import Icon from "@/components/Icon";

export const metadata: Metadata = { title: "Peças e stock" };
export const dynamic = "force-dynamic";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const esgotada = (p: Peca) => p.stock <= 0;

/** ST-07/ST-08: peças com pesquisa pelo nome, tipo de peça e "só a acabar". */
export default async function PecasPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { sb } = await requireUser(GESTAO);
  const { pecas, categorias } = await catalogo(sb);
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const cat = typeof sp.c === "string" ? sp.c : "";
  const acabar = sp.f === "acabar";
  const inactivas = sp.f === "inactivas";
  const t = norm(q.trim());
  const activas = pecas.filter((p) => p.activo);
  const lista = pecas.filter(
    (p) => (inactivas ? !p.activo : p.activo) && (!cat || p.categoria_id === cat) && (!acabar || aAcabar(p)) && (!t || norm(p.nome).includes(t)),
  );
  const unidades = activas.reduce((s, p) => s + p.stock, 0);
  const nAcabar = activas.filter(aAcabar).length;
  const nCats = new Set(activas.map((p) => p.categoria_id)).size;
  const foraDeVenda = pecas.length - activas.length;

  return (
    <div className="c-page">
      <PageHead
        title="Peças e stock"
        sub={`${activas.length} ${activas.length === 1 ? "peça" : "peças"}, ${nCats} ${nCats === 1 ? "categoria" : "categorias"}`}
        action={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href="/mercadoria" className="btn c-so-pc"><Icon name="camiao" size={16} /> Chegou mercadoria</Link>
            <Link href="/pecas/nova" className="btn btn-primary"><Icon name="mais" size={16} /> Nova peça</Link>
          </div>
        }
      />
      {inactivas ? (
        <p className="alert alert-warn">A mostrar as peças fora de venda. <Link href="/pecas" className="v-link" style={{ marginLeft: 6 }}>Voltar às peças à venda</Link></p>
      ) : (
        <FiltroPecas q={q} cat={cat} acabar={acabar} categorias={categorias.filter((c) => c.activa).map((c) => ({ id: c.id, nome: c.nome }))} />
      )}
      <div className="v-dois">
        <div className="v-tile borda"><p className="v-tile-k">Unidades em stock</p><p className="v-tile-v">{unidades}</p></div>
        <div className="v-tile borda">
          <p className="v-tile-k">A acabar</p>
          <p className="v-tile-v">{nAcabar}</p>
          <p className="v-tile-s" style={{ color: "var(--parcial)" }}>ainda há, mas pouco</p>
        </div>
      </div>
      <section aria-labelledby="h-pecas" className="v-sec">
        <div className="v-sec-h"><h2 id="h-pecas">{lista.length === 1 ? "1 peça" : `${lista.length} peças`}</h2></div>
        {lista.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
            <p className="muted" style={{ margin: 0 }}>{pecas.length ? "Nenhuma peça com estes filtros." : "Ainda não há peças. Toque em Nova peça para começar."}</p>
            {pecas.length ? <Link href="/pecas" className="btn">Ver todas as peças</Link> : null}
          </div>
        ) : (
          <div className="v-lista">
            {lista.map((p) => {
              const tom = esgotada(p) ? "zero" : aAcabar(p) ? "pouco" : "ok";
              const cores = new Set(p.variantes.filter((v) => v.activa && v.cor).map((v) => v.cor)).size;
              return (
                <Link key={p.id} href={`/pecas/${p.id}`} className="v-row" style={{ minHeight: 60 }}>
                  <Foto path={p.foto} categoria={p.categoria} alt="" size={44} />
                  <span className="v-row-m">
                    <span className="v-row-t">{p.nome}</span>
                    <span className="v-row-s">{p.categoria}{cores ? `, ${cores} ${cores === 1 ? "cor" : "cores"}` : ""}</span>
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <strong style={{ fontSize: 14 }}>{mt(p.preco)}</strong>
                    <span className={`v-badge ${tom}`}>{tom === "zero" ? "Esgotado" : `${p.stock} un.`}</span>
                  </span>
                  <span style={{ color: "var(--fraco)", display: "flex" }}><Icon name="seguir" size={16} /></span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
      {!inactivas && foraDeVenda ? <Link href="/pecas?f=inactivas" className="v-link" style={{ alignSelf: "center" }}>Ver as {foraDeVenda} peças fora de venda</Link> : null}
    </div>
  );
}
