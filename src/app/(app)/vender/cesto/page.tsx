import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { catalogo } from "@/lib/catalogo";
import Vender from "@/components/Vender";

export const metadata: Metadata = { title: "Cesto" };
export const dynamic = "force-dynamic";

export default async function CestoPage() {
  const { sb } = await requireUser();
  const { pecas } = await catalogo(sb, true);
  return <Vender pecas={pecas} modo="cesto" />;
}
