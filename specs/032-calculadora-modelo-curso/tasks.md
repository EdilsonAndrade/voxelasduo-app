# Tasks: Calculadora de preço no modelo do curso

**Input**: specs/032-calculadora-modelo-curso/ (plan.md, spec.md, research.md, data-model.md, contracts/gcode.md)
**Tests**: Vitest para as funções puras (padrão do projeto).

## Phase 1: Setup

- [X] T001 Invocar a skill `frontend-design` para a direção visual (sanfona, cartões de opção, abas, barras) antes da UI

## Phase 2: Foundational (bloqueia todas as histórias)

- [X] T002 Tipos v2 (`versao`, `ImpressaoCalculadora`, `FilamentoCalculadora`, `ExtraCalculadora`, `PrecificacaoCalculadora`, `VendaDiretaCalculadora`, campos novos da Shopee; `custo` opcional; `producao.pecasPorMesa/horasMesaCheia` opcionais) em lib/models/calculoPreco.ts
- [X] T003 [P] Impressoras de referência e constantes de pagamento (débito 1,99%, crédito 2,99%) em lib/produtos/impressoras.ts
- [X] T004 `valoresPadraoV2()` e `normalizarValores()` (conversão v1→v2 conforme data-model.md) + testes em lib/produtos/calculadoraValores.ts e lib/produtos/calculadoraValores.test.ts; `valoresPadrao()` de lib/produtos/calculadoraPadrao.ts passa a devolver v2
- [X] T005 [P] `impostoPercentual` opcional em `calcularPrecoPorMargem`, `detalharVenda` (+ `impostoCentavos`), `calcularCustoMaximo`, `compararComConcorrente` + testes em lib/produtos/calculadoraRapida.ts e lib/produtos/calculadoraRapida.test.ts
- [X] T006 Validação aceita `valores.custo` OU `valores.impressao` em lib/produtos/calculosPreco.ts
- [X] T007 [P] Cálculo vindo da Pesquisa de nichos gera v2 (tempo/peso da mesa, peças 1) em lib/nichos/calculo.ts

## Phase 3: US1 — Custo da peça (P1)

**Independent test**: preencher Impressão e Custos extras; custo e barras batem com a conta manual.

- [X] T008 [P] [US1] `calcularCustoUnidade(impressao)` (material, energia, desgaste, falha, embalagem, acabamento, mão de obra, outros, total; listas substituem campos simples) e `paraCustoProducao()` (produto rascunho, mesmo total) + testes em lib/produtos/custoCalculadora.ts e lib/produtos/custoCalculadora.test.ts
- [X] T009 [P] [US1] Parsers puros `segundosDeDuracao`, `interpretarCabecalhoGcode`, `interpretarSliceInfo` + testes em lib/produtos/gcode.ts e lib/produtos/gcode.test.ts
- [X] T010 [US1] `lerGcode(File)` no navegador (Blob.slice do .gcode; ZIP + DecompressionStream do .gcode.3mf; erros de contracts/gcode.md) em lib/produtos/lerGcode.ts
- [X] T011 [P] [US1] Componente de seção recolhível em components/admin/calculadora/Secao.tsx
- [X] T012 [US1] Seção Modelo (nome, links, altura) em components/admin/calculadora/SecaoModelo.tsx
- [X] T013 [US1] Seção Impressão (G-code arrastar/escolher, seletor de mesa, impressora/consumo/energia, desgaste, peças por mesa, tempo h+min, falha, perda, filamento simples + lista) em components/admin/calculadora/SecaoImpressao.tsx
- [X] T014 [US1] Seção Custos extras (botões rápidos, lista, campo simples de embalagem desativado com lista) em components/admin/calculadora/SecaoCustosExtras.tsx

## Phase 4: US2 + US4 — Precificação e canal de venda (P1/P2)

**Independent test**: alternar margem/alvo, imposto, promoção, forma de pagamento, frete, CPF/CNPJ, campanha e cupom; conferir o card de taxas.

