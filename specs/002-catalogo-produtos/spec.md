# Feature Specification: Catálogo de Produtos (CRUD)

**Feature Branch**: `edilsonaandrade/edi-75-tarefa-2-catalogo-de-produtos-crud`
**Created**: 2026-09-03
**Status**: Draft
**Input**: Linear EDI-75 (épico EDI-73, projeto Voxelas Duo) — "Tarefa 2: Catálogo de produtos (CRUD)": criar interface de administração para cadastrar/editar/remover produtos (nome, descrição, preço, fotos, estoque, categoria); implementar upload de imagens; implementar páginas públicas de listagem e detalhe de produto; implementar busca e filtro por categoria.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Administrador cadastra um novo produto (Priority: P1)

Como administrador da loja, quero cadastrar um novo produto com nome, descrição, preço, fotos, estoque e categoria, para que ele passe a existir no catálogo e possa futuramente ser exibido aos clientes.

**Why this priority**: Sem a capacidade de cadastrar produtos não existe catálogo — é a fundação de todo o resto da funcionalidade (nada para listar, buscar ou vender).

**Independent Test**: Pode ser testado isoladamente acessando a área de administração, preenchendo o formulário de novo produto com fotos e salvando; o produto passa a existir na base de dados com todos os campos informados.

**Acceptance Scenarios**:

1. **Given** o administrador está na tela de "novo produto", **When** preenche nome, descrição, preço, estoque, categoria e envia ao menos uma foto e confirma, **Then** o produto é criado e passa a aparecer na listagem administrativa de produtos.
2. **Given** o administrador tenta salvar um produto sem preencher um campo obrigatório (nome, preço ou categoria), **When** confirma o formulário, **Then** o sistema impede o salvamento e indica quais campos precisam ser corrigidos.
3. **Given** o administrador envia uma foto em formato ou tamanho não suportado, **When** tenta fazer o upload, **Then** o sistema rejeita o arquivo e explica o motivo (formato ou tamanho inválido).

---

### User Story 2 - Visitante navega e visualiza produtos (Priority: P2)

Como visitante do site, quero ver a lista de produtos disponíveis e abrir a página de detalhe de um produto específico, para decidir se quero comprá-lo.

**Why this priority**: É o valor central do e-commerce — sem vitrine pública não há como um cliente descobrir e avaliar produtos, mesmo que já existam cadastrados.

**Independent Test**: Pode ser testado de forma independente populando produtos diretamente na base (ou usando os já cadastrados via User Story 1) e acessando a página pública de listagem e a página de detalhe de um produto.

**Acceptance Scenarios**:

1. **Given** existem produtos cadastrados com estoque, **When** o visitante acessa a página pública de produtos, **Then** vê nome, foto principal, preço e categoria de cada produto disponível.
2. **Given** o visitante está na listagem, **When** clica em um produto, **Then** é levado à página de detalhe com descrição completa, galeria de fotos, preço, estoque disponível e categoria.
3. **Given** um produto está com estoque zerado, **When** o visitante o vê na listagem ou no detalhe, **Then** o sistema indica claramente que está indisponível (sem permitir a impressão de que pode ser comprado).
4. **Given** não existe nenhum produto cadastrado em uma categoria ou no catálogo geral, **When** o visitante acessa a listagem, **Then** vê uma mensagem clara de que não há produtos, em vez de uma página vazia sem explicação.

---

### User Story 3 - Administrador edita ou remove um produto (Priority: P3)

Como administrador, quero editar os dados de um produto existente (incluindo suas fotos) ou removê-lo do catálogo, para manter as informações e o estoque sempre atualizados.

**Why this priority**: Mantém o catálogo confiável ao longo do tempo, mas depende logicamente de já existir cadastro (P1) e não bloqueia o lançamento inicial da vitrine (P2) se o catálogo ainda for pequeno e estático no início.

**Independent Test**: Pode ser testado isoladamente abrindo um produto já existente na área administrativa, alterando um campo (ex: preço ou estoque) ou removendo uma foto, salvando, e confirmando que a mudança se reflete tanto na área administrativa quanto na página pública do produto. Remoção pode ser testada excluindo um produto e confirmando que ele some da listagem pública.

