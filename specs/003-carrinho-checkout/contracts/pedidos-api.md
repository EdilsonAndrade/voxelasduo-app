# Contrato: API de Pedidos (Checkout)

Base path: `/api/pedidos`. Todas as respostas em JSON. Estende o esqueleto criado na Tarefa 1 (`app/api/pedidos/route.ts`, atualmente só `GET` simples).

## `GET /api/pedidos`

Mantém o esqueleto da Tarefa 1 (lista pedidos sem regra de negócio). A listagem administrativa completa é escopo de EDI-81 — sem mudanças nesta tarefa.

## `POST /api/pedidos`

Cria um pedido com status `"pendente"` a partir do checkout. Usado pelo formulário `/checkout`.

**Body**:
```json
{
  "idempotencia": "9f2c6...",
  "cliente": {
    "nome": "Maria Silva",
    "email": "maria@exemplo.com",
    "telefone": "11999998888",
    "endereco": {
      "logradouro": "Rua das Flores",
      "numero": "123",
      "complemento": "Apto 4B",
      "bairro": "Centro",
      "cidade": "São Paulo",
      "estado": "SP",
      "cep": "01001000"
    }
  },
  "itens": [
    { "produtoId": "665f1...", "quantidade": 2 }
  ]
}
```

Regras (todas no servidor):

- O cliente NUNCA envia preço — `precoUnitario` de cada item é lido do banco no momento da confirmação e `valorTotal` é recalculado (FR-010, SC-003).
- Estoque validado por `produtoId` único: produto deve existir e `Σ quantidades ≤ estoque` (FR-009).
- `telefone` e `endereco.complemento` são opcionais; todos os demais campos são obrigatórios.
- `status` = `"pendente"`, `canalOrigem` = `"site"`, `pagamento` vazio.

**Respostas**:

- `201`: pedido criado:
  ```json
  {
    "pedido": {
      "id": "674b2...",
      "status": "pendente",
      "valorTotal": 9980,
      "itens": [
        { "produtoId": "665f1...", "nome": "Vaso Voronoi", "quantidade": 2, "precoUnitario": 4990 }
      ],
      "cliente": { "nome": "Maria Silva", "email": "maria@exemplo.com", "endereco": { "..." : "..." } },
      "criadoEm": "2026-09-03T..."
    }
  }
  ```
  (inclui `nome` do produto em cada item para exibição no resumo/confirmação sem novas consultas.)
- `200`: idempotência — requisição repetida com a mesma `idempotencia` retorna o pedido já criado anteriormente (FR-013), com o mesmo corpo do `201`.
- `400`: payload inválido — campos ausentes/inválidos (nome, email em formato inválido, endereço incompleto, carrinho vazio) com `{ "erro": "...", "campos": { ... } }` por campo (FR-006, FR-007, FR-014).
- `409`: estoque insuficiente ou produto indisponível — `{ "erro": "...", "itens": [{ "produtoId": "...", "nome": "...", "quantidadeDisponivel": 1 }] }` (FR-009, SC-002).

## Páginas públicas (Server Components — sem contrato JSON, listadas por completude)

- `GET /carrinho` — itens do carrinho (estado local do navegador; página client-side).
- `GET /checkout` — formulário + resumo; redireciona para `/carrinho` se o carrinho estiver vazio (FR-014).
- `GET /pedido/[id]` — confirmação: lê o pedido direto do banco via repositório (sem rota de API dedicada nesta tarefa); renderiza "não encontrado" se o id não existir.
