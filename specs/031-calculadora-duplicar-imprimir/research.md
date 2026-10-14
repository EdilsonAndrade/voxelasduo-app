# Research: Duplicar cálculo e imprimir orçamentos

## 1. Duplicar
- **Decision**: no cliente, `POST /api/admin/calculos-preco` com os valores atuais da tela, nome novo, mesmos links e **sem** `produtoId`; depois `router.push('/admin/produtos/calculadora?id=<novo>')`.
- **Rationale**: a rota e a validação já existem; copiar o que está na tela (inclusive não salvo) é o que o usuário espera ao "duplicar para 10 cm".
- **Alternatives**: rota `POST /:id/duplicar` no servidor — copiaria só o que está gravado e exige mais código.

## 2. Altura da peça
- **Decision**: `valores.alturaCm?: string` (texto, como os demais campos). Não entra no custo. Ausente em cálculos antigos.
- **Rationale**: `valores` já é gravado inteiro; nenhuma mudança na validação/rota.

## 3. Página de impressão
- **Decision**: `/admin/produtos/calculadora/imprimir?ids=a,b,c` (Server Component busca com `_id: {$in}`, mantém a ordem dos ids). Componente client com canal (Shopee/ML) e kit (2/3/4) e botão "Imprimir" (`window.print()`).
- **Print CSS**: `@page { size: A4 landscape; margin: 10mm }`; `@media print` esconde o topo do painel (`:global` sobre a classe do layout via atributo `data-sem-impressao` nos controles) e os controles da página.
- **Alternatives**: gerar PDF no servidor — dependência nova, sem ganho (o navegador já "Salva como PDF").

## 4. Contas
- **Decision**: `montarLinhasOrcamento(valores, canal, unidadesKit)` em `lib/produtos/orcamento.ts`, usando `montarCustoProducao`/`calcularCustoProducao`, `calcularPrecoPorMargem`, `detalharVenda`, `calcularCustoKit`, `calcularProducaoMensal`. A escolha das faixas (`faixasDoCanal`) sai do componente para a lib e passa a ser usada pelos dois — garante SC-003.
- Preço para anunciar = anúncio embutido com `100 / roasMeta` (padrão 8), qualquer que seja o modo salvo.
- Pedidos no mês = ⌊peças no mês ÷ unidades⌋; peças no mês = valor gravado no cálculo, ou o automático da produção quando vazio.
