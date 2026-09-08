# Contract: POST /api/produtos/[id]/mercado-livre/corrigir-atributos

Nova rota interna usada pelo botão "Corrigir atributos no Mercado Livre" em `ProdutoForm.tsx`, para reaplicar os atributos corrigidos (Marca/Modelo + embalagem, quando configurada) num anúncio **já publicado**, sem despublicar/republicar.

## Request

```
POST /api/produtos/:id/mercado-livre/corrigir-atributos
```

Sem corpo — usa os dados já salvos do produto (`id` na URL).

## Pré-condições

- O produto identificado por `:id` existe.
- O produto tem `integracoes.mercadoLivreId` preenchido (já publicado). Caso contrário, `400`.

## Response — sucesso (200)

```jsonc
{ "ok": true }
```

## Response — produto não encontrado (404)

```jsonc
{ "erro": "Produto não encontrado." }
```

## Response — produto sem anúncio publicado (409)

```jsonc
{ "erro": "Produto não está publicado no Mercado Livre." }
```

## Response — falha ao atualizar no Mercado Livre (422)

```jsonc
{ "erro": "Falha ao corrigir atributos no Mercado Livre: <detalhe>" }
```

**Nota**: os códigos 409/422 (em vez de 400/502, como rascunhado inicialmente neste contrato) seguem o padrão já estabelecido pela rota irmã `POST/DELETE /api/produtos/[id]/mercado-livre/publicar` — 409 para estado de produto inválido para a operação, 422 para falha de comunicação com o Mercado Livre.

## Notas de implementação

- Reaproveita `atualizarAtributosAnuncio(itemId, produto)` (research.md #3): resolve categoria, busca atributos obrigatórios, monta valores corrigidos (`valorPadraoAtributo` já corrigido) + atributos de embalagem (se `produto.embalagemEnvio` existir), e envia via `PUT /items/{itemId}`.
- Mesma função é reaproveitada pelo script de correção em lote (`scripts/corrigir-atributos-mercado-livre.ts`) — a rota é só uma forma pontual de acionar o mesmo mecanismo pelo admin.
