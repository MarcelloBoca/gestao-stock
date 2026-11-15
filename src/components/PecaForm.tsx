"use client";

import { useMemo, useRef, useState } from "react";
import Icon from "./Icon";
import { ActionForm, SubmitButton } from "./forms";
import { guardarPeca } from "@/app/actions/stock";
import { corHex } from "@/lib/cores";
import { fotoUrl } from "@/lib/supabase/config";
import type { Lista } from "@/lib/catalogo";

type Inicial = { id?: string; nome?: string; categoria_id?: string; preco?: number; custo?: number | null; minimo?: number; foto?: string | null; activo?: boolean; cores?: string[]; tamanhos?: string[] };

/** As quatro cores mais usadas ficam sempre à mão; as outras procuram-se. */
const FIXAS = ["Preto", "Branco", "Nude", "Castanho"];
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Reduz a foto no telemóvel antes de enviar (fotos de câmara têm muitas vezes mais de 5 MB). */
async function reduzir(file: File, max = 1200): Promise<File> {
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * k);
    canvas.height = Math.round(bmp.height * k);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    return blob ? new File([blob], "foto.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

export default function PecaForm({ inicial = {}, categorias, cores, tamanhos }: { inicial?: Inicial; categorias: Lista[]; cores: Lista[]; tamanhos: Lista[] }) {
  const [preview, setPreview] = useState<string | null>(fotoUrl(inicial.foto));
  const fotoRef = useRef<HTMLInputElement>(null);
  const [nome, setNome] = useState(inicial.nome ?? "");
  const [preco, setPreco] = useState(inicial.preco ? String(inicial.preco) : "");
  const [custo, setCusto] = useState(inicial.custo !== null && inicial.custo !== undefined ? String(inicial.custo) : "");
  const [cat, setCat] = useState(inicial.categoria_id ?? categorias[0]?.id ?? "");
  const porNome = useMemo(() => new Map(cores.map((c) => [norm(c.nome), c])), [cores]);
  const [escolhidas, setEscolhidas] = useState<string[]>(() => {
    const ini = (inicial.cores ?? []).map((id) => cores.find((c) => c.id === id)?.nome).filter(Boolean) as string[];
    return inicial.id ? ini : ini.length ? ini : ["Preto"];
  });
  const [busca, setBusca] = useState("");
  const catNome = categorias.find((c) => c.id === cat)?.nome.toLowerCase() ?? "";
  const unico = catNome.includes("bols") || catNome.includes("acess");
  const sapatos = catNome.includes("sapat") || catNome.includes("calç") || catNome.includes("calc");
  const doTipo = (nomeCat: string) => {
    const n = nomeCat.toLowerCase();
    if (n.includes("bols") || n.includes("acess")) return [] as Lista[];
    const sap = n.includes("sapat") || n.includes("calç") || n.includes("calc");
    return tamanhos.filter((t) => (sap ? /^\d/.test(t.nome) : !/^\d/.test(t.nome)));
  };
  const padrao = (nomeCat: string) => {
    const l = doTipo(nomeCat);
    const nums = l.filter((t) => /^\d+$/.test(t.nome) && Number(t.nome) >= 35 && Number(t.nome) <= 42);
    const letras = l.filter((t) => ["P", "M", "G"].includes(t.nome.toUpperCase()));
    return new Set((nums.length ? nums : letras).map((t) => t.id));
  };
  const [tams, setTams] = useState<Set<string>>(() => (inicial.id ? new Set(inicial.tamanhos ?? []) : padrao(catNome)));
  const base = doTipo(catNome);
  // Ao editar, os números que a peça já tem aparecem sempre, mesmo que sejam de outro tipo.
  const opcoes = tamanhos.filter((t) => base.some((b) => b.id === t.id) || tams.has(t.id));
  const [tentou, setTentou] = useState(false);

  const visiveis = [...FIXAS, ...escolhidas.filter((c) => !FIXAS.some((f) => norm(f) === norm(c)))];
  const escolhida = (c: string) => escolhidas.some((x) => norm(x) === norm(c));
  const alternar = (c: string) => setEscolhidas((l) => (l.some((x) => norm(x) === norm(c)) ? l.filter((x) => norm(x) !== norm(c)) : [...l, c]));
  const juntar = (c: string) => {
    const n = c.trim();
    if (!n) return;
    const existente = porNome.get(norm(n))?.nome ?? n.charAt(0).toUpperCase() + n.slice(1);
    setEscolhidas((l) => (l.some((x) => norm(x) === norm(existente)) ? l : [...l, existente]));
    setBusca("");
  };
  const q = norm(busca);
  const achadas = q ? cores.filter((c) => norm(c.nome).includes(q)).slice(0, 5) : [];
  const exacta = q && [...cores.map((c) => c.nome), ...escolhidas].some((c) => norm(c) === q);

  const ids = escolhidas.map((c) => porNome.get(norm(c))?.id).filter(Boolean) as string[];
  const novas = escolhidas.filter((c) => !porNome.has(norm(c)));
  const nTams = opcoes.filter((t) => tams.has(t.id)).length;
  const todos = opcoes.length > 0 && nTams === opcoes.length;

  const num = (t: string) => { const n = Number(t.replace(/\s/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".")); return t.trim() && Number.isFinite(n) ? n : null; };
  const pv = num(preco), cv = num(custo);
  const margem = pv && cv !== null && pv > 0 ? { valor: pv - cv, texto: `${String(Math.round(pv - cv)).replace(/\B(?=(\d{3})+(?!\d))/g, ".")} MT`, pct: Math.round(((pv - cv) / pv) * 100) } : null;
  const falta: string[] = [];
  if (!nome.trim()) falta.push("o nome");
  if (!(Number(preco.replace(/[^\d.,]/g, "").replace(",", ".")) > 0)) falta.push("o preço");
  if (!cat) falta.push("o tipo de peça");
  const lista = (a: string[]) => (a.length > 1 ? `${a.slice(0, -1).join(", ")} e ${a[a.length - 1]}` : a[0]);

  // A câmara e a galeria são dois botões; a foto escolhida vai sempre para o mesmo campo "foto".
  async function escolherFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !fotoRef.current) return;
    const pequena = await reduzir(f);
    const dt = new DataTransfer();
    dt.items.add(pequena);
    fotoRef.current.files = dt.files;
    setPreview(URL.createObjectURL(pequena));
  }

  return (
    <ActionForm action={guardarPeca} className="v-pilha">
      {inicial.id ? <input type="hidden" name="id" value={inicial.id} /> : null}
      {ids.map((id) => <input key={id} type="hidden" name="cor" value={id} />)}
      <input type="hidden" name="novaCor" value={novas.join(", ")} />
      {tamanhos.filter((t) => tams.has(t.id)).map((t) => <input key={t.id} type="hidden" name="tamanho" value={t.id} />)}
      <input type="hidden" name="categoria" value={cat} />

      <div className="v-colunas">
        <div className="v-pilha">
          <section aria-labelledby="h-dados" className="v-sec">
            <div className="v-sec-h"><h2 id="h-dados">Dados da peça</h2></div>
            <div className="field">
              <span className="label">Foto da peça</span>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ width: 72, height: 72, flex: "none", borderRadius: 12, overflow: "hidden", background: "var(--rosa-claro)", color: "#a9849b", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt="Foto escolhida" style={{ width: 72, height: 72, objectFit: "cover" }} />
                  ) : (
                    <Icon name="camara" size={24} stroke={1.6} />
                  )}
                </span>
                <div style={{ flex: 1, minWidth: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
                  <label className="btn" style={{ position: "relative", cursor: "pointer" }}>
                    <Icon name="camara" size={16} /> Tirar foto
                    <input type="file" accept="image/*" capture="environment" onChange={escolherFoto} className="v-ficheiro" />
                  </label>
                  <label className="btn" style={{ position: "relative", cursor: "pointer" }}>
                    <Icon name="grelha" size={16} /> Da galeria
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={escolherFoto} className="v-ficheiro" />
                  </label>
                </div>
              </div>
              <input ref={fotoRef} type="file" name="foto" hidden tabIndex={-1} aria-hidden="true" />
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
              <div className="field" style={{ flex: 1, minWidth: 0 }}>
                <label className="label" htmlFor="nome">Nome da peça</label>
                <input id="nome" name="nome" className="input" required maxLength={120} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Sandália Rasteira"
                  aria-invalid={tentou && !nome.trim() ? true : undefined} style={tentou && !nome.trim() ? { borderColor: "var(--porpagar)" } : undefined} />
              </div>
            </div>
            <div className="field">
              <label className="label" htmlFor="categoria">Categoria</label>
              <select id="categoria" className="select" value={cat} onChange={(e) => {
                const id = e.target.value;
                setCat(id);
                if (!inicial.id) setTams(padrao(categorias.find((c) => c.id === id)?.nome ?? ""));
              }}>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          </section>
          <section aria-labelledby="h-preco" className="v-sec">
            <div className="v-sec-h"><h2 id="h-preco">Preço</h2></div>
            <div className="v-dois">
              <div className="field">
                <label className="label" htmlFor="preco">Preço de venda (MT)</label>
                <input id="preco" name="preco" className="input" inputMode="decimal" required value={preco} onChange={(e) => setPreco(e.target.value)} placeholder="0"
                  aria-invalid={tentou && falta.includes("o preço") ? true : undefined} style={tentou && falta.includes("o preço") ? { borderColor: "var(--porpagar)" } : undefined} />
              </div>
              <div className="field">
                <label className="label" htmlFor="custo">Custo (MT)</label>
                <input id="custo" name="custo" className="input" inputMode="decimal" value={custo} onChange={(e) => setCusto(e.target.value)} placeholder="0" />
              </div>
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: margem === null ? "var(--fraco)" : margem.valor > 0 ? "var(--paga)" : "var(--porpagar)" }}>
              {margem === null ? "Escreva o preço e o custo para ver a margem (serve para o lucro estimado)." : margem.valor > 0 ? `Margem: ${margem.texto} por peça (${margem.pct}%)` : "O custo é igual ou maior que o preço de venda."}
            </span>
            <div className="field" style={{ maxWidth: 220 }}>
              <label className="label" htmlFor="minimo">Avisar quando restarem</label>
              <input id="minimo" name="minimo" className="input" type="number" min={0} max={999} defaultValue={inicial.minimo ?? 1} />
            </div>
          </section>
        </div>
        <div className="v-pilha">
          <section aria-labelledby="h-cores" className="v-sec">
            <div className="v-sec-h"><h2 id="h-cores">Cores</h2><span className="muted" style={{ fontSize: 14 }}>{escolhidas.length ? (escolhidas.length === 1 ? "1 cor" : `${escolhidas.length} cores`) : "sem cor"}</span></div>
            <div role="group" aria-label="Cores" className="v-cores" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))" }}>
              {visiveis.map((c) => (
                <button key={c} type="button" className="v-cor" aria-pressed={escolhida(c)} onClick={() => alternar(c)}>
                  <span className="bola" style={{ background: corHex(c) }} />
                  <span className="nome">{c}</span>
                  {escolhida(c) ? <span style={{ color: "var(--rosa-texto)", display: "flex" }}><Icon name="certo" size={14} stroke={2.4} /></span> : null}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="c-procura">
                <Icon name="procurar" size={16} />
                <span className="visually-hidden">Procurar outra cor</span>
                <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Procurar outra cor"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); juntar(achadas[0]?.nome ?? busca); } }} />
              </label>
              {q ? (
                <div role="listbox" aria-label="Cores encontradas" style={{ border: "1px solid var(--linha)", borderRadius: 10, overflow: "hidden" }}>
                  {achadas.map((c) => (
                    <button key={c.id} type="button" role="option" aria-selected={escolhida(c.nome)} className="v-row" onClick={() => juntar(c.nome)}
                      style={{ width: "100%", minHeight: 44, padding: "0 12px", border: 0, borderBottom: "1px solid var(--linha)", background: "#fff", font: "inherit", cursor: "pointer", textAlign: "left" }}>
                      <span className="c-bolinha" style={{ background: corHex(c.nome), width: 16, height: 16 }} />
                      <span className="v-row-m">{c.nome}</span>
                      <span className="v-link">{escolhida(c.nome) ? "Já escolhida" : "Juntar"}</span>
                    </button>
                  ))}
                  {!exacta ? (
                    <button type="button" className="v-row" onClick={() => juntar(busca)}
                      style={{ width: "100%", minHeight: 44, padding: "0 12px", border: 0, background: "#fff", font: "inherit", cursor: "pointer", textAlign: "left" }}>
                      <Icon name="mais" size={16} />
                      <span className="v-row-m">Juntar “{busca.trim()}”</span>
                      <span className="v-link">Nova cor</span>
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>
          <section aria-labelledby="h-nums" className="v-sec">
            <div className="v-sec-h">
              <h2 id="h-nums">{sapatos ? "Números" : unico ? "Tamanho" : "Tamanhos"}</h2>
              {opcoes.length > 1 ? (
                <button type="button" className="btn btn-text btn-sm" onClick={() => setTams((s) => { const n = new Set(s); opcoes.forEach((t) => (todos ? n.delete(t.id) : n.add(t.id))); return n; })}>
                  {todos ? "Tirar todos" : "Marcar todos"}
                </button>
              ) : null}
            </div>
            {opcoes.length ? (
              <div role="group" aria-label="Números ou tamanhos" className="c-opts" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(60px, 1fr))" }}>
                {opcoes.map((t) => (
                  <button key={t.id} type="button" className="c-opt" aria-pressed={tams.has(t.id)} onClick={() => setTams((s) => { const n = new Set(s); if (n.has(t.id)) n.delete(t.id); else n.add(t.id); return n; })}>
                    {t.nome}
                  </button>
                ))}
              </div>
            ) : null}
            <p className="hint">{unico && !opcoes.length ? "Esta categoria tem tamanho único." : nTams === 0 ? "Nenhum escolhido: a peça fica sem número." : `${nTams} de ${opcoes.length} escolhidos`}</p>
            {!unico ? <input name="novoTamanho" className="input" maxLength={80} placeholder={sapatos ? "Outro número? (ex.: 43)" : "Outro tamanho? (ex.: XL)"} aria-label="Outro número ou tamanho" /> : null}
          </section>
        </div>
      </div>

      <div className="v-sec" style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", padding: "12px 16px" }}>
        {inicial.id ? (
          <label className="v-check" style={{ flex: "1 1 auto" }}>
            <input type="checkbox" name="activo" value="1" defaultChecked={inicial.activo !== false} />
            À venda
          </label>
        ) : (
          <span role={tentou && falta.length ? "alert" : "status"} style={{ flex: "1 1 220px", fontSize: 14, fontWeight: 600, color: !falta.length ? "var(--paga)" : tentou ? "var(--porpagar)" : "var(--fraco)" }}>
            {!falta.length ? "Tudo pronto. O stock começa a zero." : `${tentou ? "Falta" : "Preencha"} ${lista(falta)}.`}
          </span>
        )}
        {inicial.id ? <input type="hidden" name="activo" value="0" /> : null}
        <span onClickCapture={() => setTentou(true)} style={{ flex: "1 1 220px", display: "flex" }}>
          <SubmitButton className="btn btn-primary" pendingText="A guardar…">
            <Icon name="certo" size={16} /> Guardar peça
          </SubmitButton>
        </span>
      </div>
    </ActionForm>
  );
}