**Acceptance Scenarios**:

1. **Given** um produto já existe, **When** o administrador altera qualquer campo e salva, **Then** as mudanças aparecem imediatamente na área administrativa e na página pública do produto.
2. **Given** um produto já existe, **When** o administrador confirma a remoção, **Then** o produto deixa de aparecer tanto na área administrativa quanto nas páginas públicas.
3. **Given** o administrador está editando um produto, **When** adiciona novas fotos ou remove fotos existentes, **Then** a galeria final reflete exatamente as fotos mantidas mais as novas adicionadas.

---

### User Story 4 - Visitante busca e filtra produtos por categoria (Priority: P4)

Como visitante, quero buscar produtos por palavra-chave e filtrar por categoria, para encontrar mais rápido o que procuro em um catálogo maior.

**Why this priority**: Melhora a experiência de descoberta, mas só se torna crítico quando o catálogo cresce; não bloqueia o valor entregue pelas histórias anteriores.

**Independent Test**: Pode ser testado isoladamente com um conjunto de produtos de categorias variadas já cadastrados, digitando termos de busca e selecionando categorias no filtro, e conferindo que os resultados exibidos correspondem ao termo/categoria escolhidos.

**Acceptance Scenarios**:

1. **Given** existem produtos de categorias diferentes, **When** o visitante seleciona uma categoria no filtro, **Then** apenas produtos daquela categoria são exibidos.
2. **Given** o visitante digita um termo de busca, **When** o termo corresponde a nome ou descrição de algum produto, **Then** esse produto aparece nos resultados.
3. **Given** o visitante busca um termo ou combina busca com categoria e nada corresponde, **When** os resultados são exibidos, **Then** o sistema mostra uma mensagem clara de "nenhum resultado encontrado" em vez de uma lista vazia sem explicação.

### Edge Cases

- O que acontece se o administrador tentar cadastrar um produto com preço zero ou negativo? O sistema deve rejeitar e explicar o motivo.
- O que acontece se o upload de uma foto falhar no meio do processo (ex: conexão caiu)? O sistema deve informar a falha e permitir tentar novamente, sem deixar o produto salvo em estado parcial/inconsistente.
- O que acontece se dois administradores editarem o mesmo produto ao mesmo tempo? A última gravação bem-sucedida prevalece (sem bloqueio de edição concorrente nesta tarefa).
- O que acontece se uma categoria ficar sem nenhum produto após uma remoção ou edição? Ela deixa de aparecer como opção de filtro/navegação pública (conforme já definido em `specs/site-architecture.md`).
- O que acontece ao acessar a página de detalhe de um produto que foi removido ou nunca existiu? O sistema exibe uma página de "produto não encontrado", não um erro técnico.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE permitir que um administrador cadastre um novo produto informando nome, descrição, preço, quantidade em estoque, categoria e ao menos uma foto.
- **FR-002**: O sistema DEVE validar campos obrigatórios (nome, preço, estoque, categoria, ao menos uma foto) antes de permitir salvar um produto, impedindo o cadastro e indicando o problema quando algo estiver ausente ou inválido (ex: preço menor ou igual a zero, estoque negativo).
- **FR-003**: O sistema DEVE permitir o upload de múltiplas fotos por produto, validando formato (imagens) e tamanho do arquivo, e rejeitando arquivos fora dos limites suportados com mensagem explicativa.
- **FR-004**: O sistema DEVE permitir que um administrador edite qualquer campo de um produto existente, incluindo adicionar e remover fotos.
- **FR-005**: O sistema DEVE permitir que um administrador remova um produto existente, e o produto removido DEVE deixar de aparecer imediatamente em qualquer listagem ou página pública.
- **FR-006**: O sistema DEVE exibir publicamente uma listagem de produtos disponíveis, mostrando ao menos nome, foto principal, preço e categoria de cada um.
- **FR-007**: O sistema DEVE exibir publicamente uma página de detalhe por produto, com nome, descrição completa, galeria de fotos, preço, categoria e disponibilidade em estoque.
- **FR-008**: O sistema DEVE indicar claramente quando um produto está sem estoque disponível, tanto na listagem quanto no detalhe, sem impedir sua visualização.
- **FR-009**: O sistema DEVE permitir que o visitante filtre a listagem pública de produtos por categoria.
- **FR-010**: O sistema DEVE permitir que o visitante busque produtos por termo textual, considerando ao menos o nome e a descrição do produto.
- **FR-011**: O sistema DEVE exibir uma mensagem clara quando uma busca, filtro ou listagem não retornar nenhum produto, em vez de uma tela vazia sem explicação.
- **FR-012**: O sistema DEVE impedir o acesso à página de detalhe de um produto inexistente ou removido, exibindo uma página de "não encontrado" em vez de um erro técnico.
- **FR-013**: Categorias de produto DEVEM ser definidas livremente pelo administrador no cadastro/edição de um produto (sem uma lista fixa pré-definida no sistema), e uma categoria só DEVE aparecer como opção de navegação/filtro público enquanto tiver ao menos um produto associado.
- **FR-014**: A área de administração de produtos (`/admin/produtos` e subpáginas) fica, nesta tarefa, sem mecanismo de autenticação/login — a proteção de acesso é escopo da Tarefa 8 (EDI-81) e deve ser tratada antes de qualquer exposição pública do site em produção.

