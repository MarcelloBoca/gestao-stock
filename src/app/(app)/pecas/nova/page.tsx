import type { Metadata } from "next";
import { GESTAO, requireUser } from "@/lib/auth";
import { catalogo } from "@/lib/catalogo";
import { PageHead } from "@/components/ui";
import PecaForm from "@/components/PecaForm";

export const metadata: Metadata = { title: "Nova peça" };
export const dynamic = "force-dynamic";

export default async function NovaPecaPage() {
  const { sb } = await requireUser(GESTAO);
  const { categorias, cores, tamanhos } = await catalogo(sb);
  return (
    <div className="c-page c-narrow" style={{ maxWidth: 680 }}>
      <PageHead title="Nova peça" back={{ href: "/pecas", label: "Peças" }} />
      <PecaForm categorias={categorias.filter((c) => c.activa)} cores={cores} tamanhos={tamanhos} />
    </div>
  );
}
