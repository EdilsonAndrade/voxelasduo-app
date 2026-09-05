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

## 3. Upload de imagens: URL pública em vez de binário

**Decision**: As fotos do produto já são hospedadas como URLs públicas no Vercel Blob (Tarefa 2). O upload para o Mercado Livre usa o parâmetro `source` do endpoint `POST /pictures/items/upload` da API do Mercado Livre, passando a própria URL pública — o Mercado Livre busca a imagem diretamente, sem o servidor da aplicação precisar baixar e reenviar bytes.

**Rationale**: Elimina uma etapa de transferência (download do Blob + upload multipart), reduzindo tempo de resposta e uso de memória da função serverless. É um modo de uso documentado pela própria API do Mercado Livre para imagens já públicas na web.

**Alternatives considered**: Baixar cada foto do Blob e reenviar como `multipart/form-data` — mantido como fallback apenas se o modo por URL for rejeitado pelo Mercado Livre para algum caso (ex: bloqueio de hotlink); não é o caminho principal por adicionar latência e complexidade sem necessidade no caso comum.

## 4. Criação de anúncio a partir do produto

**Decision**: `POST /items` da API do Mercado Livre, com `title`, `category_id` (resolvido pelo mapeamento de categoria, ver #5), `price`, `currency_id: "BRL"`, `available_quantity` (= `produto.estoque`), `condition: "new"`, `listing_type_id` (tipo de anúncio padrão da conta), `description` e `pictures` (IDs retornados pelo upload, #3). O `item_id` retornado é gravado em `produto.integracoes.mercadoLivreId` (campo já existente desde a Tarefa 5).

**Rationale**: Reaproveita o mesmo campo de associação produto↔anúncio já usado pela sincronização de estoque — nenhuma mudança é necessária em `sincronizarEstoqueProduto`/`sincronizarAnuncioProduto` (#6) para reconhecer um anúncio criado por esta tarefa versus um cadastrado manualmente na Tarefa 5.

**Alternatives considered**: Gravar o `item_id` em um campo separado (ex: `integracoes.mercadoLivreIdAutomatico`) para diferenciar anúncios criados pelo sistema dos cadastrados manualmente — rejeitado; a spec não exige essa distinção, e um único campo mantém a Tarefa 5 e esta tarefa compatíveis sem ramificação de código.

## 5. Mapeamento de categoria do site → categoria do Mercado Livre

**Decision**: Um mapeamento estático (objeto/dicionário no código, ex: `lib/estoque/canais/mercadoLivre/categorias.ts`) associa cada valor de `produto.categoria` usado no site a um `category_id` válido do Mercado Livre. Categoria do produto sem entrada no mapeamento impede a publicação e gera uma falha registrada (FR-011), identificando o motivo ("categoria sem mapeamento").

**Rationale**: O catálogo do site (Tarefa 2) usa um conjunto pequeno e fixo de categorias — um mapeamento estático é suficiente e evita a complexidade de descobrir a árvore de categorias do Mercado Livre dinamicamente via API a cada publicação.

**Alternatives considered**: Consultar a API de categorias do Mercado Livre (`/sites/MLB/categories`) em tempo de publicação e tentar casar por nome — rejeitado; é impreciso (nomes não batem 1:1) e adiciona uma chamada de rede evitável para um conjunto de categorias que muda raramente.

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
