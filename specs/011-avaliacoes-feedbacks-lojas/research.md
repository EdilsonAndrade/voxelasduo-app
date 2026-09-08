# Research: Importação de Avaliações e Feedbacks das Lojas Parceiras (EDI-85)

Resultados da Fase 0 — decisões técnicas com alternativas consideradas. Reaproveita a base OAuth2 do Mercado Livre (Tarefa 5/EDI-78) e o padrão de client por canal (Tarefa 5/7) sem alterações.

## 1. Endpoint de avaliações do Mercado Livre

**Decision**: `GET /reviews/item/{item_id}` (API pública de reviews do Mercado Livre), autenticado com o mesmo access token OAuth2 já obtido via `obterAccessTokenValido()` (`lib/estoque/canais/mercadoLivre/auth.ts`). A resposta traz uma lista de reviews com `id`, `rate` (1-5), `comment`, `date_created` — mapeados para os campos de `Avaliação` (#4).

**Rationale**: É o mesmo `item_id` já gravado em `produto.integracoes.mercadoLivreId` pela Tarefa 7 — nenhuma descoberta adicional de identificador é necessária.

**Alternatives considered**: Endpoint de "perguntas e respostas" (`/questions`) — descartado; é um canal de pré-venda (dúvidas antes da compra), não de avaliação pós-compra, e não tem nota.

## 2. Endpoint de avaliações da Shopee — reaproveita o mesmo gate de configuração do client de estoque

**Decision**: A Shopee Open Platform expõe avaliações via `GET /api/v2/product/get_comment`, assinado com HMAC (`partner_id` + `api_path` + `timestamp` + `partner_key`) — mesmo esquema de autenticação que `shopeeClient` (`lib/estoque/canais/shopee.ts`) já documenta como pendente. Como o app da loja na Shopee Open Platform ainda está em análise (`shopeeClient` é um stub que lança erro se chamado), o importador de avaliações da Shopee segue a mesma regra já usada pela sincronização de estoque: só é chamado quando `SHOPEE_PARTNER_ID`/`SHOPEE_PARTNER_KEY` estiverem configurados; enquanto isso, o canal Shopee é ignorado silenciosamente na importação (equivalente a FR-005 desta spec), sem quebrar a importação do Mercado Livre.

**Rationale**: Evita duplicar a mesma decisão de design já validada na Tarefa 5/7 (canal sem credencial configurada = ausência de processamento, não erro) e mantém a tarefa entregável mesmo com a Shopee ainda bloqueada externamente.

**Alternatives considered**: Bloquear toda a Tarefa 11 até a aprovação do app na Shopee — rejeitado; o Mercado Livre já está totalmente integrado (Tarefas 5/7) e não há motivo para atrasar o valor entregável nesse canal.

## 3. Nova coleção `avaliacoes`, com upsert idempotente por canal + ID externo

**Decision**: Nova coleção `avaliacoes`, com índice único em `{ canal: 1, avaliacaoIdCanal: 1 }`. A importação de cada avaliação usa `updateOne({ canal, avaliacaoIdCanal }, { $set: {...} }, { upsert: true })` — mesmo padrão de idempotência via índice único já usado para `origemExterna.pedidoExternoId` em `Pedido` (Tarefa 7, research.md #2) e para o `idempotencia` do checkout (Tarefa 3).

**Rationale**: Resolve ao mesmo tempo FR-003 (sem duplicar em reexecuções) e FR-004 (atualizar quando o conteúdo mudar no canal de origem) com uma única operação atômica, sem precisar de uma consulta prévia "já existe?".

**Alternatives considered**: `updateOne` com `upsert: true` direto — rejeitado após revisão: não distingue "criada" de "atualizada sem mudança de conteúdo" (T016, tasks.md exige que uma reimportação idêntica não conte como atualização). Implementado como find-then-insert com catch do erro 11000 do índice único, comparando o conteúdo antes de decidir entre "sem mudança" e "atualizada" — mesmo padrão já usado em `lib/pedidos/externos.ts` (Tarefa 7) para o mesmo tipo de idempotência.

## 4. Modelo de dados da avaliação: campos mínimos comuns aos três canais

**Decision**: `Avaliação` guarda apenas os campos presentes em qualquer canal — `produtoId`, `canal` (`"site" | "mercado_livre" | "shopee"`), `avaliacaoIdCanal` (ausente/omitido para o canal `"site"`, cujo `_id` do Mongo já é o identificador), `nota` (1-5), `comentario` (opcional), `dataAvaliacao` (data original do canal). O tipo `canal` já inclui `"site"` para o caso de o site ganhar avaliações próprias no futuro (ver spec.md, Assumptions), mas nenhum caminho de escrita a partir do site é construído nesta tarefa.

**Rationale**: Mercado Livre e Shopee não expõem nome do autor de forma consistente e não confiável para exibição pública (privacidade/anonimização variável entre canais) — omitir esse campo evita exibir dados incorretos ou incompletos; a seção de avaliações (FR-008/FR-009) mostra nota, comentário e canal de origem, que é o que a spec exige.

**Alternatives considered**: Guardar o payload bruto da API externa em um campo `raw` para uso futuro — descartado por ora (YAGNI); nada na spec exige reprocessamento retroativo, e o campo pode ser adicionado depois sem migração se necessário.

## 5. Job agendado: nova rota de cron, mesmo padrão de segredo do Vercel Cron

**Decision**: Nova rota `GET|POST /api/avaliacoes/importar`, protegida por `Authorization: Bearer $CRON_SECRET` (idêntico a `/api/estoque/sincronizar`). Adiciona uma segunda entrada ao array `crons` de `vercel.ts`, também 1x/dia (mesma limitação do plano Hobby já documentada em `vercel.ts`), em horário diferente do cron de estoque (`0 4 * * *`, uma hora depois) para não concorrer pela mesma janela.

**Rationale**: Reaproveita a mesma infraestrutura de cron/autenticação já validada, sem introduzir um novo mecanismo de agendamento (Assumption da spec).

**Alternatives considered**: Rodar a importação de avaliações dentro do mesmo cron de estoque (`/api/estoque/sincronizar`) — rejeitado; são domínios diferentes (fila de retry de estoque vs. varredura completa de avaliações por produto), e misturar as duas responsabilidades numa única rota dificultaria observar falhas de cada uma isoladamente (ver #6).

**Risco aceito**: o plano Hobby da Vercel tem um limite total de cron jobs por projeto; com esta tarefa o projeto passa a ter 2 (estoque + avaliações). Caso o limite do plano seja atingido no futuro, os dois jobs precisarão ser consolidados em uma única rota com sub-rotinas internas.

## 6. Log de falhas de importação (FR-006), mesmo padrão de `publicacoesCanalFalhas`

**Decision**: Nova coleção `avaliacoesImportacaoFalhas`, com o mesmo formato de `publicacoesCanalFalhas` (Tarefa 7): `canal`, `produtoId` (opcional — ausente quando a falha é geral do canal, ex: token inválido antes de resolver qualquer produto), `motivo`, `criadoEm`, `resolvidoEm?`. Consultável via `GET /api/avaliacoes/pendencias`, no mesmo espírito de `GET /api/anuncios/pendencias`.

**Rationale**: Reaproveita um padrão já validado (coleção de falhas por canal, sem retry automático, revisão manual) em vez de inventar um novo formato de log para esta tarefa.

**Alternatives considered**: Registrar falhas apenas em log de aplicação (console/Vercel Logs) — rejeitado; não atende a FR-006/SC-005 (consultável pelo responsável da loja sem investigar registros técnicos brutos).

## 7. Falha em um produto/canal não interrompe os demais (FR-007)

**Decision**: `importarAvaliacoesProduto(produto)` nunca lança exceção para quem chama — qualquer falha ao consultar um canal é capturada, gera um registro em `avaliacoesImportacaoFalhas` e a função retorna normalmente. A rota de cron itera todos os produtos elegíveis (com `integracoes.mercadoLivreId` e/ou `integracoes.shopeeItemId`) em sequência, somando contadores de sucesso/falha — mesmo padrão de "nunca propaga exceção de canal externo" já usado em `sincronizarEstoqueProduto` (Tarefa 5, contracts/estoque-api.md).

**Rationale**: Reaproveita o princípio de isolamento de falha por canal já validado, evitando que a instabilidade de uma API externa comprometa a importação dos demais produtos na mesma execução.

**Alternatives considered**: Interromper a execução do job na primeira falha — rejeitado pela spec (FR-007) e pela experiência já validada na Tarefa 5, onde isso causaria uma regressão de confiabilidade conhecida.

## 8. Paginação da seção de avaliações no site (FR-011)

**Decision**: `GET /api/produtos/[id]/avaliacoes?cursor=&limite=` retorna uma página de avaliações ordenadas por `dataAvaliacao` decrescente (mais recentes primeiro), com `proximoCursor` quando houver mais. A página do produto renderiza a primeira página no servidor (Server Component, mesmo padrão de `app/produtos/[categoria]/[slug]/page.tsx`) e um componente cliente (`AvaliacoesProduto`) busca páginas seguintes sob demanda ("carregar mais"), sem trazer todas de uma vez.

**Rationale**: Atende ao edge case da spec (volume grande de avaliações) com o mesmo padrão de composição server/client component já usado no restante do site (ex: `BotaoAdicionarCarrinho` como client component dentro de uma página server).

**Alternatives considered**: Paginação numérica por página (`?pagina=2`) — rejeitado a favor de cursor por ser mais simples de manter estável quando novas avaliações chegam entre carregamentos (evita duplicar/pular itens que uma paginação por offset teria).
