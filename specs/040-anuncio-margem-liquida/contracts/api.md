# Contracts

## POST /api/admin/tempo-impressao · PUT /api/admin/tempo-impressao/{id}

Novo campo opcional no corpo:

```json
{
  "itens": [{ "id": "…", "nome": "Vaso", "minutos": 180, "quantidade": 1, "pesoGramas": 120, "margemPercentual": 25 }],
  "anuncio": { "ativo": true, "roasMeta": 8 }
}
```

- `anuncio` ausente: no PUT, mantém o que já estava gravado; `null` remove.
- **400** `{ "erro": "Anúncio pago: ROAS meta inválido (maior que 0 e até 100)." }`
- **400** `{ "erro": "Linha 1 (Vaso): margem inválida (0 a 99,9% do preço)." }`

Resposta: `{ "plano": { …, "anuncio": { "ativo": true, "roasMeta": 8 } } }`

## POST /api/produtos · PATCH /api/produtos/{id}

`taxasCanais.anuncio` opcional:

```json
{ "taxasCanais": { "margemDesejadaPercentual": 30, "anuncio": { "ativo": true, "roasMeta": 8 } } }
```

- **400** `{ "erro": "…", "campos": { "taxasCanais": "Anúncio pago: ROAS meta inválido (maior que 0 e até 100)." } }`
