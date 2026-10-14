# Contrato: rotas de pesquisa de nichos

Todas sob `/api/admin/*` (protegidas pelo `proxy.ts`). Erros: `{ erro, mensagem, statusOrigem? }` com status real (nunca 200).

## GET /api/admin/nichos/categoria
Query: `id` (categoryId da lista fixa), `umaCor` (`1`/`0`, padrão 1), `a1` (`1`/`0`, padrão 1), `forcar` (`true` ignora o cache).

200:
```json
{
  "categoriaId": "MLB436414", "categoriaNome": "Organização para Casa",
  "origem": "novo", "obtidoEm": "2026-10-14T18:00:00.000Z", "avisoDesatualizado": false,
  "oportunidades": [ { "termo": "organizador de gaveta", "posicao": 4,
    "potencial": { "nivel": "alto", "motivo": "4º mais buscado · modelo com 14.703 downloads" },
    "concorrencia": { "nivel": "alta", "produtosCatalogo": 10000 },
    "modelos": [ { "id": 1, "nome": "...", "slug": "...", "capa": "...", "autor": "...", "licenca": "BY", "downloads": 14703,
      "url": "https://makerworld.com/pt/models/1-x#profileId-2",
      "perfil": { "id": 3, "profileId": 2, "nome": "0.2mm", "segundos": 15396, "gramas": 135, "mesas": 1, "cores": 1, "impressora": "N2S", "impressoes": 4740 } } ] } ],
  "ocultas": 3, "descartados": 11
}
```
Erros: 400 `categoria_invalida`; 401 `token_invalido`; 502 `falha_mercado_livre` | `falha_makerworld`.

## GET /api/admin/nichos/termo
Query: `termo` (obrigatório, nome livre ou extraído do link), `umaCor`, `a1`, `forcar`.

200: `{ termo, origem, obtidoEm, avisoDesatualizado, oportunidade: Oportunidade }` (potencial `nao_avaliado`, `posicao: null`).
Erros: 400 `termo_invalido`; 401; 502 `falha_makerworld`. Falha só na contagem do ML → 200 com `concorrencia.nivel = "indisponivel"`.

## Levar para a calculadora (rota existente)
O botão chama `POST /api/admin/calculos-preco` (já existente) com o corpo montado por `montarCalculoDoModelo` (`lib/nichos/calculo.ts`): `{ nome, linkModelo3d, linkShopee?, linkMercadoLivre?, valores }`.
201: `{ calculo: { _id, ... } }` → navega para `/admin/produtos/calculadora?id=<_id>`. Erro 400: `{ erro }`, mostrado no cartão do modelo com o status.

## Erro de bloqueio do MakerWorld
429 `{ erro: "makerworld_bloqueado", mensagem, statusOrigem }` em qualquer das rotas acima.
