# API: Romaneios (protegida pelo proxy `/api/admin/*`)

## `GET /api/admin/romaneios`

`200 { romaneios: RomaneioResumo[] }` — mais recentes primeiro (`dataSaida`, depois `criadoEm`).

```ts
interface RomaneioResumo {
  id: string; nome: string; dataSaida: string;
  lugares: string[];            // nomes
  status: "aberto" | "acertado";
  pecas: number; pecasFora: number; aReceberCentavos: number;
}
```

## `POST /api/admin/romaneios`

Corpo: `{ nome, dataSaida, observacao?, lugares: Lugar[] }` (ver data-model).
`201 { romaneio }` · `400 { erro }` com o motivo (campo/linha).

## `GET /api/admin/romaneios/:id`

`200 { romaneio }` · `404 { erro }`.

## `PUT /api/admin/romaneios/:id`

Mesmo corpo do POST, documento completo. `200 { romaneio }` · `400 { erro }` · `404 { erro }`.

## `DELETE /api/admin/romaneios/:id`

`204` · `404 { erro }`.

Erros inesperados sobem como 500 (visíveis na aba Network).
