# Quickstart / Test Guide: Categorias do site (EDI-123)

1. Simule a migração: `npx tsx scripts/migrar-categorias.ts --dry-run`. Confira o relatório (ex.: `acessorios → Acessórios: N`, `acessórios → Acessórios: M`).
2. Execute a migração: `npm run migrar:categorias`. Rode de novo e confira que nada muda (0 produtos movidos).
3. Acesse `/produtos` e confira que "Acessórios" aparece uma única vez e que as categorias sem produto não aparecem.
4. Acesse o endereço antigo `/produtos/acessórios` → redireciona para `/produtos/acessorios`.
5. No admin, acesse **Categorias**: crie "Natal", tente criar "natal" (erro 409 na aba Network), renomeie para "Natalinos" e reordene.
6. Em **Produtos**, abra o seletor de categoria de uma linha, digite "rel" e selecione **Religioso**. Aparece a confirmação.
7. Acesse o endereço antigo daquele produto → redireciona para `/produtos/religioso/<slug>`.
8. Crie um produto sem escolher categoria → ele aparece em **Diversos**.
9. Remova a categoria "Natalinos" com um produto nela. A confirmação informa "1 produto será movido para Diversos". O produto vai para Diversos, e `/produtos/natalinos` redireciona para `/produtos/diversos`.
10. Tente remover **Diversos** → a ação não está disponível (a API retorna 403).
11. Consulta de conferência no MongoDB:
```js
db.categorias.find({}, {nome:1, slug:1, ordem:1, aliases:1}).sort({ordem:1})
db.produtos.aggregate([{ $group: { _id: "$categoria", total: { $sum: 1 } } }])
db.redirecionamentosProdutos.find().limit(10)
```
12. Feed do Facebook: `curl -s http://localhost:3000/api/feeds/meta | head`. O `link` usa o slug novo e o `product_type` usa o nome da categoria.
