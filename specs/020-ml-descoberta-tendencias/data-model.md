# Data Model: Descoberta de tendências via Mercado Livre

## `TrendCacheDocumento` (coleção `trend_cache`)

Documento único por chave — busca por termo (US1/US3/US4) e tendências gerais (US2) compartilham a mesma coleção e mecânica de TTL/fallback (research.md #5).

```ts
type TrendCacheDocumento = TrendCacheBusca | TrendCacheGerais;

interface TrendCacheBusca {
  _id: string;              // termo normalizado (trim + lowercase + espaços colapsados)
  tipo: "busca";
  obtidoEm: Date;
  categoriaId: string;
  categoriaNome?: string;    // nome legível, quando disponível
  ranking: ItemRankingCategoria[];
}

interface TrendCacheGerais {
  _id: "__gerais__";        // chave fixa
  tipo: "gerais";
  obtidoEm: Date;
  termos: TendenciaGeral[];
}
```

### `ItemRankingCategoria`

Um item em destaque (mais vendido) dentro do ranking de uma categoria (`GET /highlights/MLB/category/{id}`). O ranking mistura tipos (research.md #3b); só `PRODUCT` tem nome resolvível (`GET /products/{id}`).

```ts
interface ItemRankingCategoria {
  posicao: number;                          // 1-based, ordem devolvida pelo Mercado Livre
  id: string;                               // id do produto/item/user-product no Mercado Livre
  tipo: "PRODUCT" | "ITEM" | "USER_PRODUCT"; // como veio de /highlights
  nome?: string;                             // ausente quando não foi possível resolver (tipo ITEM/USER_PRODUCT — research.md #3b)
}
```

**Validação**: `posicao >= 1`; `id` não vazio. Sem `preco`/`link` — deliberadamente ausentes (ver spec, Ajuste de escopo). `nome` ausente é um estado válido, não um erro (exibir "nome não disponível" na UI).

### `TendenciaGeral`

Um termo em alta no Mercado Livre no momento (`GET /trends/MLB`), sem relação com uma busca específica do vendedor.

```ts
interface TendenciaGeral {
  termo: string;    // "keyword" da API
  url: string;      // URL pública do Mercado Livre para o termo (informativa)
}
```

## Resultado exibido ao vendedor (shape de resposta da API, não persistido)

```ts
interface ResultadoBuscaTendencia {
  termo: string;                       // termo pesquisado, como digitado
  origem: "novo" | "cache";
  obtidoEm: string;                    // ISO, sempre presente (mesmo em "novo")
  avisoDesatualizado: boolean;         // true quando é cache vencido servido por falha do ML (US4)
  categoriaId: string;
  categoriaNome?: string;
  ranking: ItemRankingCategoria[];
}

interface ResultadoTendenciasGerais {
  origem: "novo" | "cache";
  obtidoEm: string;
  avisoDesatualizado: boolean;
  termos: TendenciaGeral[];
}
```

## Regras de negócio

- Um termo normalizado tem no máximo um `TrendCacheBusca` vigente — nova consulta bem-sucedida sobrescreve (`replaceOne`/`updateOne` com upsert), não acumula histórico (fora de escopo).
- "Vigente" (servível sem nova consulta) = `obtidoEm` há menos de 24h. Vencido não é apagado — continua servível como fallback em caso de falha do Mercado Livre (US4), com `avisoDesatualizado: true`.
- Normalização do termo: `termo.trim().toLowerCase().replace(/\s+/g, " ")`.
- `TrendCacheGerais._id` é sempre `"__gerais__"` — documento único, mesma regra de TTL/fallback dos termos de busca.

## Sem alterações em entidades existentes

Esta feature não adiciona campos a `Produto`, `Configuracao` nem outros modelos existentes — é uma coleção nova e isolada (`trend_cache`), sem relação de chave estrangeira com o catálogo de produtos da loja.
