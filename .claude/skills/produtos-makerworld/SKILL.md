---
name: "produtos-makerworld"
description: "Garimpa modelos 3D bem avaliados e com licença que permite venda (MakerWorld), baixa as fotos de impressão para o Drive, escreve título/descrição/preço e cadastra cada um como produto rascunho no admin. Use quando o usuário pedir produtos de um tema — \"itens para o Natal\", \"coisas para a cozinha\", \"peças para casa\", \"chaveiros\" — ou citar a skill pelo nome."
argument-hint: "tema da busca (ex: itens para o Natal, organizadores de cozinha) e, opcionalmente, quantos modelos"
user-invocable: true
disable-model-invocation: false
---

# Produtos a partir do MakerWorld

Transforma um tema ("itens para o Natal") numa leva de **produtos rascunho** no
admin: cada um já com nome, descrição, preço calculado pelo custo real, link do
modelo e as fotos separadas numa pasta do Drive para o upload.

Nada vai ao ar sozinho: todo produto nasce `publicado: false` e só aparece na
loja depois que o usuário revisa e marca "Publicado no site" no admin.

## O que perguntar antes

Só pergunte o que o pedido não disser:

- **Quantos modelos** — se não vier no pedido, use **5**.
- **Categoria** — escolha entre as cadastradas (`organizadores`, `acessorios`,
  `decoracao`, `presentes`, `religioso`, `diversos`, `natalina`) pelo tema. Se
  o tema não encaixar claramente em nenhuma, pergunte.

Não pergunte sobre licença: a regra abaixo é fixa.

## Passo 1 — Garimpar no MakerWorld

Use as ferramentas `mcp__claude-in-chrome__*` (carregue-as numa única chamada do
`ToolSearch`; veja a skill `claude-in-chrome`).

A busca **só** aceita licenças que permitem venda. Monte a URL com o filtro já
aplicado:

```
https://makerworld.com/pt/3d-models?sort=popular&period=all&licenses=CC0,BY,BY-SA&keyword=<termo>
```

- `licenses=CC0,BY,BY-SA` é obrigatório. `BY-NC*` proíbe uso comercial e **nunca**
  entra. Confirme a licença na página de cada modelo antes de aceitá-lo: ela
  aparece na seção "Licença", no fim da coluna da direita.
- Prefira quem tem **muitas avaliações**, não só nota alta: 4,8 com 164
  avaliações vale mais que 5,0 com 2.
- Modelos cujo título ou descrição dizem "free to sell" / "livre para vender"
  são os mais seguros.
- Desconfie de remix cujo original saiu do ar, ou que o próprio autor diz
  lembrar o trabalho de outra pessoa. Pode usar, mas **registre a ressalva** no
  relatório final.

Para cada modelo aprovado, colete da página:

| Dado | Onde |
| --- | --- |
| Nome e autor | topo da página |
| Licença | seção "Licença" |
| Nota e nº de avaliações | aba "Avaliações & Classificações" e o card do perfil |
| Peso (g) e tempo (h) | card do perfil de impressão escolhido |
| URLs das fotos | `document.querySelectorAll('img')`, filtrando `makerworld.bblmw.com/.../design/` |

**Perfil de impressão**: prefira sempre o compatível com a **Bambu Lab A1** (o
chip "A1" filtra a lista; "A1 mini e superior" também serve). Entre os
compatíveis, pegue o mais bem avaliado. É dele que saem o peso e o tempo.

Para extrair peso e tempo do HTML de uma vez:

```js
const h = document.documentElement.innerHTML;
const pesos = [...h.matchAll(/"weight\\?":\s*([\d.]+)/g)].map(x => x[1]);
const tempos = [...h.matchAll(/"(?:cost|prediction)\\?":\s*(\d+)/g)].map(x => x[1]); // segundos
[...new Set(pesos)].join(', ') + ' | ' + [...new Set(tempos)].join(', ')
```

## Passo 2 — Fotos

Baixe as fotos **com `curl`, fora do navegador** — o CDN do MakerWorld é público
e as URLs sem query string funcionam:

```bash
D="/j/My Drive/3D/Produtos Site MakerWorld/<slug-do-produto>/fotos"
mkdir -p "$D" && curl -sS -L -o "$D/<arquivo>" "<url>"
```

