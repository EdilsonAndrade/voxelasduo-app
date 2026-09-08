# Tasks: Calculadora de custo e preço sugerido (Mercado Livre)

**Input**: Design documents from `/specs/012-ml-calculadora-custo-preco/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/simular-preco.md, quickstart.md

**Tests**: Incluídos — o projeto já mantém testes unitários (Vitest) co-localizados para módulos equivalentes (`lib/produtos/validation.test.ts`, `lib/estoque/canais/mercadoLivre/*.test.ts`); esta feature segue o mesmo padrão.

**Organization**: Tarefas agrupadas pelas 3 user stories da spec (todas P1): US1 (custo de produção/COGS), US2 (comissão real do Mercado Livre), US3 (lucro líquido/margem — combina US1+US2).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: US1, US2 ou US3
- Caminhos de arquivo exatos em cada descrição

## Path Conventions

Projeto único Next.js App Router (ver plan.md → Project Structure): `lib/` para lógica de domínio, `app/` para páginas e API routes, `components/` para UI.

---

## Phase 1: Setup

**Purpose**: Confirmar pré-requisitos — não há novas dependências de pacote nem infraestrutura nova a criar (feature reaproveita integração ML e formulário admin já existentes).

- [X] T001 Confirmar que `credenciaisCanais` tem um token válido do Mercado Livre (via `obterAccessTokenValido()` já usado em `lib/estoque/canais/mercadoLivre/auth.ts`) e que `MERCADOLIVRE_CLIENT_ID`/`MERCADOLIVRE_CLIENT_SECRET` estão em `.env.local` — nenhuma nova variável de ambiente é necessária para esta feature

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Tipos de dados compartilhados por mais de uma user story (ver data-model.md)

**⚠️ CRITICAL**: Nenhuma user story pode começar antes desta fase

- [X] T002 [P] Adicionar a interface `CustoProducao` e o campo opcional `custoProducao?: CustoProducao` em `Produto`, em `lib/models/produto.ts` (data-model.md → "Produto (extensão do modelo existente)")
- [X] T003 [P] Criar `lib/produtos/precificacao.ts` com os tipos `ComissaoMercadoLivre` e `SimulacaoPrecificacao` (apenas tipos, sem lógica ainda — data-model.md → "Comissão do Mercado Livre" e "Simulação de Precificação")

**Checkpoint**: Tipos base prontos — user stories podem começar.

---

## Phase 3: User Story 1 - Configurar custos de produção do produto (Priority: P1) 🎯 MVP

**Goal**: No cadastro/edição de produto, o vendedor preenche os dados de custo de produção da peça e vê o custo total de produção (COGS) calculado e detalhado, recalculado a cada alteração de campo.

**Independent Test**: Preencher os campos de custo de produção de um produto (novo ou existente) e conferir que o COGS exibido bate com o cálculo manual esperado — sem depender de preço de venda ou de qualquer chamada ao Mercado Livre.

### Tests for User Story 1

- [X] T004 [P] [US1] Escrever testes unitários de `calcularCustoProducao` em `lib/produtos/custoProducao.test.ts`, cobrindo: cálculo completo (todas as fórmulas de research.md #4), custo de produção incompleto (campo obrigatório ausente/zero tratado como "não preenchido", não como custo real zero — Edge Cases da spec), e arredondamento em centavos

### Implementation for User Story 1

- [X] T005 [US1] Implementar `calcularCustoProducao(custo: CustoProducao): ResultadoCogs` em `lib/produtos/custoProducao.ts`, seguindo as fórmulas de research.md #4 (filamento com perda, depreciação, energia, mão de obra, embalagem, total) — depende de T002, T004
- [X] T006 [P] [US1] Adicionar `custoProducao?: unknown` a `ProdutoPayload` e a validação dos subcampos (todos obrigatórios quando o objeto está presente; numéricos finitos; `pesoCarreteGramas`/`vidaUtilImpressoraHoras` > 0) em `lib/produtos/validation.ts` (data-model.md → "Validação")
- [X] T007 [P] [US1] Adicionar/atualizar testes de validação de `custoProducao` em `lib/produtos/validation.test.ts` (objeto ausente é válido; objeto presente com campo faltando ou negativo é inválido)
- [X] T008 [US1] Repassar `payload.custoProducao as CustoProducao | undefined` para `criarProduto(...)` em `app/api/produtos/route.ts` (o `PATCH` em `app/api/produtos/[id]/route.ts` já repassa via spread do payload — não precisa de mudança)
- [X] T009 [US1] Adicionar à seção de custo de produção em `components/admin/ProdutoForm.tsx`: campos para peso da peça, tempo de impressão, tempo de mão de obra, preço/peso do carretel, margem de perda, preço/vida útil da impressora, consumo elétrico/tarifa, valor da hora de trabalho, custo de embalagem; conversão reais↔centavos nos campos monetários (mesmo padrão de `precoReais`); exibição do COGS e seu detalhamento chamando `calcularCustoProducao` a cada mudança de campo; indicação clara de quais campos faltam quando o custo está incompleto (FR-011) — depende de T005, T006
- [X] T010 [US1] Repassar `produto.custoProducao` como parte de `valoresIniciais` para `ProdutoForm` em `app/admin/(painel)/produtos/[id]/editar/page.tsx` — depende de T002

**Checkpoint**: US1 completa e testável de forma independente — COGS calculado e exibido sem depender de US2/US3.

---

## Phase 4: User Story 2 - Ver a comissão real do Mercado Livre para o preço digitado (Priority: P1)

**Goal**: Ao digitar o preço de venda no cadastro/edição do produto, o vendedor vê a comissão real do Mercado Livre (taxa de anúncio + taxa de venda) para aquele preço/categoria, consultada via API oficial com debounce, com fallback manual em caso de falha.

**Independent Test**: Digitar um preço de venda em um produto com categoria definida e conferir que a comissão exibida corresponde ao retornado por `GET /sites/MLB/listing_prices` para aquele preço/categoria — testável sem depender dos campos de custo de produção (US1).

### Tests for User Story 2

- [X] T011 [P] [US2] Escrever testes unitários de `consultarCustoVenda` em `lib/estoque/canais/mercadoLivre/precos.test.ts`, com `fetch` mockado: resposta de sucesso (mapeamento de `sale_fee_amount`/`percentage_fee`/`fixed_fee`/`listing_fee_amount`), resposta de erro HTTP (propaga via `erroMercadoLivre`, mesmo padrão de `anuncios.test.ts`)

### Implementation for User Story 2

- [X] T012 [US2] Implementar `consultarCustoVenda({ categoryId, precoReais, listingTypeId }): Promise<ComissaoMercadoLivre>` em `lib/estoque/canais/mercadoLivre/precos.ts`, chamando `GET https://api.mercadolibre.com/sites/MLB/listing_prices` com `obterAccessTokenValido()` e tratando erro com `erroMercadoLivre()` (research.md #1, #3) — depende de T003, T011
- [X] T013 [US2] Implementar `resolverCategoriaParaSimulacao(nome, categoria): Promise<string | undefined>` em `lib/estoque/canais/mercadoLivre/precos.ts`, reaproveitando `resolverCategoriaMercadoLivre` (`categorias.ts`) com fallback para `preverCategoriaMercadoLivre(montarConsultaPrevisor(...))` (research.md #2) — mesma lógica de `criarAnuncio()` em `anuncios.ts`
- [X] T014 [US2] Criar a rota `POST /api/mercado-livre/simular-preco` em `app/api/mercado-livre/simular-preco/route.ts` conforme `contracts/simular-preco.md`: valida `nome`/`categoria`/`precoReais` (400 se preço ≤ 0 ou não numérico — FR-012), resolve categoria (404 `categoria_nao_encontrada` se não resolver), consulta `consultarCustoVenda` (502 `falha_mercado_livre` em caso de erro de comunicação) — depende de T012, T013
- [X] T015 [US2] Criar `components/admin/SimuladorPrecificacao.tsx`: campo de preço de venda, debounce (~500ms) após a última alteração antes de chamar `POST /api/mercado-livre/simular-preco`, exibição de taxa de anúncio e comissão de venda (valor + %), estado de carregamento, e aviso não bloqueante em caso de erro (404/502) permitindo prosseguir sem a simulação (FR-005, FR-006) — depende de T014
- [X] T016 [US2] Adicionar campo de sobrescrita manual da comissão exibida em `SimuladorPrecificacao.tsx`: ao editar manualmente, usa esse valor até nova alteração do preço disparar nova consulta automática (FR-007)
- [X] T017 [US2] Integrar `SimuladorPrecificacao` em `components/admin/ProdutoForm.tsx`, passando `nome`, `categoria` e o preço de venda atuais do formulário — depende de T015, T016

**Checkpoint**: US2 completa e testável de forma independente — comissão real exibida e atualizável, com fallback manual, sem depender dos campos de custo de produção da US1.

---

## Phase 5: User Story 3 - Ver lucro líquido e margem ao digitar o preço de venda (Priority: P1)

**Goal**: Combinando o COGS (US1) e a comissão do Mercado Livre (US2), exibir lucro líquido e margem por peça ao digitar o preço de venda, com alertas visuais de prejuízo e de margem baixa.

**Independent Test**: Com COGS e comissão (real ou manual) disponíveis, digitar diferentes preços de venda e conferir que lucro líquido, margem e os alertas de prejuízo/margem baixa aparecem corretamente para cada cenário.

### Tests for User Story 3

- [X] T018 [P] [US3] Escrever testes unitários de `calcularSimulacaoPrecificacao` em `lib/produtos/precificacao.test.ts`: lucro positivo, prejuízo (`prejuizo: true`), margem abaixo do limite mínimo (`margemBaixa: true`), margem dentro do limite (ambos `false`)

### Implementation for User Story 3

- [X] T019 [US3] Implementar `calcularSimulacaoPrecificacao(...)` em `lib/produtos/precificacao.ts` (lucro líquido = preço − COGS − comissão; margem = lucro/preço; `prejuizo`/`margemBaixa` conforme FR-008/009/010) — depende de T003, T005, T012, T018. **Ajuste na implementação**: assinatura final usa `cogsCentavos: number, comissaoCentavos: number` (primitivos) em vez de `ResultadoCogs`/`ComissaoMercadoLivre` inteiros — mais simples de compor na UI, já que a comissão pode vir tanto da API quanto de uma sobrescrita manual (apenas um número), sem precisar montar um `ComissaoMercadoLivre` fake para o caso manual.
- [X] T020 [US3] Em `SimuladorPrecificacao.tsx`: adicionar campo de margem mínima configurável e exibir lucro líquido, margem (%) e os alertas visuais distintos de prejuízo e de margem baixa, combinando o `ResultadoCogs` (vindo de `ProdutoForm`/US1) com a `ComissaoMercadoLivre` (US2) via `calcularSimulacaoPrecificacao` — depende de T009, T017, T019
- [X] T021 [US3] Tratar o estado de "dados incompletos" em `SimuladorPrecificacao.tsx`: quando o COGS ainda não está completo (US1) ou a comissão ainda não foi obtida/informada (US2), exibir mensagem clara do que falta em vez de um resultado de lucro/margem incorreto (FR-011, Acceptance Scenario 4 da US3)

**Checkpoint**: Todas as 3 user stories funcionam de ponta a ponta — cadastro/edição de produto mostra custo, comissão real, lucro líquido e margem, com os alertas visuais.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Qualidade e validação final, conforme quickstart.md

- [X] T022 [P] Adicionar estilos de alerta (prejuízo / margem baixa / aviso não bloqueante) em `components/admin/admin.module.css` (ou um novo `SimuladorPrecificacao.module.css`) — **ajuste**: reaproveitados os estilos já existentes `fieldError` (prejuízo), `mlLinkAviso` (margem baixa/avisos) e `mlLinkBox` (resultado normal), sem necessidade de CSS novo
- [X] T023 Rodar `npm run lint` e `npx tsc --noEmit`, corrigindo eventuais problemas — **nota**: `npx tsc --noEmit` limpo; `next lint`/`npm run lint` falha com "Invalid project directory provided, no such directory: .../lint" mesmo na branch `main` sem nenhuma mudança desta feature (confirmado via `git stash`) — problema pré-existente do ambiente, não introduzido por esta implementação
- [X] T024 Rodar `npx vitest run` (todos os testes desta feature: `custoProducao.test.ts`, `precos.test.ts`, `precificacao.test.ts`, `validation.test.ts`) e `npm run build`, conforme quickstart.md — 257 testes passando (47 arquivos), `npm run build` concluído com sucesso incluindo a nova rota `/api/mercado-livre/simular-preco`

---

## Follow-up pós-implementação (fora do plano original, pedido pelo usuário)

- [X] T025 Corrigir erro de runtime "Attempted to call custoProducaoParaFormulario() from the server but it is on the client": mover `CustoProducaoFormValores`/`montarCustoProducao`/`camposCustoProducaoFaltando`/`custoProducaoParaFormulario` de `components/admin/ProdutoForm.tsx` (`"use client"`) para `lib/produtos/custoProducaoFormulario.ts` (sem `"use client"`), e atualizar `app/admin/(painel)/produtos/[id]/editar/page.tsx` para importar direto da lib
- [X] T026 Adicionar `calcularPrecoSugerido(cogsCentavos, margemDesejadaPercentual, taxaPlataformaPercentual)` em `lib/produtos/precificacao.ts` (fórmula `(custo * (1 + margem)) / (1 - taxa)`, igual à planilha do solicitante) + testes em `lib/produtos/precificacao.test.ts`
- [X] T027 Adicionar seção "Preço de venda sugerido" em `components/admin/SimuladorPrecificacao.tsx`: campos de margem de lucro desejada e taxa estimada da plataforma (pré-preenchida com a comissão real assim que consultada), exibindo o preço sugerido e um botão "Usar esse preço" que aplica o valor ao campo "Preço (R$)" via novo prop `onAplicarPrecoSugerido`, conectado em `ProdutoForm.tsx`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências
- **Foundational (Phase 2)**: depende do Setup — bloqueia todas as user stories
- **US1 (Phase 3)**: depende de T002 (Foundational)
- **US2 (Phase 4)**: depende de T003 (Foundational); independente de US1
- **US3 (Phase 5)**: depende de US1 (T005/T009) e US2 (T012/T017) — combina os dois resultados, conforme a própria spec (Acceptance Scenario 4 da US3)
- **Polish (Phase 6)**: depende de US1, US2 e US3 completas

### Parallel Opportunities

- T002 e T003 (Foundational) podem rodar em paralelo
- T004 (teste) pode começar assim que T002 estiver pronto
- T006 e T007 (US1) podem rodar em paralelo entre si e em paralelo com T004/T005
- Toda a Phase 4 (US2) pode ser desenvolvida em paralelo com a Phase 3 (US1) por outra pessoa, já que não compartilham arquivos até a integração final em `ProdutoForm.tsx` (T017)
- T011 pode começar assim que T003 estiver pronto, em paralelo com o trabalho de US1

---

## Parallel Example: Foundational + US1 + US2

```bash
# Foundational, em paralelo:
Task: "Adicionar CustoProducao em lib/models/produto.ts"                    # T002
Task: "Criar tipos ComissaoMercadoLivre/SimulacaoPrecificacao em lib/produtos/precificacao.ts"  # T003

# Depois, US1 e US2 podem avançar em paralelo (times/desenvolvedores diferentes):
Task: "Testes + implementação de calcularCustoProducao (US1)"               # T004, T005
Task: "Testes + implementação de consultarCustoVenda (US2)"                 # T011, T012
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Completar Phase 1 (Setup) e Phase 2 (Foundational)
2. Completar Phase 3 (US1) — já entrega valor: vendedor vê o custo real de produção da peça, mesmo sem a comissão do Mercado Livre ainda
3. **Parar e validar**: testar US1 isoladamente (quickstart.md)

### Incremental Delivery

1. Setup + Foundational → base pronta
2. US1 → custo de produção visível → validar → (opcional) demo
3. US2 → comissão real do Mercado Livre visível → validar → (opcional) demo
4. US3 → lucro líquido e margem, unindo US1+US2 → validar → feature completa
5. Polish → lint/typecheck/testes/build (quickstart.md)

---

## Notes

- [P] = arquivos diferentes, sem dependência entre si
- [US1]/[US2]/[US3] mapeiam a tarefa à user story correspondente da spec
- Testes unitários seguem o padrão já existente no repositório (Vitest, arquivo `*.test.ts` ao lado do módulo)
- Nenhuma tarefa de commit é executada automaticamente — mensagens de commit serão sugeridas ao usuário conforme CLAUDE.md (regra 5), sem commit automático
