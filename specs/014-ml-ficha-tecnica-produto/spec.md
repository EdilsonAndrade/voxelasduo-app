# Feature Specification: Ficha técnica opcional do produto para anúncios do Mercado Livre

**Feature Branch**: `edilsonaandrade/edi-90-mercado-livre-ficha-tecnica-opcional-do-produto-dimensoes`
**Created**: 2026-09-08
**Status**: Draft
**Input**: User description: "Mercado Livre: ficha técnica opcional do produto (dimensões, itens inclusos, material, peso, etc.). Ref: EDI-90. Permitir que o vendedor preencha, de forma opcional (não obrigatória), campos de ficha técnica do produto (dimensões/tamanho do produto, itens inclusos na embalagem, material, peso, outras especificações conforme atributos aceitos pela categoria) que sejam enviados ao Mercado Livre junto com a publicação — via `attributes` do item quando a categoria aceitar o atributo correspondente, e/ou complementando a `description`. A ausência de preenchimento não pode bloquear a publicação."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Preencher a ficha técnica ao cadastrar/editar um produto (Priority: P1)

Ao cadastrar ou editar um produto, o vendedor quer opcionalmente informar dimensões/tamanho do produto, material, peso e itens inclusos na embalagem — dados que ajudam o comprador a decidir a compra e hoje só existem, quando existem, misturados dentro do texto livre da descrição.

**Why this priority**: É o núcleo da feature — sem campos para preencher, nada mais é possível. Entrega valor sozinho: mesmo antes de qualquer integração com o Mercado Livre, os dados ficam organizados e reaproveitáveis no cadastro.

**Independent Test**: Cadastrar um produto preenchendo os campos de ficha técnica e confirmar que os valores são salvos e reaparecem ao reabrir o produto para edição.

**Acceptance Scenarios**:

1. **Given** o formulário de cadastro/edição de produto, **When** o vendedor não preenche nenhum campo de ficha técnica, **Then** o produto é salvo e publicado normalmente, sem nenhum bloqueio ou erro.
2. **Given** o formulário de cadastro/edição de produto, **When** o vendedor preenche parcialmente a ficha técnica (ex: só o material), **Then** o produto é salvo com apenas os campos preenchidos, sem exigir os demais.
3. **Given** um produto com ficha técnica já preenchida, **When** o vendedor reabre o produto para edição, **Then** os valores previamente salvos aparecem preenchidos nos campos correspondentes.

---

### User Story 2 - Ficha técnica refletida no anúncio publicado no Mercado Livre (Priority: P1)

Ao publicar um produto com ficha técnica preenchida, o vendedor espera que essas informações cheguem ao comprador no anúncio do Mercado Livre — como atributos estruturados da categoria (ex: "Material", "Altura") quando a categoria aceitar, ou como texto complementar na descrição quando não houver atributo correspondente.

**Why this priority**: É o valor real da feature para o negócio — reduzir dúvidas do comprador antes da compra. Sem isso, a ficha técnica preenchida no cadastro nunca chega ao anúncio.

**Independent Test**: Publicar um produto de teste com ficha técnica preenchida numa categoria que aceite atributos como "Material"/dimensões, e conferir no próprio anúncio (consulta ao item publicado) que os valores aparecem nos atributos correspondentes; para os campos sem atributo equivalente na categoria, conferir que aparecem na descrição do anúncio.

**Acceptance Scenarios**:

1. **Given** um produto com ficha técnica preenchida e uma categoria que possui atributo correspondente a um desses campos (ex: "Material"), **When** o anúncio é publicado, **Then** o valor preenchido é enviado nesse atributo do item.
2. **Given** um produto com um campo de ficha técnica preenchido (ex: "itens inclusos") para o qual a categoria não possui atributo correspondente, **When** o anúncio é publicado, **Then** essa informação é incluída como texto complementar na descrição do anúncio, sem se perder.
3. **Given** um produto sem nenhum campo de ficha técnica preenchido, **When** o anúncio é publicado, **Then** a publicação ocorre normalmente, sem nenhum atributo ou trecho de descrição extra relacionado à ficha técnica.
4. **Given** um anúncio já publicado sem ficha técnica, **When** o vendedor preenche a ficha técnica depois e aplica a correção, **Then** o anúncio já publicado passa a refletir esses dados sem precisar ser despublicado e republicado (mesmo padrão já usado para Marca/Modelo e embalagem de envio).

---

### Edge Cases

