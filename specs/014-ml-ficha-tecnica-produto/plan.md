# Implementation Plan: Ficha técnica opcional do produto para anúncios do Mercado Livre

**Branch**: `edilsonaandrade/edi-90-mercado-livre-ficha-tecnica-opcional-do-produto-dimensoes` | **Date**: 2026-09-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/014-ml-ficha-tecnica-produto/spec.md`

## Summary

Permitir que o vendedor preencha, de forma totalmente opcional, uma ficha técnica do produto (altura/largura/comprimento, peso, material, itens inclusos) que é enviada ao Mercado Livre na publicação e nas correções retroativas: cada campo preenchido vira um atributo estruturado da categoria (`HEIGHT`/`WIDTH`/`LENGTH`/`WEIGHT`/`MATERIAL`) quando a categoria expõe esse atributo, e cai num bloco complementar da descrição do anúncio quando não expõe (sempre o caso de "itens inclusos", que não tem atributo padrão). Reaproveita integralmente o mecanismo de correção sem republicar já existente (EDI-95/EDI-96): `atualizarAtributosAnuncio()` passa a também atualizar a descrição quando necessário.

## Technical Context

**Language/Version**: TypeScript 5.7 (Next.js 16, React 19)
**Primary Dependencies**: Next.js App Router, MongoDB Driver 6.x — sem novas dependências externas
**Storage**: MongoDB (coleção `produtos` — novo campo opcional `fichaTecnica`)
**Testing**: Vitest, seguindo o padrão de `lib/estoque/canais/mercadoLivre/*.test.ts` (fetch mockado) e `lib/produtos/validation.test.ts`
**Target Platform**: Web (Vercel) — painel admin existente + integração servidor-a-servidor com a API do Mercado Livre
**Project Type**: Web application (Next.js full-stack, mesma estrutura das features anteriores)
**Performance Goals**: N/A — mesmo volume/fluxo já existente para publicação e correção de atributos (poucas dezenas/centenas de produtos)
**Constraints**: Não bloquear publicação quando a ficha técnica estiver vazia ou parcialmente preenchida (FR-002); não sobrescrever descrição escrita pelo vendedor (FR-005); atualização retroativa idempotente, sem duplicar texto (FR-007); não reaproveitar/confundir com `EmbalagemEnvio` (frete, EDI-96) nem `CustoProducao.pesoPecaGramas` (custo, EDI-92)
**Scale/Scope**: Mesmo escopo de produtos já publicados no Mercado Livre hoje; sem necessidade de fila/processamento assíncrono dedicado — reaproveita o script de correção em lote já existente (EDI-95/EDI-96)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` continua com os placeholders do template — nenhum princípio ratificado, nenhum gate aplicável. Nenhuma violação a registrar em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/014-ml-ficha-tecnica-produto/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
lib/
├── models/
│   └── produto.ts                          # + interface FichaTecnicaProduto, + campo `fichaTecnica` em Produto
├── produtos/
│   ├── validation.ts                       # + validarFichaTecnica (campos individualmente opcionais)
│   └── validation.test.ts
└── estoque/canais/mercadoLivre/
    ├── atributos.ts                        # + atributosFichaTecnica() (mapeia para HEIGHT/WIDTH/LENGTH/WEIGHT/MATERIAL + paraDescricao)
    ├── atributos.test.ts
    ├── anuncios.ts                         # montarAtributos() passa a incluir ficha técnica;
    │                                        #   criarAnuncio() monta descrição com bloco de ficha técnica;
    │                                        #   atualizarAtributosAnuncio() também atualiza a descrição quando necessário;
    │                                        #   nova aplicarFichaTecnicaNaDescricao() (idempotente, por marcador)
    └── anuncios.test.ts                    # + testes dos novos comportamentos

app/
└── api/produtos/[id]/mercado-livre/
    ├── corrigir-atributos/route.ts         # sem mudança de contrato — atualizarAtributosAnuncio já estendida
    └── publicar/route.ts                   # sem mudança de contrato — criarAnuncio já estendida

components/admin/
└── ProdutoForm.tsx                         # + seção "Ficha técnica" (altura/largura/comprimento/peso/material/itens inclusos)

scripts/
└── corrigir-atributos-mercado-livre.ts     # sem mudança — já reaproveita atualizarAtributosAnuncio estendida
```

**Structure Decision**: Mesma aplicação Next.js App Router já existente — estende os módulos já usados por EDI-95/EDI-96 (`lib/estoque/canais/mercadoLivre/atributos.ts` e `anuncios.ts`) e o formulário de produto, sem criar nenhuma rota HTTP nova (ver `contracts/ficha-tecnica-no-anuncio.md`) nem novo script.

## Complexity Tracking

> Nenhuma violação de constituição a justificar — seção não aplicável.
