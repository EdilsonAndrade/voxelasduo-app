# Research: Webhooks de perguntas e reclamações do Mercado Livre

## 1. Tópico `questions`

- **Decision**: Assinar `questions`; ao receber a notificação, buscar o detalhe via `GET /questions/{id}` e responder via `POST /answers` (body `{ question_id, text }`, limite de 2000 caracteres).
- **Rationale**: É o padrão oficial documentado pela API do Mercado Livre para perguntas de anúncio; mesma técnica de "payload é só o gatilho" já usada em `orders_v2`.
- **Alternatives considered**: Consultar perguntas por polling (`GET /questions/search`) em vez de notificação — rejeitado por não escalar e não atender ao objetivo do ticket (reagir a evento).

## 2. Tópicos `claims` / `claims_actions`

- **Decision**: Assinar `claims` e `claims_actions`; buscar o detalhe via `GET /post-purchase/v1/claims/{claim_id}` (endpoint atual — o antigo `/v1/claims/` foi descontinuado em maio/2024) e enviar resposta/comentário via a API de ações de post-purchase.
- **Rationale**: `claims` cobre abertura/atualização da reclamação; `claims_actions` cobre ações específicas dentro dela (ex.: nova mensagem, mudança de estado) — ambos citados no próprio ticket.
- **Alternatives considered**: Só assinar `claims` — rejeitado porque `claims_actions` é quem sinaliza novas interações dentro de uma reclamação já aberta (research necessário para não perder atualização).
- **Nota de implementação**: O corpo exato de resposta/comentário via API (endpoint específico de ação) precisa ser confirmado contra a doc oficial (`Manage claims messages`) no momento da implementação, pois a doc pública bloqueou fetch automatizado nesta pesquisa — a Tarefa correspondente deve validar contra uma reclamação de teste antes de dar como concluída.

## 3. Tópico `messages` (pós-venda)

- **Decision**: Assinar `messages`; ao notificar, buscar o pack de mensagens via `GET /messages/packs/{pack_id}/sellers/{seller_id}` (retorna o histórico da conversa) e responder normalmente (sem necessidade de selecionar motivo, diferente de mensagens pré-venda).
- **Rationale**: É o fluxo documentado para mensagens pós-venda; o `pack_id` identifica a venda/conversa, permitindo vincular ao pedido externo já registrado (`origemExterna.pedidoExternoId`).
- **Alternatives considered**: Nenhuma — é o único caminho documentado para mensagens pós-venda.

## 4. Idempotência ao processar notificações reenviadas

- **Decision**: Reaproveitar o padrão já usado em `upsertPedidoExterno` (`lib/pedidos/externos.ts`): tentar inserir, resolver corrida via índice único esparso no id de origem do ML (código de erro Mongo 11000), sem depender só de uma leitura prévia.
- **Rationale**: Já validado em produção para `orders_v2`; evita duplicar item na listagem do admin quando o Mercado Livre reenvia a mesma notificação (garantia at-least-once).
- **Alternatives considered**: Deduplicar só por leitura prévia (`findOne` antes de inserir) — rejeitado por ser sujeito a corrida entre notificações quase simultâneas.

## 5. Contrato de resposta do endpoint de callback

- **Decision**: Sempre responder `200` confirmando recebimento, exceto quando a consulta à API do Mercado Livre falhar de forma transitória — nesse caso responder `500` para o Mercado Livre reenviar depois (mesmo contrato do `orders_v2` atual).
- **Rationale**: Mantém consistência com o webhook já existente e com o comportamento esperado pelo Mercado Livre (reenvio automático em falha).
- **Alternatives considered**: Nenhuma — segue convenção já estabelecida no projeto.

## 6. Vínculo com pedido existente

- **Decision**: Reclamações e mensagens pós-venda são vinculadas ao pedido externo já registrado usando o id do pedido do Mercado Livre presente no detalhe da reclamação/pack de mensagens, comparado contra `origemExterna.pedidoExternoId` (mesmo campo usado por `orders_v2`).
- **Rationale**: Reaproveita o vínculo que já existe hoje entre pedido externo e venda no Mercado Livre; evita nova estrutura de relacionamento.
- **Alternatives considered**: Vínculo por item do anúncio — rejeitado porque reclamação/mensagem é por venda, não por item.
