# Tasks: Pesquisa de nichos para impressão em escala

**Input**: Design documents from `/specs/030-pesquisa-nichos/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/nichos.md

**Tests**: incluídos para lógica pura, clientes externos (com `fetchImpl` injetado) e rotas — padrão do projeto (Vitest).

## Phase 1: Setup

- [X] T001 Criar tipos `FiltrosNicho`, `PerfilSugerido`, `ModeloSugerido`, `Concorrencia`, `Potencial`, `Oportunidade`, `ResultadoNichosCategoria`, `ResultadoNichosTermo` em lib/models/nicho.ts (data-model.md)
- [X] T002 [P] Criar lista fixa de categorias do ML (id, nome, grupo) em lib/nichos/categorias.ts (research.md e spec Assumptions)

## Phase 2: Foundational

- [X] T003 [P] Implementar `nivelConcorrencia`, `classificarPotencial`, `licencaPermiteVenda`, `escolherPerfil` (filtros 1 cor/A1, tempo A1 via otherCompatibilityModelInfo, melhor por printCount) em lib/nichos/classificacao.ts, com testes em lib/nichos/classificacao.test.ts
- [X] T004 [P] Implementar cliente MakerWorld `criarClienteMakerWorld({ fetchImpl })` com `buscarModelos(termo)` e `buscarDesign(id)` e `ErroMakerWorld(status)` em lib/nichos/makerworld.ts, com testes em lib/nichos/makerworld.test.ts
- [X] T005 [P] Adicionar `buscarTendenciasCategoria(categoryId)` e `contarProdutosCatalogo(termo)` em lib/estoque/canais/mercadoLivre/tendencias.ts, com testes em lib/estoque/canais/mercadoLivre/tendencias.test.ts
- [X] T006 Implementar orquestração `pesquisarCategoria` e `pesquisarTermo` (concorrência 4, 20 termos, ≥300 downloads, até 3 modelos, oculta potencial baixo) com dependências injetáveis em lib/nichos/pesquisa.ts, com testes em lib/nichos/pesquisa.test.ts

## Phase 3: User Story 1 — Descobrir oportunidades por categoria (P1) 🎯 MVP

**Goal**: escolher categorias + filtros e ver oportunidades médio/alto com concorrência e modelos.
**Independent Test**: pesquisar "Organização para Casa" e ver oportunidades com modelos de 1 cor, tempo e gramas.

- [X] T007 [US1] Rota GET em app/api/admin/nichos/categoria/route.ts (cache `nichos:cat:*` via `obterComCache`, erros 400/401/502 com `statusOrigem`), com testes em app/api/admin/nichos/categoria/route.test.ts
- [X] T008 [US1] Invocar skill `frontend-design` e criar página app/admin/(painel)/nichos/page.tsx
- [X] T009 [US1] Componente components/admin/PesquisaNichos.tsx + components/admin/pesquisaNichos.module.css: filtros, uma requisição por categoria em paralelo, cards de oportunidade, contador de ocultas, aviso de desatualizado, botão atualizar, "Abrir no MakerWorld"
- [X] T010 [US1] Link "Pesquisa de nichos" no menu em app/admin/(painel)/layout.tsx

## Phase 4: User Story 2 — Levar para a calculadora (P1)

**Goal**: modelo vira cálculo salvo e abre a calculadora preenchida.
**Independent Test**: clicar "Levar para a calculadora" e ver tempo/gramas/nome/link preenchidos.

- [X] T011 [US2] Mover `valoresPadrao` e `ANUNCIO_PADRAO` de components/admin/CalculadoraRapida.tsx para lib/produtos/calculadoraPadrao.ts e atualizar o import no componente
- [X] T012 [US2] Implementar `montarCalculoDoModelo` (horas 2 casas, gramas, produção quando 1 mesa, nome com mesas) em lib/nichos/calculo.ts com testes em lib/nichos/calculo.test.ts
- [X] T013 [US2] ~~Rota POST própria~~ — substituída: o botão usa a rota já existente `POST /api/admin/calculos-preco` com o corpo de `montarCalculoDoModelo`; a validação dela é coberta em lib/nichos/calculo.test.ts
- [X] T014 [US2] Botão "Levar para a calculadora" em components/admin/PesquisaNichos.tsx (POST + `router.push('/admin/produtos/calculadora?id=')`, erro visível)

## Phase 5: User Story 3 — Pesquisar por link ou nome (P2)

**Goal**: colar link da Shopee/ML ou digitar nome e ver modelos + concorrência.
**Independent Test**: colar link da Shopee de porta-caneta e ver modelos; links vão para o cálculo.

- [X] T015 [P] [US3] Implementar `nomeDoLink(url)` e `tipoDoLink(url)` em lib/nichos/linkProduto.ts com testes em lib/nichos/linkProduto.test.ts
- [X] T016 [US3] Rota GET em app/api/admin/nichos/termo/route.ts (cache `nichos:termo:*`), com testes em app/api/admin/nichos/termo/route.test.ts
- [X] T017 [US3] Seção "Achei um produto" em components/admin/PesquisaNichos.tsx: campos de link Shopee/ML e nome editável, resultado, links repassados ao "Levar para a calculadora"

## Phase 6: Polish

- [X] T018 Rodar `npx tsc --noEmit` e `npx vitest run lib/nichos lib/produtos lib/estoque/canais/mercadoLivre app/api/admin/nichos`
- [X] T019 Test Guide final para o usuário (quickstart.md)

## Dependencies

- T001 → T003–T006; T003/T004/T005 → T006 → T007/T016
- US1 (T007–T010) → US2 (T014 usa os cards) → US3 (T017 reaproveita os cards)
- T011 → T012 → T013 → T014

## Parallel Examples

- T002, T003, T004, T005, T015 em arquivos diferentes, sem dependência entre si.

## Implementation Strategy

MVP = Phase 1–3 (lista de oportunidades). Em seguida US2 (calculadora) e US3 (link) — todas nesta entrega.
