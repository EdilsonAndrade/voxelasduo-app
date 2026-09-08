# Implementation Plan: Calculadora de custo e preço sugerido (Mercado Livre)

**Branch**: `edilsonaandrade/edi-92-mercado-livre-calculadora-de-custo-e-preco-sugerido-no` | **Date**: 2026-09-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/012-ml-calculadora-custo-preco/spec.md`

## Summary

No cadastro/edição de produto (área admin), adicionar (1) campos de custo de produção por produto (impressão 3D: peso, tempo, filamento, energia, depreciação da impressora, mão de obra, embalagem) com cálculo imediato do COGS no cliente; e (2) uma simulação de precificação que, ao digitar o preço de venda, consulta com debounce a API oficial de custos de venda do Mercado Livre (`/sites/MLB/listing_prices`) para obter a comissão real (não uma % fixa), reaproveitando a resolução de categoria já usada na publicação (`categorias.ts` / `previsorCategoria.ts`), e exibe COGS, comissão, lucro líquido e margem, com alerta de prejuízo/margem baixa. A comissão exibida pode ser sobrescrita manualmente pelo vendedor.

## Technical Context

**Language/Version**: TypeScript 5.7 (Next.js 16, React 19)
**Primary Dependencies**: Next.js App Router (API routes + páginas), MongoDB Driver 6.x, sem novas dependências externas
**Storage**: MongoDB (coleção `produtos` existente, `lib/models/produto.ts` / `lib/produtos/repository.ts`)
**Testing**: Vitest (`vitest run`), seguindo o padrão de testes unitários já usado em `lib/produtos/*.test.ts` e `lib/estoque/canais/mercadoLivre/*.test.ts`
**Target Platform**: Web (Vercel), painel administrativo Next.js já existente em `app/admin/(painel)/produtos`
**Project Type**: Web application (Next.js full-stack — frontend e API routes no mesmo projeto, sem split backend/frontend separado)
**Performance Goals**: Resposta da simulação de comissão em até 2s após o vendedor parar de digitar o preço (SC-001); cálculo de COGS instantâneo (client-side, sem round-trip de rede)
**Constraints**: Reaproveitar a autenticação OAuth2 já existente com o Mercado Livre (`lib/estoque/canais/mercadoLivre/auth.ts`); não introduzir chamada à API do Mercado Livre a cada tecla digitada (debounce obrigatório); não bloquear o salvamento do produto se a consulta de comissão falhar
**Scale/Scope**: Uso interno da equipe de cadastro de produtos (poucos usuários simultâneos); volume de chamadas à API do Mercado Livre limitado pelo debounce e pelo uso manual do formulário

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

O arquivo `.specify/memory/constitution.md` deste projeto ainda está com os placeholders do template (nenhum princípio foi ratificado). Não há gates de constituição aplicáveis a este projeto no momento — nenhuma violação a registrar em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/012-ml-calculadora-custo-preco/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
lib/
├── models/
│   └── produto.ts                          # + campo `custoProducao` (novo)
├── produtos/
│   ├── repository.ts                       # sem mudança estrutural (custoProducao viaja dentro de Produto)
│   ├── validation.ts                       # + validação dos campos de custoProducao
│   └── custoProducao.ts                    # NOVO: cálculo puro de COGS a partir de custoProducao
│   └── custoProducao.test.ts               # NOVO: testes unitários do cálculo de COGS
└── estoque/canais/mercadoLivre/
    ├── auth.ts                             # reaproveitado (obterAccessTokenValido)
    ├── categorias.ts                       # reaproveitado (resolverCategoriaMercadoLivre)
    ├── previsorCategoria.ts                # reaproveitado (preverCategoriaMercadoLivre)
    ├── erros.ts                            # reaproveitado (erroMercadoLivre)
    ├── precos.ts                           # NOVO: consulta a /sites/MLB/listing_prices (custo real de venda)
    └── precos.test.ts                      # NOVO

app/
├── api/
│   └── mercado-livre/
│       └── simular-preco/
│           └── route.ts                    # NOVO: POST — resolve categoria + consulta listing_prices
└── admin/(painel)/produtos/
    ├── novo/page.tsx                       # sem mudança (usa ProdutoForm)
    └── [id]/editar/page.tsx                # sem mudança (usa ProdutoForm)

components/admin/
├── ProdutoForm.tsx                         # + seção de custo de produção + simulador de precificação
├── SimuladorPrecificacao.tsx               # NOVO: UI de custo/comissão/lucro/margem, com debounce
└── SimuladorPrecificacao.module.css        # NOVO (ou reaproveita admin.module.css)
```

**Structure Decision**: Aplicação Next.js App Router única já existente (`app/` para páginas e API routes, `lib/` para lógica de domínio, `components/` para UI) — não há separação frontend/backend em projetos distintos. A feature estende os módulos já existentes de produto e de integração com o Mercado Livre em vez de criar uma nova área da aplicação.

## Complexity Tracking

> Nenhuma violação de constituição a justificar — seção não aplicável.
