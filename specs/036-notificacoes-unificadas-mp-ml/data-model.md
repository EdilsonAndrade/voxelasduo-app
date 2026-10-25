# Data Model: EDI-132

## Pedido (`pedidos`) — alteração

`pagamento.ultimaFalha?: FalhaPagamento` (opcional; pedidos antigos sem o campo)

```ts
type CodigoFalhaPagamento =
  | "pendente"                    // MP ainda aguardando (só admin/automática)
  | "recusado"
  | "expirado"
  | "sem_tentativa"               // pedido sem pagamento iniciado
  | "nao_encontrado"              // MP não conhece o id
  | "falha_consulta"              // erro de rede/MP/banco
  | "aprovado_pedido_cancelado";  // FR-016

interface FalhaPagamento {
  codigo: CodigoFalhaPagamento;
  mensagem: string;               // texto pt-BR exibido no admin
  origem: "notificacao" | "cliente" | "admin" | "automatica";
  em: Date;
}
```

Regras:
- Gravado por `registrarFalhaPagamento(pedidoId, falha)` (`$set`), sempre substituindo a anterior.
- Removido (`$unset`) quando o pedido é promovido a "pago".
- Nunca altera `status` do pedido.

## Promoção a "pago" — alteração

Filtro `{ _id, status: { $nin: ["pago", "cancelado"] } }` (antes `$ne: "pago"`).

## Notificação (não persistida)

```ts
type NotificacaoIdentificada =
  | { origem: "mercado_pago"; tipo: "payment"; id: string; formato: "webhook" | "ipn" }
  | { origem: "mercado_pago"; tipo: string; id: string | null; formato: "webhook" | "ipn" } // ignorado
  | { origem: "mercado_livre"; topico: TopicoML | "desconhecido"; resource: string; applicationId: string }
  | { origem: "desconhecida" };

type TopicoML = "pedidos" | "perguntas" | "reclamacoes" | "mensagens" | "envios";
```
