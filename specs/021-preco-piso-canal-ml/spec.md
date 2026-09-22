# Feature Specification: Preço por canal com piso de margem e promoções elegíveis do Mercado Livre

**Feature Branch**: `edilsonaandrade/edi-108-preco-por-canal-com-piso-de-margem-e-promocoes-elegiveis-do`
**Created**: 2026-09-22
**Status**: Draft
**Input**: Linear EDI-108 — "Preço por canal com piso de margem e promoções elegíveis do Mercado Livre"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver o preço mínimo e o desconto máximo por canal antes de entrar numa promoção (Priority: P1)

O vendedor define, uma vez, a margem de lucro mínima que aceita ganhar (ex.: 15%) — como padrão para toda a loja, podendo sobrescrever num produto específico. Ao abrir o cadastro/edição de um produto, para cada canal (Mercado Livre, Shopee, site próprio) ele vê, ao lado do preço sugerido que já existe hoje: o preço mínimo (abaixo do qual a margem mínima seria furada) e o desconto máximo, em R$ e em %, que pode aplicar numa promoção sem vender no prejuízo — mesmo numa peça só.

**Why this priority**: É o núcleo do pedido: hoje o vendedor não tem como saber até onde pode descontar numa promoção sem arriscar prejuízo; teria que calcular na mão.

**Independent Test**: Definir a margem mínima uma vez, abrir um produto e conferir que cada canal mostra preço mínimo e desconto máximo condizentes com a margem definida — sem precisar redigitar a margem.

**Acceptance Scenarios**:

1. **Given** uma margem mínima de 15% definida como padrão, **When** o vendedor abre qualquer produto, **Then** cada canal mostra preço mínimo e desconto máximo (R$ e %) calculados com 15%, sem precisar informar a margem de novo.
2. **Given** um produto com margem mínima própria sobrescrita (ex.: 25%, por ter menos concorrência), **When** o vendedor abre esse produto, **Then** o preço mínimo e o desconto máximo desse produto usam 25%, e os demais produtos continuam usando o padrão da loja.
3. **Given** um canal cuja comissão somada à margem mínima ultrapassa 100% do preço, **When** o preço mínimo seria calculado, **Then** o canal exibe um aviso de que não existe preço que atenda essa margem nesse canal, em vez de um valor inválido.
4. **Given** o preço mínimo calculado, **When** o vendedor aplica esse desconto na promoção nativa do próprio marketplace (fora do nosso sistema), **Then** o valor mostrado é exatamente o piso a não ultrapassar — a ativação da promoção em si continua sendo feita no painel do Mercado Livre/Shopee, não neste sistema.

---

### User Story 2 - Ter um preço de venda próprio por canal (Priority: P2)

O vendedor define um preço de venda específico para o site, outro para o Mercado Livre e outro para a Shopee — em vez de um único preço replicado em todos os lugares. Ao salvar o produto, cada canal já publicado é sincronizado automaticamente com o seu próprio preço, do mesmo jeito que a sincronização já funciona hoje (sem nenhum passo ou clique extra).

**Why this priority**: Permite oferecer uma vantagem real a quem compra direto no site (sem a comissão do marketplace), mas depende da User Story 1 já existir para fazer sentido definir cada preço com segurança.

**Independent Test**: Definir preços diferentes para site e Mercado Livre num produto já publicado nos dois canais, salvar, e conferir que cada canal reflete o preço próprio dele (e não o de outro canal).

**Acceptance Scenarios**:

1. **Given** um produto ainda não publicado em nenhum canal, **When** o vendedor cadastra, **Then** pode informar um preço para cada canal (site obrigatório; Mercado Livre e Shopee usam o preço do site como ponto de partida, editável).
2. **Given** um produto com preços diferentes por canal, **When** o vendedor salva, **Then** cada canal publicado é atualizado com o preço daquele canal especificamente, sem afetar os demais.
3. **Given** um produto já cadastrado antes desta funcionalidade existir (preço único), **When** o vendedor abre para editar, **Then** todos os canais aparecem inicialmente com esse mesmo preço (sem perda de dado), e podem ser diferenciados a partir daí.
4. **Given** preços diferentes por canal, **When** o preço mínimo e o desconto máximo da User Story 1 são calculados, **Then** cada canal usa o próprio preço dele como referência, não mais um preço único compartilhado.

