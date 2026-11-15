"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Icon from "./Icon";

/** Pesquisa por nome, tipo de peça numa lista e "Só a acabar". Aplica ao escolher; sem JavaScript, Enter envia. */
export function FiltroPecas({ q, cat, acabar, categorias }: { q: string; cat: string; acabar: boolean; categorias: { id: string; nome: string }[] }) {
  const router = useRouter();
  const [texto, setTexto] = useState(q);
  const ir = (o: { q?: string; c?: string; f?: boolean }) => {
    const p: Record<string, string> = {};
    const qq = (o.q ?? texto).trim();
    const cc = o.c ?? cat;
    const ff = o.f ?? acabar;
    if (qq) p.q = qq;
    if (cc) p.c = cc;
    if (ff) p.f = "acabar";
    router.push(`/pecas${Object.keys(p).length ? `?${new URLSearchParams(p)}` : ""}`);
  };
  return (
    <form action="/pecas" className="v-linhabusca" onSubmit={(e) => { e.preventDefault(); ir({}); }} role="search">
      <div className="v-busca">
        <label className="c-procura">
          <Icon name="procurar" size={16} />
          <span className="visually-hidden">Procurar peça</span>
          <input name="q" type="search" placeholder="Procurar peça" value={texto} onChange={(e) => setTexto(e.target.value)} />
        </label>
        <label style={{ display: "contents" }}>
          <span className="visually-hidden">Tipo de peça</span>
          <select name="c" className="select" value={cat} onChange={(e) => ir({ c: e.target.value })}>
            <option value="">Tudo</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </label>
      </div>
      <label className="v-check">
        <input type="checkbox" name="f" value="acabar" checked={acabar} onChange={(e) => ir({ f: e.target.checked })} />
        Só a acabar
      </label>
    </form>
  );
}
