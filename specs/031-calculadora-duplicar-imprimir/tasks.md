# Tasks: Duplicar cálculo e imprimir orçamentos

**Input**: Design documents from `/specs/031-calculadora-duplicar-imprimir/`
**Tests**: só para a lógica pura (padrão do projeto, Vitest).

## Phase 1: Setup

- [X] T001 Adicionar `alturaCm?: string` em `CalculadoraValores` em lib/models/calculoPreco.ts

## Phase 2: Foundational

- [X] T002 Criar `faixasDoCanal(canal, canais)`, `montarOrcamentoProduto(valores, canal, unidadesKit)` e `idsDaQuery(texto)` em lib/produtos/orcamento.ts, com testes em lib/produtos/orcamento.test.ts
- [X] T003 Trocar a função local `faixasDoCanal` de components/admin/CalculadoraRapida.tsx pela da lib

## Phase 3: User Story 2 — Altura da peça (P1)

- [X] T004 [US2] Campo "Altura da peça" (cm) ao lado de "Filamento usado", gravado em `valores.alturaCm`, em components/admin/CalculadoraRapida.tsx
- [X] T005 [US2] Passar `alturaCm` para a lista em app/admin/(painel)/produtos/calculadora/page.tsx e mostrar "N cm" em components/admin/CalculosSalvos.tsx

## Phase 4: User Story 1 — Duplicar (P1)

- [X] T006 [US1] "Duplicar com outro nome" (nome sugerido "(cópia)", POST sem produtoId, abre a cópia, erro com status) em components/admin/CalculadoraRapida.tsx + estilos em components/admin/calculadoraRapida.module.css

## Phase 5: User Story 3 — Imprimir (P1)

- [X] T007 [US3] `buscarCalculosPreco(ids)` mantendo a ordem em lib/produtos/calculosPreco.ts
- [X] T008 [US3] Seleção (marcar/todos) e botão "Imprimir selecionados" em components/admin/CalculosSalvos.tsx
- [X] T009 [US3] Invocar skill `frontend-design`; página app/admin/(painel)/produtos/calculadora/imprimir/page.tsx
- [X] T010 [US3] components/admin/OrcamentoImpressao.tsx + orcamentoImpressao.module.css: canal, kit, premissas, tabela avulso/kit, botão Imprimir, `@media print` A4 deitado

## Phase 6: Polish

- [X] T011 `npx tsc --noEmit` e `npx vitest run lib/produtos`
- [X] T012 Test Guide (quickstart.md)

## Dependencies

T001 → T002 → T003/T004/T010; T007 → T009 → T010; T005 → T008 (mesmo arquivo).
