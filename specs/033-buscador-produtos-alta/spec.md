# Feature Specification: Buscador de produtos em alta por categoria

**Feature Branch**: `edilsonaandrade/edi-130-buscador-de-produtos-em-alta-por-categoria-mais-vendidos-e`
**Created**: 2026-10-15
**Status**: Draft
**Input**: Linear EDI-130 — "Buscador de produtos em alta por categoria (mais vendidos e mais procurados no ML)". Inspirado no Product Finder do STL Seller ("O que está em alta agora"), usando só os dados que o Mercado Livre libera para a loja, sem custo extra.

## Fontes de dados (já validadas em EDI-107 e na Pesquisa de nichos)

- **Mercado Livre** (conta da loja já conectada): ranking de mais vendidos por categoria (posição), termos mais buscados por categoria (posição) e busca no catálogo de produtos por nome (nome e foto). **Não** há preço, desconto, quantidade vendida nem visitas de anúncios de outros vendedores — bloqueio do próprio ML. Esses dados ficam para a EDI-129 (fornecedor pago).
- **Shopee** e **MakerWorld**: só como links de busca abertos pelo usuário; o sistema não lê dados dessas lojas nesta versão.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver o que mais vende numa categoria (Priority: P1)

O avaliador abre "Produtos em alta" no admin, escolhe uma das 16 categorias de impressão 3D (ex.: Banheiros) e vê uma grade de cards com os produtos mais vendidos dessa categoria no Mercado Livre, em ordem de posição, cada um com foto, nome e o selo da posição ("1º mais vendido").

**Why this priority**: É o núcleo do pedido — enxergar rápido, com foto, o que já vende para decidir o que imprimir.

**Independent Test**: Selecionar "Banheiros" com a ordenação "Mais vendidos" e conferir a grade em ordem 1º, 2º, 3º… com foto e nome.

**Acceptance Scenarios**:

1. **Given** o avaliador no admin, **When** escolhe a categoria "Banheiros" com "Mais vendidos", **Then** vê os produtos mais vendidos da categoria em ordem de posição, cada um com foto, nome e posição.
2. **Given** um produto do ranking sem nome ou foto disponível, **When** a grade é exibida, **Then** o card aparece com um texto/ícone substituto (ex.: "Produto sem nome disponível") em vez de sumir ou quebrar a grade.
3. **Given** uma categoria sem ranking disponível no momento, **When** é selecionada, **Then** aparece a mensagem "Nenhum produto em destaque nesta categoria agora", não um erro.
4. **Given** nenhuma categoria selecionada ("Todas"), **When** a tela abre, **Then** a grade mostra os mais vendidos das 16 categorias juntos, com o nome da categoria em cada card.

---

### User Story 2 - Ver o que as pessoas mais procuram (Priority: P1)

Na mesma tela, o avaliador troca a ordenação para "Mais procurados" e vê os termos mais buscados da categoria no Mercado Livre, cada termo como um card com a foto do produto mais relevante para aquele termo e o selo da posição ("3º mais buscado").

**Why this priority**: Demanda (o que procuram) é tão importante quanto venda para achar nicho antes da concorrência; é o segundo eixo pedido pelo usuário.

**Independent Test**: Selecionar "Organização para Casa" com "Mais procurados" e conferir cards em ordem de posição, com termo e foto.

**Acceptance Scenarios**:

1. **Given** uma categoria selecionada, **When** o avaliador escolhe "Mais procurados", **Then** vê os termos mais buscados da categoria, em ordem, cada um com o termo, a posição e a foto de um produto relacionado.
2. **Given** um termo sem produto relacionado com foto, **When** é exibido, **Then** o card mostra o termo com uma imagem substituta.
3. **Given** "Todas" as categorias, **When** escolhe "Mais procurados", **Then** vê os termos das 16 categorias, com o nome da categoria em cada card.

---

### User Story 3 - Abrir o item nas lojas e no MakerWorld (Priority: P1)

Em qualquer card, o avaliador clica num ícone para abrir o item no Mercado Livre, outro para buscar o mesmo nome na Shopee e outro para buscar o mesmo nome no MakerWorld — cada um em nova aba.

**Why this priority**: É o que transforma a descoberta em ação: conferir preço/vendas na loja e achar o modelo para imprimir.

