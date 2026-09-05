# Research: Integração com Mercado Livre — Anúncios e Vendas (EDI-80)

Resultados da Fase 0 — decisões técnicas com alternativas consideradas. Parte da base OAuth2/estoque já foi construída na Tarefa 5 (EDI-78) e é reaproveitada aqui sem mudanças (ver `specs/005-estoque-sincronizacao-canais/research.md` #7).

## 1. Reaproveitar o modelo `Pedido` para vendas nascidas no Mercado Livre

**Decision**: Uma venda notificada pelo webhook do Mercado Livre vira um documento normal na coleção `pedidos`, com `canalOrigem: "mercado_livre"` e `status: "pago"` já na criação (o Mercado Livre só notifica pedidos com pagamento aprovado). O campo `Pedido.canalOrigem` já contempla esse valor desde a Tarefa 3/4 — este é o primeiro fluxo a de fato produzi-lo. Em seguida, `abaterEstoquePedido(pedido)` (`lib/estoque/abatimento.ts`, Tarefa 5) é chamado sem alteração, pois já opera sobre qualquer `Pedido`, independente da origem.

**Rationale**: Evita um segundo caminho de abatimento/sincronização paralelo ao já validado na Tarefa 5 — a mesma função atômica (`abaterEstoqueAtomico`), o mesmo registro de inconsistência e a mesma sincronização multicanal passam a servir os dois sentidos (site→canais e canal→site) sem duplicar lógica de domínio.

**Alternatives considered**: Criar uma coleção separada "vendasExternas" só para vendas de canais externos — rejeitada; o modelo `Pedido` já foi desenhado (Tarefa 3) para múltiplas origens, e duplicar o conceito obrigaria a manter dois relatórios/telas de pedidos em vez de um.

## 2. Idempotência da notificação de pedido do Mercado Livre

**Decision**: `Pedido` ganha um campo opcional `origemExterna: { canal: "mercado_livre" | "shopee"; pedidoExternoId: string }`, com índice único esparso em `origemExterna.pedidoExternoId`. O processamento do webhook faz um `findOneAndUpdate` com `upsert: true` filtrando por esse par; quando o documento já existir (reenvio da mesma notificação), a operação não cria um novo pedido nem reabate estoque.

**Rationale**: Espelha o mesmo padrão já usado para o checkout do site (`idempotencia`, índice único esparso, Tarefa 3) e para a promoção de pagamento do Mercado Pago (`findOneAndUpdate` condicional, Tarefa 4) — reaproveita uma técnica já validada em vez de inventar um mecanismo novo.

**Alternatives considered**: Deduplicar por `pedidoExternoId` em memória/cache antes de gravar — descartado; não sobrevive a reinício de instância serverless nem a duas instâncias concorrentes, ao contrário de um índice único no MongoDB.

## 3. Upload de imagens: URL pública direto no `pictures` da criação do item

**Decision**: As fotos do produto já são hospedadas como URLs públicas no Vercel Blob (Tarefa 2). Cada foto é enviada como `{ "source": "<url>" }` dentro do array `pictures` do próprio `POST /items` (criação do anúncio, #4) — o Mercado Livre busca cada URL sozinho no momento da criação, sem chamada HTTP separada.

**Correção pós-implementação (2026-09-05)**: a primeira versão chamava `POST /pictures/items/upload` com o campo `source` num corpo `multipart/form-data`, supondo que esse endpoint aceitasse upload por URL. Testado em produção, a API rejeitou com HTTP 400 — `POST /pictures/items/upload` só aceita arquivo binário direto (`multipart/form-data` com campo `file`); o modo por URL só existe embutido no `pictures` de `POST`/`PUT /items`, confirmado na documentação oficial do Mercado Livre. `enviarImagem` foi removida; `criarAnuncio` agora monta `pictures: produto.fotos.map((source) => ({ source }))` direto no corpo de criação.

**Rationale**: Elimina qualquer chamada extra — uma única requisição de criação do item já resolve upload das fotos, título, preço e estoque juntos.

**Alternatives considered**: Baixar cada foto do Blob e reenviar como `multipart/form-data` para `POST /pictures/items/upload` (fluxo "com ID") — desnecessário agora que se sabe que o modo por `source` embutido funciona; ficaria como opção só se o Mercado Livre um dia deixar de aceitar `source` no `pictures` (não documentado como caminho de descontinuação).

## 4. Criação de anúncio a partir do produto

**Decision**: `POST /items` da API do Mercado Livre, com `title`, `category_id` (resolvido pelo mapeamento de categoria, ver #5), `price`, `currency_id: "BRL"`, `available_quantity` (= `produto.estoque`), `condition: "new"`, `listing_type_id` (tipo de anúncio padrão da conta), `description` e `pictures` (IDs retornados pelo upload, #3). O `item_id` retornado é gravado em `produto.integracoes.mercadoLivreId` (campo já existente desde a Tarefa 5).

**Rationale**: Reaproveita o mesmo campo de associação produto↔anúncio já usado pela sincronização de estoque — nenhuma mudança é necessária em `sincronizarEstoqueProduto`/`sincronizarAnuncioProduto` (#6) para reconhecer um anúncio criado por esta tarefa versus um cadastrado manualmente na Tarefa 5.

**Alternatives considered**: Gravar o `item_id` em um campo separado (ex: `integracoes.mercadoLivreIdAutomatico`) para diferenciar anúncios criados pelo sistema dos cadastrados manualmente — rejeitado; a spec não exige essa distinção, e um único campo mantém a Tarefa 5 e esta tarefa compatíveis sem ramificação de código.

**Correção pós-implementação (2026-09-05)**: a conta vendedora está no modelo **User Products (UP)** do Mercado Livre, em que `family_name` (nome genérico que agruparia variações do mesmo produto) é obrigatório e **substitui** `title` — o Mercado Livre gera o título otimizado do anúncio a partir de `family_name` + atributos, e não aceita mais o vendedor definir `title` diretamente. Confirmado em produção pelos dois erros complementares: sem `family_name` → `body.required_fields`; com `family_name` **e** `title` → `body.invalid_fields` em `[title]`. Payload final: `family_name` sim, `title` não. (Nesse modelo o campo `variations` também não pode ser enviado — não é o caso aqui, o catálogo do site não tem variações.)

**Segunda correção pós-implementação (2026-09-05)**: mesmo com `family_name` e a categoria correta, `POST /items` falhou com `Error getting resource /decorations/build-title ... attributes are required` — o domínio "decorations" (confirma que a categoria via previsor, #5, está certa) exige atributos obrigatórios da categoria para o Mercado Livre conseguir montar o título automaticamente. Adicionado `buscarAtributosObrigatorios(categoryId)` (`GET /categories/{categoryId}/attributes`, filtra `tags.required`) e `valorPadraoAtributo` (`lib/estoque/canais/mercadoLivre/atributos.ts`): melhor esforço para preencher cada atributo obrigatório sem intervenção manual — atributos do tipo lista fechada (ex: marca) recebem uma opção genérica ("Genérica"/"Não especificado") se existir, senão a primeira opção da lista; atributos de texto livre recebem o nome do produto. Enviados em `attributes` no `POST /items`.

**Risco aceito**: esse preenchimento automático é heurístico — se uma categoria exigir um atributo cujo valor não pode ser sensatamente adivinhado (ex: uma medida técnica específica), a publicação falhará de forma registrada e consultável (FR-011), com o motivo exato vindo da API do Mercado Livre (graças a `erroMercadoLivre`, #7-adjacente) — nunca silenciosamente.

## 5. Categoria do Mercado Livre: previsor automático, com override manual opcional

**Decision original**: Um mapeamento estático (objeto/dicionário no código) associaria cada valor de `produto.categoria` usado no site a um `category_id` fixo do Mercado Livre.

**Revisão pós-implementação (2026-09-05)**: testado em produção com uma categoria de nível 1 fixa (`MLB1574`, "Casa, Móveis e Decoração"), `POST /items` respondeu com erros de validação incoerentes entre si (`family_name` obrigatório, depois `title` inválido) — sintoma de categoria raiz inválida para publicação direta (o Mercado Livre exige uma subcategoria/folha). Trocado para: `criarAnuncio` chama `preverCategoriaMercadoLivre(produto.nome)` (`lib/estoque/canais/mercadoLivre/previsorCategoria.ts`), que consulta `GET /sites/MLB/domain_discovery/search?q=<título>&limit=1` — o previsor oficial do Mercado Livre, que a partir do título do produto devolve uma categoria-folha válida (evita a necessidade de descobrir manualmente subcategorias para cada categoria do site). `lib/estoque/canais/mercadoLivre/categorias.ts` (`resolverCategoriaMercadoLivre`) continua existindo, mas como **override manual opcional** por categoria do site — só usado se o previsor errar consistentemente para algum caso; tem prioridade sobre o previsor quando preenchido.

**Rationale**: O previsor é o mecanismo que o próprio Mercado Livre disponibiliza para resolver exatamente esse problema (categoria-folha correta a partir de um título livre) — mais confiável do que adivinhar/manter IDs fixos manualmente, ao custo de uma chamada de API extra por publicação (aceitável no volume desta loja).

**Alternatives considered**: Manter só o mapeamento estático e pedir para o usuário descobrir manualmente os `category_id` de folha corretos no painel do Mercado Livre — descartado após o erro em produção mostrar que isso exigiria repetir esse processo manual para cada categoria nova do site, sem necessidade dado que o previsor resolve isso automaticamente.

## 6. Estender a sincronização existente para incluir preço

**Decision**: `sincronizarEstoqueProduto` (Tarefa 5) é generalizada para `sincronizarAnuncioProduto`, que continua enviando `available_quantity` e passa a enviar também `price` no mesmo `PUT /items/{item_id}` do Mercado Livre. É chamada nos mesmos dois pontos já existentes (abatimento de estoque e reprocessamento da fila) **e** em um novo ponto: após uma edição de produto (`PATCH /api/produtos/[id]`) que altere `preco` ou `estoque`, quando o produto já tiver `integracoes.mercadoLivreId`.

**Rationale**: A Tarefa 5 já entrega o mecanismo de fila/retry/log — estender o payload enviado ao canal (em vez de criar um segundo mecanismo paralelo só para preço) cobre FR-005 sem duplicar a lógica de "canal configurado", fila e backoff já validada.

**Alternatives considered**: Sincronizar preço só na criação do anúncio, deixando toda atualização posterior manual — rejeitado; não atende à User Story 3 (preço sempre atualizado) nem ao FR-005.

## 7. Webhook de pedidos do Mercado Livre (tópico `orders_v2`)

**Decision**: Uma rota dedicada (`POST /api/webhooks/mercado-livre/pedidos`, seguindo o mesmo padrão de rota específica por canal já usado para o Mercado Pago em `app/api/pagamentos/webhook/route.ts`, em vez do esqueleto genérico em `app/api/webhooks/route.ts`) recebe a notificação, valida que `application_id` do payload corresponde ao `MERCADOLIVRE_CLIENT_ID` configurado, e então busca os dados reais do pedido via `GET /orders/{id}` autenticado — o corpo da notificação em si nunca é usado como fonte de dados de negócio, apenas como gatilho para a consulta (mesmo princípio já aplicado ao webhook do Mercado Pago, research.md #6 da Tarefa 4).

**Rationale**: O Mercado Livre não assina suas notificações com HMAC como o Mercado Pago (`x-signature`) — a validação possível e documentada é conferir que o `application_id` notificado é o da aplicação configurada. Buscar os dados reais via API (em vez de confiar no payload do webhook) evita processar um pedido com dados incompletos ou desatualizados.

**Alternatives considered**: Processar diretamente os campos do payload da notificação — rejeitado; a documentação do Mercado Livre recomenda explicitamente tratar o webhook como um sinal ("algo mudou, busque os detalhes"), não como a fonte de verdade dos dados do pedido.

## 8. Não reenviar ao canal que originou a venda

**Decision**: `sincronizarAnuncioProduto` passa a aceitar um parâmetro opcional `canalOrigem`; quando informado, esse canal é pulado na lista de canais a sincronizar. O abatimento originado por um pedido do Mercado Livre passa `canalOrigem: "mercado_livre"`; o abatimento originado no site (Tarefa 5) continua sem informar o parâmetro (sincroniza todos os canais configurados, como já acontece hoje).

**Rationale**: O Mercado Livre já reflete a baixa de estoque do próprio anúncio no momento da venda — reenviar a mesma quantidade de volta é uma chamada HTTP redundante. É uma otimização, não uma correção: enviar mesmo assim não causaria inconsistência, só custo extra.

**Alternatives considered**: Sempre sincronizar todos os canais configurados, inclusive o de origem — mantido como comportamento aceitável caso a otimização não seja implementada a tempo; não é um requisito funcional da spec, apenas uma melhoria de eficiência.

## 9. Log de falhas de publicação/atualização de anúncio (FR-011)

**Decision**: Nova coleção `publicacoesCanalFalhas`, análoga a `sincronizacoesEstoque` (Tarefa 5) mas para o ciclo de vida do anúncio em si (criar/atualizar), não da quantidade em estoque: cada tentativa de criar ou atualizar um anúncio que falhe grava `produtoId`, `canal`, `operacao` (`"criar" | "atualizar"`), `motivo` e `criadoEm`. Consultável via `GET /api/anuncios/pendencias`.

**Rationale**: Falhas de publicação (ex: categoria sem mapeamento, foto rejeitada) são conceitualmente diferentes de falhas de sincronização de quantidade (ex: token expirado durante um `PUT`) — mantê-las em coleções separadas evita sobrecarregar `sincronizacoesEstoque` com um tipo de evento que não participa do mesmo ciclo de retry/backoff (uma falha de categoria não se resolve tentando de novo automaticamente; exige correção manual do cadastro).

**Alternatives considered**: Reaproveitar `sincronizacoesEstoque` também para falhas de publicação, com um campo `tipo` adicional — rejeitado; misturaria dois ciclos de vida diferentes (um com retry automático, outro que precisa de correção manual antes de qualquer nova tentativa) na mesma coleção e no mesmo endpoint de consulta.

## 10. Publicação do anúncio é uma ação explícita do responsável pela loja

**Decision**: O formulário de edição de produto (`components/admin/ProdutoForm.tsx`, Tarefa 5) ganha um botão "Publicar no Mercado Livre", visível quando `integracoes.mercadoLivreId` está vazio, que chama a nova rota de criação de anúncio. Quando o campo já está preenchido (seja por publicação automática desta tarefa, seja por cadastro manual da Tarefa 5), o formulário continua permitindo edição manual do ID, sem forçar a recriação do anúncio.

**Rationale**: Mantém compatibilidade com o fluxo manual já existente da Tarefa 5 (produtos com anúncio cadastrado à mão continuam funcionando) e atende à Assumption da spec de que a publicação é disparada por ação humana, não automática para todo o catálogo.

**Alternatives considered**: Publicar automaticamente todo produto novo assim que cadastrado — rejeitado pela spec (fora de escopo, ver Assumptions) e arriscado sem revisão humana prévia dos dados que vão para um canal de venda público.
