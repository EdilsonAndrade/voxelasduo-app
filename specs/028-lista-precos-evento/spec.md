# Feature Specification: Lista de preços para evento e edição rápida de preços

**Feature Branch**: `edilsonaandrade/edi-126-lista-de-precos-para-evento-pdf-e-edicao-rapida-de-precos`
**Created**: 2026-10-01
**Status**: Draft
**Linear**: EDI-126
**Input**: User description: "Imprimir em PDF a lista dos produtos escolhidos, em ordem alfabética, com nome e preço, para levar ao evento. Editar o preço do site e do Mercado Livre direto pela lista de produtos (salvando linha a linha). Mostrar na lista o custo de produção de cada item. Bom no mobile."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Lista de preços impressa para o evento (Priority: P1)

O admin escolhe na lista de produtos quais itens levará ao evento e gera uma lista de preços pronta para imprimir ou salvar em PDF. A lista mostra, em ordem alfabética, o nome de cada produto com o preço ao lado, em letra grande o bastante para consulta rápida durante o atendimento.

**Why this priority**: É a necessidade imediata do próximo evento; sem ela o admin não tem como informar preços com segurança.

**Independent Test**: Marcar 5 produtos, gerar a lista e salvar como PDF; conferir que só os 5 aparecem, em ordem alfabética, com o preço correto.

**Acceptance Scenarios**:

1. **Given** a lista de produtos no admin, **When** o admin marca alguns produtos e pede a lista de preços, **Then** abre uma página só com os produtos marcados, em ordem alfabética (ignorando maiúsculas e acentos), com nome e preço do site.
2. **Given** a página da lista de preços, **When** o admin manda imprimir, **Then** a impressão sai limpa (sem menus, botões ou cabeçalho do site), com título e data, pronta para salvar em PDF.
3. **Given** nenhum produto marcado, **When** o admin tenta gerar a lista, **Then** a ação fica indisponível e uma orientação indica que é preciso marcar ao menos um produto.
4. **Given** a lista de produtos, **When** o admin usa "marcar todos", **Then** todos os produtos visíveis ficam marcados (e "desmarcar todos" limpa a seleção).

---

### User Story 2 - Editar preços direto na lista (Priority: P2)

O admin ajusta o preço do site e o preço no Mercado Livre de vários produtos direto na lista, sem abrir cada produto. Pode alterar várias linhas, mas cada linha só é gravada quando ele toca em "Salvar" naquela linha.

**Why this priority**: Facilita aplicar uma margem maior antes do evento e depois imprimir a lista já atualizada.

**Independent Test**: Alterar o preço de um produto na lista, salvar a linha, recarregar a página e conferir o novo valor (no site e na edição do produto).

**Acceptance Scenarios**:

1. **Given** uma linha da lista, **When** o admin altera o preço do site e/ou do Mercado Livre, **Then** a linha indica que há alteração não salva e o botão "Salvar" daquela linha fica ativo.
2. **Given** alterações em várias linhas, **When** o admin salva uma delas, **Then** só aquela linha é gravada; as outras continuam com a alteração pendente.
3. **Given** um produto com anúncio no Mercado Livre, **When** o preço é salvo, **Then** o anúncio é atualizado do mesmo jeito que acontece ao salvar pela tela de edição do produto.
4. **Given** o campo de preço do Mercado Livre vazio, **When** o admin salva, **Then** o Mercado Livre passa a usar o preço do site (mesma regra da tela de edição).
5. **Given** um valor inválido (vazio no preço do site, zero ou negativo), **When** o admin tenta salvar, **Then** aparece uma mensagem de erro junto da linha e nada é gravado.
6. **Given** uma falha ao gravar, **When** o servidor responde com erro, **Then** a mensagem aparece na linha e os valores digitados são mantidos para nova tentativa.
7. **Given** alterações não salvas, **When** o admin tenta sair da página, **Then** o navegador avisa que há alterações não salvas.

---

### User Story 3 - Custo de produção na lista (Priority: P3)

A lista de produtos mostra o custo total de produção de cada item, ao lado dos preços, para o admin decidir a margem na hora de editar.

**Why this priority**: Apoia a edição de preços (P2), mas a lista já é útil sem ele.

**Independent Test**: Abrir a lista e conferir que o custo de um produto bate com o custo total exibido na tela de edição dele.

