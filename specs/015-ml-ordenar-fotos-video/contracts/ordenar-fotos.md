# Contract: reordenar fotos do produto

Nenhum endpoint novo é criado por esta feature — reordenar reaproveita o `PATCH /api/produtos/:id` já existente (`app/api/produtos/[id]/route.ts`), enviando o array `fotos` completo na nova ordem, igual ao que já acontece hoje ao adicionar/remover uma foto no admin.

## Request (reaproveitado, sem mudança de forma)

```
PATCH /api/produtos/:id
Content-Type: application/json

{ "fotos": ["<url-1>", "<url-2>", "..."] }
```

**Mudança de semântica** (não de forma): a partir desta feature, a *ordem* das URLs dentro de `fotos` passa a ser significativa — determina a ordem da galeria no site e, na próxima criação/republicação do anúncio, a ordem enviada ao Mercado Livre (`pictures`, limitado às 6 primeiras — data-model.md).

## Response

Sem mudança — mesmo contrato já documentado para o `PATCH` (`200` com `{ produto }`, `404` se não encontrado, `400` com `{ erro, campos }` em payload inválido).

## Contrato interno: `fotosParaAnuncio`

```ts
function fotosParaAnuncio(fotos: string[]): string[]
```

- **Entrada**: array de URLs de foto do produto, na ordem persistida.
- **Saída**: as até 6 primeiras, na mesma ordem — usado por `criarAnuncio` para montar `pictures` e pela UI do admin para decidir o rótulo "vai para o Mercado Livre" de cada miniatura (data-model.md).
- Não faz chamada de rede nem valida URL — é uma função pura de corte.
