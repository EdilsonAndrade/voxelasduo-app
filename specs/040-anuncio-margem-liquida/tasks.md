# Tasks: Anúncio pago opcional e margem líquida sobre o preço

**Input**: `specs/040-anuncio-margem-liquida/` (plan, spec, research, data-model, contracts)
**Tests**: testes unitários das funções puras (padrão do projeto com Vitest).

## Phase 1: Setup

- [X] T001 Invocar a skill `frontend-design` antes de mexer na interface das três telas (regra do CLAUDE.md)

## Phase 2: Foundational

- [X] T002 Criar `AnuncioPago { ativo: boolean; roasMeta: number }` em `lib/models/produto.ts` e o campo opcional `anuncio?: AnuncioPago` em `TaxasCanaisProduto`
- [X] T003 Criar `lib/produtos/anuncioPago.ts` com `ROAS_MAXIMO = 100`, `percentualDoAnuncio(anuncio?)` (100 ÷ ROAS quando ativo e válido, senão 0), `roasValido(n)` e `validarAnuncioPago(valor): string | null` (mensagem pt-BR para 400)
- [X] T004 [P] Criar `lib/produtos/anuncioPago.test.ts`: ROAS 8 → 12,5; desligado → 0; ROAS 0, negativo, texto e > 100 → inválido
- [X] T005 Em `lib/produtos/canais.ts`: `TaxaCanal.anuncioPercentual?`; `precoPorTaxa` soma o anúncio ao divisor; `ResultadoCanal.anuncioCentavos`; `calcularResultadoCanal` desconta o anúncio do lucro; `comAnuncio(taxa, percentual)`
- [X] T006 [P] Ampliar `lib/produtos/canais.test.ts`: com anúncio de 12,5%, o lucro ao preço sugerido continua igual a margem × preço e `anuncioCentavos` = 12,5% do preço; sem anúncio, o resultado não muda

## Phase 3: User Story 1 — Margem líquida no Tempo de Impressão (P1) 🎯 MVP

**Independent Test**: custo R$ 58,46 e margem 25% na Shopee → ~R$ 128,63, lucro ~R$ 32,16.

- [X] T007 [US1] Em `lib/producao/ganhoImpressao.ts`: `PlacaGanho.margemPercentual` passa a ser % do preço; `calcularGanho(custo, margemPercentual, anuncioPercentual)` usa `calcularPrecoPorMargem` com a margem; `ganhoDoConjunto` usa a média ponderada pelo custo; `Ganho` expõe `margemPercentual` em vez de `lucroDesejadoCentavos`
- [X] T008 [US1] Atualizar `lib/producao/ganhoImpressao.test.ts` com o caso R$ 58,46 → R$ 128,63 / R$ 32,16 e com o conjunto ponderado
- [X] T009 [US1] Em `lib/producao/planosImpressao.ts`: validar a margem de 0 a < 100 com a mensagem "margem inválida (0 a 99,9% do preço)"; atualizar o teste correspondente
- [X] T010 [P] [US1] Em `lib/models/planoImpressao.ts`: atualizar o comentário de `margemPercentual` (% do preço)
- [X] T011 [US1] Em `lib/kits/doTempoImpressao.ts`: converter a margem líquida ponderada em markup equivalente `m ÷ (100 − m) × 100`; atualizar o teste
- [X] T012 [US1] Em `components/admin/tempoImpressao/PlanoProdutoCard.tsx`: margem vazia usa `regua.pisoPercentual`; placeholder com o piso; rótulos "% do preço"; aviso "abaixo da meta de X%" no `ResumoGanho`; "você ganha" mostrando o lucro em R$ e em %

## Phase 4: User Story 2 — Anúncio pago no Tempo de Impressão (P2)

**Independent Test**: ligar com ROAS 8, salvar, recarregar; o preço da Shopee inclui 12,5% de anúncio.

- [X] T013 [US2] Em `lib/models/planoImpressao.ts`: `PlanoImpressao.anuncio?: AnuncioPago`
- [X] T014 [US2] Em `lib/producao/planosImpressao.ts` e no repositório `lib/producao/planosImpressaoRepository.ts`: validar e gravar `anuncio` (ausente mantém o gravado, `null` remove) e devolver o campo nas leituras
- [X] T015 [US2] Em `app/api/admin/tempo-impressao/route.ts` e `app/api/admin/tempo-impressao/[id]/route.ts`: aceitar `anuncio` no POST e no PUT, com 400 e `erro` quando inválido
- [X] T016 [US2] Passar `anuncio` do servidor para o card em `components/admin/tempoImpressao/PlanejamentoImpressao.tsx` e na página do Tempo de Impressão
- [X] T017 [US2] Em `components/admin/tempoImpressao/PlanoProdutoCard.tsx`: interruptor "Anúncio pago" com ROAS (padrão 8) no topo do card; entra no `alterado` e no corpo do salvar; o anúncio só entra no canal Shopee; linha "anúncio R$ X" no resumo; `lucroNoPreco` com anúncio para os cupons; aviso de ROAS inválido
- [X] T018 [US2] Em `lib/producao/ganhoImpressao.ts`: aplicar `anuncioPercentual` só no canal Shopee (venda direta sem anúncio) e expor `anuncioCentavos` em `GanhoCanal`; teste correspondente

## Phase 5: User Story 3 — Anúncio pago no produto (P2)

**Independent Test**: produto existente abre desligado com os mesmos preços; ligado com ROAS 8, Shopee e Mercado Livre mostram o anúncio.

- [X] T019 [US3] Em `lib/produtos/taxasCanaisFormulario.ts`: campos `anuncioAtivo`/`anuncioRoasMeta`; montar, ler e validar (o ROAS fica gravado mesmo desligado); atualizar o teste
- [X] T020 [US3] Em `lib/produtos/validation.ts`: validar `taxasCanais.anuncio` com `validarAnuncioPago`
- [X] T021 [US3] Em `lib/produtos/canais.ts`: `resolverTaxasCanais` aplica o anúncio na Shopee (site próprio sem anúncio)
- [X] T022 [US3] Em `components/admin/SimuladorPrecificacao.tsx`: receber `anuncioPercentual`, aplicar `comAnuncio` na taxa do Mercado Livre e mostrar a linha "Anúncio (ROAS X)" por canal quando `anuncioCentavos > 0`
- [X] T023 [US3] Em `components/admin/ProdutoForm.tsx`: interruptor "Anúncio pago" + ROAS no fieldset de margens; passar o percentual para o simulador

## Phase 6: User Story 4 — Calculadora com interruptor (P3)

- [X] T024 [US4] Em `components/admin/calculadora/SecoesEstrategia.tsx`: `SecaoAds` com `Interruptor` "Anúncio pago" (desligado = `sem`; ligado = `embutido`) e, ligado, as opções embutido/do bolso, o ROAS e a verba

## Phase 7: Polish

- [X] T025 Rodar `npx vitest run` e `npx tsc --noEmit` e corrigir as falhas
- [X] T026 Conferir as telas sem texto residual de "sobre o custo" no Tempo de Impressão (`grep`)

## Dependencies

- T002–T006 antes de todas as histórias.
- US1 antes de US2 (o mesmo `ganhoImpressao.ts` e o mesmo card).
- US3 e US4 independentes entre si e de US1/US2.

## Parallel

- T004 ∥ T006 ∥ T010.
- US3 ∥ US4 depois da fase 2.

## Implementation Strategy

O MVP é a US1, que corrige a margem enganosa. Depois vêm a US2, a US3 e a US4, nessa ordem.
