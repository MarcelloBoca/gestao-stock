import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GESTAO, requireUser } from "@/lib/auth";
import { catalogo } from "@/lib/catalogo";
import { corHex, nomeVariante } from "@/lib/cores";
import { diaCurto, diaIso, hora, inicioMes, mt } from "@/lib/format";
import { relatorio } from "@/lib/vendas";
import { Foto, PageHead } from "@/components/ui";
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

  const hoje = diaIso();
  const mes = await relatorio(sb, inicioMes(hoje), hoje).catch(() => null);
  const vendidasMes = mes?.por_produto.find((x) => x.id === p.id)?.quantidade ?? 0;
  const corSel = typeof sp.cor === "string" && cores.includes(sp.cor) ? sp.cor : cores.find((c) => vs.some((v) => v.cor === c && v.stock > 0)) ?? cores[0] ?? null;
  const daCor = vs.filter((v) => v.cor === corSel).sort((a, b) => a.ordem - b.ordem);
  const tom = (n: number) => (n <= 0 ? "zero" : n <= Math.max(1, p.stock_minimo) ? "pouco" : "ok");
  const totalCor = (c: string | null) => vs.filter((v) => v.cor === c).reduce((x, v) => x + v.stock, 0);

  return (
    <div className="c-page" style={{ maxWidth: 1000 }}>
      <PageHead
        title={p.nome}
        back={{ href: "/pecas", label: "Peças e stock" }}
        action={<Link href={`/pecas/${p.id}/editar`} className="btn"><Icon name="lapis" size={16} /> Editar peça</Link>}
      />
      {sp.nova ? (
        <section role="status" className="v-sec" style={{ borderColor: "var(--paga)", flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: "10px 16px" }}>
          <span style={{ flex: "1 1 240px", display: "flex", flexDirection: "column", gap: 2 }}>
            <strong style={{ color: "var(--paga)", fontSize: 16 }}>Peça criada</strong>
            <span className="muted">O stock começa a zero. Registe agora as peças que chegaram.</span>
          </span>
          <Link href={`/mercadoria?peca=${p.id}`} className="btn btn-primary" style={{ flex: "1 1 220px" }}><Icon name="camiao" size={18} /> Registar chegada de mercadoria</Link>
        </section>
      ) : sp.ok ? <p className="alert alert-ok" role="status">Peça guardada.</p> : null}
      {!p.activo ? <p className="alert alert-warn">Esta peça está fora de venda.</p> : null}
      <section aria-label="Resumo da peça" className="v-sec" style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: "14px 20px" }}>
        <div style={{ flex: "1 1 240px", display: "flex", gap: 14, alignItems: "center", minWidth: 0 }}>
          <Foto path={p.foto} categoria={p.categoria} alt={p.nome} size={64} />
          <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
            <span className="muted" style={{ fontSize: 14 }}>{p.categoria}</span>
            <span style={{ fontSize: 22, fontWeight: 700 }}>{mt(p.preco)}</span>
            <span className="muted" style={{ fontSize: 14 }}>{p.custo !== null ? `Custo ${mt(p.custo)}, margem ${mt(p.preco - p.custo)}` : "Sem custo registado"}. Avisa quando restarem {p.stock_minimo}.</span>
          </div>
        </div>
        <div className="v-dois" style={{ flex: "1 1 240px" }}>
          <div className="v-tile"><p className="v-tile-k">Em stock</p><p className="v-tile-v" style={{ fontSize: 20 }}>{p.stock} {p.stock === 1 ? "unidade" : "unidades"}</p></div>
          <div className="v-tile"><p className="v-tile-k">Vendidas este mês</p><p className="v-tile-v" style={{ fontSize: 20 }}>{vendidasMes} {vendidasMes === 1 ? "unidade" : "unidades"}</p></div>
        </div>
      </section>

      <section aria-labelledby="h-stock" className="v-sec">
        <div className="v-sec-h">
          <h2 id="h-stock">{tams.length ? "Stock por cor e número" : "Stock por cor"}</h2>
          <Link href={`/mercadoria?peca=${p.id}`} className="btn btn-sm"><Icon name="lapis" size={14} /> Ajustar stock</Link>
        </div>
        {cores.length > 1 || (cores.length === 1 && cores[0]) ? (
          <div role="group" aria-label="Cor" className="v-cores" style={{ gridTemplateColumns: cores.length <= 2 ? `repeat(${cores.length}, minmax(0, 1fr))` : "repeat(auto-fill, minmax(120px, 1fr))" }}>
            {cores.map((c) => (
              <Link key={c ?? "sem"} href={`/pecas/${p.id}?cor=${encodeURIComponent(c ?? "")}`} scroll={false} replace className="v-cor" aria-current={c === corSel ? "true" : undefined}
                aria-label={`${c ?? "Sem cor"}, ${totalCor(c)} ${totalCor(c) === 1 ? "unidade" : "unidades"}`}>
                <span className="bola" style={{ background: corHex(c) }} />
                <span className="nome">{c ?? "Sem cor"}</span>
              </Link>
            ))}
          </div>
        ) : null}
        {tams.length ? (
          <div role="list" aria-label={`Stock ${corSel ? `da cor ${corSel} ` : ""}por número`} className="v-tams">
            {daCor.map((v) => (
              <div role="listitem" key={v.id} className={`v-tam ${tom(v.stock)}`} aria-label={`Número ${v.tamanho}: ${v.stock}`}>
                <span className="v-tam-n">Nº {v.tamanho}</span>
                <span className="v-tam-q">{v.stock}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="v-tams">
            {daCor.map((v) => (
              <div key={v.id} className={`v-tam ${tom(v.stock)}`}><span className="v-tam-n">{v.cor ?? "Peça única"}</span><span className="v-tam-q">{v.stock}</span></div>
            ))}
          </div>
        )}
        <p className="hint">Verde: há bastantes. Âmbar: a acabar. Cinzento: esgotado.</p>
      </section>

      <section aria-labelledby="h-mov" className="v-sec">
        <div className="v-sec-h"><h2 id="h-mov">Movimentos</h2></div>
        {(movs ?? []).length === 0 ? <p className="empty">Ainda sem movimentos.</p> : (
          <div className="v-lista">
            {(movs ?? []).map((m) => {
              const quem = (m.utilizadores as unknown as { nome: string } | null)?.nome ?? "";
              return (
                <div key={m.id} className="v-row" style={{ minHeight: 44 }}>
                  <span className="v-row-h" style={{ width: 52 }}>{diaIso(new Date(m.criado_em)) === hoje ? hora(m.criado_em) : diaCurto(diaIso(new Date(m.criado_em)))}</span>
                  <span className="v-row-m">
                    <span className="v-row-t" style={{ fontWeight: 500, whiteSpace: "normal" }}>{TIPO[m.tipo] ?? m.tipo}{vNome.get(m.variante_id) ? `, ${vNome.get(m.variante_id)}` : ""}</span>
                    <span className="v-row-s">{quem}{m.motivo ? `, ${m.motivo}` : ""}</span>
                  </span>
                  <strong style={{ color: m.quantidade > 0 ? "var(--paga)" : "var(--porpagar)", fontSize: 14 }}>{m.quantidade > 0 ? `+${m.quantidade}` : `−${Math.abs(m.quantidade)}`}</strong>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
