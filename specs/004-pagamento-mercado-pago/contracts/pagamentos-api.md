# Contrato: API de Pagamentos (Mercado Pago)

Base path: `/api/pagamentos`. Todas as respostas em JSON.

## `POST /api/pagamentos`

Cria uma nova tentativa de pagamento (cartão ou Pix) para um pedido `"pendente"` existente. Chamado pelo `onSubmit` do Payment Brick em `app/pedido/[id]/page.tsx`.

**Body**:
```json
{
  "pedidoId": "674b2...",
  "formData": {
    "token": "ff8080...",
    "payment_method_id": "visa",
    "issuer_id": "310",
    "installments": 1,
    "payer": { "email": "maria@exemplo.com", "identification": { "type": "CPF", "number": "..." } }
  }
}
```
`formData` é repassado como veio do callback `onSubmit` do Payment Brick (varia entre cartão e Pix — ex: Pix não tem `token`/`installments`).

Regras (todas no servidor):

- `transaction_amount` enviado ao Mercado Pago é **sempre** `pedido.valorTotal` (convertido de centavos para reais) — nunca um valor vindo do cliente (FR-004).
- `external_reference` enviado ao Mercado Pago = `pedidoId`.
- Bloqueia se o pedido não existir, não estiver `"pendente"`, ou já tiver uma tentativa `"pendente"` recente em aberto (ver `data-model.md` #2).
- Cada tentativa criada é registrada em `pedido.pagamento.tentativas` com status inicial mapeado da resposta do Mercado Pago.

**Respostas**:

- `201`: pagamento criado (aprovado, pendente ou recusado na resposta síncrona da API do MP):
  ```json
  {
    "tentativa": {
      "referenciaExterna": "1330...",
      "metodo": "visa",
      "status": "aprovado",
      "detalhes": { "qrCode": null, "qrCodeBase64": null }
    },
    "pedido": { "id": "674b2...", "status": "pago" }
  }
  ```
  Para Pix, `detalhes.qrCode`/`qrCodeBase64` vêm preenchidos (`point_of_interaction` da resposta do MP) para o front renderizar o QR.
- `400`: `pedidoId` ausente ou `formData` inválido.
- `404`: pedido não encontrado.
- `409`: pedido já `"pago"`, ou já existe tentativa em aberto — `{ "erro": "..." }`.

## `POST /api/pagamentos/webhook`

Recebe notificações assíncronas do Mercado Pago (tópico `payment`). URL cadastrada no painel do Mercado Pago (ngrok em dev, domínio da Vercel em produção).

**Validação** (nesta ordem, antes de qualquer efeito):

1. Header `x-signature` presente e válido (HMAC-SHA256 com `MERCADOPAGO_WEBHOOK_SECRET`) — inválido/ausente → `401`, nenhum processamento.
2. Buscar o pagamento na API do Mercado Pago pelo `id` recebido — payload do webhook nunca é usado como fonte de dados além do `id` (research.md #6).

**Processamento**:

- Localizar o pedido por `external_reference` (= `pedidoId`) da resposta do pagamento.
- Pedido não encontrado → responder `200` (nada a fazer; evita retentativa infinita do MP por um dado que nunca vai existir) e logar.
- Atualizar a tentativa correspondente (`referenciaExterna`); se aprovado e pedido ainda não `"pago"`, promover pedido a `"pago"` (idempotente — ver `data-model.md` #3).

**Respostas**:

- `200`: notificação processada (inclui os casos "pedido não encontrado" e "nenhuma mudança necessária" — FR-005, para o MP não reenviar à toa).
- `401`: assinatura inválida ou ausente.
- `500`: falha transitória (ex: banco indisponível) — MP reenvia automaticamente depois.

## Páginas afetadas (sem contrato JSON, listadas por completude)

- `GET /pedido/[id]` (Server Component, já existe) — quando `pedido.status === "pendente"`, passa a renderizar o Payment Brick (Client Component) para pagamento; quando `"pago"`, mantém a confirmação atual.
