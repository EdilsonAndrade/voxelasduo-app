# Implementation Plan: Calculadora de preço multicanal com margem real

**Branch**: `main` (sem branch de feature, por decisão do solicitante) | **Date**: 2026-09-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/019-calculadora-preco-multicanal/spec.md` (Linear EDI-106)

## Summary

Estender o simulador de precificação do EDI-92 (`components/admin/SimuladorPrecificacao.tsx`, `lib/produtos/precificacao.ts`) com um comparativo por canal (Mercado Livre, Shopee, site próprio) mostrando preço sugerido, taxa, lucro líquido e margem. As taxas da Shopee e do site próprio (percentual + taxa fixa) têm padrão global editável numa nova tela do admin e override opcional por produto. A taxa de falha (%) entra como campo próprio em `CustoProducao` (a "margem de perda" existente só cobre o filamento) e o custo passa a ser por peça boa. O formulário ganha a ação "copiar custos de outro produto". Toda a matemática fica em funções puras testáveis em `lib/`.

## Technical Context

**Language/Version**: TypeScript, Next.js 16 (App Router), React 19
**Primary Dependencies**: Next.js, MongoDB driver (`mongodb`) — nenhuma dependência nova
**Storage**: MongoDB — coleção nova `configuracoes` (documento único `_id: "taxasCanais"`); campos opcionais novos em `Produto` (`taxasCanais?`) e em `CustoProducao` (`taxaFalhaPercentual?`). Sem migração: produtos antigos herdam falha 0% e taxas globais.
**Testing**: Vitest (`environment: "node"`) — funções puras (`canais.ts`, `custoProducao.ts`, `precificacao.ts`), validação e rota da configuração global. UI verificada manualmente via Test Guide (sem `jsdom`, padrão já aceito em EDI-92/EDI-98).
**Target Platform**: Web (admin do site, Next.js na Vercel)
**Project Type**: web-service (aplicação Next.js full-stack existente)
**Performance Goals**: Recalcular o comparativo instantaneamente no cliente a cada campo alterado (SC-001)
**Constraints**: Sem integração com API da Shopee/gateways; comissão real do ML continua vindo de `/api/mercado-livre/simular-preco`; textos seguem o padrão do admin (ver Constitution Check / i18n)
**Scale/Scope**: Loja pequena, um administrador; um documento global de taxas

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` está com o template de exemplo, sem princípios preenchidos — nenhum gate adicional além das convenções já seguidas: lógica pura em `lib/` com testes, sem dependência nova, mudança de schema aditiva e opcional.

**i18n (regra 9 do CLAUDE.md)**: o projeto não possui biblioteca/dicionário de i18n; todos os textos do admin (incluindo o simulador do EDI-92) são strings pt-BR inline nos componentes. O padrão existente é seguido: textos novos inline em pt-BR, sem criar infraestrutura de i18n nova (fora do escopo).

Re-check pós-design: nenhuma violação.

## Project Structure

### Documentation (this feature)

```text
specs/019-calculadora-preco-multicanal/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── configuracoes-taxas.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

Aplicação Next.js única já existente:

```text
lib/models/configuracao.ts                         # novo: TaxasCanaisConfig + coleção "configuracoes"
lib/models/produto.ts                              # alterado: CustoProducao.taxaFalhaPercentual?, Produto.taxasCanais?
lib/configuracoes/repository.ts                    # novo: buscarTaxasCanais (com defaults) / salvarTaxasCanais
lib/configuracoes/validation.ts                    # novo: valida payload de taxas
lib/produtos/canais.ts                             # novo: cálculo puro por canal + resolução global/override
lib/produtos/canais.test.ts                        # novo
lib/produtos/custoProducao.ts                      # alterado: aplica taxa de falha (custo por peça boa)
lib/produtos/custoProducao.test.ts                 # alterado
lib/produtos/custoProducaoFormulario.ts            # alterado: campo taxaFalhaPercentual no formulário
lib/produtos/taxasCanaisFormulario.ts              # novo: strings do form <-> TaxasCanaisProduto
lib/produtos/validation.ts (+ .test.ts)            # alterado: valida taxaFalha e taxasCanais

app/api/admin/configuracoes/taxas/route.ts (+ .test.ts)   # novo: GET/PUT do padrão global
app/admin/(painel)/configuracoes/page.tsx                 # novo: tela do padrão global
components/admin/TaxasCanaisForm.tsx                      # novo: formulário do padrão global
app/admin/(painel)/layout.tsx                             # alterado: link "Taxas dos canais"

components/admin/SimuladorPrecificacao.tsx         # alterado: comparativo por canal
components/admin/ProdutoForm.tsx                   # alterado: taxa de falha, override de taxas, copiar custos
app/admin/(painel)/produtos/novo/page.tsx          # alterado: passa taxas globais
app/admin/(painel)/produtos/[id]/editar/page.tsx   # alterado: passa taxas globais + override do produto
```

**Structure Decision**: sem estrutura nova — arquivos novos só onde há responsabilidade nova (taxas globais, cálculo por canal). A cópia de custos usa `GET /api/produtos` já existente (sem endpoint novo).
