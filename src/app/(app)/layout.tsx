import { requireUser } from "@/lib/auth";
import { BottomNav, Sidebar } from "@/components/Nav";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireUser();
  return (
    <div className="c-shell">
      <Sidebar perfil={user.perfil} nome={user.nome} />
      <main className="c-main">{children}</main>
      <BottomNav perfil={user.perfil} />
    </div>
  );
}
