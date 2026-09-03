import { NextResponse } from "next/server";

// Esqueleto: confirma que a rota existe e está pronta para receber payloads.
// Validação de assinatura e processamento por provedor (Mercado Pago, Shopee,
// Mercado Livre) são escopo das Tarefas 4, 6 e 7 (EDI-77, EDI-79, EDI-80).
export async function POST() {
  return NextResponse.json({ received: true });
}
