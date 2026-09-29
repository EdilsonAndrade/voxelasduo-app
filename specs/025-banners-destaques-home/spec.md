# Feature Specification: Banners e destaques da home gerenciados pelo painel

**Feature Branch**: `edilsonaandrade/edi-114-banners-e-destaques-da-home-gerenciados-pelo-painel`
**Linear**: EDI-114
**Created**: 2026-09-29
**Status**: Draft
**Input**: User description: "Nova área Banners no admin para cadastrar, editar, ordenar, ativar e desativar seções da home: banner hero, banner intermediário (imagem desktop/mobile, título, subtítulo, texto e link do botão 'Compre agora', posição do texto), texto de destaque (faixa só com texto) e carrossel de produtos. Na lista de produtos do admin, marcar quais produtos vão para cada carrossel ou banner. A home renderiza as seções na ordem definida no admin. Referência visual: https://bazar-dani-vieira.myshopify.com/"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin publica um banner na home (Priority: P1)

O administrador acessa a área **Banners** do painel, cria um banner com imagem (versão desktop e mobile), título, subtítulo, texto e link do botão, escolhe a posição do texto e o ativa. Ao abrir a home do site, o comprador vê o banner com o texto sobre a imagem e o botão levando ao destino configurado.

**Why this priority**: é o núcleo da funcionalidade. Sozinho já permite divulgar campanhas e coleções na página inicial sem depender de desenvolvimento.

**Independent Test**: cadastrar um banner hero ativo e abrir a home. O banner deve aparecer com imagem, textos e botão funcionando.

**Acceptance Scenarios**:

1. **Given** nenhum banner cadastrado, **When** o admin cria um banner hero com imagem, título "Peças que marcam presença" e botão "Compre agora" apontando para uma categoria, e o ativa, **Then** a home exibe esse banner no topo, com o título sobre a imagem, e o clique no botão leva à categoria.
2. **Given** um banner com imagem mobile cadastrada, **When** a home é aberta em tela de celular, **Then** é exibida a imagem mobile, e não a de desktop.
3. **Given** um banner ativo, **When** o admin o desativa, **Then** ele deixa de aparecer na home, mas continua listado no painel para reativação.
4. **Given** um banner sem botão (texto do botão vazio), **When** a home é exibida, **Then** o banner aparece sem botão e sem área clicável quebrada.

---

### User Story 2 - Admin monta carrosséis de produtos marcando itens na lista de produtos (Priority: P1)

O administrador cria uma seção do tipo **carrossel de produtos** (ex.: "Favoritos dos clientes") e, na lista de produtos do painel, marca quais produtos fazem parte de cada carrossel. A home exibe o carrossel com os produtos marcados, com título, link "Ver tudo" e navegação lateral.

**Why this priority**: é o mecanismo pedido para "tracionar" produtos específicos. Tem o mesmo peso do banner.

**Independent Test**: criar o carrossel "Favoritos dos clientes", marcar 5 produtos na lista de produtos e abrir a home. Os 5 produtos devem aparecer no carrossel.

**Acceptance Scenarios**:

1. **Given** um carrossel "Favoritos dos clientes" ativo, **When** o admin marca 5 produtos para ele na lista de produtos, **Then** a home exibe o carrossel com esses 5 produtos, cada um com foto, nome e preço, levando à página do produto.
2. **Given** um produto marcado em dois carrosséis, **When** a home é exibida, **Then** o produto aparece nos dois.
3. **Given** um produto sem estoque marcado em um carrossel, **When** a home é exibida, **Then** ele aparece com a etiqueta "Esgotado".
4. **Given** um carrossel ativo sem nenhum produto marcado (ou com todos os produtos removidos do catálogo), **When** a home é exibida, **Then** a seção não aparece.
5. **Given** um carrossel com link "Ver tudo" configurado, **When** o comprador clica no link, **Then** vai para o destino configurado (categoria ou catálogo).
6. **Given** a lista de produtos do admin, **When** o admin filtra por um carrossel, **Then** vê apenas os produtos marcados nele.

