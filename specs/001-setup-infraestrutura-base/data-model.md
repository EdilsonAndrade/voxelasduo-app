# Data Model: Setup do Projeto e Infraestrutura Base

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Modelagem inicial das duas coleções MongoDB que servem de fonte única de verdade para o e-commerce (épico EDI-73). Os campos aqui cobrem o mínimo pedido pela EDI-74; campos adicionais (ex.: referências de sincronização com Shopee/Mercado Livre, dados de pagamento do Mercado Pago) serão adicionados pelas tarefas correspondentes sem exigir migração — os documentos MongoDB são schemaless por natureza, então isso é apenas extensão do tipo TypeScript e validação de aplicação.

## Coleção `produtos`

Representa um item do catálogo à venda.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `_id` | ObjectId | auto | Identificador único gerado pelo MongoDB |
| `nome` | string | sim | Nome do produto |
| `descricao` | string | sim | Descrição do produto |
| `preco` | number (centavos, inteiro) | sim | Preço de venda; armazenado em centavos para evitar erros de ponto flutuante |
| `fotos` | string[] (URLs) | sim (mín. 1) | URLs das imagens do produto |
| `estoque` | number (inteiro, ≥ 0) | sim | Quantidade disponível em estoque |
| `categoria` | string | sim | Categoria do produto, usada em filtros de busca (Tarefa 2) |
| `criadoEm` | Date | sim (auto) | Data de criação do registro |
| `atualizadoEm` | Date | sim (auto) | Data da última atualização |

**Validações desta tarefa**:
- `preco` e `estoque` não podem ser negativos.
- `fotos` deve conter ao menos uma URL.

**Reservado para tarefas futuras** (não implementar agora, apenas deixar espaço no tipo): identificadores de anúncio na Shopee/Mercado Livre (Tarefas 6-7), histórico de sincronização de estoque (Tarefa 5).

## Coleção `pedidos`

Representa uma venda realizada, seja pelo site ou por um canal externo.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `_id` | ObjectId | auto | Identificador único gerado pelo MongoDB |
| `itens` | Array<{ produtoId: ObjectId, quantidade: number, precoUnitario: number }> | sim (mín. 1 item) | Itens comprados, com preço capturado no momento da compra |
| `cliente` | { nome: string, email: string, telefone?: string, endereco: object } | sim | Dados do cliente e endereço de entrega |
| `status` | enum: `pendente` \| `pago` \| `enviado` \| `cancelado` | sim | Status atual do pedido |
| `canalOrigem` | enum: `site` \| `shopee` \| `mercado_livre` | sim | Canal onde a venda ocorreu |
| `valorTotal` | number (centavos, inteiro) | sim | Valor total do pedido |
| `pagamento` | { metodo?: string, status?: string, referenciaExterna?: string } | sim (objeto, campos internos opcionais nesta tarefa) | Dados de pagamento; detalhados na Tarefa 4 (integração Mercado Pago) |
| `criadoEm` | Date | sim (auto) | Data de criação do pedido |
| `atualizadoEm` | Date | sim (auto) | Data da última atualização de status |

**Validações desta tarefa**:
- `itens` deve conter ao menos um item.
- `valorTotal` não pode ser negativo.
- `status` e `canalOrigem` restritos aos valores do enum.

**State transitions** (referência para as tarefas de pagamento e painel administrativo):

```text
pendente → pago → enviado
pendente → cancelado
pago → cancelado (ex.: estorno)
```

**Reservado para tarefas futuras**: detalhamento completo do objeto `pagamento` (Tarefa 4), campos de rastreio de sincronização de estoque (Tarefa 5).

## Relacionamento

`pedidos.itens[].produtoId` referencia `produtos._id`. Não há necessidade de transações multi-documento nesta tarefa (sem abatimento de estoque ainda — isso é escopo da Tarefa 5).
