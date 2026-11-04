# Quickstart / Teste manual

1. `npx vitest run lib/produtos lib/producao lib/kits`
2. **Tempo de Impressão**: num item com custo de ~R$ 58,46 e margem 25%, a Shopee mostra ~R$ 128,63 e "você ganha" ~R$ 32,16. Com margem vazia, o resultado é o mesmo (piso de 25%). Com 15%, aparece o aviso de abaixo da meta.
3. Ligue "Anúncio pago" com ROAS 8 e salve: o preço da Shopee sobe, aparece a linha do anúncio e o lucro continua sendo 25% do preço. Recarregue a página e confira que o toggle continua ligado.
4. **Produto**: abra um produto existente e confira que "Anúncio pago" está desligado e os preços são os mesmos de antes. Ligue com ROAS 8: Shopee e Mercado Livre mostram o anúncio, e o site próprio não. Salve e reabra.
5. **Calculadora**: um cálculo novo vem com "Anúncio pago" desligado. Ligado, abre em "Embutido no preço" com ROAS 8. Cálculos salvos antes abrem iguais.
6. Na aba Network, um PUT com `anuncio.roasMeta: 0` volta 400 com a mensagem.
