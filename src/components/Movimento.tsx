"use client";

import { useState } from "react";
import Icon from "./Icon";
import { Foto } from "./ui";
import { ActionForm, SubmitButton } from "./forms";
import { registarMovimento } from "@/app/actions/stock";
import { corHex, nomeVariante } from "@/lib/cores";
import type { Peca } from "@/lib/catalogo";

const TIPOS = [
  { id: "entrada", nome: "Chegou mercadoria", icon: "caixa" },
  { id: "devolucao", nome: "Cliente devolveu", icon: "devolver" },
  { id: "defeito", nome: "Peça com defeito", icon: "aviso" },
  { id: "ajuste", nome: "Acertar contagem", icon: "contar" },
];

export default function Movimento({ pecas, inicial }: { pecas: Peca[]; inicial?: string }) {
  const [tipo, setTipo] = useState("entrada");
  const [pid, setPid] = useState(inicial && pecas.some((p) => p.id === inicial) ? inicial : "");
  const peca = pecas.find((p) => p.id === pid) ?? null;
  const cores = peca ? (Array.from(new Set(peca.variantes.map((v) => v.cor).filter(Boolean))) as string[]) : [];
  const [cor, setCor] = useState<string | null>(null);
  const [vid, setVid] = useState("");
  const [qtd, setQtd] = useState(1);
  const [sentido, setSentido] = useState<"juntar" | "tirar">("juntar");
  

  function escolherPeca(id: string) {
    setPid(id);
    const p = pecas.find((x) => x.id === id);
    const cs = p ? (Array.from(new Set(p.variantes.map((x) => x.cor).filter(Boolean))) as string[]) : [];
    setCor(cs[0] ?? null);
    setVid(p && p.variantes.length === 1 ? p.variantes[0].id : "");
  }
  const corActual = cor ?? cores[0] ?? null;
  const daCor = peca ? peca.variantes.filter((x) => (cores.length ? x.cor === corActual : true)) : [];
  const v = peca?.variantes.find((x) => x.id === vid) ?? (daCor.length === 1 ? daCor[0] : null);

  const sinal = tipo === "defeito" || (tipo === "ajuste" && sentido === "tirar") ? "−" : "+";
  const verbo = tipo === "entrada" ? `entram ${qtd}` : tipo === "devolucao" ? `volta${qtd > 1 ? "m" : ""} ${qtd}` : tipo === "defeito" ? `sa${qtd > 1 ? "em" : "i"} ${qtd}` : `${sentido === "tirar" ? "tirar" : "juntar"} ${qtd}`;

  return (
    <ActionForm action={registarMovimento} className="stack-md">
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="variante" value={v?.id ?? ""} />
      <input type="hidden" name="quantidade" value={qtd} />
      <input type="hidden" name="sentido" value={sentido} />
      <div className="c-opts" style={{ ["--cols" as string]: 2 }}>
        {TIPOS.map((t) => (
          <button key={t.id} type="button" className="c-opt" style={{ flexDirection: "row", justifyContent: "flex-start", gap: 8, padding: "0 12px", minHeight: 44 }} aria-pressed={tipo === t.id} onClick={() => setTipo(t.id)}>
            <Icon name={t.icon} size={16} /> {t.nome}
          </button>
        ))}
      </div>
      <div className="field">
        <label className="label" htmlFor="peca">Que peça?</label>
        <select id="peca" className="select" value={pid} onChange={(e) => escolherPeca(e.target.value)}>
          <option value="">Escolha a peça…</option>
          {pecas.map((p) => <option key={p.id} value={p.id}>{p.nome} · {p.categoria}</option>)}
        </select>
      </div>
      {peca ? (
        <div className="c-linha" style={{ boxShadow: "none" }}>
          <Foto path={peca.foto} categoria={peca.categoria} alt={peca.nome} className="c-mini" />
          <div className="c-linha-m">
            <span className="c-linha-t" style={{ fontSize: 16 }}>{peca.nome}</span>
            <span className="c-linha-s">{v ? `${nomeVariante(v) || "Peça única"} · agora há ${v.stock}` : "Escolha a cor e o número"}</span>
          </div>
        </div>
      ) : null}
      {peca && cores.length ? (
        <>
          <p className="c-rot">Cor</p>
          <div className="c-cor">
            {cores.map((c) => (
              <button key={c} type="button" aria-pressed={corActual === c} onClick={() => { setCor(c); setVid(""); }}>
                <span className="bola" style={{ background: corHex(c) }} />{c}
              </button>
            ))}
          </div>
        </>
      ) : null}
      {peca && daCor.some((x) => x.tamanho) ? (
        <>
          <p className="c-rot">Número / tamanho</p>
          <div className="c-opts" style={{ ["--cols" as string]: 4 }}>
            {daCor.map((x) => (
              <button key={x.id} type="button" className="c-opt" aria-pressed={vid === x.id} onClick={() => setVid(x.id)}>
                <span className="n">{x.tamanho}</span><span className="s">há {x.stock}</span>
              </button>
            ))}
          </div>
        </>
      ) : null}
      {tipo === "ajuste" ? (
        <div className="c-chips igual">
          <button type="button" className="c-chip" aria-pressed={sentido === "juntar"} onClick={() => setSentido("juntar")}>Há mais do que diz</button>
          <button type="button" className="c-chip" aria-pressed={sentido === "tirar"} onClick={() => setSentido("tirar")}>Há menos do que diz</button>
        </div>
      ) : null}
      <p className="c-rot">{tipo === "entrada" ? "Quantas entram?" : tipo === "ajuste" ? `Quantas a ${sentido === "tirar" ? "tirar" : "juntar"}?` : "Quantas?"}</p>
      <div className="c-stepper">
        <button type="button" aria-label="Menos uma" onClick={() => setQtd((q) => Math.max(1, q - 1))}><Icon name="menos" size={18} stroke={2.2} /></button>
        <output aria-live="polite">{sinal}{qtd}</output>
        <button type="button" className="mais" aria-label="Mais uma" onClick={() => setQtd((q) => Math.min(999, q + 1))}><Icon name="mais" size={18} stroke={2.2} /></button>
      </div>
      <div className="field">
        <label className="label" htmlFor="motivo">{tipo === "entrada" ? "Nota (opcional)" : "Motivo (obrigatório)"}</label>
        <input id="motivo" name="motivo" className="input" maxLength={300} required={tipo !== "entrada"}
          placeholder={tipo === "entrada" ? "Ex.: reposição de Novembro" : tipo === "devolucao" ? "Ex.: não serviu" : tipo === "defeito" ? "Ex.: salto descolado" : "Ex.: contagem do mês"} />
      </div>
      <SubmitButton className="c-cta" pendingText="A guardar…" disabled={!v}>
        <Icon name="certo" size={16} /> Guardar: {verbo} {qtd === 1 ? "peça" : "peças"}
      </SubmitButton>
    </ActionForm>
  );
}
