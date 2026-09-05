/**
 * Monta uma mensagem de erro incluindo o corpo da resposta do Mercado Livre
 * (geralmente JSON com `message`/`cause` explicando o motivo exato — ex:
 * categoria inválida, campo obrigatório ausente) — sem isso, só o HTTP
 * status não é suficiente para diagnosticar uma falha (descoberto testando
 * em produção, onde um "HTTP 400" genérico escondia o motivo real).
 */
export async function erroMercadoLivre(resposta: Response, contexto: string): Promise<Error> {
  let corpo = "";
  try {
    corpo = await resposta.text();
  } catch {
    corpo = "";
  }
  return new Error(`${contexto} (HTTP ${resposta.status})${corpo ? `: ${corpo}` : "."}`);
}
