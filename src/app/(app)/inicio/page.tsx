import type { Metadata } from "next";
import Link from "next/link";
import { GESTAO, requireUser } from "@/lib/auth";
import { aRepor, catalogo } from "@/lib/catalogo";
import { diaIso, diaLongo, mt } from "@/lib/format";
import { listarVendas, relatorio } from "@/lib/vendas";
import { PERFIS } from "@/lib/types";
import Icon from "@/components/Icon";
import { CartaoVenda, Formas } from "@/components/VendaUi";

export const metadata: Metadata = { title: "Início" };
export const dynamic = "force-dynamic";

/** RL-01: painel do dia da gestora e da administradora. */
export default async function InicioPage() {
  const { sb, user } = await requireUser(GESTAO);
  const hoje = diaIso();
  const admin = user.perfil === "administrador";
  const [rel, ultimas, cat, falhas] = await Promise.all([
    relatorio(sb, hoje, hoje),
    listarVendas(sb, hoje, hoje, { limite: 5 }),
    catalogo(sb),
    admin ? sb.from("envios_sms").select("id", { count: "exact", head: true }).eq("estado", "falhado").gte("dia", hoje) : Promise.resolve({ count: 0 }),
  ]);
  const repor = aRepor(cat.pecas);
  const tiles = [
    ...(admin ? [{ href: "/funcionarias", icon: "pessoas", t: "Funcionárias" }] : []),
    { href: "/mercadoria", icon: "caixa", t: "Chegou mercadoria" },
    { href: "/vendas", icon: "recibo", t: "Vendas de hoje" },
    { href: "/pecas", icon: "preco", t: "Peças e preços" },
    { href: "/pecas/nova", icon: "camara", t: "Nova peça" },
    { href: "/relatorios", icon: "grafico", t: "Como correu" },
    { href: "/registo", icon: "lista", t: "Quem fez o quê" },
    ...(admin ? [{ href: "/sms", icon: "sms", t: "Mensagens SMS" }] : []),
  ];

  return (
    <div className="c-page">
      <div className="c-duas">
        <div className="c-col">
          <div className="c-head-row">
            <div className="stack">
              <h1 className="h1">Olá, {user.nome.split(" ")[0]}</h1>
              <p className="p muted">{diaLongo(hoje)} · {PERFIS[user.perfil].toLowerCase()}</p>
            </div>
            <a href="/sair" className="c-back c-so-tel" style={{ padding: "0 16px" }}><Icon name="sair" size={20} /> Sair</a>
          </div>
          <div className="c-escuro" style={{ flexDirection: "column", alignItems: "stretch", gap: 14 }}>
            <div className="c-entre" style={{ alignItems: "flex-end" }}>
              <div className="stack">
                <p className="c-escuro-k">A loja vendeu hoje</p>
                <p className="c-escuro-v">{mt(rel.total)}</p>
              </div>
              <p className="c-escuro-s">{rel.vendas} {rel.vendas === 1 ? "venda" : "vendas"}</p>
            </div>
            <Formas porForma={rel.por_forma} escuro />
          </div>
          {falhas.count ? (
            <Link href="/sms" className="c-aviso erro"><Icon name="aviso" /><span style={{ flex: 1 }}>O SMS de hoje não foi entregue a todos. Ver envios.</span><Icon name="seguir" size={20} /></Link>
          ) : null}
          {repor.length ? (
            <Link href="/pecas?f=acabar" className="c-aviso">
              <Icon name="aviso" />
              <span style={{ flex: 1 }}>{repor.length === 1 ? "1 peça está a acabar" : `${repor.length} peças estão a acabar`}. Toque para ver quais.</span>
              <Icon name="seguir" size={20} />
            </Link>
          ) : null}
          <Link href="/vender" className="c-vender">
            <span className="c-vender-ic"><Icon name="vender" size={30} /></span>
            <span style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 22, fontWeight: 800 }}>Vender</span>
              <span style={{ fontSize: 15, color: "#4a2f42" }}>Atender um cliente</span>
            </span>
            <Icon name="seguir" />
          </Link>
          <p className="c-card-t" style={{ marginTop: 4 }}>Gerir a loja</p>
          <div className="c-tiles">
            {tiles.map((t) => (
              <Link key={t.href} href={t.href} className="c-tile">
                <span className="c-tile-ic"><Icon name={t.icon} /></span>
                <span className="c-tile-t">{t.t}</span>
              </Link>
            ))}
          </div>
          <a href="/palavra-passe" className="btn btn-text c-so-tel">Mudar a minha palavra-passe</a>
        </div>
        <aside className="c-painel c-so-pc">
          <h2 className="c-card-t">Últimas vendas</h2>
          {ultimas.length === 0 ? <p className="empty">Ainda não há vendas hoje.</p> : ultimas.map((v) => <CartaoVenda key={v.id} v={v} href={`/vendas/${v.id}`} />)}
          <Link href="/vendas" className="c-outline"><Icon name="recibo" size={22} /> Ver todas as vendas</Link>
        </aside>
      </div>
    </div>
  );
}
