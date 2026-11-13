import { describe, expect, it } from "vitest";
import { inicioSemana, mt, parseMT, somarDias, diaLongo, inicioDiaUtc } from "./format";

describe("valores", () => {
  it("formata meticais com ponto de milhares", () => {
    expect(mt(12500)).toBe("12.500 MT");
    expect(mt("400.00")).toBe("400 MT");
    expect(mt(1234567.5)).toBe("1.234.567,50 MT");
  });
  it("lê valores escritos", () => {
    expect(parseMT("2500")).toBe(2500);
    expect(parseMT("2.500")).toBe(2500);
    expect(parseMT("2 500,50")).toBe(2500.5);
    expect(parseMT("abc")).toBeNull();
  });
});

describe("datas de Maputo", () => {
  it("calcula a semana de segunda a sábado", () => {
    expect(inicioSemana("2026-11-13")).toBe("2026-11-09");
    expect(inicioSemana("2026-11-15")).toBe("2026-11-09");
    expect(somarDias("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("escreve o dia por extenso", () => {
    expect(diaLongo("2026-11-13")).toBe("Sexta, 13 de Novembro");
  });
  it("converte o início do dia para UTC", () => {
    expect(inicioDiaUtc("2026-11-13")).toBe("2026-11-12T22:00:00.000Z");
  });
});
