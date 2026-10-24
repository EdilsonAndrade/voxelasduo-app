# Feature Specification: Tempo de Impressão (planejamento de impressões)

**Feature Branch**: `main` (sem issue no Linear; trabalho direto na main a pedido do usuário)
**Created**: 2026-10-24
**Status**: Draft
**Input**: User description: "Menu admin 'Tempo de Impressão'. Selecionar um produto existente (publicado ou não), cadastrar suas partes ou o produto inteiro com o tempo de impressão de cada um; ao lado, horário de início e término calculado; horário salvo; editar/remover linhas ou o produto; levar peças marcadas da tela de Produção para este menu (atualiza pelo nome, adiciona novas); gerar ficha PDF em lista."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cadastrar tempos de impressão de um produto (Priority: P1)

O administrador abre o menu "Tempo de Impressão", escolhe um produto já existente (mesmo que não esteja à venda) e cadastra as partes dele — ou uma única linha para o produto inteiro — com o tempo de impressão de cada uma. Pode editar o nome e o tempo de qualquer linha, remover uma ou várias linhas, ou retirar o produto inteiro do menu.

**Why this priority**: É a base de tudo: sem os tempos cadastrados não há planejamento, importação nem ficha.

**Independent Test**: Adicionar um produto rascunho, cadastrar 3 partes com tempos, recarregar a página e ver as partes e o tempo total do produto preservados.

**Acceptance Scenarios**:

1. **Given** um produto existente não publicado, **When** o administrador o seleciona e adiciona as partes "corpo" (10h02) e "base" (3h42), **Then** o produto aparece no menu com as duas partes e o total 13h44.
2. **Given** um produto com 3 partes, **When** o administrador marca 2 delas e remove, **Then** resta apenas 1 parte e o total é recalculado.
3. **Given** um produto no menu, **When** o administrador remove o produto, **Then** ele e todas as suas partes saem do menu (o produto em si continua no catálogo).
4. **Given** um produto impresso de uma vez, **When** o administrador cadastra uma única linha, **Then** essa linha representa o produto inteiro.

---

### User Story 2 - Planejar horário de início e ver término (Priority: P1)

Ao lado de cada linha há um campo de horário de início. Ao preenchê-lo, o sistema mostra o horário de término (início + tempo de impressão), indicando quando termina no dia seguinte. O horário de início fica salvo.

**Why this priority**: É o objetivo declarado do usuário — organizar quando mandar cada peça para a impressora.

**Independent Test**: Informar início 22:00 numa parte de 10h02 e ver término "08:02 (dia seguinte)"; recarregar e ver 22:00 preservado.

**Acceptance Scenarios**:

1. **Given** uma parte de 3h42, **When** o início é 06:00, **Then** o término exibido é 09:42.
2. **Given** uma parte de 10h02, **When** o início é 22:00, **Then** o término é 08:02 com indicação de dia seguinte.
3. **Given** uma linha sem início, **Then** o término fica vazio (sem erro).
4. **Given** um início salvo, **When** a página é recarregada, **Then** o início e o término continuam exibidos.

---

### User Story 3 - Levar peças da Produção para o menu (Priority: P2)

Na tela de Produção, na apuração de um produto, as impressões marcadas no checkbox podem ser enviadas para o menu "Tempo de Impressão" com um botão. Cada impressão vira uma linha (nome da parte + tempo). Partes com o mesmo nome já existentes têm o tempo atualizado; as novas são adicionadas; as demais permanecem.

**Why this priority**: Economiza digitação, mas depende do cadastro (US1) existir.

**Independent Test**: Na Produção, marcar 4 impressões de um produto e enviar; abrir o menu e ver o produto com as 4 partes e seus tempos.

**Acceptance Scenarios**:

1. **Given** um produto ainda não presente no menu, **When** 4 impressões marcadas são enviadas, **Then** o produto aparece com 4 partes e os tempos das impressões.
2. **Given** o produto já tem a parte "base" com 4h00, **When** é enviada uma impressão "base" de 3h42 e uma "tampa" nova, **Then** "base" passa a 3h42, "tampa" é adicionada e as outras partes continuam.
3. **Given** nenhuma impressão marcada, **Then** o botão de envio fica indisponível.
4. **Given** uma falha ao enviar, **Then** o administrador vê a mensagem de erro e nada é parcialmente perdido.

---

### User Story 4 - Gerar ficha em PDF (Priority: P3)

