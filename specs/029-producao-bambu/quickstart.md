# Quickstart — Controle de produção com o histórico da Bambu Lab (EDI-127)

Guia de validação manual. O usuário sobe a aplicação; o agente não inicia container nem navegador (regra 8 do CLAUDE.md).

## Pré-requisitos

- Conta da Bambu Lab com histórico de impressão (a A1 já usada).
- `CRON_SECRET` definido no `.env.local` (já existe, usado pelos crons de estoque e avaliações).
- Pelo menos um produto cadastrado com `custoProducao` preenchido (peso, tempo, carretel, impressora, energia, mão de obra, embalagem) — é o que o apurado vai confrontar.

## 1. Conectar a conta

1. Acesse `/admin/producao`.
2. Em **Conexão**, informe e-mail e senha da Bambu Lab e clique em **Conectar**.
3. Se a conta tiver verificação em duas etapas, o campo de código aparece: pegue o código de 6 dígitos no e-mail e confirme.
4. A tela deve passar a mostrar **Conexão ativa** com a data de expiração (~3 meses).

**Alternativa de emergência**: se o login falhar do lado do fabricante, use **Colar token** e informe o `accessToken` obtido no navegador logado em bambulab.com.

Conferir no banco (o token não deve aparecer em nenhuma resposta HTTP):

```js
db.credenciaisCanais.findOne({ _id: "bambu_lab" }, { accessToken: 0 })
// ativadoEm define o que é histórico: impressão terminada antes disso nunca
// oferece lançamento de estoque
```

## 2. Importar o histórico

1. Clique em **Importar agora**.
2. A tela mostra quantas impressões entraram e quantas foram ignoradas.
3. Compare com o histórico do aplicativo Bambu Handy: mesma quantidade, mesmos pesos e horários (SC-002).
4. Clique em **Importar agora** novamente: o resultado deve ser `novas: 0` (SC-003).

```js
db.impressoes.countDocuments()
db.impressoes.find().sort({ inicio: -1 }).limit(3)
db.impressoes.countDocuments({ historico: true })   // todas as anteriores à ativação
```

Testar o cron como a Vercel o chama:

```bash
curl -i -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/producao/importar
curl -i http://localhost:3000/api/producao/importar      # deve responder 401
```

## 3. Mapear um produto de peça única

1. Na seção **Impressões sem produto**, escolha um nome de arquivo.
2. Selecione o produto, mantenha a parte como **Peça única** e informe quantas peças saíram na placa (ex: `6`).
3. Salve. Todas as impressões daquele nome — inclusive as antigas — devem passar a exibir o produto (FR-016).

```js
db.vinculosProducao.find({ nomeArquivo: "<nome>" })
```

## 4. Mapear um produto multipartes

1. Escolha dois nomes de arquivo do mesmo produto (ex: `vaso_base_v2` e `vaso_tampa_v2`).
2. Mapeie o primeiro como parte **Base**, rendimento `6`, `1` por produto.
3. Mapeie o segundo como parte **Tampa**, rendimento `2`, `1` por produto.
4. Na visão por produto, confira:
   - `unidadesAcabadas` limitado pela parte mais escassa (FR-022);
   - o excedente da outra parte aparece como produção adiantada, não como produto pronto;
   - o custo apurado é a soma das partes **com embalagem e mão de obra contadas uma única vez** (research #4).
5. Remova o vínculo da tampa e confira que o custo passa a ser exibido como **parcial**, nomeando a parte sem dados (FR-023).

## 5. Conferir custo apurado vs cadastrado

1. Abra a visão por produto.
2. Confira gramas/peça, horas/peça, custo apurado, custo cadastrado e a diferença.
3. **Antes de aplicar**, anote o custo cadastrado:

```js
db.produtos.findOne({ _id: ObjectId("<id>") }, { nome: 1, custoProducao: 1 })
```

4. Rode uma importação e confira que `custoProducao` **não mudou** (SC-006/FR-028).
5. Clique em **Aplicar ao cadastro** e confira que agora mudou, e só os campos apurados.

## 6. Lançar no estoque

1. Anote o estoque atual do produto:

```js
db.produtos.findOne({ _id: ObjectId("<id>") }, { nome: 1, estoque: 1 })
```

2. Numa impressão concluída, **não histórica** e mapeada, clique em **Lançar no estoque**. A quantidade sugerida deve ser o rendimento (ex: `6`).
3. Confirme `4` com perda `0`.
4. Confira: estoque subiu exatamente `4`; a linha mostra `lançado 4 de 6`.
5. Tente lançar `3` na mesma impressão → recusado com `409` e a mensagem de saldo (SC-012).
6. Lance `1` com perda `1` → aceito. O estoque sobe só `1`, a linha passa a `lançado 5 de 6` com `1 perdida` e o saldo zera (FR-033/FR-035).
7. Tente lançar `1` novamente → recusado com `409`.
8. Numa impressão **histórica**, a ação de lançar não deve aparecer (FR-038).

```js
db.lancamentosProducao.find().sort({ criadoEm: -1 }).limit(2)
db.sincronizacoesEstoque.find().sort({ criadoEm: -1 }).limit(3)   // propagação aos canais
```

9. Rode uma importação e confira que **nenhum** estoque mudou (SC-011):

```js
db.produtos.find({}, { nome: 1, estoque: 1 }).toArray()
```

## 7. Multipartes no estoque

1. Com base e tampa mapeadas e produzidas em quantidades diferentes (ex: 10 e 4), abra o lançamento do produto.
2. O máximo oferecido deve ser `4` conjuntos (FR-038).
3. Lance `4` e confira que o saldo das duas partes foi consumido e que sobraram `6` bases como produção intermediária.

## 8. Erros visíveis

1. Com a conexão ativa, altere o token no banco para um valor inválido:

```js
db.credenciaisCanais.updateOne({ _id: "bambu_lab" }, { $set: { accessToken: "invalido" } })
```

2. Clique em **Importar agora**: a tela deve mostrar o status HTTP real devolvido pelo fabricante (ex: `Bambu Lab respondeu HTTP 401: token expired`), nada genérico (FR-004, SC-010), e as impressões já importadas devem permanecer. O mesmo texto fica registrado como "Última importação falhou".
3. Reconecte e confira que o aviso desaparece.

## 9. Produto novo, nunca impresso

1. Cadastre um produto novo com custo digitado do slice e publique.
2. Confira que ele é publicável e vendável sem nenhum passo extra (SC-007) e que a visão de produção informa "sem dados de produção", sem zero enganoso.

## 10. Testes automatizados

```bash
npm test
```

Cobrem, sem rede e sem banco: conversão de hit em impressão, duração efetiva, paginação incremental, apuração por parte e por produto, unidades acabadas limitadas pela parte mais escassa, perda e taxa de falha, saldo lançável e idempotência do lançamento.
