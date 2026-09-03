# Data Model: Catálogo de Produtos (CRUD)

## Produto

Coleção MongoDB: `produtos` (já existente desde a Tarefa 1, `lib/models/produto.ts`).

| Campo | Tipo | Obrigatório | Regras | Origem |
|---|---|---|---|---|
| `_id` | ObjectId | gerado | — | MongoDB |
| `nome` | string | sim | não vazio, máx. 120 caracteres | já existente |
| `slug` | string | sim | gerado a partir do `nome`; único dentro da mesma `categoria`; minúsculas, sem acentos, hífen no lugar de espaço | **novo** (FR-007, site-architecture.md) |
| `descricao` | string | sim | não vazio | já existente |
| `preco` | number | sim | inteiro > 0, em centavos (evita erro de ponto flutuante) | já existente |
| `fotos` | string[] | sim | ao menos 1 URL; ordem da lista define a ordem de exibição (índice 0 = foto principal) | já existente |
| `estoque` | number | sim | inteiro >= 0 | já existente |
| `categoria` | string | sim | não vazio; texto livre definido pelo admin (FR-013) | já existente |
| `criadoEm` | Date | gerado | definido na criação, imutável | já existente |
| `atualizadoEm` | Date | gerado | atualizado a cada PATCH | já existente |

### Regras de validação (FR-002, FR-003)

- `nome`, `descricao`, `categoria`: obrigatórios, não podem ser string vazia/whitespace.
- `preco`: deve ser um número inteiro maior que zero (rejeitar zero, negativo ou não-inteiro).
- `estoque`: deve ser um número inteiro maior ou igual a zero.
- `fotos`: deve conter ao menos 1 item após o upload; cada item é validado no momento do upload (formato de imagem — JPEG/PNG/WebP — e tamanho máximo de 5MB por arquivo).

### Estados e transições

- **Criação**: todos os campos obrigatórios presentes e válidos → documento criado com `criadoEm` = `atualizadoEm` = agora.
- **Edição**: qualquer subconjunto de campos pode ser atualizado via PATCH; `atualizadoEm` sempre atualizado; `slug` só é regenerado se o `nome` mudar (e a unicidade é reverificada).
- **Remoção**: exclusão física do documento (sem soft-delete nesta tarefa — não há requisito de histórico/auditoria no ticket). As fotos associadas no Vercel Blob também devem ser removidas para não deixar arquivos órfãos.
- **Sem estoque**: `estoque === 0` não é um estado separado no banco — é apenas uma condição verificada na exibição (FR-008), o produto continua existindo e visível, apenas marcado como indisponível.

### Relacionamentos

- **Categoria**: não é uma coleção própria nesta tarefa — é derivada dinamicamente com `distinct("categoria")` sobre `produtos`. Uma categoria "existe" para fins de navegação pública apenas enquanto houver ao menos um produto com aquele valor (FR-013).
- **Foto de Produto**: não é uma coleção própria — é um array de strings (URLs) dentro do próprio documento `Produto`, mantendo o CRUD simples para o volume esperado (dezenas de produtos, poucas fotos cada).

### Índices (MongoDB)

- Índice composto único em `{ categoria: 1, slug: 1 }` — garante unicidade do slug dentro da categoria e acelera a busca por detalhe do produto (`/produtos/[categoria]/[slug]`).
- Índice em `{ categoria: 1 }` — acelera o filtro por categoria na listagem pública.

## Contrato de payload da API (visão geral, ver `contracts/`)

- **Criação/edição** recebem o produto sem `_id`, `slug`, `criadoEm`, `atualizadoEm` (gerados pelo servidor) e sem transformar `fotos` diretamente — fotos são enviadas antes via `/api/produtos/upload` e suas URLs retornadas são incluídas no payload de criação/edição do produto.
