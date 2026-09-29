# Data Model: Catálogo da Meta — EDI-109

## Produto (coleção `produtos`, existente) — campo novo, aditivo e opcional

```ts
/** Publicação no catálogo da Meta (Facebook/Instagram Shop) — EDI-109. Ausente = não publicado. */
export interface MetaCatalogoProduto {
  /** `true` = o produto entra no feed `/api/feeds/meta`. */
  publicar: boolean;
  /** Título chamativo próprio para Facebook/Instagram — vazio/ausente = usa `nome`. Máx. 200 caracteres. */
  titulo?: string;
  /** Descrição própria para Facebook/Instagram — vazio/ausente = usa `descricao`. Máx. 9.999 caracteres. */
  descricao?: string;
}

interface Produto {
  // ...campos existentes
  metaCatalogo?: MetaCatalogoProduto;
}
```

Sem migração: documentos existentes sem `metaCatalogo` = não publicados.

### Validação (`validarProduto`, quando `metaCatalogo` presente no payload)

- Deve ser objeto (não array/null) → senão "Formato de publicação no Facebook inválido."
- `publicar`: boolean obrigatório.
- `titulo`: opcional; string; `trim()` até 200 caracteres → senão "O título para o Facebook deve ter no máximo 200 caracteres."
- `descricao`: opcional; string; até 9.999 caracteres → senão "A descrição para o Facebook deve ter no máximo 9999 caracteres."
- Strings vazias/em branco são normalizadas para ausentes no form antes do envio.

### Formulário (`ProdutoFormValores`)

- `metaPublicar: boolean` (padrão `false`)
- `metaTitulo: string` (padrão `""`)
- `metaDescricao: string` (padrão `""`)
- Montagem do payload: `metaCatalogo: { publicar, titulo: trim || undefined, descricao: trim || undefined }`.
- Duplicar: copia `metaTitulo`/`metaDescricao`, zera `metaPublicar`.

## Item do feed (não persistido)

```ts
export interface ItemFeedMeta {
  id: string;
  title: string;
  description: string;
  availability: "in stock" | "out of stock";
  condition: "new";
  price: string;             // "39.90 BRL"
  link: string;              // absoluto
  image_link: string;        // absoluto
  additional_image_link: string; // até 20 URLs separadas por vírgula, ou ""
  brand: "VoxelasDuo";
  product_type: string;      // categoria
}
```

Regras de derivação em research.md #2. Produtos com `metaCatalogo.publicar !== true` ou sem fotos não geram item.

## Consulta

`listarProdutosPublicadosMeta()` → `find({ "metaCatalogo.publicar": true }).sort({ criadoEm: -1 })`. Sem índice novo (volume pequeno).
