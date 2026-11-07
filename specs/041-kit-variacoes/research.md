# Research: Produto com variações de kit

## 1. Variações dentro do produto x reaproveitar a entidade Kit
- **Decision**: lista `variacoes` embutida no documento do produto, com as peças dentro de cada variação.
- **Rationale**: o pedido do lojista é "um cadastro só". Ligar cada variação a um Kit do montador manteria 3 cadastros. Embutir permite atualizar preço e estoque atomicamente com o operador posicional do Mongo.
- **Alternatives**: coleção `variacoes` separada (joins em todo lugar); variação → `kitId` (3 cadastros, que é a dor relatada).

## 2. Preço e estoque do produto com variações
- **Decision**: `preco` = menor preço das variações e `estoque` = soma, gravados pelo servidor (ao salvar variações, aplicar preços e abater estoque).
- **Rationale**: vitrine, busca, cards, feed Meta, lista de preços e home leem `preco`/`estoque`, e continuam corretos sem mudança. O PATCH do produto ignora `preco`/`estoque` quando há variações, para o formulário não sobrescrever o valor derivado.

## 3. Custo da variação
- **Decision**: soma de `valoresDoComponente(peca).custoCentavos × quantidade` + `embalagemCentavos`, com as funções do montador de kits (`lib/kits/componentes.ts`). Para a calculadora, `custoProducaoDoKit` gera o `CustoProducao` agregado e `valoresDoKit` gera os valores, como o montador já faz.
- **Rationale**: mesmo custo no admin e na calculadora (SC-004) e mesma regra de embalagem única.

## 4. Abatimento atômico por variação
- **Decision**: `findOneAndUpdate({ _id, variacoes: { $elemMatch: { id, estoque: { $gte: q } } } }, { $inc: { "variacoes.$.estoque": -q, estoque: -q } })`.
- **Rationale**: atômico, sem corrida, e mantém a soma. Falha → inconsistência registrada, como já acontece com produto simples.

## 5. Identidade da linha no carrinho
- **Decision**: `ItemCarrinho.variacaoId?` + `variacaoNome?`. Funções `alterar`/`remover` passam a usar a chave `chaveItem(produtoId, variacaoId)`. O contexto recebe a chave.
- **Rationale**: duas variações do mesmo produto viram duas linhas (FR-007). Itens antigos sem variação continuam válidos. Se o produto agora tem variações, o servidor recusa com o erro de estoque/indisponível existente.

## 6. Pedido com produto com variações sem `variacaoId`
- **Decision**: o servidor trata como item indisponível (`ErroEstoque` com quantidade 0 e nome "escolha a variação"). Variação inexistente idem.
- **Rationale**: reaproveita o fluxo de erro de estoque já exibido no checkout (409).

## 7. Calculadora por variação
- **Decision**: `/admin/produtos/calculadora?produto=X&variacao=Y`. O cálculo salvo ganha `variacaoId`, e `buscarCalculoDoProduto(produtoId, variacaoId)` reabre o cálculo certo. "Aplicar na variação" grava `preco` (site) e `precosCanais.shopee/mercadoLivre` da variação a partir de `res.precoSiteCentavos` e `res.canais`.
- **Rationale**: a calculadora hoje só cria produtos e não atualiza preço. O botão novo fica restrito ao contexto de variação.

## 8. Integrações (Mercado Livre/Shopee pela API)
- **Decision**: fora do escopo. Produtos com variações continuam sincronizando `preco`/`estoque` derivados se já tiverem anúncio, e o admin mostra um aviso de que as variações são cadastradas manualmente nos marketplaces.

## 9. i18n
- **Decision**: o projeto não tem biblioteca de i18n. Os textos ficam em pt-BR inline, como em todas as telas (ver plan 040).
