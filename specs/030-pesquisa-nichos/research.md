# Research: Pesquisa de nichos para impressão em escala

Tudo abaixo foi testado ao vivo em 2026-10-14 com o token real do app (Mercado Livre) e sem login (MakerWorld).

## 1. Demanda: o que as pessoas procuram

- **Decision**: `GET /trends/MLB/{categoryId}` com o token do app (`obterAccessTokenValido`). Devolve 50 `{ keyword, url }` em ordem; a posição é o sinal de demanda. Usar só os **20 primeiros** por categoria (FR-015).
- **Rationale**: Único sinal de demanda por categoria acessível. Funciona em subcategorias (ex: `MLB436414` Organização para Casa traz "organizador de gaveta", "divisória gaveta", "gaveteiro de mesa").
- **Alternatives**: `/trends/MLB` geral (já usado em EDI-107, genérico demais); `/highlights` (só ids, sem nome para `ITEM` — ver specs/020).

## 2. Concorrência

- **Decision**: `GET /products/search?status=active&site_id=MLB&q=<termo>&limit=1` → `paging.total` (produtos de catálogo). Faixas: `< 1000` baixa, `1000–4999` média, `≥ 5000` alta; `10000` é o teto do ML e aparece como "10.000+".
- **Rationale**: `/sites/MLB/search` (contagem de anúncios) é 403 para apps comuns (specs/020 research #1, reconfirmado hoje). Catálogo é a única contagem disponível. Amostra: "organizador de gaveta modular" 4640, "suporte controle ps5" 4414, "porta caneta" 10000.
- **Alternatives**: nº de anúncios (bloqueado); vendas de terceiros (403).

## 3. MakerWorld: busca

- **Decision**: `GET https://api.bambulab.com/v1/search-service/select/design2?keyword=<termo>&limit=5&offset=0&licenses=CC0,BY,BY-SA`, sem autenticação. `makerworld.com/api/...` fica atrás do desafio do Cloudflare; `api.bambulab.com` responde direto.
- **Rationale**: A busca é semântica e aceita português ("porta caneta" → pen holders). O parâmetro `licenses` já filtra só licenças que permitem venda (conferido: só voltam `CC0`, `BY`, `BY-SA`); ainda assim a licença é revalidada no código (nunca `NC`, nunca "Standard Digital File License").
- **Relevância (revisado no teste ao vivo)**: cada hit traz `ext` (JSON) com `rk` = `"<nota>|<pos>|<pos>"`. Casamento forte (título/tags no idioma do termo) dá nota ~100; fraco (só imagem ou palavra solta) ~10 ou menos. **Regra final**: `rk ≥ 50` **e** ≥ 300 downloads, na ordem da própria busca. Com isso sumiram "Tiara" para "arara de roupa", "DinoAmigo" para "placa mármore", "Dragon Flexi" para "revestimento pedra flexível". Sem `ext` (API mudou), vale só o filtro de downloads.
- **Relevância (primeira versão, insuficiente)**: a busca semântica sempre devolve algo, até para termos não imprimíveis ("cama solteiro" → peças de 156 downloads, irrelevantes). **Regra**: o termo só vira oportunidade se algum modelo aprovado tiver **≥ 300 downloads** (`MIN_DOWNLOADS_RELEVANTE`). Amostra: "organizador de gaveta" 14.703 ✔, "globo de neve" 492 ✔, "lixeira automatica" 504 ✔, "cama solteiro" 156 ✘, "fogao industrial" 239 ✘.
- **Alternatives**: busca por imagem (não há endpoint público; ficaria dependente de IA externa — fora desta versão).

## 4. MakerWorld: perfil de impressão

- **Decision**: `GET https://api.bambulab.com/v1/design-service/design/{id}` → `instances[]` (perfis). Campos usados por perfil: `id`, `profileId`, `title`, `prediction` (segundos), `weight` (g), `materialColorCnt`, `needAms`, `instanceFilaments[]`, `printCount`, `downloadCount`, `ratingScoreTotal`, `extention.modelInfo.compatibility.devModelName`, `extention.modelInfo.otherCompatibility[].devModelName`, `extention.modelInfo.plates[]`, `extention.otherCompatibilityModelInfo[]` (`devModelName`, `prediction`, `weight`, `modelInfo.plates`). No design: `license`, `title`, `slug`, `coverUrl`, `designCreator.name`.
- **Códigos de impressora**: `N2S` = A1, `N1` = A1 mini (outros: `C11` P1P, `C12` P1S, `BL-P001` X1C…).
- **Filtro 1 cor**: `materialColorCnt === 1 && !needAms` (FR-005).
- **Filtro A1**: perfil nativo `N2S`/`N1`, ou `otherCompatibility` contém `N2S`/`N1`.
- **Tempo/gramas**: se o perfil não é nativo A1 mas tem entrada `N2S` em `otherCompatibilityModelInfo`, usar `prediction`/`weight`/mesas dessa entrada (é o fatiamento para A1); senão os do próprio perfil. Perfil sem `prediction` ou `weight` > 0 é descartado.
- **Melhor perfil**: maior `printCount`, desempate por `ratingScoreTotal`.
- **Link**: `https://makerworld.com/pt/models/{designId}-{slug}#profileId-{profileId}` — abre a página no perfil; lá o usuário usa "Abrir no Bambu Studio".
- **Custo de chamadas**: a busca já traz `downloadCount`; só os hits com ≥ 300 downloads (até 3 por termo) têm o detalhe buscado.

## 5. Potencial de venda

- **Decision**: pontos = posição na tendência (1–10 → 2; 11–20 → 1) + popularidade no MakerWorld (melhor modelo ≥ 3.000 downloads → 1). `≥ 3` alto, `2` médio, `≤ 1` baixo (oculto, só contado). O motivo é mostrado ("5º mais buscado em Organização · modelo com 14.703 downloads").
- **Rationale**: sem vendas de terceiros (403), a posição na busca é o sinal de demanda; downloads no MakerWorld confirmam que a peça é procurada também por quem imprime. Simples, explicável e ajustável (constantes).

## 6. Pesquisa por link (Shopee / ML)

- **Decision**: extrair o nome do slug da URL, sem requisição: Shopee `shopee.com.br/<Nome-Do-Produto>-i.<loja>.<item>`; ML `produto.mercadolivre.com.br/MLB-<n>-<nome>-_JM`, `mercadolivre.com.br/<nome>/p/MLB<n>`, `.../up/MLBU<n>`, `lista.mercadolivre.com.br/<termo>`. Hifens viram espaço, `decodeURIComponent`. Sem nome extraível (`shopee.com.br/product/<a>/<b>`, link curto) → pedir o nome.
- **Rationale**: páginas da Shopee e do ML exigem verificação antibot; o slug já carrega o título.
- Pesquisa por termo não tem posição de tendência → potencial "não avaliado"; mostra concorrência e modelos.

## 7. Cache

- **Decision**: reaproveitar `obterComCache` (`lib/tendencias/cache.ts`, coleção `trend_cache`, TTL 24h, fallback para vencido com aviso). Chaves: `nichos:cat:<categoryId>:<1cor|todas>:<a1|todas>` e `nichos:termo:<termo normalizado>:<...>`.
- **Rationale**: mesma regra de 24h/fallback já testada; uma requisição por categoria permite o cliente mostrar resultados progressivamente.

## 8. Tempo de resposta

- **Decision**: uma rota por categoria, concorrência interna de 4 chamadas simultâneas, `maxDuration = 300`. O cliente dispara uma requisição por categoria escolhida (máx. 4 categorias) em paralelo e mostra cada uma ao chegar.
- Estimativa: 20 termos × (1 busca MW + 1 contagem ML + ≤3 detalhes MW) ≈ 60–100 chamadas → ~15–40 s por categoria sem cache.

## 9. Levar para a calculadora

- **Decision**: `POST /api/admin/nichos/calculo` cria o cálculo em `calculosPreco` (`criarCalculoPreco`) a partir dos valores padrão da calculadora. Para isso `valoresPadrao`/`ANUNCIO_PADRAO` saem de `CalculadoraRapida.tsx` (`"use client"`) para `lib/produtos/calculadoraPadrao.ts`, usado pelos dois lados. Tempo em horas com 2 casas; gramas inteiras. Perfil de 1 mesa → `producao.horasMesaCheia` = tempo e `pecasPorMesa` = "1" (ajustável); perfil com várias mesas → produção em branco e nome com "(N mesas — confira)".

## 10. Erros (regra 3 do CLAUDE.md)

- Token do ML → 401 `token_invalido`. Falha do ML → 502 `falha_mercado_livre`. Falha do MakerWorld → 502 `falha_makerworld`. Corpo sempre com `mensagem` e `statusOrigem` (o status real da origem). Falha de contagem de um termo isolado não derruba a lista: concorrência fica "indisponível".

## 11. i18n

- Sem biblioteca no projeto; textos pt-BR inline (igual a specs/020).

## 12. Limite de acessos do MakerWorld (descoberto no teste ao vivo)

- Rajadas (~100 chamadas em segundos) e ~4 varreduras de categoria em 10 min fizeram `api.bambulab.com` responder **429** ou o desafio do Cloudflare ("Just a moment…", 403/200 com HTML). O bloqueio passa em alguns minutos.
- **Decision**: cliente com fila (uma chamada por vez, 800 ms entre elas); detalhe de modelo em cache por 7 dias (`mw:design:<id>`, só os campos usados); categorias pesquisadas uma por vez pela tela, máx. 3 por pesquisa; resultado da categoria em cache 24h. Bloqueio vira `ErroMakerWorld(bloqueado)` → rota 429 `makerworld_bloqueado` com `statusOrigem` e mensagem "aguarde alguns minutos"; detalhe que falha por outro motivo só pula o modelo.
- Tempo medido: 37–49 s por categoria sem cache.
