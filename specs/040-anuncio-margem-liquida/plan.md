# Implementation Plan: Anúncio pago opcional e margem líquida sobre o preço

**Branch**: `edilsonaandrade/edi-137-toggle-de-anuncio-pago-roas-e-margem-liquida-de-25-sobre-o` (EDI-137) | **Date**: 2026-11-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/040-anuncio-margem-liquida/spec.md`

## Summary

Três telas passam a tratar o anúncio pago e a margem do mesmo jeito:

- **Tempo de Impressão:** a margem de cada parte vira % **do preço**, calculada com `calcularPrecoPorMargem`, a mesma função da calculadora. Margem vazia usa o piso da loja (25%), e abaixo do piso aparece um aviso. O plano ganha um toggle "Anúncio pago" com ROAS, que só vale para a Shopee.
- **Produto:** `taxasCanais` ganha `anuncio { ativo, roasMeta }`. Ligado, Shopee e Mercado Livre reservam preço ÷ ROAS. Para isso, `TaxaCanal` ganha `anuncioPercentual`, que entra no divisor do preço e aparece como linha própria no resultado.
- **Calculadora:** muda só a interface. O seletor de três opções vira um interruptor "Anúncio pago". Ligado, você escolhe entre "embutido" e "do bolso", e o ROAS é pedido.

## Technical Context

**Language/Version**: TypeScript 5, Node 24
**Primary Dependencies**: Next.js 16 (App Router), React 19, MongoDB driver. Nenhuma dependência nova.
**Storage**: MongoDB. Campo opcional `anuncio` em `planosImpressao` e em `produtos.taxasCanais`. Não há migração: ausente quer dizer desligado.
**Testing**: Vitest. Funções puras de `canais.ts`, `ganhoImpressao.ts`, `taxasCanaisFormulario.ts`, validação de `planosImpressao.ts` e de `produtos/validation.ts`.
**Target Platform**: Vercel, admin
**Project Type**: web (monolito Next.js)
**Performance Goals**: recálculo no cliente a cada digitação (< 50 ms)
**Constraints**: erros com status real na Network (400 com mensagem); sem subir servidor; sem commit
**Scale/Scope**: 3 telas, 2 coleções com campo opcional novo

## Constitution Check

`.specify/memory/constitution.md` ainda é o template e não tem gates formais. Regras do `CLAUDE.md`:
- Erros visíveis na Network: ROAS e margem inválidos voltam como 400 com `erro`, sem ser engolidos.
- Textos em pt-BR inline, no padrão de rótulos e constantes que o projeto já usa (não há biblioteca de i18n).
- Invocar `frontend-design` antes de mexer na interface das três telas.
- Sem subir servidor e sem commit.

✅ Reavaliado após o design: sem violações.

## Project Structure

### Documentation (this feature)

```text
specs/040-anuncio-margem-liquida/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── api.md
└── tasks.md            # /speckit-tasks
```

### Source Code (repository root)

```text
lib/
├── models/planoImpressao.ts          # + AnuncioPago, PlanoImpressao.anuncio
├── models/produto.ts                 # + TaxasCanaisProduto.anuncio
├── produtos/canais.ts                # TaxaCanal.anuncioPercentual, ResultadoCanal.anuncioCentavos, comAnuncio()
├── produtos/anuncioPago.ts           # NOVO: percentualDoRoas, validarAnuncioPago
├── produtos/taxasCanaisFormulario.ts # campos anuncioAtivo/anuncioRoasMeta
├── produtos/validation.ts            # valida taxasCanais.anuncio
├── producao/ganhoImpressao.ts        # margem sobre o preço + anúncio na Shopee
├── producao/planosImpressao.ts       # valida margem 0–99,9 e anuncio
└── kits/doTempoImpressao.ts          # margem líquida → markup equivalente para o kit
app/api/admin/tempo-impressao/        # POST/PUT aceitam `anuncio`
components/admin/
├── tempoImpressao/PlanoProdutoCard.tsx  # interruptor + ROAS, aviso abaixo do piso
├── ProdutoForm.tsx                      # interruptor + ROAS no fieldset de margens
├── SimuladorPrecificacao.tsx            # linha "Anúncio" por canal
└── calculadora/SecoesEstrategia.tsx     # SecaoAds como interruptor
```

**Structure Decision**: monolito Next.js já existente. A regra do anúncio fica num módulo puro (`anuncioPago.ts`) usado pelas três telas.

## Complexity Tracking

Sem violações.
