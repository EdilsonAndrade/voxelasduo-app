# Research: Notificações unificadas MP + ML (EDI-132)

## 1. Identificação da origem/tópico

- **Decision**: função pura `identificarNotificacao({ query, corpo })`:
  - Corpo com `resource` + `topic` → **Mercado Livre**. Tópicos: `orders_v2`/`orders` → pedidos; `questions` → perguntas; `claims`/`claims_actions` → reclamações; `messages` → mensagens; `shipments` → envios; outros → `desconhecido`.
  - Corpo com `resource` sem `topic` (formato dos testes antigos/rotas dedicadas) → usa o **tópico padrão da rota** que recebeu.
  - Caso contrário → **Mercado Pago**: tipo = `query.type ?? query.topic ?? corpo.type ?? corpo.topic`; id = `query["data.id"] ?? corpo.data.id ?? query.id`. `payment` → pagamento; `merchant_order` e outros → ignorado com log.
- **Rationale**: formatos oficiais. ML: `{ resource, user_id, topic, application_id, attempts, sent, received }`. MP Webhook: `?data.id=..&type=payment` + corpo `{ action, type, data: { id } }` + header `x-signature`. MP IPN (legado): `?id=..&topic=payment`, sem assinatura.
- **Alternatives**: separar por URL (impossível — a aplicação só tem uma URL).

## 2. Assinatura

- **Decision**: valida `x-signature` só em avisos do MP. Se o header existir e não bater → 401 + log. IPN sem header → aceito.
- **Rationale**: o conteúdo do aviso nunca é usado como dado (sempre consulta `GET /v1/payments/{id}` com nosso token) — um aviso forjado só provoca uma consulta idempotente. Exigir assinatura no IPN rejeitaria o formato legado que o MP ainda envia. Avisos do ML continuam validados por `application_id`.

## 3. Respostas e log

- 401 assinatura inválida → `console.warn` (tópico, id, x-request-id).
- Pagamento inexistente (`MPNotFoundError` / status 404) → 200 + `console.warn` (evita reenvio da simulação/ids de outra conta).
- Falha transitória (rede, 5xx, 429, erro no banco) → 500 + `console.error` (MP/ML reenviam).
- Tópico desconhecido / corpo ilegível → 200 + `console.info`.
- Sem dados sensíveis no log (só ids e tópico).

## 4. Verificação de pagamento única

- **Decision**: `verificarPagamentoPedido(pedidoId, origem: "cliente" | "admin" | "automatica")` → `{ resultado: "pago" | "pendente" | "recusado" | "expirado" | "sem_tentativa" | "falha" | "nao_encontrado", mensagem }`. Consulta a tentativa pendente mais recente (ou, sem pendente, a mais recente), reaproveita `atualizarStatusTentativa` (idempotente — e-mails no máximo uma vez).
- Resultado ≠ pago → `registrarFalhaPagamento` (exceto `pendente` vindo da tela do cliente, para não escrever a cada 5s).
- **Rationale**: um caminho só para quatro gatilhos evita divergência; a idempotência já existe em `promoverPedidoSeAprovado` (`findOneAndUpdate` condicional).

## 5. Pedido cancelado com pagamento aprovado

- **Decision**: o filtro de promoção passa de `status != "pago"` para `status ∉ {"pago","cancelado"}`. Se a promoção não ocorrer porque o pedido está cancelado, grava `ultimaFalha` com código `aprovado_pedido_cancelado`.
- **Rationale**: FR-016 — loja decide (estorno ou reativação manual).

## 6. Conferência automática

- **Decision**: `conferirPendentesRecentes({ limite: 20, dias: 7 })` → pedidos `canalOrigem: "site"`, `status: "pendente"`, `criadoEm ≥ agora-7d`, com tentativa. Consultas em paralelo (`Promise.allSettled`).
- Na página `/admin/pedidos`: `Promise.race` com timeout de 4s e `try/catch` — a lista abre mesmo com o MP fora (SC-006); o que não terminar segue em segundo plano na função.
- Cron diário `GET /api/pagamentos/conferir-pendentes` às 06:00 UTC, autenticado por `CRON_SECRET` (mesmo padrão de `/api/producao/importar`). Vercel Hobby: cron diário sem custo.

## 7. Rotas antigas

- **Decision**: cada `route.ts` antigo vira `return despacharNotificacao(request, { topicoPadrao })`. A lógica sai para `lib/notificacoes/**` sem alteração de comportamento.
- **Rationale**: qualquer URL configurada funciona; os testes existentes das rotas (corpo `{ resource, application_id }`) seguem válidos pelo tópico padrão.

## 8. Textos / I18N

- O projeto não tem biblioteca de i18n (research #7 das specs 034/035): textos pt-BR inline, como todo o admin.
