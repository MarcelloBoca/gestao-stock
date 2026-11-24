import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ supabaseServer: vi.fn() }));

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/auth", async (original) => ({
  ...(await original<typeof import("@/lib/auth")>()),
  requireUser: vi.fn(async () => ({ sb: { rpc }, user: { id: "u1", perfil: "vendedor" } })),
}));

const { registarVenda } = await import("./vendas");
const PECA = "11111111-2222-3333-4444-555555555555";

describe("registarVenda", () => {
  beforeEach(() => {
    rpc.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("envia o cesto à função registar_venda e devolve o id da venda", async () => {
    rpc.mockResolvedValue({ data: "venda-1", error: null });
    const r = await registarVenda("mpesa", [{ variante_id: PECA, quantidade: 2 }], { nome: "  Ana ", contacto: "84 123 4567" });
    expect(r).toEqual({ ok: true, data: { id: "venda-1" } });
    expect(rpc).toHaveBeenCalledWith("registar_venda", {
      p_forma: "mpesa",
      p_linhas: [{ variante_id: PECA, quantidade: 2 }],
      p_cliente_nome: "Ana",
      p_cliente_contacto: "84 123 4567",
    });
  });

  it("sem cliente envia null", async () => {
    rpc.mockResolvedValue({ data: "venda-2", error: null });
    await registarVenda("numerario", [{ variante_id: PECA, quantidade: 1 }]);
    expect(rpc.mock.calls[0][1]).toMatchObject({ p_cliente_nome: null, p_cliente_contacto: null });
  });

  it("recusa forma de pagamento inválida, cesto vazio e contacto incompleto sem chamar a base de dados", async () => {
    expect(await registarVenda("cartao", [{ variante_id: PECA, quantidade: 1 }])).toEqual({ error: "Escolha como o cliente pagou." });
    expect(await registarVenda("mpesa", [])).toEqual({ error: "O cesto está vazio." });
    expect(await registarVenda("mpesa", [{ variante_id: "x", quantidade: 1 }, { variante_id: PECA, quantidade: 0 }])).toEqual({ error: "O cesto está vazio." });
    expect((await registarVenda("mpesa", [{ variante_id: PECA, quantidade: 1 }], { contacto: "84 12" })).error).toMatch(/incompleto/);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("mostra a mensagem de falta de stock vinda da base de dados", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "P0001", message: "STOCK: Vestido azul M — só há 1 na loja." } });
    expect(await registarVenda("mpesa", [{ variante_id: PECA, quantidade: 3 }])).toEqual({ error: "Vestido azul M — só há 1 na loja." });
  });

  it("um erro técnico (ex.: 21000 DELETE sem WHERE) não regista a venda", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "21000", message: "DELETE requires a WHERE clause" } });
    const r = await registarVenda("mpesa", [{ variante_id: PECA, quantidade: 1 }]);
    expect(r).toEqual({ error: "Ocorreu um erro. Tente de novo." });
    expect(r).not.toHaveProperty("ok");
  });
});
