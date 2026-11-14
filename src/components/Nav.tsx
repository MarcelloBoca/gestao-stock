"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Icon from "./Icon";
import { useCesto } from "@/lib/cesto";
import type { Perfil } from "@/lib/types";
import { PERFIS } from "@/lib/types";

type Item = { href: string; label: string; icon: string; match?: (p: string) => boolean };
type Grupo = { titulo: string; itens: Item[] };

const VENDER: Item = { href: "/vender", label: "Vender", icon: "vender", match: (p) => p.startsWith("/vender") };
const MINHAS: Item = { href: "/hoje", label: "As minhas vendas", icon: "recibo" };

function grupos(perfil: Perfil): Grupo[] {
  if (perfil === "vendedor") return [{ titulo: "Loja", itens: [VENDER, MINHAS] }];
  const g: Grupo[] = [
    { titulo: "Loja", itens: [{ href: "/inicio", label: "Início", icon: "casa" }, VENDER, MINHAS] },
    {
      titulo: "Gestão",
      itens: [
        { href: "/vendas", label: "Vendas da loja", icon: "lista", match: (p) => p.startsWith("/vendas") },
        { href: "/pecas", label: "Peças e stock", icon: "preco", match: (p) => p.startsWith("/pecas") },
        { href: "/mercadoria", label: "Chegou mercadoria", icon: "camiao" },
        { href: "/relatorios", label: "Relatórios", icon: "grafico" },
        { href: "/registo", label: "Registo de acções", icon: "lapis" },
      ],
    },
  ];
  if (perfil === "administrador") {
    g.push({ titulo: "Administração", itens: [{ href: "/funcionarias", label: "Funcionárias", icon: "pessoas" }, { href: "/sms", label: "Mensagens SMS", icon: "sms" }] });
  }
  return g;
}

function activo(item: Item, path: string) {
  return item.match ? item.match(path) : path === item.href || path.startsWith(item.href + "/");
}

const iniciais = (nome: string) => nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");

function Quem({ nome, perfil }: { nome: string; perfil: Perfil }) {
  return (
    <span className="v-quem" style={{ flex: 1 }}>
      <span className="v-ini" aria-hidden="true">{iniciais(nome)}</span>
      <span className="v-quem-t">
        <span className="v-quem-n">{nome}</span>
        <span className="v-quem-f">{PERFIS[perfil]}</span>
      </span>
    </span>
  );
}

export function Sidebar({ perfil, nome }: { perfil: Perfil; nome: string }) {
  const path = usePathname();
  return (
    <nav aria-label="Menu principal" className="c-side">
      <Link href="/" aria-label="Sola.chic, início">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-solachic.png" alt="" className="c-side-logo" width={76} height={76} />
      </Link>
      {grupos(perfil).map((g) => (
        <div key={g.titulo} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <p className="c-side-grupo">{g.titulo}</p>
          {g.itens.map((it) => (
            <Link key={it.href} href={it.href} className="c-side-a" aria-current={activo(it, path) ? "page" : undefined}>
              <span className="ic"><Icon name={it.icon} size={18} stroke={1.8} /></span>
              {it.label}
            </Link>
          ))}
        </div>
      ))}
      <div className="c-side-fim">
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 4px" }}>
          <Quem nome={nome} perfil={perfil} />
          <a href="/sair" className="c-side-sair" aria-label="Sair">
            <Icon name="sair" size={18} stroke={1.8} />
          </a>
        </div>
        <Link href="/palavra-passe" className="c-side-a" aria-current={path === "/palavra-passe" ? "page" : undefined}>
          <span className="ic"><Icon name="cadeado" size={18} stroke={1.8} /></span>
          Mudar o meu PIN
        </Link>
      </div>
    </nav>
  );
}

export function BottomNav({ perfil, nome }: { perfil: Perfil; nome: string }) {
  const path = usePathname();
  const { pecas } = useCesto();
  const [mais, setMais] = useState(false);
  useEffect(() => setMais(false), [path]);
  useEffect(() => {
    if (!mais) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMais(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mais]);

  const cesto: Item = { href: "/vender/cesto", label: pecas ? `Cesto (${pecas})` : "Cesto", icon: "vender" };
  const abas: Item[] =
    perfil === "vendedor"
      ? [{ ...VENDER, icon: "grelha", match: (p) => p === "/vender" }, cesto, { ...MINHAS, label: "Vendi hoje" }]
      : [
          { href: "/inicio", label: "Início", icon: "casa" },
          { ...VENDER, match: (p) => p.startsWith("/vender") },
          { href: "/vendas", label: "Vendas", icon: "recibo", match: (p) => p.startsWith("/vendas") },
          { href: "/pecas", label: "Stock", icon: "preco", match: (p) => p.startsWith("/pecas") },
        ];
  const naAba = abas.some((a) => activo(a, path));
  const resto = grupos(perfil).flatMap((g) => g.itens).filter((it) => !abas.some((a) => a.href === it.href));
  if (perfil !== "vendedor" && !resto.some((r) => r.href === "/pecas/nova")) {
    resto.splice(resto.findIndex((r) => r.href === "/mercadoria") + 1, 0, { href: "/pecas/nova", label: "Nova peça", icon: "mais" });
  }

  return (
    <>
      <nav aria-label="Menu principal" className="c-bnav" style={{ gridTemplateColumns: `repeat(${abas.length + 1}, minmax(0, 1fr))` }}>
        {abas.map((it) => (
          <Link key={it.href} href={it.href} className="c-bnav-a" aria-current={activo(it, path) ? "page" : undefined}>
            <Icon name={it.icon} size={20} stroke={activo(it, path) ? 2 : 1.8} />
            {it.label}
          </Link>
        ))}
        <button type="button" className="c-bnav-a" aria-expanded={mais} aria-current={!naAba && !mais ? "page" : undefined} onClick={() => setMais((v) => !v)}>
          <Icon name="pontos" size={20} stroke={2.6} />
          Mais
        </button>
      </nav>
      {mais ? (
        <div className="v-folha">
          <button type="button" className="v-folha-fundo" aria-label="Fechar" onClick={() => setMais(false)} />
          <div role="dialog" aria-modal="true" aria-label="Mais opções" className="v-folha-caixa">
            <span className="v-folha-pega" aria-hidden="true" />
            <div style={{ padding: "8px 0 12px" }}><Quem nome={nome} perfil={perfil} /></div>
            {resto.map((it) => (
              <Link key={it.href} href={it.href} className="v-folha-a">
                <span className="ic"><Icon name={it.icon} size={18} stroke={1.8} /></span>
                <span style={{ flex: 1 }}>{it.label}</span>
                <span className="ic"><Icon name="seguir" size={16} /></span>
              </Link>
            ))}
            <Link href="/palavra-passe" className="v-folha-a">
              <span className="ic"><Icon name="cadeado" size={18} stroke={1.8} /></span>
              <span style={{ flex: 1 }}>Mudar o meu PIN</span>
              <span className="ic"><Icon name="seguir" size={16} /></span>
            </Link>
            <a href="/sair" className="v-folha-a sair">
              <span className="ic"><Icon name="sair" size={18} stroke={1.8} /></span>
              <span style={{ flex: 1 }}>Sair</span>
            </a>
          </div>
        </div>
      ) : null}
    </>
  );
}
