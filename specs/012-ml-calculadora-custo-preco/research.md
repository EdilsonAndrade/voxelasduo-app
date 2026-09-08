# Phase 0 Research: Calculadora de custo e preço sugerido (Mercado Livre)

Não há itens `NEEDS CLARIFICATION` pendentes no Technical Context — o projeto é brownfield (stack, banco e padrões já definidos no repositório). Este documento registra as decisões técnicas tomadas a partir do código existente e da documentação oficial do Mercado Livre.

## 1. Endpoint de custo real de venda

**Decisão**: Usar `GET https://api.mercadolibre.com/sites/MLB/listing_prices` com os parâmetros `category_id`, `price`, `listing_type_id`, `logistic_type` e `shipping_mode`, autenticado com o access token já gerenciado por `obterAccessTokenValido()` (`lib/estoque/canais/mercadoLivre/auth.ts`).

**Rationale**: É o endpoint oficial documentado em "Custos por vender" (developers.mercadolivre.com.br/pt_br/comissao-por-vender). Retorna `sale_fee_amount`, `sale_fee_details.percentage_fee`, `sale_fee_details.fixed_fee` e `listing_fee_amount` — os únicos valores que refletem a comissão real (que varia por categoria/tipo de anúncio/fatores comerciais, não é uma % fixa).

**Alternatives considered**:
- Assumir uma porcentagem fixa configurada manualmente (ex: 18%, como na planilha de custos do usuário) — rejeitado porque a documentação confirma que a comissão varia por categoria e tipo de anúncio, e pode mudar ao longo do tempo; um valor fixo levaria a simulações erradas.
- Usar `/items/{id}/prices` (preços já aplicados a um item publicado) — não serve, pois o produto ainda não tem `item_id` no momento do cadastro/edição (a publicação no Mercado Livre é uma ação separada, feita depois — ver `anuncios.ts`).

## 2. Resolução da categoria do Mercado Livre antes da publicação

**Decisão**: Reaproveitar exatamente a mesma lógica já usada em `criarAnuncio()` (`lib/estoque/canais/mercadoLivre/anuncios.ts`): `resolverCategoriaMercadoLivre(produto.categoria)` (override manual) com fallback para `preverCategoriaMercadoLivre(montarConsultaPrevisor(produto.categoria, produto.nome))` (previsor `domain_discovery/search`).

**Rationale**: O modelo `Produto` não guarda um `category_id` do Mercado Livre — ele só é resolvido no momento da publicação. Para simular a comissão antes de publicar, é necessário resolver a mesma categoria que seria usada na publicação real, garantindo que a simulação não diverja do que acontecerá de fato. Reaproveitar a função existente evita duplicar essa regra de negócio.

**Alternatives considered**: Pedir ao vendedor para digitar manualmente o `category_id` do Mercado Livre no formulário — rejeitado por adicionar fricção e conhecimento técnico externo que o restante do fluxo de publicação já não exige hoje.

## 3. Tipo de anúncio, logística e modo de envio usados na simulação

**Decisão**: Usar o mesmo `LISTING_TYPE_ID = "gold_special"` fixo já usado em `anuncios.ts` como padrão da simulação; permitir que o vendedor sobrescreva manualmente o valor de comissão exibido caso queira simular outro tipo de anúncio. `logistic_type`/`shipping_mode` são omitidos por padrão (não há gestão de frete/logística por produto no sistema hoje); a API do Mercado Livre calcula a comissão de venda (`percentage_fee`) mesmo sem esses parâmetros — apenas o `fixed_fee` de frete pode ficar impreciso, o que é aceitável nesta primeira versão (documentado como limitação em research, não em bloqueio).

**Rationale**: Consistência com o que realmente será publicado; evitar introduzir campos de logística novos que a spec não pediu (fora de escopo — a spec foca em custo de produção + comissão de venda, não em custos de frete).

**Alternatives considered**: Adicionar campos de logística (`logistic_type`, `shipping_mode`, `billable_weight`) ao formulário agora — adiado; pode ser um refinamento futuro se a imprecisão do `fixed_fee` se mostrar relevante na prática.

## 4. Cálculo do COGS (custo de produção)

**Decisão**: Implementar como função pura e síncrona em `lib/produtos/custoProducao.ts`, sem chamadas de rede, para permitir recálculo instantâneo no cliente a cada alteração de campo (FR-002/FR-003). Fórmulas seguem o modelo já usado internamente pelo solicitante (planilha de custos):
- `custoFilamentoPorGrama = precoCarretel / pesoCarreteGramas`
- `custoFilamentoComPerda = pesoPeca * custoFilamentoPorGrama * (1 + margemPerdaPercentual / 100)`
- `depreciacaoPorHora = precoImpressora / vidaUtilImpressoraHoras`
- `custoDepreciacao = tempoImpressaoHoras * depreciacaoPorHora`
- `custoEnergia = tempoImpressaoHoras * consumoEletricoKwh * tarifaEnergiaKwh`
- `custoMaoDeObra = tempoMaoDeObraHoras * valorHoraTrabalho`
- `cogsTotal = custoFilamentoComPerda + custoDepreciacao + custoEnergia + custoMaoDeObra + custoEmbalagem`

**Rationale**: Reflete o modelo de custos já validado internamente (planilha enviada pelo solicitante), citada como referência na spec (Assumptions). Ser uma função pura simplifica testes unitários (Vitest, seguindo o padrão de `lib/produtos/validation.test.ts`) e evita dependência de rede para uma operação que deve ser instantânea.

**Alternatives considered**: Calcular no servidor a cada mudança de campo — rejeitado por adicionar latência desnecessária a um cálculo puramente aritmético que não depende de dados externos.

## 5. Debounce da consulta de comissão

**Decisão**: Debounce no cliente (React, dentro do novo componente `SimuladorPrecificacao.tsx`), com um atraso curto (ex: 500ms) após a última alteração do preço de venda antes de disparar a chamada à nova rota `POST /api/mercado-livre/simular-preco`.

**Rationale**: Atende FR-005 (consulta automática após pausa na digitação, sem exigir ação explícita) e evita exceder limites de uso da API do Mercado Livre. Padrão comum em React com `useEffect` + `setTimeout`/`clearTimeout`, sem necessidade de biblioteca externa.

**Alternatives considered**: Debounce no servidor (rate limiting) — desnecessário para este volume de uso (painel administrativo interno, poucos usuários simultâneos).

## 6. Nova rota de API

**Decisão**: Criar `POST /api/mercado-livre/simular-preco` recebendo `{ nome, categoria, precoReais }` (dados ainda não persistidos, funciona tanto na criação quanto na edição do produto) e retornando a comissão resolvida (`categoryId` usado, `listingFeeAmount`, `saleFeeAmount`, `percentageFee`, `fixedFee`) ou um erro tratável (categoria não encontrada, falha de comunicação com o Mercado Livre).

**Rationale**: O formulário de "novo produto" ainda não tem um `id` de produto salvo — uma rota aninhada em `/api/produtos/[id]/...` não funcionaria durante a criação. Uma rota independente, recebendo os dados diretamente do formulário (ainda não salvos), atende tanto ao cadastro quanto à edição (FR-004 a FR-007) sem exigir que o produto já exista.

**Alternatives considered**: Exigir que o produto seja salvo antes de simular preço (rota aninhada em `/api/produtos/[id]/mercado-livre/custo`) — rejeitado por contrariar o requisito de a simulação funcionar já na tela de cadastro (User Story 2/3, antes de salvar).