O administrador gera uma ficha em lista com cada produto, seu tempo total e, abaixo, suas partes com tempo, início e término planejados, pronta para salvar em PDF ou imprimir.

**Why this priority**: Facilita consultar longe do computador, mas depende dos dados das histórias anteriores.

**Independent Test**: Com 2 produtos cadastrados, gerar a ficha e conferir que lista ambos com total e partes.

**Acceptance Scenarios**:

1. **Given** produtos com partes cadastradas, **When** a ficha é gerada, **Then** cada produto aparece com total e as partes listadas abaixo com tempo, início e término.
2. **Given** um produto de linha única, **Then** a ficha mostra só o produto com seu tempo.
3. **Given** o menu vazio, **Then** a ficha informa que não há itens.

---

### Edge Cases

- Tempo de impressão zero, negativo ou vazio: não é aceito; a linha mostra o erro.
- Tempos que ultrapassam 24h: o término indica "+N dias".
- Produto do catálogo excluído depois de estar no menu: o item sai do menu junto.
- Tentar adicionar um produto que já está no menu: o sistema abre o existente em vez de duplicar.
- Impressão importada sem nome de parte: recebe o nome da impressão/produto como fallback.
- Nomes iguais com diferença de maiúsculas/espaços nas pontas são tratados como a mesma parte na importação.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O painel admin MUST ter um item de menu "Tempo de Impressão" que abre a tela de planejamento.
- **FR-002**: O administrador MUST poder selecionar qualquer produto existente do catálogo, publicado ou não, para adicionar ao menu.
- **FR-003**: Cada produto no menu MUST ter uma ou mais linhas (partes ou o produto inteiro), cada uma com nome e tempo de impressão em horas e minutos.
- **FR-004**: O sistema MUST exibir o tempo total do produto (soma das linhas).
- **FR-005**: Cada linha MUST ter um horário de início opcional (hora:minuto), salvo de forma persistente.
- **FR-006**: O sistema MUST exibir o término (início + tempo), indicando quando cai no(s) dia(s) seguinte(s).
- **FR-007**: O administrador MUST poder editar nome, tempo e início de uma linha.
- **FR-008**: O administrador MUST poder remover uma linha, várias linhas selecionadas de uma vez, ou o produto inteiro do menu (sem afetar o produto no catálogo).
- **FR-009**: A tela de Produção MUST oferecer, na apuração de cada produto, um botão que envia as impressões marcadas para o menu "Tempo de Impressão".
- **FR-010**: Na importação, partes com o mesmo nome (ignorando maiúsculas e espaços nas pontas) MUST ter o tempo atualizado; as novas MUST ser adicionadas; as não enviadas MUST permanecer.
- **FR-011**: O sistema MUST gerar uma ficha em lista, salvável em PDF, com cada produto, tempo total e suas partes (tempo, início, término).
- **FR-012**: Todos os textos MUST seguir o padrão de internacionalização existente do projeto.
- **FR-013**: Erros de gravação MUST ser exibidos ao administrador e não podem ser ocultados nas respostas do servidor.
- **FR-014**: Somente administradores autenticados MUST ter acesso ao menu e às suas operações.

### Key Entities

- **Plano de impressão do produto**: vínculo de um produto do catálogo com o menu; um por produto.
- **Item de impressão**: parte (ou produto inteiro) pertencente a um plano; nome, tempo de impressão, horário de início opcional e ordem de exibição.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O administrador cadastra um produto com 4 partes e seus tempos em menos de 2 minutos.
- **SC-002**: Levar as peças marcadas da Produção para o menu exige no máximo 1 clique após marcar.
- **SC-003**: O término exibido está correto em 100% dos casos, inclusive virada de dia.
- **SC-004**: A ficha gerada mostra todos os produtos e partes do menu, legível numa página A4 por até ~20 linhas.
- **SC-005**: Horários e tempos permanecem iguais após recarregar a página.

## Assumptions

- O menu é uma lista única global (uma loja, um administrador); não há várias "filas" ou datas de planejamento.
- O horário de início é apenas hora:minuto (sem data); o término indica a virada de dia relativa ao início.
- O tempo de impressão deste menu é independente do "Tempo de impressão (h)" do custo de produção do produto; não altera o cadastro de custo.
- A ficha "PDF" é gerada como página de impressão do navegador ("Salvar como PDF"), seguindo o padrão já usado na calculadora.
- Não há controle de conflito de impressora (uma impressora só) nem sequenciamento automático nesta versão.
