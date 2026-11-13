"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Uma linha do cesto. Fica guardado no aparelho: se a ligação falhar, a venda em curso não se perde. */
export type LinhaCesto = {
  variante_id: string;
  produto_id: string;
  nome: string;
  detalhe: string;
  preco: number;
  quantidade: number;
  foto: string | null;
  categoria: string | null;
};

const KEY = "sola-cesto-v1";
const EVENT = "sola-cesto";
let cache: LinhaCesto[] | null = null;
const VAZIO: LinhaCesto[] = [];

function ler(): LinhaCesto[] {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as LinhaCesto[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}
function gravar(linhas: LinhaCesto[]) {
  cache = linhas;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(linhas));
  } catch {
    /* sem armazenamento: o cesto fica só em memória */
  }
  window.dispatchEvent(new Event(EVENT));
}
function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      cb();
    }
  };
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCesto() {
  const linhas = useSyncExternalStore(subscribe, ler, () => VAZIO);
  const juntar = useCallback((l: Omit<LinhaCesto, "quantidade">, quantidade = 1) => {
    const actual = ler();
    const i = actual.findIndex((x) => x.variante_id === l.variante_id);
    if (i >= 0) gravar(actual.map((x, j) => (j === i ? { ...x, quantidade: x.quantidade + quantidade } : x)));
    else gravar([...actual, { ...l, quantidade }]);
  }, []);
  const mudar = useCallback((variante_id: string, quantidade: number) => {
    const actual = ler();
    gravar(quantidade <= 0 ? actual.filter((x) => x.variante_id !== variante_id) : actual.map((x) => (x.variante_id === variante_id ? { ...x, quantidade } : x)));
  }, []);
  const limpar = useCallback(() => gravar([]), []);
  const pecas = linhas.reduce((s, l) => s + l.quantidade, 0);
  const total = linhas.reduce((s, l) => s + l.quantidade * l.preco, 0);
  return { linhas, juntar, mudar, limpar, pecas, total };
}
