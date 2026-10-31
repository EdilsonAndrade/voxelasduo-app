# Research: Romaneios de consignação

## 1. Onde guardar

- **Decision**: coleção nova `romaneios`, um documento por saída, com `lugares[]` e, dentro de cada lugar, `itens[]` e `pagamentos[]` embutidos.
- **Rationale**: o romaneio é pequeno e sempre editado inteiro; mesmo padrão de `kits` e `planosImpressao`.
- **Alternatives**: coleções separadas por lugar/pagamento (descartado — mais idas ao banco sem ganho).

## 2. Edição e gravação

- **Decision**: o editor mantém o romaneio inteiro em memória e grava com `PUT` do documento completo; repasse, "Pago na hora", fechar/reabrir acerto são funções puras no cliente seguidas de salvar.
- **Rationale**: uma regra de validação só (servidor revalida tudo), totais instantâneos, mesmo fluxo do editor de kits.
- **Alternatives**: endpoints por ação (`/repassar`, `/pago-na-hora`) — descartado por duplicar regras.

## 3. Preço sugerido das opções da busca

- **Decision**:
  - Produto: `produto.preco` (preço do site).
  - Plano avulso do Tempo de Impressão: preço da **venda direta** exatamente como a tela mostra — `ganhoDaPlaca` quando há uma parte, `ganhoDoConjunto` quando há várias (`lib/producao/ganhoImpressao.ts`). Sem peso ou margem em alguma parte → `null` (preço vazio).
  - Planos com `produtoId` ficam fora da busca (vale o Produto).
- **Rationale**: o valor que o lojista já vê na tela; o conjunto já desconta as embalagens repetidas, então é mais fiel que somar as partes.
- **Alternatives**: somar o preço de cada parte (descartado — conta mais de uma embalagem).

## 4. Cópia (snapshot)

- **Decision**: cada item grava `origem`, `origemId`, `nome` e `precoCentavos`; nada é relido da origem depois.
- **Rationale**: FR-009; o romaneio é um documento do que saiu naquele dia.

## 5. Status

- **Decision**: status por lugar (`aberto`/`acertado` + `acertadoEm`); o status do romaneio é derivado (acertado se todos os lugares estiverem acertados) e não é gravado.
- **Rationale**: evita inconsistência.

## 6. Repasse

- **Decision**: função pura `repassar(romaneio, deLugar, itemId, paraLugar, quantidade)`: limite = no lugar (levada − vendida − devolvida); diminui `levada` na origem e soma numa linha do destino com a mesma origem+origemId+preço (item livre: mesmo nome+preço), ou cria uma nova. Sem histórico de repasses.
- **Rationale**: atende FR-011 e SC-003 (a soma total não muda).

## 7. Impressão / PDF

- **Decision**: página `/admin/romaneios/[id]/imprimir?lugar=<id>` com `ImprimirButton` (impressão do navegador), controles com `nao-imprimir`; o topo do admin já some no `@media print`.
- **Rationale**: mesmo padrão de `tempo-impressao/imprimir`.

## 8. Textos

- **Decision**: pt-BR inline, como o resto do admin (não há lib de i18n no admin).

## 9. Design

- **Decision**: invocar a skill `frontend-design` antes dos componentes; seguir os tokens e classes de `admin.module.css` (`bar`, `btnPrimary`) e um módulo próprio `romaneios.module.css`.
