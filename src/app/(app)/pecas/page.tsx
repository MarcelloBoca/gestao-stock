import type { Metadata } from "next";
import Link from "next/link";
import { GESTAO, requireUser } from "@/lib/auth";
import { aRepor, catalogo } from "@/lib/catalogo";
import { estadoStock, nomeVariante } from "@/lib/cores";
import { mt } from "@/lib/format";
import { Foto, PageHead, Pill } from "@/components/ui";
import Icon from "@/components/Icon";

export const metadata: Metadata = { title: "Peças e stock" };
export const dynamic = "force-dynamic";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** ST-07/ST-08: peças com pesquisa, filtro por tipo e lista "a repor". */
export default async function PecasPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { sb } = await requireUser(GESTAO);
  const { pecas, categorias } = await catalogo(sb);
  const q = typeof sp.q === "string" ? sp.q : "";
  const cat = typeof sp.c === "string" ? sp.c : "";
  const acabar = sp.f === "acabar";
  const inactivas = sp.f === "inactivas";
  const repor = aRepor(pecas);
  const ids = new Set(repor.map((r) => r.peca.id));
  const t = norm(q.trim());
  const lista = pecas.filter(
    (p) =>
      (inactivas ? !p.activo : p.activo) &&
      (!cat || p.categoria_id === cat) &&
      (!acabar || ids.has(p.id)) &&
      (!t || norm(`${p.nome} ${p.categoria} ${p.variantes.map((v) => `${v.cor ?? ""} ${v.tamanho ?? ""}`).join(" ")}`).includes(t)),
  );
  const url = (o: Record<string, string>) => `/pecas?${new URLSearchParams(Object.fromEntries(Object.entries({ q, c: cat, ...o }).filter(([, v]) => v))).toString()}`;
  return (
    <div className="c-page">
      <PageHead title="Peças e stock" action={<Link href="/pecas/nova" className="c-pequeno"><Icon name="mais" size={20} stroke={2.4} /> Nova peça</Link>} />
      <form action="/pecas" className="c-procura">
        <Icon name="procurar" size={22} />
        {cat ? <input type="hidden" name="c" value={cat} /> : null}
        <label htmlFor="q" className="visually-hidden">Procurar peça</label>
        <input id="q" name="q" type="search" placeholder="Procurar por nome, cor ou número" defaultValue={q} />
      </form>
      <div className="c-chips">
        <Link href={url({ c: "" })} className="c-chip" aria-current={!cat && !acabar && !inactivas ? "true" : undefined}>Tudo</Link>
        {categorias.filter((c) => c.activa).map((c) => (
          <Link key={c.id} href={url({ c: c.id })} className="c-chip" aria-current={cat === c.id ? "true" : undefined}>{c.nome}</Link>
        ))}
        <Link href={url({ f: "acabar" })} className="c-chip aviso" aria-current={acabar ? "true" : undefined}><Icon name="aviso" size={18} /> A acabar ({ids.size})</Link>
        <Link href={url({ f: "inactivas" })} className="c-chip" aria-current={inactivas ? "true" : undefined}>Fora de venda</Link>
      </div>
      {acabar && repor.length ? (
        <div className="c-card">
          <h2 className="c-card-t">A repor, da que tem menos para a que tem mais</h2>
          {repor.map(({ peca, variante }) => (
            <Link key={variante.id} href={`/pecas/${peca.id}`} className="c-entre" style={{ alignItems: "center", textDecoration: "none", color: "inherit" }}>
              <span>{peca.nome}{nomeVariante(variante) ? `, ${nomeVariante(variante)}` : ""}</span>
              <Pill tone={variante.stock <= 0 ? "zero" : "pouco"}>{variante.stock <= 0 ? "acabou" : `resta ${variante.stock}`}</Pill>
            </Link>
          ))}
        </div>
      ) : null}
      {lista.length === 0 ? (
        <p className="empty">{pecas.length ? "Nenhuma peça encontrada." : "Ainda não há peças. Toque em Nova peça para começar."}</p>
      ) : (
        <div className="c-grid largo">
          {lista.map((p) => {
            const baixas = p.variantes.filter((v) => v.activa && v.stock <= p.stock_minimo);
            return (
              <Link key={p.id} href={`/pecas/${p.id}`} className="c-pcard">
                <Foto path={p.foto} categoria={p.categoria} alt={p.nome} />
                <span className="c-pcard-n">{p.nome}</span>
                <span className="c-linha-s">{mt(p.preco)} · {p.stock} {p.stock === 1 ? "peça" : "peças"}</span>
                <span className="c-chips" style={{ gap: 4 }}>
                  {baixas.length === 0 ? <Pill tone="ok">Tudo bem</Pill> : (
                    <Pill tone={baixas.some((v) => v.stock <= 0) ? "zero" : "pouco"}>
                      {baixas.length === 1 ? `${nomeVariante(baixas[0]) || "Peça"}: ${baixas[0].stock <= 0 ? "acabou" : `resta ${baixas[0].stock}`}` : `${baixas.length} a acabar`}
                    </Pill>
                  )}
                  {estadoStock(p.stock) === "zero" ? null : null}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
