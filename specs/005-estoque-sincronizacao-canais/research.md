# Research: Abatimento de Estoque e Sincronização Multicanal (EDI-78)

Resultados da Fase 0 — decisões técnicas com alternativas consideradas.

## 1. Ponto de gatilho do abatimento (reaproveitar idempotência já existente)

**Decision**: O abatimento de estoque é disparado dentro de `promoverPedidoSeAprovado` (`lib/pagamentos/repository.ts`, Tarefa 4), imediatamente após a `updateOne` condicional (`status: { $ne: "pago" } → $set status: "pago"`) — e só quando `resultado.modifiedCount === 1` (ou seja, esta chamada foi de fato quem promoveu o pedido, não uma repetição).

**Rationale**: A Tarefa 4 já resolveu a idempotência da transição `pendente → pago` (uma corrida entre resposta síncrona do Brick e webhook, ou reenvio do webhook, nunca promove duas vezes). Amarrar o abatimento a essa mesma condição garante, de graça, que o estoque também nunca é abatido duas vezes para o mesmo pedido (FR-002) — sem precisar de um novo mecanismo de idempotência paralelo.

**Alternatives considered**: Verificar `pedido.status` antes/depois em cada handler (`POST /api/pagamentos` e webhook) e disparar o abatimento nos dois lugares com uma checagem própria — rejeitado, duplicaria lógica e reabriria a mesma classe de corrida que a Tarefa 4 já fechou em um único ponto.

## 2. Abatimento atômico e sem estoque negativo

**Decision**: Cada item do pedido é abatido com uma única operação atômica no MongoDB: `findOneAndUpdate({ _id: produtoId, estoque: { $gte: quantidade } }, { $inc: { estoque: -quantidade } })`. Quando essa condição falha (nenhum documento casa — estoque insuficiente no exato instante, ou produto removido), o item é registrado como inconsistência (coleção `estoqueInconsistencias`, ver `data-model.md`) para revisão manual, sem lançar exceção que travaria os demais itens do pedido.

**Rationale**: `$inc` com filtro `$gte` é atômico no nível do documento — resolve corrida entre duas vendas simultâneas do mesmo produto (edge case da spec) sem precisar de transação multi-documento. Como o pagamento já foi aprovado nesse ponto, não há como "desfazer a venda" automaticamente; registrar para revisão manual é o único caminho seguro (FR-004).

**Alternatives considered**: Transação MongoDB (multi-document ACID) envolvendo todos os itens do pedido — desnecessária nesta escala (poucos itens por pedido) e cada item é independente; uma transação tornaria a falha de um item capaz de reverter os demais, o que não é o comportamento desejado aqui.

## 3. Função reutilizável "atualizar estoque em todos os canais"

