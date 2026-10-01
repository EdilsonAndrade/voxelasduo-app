# Research: Lista de preços para evento

## 1. PDF
- **Decision**: página de impressão + "Salvar como PDF" do navegador.
- **Rationale**: escolhida pelo usuário; sem dependência; funciona no celular e no desktop.
- **Alternatives**: pdf-lib / react-pdf no servidor (dependência nova, layout manual).

## 2. Como passar a seleção
- **Decision**: query string `?ids=a,b,c`, abrindo em nova aba.
- **Rationale**: sem estado gravado (spec: seleção é temporária); a URL pode ser recarregada ou reimpressa.
- **Alternatives**: sessionStorage (não sobrevive em nova aba de forma confiável), gravar no banco (fora do escopo).

## 3. Salvar preços
- **Decision**: `PATCH /api/produtos/[id]` com `preco` e `precosCanais` mesclado (mantém `shopee`).
- **Rationale**: a rota já valida e sincroniza o anúncio do ML quando `preco`/`precosCanais` mudam (FR-009). `atualizarProduto` faz `$set` do objeto inteiro, então mandar só `mercadoLivre` apagaria a Shopee.
- **Alternatives**: rota nova de preços em lote (contraria "salvar por linha").

## 4. Custo
- **Decision**: calcular `calcularCustoProducao(produto.custoProducao).totalCentavos` no server component e passar pronto ao client.
- **Rationale**: mesmo número da tela de edição (SC-004); não envia o objeto de custo inteiro ao navegador.

## 5. Ordenação
- **Decision**: `a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })`.
- **Rationale**: ignora maiúsculas e acentos ("Árvore" junto de "Arvore").

## 6. Impressão sem o "chrome" do site
- **Decision**: `ChromeDoSite` envolve cabeçalho/rodapé em `<div class="nao-imprimir">` (`display: contents` na tela, `display: none` na impressão); `.topoAdmin` com `display: none` na impressão; elementos de ação da página com `nao-imprimir`.
- **Rationale**: não muda o layout na tela; não exige mover a página para fora do grupo `(painel)`.

## 7. Mobile
- **Decision**: ≤768px a tabela vira lista de cartões via CSS (grid por linha); campos com `inputMode="decimal"` e altura ≥44px; barra de "Gerar lista" fixa no rodapé quando há seleção.
- **Rationale**: o padrão atual (tabela com rolagem lateral) deixa campos editáveis fora da tela (SC-005).
