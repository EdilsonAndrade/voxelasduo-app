# Contract: GET /api/health

Único endpoint com comportamento completo nesta tarefa (as rotas de produtos, pedidos e webhooks são apenas esqueleto — ver `api-skeleton.md`).

## Request

`GET /api/health`

Sem parâmetros, sem corpo.

## Responses

### 200 OK — banco conectado

```json
{
  "status": "ok",
  "db": "connected"
}
```

### 503 Service Unavailable — falha ao conectar/pingar o MongoDB Atlas

```json
{
  "status": "error",
  "db": "disconnected",
  "message": "<descrição curta do erro, sem vazar a connection string>"
}
```

## Regras

- Não deve expor a connection string ou qualquer credencial na resposta, mesmo em caso de erro.
- Deve responder em até poucos segundos (timeout curto no `ping` ao MongoDB) para não travar verificações manuais nem checagens de disponibilidade.
