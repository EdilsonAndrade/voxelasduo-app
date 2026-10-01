# Tasks: Lista de preços para evento e edição rápida de preços

**Input**: `specs/028-lista-precos-evento/` (plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md)
**Linear**: EDI-126

## Phase 1: Setup
- [X] T001 Invocar a skill `frontend-design` para a direção visual da lista editável e da lista impressa (regra do CLAUDE.md)

## Phase 2: Foundational
- [X] T002 [P] Criar helpers puros `textoParaCentavos`, `centavosParaTexto` e `ordenarPorNome` em lib/produtos/precoLista.ts
- [X] T003 [P] Testes Vitest dos helpers em lib/produtos/precoLista.test.ts (vírgula/ponto, vazio, zero, negativo, ordenação com acentos e maiúsculas)
- [X] T004 Extrair a tabela de /admin/produtos para o client component components/admin/ListaProdutosAdmin.tsx, recebendo `ProdutoLinha[]` preparado em app/admin/(painel)/produtos/page.tsx (sem mudar o comportamento atual: categoria, estoque, canais, destaques, editar/duplicar)
- [X] T005 [P] Criar components/admin/listaProdutos.module.css com tabela no desktop e cartões no ≤768px (sem rolagem horizontal)

## Phase 3: User Story 1 – Lista de preços impressa (P1) 🎯 MVP
**Independent Test**: marcar produtos, gerar a lista, conferir ordem/preços e salvar em PDF sem menus.
- [X] T006 [US1] Coluna de seleção, "marcar/desmarcar todos" e barra fixa "Gerar lista de preços (N)" (abre `/admin/produtos/lista-precos?ids=...` em nova aba; desabilitada sem seleção) em components/admin/ListaProdutosAdmin.tsx
- [X] T007 [P] [US1] Criar components/admin/ImprimirButton.tsx (`window.print()`)
- [X] T008 [US1] Criar a página app/admin/(painel)/produtos/lista-precos/page.tsx (busca por ids com `listarProdutosPorIds`, ignora ids inválidos, ordena com `ordenarPorNome`, título, data, Produto | Preço, aviso quando vazio)
- [X] T009 [P] [US1] Criar app/admin/(painel)/produtos/lista-precos/listaPrecos.module.css (tela + `@media print`: fundo branco, texto preto, linhas sem quebra no meio, preço à direita)
- [X] T010 [US1] Esconder o "chrome" na impressão: `.nao-imprimir` em app/globals.css, wrapper em components/ChromeDoSite.tsx e `.topoAdmin` em components/admin/admin.module.css

## Phase 4: User Story 2 – Editar preços na lista (P2)
**Independent Test**: alterar o preço de uma linha, salvar, recarregar e conferir; outras linhas não são gravadas.
- [X] T011 [US2] Criar components/admin/LinhaPrecoProduto.tsx: campos preço do site e preço do ML (`inputMode="decimal"`), destaque de alteração, validação, PATCH em `/api/produtos/[id]` com `precosCanais` mesclado (preserva Shopee), mensagens "Salvo"/erro com status real
- [X] T012 [US2] Usar LinhaPrecoProduto na coluna Preço e registrar alterações pendentes para o aviso `beforeunload` em components/admin/ListaProdutosAdmin.tsx

## Phase 5: User Story 3 – Custo na lista (P3)
**Independent Test**: custo da lista = custo total da tela de edição; "—" sem custo.
- [X] T013 [US3] Calcular `custoCentavos` com `calcularCustoProducao(...).totalCentavos` em app/admin/(painel)/produtos/page.tsx e exibir a coluna Custo em components/admin/ListaProdutosAdmin.tsx

## Phase 6: Polish
- [X] T014 Rodar `npx tsc --noEmit`, `npm run lint` e `npm test`
- [X] T015 Revisar quickstart.md (Test Guide) e sugerir a mensagem de commit (sem commitar)

## Dependencies
- T002 → T008, T011. T004 → T006, T012, T013. T010 independe das demais.
- US1, US2 e US3 tocam o mesmo componente (ListaProdutosAdmin), então são sequenciais nesse arquivo.

## Parallel
- T002/T003/T005 juntos; T007/T009 junto com T008.

## Strategy
MVP = Phase 1–3 (lista impressa para o evento). Depois US2 e US3.
