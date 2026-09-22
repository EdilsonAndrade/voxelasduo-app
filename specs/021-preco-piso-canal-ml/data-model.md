# Data Model: Preço por canal com piso de margem e promoções elegíveis do Mercado Livre

## Alterações em `TaxasCanaisConfig` (`lib/models/configuracao.ts`) — padrão global

```ts
export interface TaxasCanaisConfig {
  shopeeTaxaPercentual: number;
  siteTaxaPercentual: number;
  siteTaxaFixaCentavos: number;
  margemMinimaPercentual: number; // NOVO — padrão: 15
}
```

`TAXAS_CANAIS_PADRAO` ganha `margemMinimaPercentual: 15` (valor inicial razoável enquanto o vendedor não configura o dele).

## Alterações em `Produto` (`lib/models/produto.ts`)

```ts
export interface TaxasCanaisProduto {
  shopeeTaxaPercentual?: number;
  siteTaxaPercentual?: number;
  siteTaxaFixaCentavos?: number;
  margemMinimaPercentual?: number; // NOVO — ausente = usa o padrão global
}

/** Preços de venda por canal quando diferentes do site — ausente num canal = usa Produto.preco (EDI-108). */
export interface PrecosCanaisProduto {
  mercadoLivre?: number; // centavos
  shopee?: number; // centavos
}

export interface Produto {
  // ...campos existentes
  preco: number; // continua sendo o preço do site
  precosCanais?: PrecosCanaisProduto; // NOVO
}
```

**Validação**: quando presente, cada preço em `precosCanais` MUST ser um inteiro positivo (mesma regra já aplicada a `preco`).

## Novos tipos em `lib/produtos/canais.ts`

```ts
/** Preço mínimo e desconto máximo de um canal, a partir do preço atual, da taxa e da margem mínima efetiva (EDI-108). */
export interface ResultadoPisoCanal {
  canal: CanalVenda;
  /** null quando taxa% + margemMinima% >= 100 (nenhum preço atende essa margem nesse canal). */
  precoMinimoCentavos: number | null;
  /** null nas mesmas condições de precoMinimoCentavos; negativo tratado como 0 na exibição (já abaixo do mínimo). */
  descontoMaximoCentavos: number | null;
  descontoMaximoPercentual: number | null;
}
```

`CanalVenda` e `TaxaCanal` já existem (EDI-106) e são reaproveitados sem alteração.

## `PromocaoElegivel` (Mercado Livre, não persistido — calculado a cada consulta)

```ts
export interface PromocaoElegivel {
  promotionId: string;
  tipo: string; // ex.: "DEAL", "MARKETPLACE_CAMPAIGN", "SELLER_CAMPAIGN"
  nome?: string;
  /** Preço que a promoção exige (o que sobra pro vendedor após o desconto da campanha). */
  precoPromocionalCentavos: number;
  /** Resultado da comparação com o preço mínimo do canal ML (research.md #3). */
  valeAPena: boolean;
  /** Lucro estimado no preço promocional, quando valeAPena = true. */
  lucroEstimadoCentavos: number | null;
}
```

**Regra**: `valeAPena = precoPromocionalCentavos >= precoMinimoCentavos` (do `ResultadoPisoCanal` do canal Mercado Livre). Não persistido — a lista é sempre buscada ao vivo (as campanhas do Mercado Livre têm início/fim próprios; cachear haveria risco de mostrar uma promoção já encerrada como disponível).

## Sem coleção nova no MongoDB

Toda a persistência desta feature é aditiva em coleções/documentos já existentes (`produtos`, `configuracoes`) — nenhuma coleção nova, nenhuma migração necessária (FR-008).
