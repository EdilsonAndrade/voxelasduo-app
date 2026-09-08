# Implementation Plan: Correções urgentes de atributos e frete nos anúncios do Mercado Livre

**Branch**: `edilsonaandrade/edi-95-edi-96-marca-modelo-e-frete-embalagem` | **Date**: 2026-09-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/013-ml-fix-atributos-frete/spec.md`

## Summary

Duas correções urgentes no fluxo de publicação no Mercado Livre: (1) a função que preenche atributos obrigatórios automaticamente (`valorPadraoAtributo`) usa o nome do produto tanto para Marca quanto para Modelo quando ambos são texto livre, fazendo os dois saírem idênticos — corrigir para Marca usar um valor genérico distinto; (2) `criarAnuncio()` nunca envia peso/dimensões da embalagem (não são atributos obrigatórios na maioria das categorias), fazendo o Mercado Livre calcular frete com base num padrão impreciso — adicionar esses dados ao cadastro de produto e enviá-los na publicação. Ambas as correções precisam também ser aplicadas a anúncios **já publicados**, sem despublicar/republicar: via uma nova função de atualização de atributos (`PUT /items/{id}`), acionável tanto por uma ação no admin quanto por um script de correção em lote para os anúncios já ativos.

## Technical Context

**Language/Version**: TypeScript 5.7 (Next.js 16, React 19)
**Primary Dependencies**: Next.js App Router, MongoDB Driver 6.x, `tsx` (scripts de manutenção, já usado em `scripts/seed.ts`) — sem novas dependências externas
**Storage**: MongoDB (coleção `produtos` — novo campo opcional `embalagemEnvio`)
**Testing**: Vitest, seguindo o padrão de `lib/estoque/canais/mercadoLivre/*.test.ts` (fetch mockado)
**Target Platform**: Web (Vercel) — painel admin existente + integração servidor-a-servidor com a API do Mercado Livre
**Project Type**: Web application (Next.js full-stack, mesma estrutura das features anteriores)
**Performance Goals**: Correção retroativa deve conseguir processar todos os produtos com anúncio no Mercado Livre sem exceder limites de rate limit da API (processamento sequencial ou em lotes pequenos é aceitável, dado o volume atual)
**Constraints**: Não despublicar/republicar anúncios já ativos para aplicar a correção (FR-004/FR-009); não quebrar o fluxo existente de sincronização de preço/estoque/descrição (`sincronizarAnuncioProduto`); mudanças restritas ao Mercado Livre (Shopee fora de escopo)
**Scale/Scope**: Poucas dezenas/centenas de produtos publicados atualmente — correção retroativa via script único é suficiente, sem necessidade de fila/processamento assíncrono dedicado

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` continua com os placeholders do template — nenhum princípio ratificado, nenhum gate aplicável. Nenhuma violação a registrar em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/013-ml-fix-atributos-frete/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/             # Phase 1 output
└── tasks.md              # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
lib/
├── models/
│   └── produto.ts                          # + campo `embalagemEnvio` (novo)
├── produtos/
│   ├── validation.ts                       # + validação de `embalagemEnvio`
│   └── validation.test.ts
└── estoque/canais/mercadoLivre/
    ├── atributos.ts                        # corrige `valorPadraoAtributo` (Marca) + nova `atributosEmbalagem()`
    ├── atributos.test.ts                   # + casos de teste da correção
    ├── anuncios.ts                         # `criarAnuncio()` passa a incluir atributos de embalagem;
    │                                        #   nova `atualizarAtributosAnuncio()` para corrigir anúncio já publicado
    └── anuncios.test.ts                    # + testes da nova função e do envio de embalagem na criação

app/
├── api/produtos/[id]/mercado-livre/
│   └── corrigir-atributos/
│       └── route.ts                        # NOVO: POST — reaplica atributos corrigidos num anúncio já publicado
└── admin/(painel)/produtos/[id]/editar/    # sem mudança estrutural (usa ProdutoForm)

components/admin/
└── ProdutoForm.tsx                         # + campos de embalagem para envio; + botão "Corrigir atributos no Mercado Livre" (produto já publicado)

scripts/
└── corrigir-atributos-mercado-livre.ts     # NOVO: script único de correção em lote para anúncios já publicados
```

**Structure Decision**: Mesma aplicação Next.js App Router já existente — estende os módulos de integração com o Mercado Livre (`lib/estoque/canais/mercadoLivre/`) e o formulário de produto já existentes, em vez de criar uma nova área. Um script de manutenção (`scripts/`) é usado para a correção em lote de anúncios já publicados, seguindo o padrão já existente (`scripts/seed.ts`, `scripts/seed-admin.ts`, executados via `tsx`).

## Complexity Tracking

> Nenhuma violação de constituição a justificar — seção não aplicável.
