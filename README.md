# Voxelas Duo

E-commerce de produtos impressos em 3D — Next.js (App Router) + MongoDB Atlas, hospedado na Vercel.

## Setup local

1. `npm install`
2. Copie `.env.example` para `.env.local` e preencha `MONGODB_URI` com a connection string do seu cluster MongoDB Atlas.
3. `npm run dev` e acesse `http://localhost:3000`.

## Estrutura

- `app/` — páginas e rotas de API (App Router)
- `app/api/health` — verifica a conexão com o MongoDB
- `app/api/produtos`, `app/api/pedidos`, `app/api/webhooks` — rotas-esqueleto para as próximas tarefas do épico
- `lib/db/mongodb.ts` — cliente MongoDB compartilhado
- `lib/models/` — tipos das coleções `produtos` e `pedidos`

Guia completo de verificação manual: [`specs/001-setup-infraestrutura-base/quickstart.md`](specs/001-setup-infraestrutura-base/quickstart.md).
