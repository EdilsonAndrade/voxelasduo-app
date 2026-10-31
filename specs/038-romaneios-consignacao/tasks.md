# Tasks: Romaneios de consignação

**Input**: Design documents from `/specs/038-romaneios-consignacao/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md

**Tests**: funções puras e rotas com Vitest (padrão do projeto).

## Phase 1: Setup

- [X] T001 Criar tipos, coleção e limites em lib/models/romaneio.ts (data-model.md)

## Phase 2: Foundational

- [X] T002 [P] Validação do corpo do POST/PUT em lib/romaneios/validation.ts (+ lib/romaneios/validation.test.ts)
- [X] T003 [P] Resumos de lugar/romaneio, status derivado e adicionar/mesclar item em lib/romaneios/calculo.ts (+ lib/romaneios/calculo.test.ts)
- [X] T004 Repositório (listar com resumo, buscar, criar, atualizar, excluir) em lib/romaneios/repository.ts
- [X] T005 Rotas GET/POST em app/api/admin/romaneios/route.ts e GET/PUT/DELETE em app/api/admin/romaneios/[id]/route.ts (+ app/api/admin/romaneios/route.test.ts)
- [X] T006 Link "Romaneios" ao lado de "Controle de vendas" em app/admin/(painel)/layout.tsx

## Phase 3: User Story 1 - Montar e imprimir (P1) 🎯 MVP

**Independent Test**: criar romaneio com produto, item do Tempo de Impressão e item livre; conferir totais; imprimir.

- [X] T007 [P] [US1] Opções da busca (produtos + planos avulsos com preço de venda direta, sem planos ligados a produto) em lib/romaneios/opcoes.ts (+ lib/romaneios/opcoes.test.ts)
- [X] T008 [US1] Invocar skill `frontend-design` e criar components/admin/romaneios/romaneios.module.css
- [X] T009 [US1] Busca única com etiqueta de origem e item livre em components/admin/romaneios/BuscaItem.tsx
- [X] T010 [US1] Editor (cabeçalho, lugar, linhas com qtd/preço/subtotal, totais, salvar, excluir) em components/admin/romaneios/EditorRomaneio.tsx
- [X] T011 [US1] Página do editor em app/admin/(painel)/romaneios/[id]/page.tsx
- [X] T012 [US1] Ficha de impressão em components/admin/romaneios/FichaRomaneio.tsx e app/admin/(painel)/romaneios/[id]/imprimir/page.tsx

## Phase 4: User Story 2 - Vários lugares e repasse (P1)

**Independent Test**: repassar 2 de 5 vasos para outro lugar; conferir 3/2, "Tudo junto" = 5; imprimir só um lugar.

- [X] T013 [US2] `repassar` e `agruparTudoJunto` em lib/romaneios/calculo.ts (+ testes)
- [X] T014 [US2] Adicionar/editar/excluir lugar, ação Repassar e modos "Por lugar"/"Tudo junto" em components/admin/romaneios/EditorRomaneio.tsx
- [X] T015 [US2] Impressão inteira (seção por lugar + total geral) ou de um lugar (`?lugar=`) em components/admin/romaneios/FichaRomaneio.tsx

## Phase 5: User Story 3 - Acerto por lugar (P1)

**Independent Test**: 1 vendida, 1 devolvida, pagamento parcial → a receber correto; fechar acerto.

- [X] T016 [US3] `fecharAcerto` / `reabrir` em lib/romaneios/calculo.ts (+ testes)
- [X] T017 [US3] Colunas vendida/devolvida/no lugar, pagamentos e resumo por lugar e geral, fechar/reabrir em components/admin/romaneios/EditorRomaneio.tsx

## Phase 6: User Story 4 - Pago na hora (P2)

- [X] T018 [US4] `pagoNaHora` em lib/romaneios/calculo.ts (+ testes)
- [X] T019 [US4] Botão "Pago na hora" com escolha da forma e confirmação em components/admin/romaneios/EditorRomaneio.tsx

## Phase 7: User Story 5 - Lista e impressão do acerto (P2)

- [X] T020 [US5] Lista com filtro por status em components/admin/romaneios/ListaRomaneios.tsx e app/admin/(painel)/romaneios/page.tsx
- [X] T021 [US5] Colunas e resumo de acerto na impressão quando houver acerto em components/admin/romaneios/FichaRomaneio.tsx

## Phase 8: Polish

- [X] T022 Rodar `npx vitest run lib/romaneios app/api/admin/romaneios`, `npx tsc --noEmit` e lint dos arquivos novos

## Dependencies

Setup → Foundational → US1 → (US2, US3) → US4 → US5 → Polish. US2 e US3 mexem no mesmo editor, então em sequência.

## Parallel Example

T002 e T003 em paralelo; T007 em paralelo com T004/T005.

## Implementation Strategy

MVP = US1 (um lugar, imprimir). Depois lugares/repasse, acerto, pago na hora e lista.
