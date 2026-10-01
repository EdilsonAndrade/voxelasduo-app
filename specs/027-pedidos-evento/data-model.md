# Data Model: Pedidos de evento

## usuarios (alterado)
| campo | tipo | regra |
|---|---|---|
| papel | `"admin" \| "equipe"` opcional | ausente = admin |
| usuario | string opcional | login curto, minúsculo, único quando presente (índice parcial) |

Os usuários da equipe têm `email = <usuario>@equipe.voxelasduo.local` (técnico, nunca exibido) e `nome` com a inicial maiúscula ("Malu").

## eventos (novo)
| campo | tipo | regra |
|---|---|---|
| _id | ObjectId | |
| nome | string | 2–60 caracteres, como digitado |
| nomeNormalizado | string | único; minúsculo, sem acento, espaços colapsados |
| criadoEm, ultimoUsoEm | Date | |

## pedidosEvento (novo)
| campo | tipo | regra |
|---|---|---|
| _id | string | UUID v4 gerado no aparelho (idempotência) |
| eventoId | ObjectId | |
| evento | string | nome do evento (desnormalizado para a lista e a busca) |
| cliente.nome | string | 2–60 caracteres |
| cliente.telefone | string | só dígitos, 10–11 |
| itens[] | array | 1–30 |
| itens[].id | string | UUID do item |
| itens[].descricao | string | 0–200 caracteres |
| itens[].quantidade | int | 1–999 |
| itens[].fotos | string[] | 0–3 URLs do Blob; o item precisa de descrição **ou** de foto |
| valorCentavos | int \| null | opcional, 0–10.000.000 |
| observacao | string | 0–500 caracteres |
| status | enum | `anotado`, `orcado`, `em_producao`, `pronto`, `entregue` |
| criadoPor / atualizadoPor | `{ id, nome }` | vêm da sessão, nunca do corpo |
| criadoEm | Date | quando foi anotado no aparelho (do corpo, limitado a ≤ agora) |
| atualizadoEm | Date | servidor |
| recebidoEm | Date | servidor, no primeiro upsert |

**Índices**: `{ criadoEm: -1 }`, `{ "cliente.telefone": 1 }`, `{ eventoId: 1, criadoEm: -1 }`.

**Status**: qualquer valor pode ir para qualquer outro (controle interno livre), começando em `anotado`.

## tentativasLogin (novo)
| campo | tipo |
|---|---|
| chave | string (único) |
| falhas | int |
| janelaInicio | Date (índice TTL de 1 dia) |

## IndexedDB `voxelas-evento` (aparelho)
- `fila` (key `id`): `{ id, pedido: PedidoEventoPayload, fotos: { chave, itemId, blob?, url? }[], estado: "pendente"|"erro", erro?, criadoEm }`
- `rascunho` (key `"atual"`): estado do formulário, com os blobs das fotos.
- `cache` (key livre): `ultimoEvento`, `pedidos` (última lista do servidor), `eventos`.