---

### User Story 3 - Ver quais promoções do Mercado Livre cabem dentro da margem mínima (Priority: P2)

Para um produto já publicado no Mercado Livre, o vendedor vê a lista de promoções para as quais o produto é elegível na própria plataforma e, para cada uma, um indicativo claro de "vale a pena entrar" (com o lucro estimado que ainda resta) ou "fura a margem mínima, não vale a pena" — sem precisar calcular na mão qual desconto cada promoção pede.

**Why this priority**: Automatiza a decisão que a User Story 1 já habilita manualmente, mas depende de uma API externa cujo comportamento ainda não foi confirmado — maior risco técnico, por isso prioridade um degrau abaixo.

**Independent Test**: Abrir um produto publicado no Mercado Livre com promoções elegíveis retornadas pela plataforma e conferir que cada uma aparece marcada corretamente como "vale a pena" ou "fura a margem", com o lucro estimado exibido nas que valem a pena.

**Acceptance Scenarios**:

1. **Given** um produto publicado no Mercado Livre com promoções elegíveis disponíveis, **When** o vendedor abre o produto, **Then** vê a lista de promoções com o desconto que cada uma exige e o resultado: "vale a pena" (com o lucro estimado) ou "fura a margem mínima".
2. **Given** um produto sem nenhuma promoção elegível no momento, **When** o vendedor abre o produto, **Then** vê uma mensagem de que não há promoções disponíveis agora, sem erro.
3. **Given** um produto ainda não publicado no Mercado Livre, **When** o vendedor abre o produto, **Then** a seção de promoções não aparece (não há anúncio para ter promoção).
4. **Given** a consulta de promoções ao Mercado Livre falhar ou ficar indisponível, **When** o vendedor abre o produto, **Then** o restante da tela (preço mínimo, desconto máximo manual da User Story 1) continua funcionando normalmente, com um aviso claro de que a lista de promoções não pôde ser carregada — sem esconder o erro real da aba Network.

---

### Edge Cases

- Margem mínima definida como 0%: preço mínimo vira o próprio breakeven (sem lucro nem prejuízo) — comportamento válido, não um erro.
- Margem mínima muito alta (ex.: 90%) somada a uma comissão alta: cai no aviso de "não existe preço que atenda essa margem" (US1, cenário 3), não trava a tela.
- Produto com custo de produção ainda não preenchido: preço mínimo e desconto máximo não são calculados até o custo existir — mensagem orientando a preencher o custo primeiro.
- Promoção do Mercado Livre que exige preço fixo em vez de desconto percentual: tratada pela mesma comparação (o preço fixo da promoção é comparado diretamente ao preço mínimo).
- Dois vendedores (não se aplica — loja de um administrador só) editando o mesmo produto ao mesmo tempo: fora de escopo, mesmo comportamento já existente hoje no cadastro de produtos.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST permitir definir uma margem de lucro mínima padrão para toda a loja, editável na mesma tela onde as taxas dos canais já são configuradas.
- **FR-002**: O sistema MUST permitir sobrescrever a margem mínima padrão em um produto específico, com o mesmo padrão de herança já usado pelas taxas dos canais (ausente = usa o padrão da loja).
- **FR-003**: O sistema MUST calcular e exibir, para cada canal (Mercado Livre, Shopee, site próprio), o preço mínimo que ainda respeita a margem mínima efetiva daquele produto.
- **FR-004**: O sistema MUST calcular e exibir, para cada canal, o desconto máximo (em R$ e em %) entre o preço atual daquele canal e o preço mínimo.
- **FR-005**: Quando a comissão do canal somada à margem mínima tornar o preço mínimo inválido (>= 100% do preço), o sistema MUST exibir um aviso nesse canal em vez de um valor calculado.
- **FR-006**: O sistema MUST permitir definir um preço de venda próprio por canal (site, Mercado Livre, Shopee) em vez de um único preço compartilhado.
- **FR-007**: Ao salvar um produto, o sistema MUST sincronizar cada canal já publicado com o preço próprio daquele canal, usando o mesmo gatilho automático de sincronização já existente (sem passo manual adicional).
- **FR-008**: Produtos cadastrados antes desta funcionalidade MUST continuar funcionando sem perda de dado — o preço único existente vira o ponto de partida para todos os canais na primeira edição.
- **FR-009**: Para um produto publicado no Mercado Livre, o sistema MUST consultar as promoções elegíveis para aquele produto na própria plataforma.
- **FR-010**: Para cada promoção elegível retornada, o sistema MUST calcular se o preço promocional resultante respeita o preço mínimo do canal Mercado Livre e indicar claramente se vale a pena (com o lucro estimado) ou se fura a margem mínima.
- **FR-011**: Quando não houver promoções elegíveis, ou o produto não estiver publicado no Mercado Livre, o sistema MUST exibir esse estado claramente, sem erro.
- **FR-012**: Quando a consulta de promoções ao Mercado Livre falhar, o sistema MUST manter o restante da tela funcionando (preço mínimo/desconto máximo manual) e exibir um aviso específico, sem mascarar o status real do erro na aba Network.
- **FR-013**: O sistema MUST NOT consultar ou exibir promoções da Shopee (sem API disponível) — a Shopee usa apenas o preço mínimo/desconto máximo manual da User Story 1.
- **FR-014**: O sistema MUST NOT ativar ou aplicar promoções no Mercado Livre por conta própria — a lista é somente informativa; a ativação continua manual, no painel do próprio marketplace.
- **FR-015**: O sistema MUST seguir o padrão de textos já existente do admin (pt-BR inline, sem biblioteca de i18n).

