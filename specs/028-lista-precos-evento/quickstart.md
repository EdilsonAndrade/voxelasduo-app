# Quickstart / Test Guide

1. `npm test` — testes de `lib/produtos/precoLista.ts`.
2. Acesse `/admin/produtos` logado como admin.
3. Confira a coluna **Custo**: compare um produto com o custo total da tela "editar" dele; produto sem custo mostra "—".
4. Altere o preço do site de um produto (ex: `59,90`) → a linha fica destacada → clique **Salvar** → "Salvo". Recarregue e confira.
5. Altere o preço do ML de dois produtos e salve só um; o outro continua destacado. Tente sair da página → o navegador avisa.
6. Digite `0` no preço do site e salve → erro na linha; aba Network mostra `400`.
7. Marque alguns produtos (ou "marcar todos") → **Gerar lista de preços (N)** → nova aba com os produtos em ordem alfabética, nome e preço.
8. Clique **Imprimir / salvar PDF** → no preview não aparecem menus, cabeçalho, rodapé nem botões; salve como PDF.
9. Repita os passos 4 e 7 no celular (ou DevTools 360px): sem rolagem horizontal.
10. Conferir no banco que a Shopee não foi apagada:
    ```js
    db.produtos.findOne({ nome: "<produto>" }, { preco: 1, precosCanais: 1 })
    ```
