# Research: Aviso de venda aguardando liberação para postagem (Mercado Livre)

## 1. Como o Mercado Livre sinaliza "aguardando liberação para postar"

- **Decision**: Tratar como "aguardando liberação" quando o envio (`GET /shipments/{id}`, já consultado pelo EDI-101) vem com `substatus === "buffered"` — o Mercado Livre chama isso de "etiqueta com data programada"/"buffering", usado para escalonar postagens quando a capacidade da transportadora está limitada (ex.: greve dos Correios). A data de liberação para impressão da etiqueta vem associada a esse substatus (campo de data ligado ao `buffered`, distinto do prazo final de despacho `estimated_handling_limit`).
- **Rationale**: É o mecanismo documentado pelo Mercado Livre para exatamente esse cenário (referenciado pela doc oficial e por integradores como Olist/Loja Integrada que lidam com o mesmo problema).
- **Alternatives considered**: Usar só `estimated_handling_limit` (prazo final de despacho) — rejeitado porque esse campo representa o prazo, não a data em que a etiqueta passa a poder ser emitida; são conceitos diferentes e o ticket pede especificamente "a partir de quando pode postar".
- **Nota de implementação**: A doc oficial do Mercado Livre bloqueou fetch automatizado durante esta pesquisa (mesma limitação já registrada em EDI-98/EDI-101) — o nome exato do campo de data dentro do objeto de `buffered` precisa ser confirmado contra um envio real nesse estado antes de considerar a Tarefa concluída (ver T0xx de validação em tasks.md).

## 2. Onde gravar a informação

- **Decision**: Campo novo e opcional em `Pedido`: `envioAguardandoLiberacaoAte?: Date`. Presente = mostra aviso; ausente/`null` = não mostra (FR-005).
- **Rationale**: É puramente informativo sobre o envio (FR-004 — não é o `status` do pedido), então não pertence ao enum `StatusPedido`; um campo próprio evita reabrir o mapeamento de status já fechado no EDI-101/research.md #2.
- **Alternatives considered**: Adicionar um novo valor a `StatusPedido` (ex.: `"aguardando_liberacao"`) — rejeitado: o pedido continua "pago" de fato (já foi vendido e pago), só o envio está represado; misturar isso no status do pedido complicaria o admin de pedidos (filtro por status, etc.) sem necessidade.

## 3. Quando limpar o campo

- **Decision**: Limpar (`undefined`) sempre que uma notificação `shipments` chegar com um substatus diferente de `buffered` para o mesmo envio — inclui tanto o caso de liberação normal (segue para `shipped`) quanto qualquer outra mudança de substatus.
- **Rationale**: Mesma lógica de "a notificação mais nova reflete o estado real" já adotada no EDI-101 (research.md #4 de lá) — sem necessidade de um evento dedicado de "liberação".
- **Alternatives considered**: Nenhuma.

## 4. Data no passado

- **Decision**: Se a data de liberação capturada já passou (edge case do spec.md) e o envio segue em `buffered`, exibir o aviso sem repetir uma data futura enganosa — texto genérico "aguardando liberação para postagem" em vez de "libera em DD/MM" com data passada.
- **Rationale**: Evita um aviso que pareça um bug (data no passado, mas o pedido segue represado); decisão de apresentação, sem lógica nova no backend (a UI decide como formatar com base na data já armazenada).
- **Alternatives considered**: Nenhuma — é só uma regra de formatação na UI.
