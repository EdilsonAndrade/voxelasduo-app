# Tasks: Calculadora de preço multicanal com margem real

**Input**: `specs/019-calculadora-preco-multicanal/` (plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md)
**Tests**: Vitest para lógica pura, validação e rota (conforme plan.md). UI verificada via Test Guide (quickstart.md).
**Textos**: pt-BR inline, padrão existente do admin (sem lib de i18n).

## Phase 1: Foundational (bloqueia as histórias)

- [X] T001 [P] Criar `lib/models/configuracao.ts` com `CONFIGURACOES_COLLECTION`, `TaxasCanaisConfig` e `TAXAS_CANAIS_PADRAO` (Shopee 14, site 4.99, fixa 0) conforme data-model.md
- [X] T002 [P] Alterar `lib/models/produto.ts`: adicionar `taxaFalhaPercentual?: number` em `CustoProducao` e `TaxasCanaisProduto` + `Produto.taxasCanais?`
- [X] T003 [P] Criar `lib/produtos/canais.ts`: tipo `TaxaCanal {percentual, fixaCentavos}`, `resolverTaxasCanais(global, override)`, `calcularPrecoSugeridoCanal(custo, margem%, taxa)` = `(custo*(1+m)+fixa)/(1-pct)` (null se pct ≥ 100), `calcularResultadoCanal(preco, custo, taxa, margemMinima)` e `calcularComparativoCanais(...)`
- [X] T004 [P] Criar `lib/produtos/canais.test.ts`: fórmula com taxa fixa 0 idêntica a `calcularPrecoSugerido`, lucro ao preço sugerido = custo×margem, taxa ≥ 100 → null, herança global/override, alertas prejuízo/margem baixa

**Checkpoint**: cálculo por canal pronto e testado.

## Phase 2: User Story 1 — Comparativo por canal (P1) 🎯 MVP

**Goal**: ver ML, Shopee e site próprio lado a lado com preço, taxa, lucro R$ e margem %.
**Independent Test**: preencher custos e ver os três canais no simulador.

- [X] T005 [US1] Alterar `components/admin/SimuladorPrecificacao.tsx`: nova prop `taxasCanais` (Shopee/site já resolvidas) e bloco "Comparativo por canal" (3 cartões) usando `calcularComparativoCanais`; ML usa a taxa estimada existente; respeitar modo "completo"/"escala"; alerta de prejuízo/margem baixa por canal e aviso de taxa inválida
- [X] T006 [US1] Alterar `components/admin/ProdutoForm.tsx`: receber `taxasGlobais` (prop, default `TAXAS_CANAIS_PADRAO`) e repassar ao `SimuladorPrecificacao`
- [X] T007 [P] [US1] Alterar `app/admin/(painel)/produtos/novo/page.tsx` e `app/admin/(painel)/produtos/[id]/editar/page.tsx` para passar `taxasGlobais` (usando o repositório da T010 quando existir; até lá, o padrão)

**Checkpoint**: comparativo funcional com taxas padrão.

## Phase 3: User Story 2 — Taxas globais e por produto (P1)

**Goal**: taxa da Shopee e do gateway do site editáveis (global + override por produto).
**Independent Test**: mudar o global e ver produtos sem override mudarem; sobrescrever em um produto.

- [X] T008 [P] [US2] Criar `lib/configuracoes/validation.ts` (percentuais 0 ≤ x < 100, fixa ≥ 0, numéricos) e `lib/configuracoes/validation.test.ts`
- [X] T009 [P] [US2] Alterar `lib/produtos/validation.ts` (+ `validation.test.ts`): validar `taxasCanais` opcional (mesmos limites, campos individualmente opcionais)
- [X] T010 [US2] Criar `lib/configuracoes/repository.ts`: `buscarTaxasCanais()` (defaults se não existe) e `salvarTaxasCanais()` (upsert `_id: "taxasCanais"`, `atualizadoEm`)
- [X] T011 [US2] Criar `app/api/admin/configuracoes/taxas/route.ts` (GET/PUT conforme contracts/configuracoes-taxas.md) e `route.test.ts`
- [X] T012 [US2] Criar `components/admin/TaxasCanaisForm.tsx` e `app/admin/(painel)/configuracoes/page.tsx` (tela do padrão global: Shopee %, site % e taxa fixa R$, com toast de sucesso/erro)
- [X] T013 [US2] Alterar `app/admin/(painel)/layout.tsx`: link "Taxas dos canais" para `/admin/configuracoes`
- [X] T014 [P] [US2] Criar `lib/produtos/taxasCanaisFormulario.ts`: `TaxasCanaisFormValores` (strings; vazio = herdar), `montarTaxasCanaisProduto`, `taxasCanaisParaFormulario`
- [X] T015 [US2] Alterar `components/admin/ProdutoForm.tsx`: fieldset "Taxas deste produto" (override Shopee %, site %, site taxa fixa, placeholder mostra o padrão global), incluir `taxasCanais` no payload e resolver taxas efetivas com `resolverTaxasCanais` para o simulador
- [X] T016 [US2] Alterar `app/api/produtos/route.ts` e `app/api/produtos/[id]/route.ts` (+ `route.test.ts` se cobrir campos): aceitar/persistir `taxasCanais`
- [X] T017 [US2] Alterar as duas páginas de produto (T007) para buscar `buscarTaxasCanais()` e, na edição, passar `taxasCanais` do produto via `taxasCanaisParaFormulario`