- O que acontece quando a categoria do produto não possui nenhum atributo correspondente a nenhum campo da ficha técnica preenchido? Todos os campos preenchidos vão para a descrição complementar, e nenhum atributo de ficha técnica é enviado.
- O que acontece se o vendedor informar um valor de peso/dimensão do produto inválido (zero, negativo, não numérico)? O sistema rejeita o valor no cadastro, sem impedir salvar o restante do produto sem esse campo específico preenchido.
- O que acontece se a categoria marcar como **obrigatório** um atributo que também é um dos campos opcionais da ficha técnica (ex: "Material" obrigatório nessa categoria)? O fluxo de atributos obrigatórios já existente continua funcionando normalmente; quando o vendedor também preencher esse mesmo dado na ficha técnica, o valor informado pelo vendedor é o que é enviado (evita depender só do preenchimento automático genérico).
- O que acontece com produtos que já têm descrição preenchida manualmente? O texto complementar da ficha técnica é adicionado ao final da descrição existente, sem sobrescrever o que o vendedor já escreveu.
- O que acontece se o mesmo produto for editado repetidamente e a ficha técnica mudar? A publicação/atualização seguinte deve refletir os valores mais recentes, tanto nos atributos quanto no trecho complementar da descrição (sem duplicar o texto complementar a cada atualização).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST permitir que o vendedor preencha, de forma totalmente opcional, os seguintes dados de ficha técnica por produto: dimensões/tamanho do produto (altura, largura, comprimento), peso do produto, material, e itens inclusos na embalagem.
- **FR-002**: O sistema MUST permitir salvar o produto independentemente de quantos campos de ficha técnica estejam preenchidos, incluindo nenhum.
- **FR-003**: O sistema MUST rejeitar valores numéricos inválidos (zero, negativo, não numérico) nos campos de dimensão/peso da ficha técnica, sem impedir salvar o produto sem esses campos preenchidos.
- **FR-004**: O sistema MUST, ao publicar ou atualizar o anúncio, consultar os atributos aceitos pela categoria do produto e enviar cada campo preenchido da ficha técnica no atributo correspondente da categoria, quando existir um.
- **FR-005**: O sistema MUST incluir, na descrição do anúncio, os campos de ficha técnica preenchidos para os quais a categoria não possua atributo correspondente, sem sobrescrever o texto de descrição já escrito pelo vendedor.
- **FR-006**: O sistema MUST permitir atualizar a ficha técnica (atributos e/ou descrição) de um anúncio já publicado sem exigir que o anúncio seja despublicado e republicado, reaproveitando o mecanismo já existente de correção de atributos.
- **FR-007**: O sistema MUST re-aplicar o texto complementar de ficha técnica na descrição de forma idempotente — atualizações sucessivas não duplicam o mesmo trecho complementar.
- **FR-008**: O sistema MUST manter distintos os dados de ficha técnica do produto (dimensões/peso do produto em si) dos dados já existentes de embalagem de envio (peso/dimensões da caixa, EDI-96) e de custo de produção (peso da peça, EDI-92) — sem reaproveitar um pelo outro.

### Key Entities *(include if feature involves data)*

- **Ficha Técnica do Produto**: Conjunto opcional de especificações do produto — dimensões (altura, largura, comprimento), peso, material e itens inclusos na embalagem — usado para enriquecer a publicação no Mercado Livre. Distinto da embalagem de envio (EDI-96) e do peso da peça para custo (EDI-92).
- **Atributo do Anúncio**: Par (identificador do atributo, valor) enviado ao Mercado Livre — já usado para Marca/Modelo/embalagem de envio (EDI-95/EDI-96); passa a incluir também os atributos correspondentes à ficha técnica quando a categoria os aceitar.
- **Descrição do Anúncio**: Texto do anúncio no Mercado Livre; passa a poder incluir um trecho complementar gerado a partir dos campos de ficha técnica sem atributo de categoria correspondente, preservando o texto original do vendedor.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos produtos podem ser salvos e publicados com a ficha técnica totalmente vazia, sem nenhum erro ou bloqueio.
- **SC-002**: Para uma categoria que aceite atributos correspondentes a algum campo da ficha técnica, 100% dos campos preenchidos aparecem no anúncio publicado como atributos estruturados (verificável consultando o item publicado).
- **SC-003**: Para campos de ficha técnica preenchidos sem atributo correspondente na categoria, 100% aparecem na descrição do anúncio publicado, sem perda de informação.
- **SC-004**: Anúncios já publicados sem ficha técnica podem ser corrigidos para incluí-la sem precisar ser despublicados e republicados.
- **SC-005**: Nenhum produto é salvo com valor de dimensão/peso da ficha técnica inválido (zero, negativo, não numérico).

## Assumptions

- Os campos fixos da ficha técnica (dimensões do produto, peso, material, itens inclusos) cobrem o pedido do ticket (EDI-90); um mapeamento totalmente dinâmico de "qualquer atributo aceito pela categoria" fica fora de escopo desta entrega — pode ser um refinamento futuro caso surjam categorias com especificações relevantes fora desse conjunto.
- "Dimensões/tamanho do produto" e "peso do produto" desta ficha técnica são medidas do **produto em si** (o que o comprador recebe montado/pronto), distintas das dimensões e peso da **embalagem de envio** já existentes (`EmbalagemEnvio`, EDI-96), que incluem caixa/proteção e servem só para cálculo de frete.
- "Itens inclusos" é um campo de texto livre (lista simples do que acompanha o produto), sem uma categoria fechada de valores — não há atributo padrão do Mercado Livre equivalente para a maioria das categorias, então normalmente vai para a descrição complementar.
- O mapeamento entre campo de ficha técnica e atributo do Mercado Livre usa os IDs de atributo mais comuns por convenção de categoria (ex: `MATERIAL`, `HEIGHT`/`WIDTH`/`LENGTH`/`DEPTH` do produto — distintos de `SELLER_PACKAGE_*`, que são da embalagem de envio); quando a categoria não expuser um atributo com esse ID, o campo cai para a descrição complementar.
- A correção retroativa de anúncios já publicados (FR-006) reaproveita o mesmo mecanismo de atualização parcial via `PUT /items/{id}` já usado para Marca/Modelo/embalagem de envio (EDI-95/EDI-96), estendendo-o para também atualizar a descrição quando necessário.
- Fora de escopo: qualquer mudança na calculadora de custo/preço sugerido (EDI-92); qualquer mudança na integração com a Shopee; validação automática de quais atributos cada categoria específica aceita antes do cadastro (a checagem acontece no momento da publicação, reaproveitando `buscarAtributosObrigatorios`/consulta de atributos da categoria já existente).
