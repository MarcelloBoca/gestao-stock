import { readFile } from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import { GESTAO, requireUser } from "@/lib/auth";
import { catalogo, lucroEstimado } from "@/lib/catalogo";
import { diaCurto, diaIso, hora, mt, somarDias } from "@/lib/format";
import { lerPeriodo } from "@/lib/periodo";
import { FORMAS } from "@/lib/types";
import { listarVendas, relatorio } from "@/lib/vendas";

export const dynamic = "force-dynamic";

const A4 = { w: 595.28, h: 841.89 };
const M = 44;
const AMEIXA = rgb(0x2b / 255, 0x1c / 255, 0x27 / 255);
const ROSA = rgb(0x8e / 255, 0x2f / 255, 0x6b / 255);
const ROSA_CLARO = rgb(0xf6 / 255, 0xe6 / 255, 0xef / 255);
const SUAVE = rgb(0x5f / 255, 0x4e / 255, 0x59 / 255);
const LINHA = rgb(0xec / 255, 0xe3 / 255, 0xe8 / 255);
const FUNDO = rgb(0xf7 / 255, 0xf2 / 255, 0xf5 / 255);
const DIA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** As fontes padrão do PDF só têm o alfabeto latino (WinAnsi): troca o que não cabe. */
const t = (s: string) =>
  String(s ?? "")
    .replace(/[   ]/g, " ")
    .replace(/[−‐‑]/g, "-")
    .replace(/[^\x20-\x7e¡-ÿ–—‘’“”…€]/g, "");

class Folha {
  doc: PDFDocument; f: PDFFont; b: PDFFont; page!: PDFPage; y = 0; n = 0;
  constructor(doc: PDFDocument, f: PDFFont, b: PDFFont, private rodape: string) { this.doc = doc; this.f = f; this.b = b; this.nova(); }
  nova() {
    this.page = this.doc.addPage([A4.w, A4.h]);
    this.n += 1;
    this.y = A4.h - M;
    this.page.drawText(t(this.rodape), { x: M, y: 24, size: 8, font: this.f, color: SUAVE });
    this.page.drawText(`Página ${this.n}`, { x: A4.w - M - 40, y: 24, size: 8, font: this.f, color: SUAVE });
  }
  espaco(h: number) { if (this.y - h < 48) this.nova(); }
  texto(s: string, o: { x?: number; size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; dir?: boolean; w?: number } = {}) {
    const size = o.size ?? 10;
    const font = o.bold ? this.b : this.f;
    let txt = t(s);
    const max = o.w ?? A4.w - 2 * M;
    while (txt.length > 1 && font.widthOfTextAtSize(txt, size) > max) txt = txt.slice(0, -2) + "…";
    const x = o.dir ? (o.x ?? A4.w - M) - font.widthOfTextAtSize(txt, size) : o.x ?? M;
    this.page.drawText(txt, { x, y: this.y, size, font, color: o.color ?? AMEIXA });
  }
  titulo(s: string) {
    this.espaco(110);
    this.y -= 18;
    this.texto(s, { size: 13, bold: true });
    this.y -= 8;
    this.page.drawLine({ start: { x: M, y: this.y }, end: { x: A4.w - M, y: this.y }, thickness: 0.8, color: LINHA });
    this.y -= 14;
  }
  /** Tabela simples: colunas com largura e alinhamento; barra opcional com a percentagem da linha. */
  tabela(cols: { t: string; w: number; dir?: boolean }[], linhas: string[][], barras?: number[]) {
    const x0 = M;
    this.espaco(30);
    let x = x0;
    cols.forEach((c) => { this.texto(c.t, { x: c.dir ? x + c.w : x, size: 8.5, bold: true, color: SUAVE, dir: c.dir, w: c.w }); x += c.w; });
    this.y -= 17;
    linhas.forEach((l, i) => {
      this.espaco(barras ? 28 : 20);
      x = x0;
      l.forEach((v, j) => { this.texto(v, { x: cols[j].dir ? x + cols[j].w : x, size: 9.5, dir: cols[j].dir, w: cols[j].w - 6 }); x += cols[j].w; });
      if (barras) {
        const larg = A4.w - 2 * M;
        this.page.drawRectangle({ x: x0, y: this.y - 10, width: larg, height: 3, color: LINHA });
        this.page.drawRectangle({ x: x0, y: this.y - 10, width: Math.max(1, larg * Math.min(1, barras[i] ?? 0)), height: 3, color: ROSA });
        this.y -= 26;
      } else {
        this.y -= 7;
        this.page.drawLine({ start: { x: x0, y: this.y + 1 }, end: { x: A4.w - M, y: this.y + 1 }, thickness: 0.4, color: LINHA });
        this.y -= 11;
      }
    });
    if (!linhas.length) { this.texto("Sem dados neste período.", { size: 9.5, color: SUAVE }); this.y -= 14; }
  }
}

const dataLonga = (d: string) => `${Number(d.slice(8))} de ${MES[Number(d.slice(5, 7)) - 1]} de ${d.slice(0, 4)}`;

