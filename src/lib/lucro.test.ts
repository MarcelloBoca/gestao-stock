import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("lucroEstimado", async () => {
  const { lucroEstimado } = await import("./catalogo");
  const peca = (id: string, custo: number | null) => ({ id, custo }) as never;

  it("tira o custo das peças vendidas e conta as que não têm custo", () => {
    const r = lucroEstimado(
      [{ id: "a", quantidade: 2, total: 5000 }, { id: "b", quantidade: 1, total: 1900 }, { id: "c", quantidade: 1, total: 800 }],
      [peca("a", 1300), peca("b", 950), peca("c", null)],
    );
    expect(r).toEqual({ lucro: 5000 - 2600 + 1900 - 950, semCusto: 1, comCusto: 2 });
  });
});
