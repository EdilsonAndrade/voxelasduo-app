# Data Model

Sem coleção ou campo novo. Usa `produtos` (`lib/models/produto.ts`).

## Produto (campos usados)
| Campo | Uso |
|---|---|
| `nome` | lista e impressão (ordem alfabética) |
| `preco` (centavos, > 0) | editável; impresso |
| `precosCanais.mercadoLivre` (centavos, opcional) | editável; vazio = usa `preco` |
| `precosCanais.shopee` | preservado no PATCH |
| `custoProducao` | gera o custo total exibido; ausente = "—" |

## ProdutoLinha (DTO server → client)
```ts
interface ProdutoLinha {
  id: string;
  nome: string;
  precoCentavos: number;
  precoMercadoLivreCentavos: number | null;
  precoShopeeCentavos: number | null;
  custoCentavos: number | null;
  // + dados já usados hoje: categoria, estoque, canais, carrosséis
}
```

## Regras de validação (linha)
- Preço do site: obrigatório, número > 0, aceita "49,90" ou "49.90".
- Preço do ML: vazio permitido; se preenchido, número > 0.
- "Alterado" = valor em centavos diferente do último salvo.

## AjusteEvento (novo, `Produto.ajusteEvento`, opcional)
```ts
interface AjusteEvento {
  percentual: number;                        // 1–90
  precoAnterior: number;                     // centavos
  precosCanaisAnteriores?: PrecosCanaisProduto;
  aplicadoEm: Date;
}
```
- Criado ao gravar um ajuste (só se ausente). Removido ao restaurar.
- Cálculo: `ceil90(preco ÷ (1 − percentual/100))`, onde `ceil90` = menor valor ≥ x terminando em ,90.
