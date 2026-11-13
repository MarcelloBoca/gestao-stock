import type { Metadata } from "next";
import { GESTAO, requireUser } from "@/lib/auth";
import { mt } from "@/lib/format";
import { lerPeriodo } from "@/lib/periodo";
import { listarVendas, relatorio } from "@/lib/vendas";
import { Escuro, PageHead } from "@/components/ui";
import { CartaoVenda, Formas } from "@/components/VendaUi";
import { FiltroPeriodo } from "@/components/FiltroPeriodo";

export const metadata: Metadata = { title: "Vendas" };
export const dynamic = "force-dynamic";

/** RL-05 e VD-06/07: lista de vendas da loja; tocar numa venda para a corrigir ou anular. */
export default async function VendasPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { sb } = await requireUser(GESTAO);
  const periodo = lerPeriodo(sp);
  const estado = typeof sp.estado === "string" && ["normal", "corrigida", "anulada"].includes(sp.estado) ? sp.estado : "";
  const vendedor = typeof sp.vendedor === "string" && /^[0-9a-f-]{36}$/i.test(sp.vendedor) ? sp.vendedor : "";
  const [vendas, rel, pessoas] = await Promise.all([
    listarVendas(sb, periodo.de, periodo.ate, { estado: estado || undefined, vendedor: vendedor || undefined }),
    relatorio(sb, periodo.de, periodo.ate),
    sb.from("utilizadores").select("id, nome").order("nome"),
  ]);
  const extra: Record<string, string> = {};
  if (estado) extra.estado = estado;
  if (vendedor) extra.vendedor = vendedor;
  return (
    <div className="c-page" style={{ maxWidth: 900 }}>
      <PageHead title="Vendas" sub={periodo.titulo} />
      <FiltroPeriodo base="/vendas" periodo={periodo} extra={extra} />
      <Escuro label="A loja vendeu" valor={mt(rel.total)} lado={`${rel.vendas} ${rel.vendas === 1 ? "venda" : "vendas"}`} />
      <Formas porForma={rel.por_forma} />
      <form action="/vendas" className="inline">
        <input type="hidden" name="p" value={periodo.p} />
        {periodo.p === "datas" ? (<><input type="hidden" name="de" value={periodo.de} /><input type="hidden" name="ate" value={periodo.ate} /></>) : null}
        <div className="field" style={{ flex: 1, minWidth: 150 }}>
          <label className="label" htmlFor="vendedor">Quem vendeu</label>
          <select id="vendedor" name="vendedor" className="select" defaultValue={vendedor}>
            <option value="">Todas</option>
            {(pessoas.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>
        <div className="field" style={{ flex: 1, minWidth: 150 }}>
          <label className="label" htmlFor="estado">Estado</label>
          <select id="estado" name="estado" className="select" defaultValue={estado}>
            <option value="">Todas</option>
            <option value="normal">Normais</option>
            <option value="corrigida">Corrigidas</option>
            <option value="anulada">Anuladas</option>
          </select>
        </div>
        <button type="submit" className="c-pequeno" style={{ alignSelf: "flex-end" }}>Filtrar</button>
      </form>
      {vendas.length === 0 ? <p className="empty">Não há vendas neste período.</p> : vendas.map((v) => <CartaoVenda key={v.id} v={v} href={`/vendas/${v.id}`} />)}
      <p className="p muted" style={{ textAlign: "center", fontSize: 14 }}>Toque numa venda para a corrigir ou anular.</p>
    </div>
  );
}
