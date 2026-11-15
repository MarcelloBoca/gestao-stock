"use client";

import { useMemo, useState } from "react";
import Icon from "./Icon";
import { ActionForm, SubmitButton } from "./forms";
import { guardarCliente } from "@/app/actions/clientes";
import { contactoLegivel, linkWhatsApp, mensagemPara } from "@/lib/whatsapp";

export type ClienteLinha = { id: string; nome: string; contacto: string | null; aceita: boolean; compras: number; total: string; ultima: string };

const MODELO = "Olá {nome}! Chegaram novidades na Sola.chic. Venha ver à loja ou responda a esta mensagem para lhe mostrarmos as fotos.";
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const iniciais = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");

export function ListaClientes({ clientes }: { clientes: ClienteLinha[] }) {
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState("whatsapp");
  const [modelo, setModelo] = useState(MODELO);
  const [enviados, setEnviados] = useState<Set<string>>(new Set());
  const [copiado, setCopiado] = useState(false);

  const lista = useMemo(() => {
    const t = norm(q.trim());
    return clientes.filter((c) => {
      if (filtro === "whatsapp" && !(c.contacto && c.aceita)) return false;
      if (filtro === "sem" && c.contacto) return false;
      if (filtro === "nao" && c.aceita) return false;
      return !t || norm(c.nome).includes(t) || (c.contacto ?? "").includes(t.replace(/\D/g, "") || "§");
    });
  }, [clientes, q, filtro]);
  const comWhats = clientes.filter((c) => c.contacto && c.aceita);

  async function copiar() {
    const txt = comWhats.map((c) => `${c.nome}: ${contactoLegivel(c.contacto)}`).join("\n");
    try {
      await navigator.clipboard.writeText(txt);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <>
      <section aria-labelledby="h-msg" className="v-sec">
        <div className="v-sec-h"><h2 id="h-msg">Mensagem para os clientes</h2><span className="muted" style={{ fontSize: 14 }}>{comWhats.length} com WhatsApp</span></div>
        <div className="field">
          <label className="label" htmlFor="modelo">Texto da mensagem</label>
          <textarea id="modelo" className="textarea" rows={3} value={modelo} onChange={(e) => setModelo(e.target.value)} maxLength={1000} />
          <p className="hint">Escreva {"{nome}"} onde quer o primeiro nome do cliente. Depois toque em WhatsApp em cada cliente: abre a conversa com a mensagem já escrita, só falta enviar.</p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button type="button" className="btn" onClick={copiar} disabled={!comWhats.length}><Icon name="lista" size={16} /> {copiado ? "Contactos copiados" : "Copiar os contactos"}</button>
          {enviados.size ? <button type="button" className="btn btn-text" onClick={() => setEnviados(new Set())}>Recomeçar ({enviados.size} abertos)</button> : null}
        </div>
      </section>

      <div className="v-linhabusca">
        <div className="v-busca">
          <label className="c-procura">
            <Icon name="procurar" size={16} />
            <span className="visually-hidden">Procurar cliente</span>
            <input type="search" placeholder="Procurar cliente" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <label style={{ display: "contents" }}>
            <span className="visually-hidden">Mostrar</span>
            <select className="select" value={filtro} onChange={(e) => setFiltro(e.target.value)} style={{ flexBasis: 150, width: 150 }}>
              <option value="whatsapp">Com WhatsApp</option>
              <option value="todos">Todos</option>
              <option value="sem">Sem contacto</option>
              <option value="nao">Não querem mensagens</option>
            </select>
          </label>
        </div>
      </div>

      <section aria-labelledby="h-lista" className="v-sec">
        <div className="v-sec-h"><h2 id="h-lista">{lista.length === 1 ? "1 cliente" : `${lista.length} clientes`}</h2></div>
        {lista.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>{clientes.length ? "Nenhum cliente com este filtro." : "Ainda não há clientes. Ao vender, escreva o nome e o contacto do cliente (é opcional)."}</p>
        ) : (
          <div className="v-lista">
            {lista.map((c) => (
              <div key={c.id} className="v-row" style={{ flexWrap: "wrap", alignItems: "center", padding: "10px 0" }}>
                <span className="v-ini" aria-hidden="true">{iniciais(c.nome)}</span>
                <span className="v-row-m" style={{ flex: "1 1 180px" }}>
                  <span className="v-row-t">{c.nome}</span>
                  <span className="v-row-s">
                    {c.contacto ? contactoLegivel(c.contacto) : "Sem contacto"}
                    {c.compras ? `. ${c.compras} ${c.compras === 1 ? "compra" : "compras"}, ${c.total}, última ${c.ultima}` : ""}
                    {!c.aceita ? ". Não quer mensagens" : ""}
                  </span>
                </span>
                <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {c.contacto && c.aceita ? (
                    <a href={linkWhatsApp(c.contacto, mensagemPara(modelo, c.nome))} target="_blank" rel="noopener noreferrer"
                      className={`btn btn-sm${enviados.has(c.id) ? "" : " btn-whats"}`} onClick={() => setEnviados((s) => new Set(s).add(c.id))}
                      aria-label={`Abrir WhatsApp de ${c.nome}`}>
                      <Icon name={enviados.has(c.id) ? "certo" : "sms"} size={16} /> {enviados.has(c.id) ? "Aberto" : "WhatsApp"}
                    </a>
                  ) : null}
                  {c.contacto ? <a href={`tel:+${c.contacto}`} className="btn btn-sm" aria-label={`Ligar a ${c.nome}`}><Icon name="telefone" size={16} /></a> : null}
                </span>
                <details className="v-editar" style={{ flexBasis: "100%" }}>
                  <summary className="v-link">Editar</summary>
                  <ActionForm action={guardarCliente}>
                    <input type="hidden" name="id" value={c.id} />
                    <div className="v-dois">
                      <div className="field"><label className="label" htmlFor={`n-${c.id}`}>Nome</label><input id={`n-${c.id}`} name="nome" className="input" defaultValue={c.nome} maxLength={80} required /></div>
                      <div className="field"><label className="label" htmlFor={`t-${c.id}`}>Contacto</label><input id={`t-${c.id}`} name="contacto" type="tel" inputMode="tel" className="input" defaultValue={c.contacto ? contactoLegivel(c.contacto) : ""} maxLength={20} /></div>
                    </div>
                    <label className="v-check"><input type="checkbox" name="aceita" value="1" defaultChecked={c.aceita} /> Aceita receber mensagens e promoções</label>
                    <SubmitButton className="btn btn-primary" pendingText="A guardar…">Guardar</SubmitButton>
                  </ActionForm>
                </details>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
