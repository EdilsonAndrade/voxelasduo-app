# Quickstart / Test Guide: Calculadora de preço multicanal

1. Acesse `/admin/configuracoes`, confira Shopee 14% e site próprio (padrões), altere e salve; recarregue e confirme que persistiu.
2. Acesse `/admin/produtos/novo`, preencha peso e tempo de impressão; no simulador veja o comparativo com ML, Shopee e site próprio (preço sugerido, taxa, lucro R$ e margem %).
3. Altere a margem desejada e confirme que os três preços mudam; informe uma taxa de falha de 10% e confirme que o custo e os preços sobem (custo ÷ 0,90).
4. Em "Taxas deste produto" sobrescreva a taxa da Shopee, salve, reabra o produto e confirme que o override reaparece; apague o override e confirme que volta ao padrão global.
5. Crie outro produto, clique em "Copiar custos de outro produto", escolha o anterior, ajuste um campo e salve; confirme que o produto de origem não mudou.
6. Rode `npx vitest run lib/produtos lib/configuracoes app/api/admin/configuracoes`.
