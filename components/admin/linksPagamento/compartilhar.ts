/** URL pública do link de pagamento. */
export function urlDoLink(origem: string, codigo: string): string {
  return `${origem.replace(/\/$/, "")}/pagar/${codigo}`;
}

/** Mensagem pronta para o WhatsApp. */
export function textoWhatsApp(url: string, clienteNome?: string): string {
  const saudacao = clienteNome?.trim() ? `Oi, ${clienteNome.trim()}!` : "Oi!";
  return `${saudacao} Separei seu pedido com o preço especial. É só abrir o link e pagar por Pix ou cartão: ${url}`;
}
