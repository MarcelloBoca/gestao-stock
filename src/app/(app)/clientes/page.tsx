import type { Metadata } from "next";
import { GESTAO, requireUser } from "@/lib/auth";
import { diaCurto, diaIso, mt } from "@/lib/format";
import { PageHead } from "@/components/ui";
import { ListaClientes, type ClienteLinha } from "@/components/ListaClientes";

export const metadata: Metadata = { title: "Clientes" };
export const dynamic = "force-dynamic";

/** Lista de clientes (nome e contacto dados na venda), com compras e mensagens por WhatsApp. */
export default async function ClientesPage() {
  const { sb } = await requireUser(GESTAO);
  const [cl, vs] = await Promise.all([
    sb.from("clientes").select("id, nome, contacto, aceita_mensagens, criado_em").order("nome"),
    sb.from("vendas").select("cliente_id, total, criada_em").not("cliente_id", "is", null).neq("estado", "anulada").limit(10000),
  ]);
  if (cl.error) throw cl.error;
  const resumo = new Map<string, { n: number; total: number; ultima: string }>();
  for (const v of vs.data ?? []) {
    const k = v.cliente_id as string;
    const r = resumo.get(k) ?? { n: 0, total: 0, ultima: "" };
    r.n += 1;
    r.total += Number(v.total);
    if (v.criada_em > r.ultima) r.ultima = v.criada_em as string;
    resumo.set(k, r);
  }
  const clientes: ClienteLinha[] = (cl.data ?? []).map((c) => {
    const r = resumo.get(c.id as string);
    return {
      id: c.id as string, nome: c.nome as string, contacto: (c.contacto as string | null) ?? null, aceita: Boolean(c.aceita_mensagens),
      compras: r?.n ?? 0, total: mt(r?.total ?? 0), ultima: r?.ultima ? diaCurto(diaIso(new Date(r.ultima))) : "",
    };
  });
  return (
    <div className="c-page" style={{ maxWidth: 1000 }}>
      <PageHead title="Clientes" sub={`${clientes.length} ${clientes.length === 1 ? "cliente" : "clientes"}. Nome e contacto dados nas vendas.`} />
      <ListaClientes clientes={clientes} />
      <p className="hint">Mande promoções só a quem aceitou recebê-las. Se um cliente pedir para não receber mais, abra Editar e tire o visto.</p>
    </div>
  );
}
