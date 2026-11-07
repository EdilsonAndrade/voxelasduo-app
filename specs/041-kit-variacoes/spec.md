# Feature Specification: Produto com variações de kit

**Feature Branch**: `edilsonaandrade/edi-138-produto-com-variacoes-de-kit-kit-3`
**Linear**: EDI-138
**Created**: 2026-11-07
**Status**: Draft
**Input**: Produto com variações de kit (Kit 3, Kit 4, Kit Completo) no site, igual ao anúncio da Shopee. Cada variação tem as próprias peças, preço no site (já com desconto), preços de referência por canal, estoque e foto. Custo = peças sem embalagem individual + uma embalagem do kit. O cliente escolhe a variação na página do produto; carrinho, checkout e pedido registram a variação. A calculadora mostra e salva os preços por variação.

## Contexto

Na Shopee o lojista vende o "Centro de Mesa de Natal" num anúncio só, com três variações (Kit 3, Kit 4 e Kit Completo), cada uma com preço, foto e estoque próprios. No site, hoje, cada kit vira um produto separado (montador de kits, specs/037), o que exige 3 cadastros, 3 conjuntos de fotos e 3 páginas. O lojista quer um único produto com variações, usando as mesmas fotos da Shopee, e conferir na calculadora o preço de cada variação.

No site não há as taxas da Shopee, então o preço do site já é o preço com desconto (ex.: Kit 3 a R$ 55,93 no site contra R$ 79,90 cheio na Shopee). O site tem a taxa do site próprio (meio de pagamento), que entra na margem.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cadastrar as variações de kit no produto (Priority: P1)

Na edição do produto, o lojista ativa "Variações de kit" e cadastra cada variação: nome (ex.: "Kit 3 peças"), as peças que a compõem (produtos do catálogo com quantidade), a embalagem do kit, o preço do site, o preço de referência na Shopee e no Mercado Livre (opcionais), o estoque e a foto da variação (escolhida entre as fotos do produto). Para cada variação o sistema mostra o custo (peças sem a embalagem individual + a embalagem do kit) e a margem no preço do site.

**Why this priority**: Sem o cadastro não existe variação para vender nem calcular.

**Independent Test**: Num produto com 3 fotos, cadastrar "Kit 3" (árvore, Noel, rena), "Kit 4" (+ boneco de neve) e "Kit Completo" (+ bandeja), cada um com preço, estoque e foto; salvar e reabrir o produto com as 3 variações e o custo de cada uma.

**Acceptance Scenarios**:

1. **Given** um produto em edição, **When** o lojista adiciona uma variação com nome, peças, embalagem, preço do site, estoque e foto, **Then** vê o custo e a margem da variação antes de salvar.
2. **Given** peças com custo cadastrado, **When** a variação é montada, **Then** o custo é a soma dos custos das peças sem a embalagem de cada uma (vezes a quantidade) mais a embalagem do kit, igual à regra do montador de kits.
3. **Given** um produto com variações salvas, **When** a lista de produtos e a vitrine exibem esse produto, **Then** aparece o menor preço entre as variações ("a partir de") e o estoque total é a soma das variações.
4. **Given** uma variação sem nome, sem peças, com preço ≤ 0 ou estoque negativo, **When** o lojista salva, **Then** recebe a mensagem de erro daquela variação e nada é gravado.
5. **Given** um produto com variações, **When** o lojista remove todas as variações e salva, **Then** o produto volta a ser um produto simples com o preço e o estoque informados no cadastro.

---

### User Story 2 - Cliente escolhe a variação na página do produto e compra (Priority: P1)

Na página pública do produto, o cliente vê as variações como opções selecionáveis (com a miniatura da foto, como na Shopee). Ao escolher uma, o preço, a foto em destaque, o estoque disponível e a lista de itens inclusos trocam para os da variação. O botão de adicionar ao carrinho só fica ativo com uma variação escolhida. No carrinho, no checkout, no pedido e no e-mail de confirmação aparece o nome do produto com a variação (ex.: "Centro de Mesa de Natal — Kit 4 peças").

**Why this priority**: É o objetivo da funcionalidade: vender as variações pelo site.

**Independent Test**: Abrir a página do produto, escolher "Kit 4", conferir preço R$ 69,93 e a foto do Kit 4, adicionar ao carrinho, finalizar a compra e conferir o pedido no admin com a variação e o preço corretos.

