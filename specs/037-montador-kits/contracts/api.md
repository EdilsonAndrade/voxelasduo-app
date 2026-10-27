# Contracts: Montador de kits

Todas as rotas em `/api/admin/kits*` são protegidas pelo proxy (`/api/admin/*`, só admin). Erros sempre com status HTTP real e corpo `{ erro: string, ... }` — nada de 200 com erro.

## GET /api/admin/kits

200 `{ kits: KitResumo[] }` — `KitResumo = { id, nome, itens: number, precoCentavos, somaAvulsaCentavos, desatualizado: boolean, produtoId? }`.

## POST /api/admin/kits

Corpo:

```json
{
  "nome": "Kit Natal Mesa",
  "embalagemCentavos": 500,
  "faixasDesconto": [10, 15, 20],
  "precoCentavos": 8500,
  "itens": [
    { "produtoId": "665f...", "quantidade": 2 },
    { "novo": { "nome": "Rena 8 cm", "pesoGramas": 25, "tempoMinutos": 90, "precoCentavos": 2290 }, "quantidade": 1 }
  ]
}
```

- 201 `{ kit: KitDetalhe, produtosCriados: { id, nome }[] }`
- 400 `{ erro, campos? }` validação
- 404 `{ erro }` produto componente não encontrado
- 409 `{ erro, produtoExistenteId, nome }` item novo com nome de produto existente

`precoCentavos` presente → grava `referencia` com os valores atuais.

## GET /api/admin/kits/[id]

200 `{ kit: KitDetalhe }` · 404.

`KitDetalhe = { id, nome, embalagemCentavos, faixasDesconto, precoCentavos, produtoId?, itens: { produtoId, quantidade, atual: ComponenteAtual }[], totais: TotaisKit, desatualizacao: Desatualizacao[] }`.

## PUT /api/admin/kits/[id]

Mesmo corpo do POST (substitui o kit). `"reconfirmarPreco": true` regrava a referência mesmo sem mudança de preço. 200 `{ kit, produtosCriados }` · 400 · 404 · 409.

## DELETE /api/admin/kits/[id]

204 · 404. Não apaga os produtos (componentes nem o produto do kit); o produto do kit perde `kitId`.

## POST /api/admin/kits/[id]/produto

Cria (201) ou atualiza (200) o produto do kit. 200/201 `{ produtoId, criado: boolean }`.
- 400 `{ erro }` kit sem itens ou sem preço.
- 404 kit não encontrado.

## Página da calculadora

`GET /admin/produtos/calculadora?kit=<id>` — kit com produto → redirect `?produto=<produtoId>`; sem produto → calculadora preenchida com o custo agregado e o preço do kit; kit inexistente → 404; kit sem itens/preço → redirect para `/admin/kits/<id>`.
