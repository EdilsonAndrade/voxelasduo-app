import { Resend } from "resend";
import type { Pedido } from "@/lib/models/pedido";
import { buscarProdutosPorIds } from "@/lib/pedidos/repository";
import { renderEmailLayout } from "@/lib/email/templates";

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
  const text = `Use o código ${codigo} para redefinir sua senha. Ele é válido por 20 minutos. Se você não solicitou essa recuperação, ignore este e-mail.`;
  const html = renderEmailLayout({
    titulo: "Redefinir sua senha",
    corpoHtml: `
      <p>Use o código abaixo para redefinir sua senha:</p>
      <p style="margin:20px 0;padding:16px;text-align:center;font-size:28px;font-weight:800;letter-spacing:4px;color:#7B5CF6;background-color:#FFF6ED;border-radius:8px;">${codigo}</p>
      <p>Ele é válido por 20 minutos. Se você não solicitou essa recuperação, ignore este e-mail.</p>
    `,
  });

  try {
    await obterClienteResend().emails.send({
      from: process.env.EMAIL_FROM ?? "",
      to: email,
      subject: "Código para redefinir sua senha",
      text,
      html,
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
  const text = `Use o código ${codigo} para confirmar seu e-mail e concluir seu cadastro. Ele é válido por 10 minutos.`;
  const html = renderEmailLayout({
    titulo: "Confirme seu e-mail",
    corpoHtml: `
      <p>Use o código abaixo para confirmar seu e-mail e concluir seu cadastro:</p>
      <p style="margin:20px 0;padding:16px;text-align:center;font-size:28px;font-weight:800;letter-spacing:4px;color:#7B5CF6;background-color:#FFF6ED;border-radius:8px;">${codigo}</p>
      <p>Ele é válido por 10 minutos.</p>
    `,
  });

  try {
    await obterClienteResend().emails.send({
      from: process.env.EMAIL_FROM ?? "",
      to: email,
      subject: "Confirme seu e-mail",
      text,
      html,
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
  const descricaoItens = `${totalItens} ${totalItens === 1 ? "item" : "itens"}`;
  const valorTotalTexto = formatarValorEmReais(pedido.valorTotal);
  const text = `Uma nova venda foi sincronizada do canal "${pedido.canalOrigem}": ${descricaoItens}, valor total ${valorTotalTexto}.`;
  const html = renderEmailLayout({
    titulo: "Nova venda sincronizada",
    corpoHtml: `
      <p>Uma nova venda foi sincronizada do canal <strong>${pedido.canalOrigem}</strong>.</p>
      <p style="font-weight:700;">${descricaoItens} — valor total ${valorTotalTexto}</p>
    `,
  });

  try {
    await obterClienteResend().emails.send({
      from: process.env.EMAIL_FROM ?? "",
      to: destinatario,
      subject: "Nova venda sincronizada — Mercado Livre",
      text,
      html,
    });
  } catch (erro) {
    console.error("Falha ao enviar e-mail de notificação de venda externa:", erro);
  }
}

/**
 * Envia a confirmação de pedido ao comprador (autenticado ou convidado)
 * assim que o pagamento do checkout do site é aprovado (Tarefa 12/EDI-87,
 * contracts/email-transacional.md). Disparada por `promoverPedidoSeAprovado`
 * (lib/pagamentos/repository.ts), que já garante no-máximo-uma-chamada por
 * pedido — best-effort, mesmo tratamento das demais funções deste módulo.
 */
export async function enviarConfirmacaoPedido(pedido: Pedido): Promise<void> {
  const numeroPedido = pedido._id?.toString() ?? "";

  const produtos = await buscarProdutosPorIds(pedido.itens.map((item) => item.produtoId.toString()));
  const itensTexto = pedido.itens
    .map((item) => {
      const nome = produtos.get(item.produtoId.toString())?.nome ?? "Produto";
      return `${item.quantidade}x ${nome} — ${formatarValorEmReais(item.precoUnitario * item.quantidade)}`;
    })
    .join("\n");
  const itensHtml = pedido.itens
    .map((item) => {
      const nome = produtos.get(item.produtoId.toString())?.nome ?? "Produto";
      return `<li>${item.quantidade}x ${nome} — ${formatarValorEmReais(item.precoUnitario * item.quantidade)}</li>`;
    })
    .join("");

  const valorTotalTexto = formatarValorEmReais(pedido.valorTotal);
  const subject = `Pedido confirmado — #${numeroPedido}`;

  const text = `Recebemos o pagamento do seu pedido #${numeroPedido}!\n\nItens:\n${itensTexto}\n\nValor total: ${valorTotalTexto}\n\nObrigado por comprar na Voxelas Duo.`;

  const html = renderEmailLayout({
    titulo: "Pagamento confirmado!",
    corpoHtml: `
      <p>Recebemos o pagamento do seu pedido <strong>#${numeroPedido}</strong>!</p>
      <p style="margin:20px 0 8px;font-weight:700;">Itens</p>
      <ul style="margin:0 0 20px;padding-left:20px;">${itensHtml}</ul>
      <p style="font-weight:700;">Valor total: ${valorTotalTexto}</p>
      <p>Obrigado por comprar na Voxelas Duo.</p>
    `,
  });

  try {
    await obterClienteResend().emails.send({
      from: process.env.EMAIL_FROM ?? "",
      to: pedido.cliente.email,
      subject,
      text,
      html,
    });
  } catch (erro) {
    console.error("Falha ao enviar e-mail de confirmação de pedido:", erro);
  }
}
