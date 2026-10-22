# Tasks: Verba de desconto (cupons e promoções)

**Input**: Design documents from `/specs/034-verba-de-desconto-cupons/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: o projeto mantém `.test.ts` ao lado da lógica — testes incluídos para funções puras, validações, migração e rota nova.

## Phase 1: Setup

- [X] T001 Conferir que não há lib de i18n nem skills de design disponíveis (research #7/#8) e seguir textos pt-BR inline e estilos de `components/admin/admin.module.css`

---

## Phase 2: Foundational (régua % do preço — bloqueia todas as histórias)

- [X] T002 Em `lib/models/configuracao.ts`: adicionar `cupomLojaPercentual`, `cupomLojaTetoCentavos: number | null`, `cupomLojaCestaMinimaCentavos` em `TaxasCanaisConfig`; `reguaMargem?: "preco"` em `TaxasCanaisDocumento`; `TAXAS_CANAIS_PADRAO` com piso 25, desejada 40, cupom 0/null/0; atualizar docs das margens para "% do preço"
- [X] T003 [P] Em `lib/models/produto.ts`: docs de `margemMinimaPercentual`/`margemDesejadaPercentual` em % do preço e novo `margensParaRevisar?: { minimaSobreCusto?: number; desejadaSobreCusto?: number; migradoEm: Date }` em `Produto`
- [X] T004 Em `lib/produtos/canais.ts`: `calcularPrecoSugeridoCanal`/`calcularPrecoMinimoCanal` passam a `(custo + fixa) / (1 − taxa% − margem%)` por faixa (reaproveitar a lógica de `calcularPrecoPorMargem` de `lib/produtos/calculadoraRapida.ts`, `null` quando impossível); `calcularResultadoCanal` com `margemPercentual = lucro ÷ preço` e novo `markupPercentual = lucro ÷ custo`; manter a função antiga de markup como `calcularPrecoPorMarkupCanal` para a sugestão da migração
- [X] T005 Atualizar `lib/produtos/canais.test.ts` para a régua nova (preço sugerido dá exatamente a margem do preço; margem + taxa ≥ 100 → `null`; markup informativo)
- [X] T006 [P] Em `lib/produtos/precificacao.ts`: `calcularPrecoSugerido = custo / (1 − taxa% − margem%)` (null se ≥ 100) e `calcularSimulacaoPrecificacao` com margem sobre o preço + `markupPercentual`; ajustar testes existentes, se houver
- [X] T007 [P] Em `lib/configuracoes/validation.ts` (+ `.test.ts`): margens 0 ≤ x < 100; `cupomLojaPercentual` 0 ≤ x < 100; `cupomLojaTetoCentavos` null ou ≥ 0; `cupomLojaCestaMinimaCentavos` ≥ 0
- [X] T008 [P] Em `lib/produtos/taxasCanaisFormulario.ts` e `lib/produtos/validation.ts` (+ testes): margens do produto 0 ≤ x < 100 com mensagem "A margem é sobre o preço de venda: use um valor menor que 100%."
- [X] T009 Em `lib/configuracoes/repository.ts`: ler/salvar os campos do cupom de loja (padrões quando ausentes) e salvar com `reguaMargem: "preco"`

**Checkpoint**: régua única em todo o código; `npm test` verde.

---

## Phase 3: User Story 2 – Margem padronizada em % do preço (P1)

**Goal**: telas de produto/taxas mostram margens em % do preço com markup informativo; valores antigos migrados (opção C).
**Independent Test**: margem desejada 40% → preço sugerido com lucro de 40% do preço, igual à calculadora.

- [X] T010 [US2] Criar `lib/configuracoes/migracaoMargens.ts`: `migrarMargensParaPreco(colecoes)` — reivindica via `updateOne({ _id: "taxasCanais", reguaMargem: { $ne: "preco" } }, { $set: { reguaMargem: "preco", margemMinimaPercentual: 25, margemDesejadaPercentual: 40, atualizadoEm } }, { upsert: true })` (E11000 = já migrado); se reivindicou, `bulkWrite` nos produtos com override: grava `margensParaRevisar` e `$unset` das duas margens; e `sugerirMargemPreco(custo, markupAntigo, taxaShopee)` (preço pela fórmula antiga → lucro ÷ preço)
- [X] T011 [P] [US2] Testes em `lib/configuracoes/migracaoMargens.test.ts`: migra uma vez, idempotente, concorrência (E11000), produtos sem override intocados, sugestão 80% sobre custo → ~32% (custo R$ 59,57, Shopee)
- [X] T012 [US2] Chamar `migrarMargensSeNecessario` no início de `buscarTaxasCanais()` em `lib/configuracoes/repository.ts` (pula quando o documento já tem `reguaMargem`)
- [X] T013 [US2] Em `lib/produtos/repository.ts`: `listarMargensParaRevisar()` (id, nome, valores antigos, custo, preço Shopee/site) e `removerMargensParaRevisar(id)`
- [X] T014 [US2] Criar `app/api/admin/produtos/[id]/margens-revisar/route.ts` (DELETE → 204; 400 id inválido; 404 não encontrado) + `route.test.ts`
- [X] T015 [US2] Criar `components/admin/MargensParaRevisar.tsx`: tabela produto · antes (% sobre o custo) · sugestão (% do preço na Shopee) · "Abrir" (`/admin/produtos/{id}`) · "Marcar revisado" (DELETE; erro mostrado com status)
- [X] T016 [US2] Em `app/admin/(painel)/configuracoes/page.tsx`: carregar a lista e calcular a sugestão (via `sugerirMargemPreco`), renderizar `MargensParaRevisar` abaixo do formulário
- [X] T017 [US2] Em `components/admin/TaxasCanaisForm.tsx`: rótulos "Piso de lucro (% do preço)" e "Margem desejada padrão (% do preço)" com dica "de cada R$ 100 vendidos, quanto fica com você"
- [X] T018 [US2] Em `components/admin/ProdutoForm.tsx`: rótulos "(% do preço)", aviso com os valores antigos quando `margensParaRevisar` existir, e erro de margem ≥ 100
- [X] T019 [US2] Em `components/admin/SimuladorPrecificacao.tsx`: textos "% do preço" + "(markup X% sobre o custo)"; alertas de margem baixa em % do preço; bloco "Promoções" com lucro mínimo = preço atual × piso e preço mínimo pela fórmula nova
- [X] T020 [US2] Em `components/admin/CalculadoraRapida.tsx` (`criarProduto`): gravar `margemDesejadaPercentual` = margem do preço do site (`vendaSite.margemPrecoPercentual`, arredondada) em vez do markup

**Checkpoint**: régua única visível; lista de revisão funcionando.

---

## Phase 4: User Story 3 – Configurar cupom de loja e piso (P1)

**Goal**: cupom de loja global editável.
**Independent Test**: salvar 3% / teto R$ 5 / cesta R$ 10, recarregar e conferir.

- [X] T021 [US3] Em `components/admin/TaxasCanaisForm.tsx`: grupo "Cupom de loja (Shopee)" com % de desconto, teto em R$ + checkbox "Sem limite", valor mínimo da cesta (informativo); enviar em centavos/null; erros por campo
- [X] T022 [P] [US3] Atualizar `app/api/admin/configuracoes/taxas/route.test.ts` com os campos novos (válido, teto null, inválidos → 400)

---

## Phase 5: User Story 1 – Ver a verba de desconto de um produto (P1) 🎯 MVP

**Goal**: card de cada canal mostra margem, piso, verba, cupom de loja e sobra.
**Independent Test**: produto Shopee 42,9% → verba 17,9%, cupom 3%, sobra 14,9%.

- [X] T023 [US1] Criar `lib/produtos/verbaDesconto.ts`: `cupomLojaReal(preco, cupom)`, `calcularVerbaDesconto({ precoCentavos, pisoPercentual, cupomLoja | null, lucroEm })`, `simularDesconto(verba, descontoPercentual, lucroEm)` conforme data-model
- [X] T024 [P] [US1] Testes em `lib/produtos/verbaDesconto.test.ts`: exemplo do curso (42,9 − 25 − 3 = 14,9), teto (R$ 300 → R$ 5 / 1,67%), sem cupom, abaixo do piso, `semCupomLoja`, simulação dentro da sobra mantém margem ≥ piso, troca de faixa Shopee
- [X] T025 [US1] Criar `components/admin/VerbaDesconto.tsx`: linhas margem atual · piso · verba · cupom de loja (R$ e %) · sobra (R$ e %) com alertas por estado; prop opcional para o simulador (US4)
- [X] T026 [US1] Em `components/admin/SimuladorPrecificacao.tsx`: substituir a linha "Desconto: aceite promoções de até…" por `VerbaDesconto` sobre o preço atual do canal (`lucroEm = preço − comissaoCanal − custo`); cupom de loja só na Shopee; nova prop `cupomLoja`
- [X] T027 [US1] Em `components/admin/ProdutoForm.tsx`: passar `cupomLoja` (de `taxasGlobais`) ao `SimuladorPrecificacao`

**Checkpoint**: MVP — verba por canal no produto.

---

## Phase 6: User Story 4 – Simular um desconto (P2)

- [X] T028 [US4] Em `components/admin/VerbaDesconto.tsx`: campo "Quanto quer dar de desconto? (%)" → preço final, lucro R$ e % do preço final, alerta quando `passouDaSobra` ou margem < piso; ≥ 100 rejeitado

---

## Phase 7: User Story 5 – Verba na calculadora (P2)

- [X] T029 [US5] Em `components/admin/CalculadoraRapida.tsx`: passar `pisoPercentual` (`taxasGlobais.margemMinimaPercentual`) e `cupomLoja` ao `Resumo`
- [X] T030 [US5] Em `components/admin/calculadora/Resumo.tsx`: renderizar `VerbaDesconto` abaixo de "Taxas descontadas no pedido" para o canal da aba, com `precoCentavos` do canal e `lucroEm` via `detalharVenda` (faixas, anúncio, imposto, custo do pedido); cupom de loja só na aba Shopee

---

## Phase 8: User Story 6 – Sinalizar produtos sem verba (P3)

- [X] T031 [US6] Em `app/admin/(painel)/produtos/page.tsx`: calcular `verbaShopee` por produto (custo, preço Shopee ou do site, `resolverTaxasCanais`, piso efetivo, cupom de loja); `null` sem custo
- [X] T032 [US6] Em `components/admin/ListaProdutosAdmin.tsx`: campo `verbaShopee` em `ProdutoLinha` e selo "Sem verba p/ cupom" / "Abaixo do piso" na linha (estilo em `components/admin/listaProdutos.module.css`)

---

## Phase 9: Polish

- [X] T033 Buscar textos restantes "% sobre o custo"/"sobre o custo" ligados às margens em `components/admin/` e `lib/` e ajustar
- [X] T034 Rodar `npm test` e `npx tsc --noEmit` e corrigir falhas
- [X] T035 Validar o roteiro de `quickstart.md` (números do exemplo) e preparar o Test Guide

## Dependencies

- Phase 2 bloqueia tudo. US2 (migração) antes de US1 para não ler valores antigos na régua nova.
- US3 → US1 (sobra depende do cupom). US1 → US4 → US5 (mesmo componente). US6 depende de T023.

## Parallel Examples

- Phase 2: T003, T006, T007, T008 em paralelo após T002.
- US2: T011 junto com T013/T014.
- US1: T024 junto com T025.

## Implementation Strategy

MVP = Phase 2 + US2 + US3 + US1 (verba no produto). Depois US4 (simulador), US5 (calculadora) e US6 (selo na lista).
