import type { StatusTentativaPagamento } from "@/lib/models/pedido";

/**
 * Mapeia o `status` de um pagamento do Mercado Pago para o status interno
 * de uma tentativa de pagamento. `pending`/`in_process` (Pix aguardando
 * compensação, cartão em análise) são tratados como "pendente"; `cancelled`
 * (preferência/QR expirado sem pagamento) como "expirado".
 */
export function mapearStatusMercadoPago(statusMercadoPago: string): StatusTentativaPagamento {
  switch (statusMercadoPago) {
    case "approved":
      return "aprovado";
    case "rejected":
      return "recusado";
    case "cancelled":
      return "expirado";
    case "pending":
    case "in_process":
    case "authorized":
    default:
      return "pendente";
  }
}
