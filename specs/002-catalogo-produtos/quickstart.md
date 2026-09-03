# Quickstart: Catálogo de Produtos (CRUD)

## Pré-requisitos

- Ambiente da Tarefa 1 (EDI-74) já configurado: `.env.local` com a variável de conexão do MongoDB Atlas.
- Nova variável de ambiente necessária: `BLOB_READ_WRITE_TOKEN` (token do Vercel Blob do projeto — gerado automaticamente ao conectar um Blob store ao projeto na Vercel, ou via `vercel env pull` depois de provisionado).
- Instalar dependências novas: `@vercel/blob` (produção) e `vitest` (dev).

## Fluxo de verificação local (sem subir servidor — conforme regra do projeto)

1. `npm run lint` — checagem de estilo/erros óbvios.
2. `npx tsc --noEmit` — checagem de tipos.
3. `npx vitest run` — testes unitários de `lib/produtos/validation.ts` e `lib/produtos/slug.ts`.
4. `npm run build` — garante que o build de produção (incluindo as novas rotas e páginas) conclui sem erros.

## Fluxo de teste manual (a ser seguido pelo usuário, não pelo agente — conforme regra do projeto)

Ver seção "Como testar" no relatório final de implementação (Test Guide), com passos concretos de admin (cadastrar/editar/remover produto com fotos) e público (listar, buscar, filtrar, abrir detalhe, produto não encontrado).
