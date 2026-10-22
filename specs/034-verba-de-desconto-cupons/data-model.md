# Data Model: Verba de desconto

## TaxasCanaisConfig (`configuracoes`, `_id: "taxasCanais"`) — alterado

| Campo | Tipo | Regra |
|---|---|---|
| `margemMinimaPercentual` | number | **Piso de lucro, % do preço**. 0 ≤ x < 100. Padrão 25 |
| `margemDesejadaPercentual` | number | **% do preço**. 0 ≤ x < 100. Padrão 40 |
| `cupomLojaPercentual` | number | novo. 0 ≤ x < 100. Padrão 0 (sem cupom) |
| `cupomLojaTetoCentavos` | number \| null | novo. ≥ 0; `null` = sem limite. Padrão `null` |
| `cupomLojaCestaMinimaCentavos` | number | novo. ≥ 0, só informativo. Padrão 0 |
| `reguaMargem` (só no documento) | `"preco"` | novo. Ausente = documento antigo (markup) → dispara a migração |

Leitura de documento sem os campos de cupom → padrões acima.

## Produto — alterado

| Campo | Tipo | Regra |
|---|---|---|
| `taxasCanais.margemMinimaPercentual` | number? | agora % do preço, 0 ≤ x < 100 |
| `taxasCanais.margemDesejadaPercentual` | number? | agora % do preço, 0 ≤ x < 100 |
| `margensParaRevisar` | `{ minimaSobreCusto?: number; desejadaSobreCusto?: number; migradoEm: Date }`? | novo. Gravado pela migração; removido em "Marcar revisado" |

## VerbaDesconto (calculado, não salvo)

```ts
interface CupomLoja { percentual: number; tetoCentavos: number | null }

interface VerbaDesconto {
  precoCentavos: number;
  lucroCentavos: number;
  margemPercentual: number;        // lucro ÷ preço × 100
  pisoPercentual: number;
  verbaPercentual: number;         // margem − piso (pode ser negativa)
  cupomLojaCentavos: number;       // min(round(preço × %), teto); 0 sem cupom
  cupomLojaPercentual: number;     // cupomLojaCentavos ÷ preço × 100
  sobraPercentual: number;         // verba − cupomLoja%
  sobraCentavos: number;           // round(preço × sobra%)
  estado: "ok" | "semCupomLoja" | "abaixoDoPiso";
}

interface SimulacaoDesconto {
  descontoPercentual: number;      // 0 ≤ x < 100
  precoFinalCentavos: number;      // preço − cupom de loja − desconto
  lucroCentavos: number;           // lucroEm(precoFinal)
  margemPercentual: number;        // lucro ÷ precoFinal
  passouDaSobra: boolean;
}
```

## ProdutoLinha (lista do admin) — alterado

- `verbaShopee: "ok" | "semCupomLoja" | "abaixoDoPiso" | null` — `null` sem custo configurado.

## MargemParaRevisar (lista da página de taxas)

```ts
interface MargemParaRevisar {
  id: string;
  nome: string;
  minimaSobreCusto?: number;
  desejadaSobreCusto?: number;
  /** Equivalentes em % do preço na Shopee — null sem custo. */
  sugestaoMinimaPreco: number | null;
  sugestaoDesejadaPreco: number | null;
}
```
