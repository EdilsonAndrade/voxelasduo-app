# Research: Descoberta de tendências via Mercado Livre

## 1. `/sites/MLB/search` está mesmo bloqueado para este app?

- **Decision**: Sim, confirmado ao vivo em 2026-09-21 — não usar este endpoint.
- **Rationale**: Testado com o `accessToken` real do app (`obterAccessTokenValido()`), o endpoint devolve **403 `forbidden`** em toda combinação testada: busca livre (`q=`), por `seller_id` (próprio e de terceiro) e por `category=` sozinho com `sort=price_asc`. Não é ausência de escopo (a lista de permissões do app não tem opção de "busca pública"); é bloqueio de política do Mercado Livre a apps comuns (antiscraping). A página pública (`lista.mercadolivre.com.br`) também redireciona para verificação antibot em requisição simples.
- **Alternatives consideradas**: scraping da página pública (rejeitado — exige contornar verificação antibot, fora do que este projeto faz); solicitar certificação/parceria ao Mercado Livre (fora do controle imediato deste ticket, documentado como possibilidade futura).

## 2. Qual é a fonte de popularidade por termo, então?

- **Decision**: Resolver a categoria do termo com o previsor já usado no cadastro de produto (`preverCategoriaMercadoLivre`, `previsorCategoria.ts` — `GET /sites/MLB/domain_discovery/search?q=<termo>`) e então consultar `GET /highlights/MLB/category/{categoryId}` (funciona com token, `highlight_type: BEST_SELLER`), que devolve até ~20 IDs de produto de catálogo em ordem de posição.
- **Rationale**: É o único endpoint testado que devolve um ranking de popularidade real associado a uma categoria, com o token deste app. `preverCategoriaMercadoLivre` já existe e é usada em `precos.ts` (`resolverCategoriaParaSimulacao`) — aqui usamos a variante mais simples, sem a "categoria do site" (segundo parâmetro), porque a tela de tendências só tem um campo de busca livre, não um formulário de produto completo.
- **Alternatives consideradas**: `/products/search?q=` (funciona, devolve produtos de catálogo por texto livre, mas sem qualquer indicação de popularidade/ordenação por venda — os resultados não são ordenáveis por "mais vendido"); descartado como fonte primária, mas poderia ser um fallback futuro se `highlights` não tiver dados para a categoria.

## 3. Dá para obter preço dos itens do ranking?

- **Decision**: Não, com o nível de acesso deste app — não tentar, nem para itens do tipo `PRODUCT` nem `ITEM`.
- **Rationale**: `GET /products/{id}` (itens `type: "PRODUCT"`) funciona e devolve `name`, mas `buy_box_winner` vem sempre `null` (testado em várias categorias/domínios, incluindo um termo de alta concorrência, "microfone") e `permalink` vem sempre string vazia. `GET /items/{id}/prices` e `GET /items/{id}/price_to_win?siteId=MLB&version=v2` devolvem 404 para esses IDs de produto de catálogo (não são IDs de anúncio real). **Teste decisivo**: `/highlights` pode devolver itens `type: "ITEM"` (anúncio real, não só `PRODUCT`/`USER_PRODUCT` — confirmado na categoria `MLB1574`, mistura `PRODUCT`/`ITEM`/`USER_PRODUCT` no mesmo ranking). Com um `ITEM_ID` real assim (`MLB4002919471`, obtido do próprio `/highlights`, não de busca/scraping), `GET /items/{id}`, `GET /items/{id}/sale_price?context=channel_marketplace` e `GET /items/{id}/prices` devolvem **403 `access_denied`** — ou seja, mesmo tendo o ID de um anúncio real de terceiro em mãos, o app não tem permissão de ler os dados dele. Fecha a questão: não há caminho de preço de concorrente acessível a este app, por nenhuma rota testada.
- **Alternatives consideradas**: `/products/{id}/price_to_win` (testado, 500 — não é um caminho válido); pedir ao vendedor para cadastrar manualmente IDs de anúncios concorrentes conhecidos (mesmo resultado 403 em `/items/{id}` de terceiro, então nem cadastro manual resolveria — descartado); solicitar certificação/parceria ao Mercado Livre (fora do controle imediato, documentado como possibilidade futura em Assumptions).

