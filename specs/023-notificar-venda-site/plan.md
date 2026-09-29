# Implementation Plan: Notificar a loja por e-mail quando uma venda do site for paga

**Branch**: `edilsonaandrade/edi-110-notificar-a-loja-por-e-mail-quando-uma-venda-do-site-for` | **Date**: 2026-09-28 | **Spec**: [spec.md](./spec.md)

## Summary

Nova função `notificarAdminVendaSite(pedido)` em `lib/email/resend.ts`, no padrão de `notificarAdminNovaEncomenda` (destinatários admin + loja, `replyTo` no comprador, HTML escapado, best-effort). Disparada em `promoverPedidoSeAprovado` (`lib/pagamentos/repository.ts`) logo após `enviarConfirmacaoPedido`, reaproveitando a idempotência do `findOneAndUpdate` (só quem promove o pedido dispara).

## Technical Context

**Language/Version**: TypeScript, Next.js 16 · **Dependencies**: Resend (existente) — nada novo · **Storage**: sem mudança · **Testing**: Vitest (`lib/email/resend.test.ts`, `lib/pagamentos/repository.test.ts`) · **i18n**: sem biblioteca; textos inline em pt-BR (padrão do projeto).

## Constitution Check

Constitution sem princípios preenchidos. Falhas de envio são logadas (`console.error`), sem afetar a resposta do pagamento — nenhuma resposta HTTP alterada, nada escondido da aba Network.

## Project Structure

```text
lib/email/resend.ts (+ .test.ts)          # novo: notificarAdminVendaSite; destinatários/escape reaproveitados
lib/pagamentos/repository.ts (+ .test.ts) # alterado: dispara a notificação ao promover a pago
```

Forma de pagamento: rótulo legível a partir de `pagamento.metodo` ("pix" → "Pix", "bolbradesco"/"boleto" → "Boleto", demais → "Cartão (visa)"). Link: `${urlBaseSite()}/admin/pedidos?status=pago`.