---

### User Story 3 - Admin ordena as seções da home (Priority: P2)

O administrador vê todas as seções (banners, textos de destaque e carrosséis) em uma lista ordenada e muda a ordem. A home passa a exibir as seções nessa ordem.

**Why this priority**: sem ordenação a home fica com ordem fixa, mas já é utilizável. A ordenação dá liberdade para montar a página no estilo da referência (banner → carrossel → banner → carrossel...).

**Independent Test**: com 3 seções ativas, inverter a ordem no painel e recarregar a home.

**Acceptance Scenarios**:

1. **Given** as seções A, B e C ativas nessa ordem, **When** o admin move C para o topo, **Then** a home exibe C, A, B.
2. **Given** uma seção inativa entre duas ativas, **When** a home é exibida, **Then** a seção inativa é ignorada e as demais mantêm a ordem relativa.

---

### User Story 4 - Admin publica um texto de destaque (Priority: P3)

O administrador cria uma faixa só com texto (título e parágrafo curto, sem imagem) para mensagens de marca ou avisos (ex.: "Frete grátis acima de R$ 199"). A home exibe a faixa na posição definida.

**Why this priority**: complementa a montagem da home, mas é o item de menor impacto comercial.

**Independent Test**: criar um texto de destaque ativo e verificar a faixa na home.

**Acceptance Scenarios**:

1. **Given** um texto de destaque ativo com título e texto, **When** a home é exibida, **Then** a faixa aparece com o título em destaque e o texto abaixo, na posição definida.

---

### Edge Cases

- **Nenhuma seção ativa**: a home não pode ficar vazia. O comprador segue indo direto ao catálogo, como hoje.
- **Imagem mobile ausente**: usa a imagem de desktop também no celular.
- **Imagem desktop ausente**: o banner não pode ser salvo como ativo sem pelo menos uma imagem.
- **Link do botão inválido ou vazio**: o painel valida o destino ao salvar. Links internos (categoria, produto, catálogo) e externos (https) são aceitos.
- **Produto excluído**: some automaticamente dos carrosséis em que estava marcado.
- **Título muito longo**: o painel limita o tamanho dos textos, para não quebrar o layout sobre a imagem.
- **Upload de imagem falha**: o painel mostra o erro e não salva o banner com a imagem quebrada.
- **Carrossel com muitos produtos**: a home exibe no máximo um número limite de produtos (padrão: 12); o restante fica acessível pelo "Ver tudo".
- **Excluir seção**: a exclusão pede confirmação. Excluir um carrossel remove as marcações dos produtos, mas não os próprios produtos.

## Requirements *(mandatory)*

### Functional Requirements

**Área Banners (painel administrativo)**

- **FR-001**: O painel MUST ter uma área **Banners**, acessível apenas a administradores autenticados, listando todas as seções da home com tipo, título, status (ativa/inativa) e ordem.
- **FR-002**: O admin MUST poder criar, editar, ativar, desativar e excluir seções dos tipos: **banner hero**, **banner intermediário**, **texto de destaque** e **carrossel de produtos**.
- **FR-003**: Banners (hero e intermediário) MUST aceitar: imagem desktop (obrigatória), imagem mobile (opcional), título, subtítulo, texto do botão, link do botão e posição do texto (esquerda, centro, direita; em cima, meio ou embaixo).
- **FR-004**: Texto de destaque MUST aceitar título e texto, e opcionalmente botão (texto e link).
- **FR-005**: Carrossel MUST aceitar título, texto e link do "Ver tudo" (opcionais) e limite de produtos exibidos (padrão 12).
- **FR-006**: O admin MUST poder reordenar as seções, e a nova ordem MUST ser respeitada na home.
- **FR-007**: O painel MUST validar os campos obrigatórios e os limites de tamanho dos textos, e mostrar mensagens de erro claras.
- **FR-008**: O admin MUST poder pré-visualizar como o banner fica (desktop e mobile) antes de ativá-lo.

