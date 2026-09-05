import { InvalidWebhookSignatureError, WebhookSignatureValidator } from "mercadopago";

export interface DadosAssinaturaWebhook {
  xSignature: string | string[] | null | undefined;
  xRequestId: string | string[] | null | undefined;
  dataId: string | string[] | null | undefined;
  secret: string;
}

/**
 * Valida a assinatura de uma notificação de webhook do Mercado Pago usando o
 * validador oficial do SDK (`WebhookSignatureValidator`). Nunca lança —
 * qualquer falha de validação (assinatura ausente, malformada ou que não
 * bate) resulta em `false`.
 */
export function assinaturaWebhookValida(dados: DadosAssinaturaWebhook): boolean {
  try {
    WebhookSignatureValidator.validate(dados);
    return true;
  } catch (erro) {
    if (erro instanceof InvalidWebhookSignatureError) {
      return false;
    }
    throw erro;
  }
}
