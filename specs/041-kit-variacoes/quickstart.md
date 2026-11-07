# Quickstart: Produto com variações de kit

1. Admin → Produtos → editar (ou criar) "Centro de Mesa de Natal" com as fotos da Shopee.
2. Em **Variações de kit**, adicione:
   - "Kit 3 peças": Árvore, Papai Noel, Rena · embalagem R$ 5,00 · site R$ 55,93 · Shopee R$ 79,90 · estoque 10 · foto do Kit 3
   - "Kit 4 peças": + Boneco de neve · site R$ 69,93 · Shopee R$ 99,90
   - "Kit Completo": + Bandeja · site R$ 79,73 · Shopee R$ 113,90
   Confira custo e margem de cada uma e clique **Salvar variações**. O preço do produto vira R$ 55,93 e o estoque, 30.
3. Clique em **Calcular** no Kit 3 → a calculadora abre com o mesmo custo. Ajuste e clique **Aplicar na variação**.
4. Loja → página do produto: escolha "Kit 4" → preço R$ 69,93 e foto do Kit 4. Adicione ao carrinho, adicione também o "Kit 3" → duas linhas.
5. Finalize a compra → no admin, o pedido mostra "Centro de Mesa de Natal — Kit 4 peças". Após o pagamento, o estoque do Kit 4 cai 1 e o total do produto também.
6. Erro: envie `PUT /api/produtos/<id>/variacoes` com nome vazio → 400 visível na Network.

```js
db.produtos.find({ "variacoes.0": { $exists: true } }, { nome: 1, preco: 1, estoque: 1, "variacoes.nome": 1, "variacoes.estoque": 1 })
db.pedidos.find({ "itens.variacaoId": { $exists: true } }, { numero: 1, itens: 1 })
db.calculosPreco.find({ variacaoId: { $exists: true } }, { nome: 1, produtoId: 1, variacaoId: 1 })
```
