# Quickstart / Test Guide

1. `npm test` — testes puros (custo, canais, conversão v1→v2, G-code, orçamento).
2. Acesse `/admin/produtos/calculadora` (novo cálculo).
3. Em **Impressão**, arraste um `.gcode.3mf` do Bambu Studio: tempo, peças por mesa e filamentos são preenchidos. Na aba Network do navegador, confirme que **nenhuma** requisição foi feita com o arquivo.
4. Remova os filamentos da lista: o campo simples (peso e R$/kg) volta a valer.
5. Em **Custos extras**, clique em "+ Caixa de papelão" e "+ Mão de obra", preencha preços: o campo simples de embalagem fica desativado e as barras do Resumo mostram Embalagem e Mão de obra.
6. Em **Precificação**, troque para "Preço alvo", clique em "usar preço do concorrente" (após preencher o Concorrente) e veja margem, markup e "para ganhar X%, venda por R$ Y".
7. Em **Canal de venda**, na Venda direta escolha Crédito e Frete grátis com R$ 15: o card de taxas da aba Venda direta mostra 2,99% e o envio. Na Shopee, escolha CPF + mais de 450 pedidos e ligue Campanha de destaque: o card soma R$ 3,00 e a comissão extra.
8. Abra um cálculo salvo **antes** desta versão pela lista "Cálculos salvos": deve abrir sem erro, com mão de obra em Custos extras e o desgaste preenchido.
9. Salve, duplique, imprima orçamentos (`/admin/produtos/calculadora/imprimir`) e transforme em produto rascunho: tudo continua funcionando.
