# Quickstart: Correções urgentes de atributos e frete (EDI-95 + EDI-96)

## Pré-requisitos

- Ambiente já configurado com integração de publicação do Mercado Livre funcionando (Tarefa 5/6/EDI-92).
- Token válido do Mercado Livre em `credenciaisCanais`.
- Ao menos um produto de teste já publicado no Mercado Livre (com `integracoes.mercadoLivreId`), idealmente numa categoria que exija Marca e Modelo como texto livre — para reproduzir e validar a correção.

## Verificação local (sem subir servidor — conforme regra do projeto)

1. `npm run lint` (nota: `next lint` está com um problema de ambiente pré-existente, já confirmado independente desta feature — ver EDI-92)
2. `npx tsc --noEmit`
3. `npx vitest run` — testes unitários de `valorPadraoAtributo` (Marca não mais igual ao nome do produto; Marca ≠ Modelo), de `atributosEmbalagem`, de `atualizarAtributosAnuncio` (PUT com atributos corrigidos, `fetch` mockado), e de validação de `embalagemEnvio`
4. `npm run build` — garante que a nova rota (`POST /api/produtos/[id]/mercado-livre/corrigir-atributos`) e as mudanças no formulário compilam sem erro

## Fluxo de teste manual (a ser seguido pelo usuário, não pelo agente — conforme regra do projeto)

Ver seção "Como testar" no relatório final de implementação (Test Guide), incluindo: publicar um produto de teste numa categoria com Marca/Modelo obrigatórios e conferir que os valores não saem mais idênticos; preencher peso/dimensões de embalagem num produto e publicá-lo, conferindo no próprio anúncio que o frete cotado mudou em relação a um produto sem esses dados; usar o botão "Corrigir atributos no Mercado Livre" num produto já publicado com o problema (como o anúncio real citado, "Kit Com 8 Organizadores De Fios") e conferir no Mercado Livre que Marca/Modelo (e frete, se embalagem preenchida) foram corrigidos sem o anúncio ser despublicado; rodar o script `scripts/corrigir-atributos-mercado-livre.ts` contra todos os produtos publicados e conferir o resultado (sucesso/falha por produto) no log da execução.
