# Implementation Plan: Integração de Pagamento (Mercado Pago)

**Branch**: `edilsonaandrade/edi-77-tarefa-4-integracao-de-pagamento-mercado-pago` | **Date**: 2026-09-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/004-pagamento-mercado-pago/spec.md` (Linear EDI-77)

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Integrar o Payment Brick do Mercado Pago (cartão de crédito e Pix, embutido no próprio site) ao pedido "pendente" já criado na Tarefa 3 (EDI-76): a página `/pedido/[id]` passa a exibir o Brick enquanto o pedido está pendente, uma nova rota `POST /api/pagamentos` cria/retenta a tentativa de pagamento junto ao Mercado Pago (sempre com o valor lido do banco, nunca do cliente), e uma rota de webhook `POST /api/pagamentos/webhook` recebe a confirmação assíncrona, valida a assinatura e promove o pedido para "pago" de forma idempotente. Pagamento recusado ou expirado mantém o pedido "pendente" e permite nova tentativa (correção de uma suposição da Tarefa 3). Abatimento de estoque fica inteiramente fora de escopo (EDI-78).

## Technical Context

**Language/Version**: TypeScript 5.7 sobre Node.js 20 LTS (runtime da Vercel) — mesma base das Tarefas 1-3
**Primary Dependencies**: Next.js 16, React 19.2, `mongodb` 6.12 (já no projeto). Novas dependências: `mercadopago` (SDK Node oficial, server-side — criação/consulta de pagamentos) e `@mercadopago/sdk-react` (Payment Brick, client-side)
**Storage**: MongoDB Atlas — coleção `pedidos` (já existente), campo `pagamento` ganha estrutura (`tentativas[]`); nenhuma coleção nova
**Testing**: Vitest — testes unitários de validação de assinatura do webhook (`x-signature`), conversão centavos↔reais, e mapeamento de status Mercado Pago → status interno da tentativa
**Target Platform**: Web — Vercel (Serverless Functions do Next.js)
**Project Type**: Aplicação web full-stack única (mesma estrutura das Tarefas 1-3, sem backend separado)
**Performance Goals**: Volume pequeno (dezenas de pedidos); webhook deve responder rapidamente (poucos segundos) para não acionar reenvio desnecessário do Mercado Pago
**Constraints**: Sem backend separado; sem autenticação (guest, como na Tarefa 3); nenhuma credencial versionada (`.env.local`/Vercel env vars); sem abatimento de estoque (EDI-78); credenciais de teste (sandbox) em dev, produção só ao publicar; valores trafegados ao Mercado Pago em reais, internamente sempre em centavos (conversão isolada); webhook testado em dev via túnel ngrok (URL muda a cada reinício — precisa recadastro manual no painel do MP)
**Scale/Scope**: Dezenas de pedidos; poucas tentativas de pagamento por pedido

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` continua no estado de template padrão (placeholders `[PRINCIPLE_1_NAME]` etc.) — sem constituição própria ratificada, como já registrado nos planos das Tarefas 1-3. Não há gates formais a validar nesta fase — nenhuma violação identificada.

## Project Structure

### Documentation (this feature)

```text
specs/004-pagamento-mercado-pago/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
app/
├── pedido/
│   └── [id]/
│       └── page.tsx                    # ESTENDE Tarefa 3: renderiza <PagamentoBrick> quando pendente; confirmação normal quando pago
└── api/
    └── pagamentos/
        ├── route.ts                    # POST: cria/retenta uma tentativa de pagamento para um pedido pendente
        └── webhook/
            └── route.ts                # POST: recebe notificações do Mercado Pago, valida assinatura, atualiza pedido

components/
└── pagamento/
    ├── PagamentoBrick.tsx              # Client Component: Payment Brick (@mercadopago/sdk-react) — cartão + Pix
    ├── StatusPagamento.tsx             # Exibe recusado/pendente/expirado com opção de tentar novamente
    └── *.module.css

lib/
├── models/
│   └── pedido.ts                       # PagamentoPedido detalhado (tentativas[]) — estende Tarefa 1/3
└── pagamentos/
    ├── mercadopago.ts                  # Client MP (server-side): wrappers criar/consultar pagamento
    ├── webhook.ts                      # Validação de assinatura x-signature + parsing do payload
    ├── webhook.test.ts
    ├── conversao.ts                    # centavos <-> reais (única fronteira com a API do MP)
    ├── conversao.test.ts
    ├── status.ts                       # Mapeamento status Mercado Pago -> StatusTentativaPagamento
    ├── status.test.ts
    └── repository.ts                   # registrarTentativa, atualizarStatusPagamento (idempotente), buscarPedidoPorTentativaAtiva
```

**Structure Decision**: Mantém o projeto Next.js único das Tarefas 1-3. Nenhuma rota nova de página — reaproveita `app/pedido/[id]/page.tsx` para hospedar o Brick, evitando uma etapa extra na jornada. `lib/pagamentos/` concentra a lógica de domínio pura (testável com Vitest) e o wrapper do SDK do Mercado Pago, seguindo a mesma divisão de `lib/carrinho/` e `lib/pedidos/` da Tarefa 3. As rotas de API (`app/api/pagamentos/*`) permanecem como camada fina sobre `lib/pagamentos`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

N/A — nenhuma violação identificada (não há constituição ratificada para o projeto ainda).
