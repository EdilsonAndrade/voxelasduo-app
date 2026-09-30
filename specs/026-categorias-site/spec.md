# Feature Specification: Cadastro de categorias do site

**Feature Branch**: `edilsonaandrade/edi-123-cadastro-de-categorias-do-site-no-admin-fim-da-categoria-em`
**Linear**: EDI-123
**Created**: 2026-09-30
**Status**: Draft
**Input**: User description: "Cadastro de categorias do site no admin (fim da categoria em texto livre). Hoje a categoria é texto livre e a vitrine exibe duplicatas ('acessorios' vs 'acessórios'). Criar categorias gerenciadas no admin, seleção com busca no cadastro e na listagem, 'Diversos' como padrão, migração dos produtos existentes e redirecionamento das URLs antigas. Somente para o site; Mercado Livre e demais canais mantêm o padrão existente."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Vitrine sem categorias duplicadas (Priority: P1)

O visitante da loja vê os filtros de categoria da vitrine sem duplicatas por variação de digitação (acento, maiúsculas, espaços). Os produtos que hoje estão em "acessorios" e "acessórios" aparecem juntos em uma única categoria "Acessórios".

**Why this priority**: É o problema visível ao cliente hoje e o motivo do ticket.

**Independent Test**: Após a migração, abrir `/produtos` e conferir que cada categoria aparece uma única vez e que todos os produtos continuam acessíveis.

**Acceptance Scenarios**:

1. **Given** produtos cadastrados com "acessorios" e "acessórios", **When** a migração é executada, **Then** todos passam a pertencer à categoria "Acessórios" e a vitrine exibe um único filtro "Acessórios".
2. **Given** um produto com categoria em texto que não corresponde a nenhuma categoria cadastrada, **When** a migração é executada, **Then** o produto passa a pertencer a "Diversos".
3. **Given** uma categoria cadastrada sem nenhum produto ativo, **When** o visitante abre a vitrine, **Then** essa categoria não aparece nos filtros.

---

### User Story 2 - Escolher a categoria no cadastro/edição do produto (Priority: P1)

Ao cadastrar ou editar um produto, a vendedora escolhe a categoria em um campo de seleção com busca (digita parte do nome e seleciona), em vez de digitar o texto livremente. Se não escolher nenhuma, o produto vai para "Diversos".

**Why this priority**: Sem isso as duplicatas voltam a surgir a cada novo cadastro.

**Independent Test**: Criar um produto escolhendo "Religioso" pela busca e outro sem escolher categoria. Conferir que o primeiro aparece em Religioso e o segundo em Diversos.

**Acceptance Scenarios**:

1. **Given** o formulário de produto aberto, **When** a vendedora digita "rel" no campo de categoria, **Then** a lista é filtrada e mostra "Religioso", que pode ser selecionada.
2. **Given** o formulário de produto sem categoria escolhida, **When** o produto é salvo, **Then** ele é gravado na categoria "Diversos".
3. **Given** o formulário de produto, **When** a vendedora tenta informar um nome que não existe na lista, **Then** não é possível salvar com uma categoria inexistente (só as cadastradas podem ser escolhidas).

---

### User Story 3 - Gerenciar categorias no admin (Priority: P2)

A vendedora acessa uma tela de categorias no painel administrativo, onde pode criar novas categorias (ex.: "Religioso"), renomeá-las, reordená-las e removê-las.

**Why this priority**: Permite evoluir o catálogo sem depender de desenvolvimento, mas o site funciona com as categorias iniciais.

**Independent Test**: Criar a categoria "Natal", renomeá-la para "Natalinos" e removê-la, conferindo a lista após cada passo.

**Acceptance Scenarios**:

