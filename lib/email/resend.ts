import { Resend } from "resend";
import type { Pedido } from "@/lib/models/pedido";

let clienteResend: Resend | undefined;

function obterClienteResend(): Resend {
  if (!clienteResend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error(
        "RESEND_API_KEY não está definida. Configure-a em .env.local (dev) ou nas variáveis de ambiente do projeto na Vercel (produção)."
      );
    }
    clienteResend = new Resend(apiKey);
  }
  return clienteResend;
}

function formatarValorEmReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Envia o código de recuperação de senha (Tarefa 10/EDI-84,
 * contracts/email-transacional.md). Falha de envio é logada e nunca lança —
 * a rota chamadora sempre responde de forma genérica ao cliente, envie ou
 * não o e-mail com sucesso.
 */
export async function enviarCodigoRecuperacao(email: string, codigo: string): Promise<void> {
  try {
    await obterClienteResend().emails.send({
      from: process.env.EMAIL_FROM ?? "",
      to: email,
      subject: "Código para redefinir sua senha",
      text: `Use o código ${codigo} para redefinir sua senha. Ele é válido por 20 minutos. Se você não solicitou essa recuperação, ignore este e-mail.`,
    });
  } catch (erro) {
    console.error("Falha ao enviar e-mail de recuperação de senha:", erro);
  }
}

/**
 * Envia o código de verificação de e-mail do cadastro (correção pós-EDI-84).
 * Mesmo tratamento best-effort das demais funções deste módulo.
 */
export async function enviarCodigoVerificacao(email: string, codigo: string): Promise<void> {
  try {
    await obterClienteResend().emails.send({
      from: process.env.EMAIL_FROM ?? "",
      to: email,
      subject: "Confirme seu e-mail",
      text: `Use o código ${codigo} para confirmar seu e-mail e concluir seu cadastro. Ele é válido por 10 minutos.`,
    });
  } catch (erro) {
    console.error("Falha ao enviar e-mail de verificação:", erro);
  }
}

/**
 * Notifica o admin quando uma venda de canal externo é sincronizada
 * (Tarefa 10/EDI-84, contracts/email-transacional.md). Best-effort: falha de
 * envio é logada e nunca lança — o pedido já foi criado e o estoque já foi
 * abatido antes desta chamada.
 */
export async function notificarAdminVendaExterna(pedido: Pedido): Promise<void> {
  const destinatario = process.env.ADMIN_NOTIFICACAO_EMAIL;
  if (!destinatario) {
    console.error("ADMIN_NOTIFICACAO_EMAIL não está definida — notificação de venda não enviada.");
    return;
  }

  const totalItens = pedido.itens.reduce((acc, item) => acc + item.quantidade, 0);

  try {
    await obterClienteResend().emails.send({
      from: process.env.EMAIL_FROM ?? "",
      to: destinatario,
      subject: "Nova venda sincronizada — Mercado Livre",
      text: `Uma nova venda foi sincronizada do canal "${pedido.canalOrigem}": ${totalItens} ${
        totalItens === 1 ? "item" : "itens"
      }, valor total ${formatarValorEmReais(pedido.valorTotal)}.`,
    });
  } catch (erro) {
    console.error("Falha ao enviar e-mail de notificação de venda externa:", erro);
  }
}
