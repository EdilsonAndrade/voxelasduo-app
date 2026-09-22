# Implementation Plan: Preço por canal com piso de margem e promoções elegíveis do Mercado Livre

**Branch**: `edilsonaandrade/edi-108-preco-por-canal-com-piso-de-margem-e-promocoes-elegiveis-do` | **Date**: 2026-09-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/021-preco-piso-canal-ml/spec.md` (Linear EDI-108)

## Summary

Estende o comparador de canais do EDI-106 com três peças: (1) margem mínima persistida (padrão global + override por produto, mesmo mecanismo de `taxasCanais`), usada para calcular um **preço mínimo** e um **desconto máximo** (R$/%) por canal — o piso de segurança para promoções, sem risco de vender no prejuízo; (2) preço de venda próprio por canal (`Produto.precosCanais`, opcional, ausente = usa o preço do site) sincronizado automaticamente ao salvar, pelo mesmo gatilho já existente; (3) para produtos publicados no Mercado Livre, consulta as promoções elegíveis via `/seller-promotions/...` e sinaliza quais respeitam o preço mínimo — com fallback gracioso (o resto da tela continua funcionando) se a consulta falhar, já que o endpoint exato foi só parcialmente confirmado (research.md #4).

## Technical Context

**Language/Version**: TypeScript, Next.js 16 (App Router), React 19
**Primary Dependencies**: Next.js, MongoDB driver (`mongodb`) — nenhuma dependência nova
**Storage**: MongoDB — sem coleção nova; campos aditivos em `configuracoes` (`margemMinimaPercentual`) e em `produtos` (`taxasCanais.margemMinimaPercentual`, `precosCanais`). Produtos existentes continuam válidos sem migração (FR-008).
**Testing**: Vitest (`environment: "node"`) — funções puras (`canais.ts`), validação, repositório de configurações e rotas (produtos, configurações, promoções ML). UI verificada manualmente via Test Guide (padrão já aceito em EDI-92/98/106/107).
**Target Platform**: Web (admin do site, Next.js na Vercel)
**Project Type**: web-service (aplicação Next.js full-stack existente)
**Performance Goals**: Preço mínimo/desconto máximo recalculados instantaneamente no cliente a cada campo alterado (mesma UX do comparador do EDI-106); consulta de promoções do ML é assíncrona, não bloqueia a exibição do restante da tela (SC-005)
**Constraints**: Endpoint de promoções elegíveis do ML parcialmente confirmado (research.md #4) — implementação MUST degradar graciosamente (FR-012) se o formato real divergir; Shopee sem consulta de promoções (sem API, FR-013); frete fora da fórmula do piso (EDI-94, separado)
**Scale/Scope**: Loja pequena, um administrador; cálculo por produto, sem histórico/persistência de promoções

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` está com o template de exemplo, sem princípios preenchidos — nenhum gate adicional além das convenções já seguidas: lógica pura em `lib/` com testes, integração externa isolada em `lib/estoque/canais/mercadoLivre/`, mudança de schema aditiva e opcional, sem dependência nova.

**Erros visíveis na aba Network (regra 3 do CLAUDE.md)**: a consulta de promoções do ML nunca converte falha em sucesso — status real (401/404/502) sempre refletido; falha nessa seção específica não afeta o restante da tela (FR-012, contracts/preco-piso-canal.md).

**i18n (regra 9 do CLAUDE.md)**: sem biblioteca de i18n no projeto; textos novos inline em pt-BR, seguindo o padrão existente.

Re-check pós-design: nenhuma violação. O risco técnico da User Story 3 (endpoint de promoções não 100% confirmado) é uma limitação de API externa, já contornada no desenho (duas chamadas com reachability confirmada, research.md #4) e com degradação graciosa prevista na spec (FR-012) — não uma simplificação de implementação.

## Project Structure

### Documentation (this feature)

```text
specs/021-preco-piso-canal-ml/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── preco-piso-canal.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

Aplicação Next.js única já existente:

```text
lib/models/configuracao.ts                         # alterado: TaxasCanaisConfig.margemMinimaPercentual, TAXAS_CANAIS_PADRAO
lib/models/produto.ts                               # alterado: TaxasCanaisProduto.margemMinimaPercentual?, Produto.precosCanais?

lib/produtos/canais.ts                               # alterado: calcularPrecoMinimoCanal, calcularResultadoPisoCanal
lib/produtos/canais.test.ts                          # alterado
lib/configuracoes/validation.ts (+ .test.ts)         # alterado: valida margemMinimaPercentual
lib/produtos/validation.ts (+ .test.ts)              # alterado: valida margemMinimaPercentual (override) e precosCanais

lib/estoque/canais/mercadoLivre/promocoes.ts         # novo: listarPromocoesElegiveis(itemId, precoMinimoCentavos)
lib/estoque/canais/mercadoLivre/promocoes.test.ts    # novo

lib/estoque/sincronizacao.ts                         # alterado: usa precosCanais.mercadoLivre/shopee ?? preco ao chamar atualizarAnuncio

app/api/admin/configuracoes/taxas/route.ts (+ .test.ts)     # alterado: aceita/valida margemMinimaPercentual
components/admin/TaxasCanaisForm.tsx                          # alterado: campo "Margem mínima aceitável (%)"

app/api/produtos/route.ts (+ .test.ts)                         # alterado: aceita taxasCanais.margemMinimaPercentual, precosCanais
app/api/produtos/[id]/route.ts (+ .test.ts)                    # alterado: idem
app/api/produtos/[id]/mercado-livre/promocoes/route.ts (+ .test.ts)   # novo: GET promoções elegíveis

components/admin/SimuladorPrecificacao.tsx           # alterado: preço mínimo + desconto máximo por canal, campo de margem mínima vem de props (não mais estado solto)
components/admin/ProdutoForm.tsx                     # alterado: preço por canal (override), override de margem mínima, seção de promoções elegíveis do ML
app/admin/(painel)/produtos/novo/page.tsx            # alterado: passa margemMinimaPercentual global
app/admin/(painel)/produtos/[id]/editar/page.tsx     # alterado: passa margemMinimaPercentual global + override do produto
```

**Structure Decision**: sem estrutura nova — segue exatamente o padrão de `lib/configuracoes/`, `lib/produtos/canais.ts` e `lib/estoque/canais/mercadoLivre/` já existentes (EDI-106/107). A rota de promoções segue a convenção já usada pelas demais sub-rotas de produto+ML (`app/api/produtos/[id]/mercado-livre/<ação>/route.ts`, ex.: `pausar`, `corrigir-atributos`).