**Acceptance Scenarios**:

1. **Given** um produto com custo de produção configurado, **When** a lista é exibida, **Then** aparece o custo total por peça (o mesmo da tela de edição).
2. **Given** um produto sem custo configurado, **When** a lista é exibida, **Then** aparece "—".
3. **Given** a lista de preços impressa, **Then** o custo **não** aparece nela (é informação interna).

---

### Edge Cases

- Produto com nome muito longo: quebra em mais de uma linha na impressão sem empurrar o preço para fora.
- Lista com muitos produtos: a impressão continua em várias páginas, sem cortar uma linha no meio.
- Seleção feita com filtro de carrossel ativo: a lista impressa usa só os marcados, sempre em ordem alfabética.
- Preço digitado com vírgula ("49,90") ou ponto ("49.90"): ambos são aceitos.
- Linha salva com sucesso: os valores salvos passam a ser o novo "original" e o aviso de pendência some.
- Falha ao atualizar o anúncio do Mercado Livre não impede salvar o preço no site (mesmo comportamento da tela de edição).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A lista de produtos do admin MUST permitir marcar e desmarcar produtos individualmente, além de marcar/desmarcar todos os visíveis.
- **FR-002**: O admin MUST conseguir abrir, a partir da seleção, uma lista de preços com os produtos marcados.
- **FR-003**: A lista de preços MUST mostrar, para cada produto, o nome e o preço de venda do site, em ordem alfabética (sem diferenciar maiúsculas e acentos).
- **FR-004**: A lista de preços MUST ter um título, a data de geração e uma ação "Imprimir / salvar PDF"; ao imprimir, só o conteúdo da lista aparece.
- **FR-005**: A lista de preços MUST ser legível de relance: texto grande, linhas alternadas ou separadas e preço alinhado à direita.
- **FR-006**: A lista de produtos MUST oferecer campos editáveis para o preço do site e o preço no Mercado Livre de cada produto.
- **FR-007**: Cada linha MUST ter seu próprio botão "Salvar", que grava só os preços daquela linha.
- **FR-008**: Linhas com alteração não salva MUST ser destacadas visualmente; o navegador MUST avisar ao sair da página com alterações pendentes.
- **FR-009**: Salvar preços na lista MUST seguir as mesmas regras e efeitos da tela de edição do produto (validação e atualização do anúncio do Mercado Livre).
- **FR-010**: Erros de validação ou do servidor MUST aparecer junto da linha, mantendo os valores digitados; o erro MUST continuar visível na aba Network com o status real.
- **FR-011**: A lista de produtos MUST mostrar o custo total de produção por peça de cada produto, ou "—" quando não configurado.
- **FR-012**: A lista de produtos (incluindo seleção e edição de preços) MUST ser utilizável no celular, sem rolagem horizontal da página.
- **FR-013**: Todos os textos novos MUST seguir o padrão de idioma já existente no admin (pt-BR).

### Key Entities

- **Produto**: já existente. Usa nome, preço do site, preço próprio do Mercado Livre (opcional) e dados de custo de produção (opcional).
- **Seleção para a lista de preços**: conjunto temporário dos produtos marcados; não é gravado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O admin gera e salva em PDF a lista de preços de 30 produtos em menos de 1 minuto.
- **SC-002**: Na lista impressa, qualquer preço é encontrado em menos de 5 segundos por quem está atendendo.
- **SC-003**: Ajustar o preço de 10 produtos leva menos de 3 minutos, sem abrir nenhuma tela de edição.
- **SC-004**: 100% dos custos exibidos na lista batem com o custo total da tela de edição do produto.
- **SC-005**: Em um celular de 360px de largura, todas as ações (marcar, editar, salvar, gerar lista) são feitas sem rolagem horizontal.

## Assumptions

- Só o admin (papel `admin`) acessa a lista de produtos e a lista de preços; a equipe do evento não.
- O preço impresso é o preço do site (preço de venda do evento); o preço do Mercado Livre não vai para a impressão.
- O PDF é obtido pelo "Salvar como PDF" do navegador; não há download de arquivo gerado pelo servidor.
- A seleção não precisa ser lembrada entre visitas.
- O preço da Shopee fica fora do escopo da edição na lista.
- O custo exibido é o custo total por peça boa (inclui depreciação, mão de obra, embalagem, acessórios e falha), igual ao da tela de edição.
