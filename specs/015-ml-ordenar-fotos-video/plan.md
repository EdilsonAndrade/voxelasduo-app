# Implementation Plan: Ordenar fotos do produto (Mercado Livre e site)

**Branch**: `edilsonaandrade/edi-99-mercado-livre-permitir-reordenar-fotos-e-video-antes-de` | **Date**: 2026-09-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/015-ml-ordenar-fotos-video/spec.md`

## Summary

Vendedor passa a poder reordenar (drag-and-drop + botões mover para cima/baixo) as fotos já cadastradas de um produto no admin. A ordem persistida em `produto.fotos` já é a mesma fonte usada pela galeria do site e pelo array `pictures` enviado ao criar/republicar o anúncio no Mercado Livre — só falta dar controle de posição ao vendedor e aplicar o limite de 6 fotos do Mercado Livre (com indicação visual de quais entram) na hora de montar o anúncio. Vídeo fica fora de escopo (EDI-88).

## Technical Context

**Language/Version**: TypeScript, Next.js 16 (App Router), React 19
**Primary Dependencies**: Next.js, MongoDB driver (`mongodb`), integração própria com a API do Mercado Livre (`lib/estoque/canais/mercadoLivre/*`) — nenhuma dependência nova
**Storage**: MongoDB, coleção `produtos` — nenhuma mudança de schema (`produto.fotos: string[]` já existe, data-model.md)
**Testing**: Vitest (`environment: "node"`, sem componente/UI — lógica em `lib/` testada, UI verificada manualmente via Test Guide, research.md #5)
**Target Platform**: Web (admin do site, Next.js na Vercel)
**Project Type**: web-service (aplicação Next.js full-stack existente)
**Performance Goals**: N/A além do padrão de responsividade de uma tela de admin (sem novo endpoint, sem chamada de rede adicional na reordenação)
**Constraints**: Sem nova dependência de npm para drag-and-drop (API nativa HTML5, research.md #4); reaproveitar `PATCH /api/produtos/:id` existente, sem endpoint novo (contracts/ordenar-fotos.md)
**Scale/Scope**: Feature de admin, catálogo pequeno, produtos com tipicamente até ~10 fotos

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` está com o template de exemplo, sem princípios preenchidos pelo projeto — nenhum gate adicional a verificar além dos já seguidos por convenção (padrões deste plano: lib/ testável, sem dependência nova, sem mudança de schema).

## Project Structure

### Documentation (this feature)

```text
specs/015-ml-ordenar-fotos-video/
├── plan.md              # Este arquivo
├── research.md          # Fase 0
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1
├── contracts/
│   └── ordenar-fotos.md
└── tasks.md             # Fase 2 (/speckit.tasks)
```

### Source Code (repository root)

Aplicação Next.js única (App Router) já existente — sem estrutura nova, só arquivos alterados/criados dentro do layout atual:

```text
components/admin/
├── ProdutoForm.tsx        # alterado: reordenar fotos (drag-and-drop + botões), badge "vai para o ML"
└── admin.module.css       # alterado: estilos das miniaturas arrastáveis e do badge

lib/estoque/canais/mercadoLivre/
├── fotos.ts               # novo: fotosParaAnuncio() (data-model.md)
├── fotos.test.ts          # novo
└── anuncios.ts            # alterado: criarAnuncio usa fotosParaAnuncio() ao montar pictures
                            # (alterado também: anuncios.test.ts, novo caso >6 fotos)
```

Nenhuma rota nova em `app/api/`; `PATCH /api/produtos/[id]/route.ts` é reaproveitado sem mudança de código (contracts/ordenar-fotos.md).

**Structure Decision**: Alteração cirúrgica no admin existente (`ProdutoForm.tsx`) e na lib de integração com o Mercado Livre (`lib/estoque/canais/mercadoLivre/`) — segue o mesmo padrão já usado em EDI-90/EDI-92/EDI-95/96 (lógica testável em `lib/`, UI consumindo essa lógica, sem endpoint novo).

## Complexity Tracking

> Sem violações do Constitution Check — nada a justificar aqui.