**Checkpoint**: taxas globais e overrides funcionando; reabrir produto mantém os valores.

## Phase 4: User Story 3 — Taxa de falha (P2)

**Goal**: custo por peça boa = custo ÷ (1 − falha).
**Independent Test**: falha 10% sobe custo/preços; 0% não altera nada.

- [X] T018 [P] [US3] Alterar `lib/produtos/custoProducao.ts`: adicionar `custoFalhaCentavos` em `ResultadoCogs` (total ÷ (1−falha) − total, arredondado; 0 quando ausente/0), incluído em `totalCentavos`; `calcularCustoCaixa` passa a dividir por (1−falha) usando a taxa presente no resultado
- [X] T019 [P] [US3] Alterar `lib/produtos/custoProducao.test.ts`: falha 0/ausente = resultado atual, falha 10% → total ÷ 0,9, custo de caixa ajustado, soma do detalhamento = total
- [X] T020 [P] [US3] Alterar `lib/produtos/custoProducaoFormulario.ts`: campo `taxaFalhaPercentual` (opcional, permite vazio = 0), em `VAZIO_CUSTO_PRODUCAO`, `montarCustoProducao` e `custoProducaoParaFormulario`; sem entrar em `camposCustoProducaoFaltando` como obrigatório
- [X] T021 [P] [US3] Alterar `lib/produtos/validation.ts` (+ teste): `taxaFalhaPercentual` opcional, 0 ≤ x < 100
- [X] T022 [US3] Alterar `components/admin/ProdutoForm.tsx`: campo "Taxa de falha (%)" junto de "Margem de perda", com dica de que a perda cobre só o filamento e a falha cobre a peça inteira; exibir o custo da falha no detalhamento do COGS

**Checkpoint**: custo por peça boa refletido em todos os canais.

## Phase 5: User Story 4 — Copiar custos de outro produto (P2)

**Goal**: preencher custos a partir de outro produto.
**Independent Test**: copiar, ajustar, salvar; origem intacta.

- [X] T023 [US4] Alterar `components/admin/ProdutoForm.tsx`: botão "Copiar custos de outro produto" que carrega `GET /api/produtos` sob demanda, lista produtos com `custoProducao` (exceto o atual), copia custos (`custoProducaoParaFormulario`) + taxa de falha + `taxasCanais` para o estado; confirmação via `ConfirmModal` se o formulário já tiver sido alterado; aviso se a origem não tiver custos; Toast de sucesso

## Phase 6: Polish

- [X] T024 Rodar `npx vitest run` e `npx tsc --noEmit` (o projeto não tem config de ESLint); corrigir falhas
- [X] T025 Revisar o Test Guide de `quickstart.md` contra a implementação final e ajustar se necessário

## Dependencies & Execution Order

- Phase 1 → todas as demais. US1 (Phase 2) é o MVP e usa só o padrão.
- US2 depende de Phase 1; T007/T017 tocam as mesmas páginas (sequenciais). T015 e T022/T023 editam `ProdutoForm.tsx` → sequenciais entre si.
- US3 e US4 dependem de US2 apenas por compartilharem `ProdutoForm.tsx`/validation; lógica de T018–T021 é independente.
- Paralelos: T001–T004; T008, T009, T014; T018–T021.

## Implementation Strategy

MVP = Phase 1 + US1 (comparativo com taxas padrão). Depois US2, US3, US4 em ordem, validando cada checkpoint.
