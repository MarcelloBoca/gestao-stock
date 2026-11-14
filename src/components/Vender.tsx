"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import Icon from "./Icon";
import { Foto } from "./ui";
import { useCesto } from "@/lib/cesto";
import { corHex, estadoStock, nomeVariante, textoStock } from "@/lib/cores";
import { mt } from "@/lib/format";
import { FORMAS, nomeForma } from "@/lib/types";
import { registarVenda } from "@/app/actions/vendas";
import type { Peca, Variante } from "@/lib/catalogo";

/** Valor exacto e as notas redondas seguintes (500, 1000, 5000), para o numerário. */
function rapidos(total: number): number[] {
  const out = [total];
  for (const m of [500, 1000, 5000]) {
    const x = Math.ceil(total / m) * m;
    if (x > 0 && !out.includes(x)) out.push(x);
  }
  return out.filter((x) => x > 0).slice(0, 4);
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function Vender({ pecas, modo }: { pecas: Peca[]; modo: "pecas" | "cesto" }) {
  const router = useRouter();
  const cesto = useCesto();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [selId, setSelId] = useState<string | null>(null);
  const [cor, setCor] = useState<string | null>(null);
  const [tam, setTam] = useState<string | null>(null);
  const [forma, setForma] = useState("");
  const [recebido, setRecebido] = useState("");
  const [erro, setErro] = useState("");
  const [juntou, setJuntou] = useState("");
  const [feito, setFeito] = useState<{ total: number; forma: string; pecas: number } | null>(null);
  const [pending, start] = useTransition();

  const porId = useMemo(() => new Map(pecas.map((p) => [p.id, p])), [pecas]);
  const stockDe = useMemo(() => {
    const m = new Map<string, number>();
    pecas.forEach((p) => p.variantes.forEach((v) => m.set(v.id, v.stock)));
    return m;
  }, [pecas]);
  const categorias = useMemo(() => Array.from(new Set(pecas.map((p) => p.categoria))).sort(), [pecas]);
  const lista = useMemo(() => {
    const t = norm(q.trim());
    return pecas.filter(
      (p) =>
        (!cat || p.categoria === cat) &&
        (!t || norm(`${p.nome} ${p.categoria} ${p.variantes.map((v) => `${v.cor ?? ""} ${v.tamanho ?? ""}`).join(" ")}`).includes(t)),
    );
  }, [pecas, q, cat]);

  const sel = selId ? porId.get(selId) ?? null : null;
  const cores = sel ? Array.from(new Set(sel.variantes.map((v) => v.cor).filter(Boolean))) as string[] : [];
  const tamanhosDe = (c: string | null) => (sel ? sel.variantes.filter((v) => (cores.length ? v.cor === c : true) && v.tamanho) : []);
  const escolhida: Variante | null = sel
    ? sel.variantes.find((v) => (cores.length ? v.cor === cor : true) && (tamanhosDe(cor).length ? v.tamanho === tam : true)) ?? null
    : null;
  const noCesto = (vid: string) => cesto.linhas.find((l) => l.variante_id === vid)?.quantidade ?? 0;
  const livre = (v: Variante) => v.stock - noCesto(v.id);

  function abrir(p: Peca) {
    setSelId(p.id);
    setErro("");
    setJuntou("");
    const cs = Array.from(new Set(p.variantes.map((v) => v.cor).filter(Boolean))) as string[];
    const primeiraCor = cs.find((c) => p.variantes.some((v) => v.cor === c && v.stock > 0)) ?? cs[0] ?? null;
    setCor(primeiraCor);
    const ts = p.variantes.filter((v) => (cs.length ? v.cor === primeiraCor : true) && v.tamanho);
    setTam(ts.length === 1 ? ts[0].tamanho : null);
  }
  function fechar() {
    setSelId(null);
  }
  function porNoCesto() {
    if (!sel || !escolhida) return;
    if (livre(escolhida) <= 0) {
      setErro(escolhida.stock <= 0 ? "Esta peça acabou." : "Já pôs no cesto todas as que há.");
      return;
    }
    cesto.juntar({
      variante_id: escolhida.id, produto_id: sel.id, nome: sel.nome, detalhe: nomeVariante(escolhida),
      preco: sel.preco, foto: sel.foto, categoria: sel.categoria,
    });
    setJuntou(`${sel.nome}${nomeVariante(escolhida) ? ", " + nomeVariante(escolhida) : ""}`);
    setSelId(null);
  }
  function terminar() {
    setErro("");
    if (!cesto.linhas.length) return setErro("O cesto está vazio.");
    if (!forma) return setErro("Escolha como o cliente pagou.");
    const resumo = { total: cesto.total, forma, pecas: cesto.pecas };
    start(async () => {
      const r = await registarVenda(forma, cesto.linhas.map((l) => ({ variante_id: l.variante_id, quantidade: l.quantidade })));
      if (r.error) {
        setErro(r.error);
        return;
      }
      cesto.limpar();
      setForma("");
      setRecebido("");
      setFeito(resumo);
      router.refresh();
    });
  }

  const aberto = Boolean(sel || feito);
  const inline = modo === "cesto" && !sel && !feito;

  return (
    <div className="c-page">
      <div className="c-duas">
        <div className={`c-col${modo === "cesto" ? " c-so-pc" : ""}`}>
          <h1 className="h1">Vender</h1>
          {juntou ? (
            <div className="c-aviso ok" role="status">
              <Icon name="certo" size={18} />
              <span style={{ flex: 1 }}>Juntou ao cesto: {juntou}</span>
              <Link href="/vender/cesto" className="c-so-tel" style={{ fontWeight: 800 }}>
                Ver cesto
              </Link>
            </div>
          ) : null}
          <div className="v-linhabusca">
            <div className="v-busca">
              <label className="c-procura">
                <Icon name="procurar" size={16} />
                <span className="visually-hidden">Procurar peça</span>
                <input id="procura" type="search" placeholder="Procurar peça" value={q} onChange={(e) => setQ(e.target.value)} />
              </label>
              {categorias.length > 1 ? (
                <label style={{ display: "contents" }}>
                  <span className="visually-hidden">Tipo de peça</span>
                  <select className="select" value={cat} onChange={(e) => setCat(e.target.value)}>
                    <option value="">Todas</option>
                    {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
              ) : null}
            </div>
          </div>
          {lista.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10, padding: "8px 0" }}>
              <p className="muted" style={{ margin: 0 }}>{pecas.length ? (q ? `Nenhuma peça encontrada para “${q}”${cat ? ` em ${cat}` : ""}.` : `Ainda não há peças em ${cat}.`) : "Ainda não há peças. A gestora regista-as em Peças e stock."}</p>
              {pecas.length ? <button type="button" className="btn" onClick={() => { setQ(""); setCat(""); }}>Ver todas as peças</button> : null}
            </div>
          ) : (
            <div className="c-grid largo">
              {lista.map((p) => {
                const est = estadoStock(p.stock, p.stock_minimo);
                return (
                  <button key={p.id} type="button" className="c-pcard" aria-pressed={selId === p.id} aria-disabled={p.stock <= 0} onClick={() => abrir(p)}>
                    <Foto path={p.foto} categoria={p.categoria} alt={p.nome} />
                    <span className="c-pcard-n">{p.nome}</span>
                    <span className="c-pcard-b">
                      <span>{mt(p.preco)}</span>
                      <span className={`c-q ${est}`}>{p.stock <= 0 ? "acabou" : `há ${p.stock}`}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <aside className={`c-painel c-sobre${aberto ? " aberto" : ""}`} style={inline ? { display: "flex" } : undefined} aria-label="Venda">
          {feito ? (
            <>
              <div className="c-feito">
                <span className="c-feito-ic"><Icon name="certo" size={30} stroke={2.4} /></span>
                <h2 className="h1 sm">Venda registada!</h2>
                <p className="p muted" style={{ fontSize: 17, lineHeight: "25px" }}>
                  {mt(feito.total)} · {nomeForma(feito.forma)} · {feito.pecas} {feito.pecas === 1 ? "peça" : "peças"}
                  <br />O stock já foi actualizado.
                </p>
              </div>
              <button type="button" className="c-cta" onClick={() => { setFeito(null); if (modo === "cesto") router.push("/vender"); }}>
                <Icon name="vender" size={18} /> Nova venda
              </button>
              <Link href="/hoje" className="c-outline"><Icon name="recibo" size={16} /> As minhas vendas de hoje</Link>
            </>
          ) : sel ? (
            <>
              <button type="button" className="c-back c-so-tel" onClick={fechar} style={{ cursor: "pointer" }}>
                <Icon name="voltar" size={16} stroke={2} /> Voltar
              </button>
              <div className="c-so-tel" style={{ maxWidth: 160, alignSelf: "center", width: "100%" }}>
                <Foto path={sel.foto} categoria={sel.categoria} alt={sel.nome} />
              </div>
              <div className="c-entre">
                <h2 className="h1 xs">{sel.nome}</h2>
                <p className="p" style={{ fontSize: 17, fontWeight: 700, whiteSpace: "nowrap" }}>{mt(sel.preco)}</p>
              </div>
              {cores.length ? (
                <>
                  <p className="c-rot">Cor</p>
                  <div className="c-cor">
                    {cores.map((c) => {
                      const temStock = sel.variantes.some((v) => v.cor === c && v.stock > 0);
                      return (
                        <button key={c} type="button" aria-pressed={cor === c} onClick={() => { setCor(c); setTam(null); setErro(""); }} style={temStock ? undefined : { opacity: 0.55 }}>
                          <span className="bola" style={{ background: corHex(c) }} />
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : null}
              {tamanhosDe(cor).length ? (
                <>
                  <p className="c-rot">Número / tamanho</p>
                  <div className="c-opts" style={{ ["--cols" as string]: 4 }}>
                    {tamanhosDe(cor).map((v) => (
                      <button key={v.id} type="button" className="c-opt" aria-pressed={tam === v.tamanho} disabled={v.stock <= 0} onClick={() => { setTam(v.tamanho); setErro(""); }}>
                        <span className="n" style={v.stock <= 0 ? { textDecoration: "line-through" } : undefined}>{v.tamanho}</span>
                        <span className={`s c-q ${estadoStock(v.stock)}`}>{textoStock(v.stock)}</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : escolhida ? (
                <p className={`c-q ${estadoStock(escolhida.stock)}`} style={{ fontSize: 16 }}>{escolhida.stock <= 0 ? "Esta peça acabou." : `Há ${escolhida.stock} na loja.`}</p>
              ) : null}
              {escolhida && escolhida.stock === 1 ? <p className="c-q pouco" style={{ fontSize: 15 }}>{nomeVariante(escolhida) || "Esta peça"}: é a última.</p> : null}
              {erro ? <p className="alert alert-error" role="alert">{erro}</p> : null}
              <button type="button" className="c-cta" onClick={porNoCesto} disabled={!escolhida || escolhida.stock <= 0} aria-disabled={!escolhida || escolhida.stock <= 0}>
                <Icon name="mais" size={18} /> Juntar ao cesto · {mt(sel.preco)}
              </button>
              <button type="button" className="btn btn-text c-so-pc" onClick={fechar}>Cancelar</button>
            </>
          ) : (
            <>
              <h2 className="h1 xs">Cesto</h2>
              {cesto.linhas.length === 0 ? (
                <p className="empty">O cesto está vazio. Toque numa peça para a juntar.</p>
              ) : (
                cesto.linhas.map((l) => {
                  const max = stockDe.get(l.variante_id) ?? l.quantidade;
                  return (
                    <div key={l.variante_id} className="c-linha" style={{ boxShadow: "none", background: "var(--fundo)" }}>
                      <Foto path={l.foto} categoria={l.categoria} alt={l.nome} className="c-mini" />
                      <div className="c-linha-m">
                        <span className="c-linha-t" style={{ fontSize: 16 }}>{l.nome}</span>
                        {l.detalhe ? <span className="c-linha-s">{l.detalhe}</span> : null}
                        <span style={{ fontWeight: 800 }}>{mt(l.preco * l.quantidade)}</span>
                      </div>
                      <div className="c-qtd">
                        <button type="button" aria-label={`Menos uma ${l.nome}`} onClick={() => cesto.mudar(l.variante_id, l.quantidade - 1)}>
                          <Icon name={l.quantidade === 1 ? "lixo" : "menos"} size={16} />
                        </button>
                        <output aria-label="Quantidade">{l.quantidade}</output>
                        <button type="button" aria-label={`Mais uma ${l.nome}`} disabled={l.quantidade >= max} onClick={() => cesto.mudar(l.variante_id, l.quantidade + 1)}>
                          <Icon name="mais" size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
              <Link href="/vender" className="c-outline c-so-tel"><Icon name="mais" size={16} /> Juntar mais peças</Link>
              {cesto.linhas.length ? (
                <>
                  <div className="c-entre">
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--suave)" }}>Total</span>
                    <span className="c-total-v">{mt(cesto.total)}</span>
                  </div>
                  <p className="c-rot">Como pagou o cliente?</p>
                  <div className="c-opts" style={{ ["--cols" as string]: 2 }}>
                    {FORMAS.map((f) => (
                      <button key={f.id} type="button" className="c-opt" style={{ flexDirection: "row", gap: 8, justifyContent: "flex-start", padding: "0 10px" }} aria-pressed={forma === f.id} onClick={() => { setForma(f.id); setErro(""); }}>
                        <Icon name={f.icon} size={16} />
                        {f.curto}
                      </button>
                    ))}
                  </div>
                  {forma === "numerario" ? (
                    <>
                      <div className="field">
                        <label className="label" htmlFor="recebido">Valor recebido (MT)</label>
                        <input id="recebido" className="input" inputMode="numeric" value={recebido} placeholder="Ex.: 5000" onChange={(e) => setRecebido(e.target.value.replace(/[^0-9]/g, ""))} />
                      </div>
                      <div role="group" aria-label="Valores rápidos" className="v-rapidos">
                        {rapidos(cesto.total).map((v, i) => (
                          <button key={v} type="button" className="v-rapido" aria-pressed={Number(recebido) === v} onClick={() => setRecebido(String(v))}>{i === 0 ? "Valor exacto" : mt(v)}</button>
                        ))}
                      </div>
                      <p role="status" style={{ margin: 0, fontSize: 14, fontWeight: 600, color: !recebido ? "var(--fraco)" : Number(recebido) >= cesto.total ? "var(--paga)" : "var(--porpagar)" }}>
                        {!recebido ? "Escreva quanto recebeu para ver o troco." : Number(recebido) >= cesto.total ? `Troco: ${mt(Number(recebido) - cesto.total)}` : `Faltam ${mt(cesto.total - Number(recebido))}`}
                      </p>
                    </>
                  ) : null}
                  {erro ? <p className="alert alert-error" role="alert">{erro}</p> : null}
                  <button type="button" className="c-cta" onClick={terminar} disabled={pending} aria-disabled={pending}>
                    <Icon name="certo" size={18} /> {pending ? "A registar…" : `Registar venda · ${mt(cesto.total)}`}
                  </button>
                  {!forma ? <p className="hint" role="status" style={{ textAlign: "center" }}>Escolha como o cliente pagou.</p> : null}
                </>
              ) : null}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
