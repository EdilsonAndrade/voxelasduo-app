# Data Model: Autenticação e painel do comprador (cliente)

## Cliente (nova coleção `clientes`)

```ts
export const CLIENTES_COLLECTION = "clientes";

export interface Cliente {
  _id?: ObjectId;
  nome: string;
  /** Identificador de login; sempre normalizado em minúsculas antes de gravar/comparar. */
  email: string;
  /** Presente somente quando o cliente tem login por e-mail/senha (hash bcrypt). */
  senhaHash?: string;
  /** Presente somente quando o cliente já autenticou via Google ao menos uma vez. */
  googleId?: string;
  telefone?: string;
  endereco?: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
  };
  /** Presente apenas durante um fluxo de recuperação de senha em andamento. */
  recuperacaoSenha?: {
    codigoHash: string;
    expiraEm: Date;
  };
  /**
   * [Atualizado após implementação] Login por e-mail/senha exige confirmar
   * posse do e-mail antes de liberar acesso — contas via Google já nascem
   * verificadas (o Google já provou a posse do e-mail).
   */
  emailVerificado: boolean;
  /** Presente apenas durante o cadastro, até o código de verificação ser confirmado (10 min). */
  verificacaoEmail?: {
    codigoHash: string;
    expiraEm: Date;
  };
  criadoEm: Date;
  atualizadoEm: Date;
}
```

**Índices**: único em `email` (chave de unificação entre e-mail/senha e Google — Decisão 2 do research.md).

**Validação**:
- `email` obrigatório, normalizado em minúsculas antes de qualquer gravação/comparação.
- Ao menos um de `senhaHash` ou `googleId` deve estar presente (um cliente sempre tem pelo menos um método de login).
- `recuperacaoSenha.expiraEm` no passado ⇒ código tratado como inválido mesmo sem job de limpeza (checagem na hora de validar, não na gravação).

**Relacionamentos**: um `Cliente` pode estar associado a múltiplos `Pedido` (via `Pedido.clienteId` e, para pedidos ainda não associados, por correspondência de `Pedido.cliente.email`).

## Pedido (extensão do modelo existente — `lib/models/pedido.ts`)

Mudanças sobre o modelo já existente (Tarefas 3-8):

```ts
export type StatusPedido = "pendente" | "pago" | "em_producao" | "enviado" | "entregue" | "cancelado";
export const STATUS_PEDIDO: StatusPedido[] = ["pendente", "pago", "em_producao", "enviado", "entregue", "cancelado"];

export interface Pedido {
  // ...campos existentes inalterados (itens, cliente, status, canalOrigem, valorTotal, pagamento, idempotencia, origemExterna, criadoEm, atualizadoEm)

  /** NOVO — presente quando o pedido foi finalizado por um cliente autenticado no site. */
  clienteId?: ObjectId;

  /** NOVO — dados de rastreio, quando disponíveis (preenchido manualmente pelo admin ou por integração futura). */
  rastreio?: {
    codigo: string;
    transportadora: string;
  };
}
```

**Índices (novos)**: `{ "cliente.email": 1 }` — suporta a query de "Meus Pedidos" (correspondência de pedidos ainda não associados, Decisão 5 do research.md) e `{ clienteId: 1 }`.

**Regras**:
- `clienteId` é gravado somente na criação do pedido (checkout autenticado); nunca retroativamente por um job — a exibição em "Meus Pedidos" cobre o caso retroativo via `cliente.email` (ver query abaixo).
- `rastreio` é opcional; quando ausente, a UI de "Meus Pedidos" simplesmente não exibe a seção de rastreio para aquele pedido (spec.md, User Story 3, Acceptance Scenario 2).

**Query de "Meus Pedidos"** (não é um índice, é o filtro usado pela consulta):

```ts
{
  $or: [
    { clienteId: cliente._id },
    { clienteId: { $exists: false }, "cliente.email": cliente.email }, // email já normalizado em minúsculas
  ],
}
```

## Relação entre entidades

```
Cliente 1 ──< N Pedido   (via Pedido.clienteId, quando presente)
Cliente 1 ──< N Pedido   (via correspondência Pedido.cliente.email == Cliente.email, quando Pedido.clienteId ausente)
```

- **Endereço atual**: `Cliente.endereco` (editável em "Meus Dados").
- **Histórico de endereços**: não persistido separadamente — derivado em tempo de leitura como o conjunto de `endereco` distintos entre todos os `Pedido.cliente.endereco` associados ao cliente (pela regra acima), incluindo o `Cliente.endereco` atual.