/** Exportar o relatório de vendas do período escolhido em PDF (gestora e administradora). */
export async function GET(req: Request) {
  const { sb, user } = await requireUser(GESTAO);
  const sp = Object.fromEntries(new URL(req.url).searchParams.entries());
  const periodo = lerPeriodo(sp);
  const [rel, vendas, cat] = await Promise.all([
    relatorio(sb, periodo.de, periodo.ate),
    listarVendas(sb, periodo.de, periodo.ate, { limite: 5000 }),
    catalogo(sb),
  ]);
  const validas = vendas.filter((v) => v.estado !== "anulada");
  const anuladas = vendas.length - validas.length;
  const pecas = rel.por_produto.reduce((s, p) => s + p.quantidade, 0);
  const lucro = lucroEstimado(rel.por_produto, cat.pecas);

  const doc = await PDFDocument.create();
  doc.setTitle(t(`Relatório de vendas Sola.chic, ${periodo.texto}`));
  doc.setAuthor("Sola.chic");
  const f = await doc.embedFont(StandardFonts.Helvetica);
  const b = await doc.embedFont(StandardFonts.HelveticaBold);
  let logo: PDFImage | null = null;
  try { logo = await doc.embedPng(await readFile(path.join(process.cwd(), "public", "logo-solachic.png"))); } catch { logo = null; }
  const agora = new Date();
  const folha = new Folha(doc, f, b, `Sola.chic · Relatório de vendas · ${periodo.texto} · Gerado a ${diaCurto(diaIso(agora))} às ${hora(agora.toISOString())} por ${user.nome}`);

  // Cabeçalho
  if (logo) folha.page.drawImage(logo, { x: M, y: folha.y - 64, width: 64, height: 64 });
  const xt = logo ? M + 78 : M;
  folha.y -= 20;
  folha.texto("Relatório de vendas", { x: xt, size: 20, bold: true });
  folha.y -= 20;
  const intervalo = periodo.de === periodo.ate ? dataLonga(periodo.de) : `${dataLonga(periodo.de)} a ${dataLonga(periodo.ate)}`;
  folha.texto(intervalo, { x: xt, size: 11, color: SUAVE });
  folha.y -= 15;
  folha.texto(`${periodo.dias === 1 ? "1 dia" : `${periodo.dias} dias`}. Gerado a ${diaCurto(diaIso(agora))} às ${hora(agora.toISOString())} por ${user.nome}.`, { x: xt, size: 9, color: SUAVE });
  folha.y -= 34;

  // Números principais
  const caixas: [string, string, string][] = [
    ["Total vendido", mt(rel.total), `${rel.vendas} ${rel.vendas === 1 ? "venda" : "vendas"}`],
    ["Peças vendidas", String(pecas), "unidades"],
    ["Lucro estimado", lucro.comCusto || !lucro.semCusto ? mt(lucro.lucro) : "—", lucro.semCusto ? `${lucro.semCusto} peça(s) sem custo` : "preço menos custo"],
    ["Anuladas", String(anuladas), "não contam no total"],
  ];
  const cw = (A4.w - 2 * M - 3 * 8) / 4;
  caixas.forEach(([k, v, s], i) => {
    const x = M + i * (cw + 8);
    const destaque = i === 0;
    folha.page.drawRectangle({ x, y: folha.y - 46, width: cw, height: 62, color: destaque ? AMEIXA : FUNDO });
    const cor = destaque ? rgb(1, 1, 1) : AMEIXA;
    const sub = destaque ? rgb(0.91, 0.85, 0.89) : SUAVE;
    folha.page.drawText(t(k), { x: x + 10, y: folha.y, size: 8.5, font: f, color: sub });
    let val = t(v);
    let size = 15;
    while (b.widthOfTextAtSize(val, size) > cw - 20 && size > 9) size -= 1;
    folha.page.drawText(val, { x: x + 10, y: folha.y - 20, size, font: b, color: cor });
    let ss = t(s);
    while (ss.length > 1 && f.widthOfTextAtSize(ss, 7.5) > cw - 20) ss = ss.slice(0, -2) + "…";
    folha.page.drawText(ss, { x: x + 10, y: folha.y - 36, size: 7.5, font: f, color: sub });
  });
  folha.y -= 66;

  // Vendido por dia (ou por mês em períodos longos)
  const porDia = new Map<string, { n: number; total: number }>();
  for (const v of validas) {
    const d = diaIso(new Date(v.criada_em));
    const x = porDia.get(d) ?? { n: 0, total: 0 };
    x.n += 1; x.total += v.total;
    porDia.set(d, x);
  }
  const dias: string[] = [];
  for (let d = periodo.de; d <= periodo.ate; d = somarDias(d, 1)) dias.push(d);
  let linhasTempo: { l: string; n: number; total: number }[];
  let tituloTempo = "Vendido por dia";
  if (dias.length === 1) {
    tituloTempo = "Vendido por hora";
    const h = new Map<number, { n: number; total: number }>();
    for (const v of validas) {
      const k = Number(hora(v.criada_em).slice(0, 2));
      const x = h.get(k) ?? { n: 0, total: 0 };
      x.n += 1; x.total += v.total;
      h.set(k, x);
    }
    linhasTempo = Array.from(h.entries()).sort((a, b) => a[0] - b[0]).map(([k, x]) => ({ l: `${String(k).padStart(2, "0")}:00 às ${String(k + 1).padStart(2, "0")}:00`, ...x }));
  } else if (dias.length > 62) {
    tituloTempo = "Vendido por mês";
    const m = new Map<string, { n: number; total: number }>();
    for (const d of dias) {
      const k = d.slice(0, 7);
      const x = m.get(k) ?? { n: 0, total: 0 };
      const y = porDia.get(d);
      if (y) { x.n += y.n; x.total += y.total; }
      m.set(k, x);
    }
    linhasTempo = Array.from(m.entries()).map(([k, x]) => ({ l: `${MES[Number(k.slice(5)) - 1]} de ${k.slice(0, 4)}`, ...x }));
  } else {
    linhasTempo = dias.map((d) => ({ l: `${DIA[new Date(d + "T12:00:00Z").getUTCDay()]}, ${diaCurto(d)}`, ...(porDia.get(d) ?? { n: 0, total: 0 }) }));
  }
  if (linhasTempo.length) {
    const max = Math.max(1, ...linhasTempo.map((x) => x.total));
    folha.titulo(tituloTempo);
    folha.tabela(
      [{ t: tituloTempo === "Vendido por hora" ? "Hora" : tituloTempo === "Vendido por mês" ? "Mês" : "Dia", w: 260 }, { t: "Vendas", w: 100, dir: true }, { t: "Vendido", w: A4.w - 2 * M - 360, dir: true }],
      linhasTempo.map((x) => [x.l, String(x.n), mt(x.total)]),
      linhasTempo.map((x) => x.total / max),
    );
  }

  // Peças mais vendidas
  folha.titulo("Peças mais vendidas");
  const custo = new Map(cat.pecas.map((p) => [p.id, p.custo]));
  folha.tabela(
    [{ t: "#", w: 24 }, { t: "Peça", w: 236 }, { t: "Unidades", w: 70, dir: true }, { t: "Vendido", w: 90, dir: true }, { t: "Lucro estimado", w: A4.w - 2 * M - 420, dir: true }],
    rel.por_produto.slice(0, 25).map((p, i) => {
      const c = custo.get(p.id);
      return [String(i + 1), p.nome, String(p.quantidade), mt(p.total), c === null || c === undefined ? "sem custo" : mt(p.total - p.quantidade * c)];
    }),
  );

  // Por vendedora, forma de pagamento e tipo de peça
  const maxV = Math.max(1, ...rel.por_vendedor.map((x) => x.total));
  folha.titulo("Por vendedora");
  folha.tabela(
    [{ t: "Vendedora", w: 260 }, { t: "Vendas", w: 100, dir: true }, { t: "Vendido", w: A4.w - 2 * M - 360, dir: true }],
    rel.por_vendedor.map((x) => [x.nome, String(x.vendas), mt(x.total)]),
    rel.por_vendedor.map((x) => x.total / maxV),
  );
  const formas = FORMAS.map((x) => ({ nome: x.nome, total: rel.por_forma[x.id] ?? 0 })).filter((x) => x.total > 0);
  const maxF = Math.max(1, ...formas.map((x) => x.total));
  folha.titulo("Por forma de pagamento");
  folha.tabela(
    [{ t: "Forma de pagamento", w: 260 }, { t: "% do total", w: 100, dir: true }, { t: "Vendido", w: A4.w - 2 * M - 360, dir: true }],
    formas.map((x) => [x.nome, rel.total ? `${Math.round((x.total / rel.total) * 100)}%` : "0%", mt(x.total)]),
    formas.map((x) => x.total / maxF),
  );
  const maxC = Math.max(1, ...rel.por_categoria.map((x) => x.total));
  folha.titulo("Por tipo de peça");
  folha.tabela(
    [{ t: "Tipo de peça", w: 260 }, { t: "% do total", w: 100, dir: true }, { t: "Vendido", w: A4.w - 2 * M - 360, dir: true }],
    rel.por_categoria.map((x) => [x.nome, rel.total ? `${Math.round((x.total / rel.total) * 100)}%` : "0%", mt(x.total)]),
    rel.por_categoria.map((x) => x.total / maxC),
  );
  if (lucro.semCusto) {
    folha.espaco(30);
    folha.y -= 6;
    folha.page.drawRectangle({ x: M, y: folha.y - 8, width: A4.w - 2 * M, height: 24, color: ROSA_CLARO });
    folha.texto(`O lucro estimado não inclui ${lucro.semCusto} peça(s) vendida(s) sem custo registado.`, { x: M + 8, size: 9, color: ROSA });
    folha.y -= 24;
  }

  const bytes = await doc.save();
  const nome = `relatorio-solachic-${periodo.de}${periodo.de === periodo.ate ? "" : `-a-${periodo.ate}`}.pdf`;
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nome}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
