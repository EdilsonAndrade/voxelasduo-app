# Data Model: Tempo de Impressão

## Coleção `planosImpressao`

| Campo | Tipo | Regras |
|---|---|---|
| `_id` | ObjectId | |
| `produtoId` | string | id de um produto existente; índice único |
| `itens` | ItemImpressao[] | 1..50 itens |
| `criadoEm` | Date | |
| `atualizadoEm` | Date | |

### ItemImpressao (embutido)

| Campo | Tipo | Regras |
|---|---|---|
| `id` | string | gerado (uuid); estável entre edições |
| `nome` | string | obrigatório, trim, até 120 caracteres; único no plano (case-insensitive) |
| `minutos` | number | inteiro > 0, até 14 dias (20160) |
| `inicio` | string? | `"HH:MM"` 00:00–23:59; ausente = sem planejamento |

A ordem do array é a ordem de exibição.

## Derivados (não gravados)

- `totalMinutos` = soma de `minutos`.
- `termino` = `terminoPrevisto(inicio, minutos)` → `{ horario: "HH:MM", diasDepois }`.
- `produtoNome` vem do produto na listagem.

## Mescla (importação)

Para cada item recebido: se existe item com o mesmo nome normalizado (`trim().toLocaleLowerCase()`), atualiza `minutos` e mantém `id`/`inicio`; senão acrescenta ao fim. Itens não recebidos permanecem.
