# Contrato: `/api/admin/configuracoes/taxas`

Protegido pelo `proxy.ts` (matcher `/api/admin/:path*`) — só admin autenticado.

## GET

**200**
```json
{ "shopeeTaxaPercentual": 14, "siteTaxaPercentual": 4.99, "siteTaxaFixaCentavos": 0 }
```
Sem documento salvo → devolve os defaults acima.

## PUT

**Body**
```json
{ "shopeeTaxaPercentual": 14, "siteTaxaPercentual": 4.99, "siteTaxaFixaCentavos": 0 }
```

**200** — mesmo formato do GET, com os valores salvos.

**400** — `{ "erro": "Payload inválido.", "campos": { "shopeeTaxaPercentual": "..." } }` quando algum percentual estiver fora de 0 ≤ x < 100, a taxa fixa for negativa ou algum campo não for numérico.

## Contrato de produto (alterado)

`POST /api/produtos` e `PATCH /api/produtos/[id]` aceitam, adicionalmente:
- `custoProducao.taxaFalhaPercentual` (opcional, 0 ≤ x < 100);
- `taxasCanais` (opcional): `{ shopeeTaxaPercentual?, siteTaxaPercentual?, siteTaxaFixaCentavos? }`.
