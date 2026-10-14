# Contratos

## Página `GET /admin/produtos/calculadora/imprimir?ids=<id>,<id>…`
- Protegida pelo login do painel (mesmo layout).
- `ids` vazio ou ausente → mensagem "Nenhum cálculo marcado" com link de volta.
- Ids inválidos/inexistentes → ignorados; aviso "N cálculo(s) não encontrado(s)".
- Máximo 60 ids.

## Duplicar (rota existente)
`POST /api/admin/calculos-preco` — corpo igual ao de salvar, sem `produtoId`. 201 `{ calculo }`; 400 `{ erro }` mostrado na tela com o status.
