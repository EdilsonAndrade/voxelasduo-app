# Quickstart / Test Guide: Preço por canal com piso de margem e promoções elegíveis

1. Acesse `/admin/configuracoes`; confira o novo campo "Margem mínima aceitável (%)" (padrão 15%), altere e salve.
2. Abra um produto qualquer (com custo de produção preenchido); confira que cada canal (ML, Shopee, site) mostra, além do preço sugerido de sempre, "Preço mínimo" e "Desconto máximo (R$/%)" condizentes com a margem salva.
3. No produto, sobrescreva a margem mínima só dele (ex.: 25%); confira que o preço mínimo/desconto máximo mudam só nesse produto — outro produto continua usando os 15% globais.
4. Preencha preços diferentes por canal (site R$45, ML R$50, Shopee R$55) num produto já publicado no ML; salve; confira que a comissão/preço mínimo do ML passam a usar R$50 (não mais o preço do site), e que o anúncio no Mercado Livre é atualizado com R$50 (conferir no painel do Mercado Livre ou via `GET /items/{id}` com o token do app).
5. Num produto já publicado no ML, abra a seção de promoções elegíveis; confira que cada promoção retornada mostra "vale a pena" (com lucro estimado) ou "fura a margem mínima".
6. Num produto ainda não publicado no ML, confira que a seção de promoções não aparece (sem erro).
7. Abra a aba Network, force uma falha na consulta de promoções (ex.: revogue temporariamente a credencial do Mercado Livre) e confirme que o preço mínimo/desconto máximo continuam funcionando, com um aviso específico na seção de promoções e o status real do erro visível na requisição.
8. Rode `npx vitest run lib/produtos lib/configuracoes lib/estoque/canais/mercadoLivre/promocoes.test.ts app/api/produtos app/api/admin/configuracoes`.