### Key Entities

- **Produto**: item vendável do catálogo. Atributos principais: nome, descrição, preço, quantidade em estoque, categoria, uma ou mais fotos, identificador único, datas de criação e última atualização. Relaciona-se com Categoria (um produto pertence a exatamente uma categoria).
- **Categoria**: agrupamento de produtos usado para navegação e filtro. Não é uma entidade cadastrada isoladamente nesta tarefa — existe implicitamente a partir do valor informado no produto (ver FR-013).
- **Foto de Produto**: imagem associada a um produto, com uma posição de exibição (a primeira é a "foto principal" usada em listagens).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um administrador consegue cadastrar um produto completo (com fotos) em até 3 minutos na primeira tentativa, sem precisar de ajuda externa.
- **SC-002**: 100% dos produtos com estoque zerado exibem indicação de indisponibilidade tanto na listagem quanto no detalhe, sem exceção.
- **SC-003**: Um visitante consegue encontrar um produto específico (por busca ou filtro de categoria) em até 3 interações (ex: 1 clique + 1 termo digitado), quando o produto existe no catálogo.
- **SC-004**: 0% das remoções ou edições de produto deixam dado inconsistente visível publicamente (ex: produto removido continuando acessível, ou edição parcialmente aplicada).
- **SC-005**: 100% dos acessos a produtos inexistentes ou removidos resultam em uma página de "não encontrado" compreensível, nunca em erro técnico exposto ao usuário.

## Assumptions

- A área administrativa (`/admin/produtos`, `/admin/produtos/novo`, `/admin/produtos/[id]/editar`) e as páginas públicas (`/produtos`, `/produtos/[categoria]`, `/produtos/[categoria]/[slug]`) seguem a hierarquia já definida em `specs/site-architecture.md`.
- Conforme decisão do usuário, esta tarefa **não** implementa autenticação para a área `/admin` — isso fica para a Tarefa 8 (EDI-81). Risco assumido: o site não deve ser exposto publicamente em produção com o catálogo administrável até EDI-81 estar concluída.
- Categorias são texto livre definido pelo administrador ao cadastrar/editar um produto, não uma lista fixa gerenciada separadamente (pode evoluir em tarefa futura, se necessário).
- Preço é armazenado e validado como valor monetário positivo (a unidade de armazenamento — ex: centavos — é decisão técnica do plano, não desta especificação).
- O catálogo é de porte pequeno (projeto pessoal/familiar, dezenas de produtos), portanto não há exigência de paginação avançada ou busca full-text sofisticada nesta tarefa — uma listagem simples e busca por correspondência textual são suficientes.
- Fotos de produto são armazenadas em um serviço de storage externo (ex: Vercel Blob, conforme sugerido no ticket) e o produto guarda apenas as URLs/referências — detalhe de implementação a ser definido no plano técnico.
- O projeto é multi-idioma (I18N); todo texto voltado ao usuário (mensagens de erro, rótulos, "produto não encontrado", etc.) deve seguir o padrão de internacionalização já existente no projeto.
