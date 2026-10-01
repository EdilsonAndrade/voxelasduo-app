/** Telefone dos clientes de evento: gravado só com dígitos, exibido com máscara (19) 99999-9999. */

export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

export function telefoneValido(valor: string): boolean {
  const digitos = somenteDigitos(valor);
  return digitos.length === 10 || digitos.length === 11;
}

/** Máscara progressiva, aplicada enquanto se digita (máximo 11 dígitos). */
export function mascararTelefone(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  const ddd = d.slice(0, 2);
  const resto = d.slice(2);
  // Fixo (8 dígitos após o DDD) usa 4-4; celular (9 dígitos) usa 5-4.
  const corte = resto.length > 8 ? 5 : 4;
  if (resto.length <= corte) return `(${ddd}) ${resto}`;
  return `(${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}`;
}

/** Link do WhatsApp com mensagem pronta para o cliente do evento. */
export function linkWhatsappCliente(telefone: string, nomeCliente: string, evento: string): string {
  const mensagem = `Oi, ${nomeCliente.trim()}! Aqui é da Voxelas Duo, sobre o seu pedido na ${evento.trim()}.`;
  return `https://wa.me/55${somenteDigitos(telefone)}?text=${encodeURIComponent(mensagem)}`;
}
