# Quickstart: Romaneios de consignação

1. Acesse `/admin/romaneios` (menu **Romaneios**) e clique em **+ Novo romaneio**.
2. Nome "Saída 31/10", data de hoje. No primeiro lugar, "Casa do amigo".
3. Na busca, digite parte do nome de um produto (etiqueta **Produto**) e de um item avulso do Tempo de Impressão (etiqueta **Tempo de impressão**); adicione com quantidades. Adicione um item livre. Confira subtotais e totais. **Salvar**.
4. **+ Lugar**: "Casa da sogra", levado por "irmão". Na linha de um item da "Casa do amigo", **Repassar** 2 peças para a sogra. Confira os subtotais por lugar e o modo **Tudo junto**.
5. **Imprimir** → inteiro e só "Casa da sogra"; "Salvar como PDF".
6. Na "Casa da sogra": informe 1 vendida e 1 devolvida, registre um pagamento parcial; confira vendido / pago / a receber; **Fechar acerto**.
7. Na "Casa do amigo": **Pago na hora** com Pix → tudo vendido, lugar acertado, romaneio acertado na lista.
8. Erro: informe vendida + devolvida maior que levada e salve → mensagem com o item (Network: 400).

```js
db.romaneios.find({}, { nome: 1, dataSaida: 1, "lugares.nome": 1, "lugares.status": 1 })
```
