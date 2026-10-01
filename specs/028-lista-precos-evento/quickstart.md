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

## Ajuste do evento (US4)
11. Marque 3 produtos (um com preço próprio no ML), digite `30` em **Comissão** → **Aplicar nos marcados**. Preços viram preço ÷ 0,70 terminando em ,90 (R$ 100,00 → R$ 142,90); linhas "não salvo"; campo trava até **Salvar todos** ou **Descartar ajuste**.
12. **Salvar todos os alterados** → cada linha "Salvo"; aparece "Ajuste do evento ativo em 3 produtos (30%)". Network: `POST /api/produtos/<id>/ajuste-evento` → 200.
13. Marque um dos ajustados e aplique de novo → é pulado com aviso.
14. **Restaurar preços anteriores** → confirmar → preços exatos de antes; Network: `DELETE ...ajuste-evento` → 200.
15. Banco: `db.produtos.find({ ajusteEvento: { $exists: true } }, { nome: 1, preco: 1, ajusteEvento: 1 })` (vazio após restaurar).
