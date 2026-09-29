# Contract: Feed do catálogo da Meta — EDI-109

## GET /api/feeds/meta

Público (sem autenticação — fora do matcher do `proxy.ts`). Sempre dinâmico, sem cache.

### 200 OK

```
Content-Type: text/csv; charset=utf-8
Cache-Control: no-store
```

Corpo: CSV com cabeçalho fixo, na ordem:

```
id,title,description,availability,condition,price,link,image_link,additional_image_link,brand,product_type
```

Exemplo:

```
id,title,description,availability,condition,price,link,image_link,additional_image_link,brand,product_type
66f1a2b3c4d5e6f708192a3b,Chaveiro 3D personalizado 🔥,"A partir de R$ 39,90 — feito sob encomenda",in stock,new,39.90 BRL,https://www.voxelasduo.com.br/produtos/chaveiros/chaveiro-3d,https://....blob.vercel-storage.com/produtos/a.jpg,"https://.../b.jpg,https://.../c.jpg",VoxelasDuo,chaveiros
```

- Nenhum produto publicado → apenas a linha de cabeçalho (200).
- Campos com vírgula, aspas ou quebra de linha vão entre aspas; aspas internas duplicadas (`"` → `""`).

### 500 Internal Server Error

```json
{ "erro": "Não foi possível gerar o feed do catálogo." }
```

Nunca retorna CSV vazio em caso de falha (a Meta manteria um catálogo vazio).

## PATCH /api/produtos/[id] e POST /api/produtos (existentes) — campo novo

Payload aceita, opcionalmente:

```json
{
  "metaCatalogo": {
    "publicar": true,
    "titulo": "Chaveiro 3D personalizado 🔥",
    "descricao": "A partir de R$ 39,90 — feito sob encomenda"
  }
}
```

### 400 (validação)

```json
{ "erro": "Payload inválido.", "campos": { "metaCatalogo": "O título para o Facebook deve ter no máximo 200 caracteres." } }
```
