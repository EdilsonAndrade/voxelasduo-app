# Quickstart: Frete no checkout

1. `npm test` — testes de `lib/frete/*`, `lib/pedidos/validation`, `app/api/frete`, `app/api/admin/configuracoes/frete` e `app/api/pedidos`.
2. Admin › Taxas dos canais (`/admin/configuracoes`) › seção "Frete do site": deve mostrar PAC R$ 19,90 e SEDEX R$ 25,50. Altere o SEDEX para 28,00 e salve.
3. Loja: adicione um produto ao carrinho e abra `/checkout`. Devem aparecer PAC, SEDEX (R$ 28,00) e "Combinar com a loja" (Grátis). Troque a opção e confira o subtotal, o frete e o total.
4. Confirme o pedido com SEDEX. Em `/pedido/[id]`, o resumo mostra o frete e o pagamento é aberto com o total incluindo o frete.
5. Mongo: `db.pedidos.find({}, { frete: 1, valorTotal: 1 }).sort({ criadoEm: -1 }).limit(1)`.
6. Divergência: com o checkout aberto, altere o SEDEX no admin e confirme o pedido na aba antiga. A Network deve mostrar 409 `frete_divergente`, e o checkout exibe o novo valor.