Não tente baixar pelo navegador: nesta máquina o Chrome cancela todo download
disparado por automação.

Olhe as imagens (ferramenta `Read`) e escolha até **5**, renomeando na ordem em
que devem aparecer na galeria. Critérios, nessa ordem:

1. peça inteira sobre fundo limpo → é a capa
2. outra cor ou outro ângulo da peça inteira
3. peça na mão ou ao lado de um objeto conhecido (mostra o tamanho)
4. detalhe de textura/acabamento
5. variação de filamento (seda, multicolor)

Nomeie de forma que o usuário reconheça na hora do upload:
`1 - capa azul fundo branco.jpg`, `3 - na mao mostrando o tamanho.jpg`. O que
sobrar vai para `fotos extras/`.

## Passo 3 — Preço

Use os parâmetros de custo que o usuário já tem nos outros produtos — leia de um
produto existente no banco em vez de inventar. Hoje são:

| Campo | Valor |
| --- | --- |
| Preço do carretel | 9100 centavos / 1000 g |
| Impressora | 457000 centavos / 4000 h de vida útil |
| Consumo elétrico | 0,15 kWh · tarifa 60 centavos/kWh |
| Hora de trabalho | 100 centavos · 1 h de mão de obra |
| Embalagem | 500 centavos |
| Margem de perda e taxa de falha | 0% |

Só **peso** e **tempo de impressão** mudam por modelo — vêm do perfil A1.

Calcule com as funções do próprio projeto, nunca na mão:

```ts
import { calcularCustoProducao } from "@/lib/produtos/custoProducao";
import { calcularPrecoSugerido } from "@/lib/produtos/precificacao";

const cogs = calcularCustoProducao(custo).totalCentavos;
const sugerido = calcularPrecoSugerido(cogs, margemDesejada, 4.99); // taxa do site
```

A margem desejada e a taxa do site vêm da coleção `configuracoes`, documento
`taxasCanais`. Arredonde o resultado para cima terminando em **,90**.

## Passo 4 — Nome e descrição

Escreva texto **próprio**, em pt-BR. Não copie a descrição do autor.

- **Nome**: até 60 caracteres, começando pelo que a peça é. Bom:
  `Dragão Articulado Flexível — Brinquedo Antiestresse Impresso em 3D`.
- **Descrição**: um parágrafo sobre o que torna a peça interessante, um sobre
  material e acabamento, uma lista de 4 a 6 bullets e, no fim, o crédito.

O crédito é obrigatório em CC BY e CC BY-SA, e precisa ficar na descrição que
vai ao ar:

```
Modelo "<nome original>", de <autor>, sob licença <licença> e liberado pelo
autor para venda: <url do modelo>
```

## Passo 5 — Gravar como rascunho

Monte um JSON (um objeto por produto) e rode:

```bash
npx tsx scripts/criar-produto-rascunho.ts <arquivo.json>
```

O script valida o payload, resolve o slug, pula o que já existe com o mesmo nome
na categoria e grava com `publicado: false`. Campos aceitos: `nome`, `descricao`,
`preco` (centavos), `estoque`, `categoria`, `fotos`, `linkModelo3d`,
`custoProducao`, `fichaTecnica`, `taxasCanais`, `embalagemEnvio`.

`fotos` fica vazio: as fotos são enviadas pelo admin, que as hospeda no Blob.
`estoque` nasce `0` — o usuário ajusta ao imprimir.

## Passo 6 — Relatar

Entregue, por produto: nome, preço e como chegou nele, categoria, nota e nº de
avaliações, licença e autor, link do admin para revisar, e o caminho da pasta
com as fotos. Liste junto:

- qualquer **ressalva de origem** (remix, semelhança com outro designer)
- que o `.3mf` **não** foi baixado e precisa do clique do usuário na página do
  modelo, com o perfil A1 selecionado
- que tudo está como rascunho, com o lembrete de publicar depois de subir as fotos

## Limites

- Nunca publique um produto automaticamente.
- Nunca cadastre modelo com licença `BY-NC`, `BY-NC-SA`, `BY-NC-ND` ou
  "Standard Digital File License".
- Não invente peso, tempo ou medidas: se a página não informa, deixe o campo de
  fora e avise.
