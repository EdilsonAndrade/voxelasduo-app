# Tasks: Tempo de Impressão

**Input**: specs/035-tempo-de-impressao/ (plan, spec, research, data-model, contracts/api.md, quickstart)
**Tests**: incluídos (padrão do projeto: Vitest para funções puras e rotas).
**Branch**: main, sem commits.

## Phase 1: Setup

- [X] T001 Criar o modelo `PLANOS_IMPRESSAO_COLLECTION = "planosImpressao"`, `ItemImpressao { id, nome, minutos, inicio? }` e `PlanoImpressao { _id?, produtoId, itens, criadoEm, atualizadoEm }` em lib/models/planoImpressao.ts

## Phase 2: Foundational

- [X] T002 [P] Adicionar `terminoPrevisto(inicio: string, minutos: number): { horario: string; diasDepois: number } | null` em lib/producao/agenda.ts (reusa `minutosDe`; inválido/minutos ≤ 0 → null)
- [X] T003 [P] Testes de `terminoPrevisto` (mesmo dia, virada de dia, +2 dias, entrada inválida) em lib/producao/agenda.test.ts
- [X] T004 Funções puras `validarItens` (nome obrigatório ≤120, único sem maiúsculas/espaços; minutos inteiro 1..20160; inicio `HH:MM` ou vazio; 1..50 itens; gera `id` via `crypto.randomUUID()` quando ausente), `mesclarItens(atuais, recebidos)` e `totalMinutos` em lib/producao/planosImpressao.ts
- [X] T005 [P] Testes de `validarItens`, `mesclarItens` (atualiza pelo nome normalizado mantendo id/início, acrescenta novos, mantém os demais) e `totalMinutos` em lib/producao/planosImpressao.test.ts
- [X] T006 Repositório `listarPlanos` (junta `produtoNome`, ignora produto inexistente, ordena por `atualizadoEm` desc), `buscarPlano`, `criarPlano`, `mesclarPlano`, `substituirItens`, `excluirPlano` (usado também na exclusão do produto) e índice único em `produtoId` (via `criarGarantiaDeIndices`) em lib/producao/planosImpressaoRepository.ts
- [X] T007 Rotas GET/POST (`modo` criar|mesclar; 409 se já existe em criar; 404 produto inexistente; 400 inválido) em app/api/admin/tempo-impressao/route.ts
- [X] T008 Rotas PUT/DELETE em app/api/admin/tempo-impressao/[produtoId]/route.ts
- [X] T009 [P] Testes das rotas com repositório mockado em app/api/admin/tempo-impressao/route.test.ts (cobre as duas rotas)
- [X] T010 Apagar o plano ao excluir o produto (`excluirPlano`) em `removerProduto` de lib/produtos/repository.ts

## Phase 3: US1 + US2 — Cadastrar tempos e planejar início/término (P1) 🎯 MVP

**Goal**: selecionar produto, cadastrar partes/produto inteiro com tempo, início salvo e término calculado, editar e remover.
**Independent Test**: quickstart passos 1–5.

- [X] T011 [US1] Invocar as skills `frontend-design` e `site-architecture` e registrar a direção no componente (sem nova paleta; usa estilos do admin)
- [X] T012 [US1] Link "Tempo de Impressão" após "Produção" em app/admin/(painel)/layout.tsx
- [X] T013 [US1] Página server que carrega `listarPlanos` e as opções de produtos (`listarProdutos` sem filtro de publicação: id + nome) em app/admin/(painel)/tempo-impressao/page.tsx
- [X] T014 [US1] `PlanejamentoImpressao` (SelectBusca de produto + "Adicionar"; produto já no menu rola até o card; botão "Gerar ficha (PDF)"; lista de cards) em components/admin/tempoImpressao/PlanejamentoImpressao.tsx
- [X] T015 [US1] [US2] `PlanoProdutoCard` (linhas com checkbox, nome, horas, minutos, início `type=time`, término "→ termina 08:02 (dia seguinte)"; total; "Adicionar parte"; "Remover selecionadas"; "Salvar" via PUT; "Remover do menu" via DELETE com confirmação; erros com HTTP) em components/admin/tempoImpressao/PlanoProdutoCard.tsx
- [X] T016 [P] [US1] Estilos em components/admin/tempoImpressao/tempoImpressao.module.css

## Phase 4: US3 — Levar peças da Produção (P2)

**Goal**: botão no card da apuração envia as impressões marcadas e mescla pelo nome.
**Independent Test**: quickstart passo 6.

- [X] T017 [US3] Função pura `itensDaApuracao(partes, foraDoCusto)` → por parte, a impressão marcada, concluída e com duração mais recente → `{ nome: parte, minutos: ceil(duracao/60) }` em lib/producao/planosImpressao.ts
- [X] T018 [P] [US3] Testes de `itensDaApuracao` em lib/producao/planosImpressao.test.ts
- [X] T019 [US3] Botão "Levar ao Tempo de Impressão" (desabilitado sem marcadas; POST `modo: "mesclar"`; aviso com link para /admin/tempo-impressao; erro com HTTP) em components/admin/producao/ApuracaoProdutos.tsx

## Phase 5: US4 — Ficha em PDF (P3)

**Goal**: ficha em lista com produto, total e partes (tempo, início, término).
**Independent Test**: quickstart passo 7.

- [X] T020 [US4] Página server em app/admin/(painel)/tempo-impressao/imprimir/page.tsx
- [X] T021 [US4] `FichaTempoImpressao` (lista, vazio "nenhum item", `ImprimirButton`, `@media print` esconde o topo do admin) em components/admin/tempoImpressao/FichaTempoImpressao.tsx e tempoImpressao.module.css

## Phase 6: Polish

- [X] T022 `npx tsc --noEmit` ok; `npm test` 1140/1141 (falha pré-existente em app/api/pedidos/[id]/route.test.ts, também na main limpa); lint indisponível (sem eslint.config no projeto)
- [X] T023 Marcar tarefas concluídas e conferir quickstart

## Dependencies

T001 → T004/T006 → T007/T008 → US1 (T013–T015) → US3 (T019) e US4 (T020–T021). T002 independente. US3 e US4 independentes entre si.

## Parallel

- T002/T003, T005, T009, T016, T018 em arquivos próprios.

## Strategy

MVP = Phases 1–3. Depois US3 (importação) e US4 (ficha).
