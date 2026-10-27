# Research: Montador de kits

## 1. Onde guardar o kit

- **Decision**: coleção nova `kits` (um documento por kit, itens embutidos).
- **Rationale**: mesmo padrão de `planosImpressao`/`calculosPreco`; kit é pequeno (≤ 30 itens).
- **Alternatives**: guardar no próprio produto (descartado — o kit existe antes de virar produto e o produto pode ser apagado).

## 2. Dados de cada componente (peso, tempo, custo, preço)

- **Decision**: lidos do produto na hora (vínculo vivo):
  - preço avulso = `produto.preco` (site);
  - peso = `custoProducao.pesoPecaGramas`, senão `fichaTecnica.pesoGramas`, senão "não informado";
  - tempo = `custoProducao.tempoImpressaoHoras`, senão a soma do plano do Tempo de Impressão (specs/035), senão "não informado";
  - custo = `calcularCustoProducao({ ...custoProducao, custoEmbalagemCentavos: 0 }).totalCentavos` — **sem a embalagem da peça**, porque o kit tem uma embalagem só.
- **Rationale**: atende FR-012 sem duplicar cálculo; zerar a embalagem antes de calcular mantém a taxa de falha coerente.
- **Alternatives**: copiar valores (descartado pelo usuário: "recalcular e avisar").

## 3. Aviso de preço desatualizado

- **Decision**: ao definir o preço, o kit grava `referencia` (soma avulsa, custo, peso, tempo e, por item, preço/peso/tempo/custo). A cada leitura compara referência × valores atuais; diferenças viram a lista "o que mudou". Escolher/confirmar preço de novo regrava a referência.
- **Rationale**: puro, testável, sem gatilho em PATCH de produto.
- **Alternatives**: flag gravada no PATCH do produto (descartado — mais acoplamento, mudanças por script não seriam pegas).

## 4. Margem por canal e faixas

- **Decision**: função pura `lib/kits/precificacaoKit.ts` com três canais:
  - Site: taxas globais (`resolverTaxasCanais(global).siteProprio`);
  - Shopee: `FAIXAS_SHOPEE_2026` (como na tela de produto);
  - Mercado Livre (estimativa): `faixasMercadoLivre(14, 650)` — o padrão da calculadora.
  - Margem = (preço − custo − comissão) ÷ preço; bloqueada quando < `margemMinimaPercentual` global.
  - Faixas padrão `[10, 15, 20]`; preço da faixa = `round(somaAvulsa × (1 − d%))`.
- **Rationale**: reutiliza `comissaoCanal`/`taxaNoPreco`; SC-005 garantido porque a calculadora recebe o mesmo custo (ver #6).
- **Alternatives**: consultar a comissão real do ML (descartado — exige categoria/anúncio; a calculadora já faz isso).

## 5. Item novo → produto rascunho

- **Decision**: o editor calcula no cliente custo e preço sugerido com `VAZIO_CUSTO_PRODUCAO` (padrões da loja) + peso e tempo digitados; preço sugerido = `calcularPrecoSugeridoCanal(custo, margemDesejada global, taxa do site)`. Ao salvar o kit, o servidor cria o produto rascunho (categoria padrão "Diversos", estoque 0, descrição "Peça do kit X.", `custoProducao` completo, `publicado: false`) e troca o item pelo `produtoId`.
- Nome igual (sem acento/maiúscula) a produto existente → 409 com `produtoExistenteId`; o editor oferece usar o existente. O editor também avisa antes, pela lista de produtos que já carregou.
- **Rationale**: mesmas regras do `POST /api/produtos` e do script de rascunho.

## 6. Kit → produto e → calculadora

- **Decision**: `custoProducaoDoKit(kit)` monta um `CustoProducao` agregado: peso e tempo somados, mão de obra somada, tarifas do padrão da loja, falha 0, embalagem = embalagem do kit e `custoAcessoriosCentavos` = diferença para fechar exatamente o custo do kit (≥ 0). Com isso o produto do kit e a calculadora (`valoresDoProduto`) partem do mesmo custo.
  - Criar produto: rascunho com nome, `preco` do kit, `custoProducao` agregado, `fichaTecnica.itensInclusos` ("2× Estrela"), `kitId`, descrição inicial com a lista.
  - Atualizar produto: só `preco`, `custoProducao` e `fichaTecnica.itensInclusos` (fotos/textos intocados).
  - Calculadora: `?kit=<id>`; com produto gerado redireciona para `?produto=`; sem produto usa `valoresDoProduto` sobre um produto virtual do kit.
- **Rationale**: reaproveita 100% da calculadora (cupom, verba, ML real).

## 7. Kit dentro de kit / produto removido

- **Decision**: produto com `kitId` não aparece no seletor e é recusado (400) no servidor. Componente apagado → item mostra a referência com "produto removido" e o kit fica sinalizado. Produto do kit apagado → o kit volta a oferecer "Criar produto do kit".

## 8. Textos / I18N

- O projeto não tem biblioteca de i18n (research #7 das specs 034/035): textos pt-BR inline, como todo o admin.

## 9. Design

- Na implementação, invocar `frontend-design` e `site-architecture` (CLAUDE.md). A UI segue `admin.module.css` e o padrão de `tempoImpressao.module.css`; combobox reaproveita `SelectBusca`.
