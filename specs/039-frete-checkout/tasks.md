# Tasks: Frete no checkout (PAC, SEDEX e combinar com a loja)

**Input**: Design documents from `/specs/039-frete-checkout/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: incluídos (padrão do projeto: Vitest para funções puras e rotas com repositório mockado).

## Phase 1: Setup

Sem tarefas: nenhuma dependência nova nem estrutura a criar.

## Phase 2: Foundational (bloqueia todas as histórias)

- [X] T001 Criar tipos e constantes `ServicoFrete`, `SERVICOS_FRETE`, `ROTULO_SERVICO_FRETE`, `FreteConfig`, `FRETE_CONFIG_ID`, `FRETE_PADRAO` (PAC 1990, SEDEX 2550), `OrigemFrete`, `OpcaoFrete` e `FretePedido` em lib/models/frete.ts
- [X] T002 [P] Adicionar `frete?: FretePedido` à interface `Pedido` em lib/models/pedido.ts
- [X] T003 Implementar `calcularOpcoesFrete({ config, cep?, pacotes?, calculadora? })`, com a interface `CalculadoraFrete` e fallback para valor fixo, e `resolverFretePedido(servico, opcoes)` em lib/frete/calculo.ts
- [X] T004 [P] Testes de `calcularOpcoesFrete` (fixo, calculado, calculadora null/erro, item sem embalagem, combinar grátis) em lib/frete/calculo.test.ts
- [X] T005 Implementar `buscarConfigFrete()` (padrão quando não há documento) e `salvarConfigFrete()` na coleção `configuracoes` em lib/frete/repository.ts

## Phase 3: User Story 1 - Cliente escolhe a forma de entrega (P1) 🎯 MVP

**Goal**: o checkout oferece PAC, SEDEX e Combinar; o frete entra no total cobrado e é validado no servidor.
**Independent Test**: carrinho R$ 50 + SEDEX → total R$ 75,50 no resumo, no pedido e no pagamento.

- [X] T006 [US1] Aceitar e validar `payload.frete` (`servico` ∈ SERVICOS_FRETE, `valorCentavos` inteiro ≥ 0; erro em `campos.frete`) em lib/pedidos/validation.ts
- [X] T007 [P] [US1] Testes da validação do frete em lib/pedidos/validation.test.ts (incluir `frete` no payload válido)
- [X] T008 [US1] Fazer `criarPedido` receber `frete: FretePedido`, gravar `pedido.frete` e somar o frete em `valorTotal` em lib/pedidos/repository.ts
- [X] T009 [US1] Criar a rota pública `POST /api/frete`, que devolve `{ opcoes }` via `buscarConfigFrete` + `calcularOpcoesFrete`, em app/api/frete/route.ts
- [X] T010 [P] [US1] Testes da rota de opções com repositório mockado em app/api/frete/route.test.ts
- [X] T011 [US1] Em `POST /api/pedidos`: recalcular as opções, resolver o serviço escolhido, responder 409 `frete_divergente` com `opcoes` quando o valor divergir, repassar o frete ao `criarPedido` e devolver `pedido.frete`, em app/api/pedidos/route.ts
- [X] T012 [P] [US1] Testes: frete ausente → 400; divergente → 409; ok → `criarPedido` chamado com o frete do servidor, em app/api/pedidos/route.test.ts
- [X] T013 [US1] Invocar a skill `frontend-design` para a seção de entrega do checkout — skill indisponível na sessão; reaproveitado o visual existente do checkout
- [X] T014 [US1] Carregar as opções em `POST /api/frete` ao abrir o checkout, guardar a opção escolhida e passar opções, escolha e frete ao formulário e ao resumo, em app/checkout/page.tsx
- [X] T015 [US1] Adicionar a seção "entrega" com rádios (valor ou "grátis"), o aviso de "combinar", o envio de `frete` no payload, o erro `campos.frete` e o tratamento do 409 `frete_divergente` (atualiza opções e mostra mensagem) em components/checkout/FormularioCheckout.tsx
- [X] T016 [US1] Exibir subtotal, frete (rótulo + valor/"grátis") e total no `ResumoPedido` (props opcionais, compatível com o uso atual) em components/checkout/ResumoPedido.tsx
- [X] T017 [P] [US1] Estilos da seção de entrega e das linhas de subtotal/frete em components/checkout/checkout.module.css
- [X] T018 [US1] Mostrar o frete do pedido no resumo da página de pagamento em app/pedido/[id]/page.tsx

## Phase 4: User Story 2 - Lojista configura os valores (P2)

**Goal**: editar o PAC e o SEDEX no admin (padrão R$ 19,90 / R$ 25,50).
**Independent Test**: salvar SEDEX = 28,00 → o checkout mostra R$ 28,00.

- [X] T019 [P] [US2] Implementar `validarConfigFrete` (inteiros ≥ 0, obrigatórios) em lib/frete/validation.ts
- [X] T020 [P] [US2] Testes de `validarConfigFrete` em lib/frete/validation.test.ts
- [X] T021 [US2] Criar `GET` e `PUT` (400 com `campos`) em app/api/admin/configuracoes/frete/route.ts
- [X] T022 [P] [US2] Testes da rota de configuração do frete em app/api/admin/configuracoes/frete/route.test.ts
- [X] T023 [US2] Criar o formulário "Frete do site" (PAC/SEDEX em reais, erros por campo com status, toast) em components/admin/FreteConfigForm.tsx
- [X] T024 [US2] Renderizar o `FreteConfigForm` com `buscarConfigFrete()` na página de configurações em app/admin/(painel)/configuracoes/page.tsx

## Phase 5: User Story 3 - Frete aparece no pedido (P3)

**Goal**: a forma de entrega e o valor aparecem no admin, em Minha conta e nos e-mails.
**Independent Test**: pedido com SEDEX → "SEDEX — R$ 25,50" nos três lugares; pedidos antigos sem erro.

- [X] T025 [P] [US3] Implementar `descreverFrete(frete)` → "SEDEX — R$ 25,50" / "Combinar com a loja — Grátis" em lib/frete/apresentacao.ts
- [X] T026 [P] [US3] Testes de `descreverFrete` em lib/frete/apresentacao.test.ts
- [X] T027 [US3] Incluir `frete` em `PedidoResumo` e `PedidoDetalhado` em lib/pedidos/apresentacao.ts
- [X] T028 [US3] Exibir "Entrega: …" no detalhe do pedido (seção Cliente e entrega) em components/admin/PedidosLista.tsx
- [X] T029 [US3] Exibir a linha de entrega no card do pedido em components/cliente/ListaPedidos.tsx
- [X] T030 [US3] Adicionar a linha "Entrega: …" (texto e HTML) em `enviarPedidoCriadoCliente`, `notificarAdminPedidoCriado`, `enviarConfirmacaoPedido` e `notificarAdminVendaSite` em lib/email/resend.ts

## Phase 6: Polish

- [X] T031 Rodar `npx vitest run` e `npx tsc --noEmit` e corrigir falhas — tsc ok; 1 falha pré-existente em app/api/pedidos/[id]/route.test.ts (mock sem `fotos`), não relacionada
- [X] T032 Rodar `npx eslint` nos arquivos alterados — projeto sem eslint.config, não executável

## Dependencies

- T001 → T002–T005 → US1.
- US2 depende só de T001/T005; pode andar em paralelo com US1.
- US3 depende de T002 e de pedidos com frete (US1) para validar de ponta a ponta.

## Parallel Example (US1)

T007, T010, T012 e T017 em paralelo depois de T006/T009/T011.

## Implementation Strategy

MVP = Phase 2 + US1 (valores padrão já funcionam sem a tela do admin). Depois US2 e US3.
