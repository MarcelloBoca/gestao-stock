const P: Record<string, string> = {
  vender: '<path d="M6 8h12l-1 12H7zM9 8V6a3 3 0 0 1 6 0v2"/>',
  recibo: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6"/>',
  caixa: '<path d="M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10"/>',
  grafico: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
  pessoas: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/>',
  lista: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
  sair: '<path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9"/>',
  voltar: '<path d="M15 5l-7 7 7 7"/>',
  seguir: '<path d="M9 5l7 7-7 7"/>',
  procurar: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  menos: '<path d="M5 12h14"/>',
  certo: '<path d="M4 12l5 5L20 6"/>',
  lixo: '<path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13"/>',
  grelha: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  sapato: '<path d="M2 18h20M3 18c0-3 1-7 3-8l3 3h3l2-2 5 3c2 1 3 2 3 4"/>',
  roupa: '<path d="M9 3h6l-1 5 4 13H6l4-13z"/>',
  bolsa: '<path d="M5 9h14l-1 11H6zM9 9V7a3 3 0 0 1 6 0v2"/>',
  camara: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  dinheiro: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 10v4M18 10v4"/>',
  telemovel: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  emola: '<path d="M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4zM4 7l11-3v3M16 13.5h.01"/>',
  banco: '<path d="M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>',
  devolver: '<path d="M9 14l-5-5 5-5M4 9h11a5 5 0 0 1 0 10h-3"/>',
  aviso: '<path d="M12 3l9 17H3zM12 10v5M12 17.5v.5"/>',
  contar: '<path d="M4 4h16v16H4zM8 9h8M8 13h8M8 17h4"/>',
  lapis: '<path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  chave: '<circle cx="8" cy="14" r="4"/><path d="M11 11l9-9M16 6l3 3"/>',
  preco: '<path d="M4 4h7l9 9-7 7-9-9zM8 8h.01"/>',
  sms: '<path d="M4.5 19.5l1.3-3.8A8 8 0 1 1 8.6 18.4z"/>',
  utilizador: '<circle cx="12" cy="8" r="4"/><path d="M4 20.5a8 8 0 0 1 16 0"/>',
  cadeado: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  olho: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  imagem: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="M20.5 16l-5-5-8.5 8.5"/>',
  telefone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  coracao: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  casa: '<path d="M4 10.5L12 4l8 6.5V20h-5v-6H9v6H4z"/>',
  camiao: '<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7M7.5 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM17.5 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/>',
  pontos: '<path d="M5 12h.01M12 12h.01M19 12h.01"/>',
  joia: '<circle cx="12" cy="14.5" r="5.5"/><path d="M9.5 4h5l1.5 2-4 3-4-3z"/>',
  olhoNao: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path d="M4 4l16 16"/>',
};

export default function Icon({ name, size = 18, stroke = 2, className }: { name: string; size?: number; stroke?: number; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ flex: "none" }}
      dangerouslySetInnerHTML={{ __html: P[name] ?? "" }}
    />
  );
}

/** Ícone da categoria (para as peças sem foto). */
export function iconeCategoria(nome: string | null | undefined): string {
  const n = (nome ?? "").toLowerCase();
  if (n.includes("acess") || n.includes("joia") || n.includes("brinc")) return "joia";
  if (n.includes("bols") || n.includes("cartei")) return "bolsa";
  if (n.includes("roup") || n.includes("vest") || n.includes("blus")) return "roupa";
  return "sapato";
}