### Key Entities

- **Margem mínima efetiva**: Percentual mínimo de lucro aceitável, com padrão global (loja) e override opcional por produto — mesmo padrão de herança já usado pelas taxas dos canais.
- **Preço por canal**: Preço de venda específico de um produto num canal (site, Mercado Livre ou Shopee) — substitui o preço único compartilhado; ausente num canal ainda não diferenciado assume o preço do site.
- **Resultado de piso por canal**: Preço mínimo e desconto máximo (R$ e %) calculados para um canal, a partir do preço daquele canal, sua comissão e a margem mínima efetiva do produto.
- **Promoção elegível (Mercado Livre)**: Uma promoção que a plataforma oferece para aquele produto específico — atributos: desconto exigido (percentual ou preço fixo), e o resultado da comparação com o preço mínimo (vale a pena / fura a margem).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O vendedor consegue ver o preço mínimo e o desconto máximo de um produto em qualquer canal sem fazer nenhuma conta manual.
- **SC-002**: A margem mínima definida uma vez continua valendo em qualquer produto aberto depois, sem precisar ser redigitada.
- **SC-003**: Depois de diferenciar os preços por canal, salvar o produto atualiza cada canal publicado com o preço correto, sem nenhum passo manual além de salvar.
- **SC-004**: Para um produto publicado no Mercado Livre com promoções elegíveis, o vendedor identifica em poucos segundos quais promoções valem a pena, sem abrir uma calculadora externa.
- **SC-005**: Uma falha na consulta de promoções do Mercado Livre nunca impede o vendedor de ver o preço mínimo/desconto máximo do produto.

## Assumptions

- Só administradores usam esta funcionalidade — mesma proteção de autenticação já existente no painel (`/admin/*`, `/api/admin/*`).
- A margem mínima é um percentual sobre o preço de venda (mesma convenção de margem já usada no comparador de canais do EDI-106).
- "Preço atual do canal" para o cálculo de desconto máximo é o preço de venda daquele canal (site, ML ou Shopee) definido na User Story 2; antes de a User Story 2 existir ou enquanto não diferenciado, usa o preço único hoje existente.
- A consulta de promoções elegíveis (User Story 3) depende de um produto já publicado no Mercado Livre (com `mercadoLivreId`) — sem isso, a seção simplesmente não aparece.
- O endpoint exato da API de promoções do Mercado Livre e o formato da resposta ainda não foram confirmados (ver ponto de atenção técnico do ticket EDI-108) — a validação definitiva acontece na fase de planejamento técnico; se a API não se confirmar viável, a User Story 3 fica reduzida ou fora, sem afetar as User Stories 1 e 2.
- Frete não entra nesta fórmula de preço mínimo (tratado separadamente, ver EDI-94).
- Aplicar/ativar a promoção de fato no Mercado Livre continua manual, no painel nativo da plataforma — este sistema é só consulta e orientação.
