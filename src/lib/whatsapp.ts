/** Contacto guardado (só algarismos, com indicativo) → forma legível: +258 84 123 4567. */
export function contactoLegivel(c: string | null): string {
  if (!c) return "";
  if (c.startsWith("258") && c.length === 12) return `+258 ${c.slice(3, 5)} ${c.slice(5, 8)} ${c.slice(8)}`;
  return `+${c}`;
}

/** Primeiro nome, para personalizar a mensagem. */
export const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] ?? "";

/** Texto da mensagem com {nome} trocado pelo primeiro nome do cliente. */
export const mensagemPara = (modelo: string, nome: string) => modelo.replace(/\{nome\}/gi, primeiroNome(nome));

/** Link que abre a conversa no WhatsApp com a mensagem já escrita (a pessoa só tem de carregar em enviar). */
export function linkWhatsApp(contacto: string, texto: string): string {
  const n = contacto.replace(/\D/g, "");
  return `https://wa.me/${n}${texto.trim() ? `?text=${encodeURIComponent(texto)}` : ""}`;
}
