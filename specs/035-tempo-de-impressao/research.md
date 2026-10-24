# Research: Tempo de Impressão

## 1. Armazenamento

- **Decision**: coleção nova `planosImpressao`, um documento por produto (`produtoId` único) com os itens embutidos (`itens[]`).
- **Rationale**: as partes só existem no contexto do produto; editar/remover linhas e mesclar importação vira uma única gravação atômica do array.
- **Alternatives**: coleção de itens solta (mais consultas, sem ganho); guardar no próprio `produtos` (misturaria planejamento com cadastro de venda e o PATCH do produto sobrescreveria).

## 2. Tempo e horário

- **Decision**: tempo em minutos inteiros (`minutos`); início como `"HH:MM"` sem data. Término = início + minutos, com `diasDepois` (0 = mesmo dia). Função pura `terminoPrevisto` em `lib/producao/agenda.ts`, ao lado de `inicioMaximo`/`horasEMinutos`.
- **Rationale**: o usuário planeja por relógio, como já faz na Produção ("terminar às" → "iniciar até"). Reaproveita o mesmo módulo e formato `10h02`.
- **Alternatives**: data+hora completa (mais campos e fuso, sem pedido do usuário).

## 3. Importação da Produção

- **Decision**: no card da apuração (`ProdutoApuradoCard`, só com ações), botão "Levar ao Tempo de Impressão". Considera as impressões **marcadas** (checkbox "no cálculo" = não fora do custo), concluídas e com duração. Agrupa por parte e usa a impressão mais recente de cada parte (tempo da placa). Envia `POST /api/admin/tempo-impressao` com `modo: "mesclar"`.
- **Mescla**: nome comparado sem maiúsculas e espaços nas pontas → atualiza `minutos` (mantém o início já planejado); nomes novos são acrescentados; os demais ficam.
- **Rationale**: atende a escolha do usuário ("atualiza e adiciona"); a placa é a unidade que vai para a impressora.

## 4. Edição na tela

- **Decision**: cada produto é um card com estado local; "Salvar" envia a lista inteira (`PUT .../[produtoId]`). Seleção múltipla por checkbox + "Remover selecionadas"; "Remover produto" chama `DELETE`. O término é recalculado a cada tecla.
- **Rationale**: mesmo padrão explícito de salvar usado na Produção ("Salvar horário"); evita gravações a cada tecla.

## 5. Ficha em PDF

- **Decision**: página server `/admin/tempo-impressao/imprimir` em lista, com `ImprimirButton` (`window.print()` → "Salvar como PDF") e CSS `@media print`, como a folha de orçamentos (spec 031).
- **Alternatives**: gerar PDF no servidor (dependência nova, sem ganho).

## 6. Produto excluído

- **Decision**: a listagem ignora planos cujo produto não existe mais, e `removerProduto` apaga o plano do produto.

## 7. Textos / I18N

- O projeto não tem biblioteca de i18n (research #7 da spec 034): textos pt-BR inline, como todo o admin.

## 8. Design

- Na implementação, invocar `frontend-design` e `site-architecture` (CLAUDE.md). A UI segue `admin.module.css`/`producao.module.css` existentes.