**Marcação de produtos**

- **FR-009**: Na lista de produtos do admin, o admin MUST poder marcar e desmarcar, para cada produto, em quais carrosséis ele aparece, sem precisar abrir o produto.
- **FR-010**: A lista de produtos do admin MUST permitir filtrar pelos produtos de um carrossel.
- **FR-011**: O admin MUST poder definir a ordem dos produtos dentro de um carrossel. Na ausência de ordem manual, vale a ordem em que foram marcados.

**Home (site)**

- **FR-012**: A home MUST exibir as seções ativas na ordem definida no painel.
- **FR-013**: Quando não houver nenhuma seção ativa, a home MUST manter o comportamento atual (levar o comprador ao catálogo).
- **FR-014**: Banners MUST exibir a imagem adequada ao tamanho de tela (mobile/desktop), com o texto sobre a imagem na posição configurada e contraste legível.
- **FR-015**: Carrosséis MUST exibir foto, nome e preço de cada produto, a etiqueta "Esgotado" quando não houver estoque e navegação por setas (desktop) e por arraste (mobile).
- **FR-016**: Carrosséis MUST exibir apenas o preço atual do produto. A etiqueta "Promoção" com preço anterior riscado fica fora desta entrega e terá um ticket próprio (decisão do usuário, 2026-09-29).
- **FR-017**: Alterações feitas no painel MUST aparecer na home em até 1 minuto, sem novo deploy.
- **FR-018**: Os textos das seções e os rótulos fixos (ex.: "Ver tudo", "Compre agora", "Esgotado") MUST ser apenas em pt-BR, seguindo o padrão atual do Voxelas Duo, que não tem estrutura de i18n (decisão do usuário, 2026-09-29).

### Key Entities

- **Seção da home**: bloco exibido na página inicial. Atributos: tipo (banner hero, banner intermediário, texto de destaque, carrossel), status ativa/inativa, ordem, datas de criação e atualização.
- **Conteúdo de banner**: imagem desktop, imagem mobile, título, subtítulo, texto do botão, link do botão e posição do texto. Pertence a uma seção do tipo banner.
- **Conteúdo de texto de destaque**: título, texto e botão opcional.
- **Carrossel de produtos**: título, link "Ver tudo", limite de exibição e a lista ordenada de produtos marcados.
- **Produto (existente)**: passa a saber em quais carrosséis está marcado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O admin consegue criar e publicar um banner completo (com imagem) em menos de 3 minutos, sem ajuda técnica.
- **SC-002**: O admin consegue marcar 10 produtos em um carrossel em menos de 1 minuto, direto na lista de produtos.
- **SC-003**: Toda alteração publicada no painel aparece na home em até 1 minuto.
- **SC-004**: A home com 4 banners e 3 carrosséis carrega o primeiro banner visível em menos de 2,5 segundos em conexão 4G.
- **SC-005**: A home é exibida corretamente (sem texto cortado ou imagem distorcida) em telas de 360px a 1920px de largura.
- **SC-006**: Mudar a composição da home não exige nenhuma alteração de código nem deploy.

## Assumptions

- Apenas administradores já autenticados no painel (login atual) gerenciam as seções. Não há papéis diferentes nesta entrega.
- As imagens dos banners são enviadas pelo mesmo mecanismo de upload já usado para as fotos de produto.
- Os links dos botões podem apontar para páginas internas (catálogo, categoria, produto) ou para URLs externas https.
- Não há agendamento de banners (data de início e fim) nesta entrega. Ativação e desativação são manuais.
- O header, o menu, o drawer do carrinho e o rodapé da referência ficam fora deste escopo. Eles serão tratados no redesign da Dona Frida (EDI-116).
- A mesma funcionalidade será replicada depois no projeto Dona Frida (EDI-117).
- A rota atual de catálogo (/produtos) continua existindo e sem mudanças.
