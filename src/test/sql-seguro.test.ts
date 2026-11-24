import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Pela API do Supabase (PostgREST) as funções correm com a extensão pg-safeupdate,
 * que recusa DELETE/UPDATE sem WHERE (erro 21000). No editor SQL isto não acontece,
 * por isso o erro só aparecia na aplicação. Este teste lê as migrações e verifica a
 * versão mais recente de cada função.
 */
const PASTA = join(process.cwd(), "supabase", "migrations");

function semComentarios(sql: string) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ");
}

/** nome da função -> { ficheiro, corpo } da última migração que a define. */
function funcoesActuais() {
  const fns = new Map<string, { ficheiro: string; corpo: string }>();
  const re = /create\s+(?:or\s+replace\s+)?function\s+([\w.]+)\s*\([\s\S]*?\bas\s+(\$\w*\$)([\s\S]*?)\2/gi;
  for (const ficheiro of readdirSync(PASTA).filter((f) => f.endsWith(".sql")).sort()) {
    const sql = semComentarios(readFileSync(join(PASTA, ficheiro), "utf8"));
    for (const m of sql.matchAll(re)) fns.set(m[1].toLowerCase(), { ficheiro, corpo: m[3] });
  }
  return fns;
}

/** Instruções DELETE/UPDATE sem WHERE dentro de um corpo de função. */
export function semWhere(corpo: string): string[] {
  return corpo
    .split(";")
    .map((s) => s.replace(/\s+/g, " ").trim())
    .map((s) => s.replace(/^.*?\b(then|else|loop|begin)\b\s+(?=(delete|update)\b)/i, ""))
    .filter((s) => /^(delete\s+from|update)\b/i.test(s) && !/\bwhere\b/i.test(s));
}

describe("SQL seguro para a API do Supabase", () => {
  const fns = funcoesActuais();

  it("o detector apanha o erro antigo e aceita a correcção", () => {
    expect(semWhere("begin delete from _linhas; end")).toEqual(["delete from _linhas"]);
    expect(semWhere("begin delete from _linhas where true; end")).toEqual([]);
    expect(semWhere("if x then update t set a = 1; end if;")).toEqual(["update t set a = 1"]);
    expect(semWhere("update t set a = 1\n  where id = p_id;")).toEqual([]);
  });

  it("encontra a função registar_venda nas migrações", () => {
    expect(fns.has("public.registar_venda")).toBe(true);
  });

  it("registar_venda limpa o cesto temporário com WHERE", () => {
    const { corpo } = fns.get("public.registar_venda")!;
    expect(semWhere(corpo)).toEqual([]);
    expect(corpo).toMatch(/delete\s+from\s+_linhas\s+where\s+true/i);
  });

  it("nenhuma função actual tem DELETE/UPDATE sem WHERE", () => {
    const problemas = [...fns].flatMap(([nome, { ficheiro, corpo }]) => semWhere(corpo).map((s) => `${nome} (${ficheiro}): ${s}`));
    expect(problemas).toEqual([]);
  });
});
