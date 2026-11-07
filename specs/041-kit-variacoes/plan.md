# Implementation Plan: Produto com variações de kit

**Branch**: `edilsonaandrade/edi-138-produto-com-variacoes-de-kit-kit-3` (EDI-138) | **Date**: 2026-11-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/041-kit-variacoes/spec.md`

## Summary

`Produto` ganha `variacoes?: VariacaoKit[]`. Cada variação tem id estável, nome, peças (`produtoId` + quantidade + últimos valores), embalagem do kit, preço do site, preços de referência da Shopee e do Mercado Livre, estoque e foto. Com variações, `produto.preco` = menor preço e `produto.estoque` = soma, recalculados no servidor sempre que as variações mudam ou o estoque de uma variação é abatido. Assim vitrine, busca, feed e listas continuam funcionando sem mudança.

- **Admin**: nova seção "Variações de kit" na edição do produto (componente próprio, com botão de salvar próprio) → `PUT /api/produtos/[id]/variacoes`. O custo de cada variação reaproveita `valoresDoComponente`/`custoSemEmbalagem` do montador de kits (specs/037).
- **Loja**: a página do produto passa a usar o componente cliente `CompraComVariacoes`, que controla a variação escolhida e troca preço, foto, estoque e itens inclusos. O carrinho identifica a linha por `produtoId + variacaoId`.
- **Pedido**: `criarPedido` agrupa por `produtoId + variacaoId`, usa o preço da variação, valida o estoque da variação e grava `variacaoId` + `variacaoNome` no item. `abaterEstoquePedido` abate de forma atômica `variacoes.$.estoque` e `estoque`.
- **Calculadora**: `?produto=X&variacao=Y` abre com o custo da variação. O cálculo salvo ganha `variacaoId`, e o botão "Aplicar na variação" chama `PATCH /api/produtos/[id]/variacoes/[variacaoId]/precos`.

## Technical Context

**Language/Version**: TypeScript 5, Node 24
**Primary Dependencies**: Next.js 16 (App Router), React 19, MongoDB driver. Nenhuma dependência nova.
**Storage**: MongoDB. Campos opcionais: `produtos.variacoes`, `pedidos.itens[].variacaoId/variacaoNome`, `calculosPreco.variacaoId`. Sem migração: ausente = produto simples.
**Testing**: Vitest em funções puras: validação de variações, derivação de preço/estoque, custo da variação, carrinho com variação, validação de estoque por variação, apresentação do item.
**Target Platform**: Vercel (loja + admin)
**Project Type**: web (monolito Next.js)
**Performance Goals**: troca de variação na página sem ida ao servidor (< 1 s)
**Constraints**: erros com status real na Network (400/404/409 com `erro`); sem subir servidor; sem commit; textos em pt-BR inline (padrão do projeto, sem biblioteca de i18n)
**Scale/Scope**: até 10 variações por produto, até 30 peças por variação

## Constitution Check

`.specify/memory/constitution.md` ainda é o template. Regras do `CLAUDE.md`:
- Erros visíveis na Network: validação devolve 400 com `erro` e `campos`; produto inexistente 404.
- Textos seguem o padrão existente (pt-BR inline).
- Invocar `frontend-design` e `product-page-design` antes de mexer na página do produto e na seção do admin.
- Sem subir servidor e sem commit.

✅ Reavaliado após o design: sem violações.

## Project Structure

### Documentation (this feature)

```text
specs/041-kit-variacoes/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/api.md
└── tasks.md
```

### Source Code (repository root)

```text
lib/
├── models/produto.ts                 # + VariacaoKit, PecaVariacao, Produto.variacoes
├── models/pedido.ts                  # + ItemPedido.variacaoId/variacaoNome
├── models/calculoPreco.ts            # + CalculoPreco.variacaoId
├── produtos/variacoes.ts             # NOVO: validar, derivar preço/estoque, custo da variação, nome exibido
├── produtos/variacoesRepository.ts   # NOVO: salvar variações, aplicar preços, abater estoque atômico da variação
├── produtos/calculadoraDoProduto.ts  # + valoresDaVariacao
├── produtos/calculosPreco.ts         # buscarCalculoDoProduto(produtoId, variacaoId?)
├── carrinho/carrinho.ts              # chave da linha = produtoId + variacaoId
├── pedidos/estoque.ts                # validação por chave produto+variação
├── pedidos/repository.ts             # preço/estoque/nome da variação
├── pedidos/apresentacao.ts           # nome + foto da variação
├── pedidos/validation.ts             # aceita itens[].variacaoId
└── estoque/abatimento.ts             # abate a variação
app/
├── api/produtos/[id]/variacoes/route.ts                       # NOVO: PUT
├── api/produtos/[id]/variacoes/[variacaoId]/precos/route.ts   # NOVO: PATCH
├── api/produtos/[id]/route.ts                                 # PATCH ignora preco/estoque com variações
├── api/pedidos/route.ts                                       # repassa variacaoId
├── produtos/[categoria]/[slug]/page.tsx                       # usa CompraComVariacoes
└── admin/(painel)/produtos/calculadora/page.tsx               # ?variacao=
components/
├── admin/VariacoesKit.tsx (+ .module.css)   # NOVO: seção no ProdutoForm
├── admin/ProdutoForm.tsx                    # inclui a seção; preço/estoque só leitura com variações
├── admin/CalculadoraRapida.tsx              # botão "Aplicar na variação"
├── produtos/CompraComVariacoes.tsx          # NOVO: seletor + preço + galeria + botão
├── produtos/GaleriaFotosProduto.tsx         # aceita foto em destaque controlada
└── carrinho/BotaoAdicionarCarrinho.tsx, app/carrinho/page.tsx, checkout  # variacaoId
```

**Structure Decision**: monolito existente; lógica pura em `lib/produtos/variacoes.ts`, acesso ao banco num repositório próprio para não inflar `lib/produtos/repository.ts`.

## Complexity Tracking

Sem violações.
