---

description: "Task list for feature implementation"
---

# Tasks: Integração com Mercado Livre — Anúncios e Vendas

**Input**: Design documents from `/specs/006-integracao-mercado-livre/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: O projeto usa Vitest desde a Tarefa 2 — tarefas de teste incluídas para as regras de negócio novas (criação de anúncio, upload de imagem, extensão de preço, idempotência do webhook de pedidos), seguindo o mesmo padrão da Tarefa 5 (`fetch` mockado, sem mock de Mongo).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project (Next.js App Router)**: `app/`, `lib/`, `components/` na raiz do repositório, conforme plan.md.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Modelo de dados compartilhado por todas as histórias.

- [X] T001 [P] Adicionar campo opcional `origemExterna?: { canal: "mercado_livre" | "shopee"; pedidoExternoId: string }` em `lib/models/pedido.ts` (data-model.md #2)
- [X] T002 [P] Criar `lib/models/publicacaoCanal.ts` com o tipo `FalhaPublicacaoCanal` (coleção `publicacoesCanalFalhas`: `produtoId`, `canal`, `operacao: "criar" | "atualizar"`, `motivo`, `criadoEm`, `resolvidoEm?`) (data-model.md #3)
- [X] T003 [P] Criar `lib/estoque/canais/mercadoLivre/categorias.ts` com o mapeamento estático `categoria do site → category_id do Mercado Livre` e uma função `resolverCategoriaMercadoLivre(categoria: string): string | undefined` (research.md #5)

**Checkpoint**: Modelo de dados pronto para as fases seguintes.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Generaliza a sincronização de canal da Tarefa 5 para incluir preço e permitir excluir o canal de origem; cria o caminho de "pedido nascido em canal externo" reaproveitado por todas as histórias.

**⚠️ CRITICAL**: Nenhuma história pode ser validada de ponta a ponta antes desta fase.

- [X] T004 [P] Estender `lib/estoque/canais/tipos.ts`: `CanalEstoqueClient.atualizarQuantidade(anuncioId, quantidade)` → `atualizarAnuncio(anuncioId, { quantidade, preco }: { quantidade: number; preco: number })` (research.md #6)
- [X] T005 Estender `lib/estoque/canais/mercadoLivre/client.ts`: `atualizarAnuncio` envia `available_quantity` **e** `price` no mesmo `PUT /items/{itemId}` — depende de T004
- [X] T006 [P] Atualizar `lib/estoque/canais/mercadoLivre/client.test.ts` para o novo formato de `atualizarAnuncio` (payload com `price`) — depende de T005
- [X] T007 Criar `lib/estoque/publicacoes.ts`: repository de `publicacoesCanalFalhas` — `registrarFalhaPublicacao(produtoId, canal, operacao, motivo)`, `listarFalhasPendentes()` (data-model.md #3, #4) — depende de T002
- [X] T008 [P] Escrever testes em `lib/estoque/publicacoes.test.ts`. **Desvio do plano**: sem teste próprio — `registrarFalhaPublicacao`/`listarFalhasPendentes` são CRUD direto sobre o Mongo sem lógica computável isolável (mesmo padrão já aceito na Tarefa 5 para `criarPendencia`/`marcarSincronizado`, que também não têm teste unitário próprio); o projeto não mocka o driver do Mongo
- [X] T009 Generalizar `lib/estoque/sincronizacao.ts`: `sincronizarEstoqueProduto(produtoId, pedidoId)` → `sincronizarAnuncioProduto(produtoId, pedidoId, opcoes?: { canalOrigem?: Canal })` — passa a chamar `atualizarAnuncio` (T005) com quantidade e preço; quando `opcoes.canalOrigem` é informado, esse canal é excluído da lista a sincronizar (research.md #6, #8) — depende de T004, T005. **Desvio do plano**: `pedidoId` passou a aceitar `undefined` (junto com `RegistroSincronizacaoEstoque.pedidoId`, `criarPendencia`) — a sincronização disparada por uma edição de produto no admin (US3) não nasce de um pedido, ao contrário do abatimento por venda (data-model.md #3.1)
- [X] T010 [P] Atualizar `lib/estoque/abatimento.ts`: chama `sincronizarAnuncioProduto` (renomeada de T009) e passa `opcoes.canalOrigem = pedido.canalOrigem` quando `pedido.canalOrigem !== "site"` — depende de T009, T001
- [X] T011 [P] Atualizar `lib/estoque/sincronizacao.test.ts` para o novo parâmetro `canalOrigem` e o envio de `price` — depende de T009
- [X] T012 Criar `lib/pedidos/externos.ts`: `upsertPedidoExterno({ canal, pedidoExternoId, itens, valorTotal }): Promise<{ pedido: Pedido; criado: boolean }>` — `findOneAndUpdate` com `upsert: true` filtrando por `origemExterna.pedidoExternoId`, criando o pedido com `status: "pago"` e `canalOrigem` correspondente quando novo (research.md #1, #2, data-model.md #2) — depende de T001. **Desvio do plano**: implementado como find-then-insert com catch de erro 11000 (índice único), o mesmo padrão já usado em `criarPedido` (Tarefa 3), em vez de `findOneAndUpdate`/`upsert` — mais consistente com o resto do código e sem precisar inferir "foi criado agora" comparando timestamps
- [X] T013 [P] Escrever testes em `lib/pedidos/externos.test.ts` (primeira chamada cria o pedido; segunda chamada com o mesmo `pedidoExternoId` não cria um segundo pedido). **Desvio do plano**: sem teste próprio pelo mesmo motivo de T008 — `upsertPedidoExterno` é CRUD direto sobre o Mongo (mesmo padrão de `criarPedido`, que também não tem teste unitário próprio)
- [X] T014 [P] Estender `lib/produtos/repository.ts`: `buscarProdutoPorMercadoLivreId(itemId: string): Promise<Produto | null>` (busca reversa por `integracoes.mercadoLivreId`, usada pelo webhook de pedidos)

**Checkpoint**: Sincronização multicanal generalizada (preço + exclusão de canal de origem); caminho de criação idempotente de pedido externo pronto para o webhook.

---

## Phase 3: User Story 1 - Publicar um produto do site como anúncio no Mercado Livre (Priority: P1) 🎯 MVP

**Goal**: A partir de um produto cadastrado no site, criar um anúncio correspondente no Mercado Livre com título, descrição, preço, fotos e estoque, sem edição manual no painel do Mercado Livre.

**Independent Test**: Selecionar um produto de teste sem anúncio associado no Mercado Livre e publicá-lo; verificar que o anúncio aparece no painel do Mercado Livre com os dados do produto, e que `produto.integracoes.mercadoLivreId` foi preenchido.

### Implementation for User Story 1

- [X] T015 [P] [US1] Criar `lib/estoque/canais/mercadoLivre/anuncios.ts`: `enviarImagem(urlPublica: string): Promise<string>` (`POST /pictures/items/upload` com `source`, retorna o id da imagem) e `criarAnuncio(produto: Produto): Promise<string>` (resolve `category_id` via T003 — lança erro descritivo se não houver mapeamento; envia todas as `produto.fotos`; `POST /items` com título, descrição, preço, `available_quantity`, `category_id`, `pictures`; retorna o `item_id`) (contracts/mercado-livre-api.md, research.md #3, #4)
- [X] T016 [P] [US1] Escrever testes em `lib/estoque/canais/mercadoLivre/anuncios.test.ts` (`fetch` mockado: sucesso; categoria sem mapeamento; falha no upload de uma imagem; falha do `POST /items`)
- [X] T017 [US1] Criar `app/api/produtos/[id]/mercado-livre/publicar/route.ts`: `POST` — `409` se `produto.integracoes?.mercadoLivreId` já existir (FR-004); chama `criarAnuncio` (T015); sucesso grava `integracoes.mercadoLivreId` via `atualizarProduto`; falha chama `registrarFalhaPublicacao` (T007, `operacao: "criar"`) e retorna `422` (contracts/mercado-livre-api.md) — depende de T007, T015
- [X] T018 [P] [US1] Escrever testes de integração leve em `app/api/produtos/[id]/mercado-livre/publicar/route.test.ts` (409 quando já publicado; 201 com `mercadoLivreId` no corpo; 422 registrando falha) — depende de T017
- [X] T019 [US1] Adicionar botão "Publicar no Mercado Livre" em `components/admin/ProdutoForm.tsx`, visível quando `integracoes.mercadoLivreId` está vazio, chamando `POST /api/produtos/[id]/mercado-livre/publicar` (T017); mantém o campo de edição manual do ID já existente (Tarefa 5) (research.md #10) — depende de T017

**Checkpoint**: Um produto do site pode virar um anúncio real no Mercado Livre com uma ação só, sem digitar nada manualmente no painel do canal (MVP da tarefa).

---

## Phase 4: User Story 2 - Venda no Mercado Livre abate estoque e sincroniza os demais canais (Priority: P1)

**Goal**: Uma venda concluída no Mercado Livre desconta automaticamente o estoque do produto no site (MongoDB) e propaga a atualização para os demais canais configurados (Shopee), de forma idempotente.

**Independent Test**: Simular o recebimento da notificação de um pedido pago no Mercado Livre para um produto de teste (com `integracoes.mercadoLivreId` publicado na US1) e verificar que o estoque desse produto no site é reduzido; reenviar a mesma notificação e verificar que o estoque não muda de novo.

### Implementation for User Story 2

- [X] T020 [P] [US2] Criar `lib/estoque/canais/mercadoLivre/pedidos.ts`: `buscarPedidoMercadoLivre(orderId: string): Promise<{ itens: { itemId: string; quantidade: number }[] }>` — `GET /orders/{orderId}` autenticado (`obterAccessTokenValido`, Tarefa 5) (contracts/mercado-livre-api.md)
- [X] T021 [P] [US2] Escrever testes em `lib/estoque/canais/mercadoLivre/pedidos.test.ts` (`fetch` mockado: pedido com um e com múltiplos itens; erro HTTP propagado)
- [X] T022 [US2] Criar `app/api/webhooks/mercado-livre/pedidos/route.ts`: `POST` — valida `application_id` do payload contra `MERCADOLIVRE_CLIENT_ID`; extrai o `resource` (id do pedido) e chama `buscarPedidoMercadoLivre` (T020); para cada item, resolve `produtoId` via `buscarProdutoPorMercadoLivreId` (T014) — sem correspondência, registra inconsistência (`estoqueInconsistencias`, motivo `produto_removido`, Tarefa 5) e segue para os demais itens; chama `upsertPedidoExterno` (T012, `canal: "mercado_livre"`); quando `criado === true`, chama `abaterEstoquePedido(pedido)` (Tarefa 5, sem alteração — já dispara `sincronizarAnuncioProduto` com `canalOrigem: "mercado_livre"` via T010); responde `200` sempre, exceto `500` em falha transitória na consulta ao Mercado Livre (contracts/mercado-livre-api.md) — depende de T012, T014, T020. **Desvio do plano**: a inconsistência do item sem produto correspondente não referencia `produtoId`/`pedidoId` (não existem nesse caso) — `InconsistenciaEstoque` ganhou `origemExterna?: { canal, pedidoExternoId, itemIdCanal }` e os dois campos viraram opcionais (data-model.md #3.1); nova função exportada `registrarItemExternoSemProduto` em `lib/estoque/abatimento.ts` para esse caso, ao lado da já existente `registrarInconsistencia` (privada, usada pelo fluxo de venda do site)
- [X] T023 [P] [US2] Escrever testes de integração leve em `app/api/webhooks/mercado-livre/pedidos/route.test.ts` (notificação nova abate estoque e cria o pedido; reenvio da mesma notificação não abate de novo; item sem produto correspondente vira inconsistência sem travar os demais itens do mesmo pedido; `application_id` inválido não processa) — depende de T022

**Checkpoint**: As duas histórias P1 completas — uma venda em qualquer um dos dois canais nunca deixa o outro vendendo um produto esgotado (fecha o ciclo aberto na Tarefa 5).

---

## Phase 5: User Story 3 - Manter estoque e preço do anúncio atualizados (Priority: P2)

**Goal**: Alterações de preço (e estoque) feitas no site são refletidas automaticamente no anúncio já publicado no Mercado Livre, sem ação manual.

**Independent Test**: Alterar o preço de um produto de teste que já tem anúncio associado no Mercado Livre (via `PATCH /api/produtos/[id]`) e verificar que o preço anunciado nesse canal foi atualizado.

### Implementation for User Story 3

- [X] T024 [US3] Estender `app/api/produtos/[id]/route.ts` (`PATCH`): quando `produtoAtual.integracoes?.mercadoLivreId` existe e o payload altera `preco` ou `estoque`, chama `sincronizarAnuncioProduto` (T009) de forma best-effort após `atualizarProduto` (nunca lança exceção para quem chamou, mesmo padrão da Tarefa 5) — depende de T009. **Desvio do plano**: chama `sincronizarAnuncioProduto(id, undefined)` sem `pedidoId` — não há pedido envolvido em uma edição manual (ver desvio de T009)
- [X] T025 [P] [US3] Escrever testes em `app/api/produtos/[id]/route.test.ts` cobrindo o disparo condicional (dispara quando há `mercadoLivreId` e `preco`/`estoque` mudou; não dispara quando não há anúncio associado ou quando outro campo muda) — depende de T024
- [X] T026 [US3] Implementar `GET /api/anuncios/pendencias` em `app/api/anuncios/pendencias/route.ts`: lista `publicacoesCanalFalhas` não resolvidas (`listarFalhasPendentes`, T007) com nome do produto (contracts/mercado-livre-api.md, FR-011, SC-005) — depende de T007
- [X] T027 [P] [US3] Escrever testes em `app/api/anuncios/pendencias/route.test.ts`

**Checkpoint**: Todas as três histórias funcionando de ponta a ponta — anúncio criado, mantido atualizado e o canal fechando o ciclo em ambas as direções.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verificação final da feature completa.

- [X] T028 `npx tsc --noEmit` (ok), `npx vitest run` (96/96 passaram, 19 arquivos) e `npm run build` (ok — todas as rotas novas listadas: `/api/produtos/[id]/mercado-livre/publicar`, `/api/webhooks/mercado-livre/pedidos`, `/api/anuncios/pendencias`). `npm run lint` seguiu pulado — gap pré-existente já registrado nas Tarefas 4/5 (`next lint` removido no Next.js 16, projeto não migrou para `eslint.config.*`)
- [X] T029 Revisado `contracts/mercado-livre-api.md` e `data-model.md`: ajustada a descrição do passo 2 do webhook e adicionada a seção "3.1. Ajustes pós-implementação em modelos da Tarefa 5" documentando os campos opcionais (`InconsistenciaEstoque.produtoId`/`pedidoId`, `RegistroSincronizacaoEstoque.pedidoId`) descobertos necessários durante a implementação. `quickstart.md` já batia com o implementado, sem ajustes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — começa imediatamente.
- **Foundational (Phase 2)**: Depende de T001-T003 (modelo de dados).
- **US1 (Phase 3)**: Depende do Foundational completo (usa T003 para categorias; não depende do restante do Foundational em si, mas o Foundational é bloqueante por convenção do projeto).
- **US2 (Phase 4)**: Depende do Foundational completo (T010, T012, T014); pode avançar em paralelo a US1 (arquivos diferentes), mas seu teste independente pressupõe um produto já publicado (US1) para ter `mercadoLivreId` a resolver.
- **US3 (Phase 5)**: Depende do Foundational completo (T009); pode avançar em paralelo a US1/US2, mas seu teste independente pressupõe US1 (produto com anúncio associado) para ter o que atualizar.
- **Polish (Phase 6)**: Após todas as histórias.

### User Story Dependencies

- **User Story 1 (P1)**: Depende do Foundational; é o pré-requisito prático das outras duas (só existe anúncio a sincronizar ou pedido a receber depois de publicado).
- **User Story 2 (P1)**: Depende do Foundational; fecha o ciclo aberto na Tarefa 5 (canal → site).
- **User Story 3 (P2)**: Depende do Foundational; estende a sincronização já existente (Tarefa 5) para incluir preço.

### Within Each User Story

- Modelos/tipos antes de repositories.
- Repositories/domínio antes de rotas de API.
- Client do canal (Mercado Livre) antes de qualquer rota que o use.
- História completa antes de avançar para a próxima prioridade.

### Parallel Opportunities

- T001/T002/T003 podem rodar em paralelo entre si.
- T004/T007/T014 podem rodar em paralelo entre si; T005/T006 dependem de T004; T009/T010/T011 dependem de T004/T005/T009; T012/T013 dependem de T001.
- T015/T016/T020/T021 podem rodar em paralelo entre si (arquivos diferentes); T017/T022 dependem deles.
- T024/T026 podem rodar em paralelo entre si (arquivos diferentes).

---

## Parallel Example: Foundational

```bash
# Domínio puro em paralelo:
Task: "T004 Estender lib/estoque/canais/tipos.ts"
Task: "T007 Criar lib/estoque/publicacoes.ts"
Task: "T014 Estender lib/produtos/repository.ts com buscarProdutoPorMercadoLivreId"

