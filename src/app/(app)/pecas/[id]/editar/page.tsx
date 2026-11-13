import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GESTAO, requireUser } from "@/lib/auth";
import { catalogo } from "@/lib/catalogo";
import { PageHead } from "@/components/ui";
import PecaForm from "@/components/PecaForm";

export const metadata: Metadata = { title: "Editar peça" };
export const dynamic = "force-dynamic";

export default async function EditarPecaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { sb } = await requireUser(GESTAO);
  const { pecas, categorias, cores, tamanhos } = await catalogo(sb);
  const p = pecas.find((x) => x.id === id);
  if (!p) notFound();
  const activas = p.variantes.filter((v) => v.activa);
  return (
    <div className="c-page c-narrow" style={{ maxWidth: 680 }}>
      <PageHead title="Editar peça" sub={p.nome} back={{ href: `/pecas/${p.id}`, label: "Peça" }} />
      <p className="alert alert-info">Mudar o preço não altera as vendas já feitas. Tirar uma cor ou um número deixa de o mostrar na venda; o histórico fica guardado.</p>
      <PecaForm
        categorias={categorias.filter((c) => c.activa || c.id === p.categoria_id)}
        cores={cores}
        tamanhos={tamanhos}
        inicial={{
          id: p.id, nome: p.nome, categoria_id: p.categoria_id, preco: p.preco, minimo: p.stock_minimo, foto: p.foto, activo: p.activo,
          cores: Array.from(new Set(activas.map((v) => v.cor_id).filter(Boolean))) as string[],
          tamanhos: Array.from(new Set(activas.map((v) => v.tamanho_id).filter(Boolean))) as string[],
        }}
      />
    </div>
  );
}
