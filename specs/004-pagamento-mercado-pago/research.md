# Research: Integração de Pagamento — Mercado Pago (EDI-77)

Resultados da Fase 0 — decisões técnicas com alternativas consideradas.

## 1. SDKs do Mercado Pago

**Decision**: `mercadopago` (Node SDK v2, oficial) no servidor para criar/consultar pagamentos; `@mercadopago/sdk-react` no cliente para renderizar o Payment Brick (cartão + Pix).

**Rationale**: São os pacotes oficiais mantidos pelo Mercado Pago para exatamente este caso (Payment Brick embutido + backend Next.js/Node). Evita reimplementar tokenização de cartão (que precisa acontecer no cliente, via SDK deles, para nunca trafegar o número do cartão pelo nosso servidor — requisito de segurança/PCI).

**Alternatives considered**: Checkout Pro (redirect) — rejeitado pelo usuário (quer o pagamento embutido no site); integração manual via `fetch` direto na API REST sem SDK — descartada, sem ganho e perde tipagem/validações do SDK oficial.

## 2. Onde o pagamento acontece na UI

**Decision**: Sem nova rota de "pagamento". A página `app/pedido/[id]/page.tsx` (criada na Tarefa 3) passa a renderizar o Payment Brick quando `pedido.status === "pendente"`, e a confirmação normal quando `"pago"`.

**Rationale**: O pedido já existe antes do pagamento (decisão da Tarefa 3) e essa página já é o destino pós-checkout. Reaproveitar evita uma rota nova só para hospedar o Brick, mantendo a jornada: checkout → pedido pendente → paga na mesma tela → confirmação.

**Alternatives considered**: Nova rota `/pedido/[id]/pagar` — rejeitada por não agregar valor; o usuário só teria mais um clique sem necessidade.

## 3. Modelagem das tentativas de pagamento

**Decision**: Tentativas de pagamento ficam embutidas no próprio documento do pedido (`pagamento.tentativas: TentativaPagamento[]`), não em coleção separada.

**Rationale**: Escala pequena (dezenas de pedidos, poucas tentativas por pedido) e todo acesso a tentativas é sempre "dentro do contexto de um pedido" — não há necessidade de consultar tentativas isoladamente. Embutir evita join/lookup e mantém o padrão simples já usado no projeto.

**Alternatives considered**: Coleção `tentativas_pagamento` própria — desnecessária nesta escala; only faria sentido com volume alto ou necessidade de consulta cross-pedido.

## 4. Retentativa após recusa/expiração (correção de suposição da Tarefa 3)

**Decision**: Pagamento recusado ou expirado **não** cancela o pedido — o pedido permanece `"pendente"`, a tentativa fica registrada com seu status própria, e o visitante pode tentar pagar novamente sobre o mesmo pedido. `pendente → cancelado` não é implementado nesta tarefa.

**Rationale**: O spec desta tarefa (US3/FR-006/FR-008) exige que o visitante consiga tentar novamente sem refazer o checkout. O diagrama de estados esboçado no `data-model.md` da Tarefa 3 (`pendente → cancelado: pagamento recusado/expirado`) foi especulativo e é corrigido aqui — cancelamento de pedido fica como decisão futura/administrativa (possivelmente EDI-81), fora de escopo.

**Alternatives considered**: Cancelar automaticamente e exigir novo checkout a cada falha — pior experiência e sem necessidade real (o pedido pendente já guarda os dados corretos de cliente/itens).

## 5. Conversão de valores (centavos ↔ reais)

**Decision**: O projeto guarda valores em centavos (inteiro) desde a Tarefa 1. A API do Mercado Pago espera `transaction_amount` em reais (float, ex: `49.90`). Uma função utilitária única (`lib/pagamentos/conversao.ts`) faz a conversão nos dois sentidos, usada em todo ponto de fronteira com o SDK do MP.

**Rationale**: Evita erros de arredondamento espalhados pelo código; centraliza a única fronteira onde a unidade muda.

**Alternatives considered**: Guardar valores em reais (float) no pedido — rejeitado, quebraria o padrão já estabelecido (`valorTotal` em centavos desde a Tarefa 1) e reintroduziria problemas de ponto flutuante no cálculo de totais.

