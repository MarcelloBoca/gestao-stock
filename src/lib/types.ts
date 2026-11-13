export type ActionState = { ok?: boolean; error?: string; message?: string; data?: Record<string, unknown> };
export type Perfil = "administrador" | "gestor" | "vendedor";
export type Forma = "numerario" | "mpesa" | "emola" | "transferencia" | "cartao";
export type EstadoVenda = "normal" | "corrigida" | "anulada";

export const FORMAS: { id: Exclude<Forma, "cartao">; nome: string; curto: string; icon: string }[] = [
  { id: "numerario", nome: "Numerário", curto: "Numerário", icon: "dinheiro" },
  { id: "mpesa", nome: "M-Pesa", curto: "M-Pesa", icon: "telemovel" },
  { id: "emola", nome: "E-mola", curto: "E-mola", icon: "emola" },
  { id: "transferencia", nome: "Transferência bancária", curto: "Transferência", icon: "banco" },
];
export const nomeForma = (f: string) => FORMAS.find((x) => x.id === f)?.curto ?? (f === "cartao" ? "Cartão" : f);

export const PERFIS: Record<Perfil, string> = { administrador: "Administradora", gestor: "Gestora", vendedor: "Vendedora" };
