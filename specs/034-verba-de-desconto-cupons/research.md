# Research: Verba de desconto (cupons e promoções)

## 1. Régua única: margem = lucro ÷ preço

- **Decision**: piso (`margemMinimaPercentual`) e desejada (`margemDesejadaPercentual`) — global e override do produto — passam a ser % do preço. Preço sugerido por canal: `(custo + fixa) / (1 − taxa% − margem%)`, percorrendo as faixas (Shopee) — a mesma conta de `calcularPrecoPorMargem` da calculadora (`lib/produtos/calculadoraRapida.ts`), reaproveitada em `lib/produtos/canais.ts` (`precoPorTaxa` passa a receber a margem). `ResultadoCanal.margemPercentual` vira lucro ÷ preço e ganha `markupPercentual` (lucro ÷ custo) só para exibição.
- **Rationale**: é a régua da calculadora, do curso e dos marketplaces; sem ela a verba do produto e da calculadora não batem (SC-001).
- **Alternatives**: manter markup no produto e converter só na verba — rejeitado, mantém a confusão que originou a feature.
- **Impacto**: `calcularPrecoSugerido`/`calcularSimulacaoPrecificacao` (`lib/produtos/precificacao.ts`), `calcularPrecoMinimoCanal` (usado pela rota de promoções do ML — passa a usar o piso em % do preço, FR-014), bloco "Promoções" do `SimuladorPrecificacao`, validações (`lib/configuracoes/validation.ts`, `lib/produtos/taxasCanaisFormulario.ts`, `lib/produtos/validation.ts`: 0 ≤ margem < 100) e "Criar produto" da calculadora (deixa de converter para % sobre o custo e grava a margem do preço do site direto).

## 2. Migração dos valores salvos (opção C)

- **Decision**: migração automática e idempotente na primeira leitura de `buscarTaxasCanais()` quando o documento não tem `reguaMargem: "preco"`:
  1. "Reivindica" a migração com `updateOne({ _id, reguaMargem: { $ne: "preco" } }, { $set: { reguaMargem: "preco", margemMinimaPercentual: 25, margemDesejadaPercentual: 40, atualizadoEm } }, { upsert: true })`; erro de chave duplicada (E11000) = outra requisição já migrou → segue.
  2. Só quem reivindicou move os overrides dos produtos: para cada produto com `taxasCanais.margemMinimaPercentual` ou `margemDesejadaPercentual`, grava `margensParaRevisar = { minimaSobreCusto?, desejadaSobreCusto?, migradoEm }` e faz `$unset` dos dois campos (um `updateMany` com pipeline não é necessário — `find` + `bulkWrite`).
- **Rationale**: funciona em produção (Vercel) sem o usuário rodar script; o flag torna idempotente; os valores antigos ficam guardados para a lista de revisão.
- **Alternatives**: script `npm run migrar:margens` (padrão de `migrar-categorias`) — rejeitado: até alguém rodar, os números antigos seriam lidos na régua nova (80% do preço) e o ML aceitaria/recusaria promoções errado.

## 3. Lista "Margens para revisar"

- **Decision**: seção na página `/admin/configuracoes` (Taxas dos canais), abaixo do formulário, listando produtos com `margensParaRevisar`: nome, valores antigos (% sobre o custo), sugestão em % do preço na Shopee e botões "Abrir" e "Marcar revisado". A sugestão converte o markup antigo no preço que ele geraria pela fórmula antiga e devolve `lucro ÷ preço` (ex.: 80% sobre o custo → ~32% do preço). O produto também mostra um aviso com os valores antigos enquanto não for revisado. "Marcar revisado" = `DELETE /api/admin/produtos/{id}/margens-revisar` (`$unset`).
- **Rationale**: a página de taxas é onde o padrão das margens é editado; a lista some sozinha quando vazia.

## 4. Cupom de loja

- **Decision**: campos novos em `TaxasCanaisConfig`: `cupomLojaPercentual` (0 ≤ x < 100, padrão 0 = sem cupom), `cupomLojaTetoCentavos` (`null` = sem limite), `cupomLojaCestaMinimaCentavos` (≥ 0, informativo). Vale só para a Shopee. Desconto real = `min(round(preço × %), teto)`.
- **Rationale**: espelha a tela de cupom da Shopee mostrada pelo usuário (3%, máx. R$ 5, cesta mínima R$ 10).
- **Nota**: o "cupom próprio" em R$ por pedido que já existe na calculadora (Shopee) continua igual — é um custo fixo por venda e já entra na margem calculada; o cupom de loja global é outra coisa e só entra na verba.

## 5. Cálculo da verba (função pura)

- **Decision**: `lib/produtos/verbaDesconto.ts` — `calcularVerbaDesconto({ precoCentavos, pisoPercentual, cupomLoja | null, lucroEm: (preco) => centavos })`:
  - margem = `lucroEm(preço) ÷ preço`; verba = margem − piso; cupom real em R$ e % do preço; sobra = verba − cupom% (em % e em R$ sobre o preço);
  - estado: `ok` | `semCupomLoja` (0 < verba < cupom%, ou sobra ≤ 0 com verba ≥ 0) | `abaixoDoPiso` (verba < 0).
  - `simularDesconto(verba, descontoPercentual)`: preço final = preço − cupom real − round(preço × desconto%); lucro = `lucroEm(precoFinal)` (taxas recalculadas, faixa Shopee pode mudar); margem sobre o preço final; `passouDaSobra = desconto > sobra%`.
- **Rationale**: o `lucroEm` injetado permite usar a mesma função no produto (`preço − comissaoCanal − custo`) e na calculadora (`detalharVenda` com imposto, anúncio e custos do pedido). Subtração simples = regra do curso (conservadora, cobre as leituras "sobre o preço com desconto" e "sobre o preço cheio").

## 6. Onde a verba aparece

- **Produto** (`SimuladorPrecificacao`): em cada card do "Comparativo por canal", o bloco "Promoções" passa a mostrar a verba sobre o preço atual do canal (piso em % do preço) + simulador; a linha antiga "Desconto: aceite promoções de até…" é substituída pela sobra. O cálculo de frete grátis continua, agora com lucro mínimo = preço × piso.
- **Calculadora** (`Resumo`): bloco abaixo de "Taxas descontadas no pedido" para o canal da aba, com o preço praticado (`precoCentavos`), piso global e cupom de loja global (só na aba Shopee).
- **Lista de produtos**: o servidor (`app/admin/(painel)/produtos/page.tsx`) calcula a verba no preço Shopee salvo (ou no do site, quando a Shopee não tem preço próprio — mesma regra do produto) e envia `verbaShopee: "ok" | "semCupomLoja" | "abaixoDoPiso" | null` em `ProdutoLinha`; a linha mostra um selo.

## 7. Textos / I18N

- Sem biblioteca de i18n no projeto (research #11 da spec 033): textos em pt-BR inline, como no restante do admin.

## 8. Design

- As skills `frontend-design`/`product-page-design`/`site-architecture` exigidas pelo `CLAUDE.md` não estão disponíveis nesta sessão — avisar o usuário; a UI segue os estilos existentes (`admin.module.css`, `calculadoraRapida.module.css`) sem nova direção visual.
