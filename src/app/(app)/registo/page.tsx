import type { Metadata } from "next";
import Link from "next/link";
import { GESTAO, requireUser } from "@/lib/auth";
import { diaIso, diaLongo, hora } from "@/lib/format";
import { descrever, GRUPOS } from "@/lib/registo";
import { PageHead, Pill } from "@/components/ui";

export const metadata: Metadata = { title: "Registo de acções" };
export const dynamic = "force-dynamic";

/** CT-07: quem fez o quê. Só de leitura. */
export default async function RegistoPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { sb } = await requireUser(GESTAO);
  const grupo = sp.t && GRUPOS[sp.t] ? sp.t : "";
  const pessoa = sp.u && /^[0-9a-f-]{36}$/i.test(sp.u) ? sp.u : "";
  let q = sb.from("registo_accoes").select("id, accao, antes, depois, criado_em, utilizador_id, utilizadores(nome)").order("criado_em", { ascending: false }).limit(150);
  if (grupo) q = q.in("accao", GRUPOS[grupo]);
  if (pessoa) q = q.eq("utilizador_id", pessoa);
  const [{ data }, { data: pessoas }] = await Promise.all([q, sb.from("utilizadores").select("id, nome").order("nome")]);
  const porDia = new Map<string, NonNullable<typeof data>>();
  for (const r of data ?? []) {
    const d = diaIso(new Date(r.criado_em));
    porDia.set(d, [...(porDia.get(d) ?? []), r]);
  }
  const hoje = diaIso();
  const url = (o: Record<string, string>) => `/registo?${new URLSearchParams(Object.fromEntries(Object.entries({ t: grupo, u: pessoa, ...o }).filter(([, v]) => v)))}`;
  return (
    <div className="c-page" style={{ maxWidth: 900 }}>
      <PageHead title="Registo de acções" sub="Quem fez o quê. Este registo não se pode apagar nem mudar." />
      <div className="c-chips">
        {[["", "Tudo"], ["vendas", "Vendas"], ["stock", "Stock"], ["precos", "Peças e preços"], ["contas", "Contas"]].map(([k, l]) => (
          <Link key={k} href={url({ t: k })} className="c-chip" aria-current={grupo === k ? "true" : undefined}>{l}</Link>
        ))}
      </div>
      <form action="/registo" className="inline">
        {grupo ? <input type="hidden" name="t" value={grupo} /> : null}
        <select name="u" className="select" defaultValue={pessoa} aria-label="Quem" style={{ flex: 1, minWidth: 180 }}>
          <option value="">Todas as pessoas</option>
          {(pessoas ?? []).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
        <button type="submit" className="c-pequeno">Filtrar</button>
      </form>
      {porDia.size === 0 ? <p className="empty">Nada registado.</p> : null}
      {Array.from(porDia.entries()).map(([dia, linhas]) => (
        <div key={dia} className="stack-md" style={{ gap: 10 }}>
          <p className="kicker" style={{ fontSize: 15 }}>{dia === hoje ? "Hoje" : diaLongo(dia)}</p>
          {linhas.map((r) => {
            const d = descrever(r.accao, r.antes, r.depois);
            const quem = (r.utilizadores as unknown as { nome: string } | null)?.nome ?? "Sistema";
            return (
              <div key={r.id} className="c-card" style={{ gap: 8, padding: 14 }}>
                <div className="c-entre" style={{ alignItems: "center" }}>
                  <span className="c-avatar" style={{ width: 40, height: 40, fontSize: 16 }}>{quem.charAt(0)}</span>
                  <span className="c-linha-m"><b>{quem}</b><span className="c-linha-s">{hora(r.criado_em)}</span></span>
                  <Pill tone={d.tom}>{d.etiqueta}</Pill>
                </div>
                {d.texto ? <p className="p" style={{ fontSize: 15, lineHeight: "22px" }}>{d.texto}</p> : null}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