## 3b. `/highlights` mistura tipos — como resolver o "nome" de cada um?

- **Decision**: Resolver nome só para itens `type: "PRODUCT"` via `GET /products/{id}` (único caminho validado). Para `type: "ITEM"` e `type: "USER_PRODUCT"`, exibir o item sem nome resolvido (marcador "nome não disponível"), mantendo posição e id.
- **Rationale**: `GET /items/{id}` de terceiro devolve 403 (ver #3) — não há como obter o nome de um `ITEM` de terceiro. `USER_PRODUCT` é um recurso diferente (IDs no formato `MLBU########`, segundo a documentação) que não foi testado neste spike (converge o escopo do research sem abrir mais uma rota); tratá-lo com o mesmo fallback "nome não disponível" é seguro e consistente com FR-016 (tratar dados incompletos sem quebrar a lista).
- **Alternatives consideradas**: tentar `/user-products/{id}` para `USER_PRODUCT` — não testado, fica como possível melhoria futura se o ranking mostrar muitos itens sem nome na prática.

## 4. Tendências gerais do site

- **Decision**: `GET /trends/MLB` — funciona com token, devolve até 50 `{ keyword, url }`, sem filtro por termo do usuário.
- **Rationale**: É o único sinal de "o que está em alta" independente de categoria. Não substitui a busca por termo (US1); complementa como lista de inspiração (US2), com cada termo clicável para disparar uma nova busca (US1).

## 5. Cache (`trend_cache`, TTL 24h)

- **Decision**: Uma coleção `trend_cache` no MongoDB, documento por chave (`_id`): termo normalizado para buscas (US1) ou uma chave fixa `"__gerais__"` para a lista de tendências gerais (US2). Mesmo mecanismo de TTL/fallback para os dois casos.
- **Rationale**: Reaproveitar a mesma lógica de cache para busca por termo e tendências gerais evita duplicar a regra de "menos de 24h → cache, mais de 24h → nova consulta, falha → cache vencido com aviso" (FR-007 a FR-011) em dois lugares. Termo normalizado = `trim().toLowerCase()` com espaços internos colapsados, para tratar variações triviais como o mesmo termo (edge case da spec).
- **Alternatives consideradas**: cache em memória (não sobrevive a cold start/múltiplas instâncias serverless); TTL nativo do MongoDB (`expireAfterSeconds`) — rejeitado porque a spec exige mostrar o cache **vencido** como fallback em caso de falha (US4), então o documento não pode ser apagado automaticamente ao expirar; a expiração é avaliada na aplicação, comparando `obtidoEm` com "agora".

## 6. Erros e distinção de causa (FR-013/FR-014)

- **Decision**: A rota devolve sempre o status HTTP real (nunca convertido em 200); o corpo distingue três famílias:
  - `token_invalido` (401/renovação falhou em `obterAccessTokenValido`) → "reconecte a conta do Mercado Livre";
  - `categoria_nao_encontrada` (previsor não retornou `category_id`) → 404, "não foi possível identificar uma categoria para este termo";
  - `falha_mercado_livre` (qualquer outro erro de rede/API, incluindo 403/429/5xx do ML) → 502, mensagem genérica de indisponibilidade — e, se houver cache vencido para o termo, a rota devolve os dados do cache com um campo `avisoDesatualizado: true` em vez do erro.
- **Rationale**: Mesma convenção já usada em `app/api/mercado-livre/simular-preco/route.ts` (`erro`/`mensagem`, status 400/404/502) e em `erroMercadoLivre()` (inclui o corpo da resposta do ML na mensagem, nunca esconde o motivo real — regra 3 do CLAUDE.md).
- **Alternatives consideradas**: normalizar tudo em um único "erro genérico" — rejeitado, FR-014 exige diferenciar a causa.

## 7. i18n

- **Decision**: Sem biblioteca de i18n no projeto (confirmado em specs/019); textos novos em pt-BR inline nos componentes, seguindo o padrão do restante do admin.
- **Rationale**: Criar infraestrutura de i18n está fora do escopo deste ticket.
