# Research: Calculadora de preço multicanal

## 1. A "margem de perda" atual cobre a taxa de falha?

- **Decision**: Não. Adicionar `taxaFalhaPercentual` como campo próprio em `CustoProducao`.
- **Rationale**: `calcularCustoProducao` aplica `margemPerdaPercentual` só ao custo do filamento (`custoProducao.ts:35`). Uma peça que falha também consome energia, depreciação e mão de obra. Custo por peça boa = custo ÷ (1 − falha), aplicado ao total. Falha 0% = resultado idêntico ao atual (sem regressão).
- **Alternatives**: reaproveitar a margem de perda (subestima o custo) ou aplicar só ao filamento (não cobre o restante).

## 2. Fórmula do preço por canal

- **Decision**: `preço = (custo × (1 + margem) + taxaFixa) / (1 − taxaPercentual)`; taxa ≥ 100% → inválido (`null`). Lucro = preço − custo − (preço × pct + fixa); margem = lucro ÷ preço.
- **Rationale**: Estende a fórmula do EDI-92 `(custo × (1+margem)) / (1−taxa)` incluindo a taxa fixa do gateway; com taxa fixa 0 é idêntica. O lucro exibido ao preço sugerido equivale a `custo × margem` (SC-002).
- **Alternatives**: margem sobre preço (muda o significado do campo existente).

## 3. Taxa do ML no comparativo

- **Decision**: O canal ML reutiliza a "taxa estimada da plataforma" já existente no simulador (pré-preenchida pela comissão real) — sem taxa fixa separada.
- **Rationale**: Mantém o comportamento do EDI-92 e o fallback manual; a comissão real já embute a taxa fixa em preços baixos.

## 4. Onde ficam as taxas globais

- **Decision**: Coleção `configuracoes` com documento único `_id: "taxasCanais"`; leitura devolve defaults (Shopee 14%, site 4,99% + R$ 0,00) quando não existe. Override por produto em `Produto.taxasCanais` (campos individualmente opcionais; ausente = herdar).
- **Rationale**: Segue o padrão de `credenciaisCanais` (documento com `_id` fixo). Alterar o global não reescreve overrides (edge case da spec).
- **Alternatives**: variáveis de ambiente (não editável no admin); taxa só por produto (rejeitado pelo solicitante).

## 5. Copiar custos de outro produto

- **Decision**: Ação no `ProdutoForm` que carrega `GET /api/produtos` sob demanda, lista os produtos com `custoProducao` e copia os valores (custos + falha + taxas por produto) para o estado do formulário, com confirmação se já houver dados diferentes do padrão.
- **Rationale**: Sem entidade nova (decisão do solicitante); reaproveita endpoint e conversores `custoProducaoParaFormulario`. Cópia de valores, sem vínculo.

## 6. i18n

- **Decision**: Sem biblioteca de i18n no projeto; admin usa pt-BR inline. Seguir esse padrão.
- **Rationale**: Criar infraestrutura de i18n está fora do escopo do ticket.