**Acceptance Scenarios**:

1. **Given** um produto com 3 variações, **When** o cliente abre a página, **Then** vê as 3 opções, o preço "a partir de" e o botão de compra desativado até escolher uma.
2. **Given** a página do produto, **When** o cliente escolhe uma variação, **Then** preço, foto em destaque, estoque e itens inclusos passam a ser os dessa variação.
3. **Given** uma variação com estoque 0, **When** a página é exibida, **Then** a opção aparece como esgotada e não pode ser escolhida para compra.
4. **Given** o cliente adicionando "Kit 3" e depois "Kit 4" do mesmo produto, **When** abre o carrinho, **Then** vê duas linhas separadas, cada uma com sua variação, preço e foto.
5. **Given** um pedido criado com uma variação, **When** o servidor calcula o total, **Then** usa o preço atual da variação no site (não o preço enviado pelo navegador) e valida o estoque da variação.
6. **Given** um pedido pago com uma variação, **When** o estoque é baixado, **Then** é baixado o estoque daquela variação (e o total do produto acompanha).
7. **Given** uma variação removida ou sem estoque depois de ir para o carrinho, **When** o cliente tenta finalizar, **Then** recebe a mensagem de estoque/indisponível daquela linha, como já acontece com produtos simples.

---

### User Story 3 - Calcular e salvar os preços de cada variação na calculadora (Priority: P2)

Na edição do produto, cada variação tem o botão "Calcular". A calculadora abre com o custo da variação e o preço atual dela, mostrando Shopee, Mercado Livre e site com a estratégia de desconto já existente. O lojista ajusta e clica em "Aplicar na variação", que grava na variação o preço do site e os preços de referência da Shopee e do Mercado Livre. O cálculo fica salvo e ligado ao produto e à variação, para reabrir depois.

**Why this priority**: O lojista precisa conferir margem e desconto por variação, mas a venda já funciona com preços digitados à mão.

**Independent Test**: Clicar em "Calcular" no Kit 3, conferir que o custo da calculadora é igual ao custo mostrado na variação, aplicar os preços e conferir que a variação foi atualizada; voltar em "Calcular" e cair no mesmo cálculo salvo.

**Acceptance Scenarios**:

1. **Given** uma variação salva, **When** o lojista clica em "Calcular", **Then** a calculadora abre com o nome "Produto — Variação", o custo da variação e o preço atual da variação na Shopee (ou do site) como preço alvo.
2. **Given** a calculadora de uma variação, **When** o lojista clica em "Aplicar na variação", **Then** o preço do site, o da Shopee e o do Mercado Livre calculados são gravados na variação e o lojista vê a confirmação.
3. **Given** uma variação que já tem cálculo salvo, **When** o lojista clica em "Calcular" de novo, **Then** reabre o mesmo cálculo.
4. **Given** uma falha ao aplicar os preços, **When** a gravação é recusada, **Then** a mensagem de erro aparece na tela e a resposta de erro é visível como erro na aba de rede.

---

### Edge Cases

