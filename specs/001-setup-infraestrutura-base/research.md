# Research: Setup do Projeto e Infraestrutura Base

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Nenhum item do Technical Context ficou marcado como `NEEDS CLARIFICATION`. As decisões abaixo documentam o racional das escolhas técnicas já implícitas no épico EDI-73, para orientar a implementação e as tarefas seguintes.

## 1. Framework e hospedagem

- **Decision**: Next.js (App Router) com TypeScript, hospedado na Vercel com deploy contínuo a partir do branch principal.
- **Rationale**: Já definido explicitamente no épico EDI-73 — permite frontend e API Routes/Server Actions no mesmo projeto, eliminando a necessidade de um backend separado, e a Vercel é o serviço de deploy nativo do Next.js (deploy automático a cada push, preview deployments por PR).
- **Alternatives considered**: Backend separado em Node.js/Express — rejeitado pelo próprio épico, para reduzir a complexidade operacional de um projeto pessoal/familiar.

## 2. Acesso ao MongoDB Atlas

- **Decision**: Driver oficial `mongodb` (Node.js Driver), com um cliente singleton reutilizado entre invocações de função serverless (padrão recomendado pela própria Vercel/MongoDB para ambientes serverless).
- **Rationale**: Evita esgotar o limite de conexões simultâneas do tier gratuito (M0) a cada cold start de função serverless; é a abordagem oficialmente documentada pela MongoDB para integração com Next.js na Vercel.
- **Alternatives considered**: Mongoose (ODM) — traria validação de schema e um modelo mais familiar para quem vem de outros ORMs, mas adiciona uma camada de abstração desnecessária para o escopo atual (poucas coleções, regras simples); pode ser reavaliado nas tarefas de catálogo/checkout se a complexidade das regras de validação justificar.

## 3. Estrutura de API Routes

- **Decision**: Agrupar rotas por domínio dentro de `app/api/` (`produtos`, `pedidos`, `webhooks`), mais uma rota `health` para verificação de conectividade com o banco.
- **Rationale**: Reflete diretamente a modelagem de dados (produtos e pedidos) e os pontos de integração futuros (webhooks de pagamento e marketplaces), como pedido explicitamente pela EDI-74 (`/api/produtos`, `/api/pedidos`, `/api/webhooks`).
- **Alternatives considered**: Agrupar por "recurso técnico" (ex.: `api/db`, `api/external`) — rejeitado por ser menos intuitivo para quem for implementar as tarefas seguintes.

## 4. Gerenciamento de variáveis de ambiente

- **Decision**: Variáveis sensíveis (string de conexão do MongoDB) configuradas via variáveis de ambiente da Vercel em produção e `.env.local` (não versionado) em desenvolvimento, com um `.env.example` versionado documentando as chaves esperadas sem valores reais.
- **Rationale**: Prática padrão em projetos Next.js/Vercel; atende ao requisito de não versionar credenciais (FR-007) e à Success Criteria de nenhuma credencial exposta no código-fonte (SC-004).
- **Alternatives considered**: Serviço externo de secrets (ex.: Vault) — desproporcional para o porte e escopo deste projeto.

## 5. Verificação de conectividade

- **Decision**: Rota `GET /api/health` que tenta um `ping` no cluster MongoDB Atlas e retorna o status da conexão.
- **Rationale**: Atende ao FR-008 (forma de verificar a conexão com o banco) sem exigir infraestrutura de monitoramento adicional; serve tanto para verificação manual pelo desenvolvedor quanto como sinal simples de saúde do ambiente publicado.
- **Alternatives considered**: Ferramenta de observabilidade externa (ex.: Datadog, Sentry) — fora de escopo desta tarefa; pode ser adicionada na Tarefa 9 (testes e homologação), se necessário.

**Output**: Todas as decisões de tecnologia estão resolvidas; nenhum `NEEDS CLARIFICATION` remanescente.