- [X] T015 [P] [US4] `montarCanal(canal, valores, taxasSite)` → faixas, custo por pedido, % de imposto e `detalharTaxas()` (comissão, fixa, adicional CPF, campanha, pagamento, imposto, anúncio, frete/cupom) + testes em lib/produtos/canaisCalculadora.ts e lib/produtos/canaisCalculadora.test.ts
- [X] T016 [US2] `calcularResultado(valores, taxasSite)` (custo, produção, por canal: preço pela margem, preço praticado, preço cheio da promoção, venda detalhada, markup, potencial dia/mês) + testes em lib/produtos/resultadoCalculadora.ts e lib/produtos/resultadoCalculadora.test.ts
- [X] T017 [US2] Seção Precificação (cartões Margem mínima / Preço alvo, usar preço do concorrente, imposto, promoção) em components/admin/calculadora/SecaoPrecificacao.tsx
- [X] T018 [US4] Seção Canal de venda (abas Venda direta / Shopee / Mercado Livre; pagamento, frete; CNPJ/CPF, volume, tabela de faixas, campanha, cupom; ML comissão e fixo) em components/admin/calculadora/SecaoCanalVenda.tsx

## Phase 5: US3 — Resumo em abas (P1)

- [X] T019 [US3] Resumo: abas por canal, preço para o consumidor, custo, margem de contribuição, markup, card de taxas, barras da composição, potencial diário/mensal, linha comparando os canais em components/admin/calculadora/Resumo.tsx

## Phase 6: US5 — Funções mantidas (P2)

- [X] T020 [US5] Seção Ads (modos, ROAS, verba) e blocos por canal (passo a passo da campanha, tabela de ROAS, semáforo, retorno da verba) com imposto e novas taxas em components/admin/calculadora/SecoesEstrategia.tsx e components/admin/calculadora/BlocosCanal.tsx
- [X] T021 [US5] Seção Concorrente e bloco "Contra o concorrente" por canal em components/admin/calculadora/SecoesEstrategia.tsx e components/admin/calculadora/BlocosCanal.tsx
- [X] T022 [US5] Seção Produção no mês (horas/dia, dias/mês, peças no mês) e tabela Avulso/Kits (embalagem uma vez por pedido, frete/cupom por pedido) em components/admin/calculadora/SecoesEstrategia.tsx e components/admin/calculadora/BlocosCanal.tsx
- [X] T023 [US5] Reescrever components/admin/CalculadoraRapida.tsx como orquestrador (estado v2, layout sanfona + resumo sticky, salvar, duplicar, transformar em produto com `paraCustoProducao`)
- [X] T024 [US5] Orçamento impresso usa `normalizarValores` + custo/canais novos em lib/produtos/orcamento.ts e lib/produtos/orcamento.test.ts
- [X] T025 [P] [US5] Estilos novos (sanfona, cartões de opção, abas, barras, dropzone) em components/admin/calculadoraRapida.module.css

## Phase 7: US6 — Cálculos antigos (P2)

- [X] T026 [US6] Página passa `normalizarValores(calculo.valores)` ao componente em app/admin/(painel)/produtos/calculadora/page.tsx e conferir components/admin/CalculosSalvos.tsx

## Phase 8: Polish

- [X] T027 `npx tsc --noEmit` e `npm test` sem erros novos (lint: projeto sem eslint.config; falha pré-existente em app/api/pedidos/[id]/route.test.ts)
- [X] T028 Test Guide final e mensagem de commit sugerida (sem commitar)

## Dependencies

Setup → Foundational (T002 antes de T004/T006/T007/T008) → US1 → US2/US4 (T015 → T016) → US3 → US5 (T023 depende de T011–T022) → US6 → Polish.

## Parallel

- T003, T005, T007 juntos após T002.
- T008 e T009 juntos; T011 em paralelo com T008/T009.
- T015 em paralelo com T013/T014; T025 a qualquer momento após T001.

## Implementation Strategy

MVP = Foundational + US1 + US2/US4 + US3 (custo, preço e resumo novos). Em seguida US5 (para não perder funções) e US6. Como a tela é uma só, a entrega é única ao fim do T023.
