# Tasks: Produto com variações de kit

**Input**: specs/041-kit-variacoes/ (plan.md, spec.md, data-model.md, contracts/api.md, research.md)
**Tests**: testes unitários Vitest nas funções puras (padrão do projeto).

## Phase 1: Setup

- [X] T001 Invocar as skills `frontend-design` e `product-page-design` antes de desenhar a seção de variações do admin e o seletor da página do produto

## Phase 2: Foundational

- [X] T002 Adicionar `PecaVariacao`, `VariacaoKit`, `Produto.variacoes`, `MAXIMO_VARIACOES`/`MAXIMO_PECAS_VARIACAO` em lib/models/produto.ts
- [X] T003 [P] Adicionar `variacaoId?`/`variacaoNome?` em `ItemPedido` em lib/models/pedido.ts
- [X] T004 [P] Adicionar `variacaoId?` em `CalculoPreco` em lib/models/calculoPreco.ts
- [X] T005 Criar lib/produtos/variacoes.ts: `validarVariacoes`, `derivarPrecoEstoque`, `custoDaVariacao`, `nomeComVariacao`, `fotoDaVariacao`, `buscarVariacao`, `gerarIdVariacao`
- [X] T006 [P] Testes de lib/produtos/variacoes.ts em lib/produtos/variacoes.test.ts

## Phase 3: User Story 1 - Cadastrar variações (P1)

**Independent test**: salvar 3 variações e reabrir com custo, preço "a partir de" e estoque somado.

- [X] T007 [US1] Criar lib/produtos/variacoesRepository.ts: `salvarVariacoes` (valida peças no banco, grava `ultimo`, deriva preço/estoque), `aplicarPrecosVariacao`, `abaterEstoqueVariacaoAtomico`
- [X] T008 [US1] Criar `PUT` em app/api/produtos/[id]/variacoes/route.ts (400/404 conforme contracts/api.md)
- [X] T009 [US1] Em app/api/produtos/[id]/route.ts, ignorar `preco`/`estoque` do PATCH quando o produto tem variações
- [X] T010 [US1] Criar components/admin/VariacoesKit.tsx (+ variacoesKit.module.css): lista de variações, busca de peças, custo/margem, foto, salvar com erros visíveis
- [X] T011 [US1] Incluir `VariacoesKit` em components/admin/ProdutoForm.tsx e deixar preço/estoque só leitura com variações

## Phase 4: User Story 2 - Comprar uma variação (P1)

**Independent test**: escolher Kit 4 na página, comprar e ver o pedido com a variação e o estoque abatido.

- [X] T012 [US2] Carrinho com chave produto+variação em lib/carrinho/carrinho.ts, components/carrinho/carrinho-context.ts e CarrinhoProvider.tsx (+ testes em lib/carrinho/carrinho.test.ts)
- [X] T013 [US2] `BotaoAdicionarCarrinho` aceita `variacaoId`/`variacaoNome` em components/carrinho/BotaoAdicionarCarrinho.tsx
- [X] T014 [US2] GaleriaFotosProduto aceita foto em destaque controlada em components/produtos/GaleriaFotosProduto.tsx
- [X] T015 [US2] Criar components/produtos/CompraComVariacoes.tsx e usar em app/produtos/[categoria]/[slug]/page.tsx
- [X] T016 [US2] Carrinho e checkout enviam e mostram a variação em app/carrinho/page.tsx e components/checkout/*
- [X] T017 [US2] `validarPedido` aceita `itens[].variacaoId` em lib/pedidos/validation.ts; rota app/api/pedidos/route.ts repassa
- [X] T018 [US2] `criarPedido` e `validarEstoque` por produto+variação em lib/pedidos/repository.ts e lib/pedidos/estoque.ts (+ testes em lib/pedidos/estoque.test.ts)
- [X] T019 [US2] Abater estoque da variação em lib/estoque/abatimento.ts
- [X] T020 [US2] Nome e foto da variação em lib/pedidos/apresentacao.ts (admin, área do cliente, e-mail)

## Phase 5: User Story 3 - Calculadora por variação (P2)

**Independent test**: "Calcular" no Kit 3 abre com o mesmo custo; "Aplicar na variação" grava os preços.

- [X] T021 [US3] `valoresDaVariacao` em lib/produtos/calculadoraDoProduto.ts e `buscarCalculoDoProduto(produtoId, variacaoId?)` + gravação de `variacaoId` em lib/produtos/calculosPreco.ts e rotas de cálculo
- [X] T022 [US3] Página app/admin/(painel)/produtos/calculadora/page.tsx com `?variacao=`
- [X] T023 [US3] `PATCH` em app/api/produtos/[id]/variacoes/[variacaoId]/precos/route.ts
- [X] T024 [US3] Botão "Aplicar na variação" em components/admin/CalculadoraRapida.tsx

## Phase 6: Polish

- [X] T025 Rodar `npx tsc --noEmit`, `npx vitest run` e `npm run lint`, e corrigir falhas
- [X] T026 Atualizar o card EDI-138 e entregar o guia de teste e o nome do commit

## Dependencies

Phase 2 → US1 → US2 (precisa de variações salvas) → US3. T003, T004 e T006 são paralelos.

## MVP

US1 + US2 (cadastrar e vender). US3 é incremental.