**Independent Test**: Clicar nos três ícones de um card e conferir que cada aba abre com o item ou a busca pelo nome correto.

**Acceptance Scenarios**:

1. **Given** um card de produto do Mercado Livre, **When** clica em "Ver no Mercado Livre", **Then** abre em nova aba a página do produto ou, se não houver página direta, a busca pelo nome no Mercado Livre.
2. **Given** um card, **When** clica em "Buscar na Shopee", **Then** abre em nova aba a busca da Shopee com o nome do item.
3. **Given** um card, **When** clica em "Buscar no MakerWorld", **Then** abre em nova aba a busca do MakerWorld com o nome do item.
4. **Given** um card sem nome disponível, **When** exibido, **Then** os ícones de busca na Shopee e no MakerWorld ficam desativados com dica explicando o motivo.

---

### User Story 4 - Pesquisar por nome (Priority: P2)

O avaliador digita um nome no campo de busca (ex.: "papel higiênico"). Com uma categoria selecionada, a busca fica restrita a ela; com "Todas", busca em todo o catálogo do Mercado Livre. Os resultados aparecem na mesma grade de cards, com os mesmos ícones.

**Why this priority**: Complementa a navegação por categoria para quem já tem uma ideia em mente; a tela já entrega valor sem ela.

**Independent Test**: Buscar "papel higiênico" com "Todas" e depois com "Banheiros" e conferir que os resultados mudam conforme o filtro.

**Acceptance Scenarios**:

1. **Given** nenhuma categoria selecionada, **When** busca "papel higiênico", **Then** vê produtos do catálogo do Mercado Livre relacionados ao termo, com foto e nome.
2. **Given** a categoria "Banheiros" selecionada, **When** busca "papel higiênico", **Then** vê apenas resultados daquela categoria (no ranking, nos termos mais procurados ou no catálogo dela).
3. **Given** um termo sem nenhum resultado, **When** busca, **Then** vê "Nenhum produto encontrado para este termo" e a sugestão de limpar o filtro de categoria.
4. **Given** o campo vazio ou só com espaços, **When** tenta buscar, **Then** volta à listagem da categoria/ordenação atual sem fazer busca.
5. **Given** uma busca feita, **When** clica em "Limpar filtros", **Then** a tela volta para "Todas" + "Mais vendidos" sem termo.

---

### User Story 5 - Resultado guardado por 24h (Priority: P3)

A mesma categoria/ordenação/busca repetida em menos de 24h usa o resultado guardado, com a indicação de quando foi obtido e o botão "Atualizar".

**Why this priority**: Evita estourar o limite de chamadas do Mercado Livre e deixa a navegação rápida; não muda o que a tela mostra.

**Independent Test**: Abrir a mesma categoria duas vezes e conferir a indicação "obtido às HH:MM" e o botão "Atualizar".

**Acceptance Scenarios**:

1. **Given** uma categoria consultada há menos de 24h, **When** é aberta de novo, **Then** o resultado aparece imediatamente com a hora em que foi obtido.
2. **Given** um resultado guardado, **When** clica em "Atualizar", **Then** os dados são buscados de novo no Mercado Livre.
3. **Given** o Mercado Livre fora do ar e um resultado guardado vencido, **When** a categoria é aberta, **Then** o resultado vencido é exibido com aviso de que pode estar desatualizado.

### Edge Cases

