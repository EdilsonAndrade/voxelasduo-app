# Contratos

## Página `GET /admin/produtos/lista-precos?ids=<id1>,<id2>,...`
- Protegida pelo proxy (só admin; papel `equipe` não acessa).
- `ids` ausente/vazio ou nenhum id válido: mostra aviso "Nenhum produto selecionado" e link de volta.
- Ids inexistentes são ignorados.
- Saída: título "Lista de preços", data de geração, tabela Produto | Preço (preço do site), ordem alfabética pt-BR, botão "Imprimir / salvar PDF" (não impresso).

## `PATCH /api/produtos/[id]` (existente, sem mudança)
Requisição enviada pela linha:
```json
{ "preco": 4990, "precosCanais": { "mercadoLivre": 5990, "shopee": 5490 } }
```
- `mercadoLivre` omitido = ML usa o preço do site.
- `shopee` reenviado com o valor atual (se houver) para não ser apagado.

Respostas:
- `200 { produto }` → linha marca "Salvo" e os valores viram o novo original.
- `400 { erro, campos }` → mensagem de `campos.preco` / `campos.precosCanais` na linha.
- `404 { erro }` / outros → `erro` ou `Erro <status>.` na linha; valores digitados mantidos.
