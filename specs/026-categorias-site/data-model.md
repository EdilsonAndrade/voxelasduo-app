# Data Model: Cadastro de categorias do site (EDI-123)

## Categoria (`categorias`, nova)
| Campo | Tipo | Regras |
|---|---|---|
| `_id` | ObjectId | |
| `nome` | string | obrigatório, trim, 1–60 caracteres; `gerarSlug(nome)` não pode ser vazio |
| `slug` | string | `gerarSlug(nome)` na criação; **imutável**; índice único |
| `ordem` | number | ordem na vitrine/admin; novas categorias vão para o fim |
| `padrao` | boolean? | `true` só em "Diversos" (slug `diversos`): não pode ser removida |
| `aliases` | string[] | segmentos de URL antigos que redirecionam para esta categoria; índice |
| `criadoEm` / `atualizadoEm` | Date | |

**Seed** (ordem): Organizadores, Acessórios, Decoração, Presentes, Religioso, Diversos.

**Validação**
- Criar: rejeita (409) se `gerarSlug(nome)` já existe como `slug`. Se o slug estiver em `aliases` de outra categoria (ex.: categoria removida), o alias é retirado e a nova categoria assume o endereço.
- Renomear: rejeita (409) se o novo nome é equivalente ao de **outra** categoria. O slug não muda.
- Remover: 403 se `padrao`. Caso contrário, move os produtos para `diversos` (com redirecionamentos) e transfere `slug` e `aliases` para os `aliases` de Diversos.

## Produto (`produtos`, alterado)
- `categoria: string` passa a conter o **slug** de uma Categoria existente. Ausente ou vazio no payload significa `diversos`.
- A validação do POST/PATCH rejeita (400) um slug que não existe em `categorias`.
- Índices existentes mantidos: `{categoria, slug}` único e `{categoria}`.

## RedirecionamentoProduto (`redirecionamentosProdutos`, nova)
| Campo | Tipo | Regras |
|---|---|---|
| `categoria` | string | segmento antigo, já decodificado |
| `slug` | string | slug antigo |
| `produtoId` | ObjectId | produto de destino |
| `criadoEm` | Date | |

- Índice único `{categoria, slug}`: gravado com upsert, e o mais recente vence.
- Não é gravado se `(categoria, slug)` antigo == novo.
- Na leitura, se o produto não existe mais, retorna 404 normal.
- Remoção de produto: remove os redirecionamentos dele (`deleteMany({produtoId})`).

## Transições
```
texto livre (legado) ──migração──▶ slug cadastrado  (+ alias na categoria, + redirecionamento por produto)
produto.categoria A ──troca──▶ B                    (+ redirecionamento (A, slug) → produto)
produto.slug s1 ──renomear produto──▶ s2            (+ redirecionamento (cat, s1) → produto)
categoria X ──remover──▶ produtos para diversos     (+ redirecionamentos; X.slug/aliases → diversos.aliases)
```