# Depois, o que amarra os anteriores:
Task: "T009 Generalizar lib/estoque/sincronizacao.ts (depende de T004, T005)"
Task: "T012 Criar lib/pedidos/externos.ts (depende de T001)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup (T001-T003)
2. Phase 2: Foundational (T004-T014)
3. Phase 3: US1 (T015-T019)
4. **STOP and VALIDATE**: publicar um produto de teste e conferir o anúncio real criado no Mercado Livre
5. Continuar se pronto

### Incremental Delivery

1. Setup + Foundational + US1 → Produto do site pode virar anúncio real no Mercado Livre (MVP)
2. + US2 → Venda no Mercado Livre fecha o ciclo, abatendo estoque no site e propagando para a Shopee
3. + US3 → Preço (e estoque) do anúncio sempre atualizados após qualquer edição do produto no site
4. Cada história agrega valor sem quebrar as anteriores

---

## Notes

- [P] tasks = arquivos diferentes, sem dependências entre si.
- [Story] mapeia a tarefa à história para rastreabilidade.
- Nenhuma dependência nova de pacote — Mercado Livre continua integrado via `fetch` direto (mesma decisão da Tarefa 5); nenhuma env var nova (reaproveita `MERCADOLIVRE_CLIENT_ID`/`MERCADOLIVRE_CLIENT_SECRET`/`credenciaisCanais` já configurados).
- Cancelamento/devolução de pedido do Mercado Livre fica fora de escopo (spec.md, Assumptions).
- Textos de UI (ex: botão em `ProdutoForm.tsx`, mensagens de `GET /api/anuncios/pendencias` se exibido em tela) em PT-BR inline, seguindo o padrão I18N já existente do projeto.
- Após cada tarefa ou grupo lógico, validar com `npx tsc --noEmit` e `npx vitest run`.
- **Categoria do Mercado Livre**: `lib/estoque/canais/mercadoLivre/categorias.ts` (T003) começou com `MLB1574` ("Casa, Móveis e Decoração", nível 1) fixo — rejeitado em produção por ser categoria raiz. Substituído por descoberta automática via previsor do Mercado Livre (T033); `categorias.ts` ficou vazio, servindo só de override manual caso o previsor erre para algum caso específico.
- **T030 (adicionada após a implementação, a pedido do usuário)**: `despublicarAnuncio(itemId)` em `lib/estoque/canais/mercadoLivre/anuncios.ts` (`PUT /items/{id}` com `status: "closed"` — a API do Mercado Livre não permite excluir a maioria dos itens), `DELETE /api/produtos/[id]/mercado-livre/publicar` (fecha o anúncio e limpa `integracoes.mercadoLivreId`) e botão "Despublicar do Mercado Livre" em `ProdutoForm.tsx`, para permitir desfazer publicações de teste antes de validar o fluxo de vendas. Testes em `anuncios.test.ts` e `route.test.ts` cobrindo sucesso/404/409/422.
- **T031 (correção pós-implementação, encontrada testando em produção 2026-09-05)**: `POST /pictures/items/upload` **não** aceita upload de imagem por URL (`source` em `multipart/form-data`) — só arquivo binário; a API do Mercado Livre respondia HTTP 400. Corrigido: `enviarImagem` removida; `criarAnuncio` agora envia `pictures: produto.fotos.map((source) => ({ source }))` direto no corpo do `POST /items` (jeito correto documentado pelo Mercado Livre para imagens já públicas). `anuncios.test.ts` atualizado; `research.md` #3 e `contracts/mercado-livre-api.md` atualizados.
- **T032 (correção pós-implementação, encontrada testando em produção 2026-09-05)**: erros do Mercado Livre só expunham o HTTP status ("HTTP 400"), escondendo o motivo real — criado `lib/estoque/canais/mercadoLivre/erros.ts` (`erroMercadoLivre`) que inclui o corpo da resposta na mensagem, aplicado em `anuncios.ts`, `client.ts` e `pedidos.ts`; novo teste `erros.test.ts`. Isso revelou o erro real por trás do "HTTP 400" genérico.
- **T033 (correção pós-implementação, encontrada testando em produção 2026-09-05)**: a causa raiz dos erros de `POST /items` (pedia `family_name`, depois rejeitava `title`) era a categoria fixa `MLB1574` ser de nível 1 (raiz) — inválida para publicação direta. Trocado o mapeamento estático (research.md #5 original) por descoberta automática: novo `lib/estoque/canais/mercadoLivre/previsorCategoria.ts` (`preverCategoriaMercadoLivre`) consulta o previsor oficial do Mercado Livre (`GET /sites/MLB/domain_discovery/search?q=<título>`) a partir do nome do produto; `categorias.ts` (`resolverCategoriaMercadoLivre`) vira override manual opcional, com prioridade sobre o previsor quando preenchido. `family_name` continua obrigatório mesmo com a categoria correta (ver T034). Novo teste `previsorCategoria.test.ts`; `anuncios.test.ts` atualizado (cobre override, previsor e "sem correspondência"); `research.md` #4/#5 e `contracts/mercado-livre-api.md` atualizados.
- **T034 (correção pós-implementação, encontrada testando em produção 2026-09-05)**: com a categoria já correta (folha, via previsor), `POST /items` continuou pedindo `family_name` — confirmando que a conta vendedora está no modelo **User Products (UP)** do Mercado Livre, onde `family_name` é obrigatório e **substitui** `title` (o Mercado Livre gera o título otimizado a partir de `family_name` + atributos; enviar `title` junto retorna `body.invalid_fields`). Payload final de `criarAnuncio`: `family_name: produto.nome`, sem `title`. `anuncios.test.ts`, `research.md` #4 e `contracts/mercado-livre-api.md` atualizados.
- `LISTING_TYPE_ID` (`lib/estoque/canais/mercadoLivre/anuncios.ts`, `"gold_special"`) também precisa ser confirmado contra os tipos de anúncio disponíveis para a conta vendedora (`GET /users/{id}` → `listing_types_allowed`) antes de publicar em produção.
