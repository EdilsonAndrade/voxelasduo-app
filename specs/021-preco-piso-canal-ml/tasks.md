# Tasks: Preço por canal com piso de margem e promoções elegíveis do Mercado Livre

**Input**: `specs/021-preco-piso-canal-ml/` (plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md)
**Tests**: Vitest para lógica pura, validação e rotas (conforme plan.md). UI verificada via Test Guide (quickstart.md).
**Textos**: pt-BR inline, padrão existente do admin (sem lib de i18n).

## Phase 1: Foundational (bloqueia as histórias)

- [X] T001 [P] Alterar `lib/models/configuracao.ts`: `TaxasCanaisConfig.margemMinimaPercentual: number`; `TAXAS_CANAIS_PADRAO.margemMinimaPercentual = 15`
- [X] T002 [P] Alterar `lib/models/produto.ts`: `TaxasCanaisProduto.margemMinimaPercentual?: number`; novo `PrecosCanaisProduto { mercadoLivre?: number; shopee?: number }` (centavos) e `Produto.precosCanais?: PrecosCanaisProduto` — conforme data-model.md
- [X] T003 [P] Alterar `lib/produtos/canais.ts`: `calcularPrecoMinimoCanal(custoCentavos, taxa: TaxaCanal, margemMinimaPercentual)` → `(custo + taxaFixa) / (1 − taxa%/100 − margemMinima%/100)`, `null` quando o denominador `<= 0` (research.md #3); `calcularResultadoPisoCanal(canal, taxa, precoAtualCentavos, precoMinimoCentavos)` → `ResultadoPisoCanal` (desconto em R$ e %, pode ser negativo — a UI decide como exibir, a função não força a zero)
- [X] T004 [P] Alterar `lib/produtos/canais.test.ts`: margem 0% = breakeven; taxa% + margem% `>= 100` → `null`; desconto negativo quando preço atual já abaixo do mínimo; caso normal bate com a fórmula
- [X] T005 [P] Alterar `lib/configuracoes/validation.ts` (+ `validation.test.ts`): `validarTaxasCanais` valida `margemMinimaPercentual` (`0 <= x < 100`, numérico)
- [X] T006 [P] Alterar `lib/produtos/validation.ts` (+ `validation.test.ts`): valida `taxasCanais.margemMinimaPercentual` (override, mesmos limites) e `precosCanais.mercadoLivre`/`precosCanais.shopee` (inteiro positivo, mesma regra de `preco`)

**Checkpoint**: modelos, cálculo puro de piso/desconto e validação prontos e testados.

## Phase 2: User Story 1 — Preço mínimo e desconto máximo por canal (P1) 🎯 MVP

**Goal**: margem mínima definida uma vez (padrão global + override por produto); cada canal do comparador mostra preço mínimo e desconto máximo.
**Independent Test**: definir a margem mínima, abrir um produto, conferir que os 3 canais mostram preço mínimo/desconto máximo condizentes, sem redigitar a margem.

- [X] T007 [US1] Alterar `lib/configuracoes/repository.ts`: `buscarTaxasCanais`/`salvarTaxasCanais` passam a incluir `margemMinimaPercentual` no documento lido/salvo
- [X] T008 [US1] Alterar `app/api/admin/configuracoes/taxas/route.test.ts`: cobre `margemMinimaPercentual` no GET/PUT e o 400 quando fora de `0 <= x < 100`
- [X] T009 [US1] Alterar `components/admin/TaxasCanaisForm.tsx`: novo campo "Margem de lucro mínima aceitável (%)", incluído no payload do `PUT`
- [X] T010 [US1] Alterar `components/admin/SimuladorPrecificacao.tsx`: nova prop `margemMinimaPercentual` (substitui o campo digitável solto que existe hoje); para cada canal do comparativo, calcular e exibir "Preço mínimo" e "Desconto máximo (R$ / %)" via `calcularResultadoPisoCanal`; preço mínimo `null` → aviso "nenhum preço atende essa margem neste canal"; desconto negativo → aviso "preço atual já está abaixo do mínimo" em vez do valor negativo
- [X] T011 [US1] Alterar `components/admin/ProdutoForm.tsx`: campo de override "Margem mínima deste produto (%)" (vazio = herda o padrão global, mesmo padrão do override de taxas dos canais), repassa a margem efetiva ao `SimuladorPrecificacao`
- [X] T012 [US1] Alterar `app/admin/(painel)/produtos/novo/page.tsx` e `app/admin/(painel)/produtos/[id]/editar/page.tsx`: passam `margemMinimaPercentual` (de `buscarTaxasCanais`) e, na edição, o override salvo no produto

**Checkpoint**: preço mínimo/desconto máximo visível e configurável nos 3 canais (todos ainda usando o preço único de hoje).

## Phase 3: User Story 2 — Preço de venda próprio por canal (P2)

**Goal**: site, Mercado Livre e Shopee podem ter preços diferentes; salvar sincroniza cada canal automaticamente, sem passo extra.
**Independent Test**: definir preços diferentes por canal num produto publicado no ML, salvar, conferir que o anúncio no ML reflete o preço do ML (não o do site).

- [X] T013 [US2] Alterar `app/api/produtos/route.ts` e `app/api/produtos/[id]/route.ts` (+ `route.test.ts`): aceitar/persistir `precosCanais`
- [X] T014 [US2] Alterar `lib/estoque/sincronizacao.ts`: ao chamar `client.atualizarAnuncio`, usar `produto.precosCanais?.mercadoLivre ?? produto.preco` (Mercado Livre) e o equivalente para Shopee, em vez de `produto.preco` direto
- [X] T015 [P] [US2] Criar `lib/produtos/precosCanaisFormulario.ts` (+ `.test.ts`): conversão string do formulário ↔ `PrecosCanaisProduto` (vazio = herda o preço do site), mesmo padrão dos demais `*Formulario.ts` do projeto
- [X] T016 [US2] Alterar `components/admin/ProdutoForm.tsx`: campos de preço por canal (Mercado Livre, Shopee — o site continua sendo o campo "Preço" já existente), incluir `precosCanais` no payload salvo
- [X] T017 [US2] Alterar `components/admin/SimuladorPrecificacao.tsx`: usar o preço específico de cada canal (`precosCanais.<canal> ?? preco`) como "preço atual" no cálculo de desconto máximo da US1, em vez do preço único compartilhado

**Checkpoint**: cada canal pode ter preço próprio, sincronizado ao salvar; piso/desconto máximo passam a refletir o preço real de cada canal.

## Phase 4: User Story 3 — Promoções elegíveis do Mercado Livre (P2)

**Goal**: para um produto publicado no ML, listar as promoções elegíveis e sinalizar quais respeitam a margem mínima.
**Independent Test**: produto publicado no ML com promoções elegíveis mostra cada uma marcada "vale a pena" (lucro estimado) ou "fura a margem"; sem publicação, a seção não aparece; falha na consulta não derruba o resto da tela.

- [X] T018 [US3] Criar `lib/estoque/canais/mercadoLivre/promocoes.ts`: `listarPromocoesElegiveis(itemId, sellerId)` — `GET /seller-promotions/promotions?seller_id=&app_version=v2`; para cada campanha retornada, `GET /seller-promotions/promotions/{id}/items?promotion_type=&app_version=v2`; filtra pelas campanhas cujos itens incluem `itemId`; mapeia para `PromocaoElegivel` (sem `valeAPena`/`lucroEstimadoCentavos` ainda — calculados na rota, T020); item com formato de campo inesperado/ausente é descartado individualmente, sem derrubar a lista inteira (research.md #4)
- [X] T019 [US3] Criar `lib/estoque/canais/mercadoLivre/promocoes.test.ts`: mock de `fetch`; campanha sem o item do produto é filtrada fora; campo de desconto ausente/formato inesperado não quebra (item descartado, demais mantidos); erro do Mercado Livre propagado via `erroMercadoLivre`
- [X] T020 [US3] Criar `app/api/produtos/[id]/mercado-livre/promocoes/route.ts` (+ `route.test.ts`): 404 `produto_nao_publicado` se `integracoes.mercadoLivreId` ausente; calcula o preço mínimo do canal Mercado Livre (`calcularPrecoMinimoCanal`, com a margem mínima efetiva do produto) e a comissão real já existente; chama `listarPromocoesElegiveis`; marca `valeAPena`/`lucroEstimadoCentavos` de cada promoção comparando com o preço mínimo; 401 `token_invalido`; 502 `falha_mercado_livre` — status/corpo nunca mascarados (conforme contracts/preco-piso-canal.md)
- [X] T021 [US3] Alterar `components/admin/ProdutoForm.tsx`: seção "Promoções elegíveis (Mercado Livre)" — só renderiza quando o produto tem `mercadoLivreId`; busca a rota ao carregar; lista cada promoção com o veredito ("vale a pena, lucro estimado de R$X" / "fura a margem mínima"); estado vazio ("nenhuma promoção elegível agora"); falha na consulta mostra aviso específico, sem afetar o restante do formulário

**Checkpoint**: produto publicado no ML mostra promoções elegíveis com o veredito de margem; falha na consulta não afeta o resto da tela.

## Phase 5: Polish

- [X] T022 [P] Revisar todos os textos pt-BR novos (rótulos, avisos, estados vazios) contra o padrão já usado no restante do admin
- [X] T023 Rodar `npx vitest run` e `npx tsc --noEmit`; corrigir falhas
- [X] T024 Revisar `quickstart.md` contra a implementação final e ajustar se necessário

## Dependencies & Execution Order

- Phase 1 → todas as demais. US1 (Phase 2) é o MVP e não depende de preço por canal nem de promoções.
- US2 (Phase 3) depende de Phase 1; T017 edita `SimuladorPrecificacao.tsx` depois de T010 (sequencial, mesmo arquivo).
- US3 (Phase 4) depende de Phase 1 (preço mínimo) e, para o "preço atual do canal ML" usado na comparação, se beneficia de US2 já existir — mas continua funcional mesmo sem US2 (usa `produto.preco` como preço do ML enquanto não houver override).
- Paralelos: T001–T006; T015 (arquivo próprio); T018/T019.

## Parallel Example: Phase 1

```bash
Task: "Alterar lib/models/configuracao.ts com margemMinimaPercentual"
Task: "Alterar lib/models/produto.ts com precosCanais e override de margem"
Task: "Alterar lib/produtos/canais.ts com calcularPrecoMinimoCanal/calcularResultadoPisoCanal"
Task: "Alterar lib/produtos/canais.test.ts"
Task: "Alterar lib/configuracoes/validation.ts (+ teste)"
Task: "Alterar lib/produtos/validation.ts (+ teste)"
```

## Implementation Strategy

MVP = Phase 1 + US1 (piso/desconto máximo com a margem mínima persistida, sobre o preço único de hoje). Depois US2 (preço por canal de verdade) e US3 (promoções elegíveis do ML), em ordem, validando cada checkpoint. US3 carrega risco técnico conhecido (endpoint parcialmente confirmado) — se a validação em T018/T019 mostrar que o formato real diverge do esperado, ajustar o parser sem bloquear US1/US2, que já entregam valor sozinhas.
