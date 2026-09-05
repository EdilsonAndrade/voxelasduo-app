# Implementation Plan: Integração com Mercado Livre — Anúncios e Vendas

**Branch**: `edilsonaandrade/edi-80-tarefa-7-integracao-com-mercado-livre` | **Date**: 2026-09-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/006-integracao-mercado-livre/spec.md` (Linear EDI-80)

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Estender a integração com Mercado Livre construída na Tarefa 5 (EDI-78 — que hoje só atualiza a quantidade de um anúncio já existente manualmente) para cobrir o ciclo completo do canal: publicar um produto do site como anúncio novo (envio de imagens por URL pública + `POST /items`), manter estoque **e** preço desse anúncio em sincronia, e fechar o caminho inverso — receber pelo webhook do tópico `orders_v2` uma venda ocorrida no Mercado Livre, abater o estoque no MongoDB (fonte da verdade) e disparar a sincronização para os demais canais (Shopee). A base de OAuth2/renovação de token e a função reutilizável de sincronização multicanal já entregues na Tarefa 5 são reaproveitadas e generalizadas, não reconstruídas.

## Technical Context

**Language/Version**: TypeScript 5.7 sobre Node.js 20 LTS (runtime da Vercel) — mesma base das Tarefas 1-5
**Primary Dependencies**: Next.js 16, React 19.2, `mongodb` 6.12, `@vercel/blob` (URLs públicas já usadas para as fotos do produto). Nenhuma dependência nova de SDK — a API do Mercado Livre continua integrada via `fetch` direto, como na Tarefa 5
**Storage**: MongoDB Atlas — `pedidos` ganha campo opcional `origemExterna` (canal + id externo, com índice único esparso); nova coleção `publicacoesCanalFalhas` (falhas de criação/atualização de anúncio); `produtos.integracoes.mercadoLivreId` (Tarefa 5) passa a também ser preenchido automaticamente
**Testing**: Vitest — testes unitários do mapeamento de categoria, do payload de criação de anúncio, do upload de imagem por URL, da extensão de preço no client do Mercado Livre, e do processamento idempotente do webhook de pedidos (tudo com `fetch` mockado, mesmo padrão da Tarefa 5)
**Target Platform**: Web — Vercel (Serverless Functions do Next.js), reaproveitando o Vercel Cron de reprocessamento já configurado na Tarefa 5 sem mudanças
**Project Type**: Aplicação web full-stack única (mesma estrutura das Tarefas 1-5, sem backend separado)
**Performance Goals**: Volume pequeno (dezenas de vendas/publicações); o webhook de pedidos não pode atrasar perceptivelmente a resposta ao Mercado Livre — mesma estratégia de timeout curto + fila da Tarefa 5 se aplica ao disparo de sincronização, não à consulta obrigatória `GET /orders/{id}` (que precisa concluir antes de responder, para saber o que abater)
**Constraints**: Sem backend separado; nenhuma credencial versionada; reaproveita `credenciaisCanais` (Tarefa 5) sem novo fluxo de autorização; Mercado Livre não assina webhooks com HMAC — validação possível é conferir `application_id` (research.md #7); mapeamento de categoria do site → Mercado Livre é estático, exige manutenção manual quando novas categorias forem criadas no site
**Scale/Scope**: Dezenas de publicações/vendas; um canal novo de escrita (criação de anúncio) somado ao já existente (atualização de quantidade/preço) e um novo caminho de entrada de pedido (webhook do Mercado Livre, além do checkout do site)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` continua no estado de template padrão (placeholders `[PRINCIPLE_1_NAME]` etc.) — sem constituição própria ratificada, como já registrado nos planos das Tarefas 1-5. Não há gates formais a validar nesta fase — nenhuma violação identificada.

## Project Structure

### Documentation (this feature)

```text
specs/006-integracao-mercado-livre/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md         # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
app/
├── api/
│   ├── produtos/
│   │   └── [id]/
│   │       ├── route.ts                          # ESTENDE: PATCH dispara sincronizarAnuncioProduto quando preço/estoque mudam e há anúncio associado
│   │       └── mercado-livre/
│   │           └── publicar/
│   │               └── route.ts                  # NOVO: POST — cria o anúncio (imagens + POST /items)
│   ├── anuncios/
│   │   └── pendencias/
│   │       └── route.ts                          # NOVO: GET — lista falhas de publicação/atualização de anúncio
│   └── webhooks/
│       └── mercado-livre/
│           └── pedidos/
│               └── route.ts                      # NOVO: POST — recebe tópico orders_v2, abate estoque, sincroniza demais canais

lib/
├── models/
│   ├── pedido.ts                                 # ESTENDE: campo opcional origemExterna
│   └── publicacaoCanal.ts                        # NOVO: tipo de publicacoesCanalFalhas
├── pedidos/
│   └── externos.ts                               # NOVO: upsert idempotente de Pedido a partir de uma venda de canal externo (origemExterna)
└── estoque/
    ├── sincronizacao.ts                           # ESTENDE: sincronizarEstoqueProduto → sincronizarAnuncioProduto (preço + parâmetro canalOrigem)
    ├── sincronizacao.test.ts                      # ESTENDE
    └── canais/
        └── mercadoLivre/
            ├── auth.ts                            # SEM MUDANÇA (Tarefa 5)
            ├── client.ts                          # ESTENDE: atualizarQuantidade → atualizarAnuncio(anuncioId, { quantidade, preco })
            ├── client.test.ts                     # ESTENDE
            ├── categorias.ts                      # NOVO: mapeamento estático categoria do site → category_id do Mercado Livre
            ├── anuncios.ts                        # NOVO: criarAnuncio(produto) — upload de imagens (source = URL) + POST /items
            ├── anuncios.test.ts                   # NOVO
            ├── pedidos.ts                         # NOVO: buscarPedidoMercadoLivre(id) — GET /orders/{id} autenticado
            └── pedidos.test.ts                    # NOVO

components/
└── admin/
    └── ProdutoForm.tsx                            # ESTENDE: botão "Publicar no Mercado Livre" quando integracoes.mercadoLivreId está vazio
```

**Structure Decision**: Mantém o projeto Next.js único e a organização por domínio já estabelecida na Tarefa 5 (`lib/estoque/`, `lib/estoque/canais/mercadoLivre/`). A criação de anúncio (`anuncios.ts`) e a consulta de pedidos (`pedidos.ts`) do Mercado Livre ficam no mesmo diretório de canal já existente, ao lado do client de quantidade/preço (`client.ts`) e do módulo de autenticação (`auth.ts`, sem mudança) — evita espalhar a integração com um único canal externo em múltiplos lugares do código. `lib/pedidos/externos.ts` é novo porque o upsert idempotente de um pedido nascido em canal externo é uma responsabilidade do domínio "pedidos" (reaproveitando `lib/pedidos/repository.ts` da Tarefa 3), não do domínio "estoque" — mantém `abaterEstoquePedido` (Tarefa 5) recebendo sempre um `Pedido` já existente, sem precisar saber como ele foi criado.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

N/A — nenhuma violação identificada (não há constituição ratificada para o projeto ainda).
