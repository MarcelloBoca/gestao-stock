import type { Metadata } from "next";
import { GESTAO, requireUser } from "@/lib/auth";
import { catalogo } from "@/lib/catalogo";
import { PageHead } from "@/components/ui";
import Movimento from "@/components/Movimento";

export const metadata: Metadata = { title: "Chegou mercadoria" };
export const dynamic = "force-dynamic";

export default async function MercadoriaPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { sb } = await requireUser(GESTAO);
  const { pecas } = await catalogo(sb);
  const activas = pecas.filter((p) => p.activo).map((p) => ({ ...p, variantes: p.variantes.filter((v) => v.activa) })).filter((p) => p.variantes.length);
  return (
    <div className="c-page c-narrow" style={{ maxWidth: 680 }}>
      <PageHead title="O que aconteceu?" sub="Entradas, devoluções, defeitos e acertos de contagem." />
      {activas.length ? <Movimento pecas={activas} inicial={sp.peca} /> : <p className="empty">Ainda não há peças. Registe primeiro em Peças e stock → Nova peça.</p>}
    </div>
  );
}