- Peça componente sem custo cadastrado: a variação mostra "custo incompleto" e a margem é marcada como estimativa; o cadastro não é bloqueado.
- Peça componente excluída depois: a variação mostra a peça como "produto removido" com os últimos valores conhecidos.
- Produto gerado pelo montador de kits ou outro produto com variações não pode ser peça de uma variação (evita kit dentro de kit).
- Mesmo produto adicionado duas vezes na mesma variação: soma na quantidade.
- Nome de variação repetido no mesmo produto: não é aceito.
- Foto da variação removida do produto: a variação passa a usar a primeira foto do produto.
- Carrinho antigo (salvo antes da mudança) com um produto que agora tem variações: a linha é considerada inválida no checkout e o cliente é avisado para escolher a variação.
- Produto com variações e integração com Mercado Livre/Shopee pela API: a publicação automática não envia variações nesta versão; o admin avisa que o anúncio desses canais é gerenciado manualmente.
- Limite de 10 variações por produto e 30 peças distintas por variação.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O admin MUST poder adicionar, editar, reordenar e remover variações de kit de um produto na tela de edição do produto.
- **FR-002**: Cada variação MUST ter nome (único no produto), lista de peças (produtos do catálogo com quantidade inteira de 1 a 999), embalagem do kit, preço do site (> 0), estoque (inteiro ≥ 0) e foto (uma das fotos do produto); preços de referência da Shopee e do Mercado Livre são opcionais.
- **FR-003**: O sistema MUST calcular o custo de cada variação como a soma dos custos das peças sem a embalagem individual (vezes a quantidade) mais a embalagem do kit, e mostrar a margem no preço do site com a taxa do site próprio.
- **FR-004**: Um produto com variações MUST expor como preço o menor preço das variações e como estoque a soma dos estoques das variações, em listas, vitrine, busca e feed.
- **FR-005**: A página pública MUST listar as variações com nome e miniatura, trocar preço, foto em destaque, estoque e itens inclusos ao escolher uma, e exigir a escolha antes de adicionar ao carrinho.
- **FR-006**: Variações sem estoque MUST aparecer como esgotadas e não podem ser compradas.
- **FR-007**: O carrinho MUST tratar cada combinação produto + variação como uma linha própria, com nome, foto e preço da variação.
- **FR-008**: Ao criar o pedido, o servidor MUST recalcular o preço pela variação, validar o estoque da variação e gravar no item a variação (identificador e nome).
- **FR-009**: Ao baixar ou devolver estoque de um pedido, o sistema MUST movimentar o estoque da variação do item e manter o estoque total do produto igual à soma das variações.
- **FR-010**: Pedido no admin, área do cliente e e-mail de confirmação MUST mostrar a variação junto ao nome do produto.
- **FR-011**: A partir de uma variação, o admin MUST poder abrir a calculadora já preenchida com o custo e o preço da variação; o cálculo salvo MUST ficar ligado ao produto e à variação.
- **FR-012**: A calculadora de uma variação MUST permitir aplicar na variação o preço do site e os preços de referência da Shopee e do Mercado Livre.
- **FR-013**: O sistema MUST impedir como peça de variação um produto que tenha variações ou que tenha sido gerado por kit.
- **FR-014**: Todos os textos novos da interface pública MUST seguir o padrão multi-língua existente do projeto.
- **FR-015**: Erros de validação e de gravação MUST ser exibidos ao usuário e devolvidos como resposta de erro (status de erro HTTP), nunca ocultados.
- **FR-016**: Somente usuários com acesso ao admin MUST poder cadastrar variações e aplicar preços.

### Key Entities

- **Variação de kit**: pertence a um produto. Atributos: identificador estável, nome, peças (produto + quantidade + últimos valores conhecidos), embalagem do kit, preço do site, preços de referência por canal (Shopee, Mercado Livre), estoque, foto, ordem.
- **Produto** (existente): ganha a lista opcional de variações; com variações, preço e estoque passam a ser derivados delas.
- **Item do carrinho / Item do pedido** (existentes): ganham a variação escolhida (identificador e nome).
- **Cálculo de preço** (existente): ganha a variação a que se refere.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O lojista cadastra um produto com 3 variações de kit, com fotos e preços, em menos de 5 minutos, num único cadastro.
- **SC-002**: 100% dos pedidos de produtos com variações registram a variação escolhida e o preço da variação vigente no momento da compra.
- **SC-003**: Nenhuma variação é vendida acima do estoque dela.
- **SC-004**: O custo da variação mostrado na edição do produto e na calculadora é idêntico (diferença de R$ 0,00).
- **SC-005**: O cliente troca de variação na página do produto e vê o novo preço e a nova foto em menos de 1 segundo.

## Assumptions

- As peças das variações são produtos já cadastrados (inclusive rascunhos); a criação de peças novas continua no montador de kits.
- O preço do site da variação já é o preço final (com desconto); não há promoção/desconto automático por variação no site nesta versão.
- Os preços de Shopee e Mercado Livre da variação são referência para o lojista cadastrar manualmente nos marketplaces; a publicação automática via API não envia variações nesta versão.
- Produtos sem variações continuam funcionando exatamente como hoje.
- O feed da Meta usa o preço "a partir de" do produto (menor variação).
- O estoque das peças avulsas não é baixado ao vender uma variação (mesma regra do montador de kits).
- Os textos do admin seguem o padrão atual do admin (português), e os da loja seguem o padrão multi-língua existente.
