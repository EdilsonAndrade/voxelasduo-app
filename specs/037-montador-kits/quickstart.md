# Quickstart: Montador de kits

1. Acesse `/admin/kits` (menu **Kits**) e clique em **+ Novo kit**.
2. Dê o nome "Kit Natal Mesa". No campo de busca escolha dois produtos existentes; altere a quantidade de um para 2. Confira no totalizador a soma de preço, peso e tempo.
3. Em **Item novo**, informe "Rena 8 cm", 25 g, 1h30. Confira custo, preço sugerido e margem por canal; clique **Adicionar**.
4. Na coluna **Sugestão de preço**, veja as faixas 10/15/20% com margem de Site, Shopee e Mercado Livre. Escolha uma faixa liberada e clique **Salvar kit**.
5. Em `/admin/produtos`, confira "Rena 8 cm" como rascunho.
6. No kit, clique **Criar produto do kit** → abre a edição do produto com preço, peso e itens inclusos. Adicione foto e publique.
7. Volte ao kit e clique **Levar para a calculadora** → a calculadora abre no produto do kit.
8. Altere o preço de um componente em `/admin/produtos/<id>/editar`, reabra o kit: totalizador recalculado + aviso "Preço do kit desatualizado" (também na lista de kits).
9. Teste de erro: tente salvar um item novo com o nome de um produto existente → aviso e opção de usar o existente (Network: 409).

Consulta Mongo para conferir:

```js
db.kits.find({}, { nome: 1, precoCentavos: 1, produtoId: 1, "itens.produtoId": 1 })
db.produtos.find({ kitId: { $exists: true } }, { nome: 1, preco: 1, kitId: 1 })
```
