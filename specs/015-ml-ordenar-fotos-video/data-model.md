# Phase 1 Data Model: Ordenar fotos do produto (Mercado Livre e site)

## Sem mudança de schema

`Produto.fotos` (`lib/produtos/repository.ts`, validado em `lib/produtos/validation.ts`) já é `string[]` ordenado — nenhum campo novo é adicionado ao documento do produto no MongoDB. Reordenar é só reescrever esse array na nova ordem via o `PATCH /api/produtos/[id]` já existente (`{ fotos: string[] }`), sem mudança de contrato.

## Derivado: quais fotos vão para o Mercado Livre

Novo helper puro em `lib/estoque/canais/mercadoLivre/fotos.ts`, sem estado próprio — deriva sempre de `produto.fotos`:

```ts
export const LIMITE_FOTOS_MERCADO_LIVRE = 6;

/** Fotos que vão para o anúncio do Mercado Livre, na ordem do produto — API do ML aceita no máximo 6 (research.md #2). */
export function fotosParaAnuncio(fotos: string[]): string[] {
  return fotos.slice(0, LIMITE_FOTOS_MERCADO_LIVRE);
}
```

Usado em dois pontos:

- `criarAnuncio` (`anuncios.ts`): `pictures: fotosParaAnuncio(produto.fotos).map((source) => ({ source }))` no lugar do `produto.fotos.map(...)` direto.
- `ProdutoForm.tsx`: para cada foto em `valores.fotos`, `index < LIMITE_FOTOS_MERCADO_LIVRE` decide o rótulo "vai para o Mercado Livre" (FR-007) — só exibido quando `valores.fotos.length > LIMITE_FOTOS_MERCADO_LIVRE` (edge case: com 6 ou menos, nenhuma marcação é necessária).

## Estado local de reordenação (UI)

Nenhuma entidade persistente nova — reordenar é uma operação local no estado do formulário (`valores.fotos`, já existente em `ProdutoFormValores`) até o vendedor clicar em "Salvar produto", que já persiste `fotos` como está hoje (`components/admin/ProdutoForm.tsx:235`, `handleSubmit`). Mover uma foto de posição é `array.splice` local (remover do índice de origem, inserir no índice de destino), tanto para o drag-and-drop quanto para os botões de mover para cima/baixo (research.md #4).
