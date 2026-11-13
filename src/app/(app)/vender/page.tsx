import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { catalogo } from "@/lib/catalogo";
import Vender from "@/components/Vender";

export const metadata: Metadata = { title: "Vender" };
export const dynamic = "force-dynamic";

export default async function VenderPage() {
  const { sb } = await requireUser();
  const { pecas } = await catalogo(sb, true);
  return <Vender pecas={pecas} modo="pecas" />;
}
