# Contratos: Preço por canal, piso de margem e promoções elegíveis

## `GET`/`PUT /api/admin/configuracoes/taxas` (alterado)

Mesmo contrato do EDI-106 (`specs/019-calculadora-preco-multicanal/contracts/configuracoes-taxas.md`), com um campo novo:

```json
{
  "shopeeTaxaPercentual": 14,
  "siteTaxaPercentual": 4.99,
  "siteTaxaFixaCentavos": 0,
  "margemMinimaPercentual": 15
}
```

`PUT` passa a validar `margemMinimaPercentual`: número, `0 <= x < 100`.

## `POST /api/produtos` e `PATCH /api/produtos/[id]` (alterado)

Aceitam, adicionalmente:

```json
{
  "taxasCanais": { "margemMinimaPercentual": 25 },
  "precosCanais": { "mercadoLivre": 5490, "shopee": 5990 }
}
```

- `taxasCanais.margemMinimaPercentual` (opcional): `0 <= x < 100`.
- `precosCanais.mercadoLivre` / `precosCanais.shopee` (opcionais): inteiro positivo (centavos), mesma regra de `preco`.
- Ausente/omitido em qualquer um dos dois campos de `precosCanais` = esse canal usa `preco` (o preço do site).

Ao salvar, se o produto já tiver `integracoes.mercadoLivreId` (ou `shopeeItemId`), a sincronização automática já existente (`sincronizarAnuncioProduto`) passa a enviar `precosCanais.mercadoLivre ?? preco` (e o equivalente Shopee) — sem mudança na assinatura da rota nem passo adicional para o vendedor.

## `GET /api/produtos/[id]/mercado-livre/promocoes` (novo)

Protegida pelo proxy `/api/produtos/:path*` (mesma proteção já existente das demais sub-rotas de produto).

**200 — produto publicado no Mercado Livre, com promoções**

```json
{
  "margemMinimaPercentual": 15,
  "precoMinimoCentavos": 3200,
  "promocoes": [
    {
      "promotionId": "C-MLB1234",
      "tipo": "DEAL",
      "nome": "Oferta Relâmpago",
      "precoPromocionalCentavos": 3500,
      "valeAPena": true,
      "lucroEstimadoCentavos": 900
    },
    {
      "promotionId": "C-MLB5678",
      "tipo": "MARKETPLACE_CAMPAIGN",
      "nome": "Campanha de outubro",
      "precoPromocionalCentavos": 2900,
      "valeAPena": false,
      "lucroEstimadoCentavos": null
    }
  ]
}
```

**200 — produto publicado, sem nenhuma promoção elegível no momento**

```json
{ "margemMinimaPercentual": 15, "precoMinimoCentavos": 3200, "promocoes": [] }
```

**404 — produto não publicado no Mercado Livre**

```json
{ "erro": "produto_nao_publicado", "mensagem": "Este produto ainda não está publicado no Mercado Livre." }
```

**401 — token do app inválido/expirado**

```json
{ "erro": "token_invalido", "mensagem": "Reconecte a conta do Mercado Livre para continuar." }
```

**502 — falha ao consultar promoções no Mercado Livre**

```json
{ "erro": "falha_mercado_livre", "mensagem": "Não foi possível consultar as promoções do Mercado Livre no momento." }
```

Igual às demais integrações do projeto: o status HTTP e o corpo nunca são mascarados (regra 3 do CLAUDE.md) — um 502 aqui não derruba a tela do produto, só a seção de promoções (FR-012), que continua mostrando o preço mínimo/desconto máximo calculado localmente.
