"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icon";
import { useCesto } from "@/lib/cesto";
import type { Perfil } from "@/lib/types";
import { PERFIS } from "@/lib/types";

type Item = { href: string; label: string; icon: string; match?: (p: string) => boolean };

const LATERAL: Record<Perfil, Item[]> = {
  vendedor: [
    { href: "/vender", label: "Vender", icon: "vender", match: (p) => p.startsWith("/vender") },
    { href: "/hoje", label: "O que vendi hoje", icon: "recibo" },
  ],
  gestor: [],
  administrador: [],
};
LATERAL.gestor = [
  { href: "/inicio", label: "Início", icon: "grelha" },
  { href: "/vender", label: "Vender", icon: "vender", match: (p) => p.startsWith("/vender") },
  { href: "/vendas", label: "Vendas", icon: "recibo", match: (p) => p.startsWith("/vendas") },
  { href: "/pecas", label: "Peças e stock", icon: "caixa", match: (p) => p.startsWith("/pecas") },
  { href: "/mercadoria", label: "Chegou mercadoria", icon: "mais" },
  { href: "/relatorios", label: "Relatórios", icon: "grafico" },
  { href: "/registo", label: "Registo de acções", icon: "lista" },
];
LATERAL.administrador = [
  ...LATERAL.gestor,
  { href: "/funcionarias", label: "Funcionárias", icon: "pessoas" },
  { href: "/sms", label: "Mensagens SMS", icon: "sms" },
];

function activo(item: Item, path: string) {
  return item.match ? item.match(path) : path === item.href || path.startsWith(item.href + "/");
}

export function Sidebar({ perfil, nome }: { perfil: Perfil; nome: string }) {
  const path = usePathname();
  return (
    <nav aria-label="Menu" className="c-side">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-solachic.png" alt="Sola.chic" className="c-side-logo" width={104} height={104} />
      {LATERAL[perfil].map((it) => (
        <Link key={it.href} href={it.href} className="c-side-a" aria-current={activo(it, path) ? "page" : undefined}>
          <Icon name={it.icon} size={24} />
          {it.label}
        </Link>
      ))}
      <div className="c-side-fim">
        <p className="c-side-quem">
          {nome} · {PERFIS[perfil].toLowerCase()}
        </p>
        <Link href="/palavra-passe" className="c-side-a c-side-mini">
          <Icon name="chave" size={20} />
          Mudar palavra-passe
        </Link>
        <a href="/sair" className="c-side-sair">
          <Icon name="sair" size={22} />
          Sair
        </a>
      </div>
    </nav>
  );
}

export function BottomNav({ perfil }: { perfil: Perfil }) {
  const path = usePathname();
  const { pecas } = useCesto();
  const cesto = `Cesto${pecas ? ` (${pecas})` : ""}`;
  const items: Item[] =
    perfil === "vendedor"
      ? [
          { href: "/vender", label: "Peças", icon: "grelha", match: (p) => p === "/vender" },
          { href: "/vender/cesto", label: cesto, icon: "vender" },
          { href: "/hoje", label: "Vendi hoje", icon: "recibo" },
        ]
      : [
          { href: "/vender", label: "Vender", icon: "grelha", match: (p) => p === "/vender" },
          { href: "/vender/cesto", label: cesto, icon: "vender" },
          { href: "/vendas", label: "Vendas", icon: "recibo", match: (p) => p.startsWith("/vendas") },
          {
            href: "/inicio",
            label: "Gestão",
            icon: "menu",
            match: (p) => !p.startsWith("/vender") && !p.startsWith("/vendas"),
          },
        ];
  return (
    <nav aria-label="Menu" className="c-bnav" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((it) => (
        <Link key={it.href} href={it.href} className="c-bnav-a" aria-current={activo(it, path) ? "page" : undefined}>
          <Icon name={it.icon} size={28} />
          {it.label}
        </Link>
      ))}
    </nav>
  );
}
