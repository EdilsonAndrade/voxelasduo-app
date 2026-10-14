# Feature Specification: Duplicar cálculo e imprimir orçamentos

**Feature Branch**: `031-calculadora-duplicar-imprimir`
**Created**: 2026-10-14
**Status**: Draft
**Input**: User description: "Na calculadora, duplicar um item com outro nome (gato 5 cm → gato 10 cm) e informar a altura da peça (opcional) ao lado do filamento. Imprimir a lista do que já orcei, marcando o que quero, para mostrar aos sócios: produto, custo, quantos cabem na mesa, horas da mesa, preço do concorrente, preço para anunciar cobrindo o ROAS e o ROAS, lucro no mês vendendo avulso e em kit, margem — tudo o que for preciso para negociar."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Duplicar um cálculo com outro nome (Priority: P1)

O avaliador orçou "Gato 5 cm" e quer orçar o mesmo gato em 10 cm sem redigitar tudo. Com o cálculo aberto, escolhe duplicar, digita o nome novo e cai na cópia já salva, onde só ajusta tempo, gramas e altura.

**Why this priority**: É o uso diário — variar tamanho do mesmo produto — e alimenta a lista que será impressa.

**Independent Test**: Abrir um cálculo salvo, duplicar como "Gato 10 cm", ver a cópia aberta com os mesmos valores e os dois na lista de salvos.

**Acceptance Scenarios**:

1. **Given** o cálculo "Gato 5 cm" aberto, **When** duplica com o nome "Gato 10 cm", **Then** um novo cálculo salvo é criado com os valores e links da tela e a calculadora abre nele.
2. **Given** o cálculo original já virou produto, **When** duplica, **Then** a cópia não fica ligada ao produto.
3. **Given** o nome novo em branco, **Then** o botão de duplicar fica desabilitado.
4. **Given** a duplicação falha no servidor, **When** confirma, **Then** a mensagem de erro aparece e o original continua aberto.

---

### User Story 2 - Informar a altura da peça (Priority: P1)

Ao lado de "Filamento usado", um campo opcional "Altura da peça" (cm) diferencia tamanhos do mesmo produto. Aparece na lista de salvos e na impressão.

**Independent Test**: Digitar 10 na altura, salvar, reabrir e ver o valor; ver "10 cm" ao lado do nome na lista.

**Acceptance Scenarios**:

1. **Given** um cálculo, **When** informa altura 10 e salva, **Then** ao reabrir a altura é 10 e a lista mostra "10 cm".
2. **Given** a altura vazia, **When** salva, **Then** salva normalmente e nada de altura aparece.

---

### User Story 3 - Imprimir os orçamentos escolhidos para os sócios (Priority: P1)

Na lista de cálculos salvos o avaliador marca os itens e manda imprimir. Abre uma página pronta para impressão em A4 deitado, com uma tabela: cada produto tem uma linha "Avulso" e uma linha "Kit N". Antes de imprimir ele escolhe o canal (Shopee ou Mercado Livre) e o tamanho do kit (2, 3 ou 4).

**Independent Test**: Marcar 3 cálculos, imprimir, trocar canal e kit e ver os números mudarem; a impressão do navegador mostra só o cabeçalho e a tabela.

**Acceptance Scenarios**:

1. **Given** 3 cálculos marcados, **When** clica "Imprimir selecionados", **Then** abre a página com 6 linhas (avulso + kit para cada).
2. **Given** a página aberta, **When** troca o canal para Mercado Livre, **Then** preços e taxa refletem o Mercado Livre e o ROAS aparece também como ACOS.
3. **Given** um cálculo sem custo completo (sem tempo ou gramas), **When** imprime, **Then** a linha do produto aparece com "falta custo" em vez de números.
4. **Given** nenhum cálculo marcado, **Then** o botão de imprimir fica desabilitado.
5. **Given** um id que não existe mais, **When** a página carrega, **Then** ele é ignorado e aparece um aviso de quantos não foram encontrados.

Colunas por linha: produto (com altura), venda (Avulso/Kit N), custo do pedido, peças por mesa, horas da mesa cheia, preço do concorrente, preço para anunciar (cobre taxa, anúncio na meta de ROAS e a margem), ROAS (ACOS no ML), lucro por pedido, margem em % do preço, pedidos no mês, faturamento no mês e lucro no mês.

### Edge Cases

- Cálculo antigo sem meta de ROAS → usa 8.
- Cálculo em modo "sem anúncio" ou "do bolso" → na impressão o preço sempre embute o anúncio na meta de ROAS do cálculo (é o preço para anunciar).
- Margens diferentes entre cálculos → cada linha mostra a margem do seu cálculo.
- Não existe preço possível (taxa + anúncio + margem ≥ 100%) → linha mostra "sem preço possível".
- Sem produção informada → peças/mesa, horas e mês ficam "—".
- Sem preço do concorrente → "—".

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Com um cálculo salvo aberto, o sistema MUST oferecer "Duplicar com outro nome", com o nome sugerido "<nome> (cópia)" editável.
- **FR-002**: A duplicação MUST criar um novo cálculo salvo com os valores atuais da tela, nome novo e mesmos links, sem vínculo com produto, e abrir a cópia.
- **FR-003**: A calculadora MUST ter o campo opcional "Altura da peça" (cm) ao lado de "Filamento usado", guardado com o cálculo; não entra no custo.
- **FR-004**: A lista de cálculos salvos MUST mostrar a altura ao lado do nome quando informada.
- **FR-005**: A lista MUST permitir marcar/desmarcar cálculos (incluindo marcar todos) e abrir a impressão dos marcados.
- **FR-006**: A página de impressão MUST mostrar, por cálculo, uma linha Avulso e uma linha Kit com as colunas da US3.
- **FR-007**: O preço para anunciar MUST cobrir custo, taxa do canal (mesmas regras da calculadora, incluindo faixas da Shopee e adicional CPF), anúncio = 1/ROAS do preço e a margem do cálculo.
- **FR-008**: Kit MUST usar o custo das peças somadas com uma embalagem só (mesma regra da calculadora); pedidos no mês = peças no mês ÷ unidades do pedido.
- **FR-009**: A página MUST permitir escolher canal (Shopee/Mercado Livre) e kit (2/3/4) sem sair dela, e a impressão do navegador MUST mostrar só cabeçalho, premissas e tabela.
- **FR-010**: O cabeçalho MUST mostrar canal, kit, data e como o anúncio entra no preço.
- **FR-011**: Erros de gravação MUST aparecer na tela com a mensagem e o status real retornado.

### Key Entities

- **Cálculo de preço salvo** (existente): ganha `altura da peça (cm)` opcional.
- **Linha de orçamento** (derivada, não gravada): cálculo + canal + unidades por pedido → preço, lucro e mês.

## Success Criteria *(mandatory)*

- **SC-001**: Criar a variação de tamanho de um produto leva menos de 15 segundos (duplicar + digitar nome).
- **SC-002**: Uma lista de até 12 produtos cabe em 1 folha A4 deitada.
- **SC-003**: Os valores da impressão batem com os da calculadora para o mesmo cálculo, canal e modo "embutido no preço".
- **SC-004**: Os sócios entendem cada coluna sem explicação (cabeçalhos e premissas autoexplicativos).

## Assumptions

- Sem card no Linear (usuário dispensou nas features anteriores da calculadora).
- A impressão usa a do navegador (inclui "Salvar como PDF") — sem gerar arquivo no servidor.
- Canal padrão Shopee; kit padrão 2.
- Venda direta (sem taxa) fica fora da impressão nesta versão.
- Textos pt-BR inline (o projeto não tem biblioteca de i18n).
