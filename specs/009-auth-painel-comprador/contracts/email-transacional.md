# Contract: E-mails transacionais (Resend)

Módulo `lib/email/resend.ts` — cliente único do Resend (`RESEND_API_KEY`), remetente `EMAIL_FROM`.

## `enviarCodigoRecuperacao(email: string, codigo: string): Promise<void>`

Disparado por `POST /api/clientes/recuperar-senha` quando o e-mail corresponde a um cliente com `senhaHash`.

**Conteúdo**: assunto "Código para redefinir sua senha", corpo com o código de 6 dígitos e aviso de validade de 20 minutos (PT-BR, sem i18n — research.md #9).

**Falha de envio**: erro do Resend é logado; a rota ainda responde `200 { "ok": true }` ao cliente (não vazar se o e-mail existe/foi enviado — mesma resposta genérica do contrato de recuperação de senha).

## `notificarAdminVendaExterna(pedido: Pedido): Promise<void>`

Disparado por `app/api/webhooks/mercado-livre/pedidos/route.ts` quando `upsertPedidoExterno` retorna `criado: true` (research.md #8).

**Destinatário**: `ADMIN_NOTIFICACAO_EMAIL`.

**Conteúdo**: assunto "Nova venda sincronizada — Mercado Livre", corpo com canal de origem, itens e valor total do pedido.

**Falha de envio**: erro do Resend é logado; não deve derrubar o processamento do webhook (o pedido já foi criado e o estoque já foi abatido antes desta chamada) — regra "não esconda erros que deveriam ser mostrados na aba network" (CLAUDE.md) aplica-se à experiência do admin no site, não a este envio assíncrono de e-mail, que é *best-effort* por natureza.
