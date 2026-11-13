import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { diaIso, diaLongo, mt } from "@/lib/format";
import { listarVendas } from "@/lib/vendas";
import { Escuro, PageHead } from "@/components/ui";
import { CartaoVenda } from "@/components/VendaUi";

export const metadata: Metadata = { title: "O que vendi hoje" };
export const dynamic = "force-dynamic";

/** VD-05: cada pessoa vê as suas vendas do dia. */
export default async function HojePage() {
  const { sb, user } = await requireUser();
  const hoje = diaIso();
  const vendas = await listarVendas(sb, hoje, hoje, { vendedor: user.id });
  const validas = vendas.filter((v) => v.estado !== "anulada");
  const total = validas.reduce((s, v) => s + v.total, 0);
  return (
    <div className="c-page c-narrow" style={{ maxWidth: 760 }}>
      <PageHead title="O que vendi hoje" sub={`${diaLongo(hoje)} · ${user.nome}`} />
      <Escuro label="Vendi hoje" valor={mt(total)} lado={`${validas.length} ${validas.length === 1 ? "venda" : "vendas"}`} />
      {vendas.length === 0 ? <p className="empty">Ainda não registou vendas hoje.</p> : vendas.map((v) => <CartaoVenda key={v.id} v={v} mostrarVendedor={false} />)}
      <p className="p muted" style={{ textAlign: "center", fontSize: 15 }}>Enganou-se numa venda? Peça à gestora para corrigir.</p>
    </div>
  );
}
