import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { GESTAO, requireUser } from "@/lib/auth";
import { catalogo } from "@/lib/catalogo";
import { hora } from "@/lib/format";
import { obterVenda } from "@/lib/vendas";
import { PageHead } from "@/components/ui";
import Corrigir from "@/components/Corrigir";

export const metadata: Metadata = { title: "Corrigir venda" };
export const dynamic = "force-dynamic";

export default async function CorrigirPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { sb } = await requireUser(GESTAO);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [v, cat] = await Promise.all([obterVenda(sb, id), catalogo(sb)]);
  if (!v) notFound();
  if (v.estado === "anulada") redirect(`/vendas/${id}`);
  const activas = v.linhas.filter((l) => !l.substituida);
  const naVenda: Record<string, number> = {};
  activas.forEach((l) => (naVenda[l.variante_id] = (naVenda[l.variante_id] ?? 0) + l.quantidade));
  const pecas = cat.pecas
    .map((p) => ({ ...p, variantes: p.variantes.filter((x) => (x.activa && p.activo) || naVenda[x.id]) }))
    .filter((p) => p.variantes.length);
  return (
    <div className="c-page c-narrow" style={{ maxWidth: 640 }}>
      <PageHead title="Corrigir venda" sub={`Venda das ${hora(v.criada_em)} · ${v.vendedor}`} back={{ href: `/vendas/${id}`, label: "Venda" }} />
      <Corrigir id={id} pecas={pecas} forma={v.forma} naVenda={naVenda}
        inicial={Object.entries(naVenda).map(([variante_id, quantidade]) => ({ variante_id, quantidade }))} />
    </div>
  );
}
