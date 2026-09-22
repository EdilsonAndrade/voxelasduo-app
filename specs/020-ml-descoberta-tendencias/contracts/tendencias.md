# Contrato: `/api/admin/tendencias`

Protegido pelo `proxy.ts` (matcher `/api/admin/:path*`) — só admin autenticado (FR-002).

## `GET /api/admin/tendencias?termo=...&forcar=true`

Busca por termo (US1/US3/US4). `termo` obrigatório, não vazio/só espaços. `forcar=true` ignora o cache de 24h e consulta o Mercado Livre imediatamente (US3, "Atualizar").

**200 — novo ou cache vigente**

```json
{
  "termo": "chaveiro personalizado",
  "origem": "novo",
  "obtidoEm": "2026-09-21T21:40:00.000Z",
  "avisoDesatualizado": false,
  "categoriaId": "MLB439316",
  "categoriaNome": "Chaveiros",
  "ranking": [
    { "posicao": 1, "id": "MLB75978784", "tipo": "PRODUCT", "nome": "Chaveiro Argolas Religiosos..." },
    { "posicao": 2, "id": "MLB4002919471", "tipo": "ITEM" }
  ]
}
```

`origem: "cache"` quando servido do `trend_cache` sem nova consulta (US3). `avisoDesatualizado: true` só ocorre junto de `origem: "cache"`, quando o cache está vencido (>24h) e foi servido por falha do Mercado Livre (US4) — nesse caso o corpo é 200, não erro (a falha real fica só no log do servidor; ver research.md #6 sobre não esconder erro do ML das ferramentas de rede quando não há cache — abaixo).

**400 — termo inválido**

```json
{ "erro": "termo_invalido", "mensagem": "Informe um termo para pesquisar." }
```

**404 — categoria não encontrada**

```json
{ "erro": "categoria_nao_encontrada", "mensagem": "Não foi possível identificar uma categoria do Mercado Livre para este termo." }
```

**401 — token do app inválido/expirado**

```json
{ "erro": "token_invalido", "mensagem": "Reconecte a conta do Mercado Livre para continuar." }
```

**502 — falha do Mercado Livre sem cache disponível**

```json
{ "erro": "falha_mercado_livre", "mensagem": "Não foi possível consultar o Mercado Livre no momento." }
```

Nos três erros (400/404/401/502), o status HTTP e o corpo são exatamente os devolvidos pela rota — nada é convertido em 200 nem mascarado na aba Network (FR-013).

## `GET /api/admin/tendencias/gerais?forcar=true`

Tendências gerais do site (US2), sem parâmetro de termo. Mesma mecânica de cache/fallback (chave fixa `"__gerais__"`).

**200**

```json
{
  "origem": "novo",
  "obtidoEm": "2026-09-21T21:40:00.000Z",
  "avisoDesatualizado": false,
  "termos": [
    { "termo": "cadeira gamer", "url": "https://lista.mercadolivre.com.br/cadeira-gamer" },
    { "termo": "chaveiro", "url": "https://lista.mercadolivre.com.br/chaveiro" }
  ]
}
```

**401 / 502** — mesmo formato do endpoint de busca por termo.

## Erros do Mercado Livre nunca são escondidos (regra 3 do CLAUDE.md)

Internamente, toda chamada ao Mercado Livre usa `erroMercadoLivre()` (já existente), que inclui o corpo da resposta do ML na mensagem de erro logada no servidor. O erro 502 devolvido ao navegador é intencionalmente genérico ao vendedor (mensagem amigável), mas o **status HTTP real nunca é convertido em sucesso**, e o log do servidor (visível em `vercel logs` / observability) mantém o detalhe completo do erro do Mercado Livre para diagnóstico — consistente com o padrão já usado em `app/api/mercado-livre/simular-preco/route.ts`.
