"use client";

import { useState } from "react";
import Icon from "./Icon";
import { ActionForm, SubmitButton } from "./forms";
import { guardarPeca } from "@/app/actions/stock";
import { corHex } from "@/lib/cores";
import { fotoUrl } from "@/lib/supabase/config";
import type { Lista } from "@/lib/catalogo";

type Inicial = { id?: string; nome?: string; categoria_id?: string; preco?: number; minimo?: number; foto?: string | null; activo?: boolean; cores?: string[]; tamanhos?: string[] };

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
  const [cat, setCat] = useState(inicial.categoria_id ?? "");
  const catNome = categorias.find((c) => c.id === cat)?.nome.toLowerCase() ?? "";
  const letras = tamanhos.filter((t) => !/^\d/.test(t.nome));
  const numeros = tamanhos.filter((t) => /^\d/.test(t.nome));
  const mostrarLetras = !catNome.includes("sapat") && !catNome.includes("bols");
  const mostrarNumeros = !catNome.includes("roup") && !catNome.includes("bols");

  async function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const pequena = await reduzir(f);
    const dt = new DataTransfer();
    dt.items.add(pequena);
    e.target.files = dt.files;
    setPreview(URL.createObjectURL(pequena));
  }

  return (
    <ActionForm action={guardarPeca} className="stack-md">
      {inicial.id ? <input type="hidden" name="id" value={inicial.id} /> : null}
      <label className="c-fotobox">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Foto da peça" />
        ) : (
          <Icon name="camara" size={44} stroke={1.8} />
        )}
        {preview ? "Mudar a foto" : "Tirar foto da peça"}
        <input type="file" name="foto" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={escolher} />
      </label>
      <div className="field">
        <label className="label" htmlFor="nome">Nome da peça</label>
        <input id="nome" name="nome" className="input" required maxLength={120} defaultValue={inicial.nome} placeholder="Ex.: Sandália Salto Fino" />
      </div>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }} className="stack-md">
        <legend className="c-rot" style={{ marginBottom: 8 }}>Que tipo de peça?</legend>
        <div className="c-chips">
          {categorias.map((c) => (
            <label key={c.id} className="c-etiqueta" style={{ minHeight: 56, padding: "0 18px" }}>
              <input type="radio" name="categoria" value={c.id} required checked={cat === c.id} onChange={() => setCat(c.id)} />
              {c.nome}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="inline" style={{ alignItems: "flex-start" }}>
        <div className="field" style={{ flex: 2, minWidth: 160 }}>
          <label className="label" htmlFor="preco">Preço (MT)</label>
          <input id="preco" name="preco" className="input" inputMode="decimal" required defaultValue={inicial.preco ?? ""} placeholder="Ex.: 2500" />
        </div>
        <div className="field" style={{ flex: 1, minWidth: 120 }}>
          <label className="label" htmlFor="minimo">Avisar quando restarem</label>
          <input id="minimo" name="minimo" className="input" type="number" min={0} max={999} defaultValue={inicial.minimo ?? 1} />
        </div>
      </div>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }} className="stack-md">
        <legend className="c-rot" style={{ marginBottom: 8 }}>Cores (deixe vazio se não tiver)</legend>
        <div className="c-chips">
          {cores.map((c) => (
            <label key={c.id} className="c-etiqueta">
              <input type="checkbox" name="cor" value={c.id} defaultChecked={inicial.cores?.includes(c.id)} />
              <span className="c-bolinha" style={{ background: corHex(c.nome) }} />
              {c.nome}
            </label>
          ))}
        </div>
        <input name="novaCor" className="input" maxLength={80} placeholder="Outra cor? Escreva aqui (ex.: Dourado)" aria-label="Outra cor" />
      </fieldset>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }} className="stack-md">
        <legend className="c-rot" style={{ marginBottom: 8 }}>Números ou tamanhos (deixe vazio se não tiver)</legend>
        {mostrarNumeros && numeros.length ? (
          <div className="c-chips">
            {numeros.map((t) => (
              <label key={t.id} className="c-etiqueta" style={{ minWidth: 56, justifyContent: "center" }}>
                <input type="checkbox" name="tamanho" value={t.id} defaultChecked={inicial.tamanhos?.includes(t.id)} />
                {t.nome}
              </label>
            ))}
          </div>
        ) : null}
        {mostrarLetras && letras.length ? (
          <div className="c-chips">
            {letras.map((t) => (
              <label key={t.id} className="c-etiqueta" style={{ minWidth: 56, justifyContent: "center" }}>
                <input type="checkbox" name="tamanho" value={t.id} defaultChecked={inicial.tamanhos?.includes(t.id)} />
                {t.nome}
              </label>
            ))}
          </div>
        ) : null}
        <input name="novoTamanho" className="input" maxLength={80} placeholder="Outro número ou tamanho? (ex.: 43)" aria-label="Outro número ou tamanho" />
      </fieldset>
      {inicial.id ? (
        <label className="c-etiqueta" style={{ alignSelf: "flex-start" }}>
          <input type="checkbox" name="activo" value="1" defaultChecked={inicial.activo !== false} />
          À venda
        </label>
      ) : null}
      {inicial.id ? <input type="hidden" name="activo" value="0" /> : null}
      <SubmitButton className="c-cta" pendingText="A guardar…">
        <Icon name="certo" /> Guardar peça
      </SubmitButton>
    </ActionForm>
  );
}