## 6. `external_reference` para casar webhook ↔ pedido

**Decision**: Toda chamada de criação de pagamento envia `external_reference = <id do pedido>`. O webhook busca o pagamento por `id` na API do MP (nunca confia no payload do webhook em si, que só traz o `id`), lê `external_reference` da resposta e localiza o pedido por ele.

**Rationale**: É o padrão recomendado pelo Mercado Pago — o payload do webhook é só um aviso ("algo mudou no pagamento X"); os dados confiáveis vêm sempre de uma consulta subsequente à API (evita processar dados falsificados enviados diretamente ao endpoint do webhook).

**Alternatives considered**: Confiar em campos extras do payload do webhook — rejeitado, o payload é mínimo e não é a fonte de verdade dos dados de pagamento.

## 7. Validação de assinatura do webhook (`x-signature`)

**Decision**: Validar o header `x-signature` (e `x-request-id`) com HMAC-SHA256 usando `MERCADOPAGO_WEBHOOK_SECRET`, seguindo o algoritmo oficial do Mercado Pago (template `id:{data.id};request-id:{x-request-id};ts:{ts};`, comparado ao `v1` do header). Requisições sem assinatura válida recebem `401` e não são processadas.

**Rationale**: Sem isso, qualquer um que descubra a URL do webhook poderia forjar confirmações de pagamento. É a defesa contra esse cenário, documentada oficialmente pelo Mercado Pago.

**Alternatives considered**: Confiar apenas na consulta subsequente à API (sem validar assinatura) — mais fraco, permitiria acionar consultas arbitrárias/possível abuso do endpoint; validar assinatura é barato e a prática recomendada.

## 8. Resposta e idempotência do webhook

**Decision**: O endpoint responde `200` sempre que processa a notificação com sucesso (mesmo que o pagamento não mude nada relevante) e `500` apenas em falha transitória (ex: MongoDB indisponível), para o Mercado Pago reenviar automaticamente. A atualização do pedido é sempre condicional (`status pago` só é setado se ainda não estiver `"pago"`; a tentativa é localizada por `referenciaExterna` e atualizada por posição), então reenvios da mesma notificação não duplicam efeito (FR-005).

**Rationale**: Atende a orientação oficial do Mercado Pago (responder rápido, buscar detalhes depois) e a exigência de idempotência do spec (FR-005, SC-003).

## 9. Uma tentativa ativa por vez (evitar cobrança dupla em abas simultâneas)

**Decision**: Antes de criar uma nova tentativa de pagamento, o backend verifica se já existe uma tentativa da mesma modalidade com status `"pendente"` registrada recentemente (poucos minutos) para aquele pedido; se sim, rejeita a nova tentativa com erro claro em vez de chamar o Mercado Pago de novo.

**Rationale**: Cobre o edge case de duas abas tentando pagar o mesmo pedido ao mesmo tempo — sem isso, seria possível gerar duas cobranças aprovadas para o mesmo pedido.

**Alternatives considered**: Nenhum controle (aceitar múltiplas tentativas concorrentes) — rejeitado, risco real de cobrança duplicada.

## 10. Teste do webhook em desenvolvimento (ngrok)

**Decision**: Em dev, expor `http://localhost:3000` via ngrok e cadastrar a URL pública (`https://<subdomínio>.ngrok-free.app/api/pagamentos/webhook`) no painel do Mercado Pago (Suas integrações → aplicação de teste → Webhooks), junto com o evento "Pagamentos", para obter o `MERCADOPAGO_WEBHOOK_SECRET` de teste.

**Rationale**: Decisão já tomada pelo usuário. Nota prática: no plano gratuito do ngrok a URL muda a cada reinício do túnel — é preciso reatualizar a URL cadastrada no painel do MP sempre que o túnel for reiniciado, durante o desenvolvimento.

## 11. Abatimento de estoque

**Decision**: Nenhuma alteração de estoque nesta tarefa, incluindo no caminho "pagamento aprovado". Fica inteiramente em EDI-78 (Tarefa 5), que também cobre a sincronização com Shopee/Mercado Livre.

**Rationale**: Decisão explícita do usuário (confirmada antes do `/speckit-specify`), já registrada como observação em EDI-78 sobre a lacuna de vendas nascidas fora do site.
