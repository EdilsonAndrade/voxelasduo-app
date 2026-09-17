# Quickstart: Ordenar fotos do produto (Mercado Livre e site) (EDI-99)

## Pré-requisitos

- Ambiente já configurado (Tarefas 1-7) com `MONGODB_URI`, `BLOB_READ_WRITE_TOKEN` e credenciais do Mercado Livre válidas.
- Ao menos um produto de teste com 7+ fotos cadastradas (para exercitar o corte de 6, FR-006/FR-007) e, se possível, um segundo produto já publicado no Mercado Livre (`integracoes.mercadoLivreId` preenchido) para testar o fluxo de despublicar/republicar com a nova ordem.

## Verificação local (sem subir servidor — conforme regra do projeto)

1. `npm run lint`
2. `npx tsc --noEmit`
3. `npx vitest run` — inclui o novo `lib/estoque/canais/mercadoLivre/fotos.test.ts` (corte de 6) e o caso adicionado em `anuncios.test.ts` (criação de anúncio com mais de 6 fotos)
4. `npm run build` — garante que `components/admin/ProdutoForm.tsx` e `lib/estoque/canais/mercadoLivre/anuncios.ts` compilam sem erro

## Fluxo de teste manual (a ser seguido pelo usuário, não pelo agente — conforme regra do projeto)

Ver seção "Como testar" no relatório final de implementação (Test Guide), incluindo: reordenar as fotos de um produto no admin (arrastando e também pelos botões de mover) e conferir que a nova ordem aparece na galeria do produto no site após salvar; cadastrar um produto com mais de 6 fotos e conferir que o admin marca visualmente quais 6 vão para o Mercado Livre; publicar esse produto e conferir no painel do Mercado Livre que só as 6 primeiras (na ordem escolhida) aparecem no anúncio; reordenar as fotos de um produto já publicado, despublicar e publicar de novo, e conferir que o novo anúncio reflete a nova ordem.