1. **Given** a tela de categorias, **When** a vendedora cria "Natal", **Then** ela aparece na lista e fica disponível no campo de categoria dos produtos.
2. **Given** uma categoria já existente "Acessórios", **When** a vendedora tenta criar "acessorios", **Then** o sistema recusa informando que já existe uma categoria equivalente.
3. **Given** uma categoria com produtos, **When** a vendedora a renomeia, **Then** os produtos continuam nela, a vitrine exibe o novo nome e o endereço dos produtos não muda (o identificador de endereço da categoria é fixo após a criação).
4. **Given** uma categoria com N produtos, **When** a vendedora pede para removê-la, **Then** o sistema informa que N produtos serão movidos para "Diversos" e, após a confirmação, remove a categoria e move os produtos.
5. **Given** a categoria "Diversos", **When** a vendedora tenta removê-la, **Then** a ação não está disponível.

---

### User Story 4 - Trocar a categoria direto na listagem de produtos (Priority: P2)

Na listagem de produtos do admin, cada linha exibe a categoria atual em um campo de seleção com busca. A vendedora abre o campo, pesquisa ou rola a lista, seleciona outra categoria e a troca é salva na hora, sem abrir a edição do produto.

**Why this priority**: Acelera a reorganização do catálogo (ex.: mover vários itens para "Religioso"), mas também é possível fazer pela edição.

**Independent Test**: Na listagem, trocar a categoria de um produto de "Diversos" para "Religioso" e conferir na vitrine que ele aparece no novo filtro.

**Acceptance Scenarios**:

1. **Given** a listagem de produtos, **When** a vendedora abre o seletor de uma linha, **Then** vê todas as categorias e pode selecionar uma diretamente.
2. **Given** o seletor aberto, **When** a vendedora digita parte do nome, **Then** a lista é filtrada e ela pode selecionar um dos resultados.
3. **Given** uma troca salva com sucesso, **When** a operação termina, **Then** a linha exibe a nova categoria com uma confirmação discreta. Se falhar, a categoria anterior é restaurada e o erro é exibido.

---

### User Story 5 - Links antigos continuam funcionando (Priority: P2)

Quem acessar um endereço antigo de produto (link compartilhado, resultado do Google, item antigo no carrinho) é levado automaticamente para o endereço atual do produto, em vez de cair na página "não encontrada".

**Why this priority**: Evita perda de vendas e de posicionamento de busca após a migração, a renomeação ou a troca de categoria.

**Independent Test**: Anotar o endereço de um produto, trocar a categoria dele e acessar o endereço anotado.

**Acceptance Scenarios**:

1. **Given** o produto "Terço" em `/produtos/acessorios/terco`, **When** ele é movido para "Religioso" e alguém acessa o endereço antigo, **Then** é redirecionado permanentemente para `/produtos/religioso/terco`.
2. **Given** a categoria "acessorios" que foi unificada com "Acessórios", **When** alguém acessa `/produtos/acessorios`, **Then** é redirecionado para a página da categoria atual.

---

### Edge Cases

