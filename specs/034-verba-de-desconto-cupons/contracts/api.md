# Contracts

## GET/PUT `/api/admin/configuracoes/taxas` — alterado

Body/resposta ganham:

```json
{
  "shopeeTaxaPercentual": 14,
  "siteTaxaPercentual": 4.99,
  "siteTaxaFixaCentavos": 0,
  "margemMinimaPercentual": 25,
  "margemDesejadaPercentual": 40,
  "cupomLojaPercentual": 3,
  "cupomLojaTetoCentavos": 500,
  "cupomLojaCestaMinimaCentavos": 1000
}
```

- `400 { erro: "Payload inválido.", campos: { <campo>: mensagem } }` — margens fora de 0 ≤ x < 100, cupom fora de 0 ≤ x < 100, teto/cesta negativos (`cupomLojaTetoCentavos: null` é válido).

## PATCH/POST `/api/produtos[/{id}]` — validação alterada

- `taxasCanais.margemMinimaPercentual` / `margemDesejadaPercentual`: 0 ≤ x < 100 (antes sem teto) → `400` com `campos.taxasCanais`.

## DELETE `/api/admin/produtos/{id}/margens-revisar` — novo

- Remove `margensParaRevisar` do produto ("Marcar revisado").
- `204` sem corpo · `400 { erro }` id inválido · `404 { erro }` produto não encontrado.
- Protegido pelo proxy `/api/admin/*`.

## GET `/api/produtos/{id}/mercado-livre/promocoes` — semântica alterada

- `margemMinimaPercentual` passa a ser % do preço; `precoMinimoCentavos` = `(custo + fixa) / (1 − taxa% − piso%)`.
