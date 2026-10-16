# Research: Buscador de produtos em alta (EDI-130)

Testado ao vivo em 2026-10-15 com o token do app (`obterAccessTokenValido`), só leitura.

## 1. Mais vendidos com nome e foto

- **Decision**: `GET /highlights/MLB/category/{id}` (20 itens) + `GET /products/{id}` para itens `PRODUCT` → `name` e `pictures[0].url`. `ITEM` e `USER_PRODUCT` ficam sem nome/foto (card substituto).
- **Rationale**: Em Banheiros (MLB1613): 17 `PRODUCT`, 2 `USER_PRODUCT`, 1 `ITEM`. `/products/{id}` devolveu nome e foto em todos os `PRODUCT`; `/items/{id}` e `/user-products/{id}` de terceiros dão 403 (confirma specs/020). ~85% com foto atende SC-004.
- **Alternatives**: buscar o nome do `ITEM` pela busca de anúncios — bloqueada (403).

## 2. Link "Ver no Mercado Livre"

- **Decision**: montado pelo tipo, sem requisição: `PRODUCT` → `https://www.mercadolivre.com.br/p/{id}`; `ITEM` `MLB123` → `https://produto.mercadolivre.com.br/MLB-123`; `USER_PRODUCT` → `https://www.mercadolivre.com.br/up/{id}`; termo/busca por nome → `https://lista.mercadolivre.com.br/{termo-com-hifens}`.
- **Rationale**: `permalink` do `/products/{id}` vem vazio; esses formatos são os públicos do ML (os mesmos já reconhecidos em `lib/nichos/linkProduto.ts`). Assim até os cards sem nome têm link.

## 3. Subcategorias (achado do teste)

- **Decision**: além das 16 categorias, a tela permite descer para as subcategorias (`GET /categories/{id}` → `children_categories`, com `path_from_root` para o caminho). Ranking e termos funcionam em qualquer nível.
- **Rationale**: os mais vendidos do nível de cima não são de 3D (Banheiros: chuveiros, toalhas, assento sanitário). Já em Banheiros › Acessórios para Banhos › Suportes para Papel Higiênico (MLB186368) os 20 são suportes de papel — exatamente o tipo de peça imprimível. Sem descer de nível a tela perde quase todo o valor.
- **Alternatives**: filtrar o ranking por palavras "imprimíveis" — frágil e esconderia dados.

## 4. Mais procurados com foto

- **Decision**: `GET /trends/MLB/{categoryId}` (50 termos) — usar os **20 primeiros** (igual specs/030) e, para cada termo, `GET /products/search?status=active&site_id=MLB&q=<termo>&limit=1` → foto e nome do 1º produto de catálogo.
- **Rationale**: testado ("tapete banheiro antiderrapante" → produto com foto). 20 termos limitam as chamadas.

## 5. Busca por nome

- **Decision**:
  - "Todas": `GET /products/search?status=active&site_id=MLB&q=<termo>&limit=24`.
  - Com categoria: `GET /sites/MLB/domain_discovery/search?q=<termo>&limit=8` → para cada `category_id` sugerido, `GET /categories/{id}` (`path_from_root`); fica só o domínio cuja categoria **descende da selecionada**; depois `products/search` com `domain_id=<domínio>` (repartindo as 24 vagas). Nenhum domínio dentro da categoria → lista vazia com sugestão de limpar o filtro.
- **Rationale**: `products/search` **ignora** `category=` (mesmos resultados com e sem); `domain_id=` funciona (total caiu de 10000 para 9172, só `MLB-TOILET_PAPER_HOLDERS`). `domain_discovery` devolveu "papel higienico" → Papéis Higiênicos (MLB252555) e Suportes para Papel Higiênico (MLB186368, descendente de Banheiros).
- **Alternatives**: filtrar só os nomes do ranking/termos da categoria — 20 itens, quase sempre vazio.

## 6. Cache

- **Decision**: `obterComCache` (`lib/tendencias/cache.ts`, coleção `trend_cache`, 24h, fallback vencido). Chaves: `alta:vendidos:<categoryId>`, `alta:procurados:<categoryId>`, `alta:busca:<categoryId|todas>:<termo normalizado>`. Nome/foto de produto e caminho de categoria: cache de 7 dias (`alta:produto:<id>`, `alta:categoria:<id>`), como `mw:design:<id>` da specs/030.
- **Rationale**: "Todas" = 16 categorias × 20 itens; com cache de produto, as repetições não chamam o ML.

## 7. "Todas" as categorias

- **Decision**: o cliente faz uma requisição por categoria (até 4 em paralelo) e vai mostrando conforme chegam; mescla intercalando por posição (todos os 1º, depois os 2º…) e remove repetidos ficando a melhor posição. Falha numa categoria vira aviso, não derruba as outras.
- **Rationale**: mesmo padrão da Pesquisa de nichos (research 030 #8); evita uma rota de 300+ chamadas.

## 8. Shopee e MakerWorld

- **Decision**: só links: `https://shopee.com.br/search?keyword=<nome>` e `https://makerworld.com/pt/search/models?keyword=<nome>` (com `encodeURIComponent`). Desativados quando o card não tem nome.

## 9. Tela antiga

- **Decision**: a página `/admin/tendencias` passa a ser o buscador; removidos `TendenciasBusca.tsx`, `/api/admin/tendencias` e `/api/admin/tendencias/gerais` (+ testes) e `buscarTendenciasGerais`/`preverCategoriaParaTendencia` se ficarem sem uso. `buscarMaisVendidosCategoria` evolui para trazer foto. Menu: "Produtos em alta".
- **Rationale**: FR-012; os mesmos dados agora em cards.

## 10. Erros (regra 3 do CLAUDE.md)

- **Decision**: reaproveitar o padrão de `lib/nichos/erros.ts`: `{ erro, mensagem, statusOrigem? }` com status real — 400 `categoria_invalida`/`ordem_invalida`, 401 `token_invalido`, 429 quando o ML devolver 429, 502 `falha_mercado_livre`. Falha ao resolver nome/foto de **um** produto não derruba a lista (card substituto).

## 11. i18n

- **Decision**: sem biblioteca de i18n no projeto (nenhum `next-intl`/dicionário); o admin usa textos pt-BR inline — mesmo padrão de specs/020 e 030.
