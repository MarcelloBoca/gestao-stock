import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
process.env.PIN_SECRET = "teste-0123456789-0123456789-0123456789";

describe("pin", async () => {
  const { pinFraco, pinValido, senhaDoPin } = await import("./pin");

  it("aceita só 4 números", () => {
    expect(pinValido("2580")).toBe(true);
    expect(pinValido("258")).toBe(false);
    expect(pinValido("25a0")).toBe(false);
  });

  it("recusa PINs fáceis", () => {
    for (const p of ["0000", "1111", "1234", "4321", "6789"]) expect(pinFraco(p)).toBe(true);
    for (const p of ["2580", "1357", "9024"]) expect(pinFraco(p)).toBe(false);
  });

  it("deriva sempre a mesma palavra-passe, diferente por pessoa e por PIN", () => {
    const a = senhaDoPin("ines", "2580");
    expect(senhaDoPin("Ines ", "2580")).toBe(a);
    expect(senhaDoPin("rute", "2580")).not.toBe(a);
    expect(senhaDoPin("ines", "2581")).not.toBe(a);
    expect(a).toMatch(/^Pin\.[A-Za-z0-9_-]{43}$/);
  });
});
