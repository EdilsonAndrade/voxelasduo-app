# Contract: E-mails transacionais (Resend) — v2 (identidade visual + confirmação de pedido)

Estende `specs/009-auth-painel-comprador/contracts/email-transacional.md` (Tarefa 10/EDI-84). Módulo `lib/email/resend.ts` — cliente único do Resend (`RESEND_API_KEY`), remetente `EMAIL_FROM`. Todas as funções abaixo passam a enviar `html` (via `lib/email/templates.ts`) além de `text` puro (fallback para clientes que bloqueiam HTML).

## `lib/email/templates.ts`

### `renderEmailLayout(input: { titulo: string; corpoHtml: string }): string`

Monta o HTML completo do e-mail (cabeçalho com logo da Voxelas Duo + faixa na cor `--roxo` `#7B5CF6`, área de conteúdo com `titulo` + `corpoHtml`, rodapé com aviso de "não responda" e copyright). O corpo em `text` puro continua sendo montado por cada função de envio em `resend.ts`, como já era antes desta tarefa — só o `html` passa a existir. Logo referenciada por URL absoluta: `${process.env.SITE_URL ?? (process.env.VERCEL_URL ? \`https://${process.env.VERCEL_URL}\` : "")}/images/logo.png` — se nenhuma das duas variáveis estiver definida, o cabeçalho é renderizado sem a tag `<img>` (nunca lança erro).

**Não é best-effort/try-catch** — é uma função pura de montagem de string, sem I/O; quem lança/loga é sempre a função de envio em `resend.ts`.

## `lib/email/resend.ts`

### `enviarCodigoRecuperacao(email: string, codigo: string): Promise<void>` — inalterado no conteúdo/gatilho, agora com `html`

Disparado por `POST /api/clientes/recuperar-senha`. **Conteúdo**: assunto "Código para redefinir sua senha" (inalterado); corpo passa a usar `renderEmailLayout` com o código em destaque visual (bloco com a cor `--roxo`) e o mesmo aviso de validade de 20 minutos.

### `enviarCodigoVerificacao(email: string, codigo: string): Promise<void>` — inalterado no conteúdo/gatilho, agora com `html`

Disparado no fluxo de cadastro do cliente. **Conteúdo**: assunto "Confirme seu e-mail" (inalterado); mesmo tratamento visual do código de recuperação.

### `notificarAdminVendaExterna(pedido: Pedido): Promise<void>` — inalterado no conteúdo/gatilho, agora com `html`

Disparado por `app/api/webhooks/mercado-livre/pedidos/route.ts` quando `upsertPedidoExterno` retorna `criado: true`. **Conteúdo**: assunto "Nova venda sincronizada — Mercado Livre" (inalterado); corpo com canal de origem, itens e valor total, agora dentro do layout de marca.

### `enviarConfirmacaoPedido(pedido: Pedido): Promise<void>` — NOVO (EDI-87)

Disparado por `promoverPedidoSeAprovado` (`lib/pagamentos/repository.ts`), logo após `abaterEstoquePedido`, sempre que esta chamada foi quem de fato promoveu o pedido para `"pago"` (garantia de no-máximo-uma-vez herdada do `findOneAndUpdate` condicional — FR-004).

**Destinatário**: `pedido.cliente.email` — funciona igual para compra autenticada e como convidado (o campo não distingue os dois).

**Conteúdo**: assunto `"Pedido confirmado — #<id>"`; corpo com número do pedido (`pedido._id`), lista de itens (nome resolvido via `buscarProdutosPorIds` + quantidade) e valor total (`pedido.valorTotal`, formatado em BRL), dentro do layout de marca (`renderEmailLayout`).

**Escopo**: só pedidos com `canalOrigem: "site"` passam por `promoverPedidoSeAprovado` — pedidos de canal externo (Mercado Livre) nunca disparam esta função (FR-007), sem necessidade de checagem explícita de canal.

**Falha de envio**: erro do Resend é logado; nunca lança — mesmo padrão *best-effort* das demais funções deste módulo (FR-005). O pedido já está pago e o estoque já foi abatido antes desta chamada.