- Conta do Mercado Livre desconectada ou token inválido: a tela mostra a mensagem de reconectar a conta e a resposta de erro aparece na aba Network (regra 3 do CLAUDE.md).
- Limite de chamadas do Mercado Livre atingido: mensagem "Muitas consultas ao Mercado Livre, aguarde alguns minutos", com o erro visível na aba Network.
- "Todas" as categorias com falha em parte delas: as categorias que responderam aparecem; um aviso lista as que falharam.
- Item repetido em mais de uma categoria (no "Todas"): aparece uma vez só, com a melhor posição.
- Nome com acentos ou caracteres especiais: links da Shopee, MakerWorld e Mercado Livre abrem com o termo corretamente codificado.
- Item do ranking que não é produto de catálogo (anúncio de outro vendedor sem nome legível): card com texto substituto e link "Ver no Mercado Livre" pela categoria.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A tela MUST oferecer filtro com as 16 categorias de impressão 3D da Pesquisa de nichos, agrupadas como lá, mais a opção "Todas".
- **FR-002**: A tela MUST oferecer a ordenação "Mais vendidos" (ranking de mais vendidos da categoria, por posição) e "Mais procurados" (termos mais buscados da categoria, por posição).
- **FR-003**: Cada card MUST mostrar foto (ou substituta), nome/termo, posição e tipo da posição ("mais vendido" / "mais buscado"); em "Todas", também o nome da categoria.
- **FR-004**: Cada card MUST ter os ícones "Ver no Mercado Livre", "Buscar na Shopee" e "Buscar no MakerWorld", abrindo em nova aba com o nome do item.
- **FR-005**: A busca por nome MUST restringir-se à categoria selecionada quando houver uma, e ao catálogo inteiro do Mercado Livre quando estiver em "Todas".
- **FR-006**: A tela MUST mostrar o total de itens listados e um botão "Limpar filtros".
- **FR-007**: Os resultados MUST ser guardados por 24h por combinação de categoria, ordenação e termo, com indicação da hora de obtenção e botão "Atualizar"; com o Mercado Livre indisponível, o resultado vencido MUST ser exibido com aviso.
- **FR-008**: Erros do Mercado Livre MUST chegar à tela com mensagem amigável e MUST aparecer com status e detalhe na resposta da requisição (aba Network), sem serem engolidos.
- **FR-009**: A tela MUST NOT exibir preço, desconto, quantidade vendida ou visitas; um aviso discreto MUST explicar que esses dados não são liberados pelo Mercado Livre.
- **FR-010**: Todos os textos da tela MUST seguir o padrão de i18n existente do projeto.
- **FR-011**: A tela MUST ser acessível só para usuários autenticados no admin.
- **FR-012**: A nova tela MUST substituir a atual "Tendências (ML)" no menu do admin, mantendo o mesmo endereço.
- **FR-013**: Ao selecionar uma categoria, a tela MUST permitir descer para as subcategorias dela (chips + caminho clicável para voltar); mais vendidos, mais procurados e busca valem para o nível escolhido. Motivo (teste ao vivo): no nível de cima os mais vendidos não são peças 3D (Banheiros traz chuveiros e toalhas), já em "Suportes para Papel Higiênico" os 20 são suportes.

### Key Entities

- **Categoria 3D**: uma das 16 categorias do Mercado Livre usadas na Pesquisa de nichos (id, nome, grupo).
- **Item em alta**: um card da grade — origem (mais vendido, mais procurado ou busca), posição, nome ou termo, foto, categoria, links de Mercado Livre/Shopee/MakerWorld.
- **Resultado guardado**: lista de itens em alta de uma combinação categoria + ordenação + termo, com a data/hora de obtenção, válido por 24h.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O avaliador chega aos mais vendidos de uma categoria em até 2 cliques a partir do menu do admin.
- **SC-002**: Resultado de uma categoria já consultada nas últimas 24h aparece em menos de 1 segundo.
- **SC-003**: Primeira consulta de uma categoria aparece em até 10 segundos; "Todas" em até 30 segundos.
- **SC-004**: Pelo menos 80% dos cards de "Mais vendidos" e "Mais procurados" exibem foto real (não substituta).
- **SC-005**: 100% dos cards com nome abrem as buscas da Shopee e do MakerWorld com o termo correto.

## Assumptions

- Usuário único/avaliador no admin já autenticado; mesma conta do Mercado Livre já conectada nas outras telas.
- A lista das 16 categorias é a mesma já usada na Pesquisa de nichos e não muda nesta feature; as subcategorias vêm do próprio Mercado Livre.
- Cerca de 15% dos itens do ranking são anúncios de outros vendedores que o ML não deixa ler: aparecem sem nome/foto, só com a posição e o link para o ML.
- Shopee e MakerWorld entram só como links de busca; dados da Shopee (vendas, preço) ficam na EDI-129.
- A busca por nome em "Todas" usa o catálogo de produtos do Mercado Livre (o mesmo usado para medir concorrência na Pesquisa de nichos), não a busca de anúncios, que é bloqueada.
- A nova tela substitui a "Descoberta de tendências" atual (EDI-107), que já mostrava ranking e tendências gerais sem foto; nada se perde, pois os mesmos dados passam a aparecer em cards.
- Favoritos, filtro por material e filtro por faixa de preço (presentes no STL Seller) ficam fora desta versão.
