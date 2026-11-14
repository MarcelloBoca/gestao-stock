import Link from "next/link";
import Icon, { iconeCategoria } from "./Icon";
import { fotoUrl } from "@/lib/supabase/config";
import { mt } from "@/lib/format";

export function BackLink({ href, label = "Voltar" }: { href: string; label?: string }) {
  return (
    <Link href={href} className="c-back">
      <Icon name="voltar" size={16} stroke={2} />
      {label}
    </Link>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "ok" | "error" | "rose"; children: React.ReactNode }) {
  return <p className={`alert alert-${tone}`}>{children}</p>;
}

/** Foto da peça, ou um desenho da categoria quando não tem foto. */
export function Foto({ path, categoria, alt, size, className = "" }: { path?: string | null; categoria?: string | null; alt: string; size?: number; className?: string }) {
  const url = fotoUrl(path);
  const style = size ? { width: size, height: size } : undefined;
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={alt} className={`c-foto ${className}`} style={style} loading="lazy" />;
  }
  return (
    <span role="img" aria-label={alt} className={`c-foto c-foto-vazia ${className}`} style={style}>
      <Icon name={iconeCategoria(categoria)} size={size ? Math.max(16, Math.round(size * 0.45)) : className.includes("c-mini") ? 20 : 40} stroke={1.4} />
    </span>
  );
}

export function Pill({ tone, children }: { tone: "ok" | "pouco" | "zero" | "rosa" | "cinza"; children: React.ReactNode }) {
  return <span className={`c-pill c-pill-${tone}`}>{children}</span>;
}

export function Escuro({ label, valor, lado }: { label: string; valor: string; lado?: string }) {
  return (
    <div className="c-escuro">
      <div className="stack">
        <p className="c-escuro-k">{label}</p>
        <p className="c-escuro-v">{valor}</p>
      </div>
      {lado ? <p className="c-escuro-s">{lado}</p> : null}
    </div>
  );
}

export function PageHead({ title, sub, back, action }: { title: string; sub?: string; back?: { href: string; label?: string }; action?: React.ReactNode }) {
  return (
    <div className="c-head">
      {back ? <BackLink href={back.href} label={back.label} /> : null}
      <div className="c-head-row">
        <div className="stack">
          <h1 className="h1">{title}</h1>
          {sub ? <p className="p muted">{sub}</p> : null}
        </div>
        {action}
      </div>
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="empty">{children}</p>;
}

/** Bloco "Lucro estimado" (vendido menos o custo das peças). Avisa quando há peças vendidas sem custo. */
export function LucroTile({ lucro, semCusto, comCusto, borda = false }: { lucro: number; semCusto: number; comCusto: number; borda?: boolean }) {
  return (
    <div className={`v-tile${borda ? " borda" : ""}`}>
      <p className="v-tile-k">Lucro estimado</p>
      <p className="v-tile-v">{comCusto || !semCusto ? mt(lucro) : "—"}</p>
      <p className="v-tile-s" style={semCusto ? { color: "var(--parcial)" } : undefined}>
        {semCusto ? `${semCusto} ${semCusto === 1 ? "peça vendida sem custo" : "peças vendidas sem custo"}` : "preço menos custo"}
      </p>
    </div>
  );
}