**Decision**: Uma função única, `sincronizarEstoqueProduto(produtoId)` (`lib/estoque/sincronizacao.ts`), lê o produto atualizado do MongoDB e, para cada canal com credenciais configuradas (ver #6), chama o client daquele canal. Chamada de duas formas:
1. **Imediata** (best-effort, com timeout curto) logo após o abatimento, para o caso feliz refletir em poucos minutos (SC-002).
2. **Reprocessamento** por uma rota de manutenção (`POST /api/estoque/sincronizar`, acionada por Vercel Cron) que varre a fila de sincronizações pendentes/falhas cuja `proximaTentativaEm` já passou.

**Rationale**: Reaproveitar a mesma função nos dois disparos (imediato e reprocessamento) evita duas implementações divergentes de "como sincronizar um canal" — exatamente o pedido do ticket ("função reutilizável"). Separar tentativa imediata de reprocessamento agendado equilibra latência (não travar o webhook esperando por uma API externa lenta) com confiabilidade (retry sem depender só da requisição original).

**Alternatives considered**: Só cron, sem tentativa imediata — rejeitado, atrasaria desnecessariamente o caso feliz (dependeria do intervalo do cron para toda venda, não só para falhas). Fila real (ex: Vercel Queues, beta) — avaliada e descartada por ora: adiciona uma dependência nova para um volume pequeno (dezenas de vendas); uma coleção Mongo de fila + cron resolve no mesmo padrão já usado no projeto (sem infra extra).

## 4. Fila de tentativas e backoff

**Decision**: Cada item pendente de sincronização guarda `tentativas` (contador) e `proximaTentativaEm` (Date). Após uma falha, `proximaTentativaEm = agora + backoff(tentativas)`, com backoff exponencial curto (ex: 1min, 5min, 30min, 2h, 6h) até um máximo de 5 tentativas; esgotadas, o item fica `status: "falhou"` e só volta a ser tentado se o produto for sincronizado manualmente ou vender de novo.

**Rationale**: Cobre tanto falhas rápidas (rede instável — resolve em minutos) quanto falhas mais longas (API do canal fora do ar por horas) sem gerar volume excessivo de chamadas nem esperar demais nos casos simples.

**Alternatives considered**: Número fixo de tentativas sem backoff — descartado, geraria rajadas de chamadas repetidas durante uma indisponibilidade prolongada da API externa.

## 5. Vercel Cron para o reprocessamento

**Decision**: `vercel.ts` declara um cron (`crons: [{ path: "/api/estoque/sincronizar", schedule: "*/15 * * * *" }]`, a cada 15 minutos) chamando a rota de reprocessamento. A rota também pode ser chamada manualmente (ex: pelo responsável da loja, autenticado por um segredo simples em header) para forçar uma nova tentativa sem esperar o cron.

**Rationale**: Convenção atual da Vercel para configuração do projeto (`vercel.ts` substitui `vercel.json`). Um cron de 15 em 15 minutos é suficiente para o volume esperado (dezenas de vendas) e compatível com os planos pagos da Vercel; caso o projeto esteja no plano Hobby (frequência mínima de cron mais restrita), o intervalo efetivo será ajustado na implementação para o mínimo permitido pelo plano vigente — o comportamento do sistema (retry com backoff) não muda, só a cadência de varredura.

**Alternatives considered**: Trigger via `setTimeout` dentro da função serverless — não funciona de forma confiável em ambiente serverless (a instância pode ser reciclada antes do timeout dispersar).

## 6. Canal "não configurado" vs. canal com falha (FR-007)

**Decision**: Um canal só entra na lista de canais a sincronizar se (a) existir a credencial de ambiente daquele canal E (b) o produto tiver o identificador do anúncio naquele canal (`produto.integracoes.<canal>`). Faltando qualquer um dos dois, o canal é simplesmente ignorado para aquele produto — não gera item de fila, não gera erro, não aparece no log de falhas.

**Rationale**: Implementa exatamente FR-007/edge case da spec: Shopee (perfil em análise) e qualquer produto sem anúncio em um canal não podem poluir o log de erros nem bloquear os demais canais. Quando a Shopee for aprovada, basta configurar as variáveis de ambiente e associar os `shopeeItemId` nos produtos — nenhuma mudança de código é necessária para o canal passar a sincronizar de verdade.

**Alternatives considered**: Sinalizar explicitamente "canal desabilitado" por configuração manual (feature flag) — desnecessário; a ausência de credencial/mapeamento já é um sinal suficiente e reduz um lugar a mais para configurar.

## 7. Cliente Mercado Livre (integração real)

**Decision**: `lib/canais/mercadoLivre/client.ts` implementa a interface comum (`atualizarQuantidade(anuncioId, quantidade)`) chamando `PUT https://api.mercadolibre.com/items/{item_id}` com `{ available_quantity: quantidade }` e `Authorization: Bearer <access_token>`. Como o `access_token` do Mercado Livre expira em poucas horas e o `refresh_token` é rotacionado a cada uso (o ML emite um novo a cada refresh), os tokens vigentes (access + refresh) são persistidos em uma coleção própria (`credenciaisCanais`, ver `data-model.md`) em vez de apenas em variável de ambiente estática — só `MERCADOLIVRE_CLIENT_ID`/`MERCADOLIVRE_CLIENT_SECRET` ficam em variável de ambiente. Antes de cada chamada, o client verifica se o `access_token` está perto de expirar e renova automaticamente.

**Rationale**: É assim que o OAuth2 do Mercado Livre funciona (documentado pela própria plataforma) — guardar só em `.env` estático quebraria depois do primeiro refresh, já que o `refresh_token` anterior deixa de ser válido.

**Alternatives considered**: Reautenticar manualmente sempre que o token expirar — inviável para um processo automático (webhook/cron) que roda sem intervenção humana.

## 8. Cliente Shopee (stub até aprovação do app)

**Decision**: `lib/canais/shopee/client.ts` expõe a mesma interface (`atualizarQuantidade`). Enquanto `SHOPEE_PARTNER_ID`/`SHOPEE_PARTNER_KEY` não estiverem configurados, o canal Shopee é tratado como "não configurado" (#6) — o client real nem chega a ser instanciado/chamado nesta tarefa. O client real (assinatura HMAC de cada requisição, conforme a Shopee Open Platform exige) fica implementado atrás da mesma interface, pronto para ligar quando o perfil for aprovado, mas seu caminho de chamada HTTP real não é exercitado nesta tarefa por falta de credenciais para testar.

**Rationale**: Mantém a "função reutilizável" (#3) agnóstica ao canal — trocar Shopee de stub para real não muda `sincronizarEstoqueProduto` nem a fila, só a implementação por trás da interface (decisão já validada com o usuário).

**Alternatives considered**: Adiar toda a estrutura de Shopee para uma tarefa futura — rejeitado; o ticket pede explicitamente a função multicanal agora, e construir a interface pronta (mesmo com client stub) evita retrabalho quando a aprovação sair.

## 9. Mapeamento produto → anúncio externo

**Decision**: `Produto` ganha um campo opcional `integracoes?: { mercadoLivreId?: string; shopeeItemId?: string }`, preenchido manualmente pelo responsável da loja (via edição do produto no admin existente da Tarefa 2) quando o anúncio correspondente já existir no canal.

**Rationale**: Não existe hoje nenhuma tarefa de "importar catálogo" dos canais externos; assumir que o anúncio já existe e só precisa do ID é a mesma premissa registrada na spec (Assumptions). Reaproveitar o formulário de edição de produto já existente evita uma tela nova só para isso.

**Alternatives considered**: Criar um cadastro/tela dedicada para vínculos de canal — desnecessário nesta escala; dois campos opcionais a mais no formulário de produto resolvem.

## 10. Log de falhas consultável (FR-009/FR-010)

**Decision**: A mesma coleção de fila de sincronização (`sincronizacoesEstoque`) serve como log — um item com `status: "falhou"` ou `tentativas > 0` já é, por si só, o registro consultável. Uma rota simples (`GET /api/estoque/pendencias`) lista produtos com sincronização pendente ou falha, reaproveitando o padrão de rota admin já existente (`app/api/produtos`).

**Rationale**: Evita duplicar dado em duas coleções (fila e log) para o mesmo evento — a fila já carrega motivo do erro e histórico de tentativas.

**Alternatives considered**: Coleção de log separada, alimentada por evento — redundante para o volume esperado; complica sem necessidade.
