# Tasks: Montador de kits

**Input**: Design documents from `/specs/037-montador-kits/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: o projeto mantém testes Vitest para lógica pura e rotas (padrão das specs anteriores) — incluídos ao lado de cada módulo.

## Phase 1: Setup

- [X] T001 Invocar as skills `frontend-design` e `site-architecture` (CLAUDE.md) e registrar a direção visual do editor de kits seguindo `components/admin/admin.module.css`

## Phase 2: Foundational

- [X] T002 Criar `lib/models/kit.ts` com `KITS_COLLECTION`, `ValoresComponente`, `ItemKit`, `ReferenciaPreco`, `Kit` (data-model.md)
- [X] T003 [P] Adicionar `kitId?: string` em `Produto` em `lib/models/produto.ts`
- [X] T004 [P] Criar `lib/kits/componentes.ts` (+ `.test.ts`): `valoresDoComponente(produto, minutosPlano?)` (preço do site, peso, tempo, custo sem embalagem), `custoProducaoItemNovo(peso, minutos)` a partir de `VAZIO_CUSTO_PRODUCAO`, `custoItemNovo`, `precoSugeridoItemNovo(custo com embalagem, taxas)`
- [X] T005 [P] Criar `lib/kits/precificacaoKit.ts` (+ `.test.ts`): `taxasDosCanaisKit(taxasGlobais)` (site, Shopee por faixa, ML estimado 14% + R$ 6,50 < R$ 79), `calcularTotaisKit`, `margensNoPreco`, `sugerirFaixas`, `avaliarPrecoProprio`
- [X] T006 [P] Criar `lib/kits/validation.ts` (+ `.test.ts`): `validarKit(corpo)` com itens existentes e itens novos, faixas, preço, `reconfirmarPreco`
- [X] T007 Criar `lib/kits/repository.ts`: coleção, `listarKits` (resumo + desatualizado), `buscarKitDetalhe` (lê produtos atuais e planos do Tempo de Impressão), `salvarKit` (criar/substituir, cria rascunhos dos itens novos, grava referência), `excluirKit`, `vincularProdutoDoKit`

## Phase 3: User Story 1 - Montar kit com produtos existentes + totalizador (P1) 🎯 MVP

**Goal**: criar/editar/listar kits com produtos do catálogo e totalizador ao vivo.
**Independent Test**: criar kit com 2 produtos (um com quantidade 2), conferir totais, salvar e reabrir.

- [X] T008 [US1] Criar `app/api/admin/kits/route.ts` (+ `route.test.ts`): GET lista, POST cria (400/404/409 com status real)
- [X] T009 [US1] Criar `app/api/admin/kits/[id]/route.ts` (+ `route.test.ts`): GET, PUT, DELETE
- [X] T010 [P] [US1] Criar `components/admin/kits/kits.module.css` (layout em duas colunas: itens | totalizador+sugestão; empilha no celular)
- [X] T011 [US1] Criar `components/admin/kits/EditorKit.tsx`: nome, `SelectBusca` de produtos (sem produtos de kit; já adicionado soma quantidade), tabela de itens (peso, preço, tempo, "não informado"), quantidade, remover, embalagem do kit, totalizador ao vivo, salvar/excluir com erros visíveis
- [X] T012 [P] [US1] Criar `components/admin/kits/ListaKits.tsx` (nome, nº de itens, soma avulsa, preço, selo desatualizado, link do produto)
- [X] T013 [US1] Criar `app/admin/(painel)/kits/page.tsx` e `app/admin/(painel)/kits/[id]/page.tsx` ("novo" = kit vazio), carregando taxas, produtos e minutos do Tempo de Impressão
- [X] T014 [US1] Adicionar o link "Kits" no menu em `app/admin/(painel)/layout.tsx`

## Phase 4: User Story 2 - Sugestão de preço por faixas (P1)

**Goal**: faixas sobre a soma avulsa com margem por canal, bloqueio abaixo do piso, preço próprio.
**Independent Test**: soma R$ 100 → R$ 90/85/80 com margens; faixa abaixo do piso bloqueada.

- [X] T015 [US2] No `components/admin/kits/EditorKit.tsx`: painel "Sugestão de preço" (faixas editáveis, preço, economia, margem Site/Shopee/ML, bloqueio com motivo), escolher faixa, preço próprio com aviso ≥ soma e confirmação abaixo do piso

## Phase 5: User Story 3 - Item novo vira produto rascunho (P2)

**Goal**: item digitado com custo/preço/margem calculados; vira rascunho ao salvar.
**Independent Test**: adicionar "Rena 8 cm", salvar e achar o rascunho na lista de produtos.

- [X] T016 [US3] No `components/admin/kits/EditorKit.tsx`: formulário "Item novo" (nome, peso, tempo h/min, preço ajustável) com custo, preço sugerido e margem por canal; aviso de nome repetido com "usar o existente"; tratamento do 409 do servidor
- [X] T017 [US3] Em `lib/kits/repository.ts` + rotas: criação dos rascunhos (categoria padrão, `slugLivreNaCategoria`, `publicado: false`) e resposta `produtosCriados`

## Phase 6: User Story 4 - Transformar kit em produto (P2)

**Goal**: criar/atualizar produto do kit e abrir a edição.
**Independent Test**: criar produto do kit e ver preço, peso e itens inclusos preenchidos.

- [X] T018 [P] [US4] Criar `lib/kits/produtoDoKit.ts` (+ `.test.ts`): `custoProducaoDoKit` (custo agregado exato), `itensInclusosDoKit`, `dadosNovoProdutoDoKit`, `dadosAtualizacaoProdutoDoKit`
- [X] T019 [US4] Criar `app/api/admin/kits/[id]/produto/route.ts` (+ `route.test.ts`): POST cria (201) ou atualiza (200); 400 sem itens/preço; 404
- [X] T020 [US4] No `components/admin/kits/EditorKit.tsx`: botão "Criar produto do kit" / "Atualizar produto do kit" + link para o produto; redireciona para `/admin/produtos/<id>/editar` ao criar

## Phase 7: User Story 5 - Aviso de preço desatualizado (P3)

**Goal**: comparar referência × atual e avisar no kit, lista e produto do kit.
**Independent Test**: mudar preço de componente → aviso ao reabrir o kit.

- [X] T021 [P] [US5] Criar `lib/kits/desatualizacao.ts` (+ `.test.ts`): `compararReferencia(referencia, itensAtuais)`
- [X] T022 [US5] No `components/admin/kits/EditorKit.tsx`: faixa de aviso com o que mudou, itens "produto removido", "Confirmar preço atual" (`reconfirmarPreco`)
- [X] T023 [US5] Em `app/admin/(painel)/produtos/[id]/editar/page.tsx`: aviso "Produto gerado pelo kit X" com link e selo de desatualizado

## Phase 8: User Story 6 - Levar kit para a calculadora (P3)

**Goal**: calculadora preenchida a partir do kit.
**Independent Test**: "Levar para a calculadora" abre com custo/peso/tempo/preço do kit.

- [X] T024 [US6] Adicionar `valoresDoKit` em `lib/produtos/calculadoraDoProduto.ts` (+ teste em `calculadoraDoProduto.test.ts`)
- [X] T025 [US6] Suportar `?kit=` em `app/admin/(painel)/produtos/calculadora/page.tsx` (redirect para `?produto=` quando houver produto; 404; volta ao kit sem preço)
- [X] T026 [US6] Botão "Levar para a calculadora" em `components/admin/kits/EditorKit.tsx`

## Phase 9: Polish

- [X] T027 Rodar `npx vitest run` e `npx tsc --noEmit` e corrigir falhas
- [X] T028 Revisar textos pt-BR, estados vazios e layout no celular em `components/admin/kits/*`

## Dependencies

- Phase 2 bloqueia todas as histórias. US1 → US2/US3/US4/US5/US6 (todas usam o editor). US4 antes de US6 (redirect para o produto). US5 depende só de T021 + repository.

## Parallel Examples

- T003, T004, T005, T006 em paralelo (arquivos distintos).
- T010 e T012 em paralelo ao T011.
- T018 e T021 em paralelo.

## Implementation Strategy

MVP = Phase 1–4 (montar kit + totalizador + sugestão de preço). Depois US3 → US4 → US5 → US6, validando cada um pelo quickstart.
