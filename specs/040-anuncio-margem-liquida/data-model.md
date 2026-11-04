# Data Model

## AnuncioPago (novo, `lib/models/produto.ts`)

| Campo | Tipo | Regra |
|---|---|---|
| `ativo` | boolean | obrigatório |
| `roasMeta` | number | > 0 e ≤ 100 |

Custo do anúncio = preço ÷ ROAS, ou seja, `anuncioPercentual = 100 / roasMeta`. Só conta quando `ativo`.

## PlanoImpressao (`planosImpressao`)

- `anuncio?: AnuncioPago`: novo campo. Ausente quer dizer desligado.
- `ItemImpressao.margemPercentual?`: passa a ser **% do preço**, de 0 a < 100. Ausente quer dizer que usa o piso da loja.

## TaxasCanaisProduto (`produtos.taxasCanais`)

- `anuncio?: AnuncioPago`: novo campo. Ausente quer dizer desligado. Vale para Shopee e Mercado Livre.

## TaxaCanal (cálculo, sem persistência)

- `anuncioPercentual?: number`: % do preço reservado para o anúncio.

## ResultadoCanal (cálculo)

- `anuncioCentavos: number | null`: anúncio no preço sugerido. Lucro = preço − custo − comissão − anúncio.

## Formulário do produto (`TaxasCanaisFormValores`)

- `anuncioAtivo: boolean` e `anuncioRoasMeta: string` (padrão "8").
