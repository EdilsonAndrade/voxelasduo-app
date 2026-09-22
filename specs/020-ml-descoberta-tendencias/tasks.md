# Tasks: Descoberta de tendências via Mercado Livre

**Input**: `specs/020-ml-descoberta-tendencias/` (plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md)
**Tests**: Vitest para lógica pura, cache e rotas (conforme plan.md). UI verificada via Test Guide (quickstart.md).
**Textos**: pt-BR inline, padrão existente do admin (sem lib de i18n).

## Phase 1: Foundational (bloqueia as histórias)

- [X] T001 [P] Criar `lib/models/trendCache.ts`: `TREND_CACHE_COLLECTION`, `TrendCacheDocumento` (`TrendCacheBusca | TrendCacheGerais`), `ItemRankingCategoria` (`posicao`, `id`, `tipo: "PRODUCT"|"ITEM"|"USER_PRODUCT"`, `nome?`), `TendenciaGeral` (`termo`, `url`) — conforme data-model.md
- [X] T002 [P] Criar `lib/estoque/canais/mercadoLivre/tendencias.ts`: `preverCategoriaParaTendencia(termo)` (reaproveita `preverCategoriaMercadoLivre` de `previsorCategoria.ts`, devolve `{categoryId, categoriaNome?} | undefined`); `buscarMaisVendidosCategoria(categoryId)` (chama `GET /highlights/MLB/category/{id}`, resolve nome via `GET /products/{id}` só para `type: "PRODUCT"` em paralelo (`Promise.all`), demais tipos sem `nome`); `buscarTendenciasGerais()` (chama `GET /trends/MLB`, mapeia `keyword`→`termo`) — usa `obterAccessTokenValido` e `erroMercadoLivre` já existentes (research.md #2-#4)
- [X] T003 [P] Criar `lib/estoque/canais/mercadoLivre/tendencias.test.ts`: mock de `fetch`/`auth`; categoria resolvida e não encontrada; `highlights` misto (`PRODUCT` resolve nome, `ITEM`/`USER_PRODUCT` sem nome, sem quebrar); erro do ML propagado via `erroMercadoLivre`; mapeamento de `/trends/MLB`

**Checkpoint**: resolução de categoria, ranking por categoria e tendências gerais prontos e testados, sem rota/cache ainda.

## Phase 2: User Story 1 — Ver o ranking de mais vendido de um nicho (P1) 🎯 MVP

**Goal**: vendedor digita um termo e vê a categoria resolvida + ranking de mais vendido (posição + nome), sem preço/link (indisponíveis na API — aviso explícito).
**Independent Test**: pesquisar "chaveiro personalizado" e ver categoria + ranking; termo vazio bloqueia a busca; termo sem categoria mostra mensagem própria.

- [X] T004 [US1] Criar `app/api/admin/tendencias/route.ts`: `GET` valida `termo` (400 `termo_invalido` se vazio/só espaços); chama `preverCategoriaParaTendencia` (404 `categoria_nao_encontrada` se `undefined`); chama `buscarMaisVendidosCategoria`; devolve `{termo, origem: "novo", obtidoEm, avisoDesatualizado: false, categoriaId, categoriaNome?, ranking}` (sem cache ainda — vem na US3); erro de token → 401 `token_invalido`; outro erro do ML → 502 `falha_mercado_livre` (conforme contracts/tendencias.md)
- [X] T005 [US1] Criar `app/api/admin/tendencias/route.test.ts`: 200 com ranking; 400 termo vazio; 404 categoria não encontrada; 401 token inválido; 502 falha genérica — status e corpo nunca mascarados
- [X] T006 [US1] Criar `components/admin/TendenciasBusca.tsx`: campo de busca + botão pesquisar (bloqueia termo vazio/só espaços com aviso inline); ao pesquisar, chama `GET /api/admin/tendencias?termo=...`; mostra categoria resolvida e o ranking (posição + nome, "nome não disponível" quando `nome` ausente); aviso fixo e visível de que preço e link de anúncio não estão disponíveis (limitação da API); mensagens diferenciadas para 400/404/401/502; estado de carregamento
- [X] T007 [US1] Criar `app/admin/(painel)/tendencias/page.tsx`: renderiza `TendenciasBusca` dentro do `container` do admin, título "Descoberta de tendências (Mercado Livre)"
- [X] T008 [US1] Alterar `app/admin/(painel)/layout.tsx`: adicionar link "Tendências (ML)" para `/admin/tendencias` na navegação

**Checkpoint**: US1 funcional e testável isoladamente (sem cache/fallback ainda).

## Phase 3: User Story 2 — Ver tendências gerais do Mercado Livre (P2)

**Goal**: tela mostra, ao abrir, os termos em alta no Mercado Livre no momento; clicar num termo dispara a busca da US1.
**Independent Test**: abrir a tela sem pesquisar nada e ver a lista de tendências gerais; clicar num termo e ver o ranking da categoria correspondente.

- [X] T009 [P] [US2] Criar `app/api/admin/tendencias/gerais/route.ts`: `GET` chama `buscarTendenciasGerais()`, devolve `{origem: "novo", obtidoEm, avisoDesatualizado: false, termos}` (sem cache ainda); mesmos códigos de erro (401/502) que a rota de busca por termo
- [X] T010 [P] [US2] Criar `app/api/admin/tendencias/gerais/route.test.ts`: 200 com termos; 401; 502
- [X] T011 [US2] Alterar `components/admin/TendenciasBusca.tsx`: carregar `GET /api/admin/tendencias/gerais` ao montar; listar os termos como itens clicáveis que preenchem o campo de busca e disparam a pesquisa da US1

**Checkpoint**: tendências gerais aparecem ao abrir a tela e são clicáveis.

## Phase 4: User Story 3 — Reaproveitar buscas recentes (cache 24h) (P2)

**Goal**: repetir o mesmo termo (ou reabrir a tela) dentro de 24h não consulta o Mercado Livre de novo; "Atualizar" força nova consulta.
**Independent Test**: pesquisar o mesmo termo duas vezes e ver a segunda vir do cache, com data/hora da obtenção; clicar "Atualizar" e ver nova consulta.

- [X] T012 [US3] Criar `lib/tendencias/cache.ts`: `normalizarTermo(termo)` (`trim().toLowerCase()`, espaços colapsados); `obterComCache<T>({chave, forcar, buscarNovo})` — busca documento no `trend_cache`; se existe, `!forcar` e `obtidoEm` há menos de 24h, devolve `{dados: documento, origem: "cache", obtidoEm, avisoDesatualizado: false}`; senão chama `buscarNovo()`, faz upsert do resultado (`_id` = chave) e devolve `{dados, origem: "novo", obtidoEm: agora, avisoDesatualizado: false}` — erro de `buscarNovo()` apenas propagado nesta fase (fallback vem na US4)
- [X] T013 [US3] Criar `lib/tendencias/cache.test.ts`: cache vigente não chama `buscarNovo`; cache vencido chama; `forcar: true` sempre chama; upsert substitui o documento anterior; normalização trata maiúsculas/espaços como o mesmo termo
- [X] T014 [US3] Alterar `app/api/admin/tendencias/route.ts`: usar `obterComCache` (chave = termo normalizado) em vez de chamar `buscarMaisVendidosCategoria` direto; aceitar query `forcar=true`
- [X] T015 [US3] Alterar `app/api/admin/tendencias/route.test.ts`: cobre `origem: "novo"` vs `"cache"` e `forcar=true`
- [X] T016 [US3] Alterar `app/api/admin/tendencias/gerais/route.ts` (+ `route.test.ts`): mesma integração com `obterComCache`, chave fixa `"__gerais__"`
- [X] T017 [US3] Alterar `components/admin/TendenciasBusca.tsx`: exibir "obtido em ..." (busca e tendências gerais) e botão "Atualizar" que repete a chamada com `forcar=true`

**Checkpoint**: repetir busca em <24h não chama o ML; "Atualizar" força nova consulta; testável isoladamente.

## Phase 5: User Story 4 — Continuar funcionando quando o Mercado Livre falha (P2)

**Goal**: falha/indisponibilidade do ML mostra o cache vencido com aviso (quando existe) ou erro claro (quando não existe); status/corpo do erro nunca mascarados na aba Network.
**Independent Test**: simular falha do ML para um termo com cache vencido (mostra dados antigos + aviso) e para um termo sem cache (mostra erro), conferindo o status real na aba Network.

- [X] T018 [US4] Alterar `lib/tendencias/cache.ts`: quando `buscarNovo()` falha e existe documento cacheado (mesmo vencido), devolver `{dados: documento, origem: "cache", obtidoEm: documento.obtidoEm, avisoDesatualizado: true}` em vez de propagar o erro; quando falha e não há documento, propagar o erro original
- [X] T019 [US4] Alterar `lib/tendencias/cache.test.ts`: falha com cache vencido → fallback com `avisoDesatualizado: true`; falha sem cache → erro propagado
- [X] T020 [US4] Alterar `app/api/admin/tendencias/route.ts` (+ `route.test.ts`): capturar erro propagado e mapear para 401 `token_invalido` (reconectar ML) ou 502 `falha_mercado_livre`; nunca convertido em 200
- [X] T021 [US4] Alterar `app/api/admin/tendencias/gerais/route.ts` (+ `route.test.ts`): mesma distinção de erro
- [X] T022 [US4] Alterar `components/admin/TendenciasBusca.tsx`: exibir aviso "dados podem estar desatualizados" quando `avisoDesatualizado: true`; mensagens diferenciadas por causa do erro (reconectar Mercado Livre / categoria não encontrada / indisponibilidade)

**Checkpoint**: falha do ML degrada com aviso (com cache) ou erro claro (sem cache), nunca quebra a tela; erro real visível na aba Network.

## Phase 6: Polish

- [X] T023 [P] Revisar todos os textos pt-BR da tela (rótulos, avisos, erros, estado vazio) contra o padrão já usado no restante do admin
- [X] T024 Rodar `npx vitest run` e `npx tsc --noEmit`; corrigir falhas
- [X] T025 Revisar `quickstart.md` contra a implementação final e ajustar se necessário

## Dependencies & Execution Order

- Phase 1 → todas as demais. US1 (Phase 2) é o MVP e não depende de cache.
- US2 (Phase 3) depende só de Phase 1; T011 edita `TendenciasBusca.tsx` depois de T006 (sequencial).
- US3 (Phase 4) depende de US1 e US2 (envolve as duas rotas e o mesmo componente); T014/T016/T017 são sequenciais com as tarefas de US1/US2 que tocam os mesmos arquivos.
- US4 (Phase 5) depende de US3 (usa o cache/documento já existente para o fallback).
- Paralelos: T001–T003; T004/T009 (rotas diferentes, arquivos diferentes — mas T009 é independente de T004); T012/T013.

## Parallel Example: Phase 1

```bash
Task: "Criar lib/models/trendCache.ts"
Task: "Criar lib/estoque/canais/mercadoLivre/tendencias.ts"
Task: "Criar lib/estoque/canais/mercadoLivre/tendencias.test.ts"
```

## Implementation Strategy

MVP = Phase 1 + US1 (busca por termo com ranking, sem cache). Depois US2 (tendências gerais), US3 (cache 24h) e US4 (resiliência a falha), em ordem, validando cada checkpoint.
