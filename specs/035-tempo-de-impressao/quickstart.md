# Quickstart: Tempo de Impressão

1. Admin → menu **Tempo de Impressão** (`/admin/tempo-impressao`).
2. Escolha um produto (publicado ou rascunho) → **Adicionar**.
3. Cadastre as partes (nome, horas, minutos) ou uma linha para o produto inteiro → **Salvar**. Veja o total.
4. Preencha **Início** numa linha (ex.: 22:00 numa parte de 10h02) → término `08:02 (dia seguinte)`. Salve e recarregue: continua lá.
5. Marque 2 linhas → **Remover selecionadas** → Salvar. **Remover do menu** tira o produto inteiro.
6. Admin → **Produção** → card de um produto → "Impressões e horários" → deixe marcadas as impressões desejadas → **Levar ao Tempo de Impressão**. Abra o menu: partes com o mesmo nome têm o tempo atualizado, as novas foram adicionadas.
7. **Gerar ficha (PDF)** → página em lista → **Imprimir / salvar PDF**.

Verificação no banco:

```js
db.planosImpressao.find({}, { produtoId: 1, itens: 1 })
```

Testes: `npm test -- agenda planosImpressao tempo-impressao`
