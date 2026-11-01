# Implementation Plan: Frete no checkout (PAC, SEDEX e combinar com a loja)

**Branch**: `claude/frete-por-cep-ebmhxw` (sem issue no Linear) | **Date**: 2026-11-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/039-frete-checkout/spec.md`

## Summary

O checkout do site passa a oferecer três formas de entrega: PAC, SEDEX e Combinar com a loja (grátis). PAC e SEDEX têm valor fixo por pedido, configurável em Admin › Configurações. Os valores iniciais são R$ 19,90 e R$ 25,50. O servidor recalcula o frete ao criar o pedido, recusa com 409 se o valor exibido ao cliente divergir do vigente, grava `frete` no pedido e soma o frete em `valorTotal`, que já é o valor cobrado no Mercado Pago. O cálculo fica em uma função única (`calcularOpcoesFrete`), preparada para receber uma calculadora por CEP/peso no futuro, com fallback para o valor fixo.

## Technical Context

**Language/Version**: TypeScript 5, Node 24
**Primary Dependencies**: Next.js 16 (App Router), React 19, MongoDB driver. Nenhuma dependência nova.
**Storage**: MongoDB. Novo documento `_id: "frete"` na coleção `configuracoes` existente; novo campo opcional `frete` em `pedidos`.
**Testing**: Vitest. Funções puras (cálculo de opções, validação de config, validação do checkout, descrição do frete) e rotas com repositório mockado.
**Target Platform**: Vercel, loja web e admin
**Project Type**: web (monolito Next.js)
**Performance Goals**: opções de frete carregadas uma vez ao abrir o checkout; troca de opção recalcula o total no cliente (< 100 ms)
**Constraints**: erros com status real na aba Network; preço do frete definido só no servidor; sem subir servidor; sem commit
**Scale/Scope**: 3 formas de entrega, 1 documento de configuração, pedidos do canal `site`

## Constitution Check

`.specify/memory/constitution.md` ainda é o template, sem gates formais. Regras do `CLAUDE.md`:
- Erros visíveis na Network: 400 com `campos.frete` e 409 com `codigo: "frete_divergente"`, nunca engolidos.
- Textos pt-BR inline, no padrão atual de rótulos/constantes (o projeto não tem biblioteca de i18n).
- Invocar `frontend-design` antes de mexer na UI do checkout.
- Sem subir servidor e sem commit.

✅ Reavaliado após o design: sem violações.

## Project Structure

### Documentation (this feature)

```text
specs/039-frete-checkout/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/api.md
└── tasks.md
```

### Source Code (repository root)

```text
lib/models/frete.ts                               # ServicoFrete, FreteConfig, FRETE_PADRAO, FretePedido, OpcaoFrete, rótulos
lib/frete/calculo.ts (+ .test.ts)                 # calcularOpcoesFrete (fixo + gancho CalculadoraFrete), resolverFretePedido
lib/frete/validation.ts (+ .test.ts)              # validarConfigFrete
lib/frete/apresentacao.ts (+ .test.ts)            # descreverFrete ("SEDEX — R$ 25,50" / "Combinar com a loja — Grátis")
lib/frete/repository.ts                           # buscarConfigFrete / salvarConfigFrete (coleção configuracoes)
lib/models/pedido.ts                              # Pedido.frete?: FretePedido
lib/pedidos/validation.ts (+ test)                # payload.frete { servico, valorCentavos }
lib/pedidos/repository.ts                         # criarPedido recebe frete; valorTotal = subtotal + frete
lib/pedidos/apresentacao.ts                       # frete em PedidoResumo / PedidoDetalhado
lib/email/resend.ts                               # linha "Entrega" nos 4 e-mails do site
app/api/frete/route.ts (+ test)                   # POST público: opções de frete
app/api/admin/configuracoes/frete/route.ts (+ test) # GET / PUT
app/api/pedidos/route.ts (+ test)                 # resolve frete, 409 frete_divergente
app/admin/(painel)/configuracoes/page.tsx         # seção "Frete do site"
components/admin/FreteConfigForm.tsx
app/checkout/page.tsx                             # carrega opções, guarda escolha, passa ao resumo
components/checkout/FormularioCheckout.tsx        # seção "entrega" (rádios), envia frete, trata 409 do frete
components/checkout/ResumoPedido.tsx              # subtotal, frete, total
components/checkout/checkout.module.css
app/pedido/[id]/page.tsx                          # resumo com frete
components/cliente/ListaPedidos.tsx               # linha de entrega (Minha conta)
components/admin/PedidosLista.tsx                 # entrega no detalhe do pedido
```

**Structure Decision**: mesmo padrão das specs anteriores: lógica pura em `lib/`, rotas finas em `app/api/`, componentes client em `components/`.

## Complexity Tracking

Sem violações.