- Produtos com o mesmo slug que passam a ficar na mesma categoria após a unificação ou a troca: o sistema deve evitar o conflito de endereço (ex.: ajustando o slug do produto que chegou) sem perder o redirecionamento do endereço antigo.
- Nome de categoria vazio, só com espaços ou equivalente a um existente (diferença só de acento/maiúsculas): recusado.
- Um endereço antigo que passa a coincidir com o endereço de outro produto existente: o produto existente prevalece, sem redirecionamento.
- Um produto que troca de categoria várias vezes: qualquer endereço antigo leva ao endereço atual em um único redirecionamento.
- Um item salvo no carrinho do cliente com a categoria antiga: o link do item funciona via redirecionamento, e o checkout não é afetado.
- Uma categoria removida enquanto alguém está com a página dela aberta: o próximo acesso redireciona ou mostra a vitrine geral, nunca um erro.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST manter um cadastro de categorias do site com nome de exibição, identificador de endereço (slug) único e ordem de exibição.
- **FR-002**: O sistema MUST disponibilizar as categorias iniciais: Diversos, Organizadores, Acessórios, Decoração, Presentes e Religioso.
- **FR-003**: A categoria "Diversos" MUST existir sempre e não pode ser removida (pode ser renomeada só no nome de exibição).
- **FR-004**: A vendedora MUST poder criar, renomear, reordenar e remover categorias pelo painel administrativo.
- **FR-005**: O sistema MUST recusar categorias com nome vazio ou equivalente a uma existente (comparação que ignora acentos, maiúsculas e espaços extras).
- **FR-006**: Ao remover uma categoria com produtos, o sistema MUST informar quantos produtos serão afetados, pedir confirmação e movê-los para "Diversos".
- **FR-007**: Todo produto MUST pertencer a exatamente uma categoria cadastrada. Produto sem categoria escolhida MUST ser gravado em "Diversos".
- **FR-008**: O formulário de cadastro/edição de produto MUST oferecer seleção de categoria com busca, restrita às categorias cadastradas.
- **FR-009**: A listagem de produtos do admin MUST permitir trocar a categoria de cada produto por um seletor com busca, salvando imediatamente e mostrando sucesso ou erro.
- **FR-010**: O sistema MUST migrar os produtos existentes: textos equivalentes (ignorando acentos/maiúsculas/espaços) são associados à categoria cadastrada correspondente. Textos sem correspondência vão para "Diversos".
- **FR-011**: A migração MUST ser idempotente (executá-la novamente não altera o resultado) e MUST gerar um relatório com quantos produtos foram movidos para cada categoria.
- **FR-012**: A vitrine MUST montar os filtros a partir das categorias cadastradas, na ordem definida, exibindo apenas as que têm ao menos um produto visível.
- **FR-013**: Quando o endereço de um produto ou de uma categoria mudar (migração, troca de categoria, mudança do nome do produto, remoção da categoria), o endereço antigo MUST redirecionar permanentemente para o endereço atual. Renomear uma categoria altera só o nome exibido, não o endereço.
- **FR-014**: Home, carrosséis, carrinho, feed do Facebook/Instagram e demais pontos que exibem links de produto MUST passar a usar o endereço atual sem ação manual.
- **FR-015**: A categoria do anúncio no Mercado Livre e em outros canais MUST continuar independente e inalterada por esta funcionalidade.
- **FR-016**: Todos os textos novos da interface MUST seguir o padrão de internacionalização existente no projeto.
- **FR-017**: Erros das operações de categoria MUST ser retornados com status HTTP adequado (visíveis na aba Network), sem mascarar falhas.

### Key Entities

- **Categoria do site**: agrupamento de produtos exibido na vitrine. Atributos: nome de exibição, slug (endereço), ordem, indicação de categoria padrão ("Diversos").
- **Produto**: passa a referenciar uma Categoria do site, em vez de guardar um texto livre.
- **Redirecionamento de endereço**: associação entre um endereço antigo (de produto ou de categoria) e o destino atual, usada para levar o visitante ao lugar certo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Após a migração, 0 categorias duplicadas por variação de digitação na vitrine.
- **SC-002**: 100% dos produtos existentes permanecem acessíveis após a migração, tanto pelo endereço novo quanto pelo antigo.
- **SC-003**: A vendedora troca a categoria de um produto pela listagem em menos de 10 segundos, sem abrir a edição.
- **SC-004**: 100% dos endereços antigos de produtos levam ao produto correto em um único redirecionamento.
- **SC-005**: Nenhum produto novo fica sem categoria ou com uma categoria fora do cadastro.

## Assumptions

- O escopo é apenas a categoria do site. As categorias do Mercado Livre (seletor próprio) e dos demais canais permanecem como estão (confirmado pelo usuário).
- Só usuários do painel administrativo já autenticados gerenciam categorias. Não há níveis de permissão novos.
- Remover uma categoria com produtos move-os para "Diversos" após confirmação, em vez de bloquear a remoção.
- A troca de categoria na listagem é feita produto a produto (sem troca em massa nesta entrega).
- As categorias em uso hoje (Organizadores, acessorios/acessórios, decoração, presentes) têm todas uma equivalente na lista inicial. Qualquer outro texto encontrado vai para "Diversos" e pode ser reorganizado pela listagem.
- Não há hierarquia (subcategorias) nas categorias do site.
