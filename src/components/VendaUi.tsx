import Link from "next/link";
import { Foto, Pill } from "./ui";
import { hora, mt } from "@/lib/format";
import { nomeForma, FORMAS } from "@/lib/types";
import Icon from "./Icon";
import { descricao, linhasActivas, type Venda } from "@/lib/vendas";

export function EstadoPill({ estado }: { estado: string }) {
  if (estado === "corrigida") return <Pill tone="pouco">Corrigida</Pill>;
  if (estado === "anulada") return <Pill tone="zero">Anulada</Pill>;
  return null;
}

/** Cartão de uma venda: fotos, hora, quem vendeu, forma de pagamento, peças e total. */
export function CartaoVenda({ v, href, mostrarVendedor = true }: { v: Venda; href?: string; mostrarVendedor?: boolean }) {
  const anulada = v.estado === "anulada";
  const ls = linhasActivas(v);
  const conteudo = (
    <>
      <div style={{ display: "flex", gap: 4, flex: "none" }}>
        {ls.slice(0, 2).map((l) => (
          <Foto key={l.id} path={l.foto} categoria={l.categoria} alt={l.nome} className="c-mini" />
        ))}
      </div>
      <div className="c-linha-m">
        <span className={`c-linha-t${anulada ? " c-riscado" : ""}`}>
          {hora(v.criada_em)}{mostrarVendedor ? ` · ${v.vendedor}` : ""}
        </span>
        <span className="c-linha-s">{nomeForma(v.forma)}</span>
        <span style={{ fontSize: 15, lineHeight: "21px" }}>{descricao(v)}</span>
        {v.estado !== "normal" ? <span><EstadoPill estado={v.estado} /></span> : null}
      </div>
      <span className={`c-linha-v${anulada ? " c-riscado" : ""}`} style={{ alignSelf: "flex-start" }}>{mt(v.total)}</span>
    </>
  );
  return href ? (
    <Link href={href} className="c-linha" style={{ alignItems: "flex-start" }}>{conteudo}</Link>
  ) : (
    <div className="c-linha" style={{ alignItems: "flex-start" }}>{conteudo}</div>
  );
}

export function Formas({ porForma, escuro = false }: { porForma: Record<string, number>; escuro?: boolean }) {
  return (
    <div className="c-formas">
      {FORMAS.map((f) => (
        <div key={f.id} className="c-forma" style={escuro ? { background: "var(--ameixa-2)" } : undefined}>
          <span className="c-forma-k" style={escuro ? { color: "var(--rosa)" } : undefined}>
            <Icon name={f.icon} size={16} /> {f.curto}
          </span>
          <span className="c-forma-v" style={escuro ? { color: "#fff" } : undefined}>{mt(porForma[f.id] ?? 0)}</span>
        </div>
      ))}
    </div>
  );
}
