# Feature Specification: Correções urgentes de atributos e frete nos anúncios do Mercado Livre

**Feature Branch**: `edilsonaandrade/edi-95-edi-96-marca-modelo-e-frete-embalagem`
**Created**: 2026-09-08
**Status**: Draft
**Input**: User description: "Correções urgentes na publicação de anúncios no Mercado Livre (EDI-95 + EDI-96) — atributos Marca/Modelo saindo iguais ao nome do produto, e frete caro/demorado por falta de peso/dimensões da embalagem no anúncio. Ambos afetam anúncios já publicados e ativos na loja."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Atributos de marca e modelo corretos nos anúncios (Priority: P1)

Ao publicar um produto no Mercado Livre, o vendedor espera que os atributos "Marca" e "Modelo" do anúncio façam sentido para o comprador — não podem sair idênticos ao nome completo do produto, o que hoje acontece e passa uma impressão pouco profissional/confiável ao anúncio.

**Why this priority**: Já está afetando anúncios reais e ativos na loja, prejudicando a percepção de qualidade e possivelmente a conversão de vendas. Correção simples e de alto impacto.

**Independent Test**: Publicar um produto de teste numa categoria que exija Marca e Modelo como atributos de texto livre e conferir que os dois valores não saem idênticos ao nome do produto (nem entre si).

**Acceptance Scenarios**:

1. **Given** um produto sendo publicado numa categoria que exige o atributo "Marca" como texto livre e não há uma marca real informada, **When** o anúncio é criado, **Then** o valor de "Marca" indica claramente que o produto não tem marca definida (não é idêntico ao nome do produto).
2. **Given** a mesma categoria também exige o atributo "Modelo", **When** o anúncio é criado, **Then** o valor de "Modelo" não é idêntico ao valor usado para "Marca".
3. **Given** um anúncio já publicado anteriormente com "Marca" e "Modelo" idênticos ao nome do produto, **When** a correção é aplicada, **Then** o anúncio publicado passa a refletir os valores corrigidos, sem precisar ser despublicado e republicado.

---

### User Story 2 - Frete condizente com o peso/tamanho real do produto (Priority: P1)

Ao publicar um produto no Mercado Livre, o vendedor precisa que o comprador veja um custo e prazo de frete condizentes com o tamanho e peso reais do produto — hoje o frete cotado está caro (mais da metade do valor do produto, em um caso observado) e demorado, o que afasta compradores.

**Why this priority**: Impacto direto na competitividade e nas vendas de anúncios já ativos; mesma urgência da User Story 1.

**Independent Test**: Cadastrar um produto informando peso e dimensões da embalagem pronta para envio, publicá-lo, e conferir no próprio anúncio que o frete cotado para um CEP de teste reflete um pacote do tamanho/peso informado (não um padrão genérico maior).

**Acceptance Scenarios**:

1. **Given** um produto com peso e dimensões da embalagem informados no cadastro, **When** o anúncio é publicado, **Then** o Mercado Livre recebe essas informações e usa-as para calcular o frete oferecido ao comprador.
2. **Given** um produto sem peso/dimensões de embalagem informados, **When** o vendedor tenta publicar, **Then** o sistema orienta a preencher esses dados antes de publicar (ou avisa claramente que o frete pode ficar impreciso sem eles).
3. **Given** um anúncio já publicado com frete caro/demorado por falta desses dados, **When** o vendedor informa peso/dimensões da embalagem e a correção é aplicada, **Then** o anúncio publicado passa a refletir esses dados sem precisar ser despublicado e republicado, e o frete cotado melhora.

---

### Edge Cases

- O que acontece quando a categoria do produto não exige o atributo "Marca" ou "Modelo"? Nenhum valor precisa ser preenchido automaticamente para esse atributo (o comportamento atual para atributos não obrigatórios não muda).
- O que acontece se o vendedor souber a marca real do produto (produto de terceiros revendido, por exemplo)? Deve ser possível informar uma marca real, não apenas o valor genérico automático.
- Como o sistema decide quais anúncios já publicados precisam da correção retroativa? Deve ser possível identificar quais anúncios ativos estão com Marca/Modelo duplicados ou sem peso/dimensões de embalagem, para priorizar a correção.
- O que acontece se o peso/dimensões informados forem inconsistentes (ex: zero, negativo)? Deve ser tratado como dado inválido/incompleto, sem publicar um anúncio com frete baseado em dado errado.
- O que acontece com produtos que têm variações (cores, tamanhos) com pesos/dimensões de embalagem diferentes entre si? Cada variação deveria poder ter seu próprio peso/dimensões quando isso influenciar o frete de forma relevante — ou, no mínimo, usar o maior/mais conservador entre as variações para não subestimar o frete.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST preencher automaticamente o atributo "Marca" (quando obrigatório e de texto livre) com um valor que deixe claro que o produto não tem marca definida, e não com o nome do produto.
- **FR-002**: O sistema MUST garantir que, quando "Marca" e "Modelo" forem ambos atributos obrigatórios de texto livre na mesma categoria, os valores preenchidos automaticamente não sejam idênticos entre si.
- **FR-003**: O sistema MUST permitir que o vendedor informe manualmente uma marca real do produto, quando aplicável, em vez de depender apenas do preenchimento automático.
- **FR-004**: O sistema MUST permitir corrigir os atributos "Marca"/"Modelo" de anúncios já publicados sem exigir que o anúncio seja despublicado e republicado.
- **FR-005**: O sistema MUST permitir que o vendedor informe, por produto, o peso e as dimensões da embalagem pronta para envio (distintos do peso da peça em si, já usado para cálculo de custo de produção).
- **FR-006**: O sistema MUST enviar o peso e as dimensões da embalagem ao Mercado Livre no momento da publicação do anúncio, para que o frete calculado reflita o tamanho/peso reais do produto.
- **FR-007**: O sistema MUST orientar o vendedor, de forma clara e não bloqueante, quando peso/dimensões da embalagem não estiverem preenchidos ao publicar um produto — permitindo publicar mesmo assim, mas avisando do possível impacto no frete.
- **FR-008**: O sistema MUST rejeitar valores de peso/dimensões de embalagem inválidos (zero, negativos ou não numéricos) no cadastro do produto.
- **FR-009**: O sistema MUST permitir corrigir peso/dimensões da embalagem de anúncios já publicados sem exigir que o anúncio seja despublicado e republicado, e refletir essa correção no cálculo de frete do Mercado Livre.
- **FR-010**: O sistema MUST permitir identificar quais anúncios já publicados e ativos estão afetados por qualquer um dos dois problemas (Marca/Modelo duplicados; peso/dimensões de embalagem ausentes), para priorizar a correção retroativa.

### Key Entities *(include if feature involves data)*

- **Atributo do Anúncio**: Par (identificador do atributo, valor) enviado ao Mercado Livre ao publicar ou atualizar um produto — inclui atributos como Marca, Modelo, e os de peso/dimensões da embalagem.
- **Dados de Embalagem do Produto**: Peso e dimensões (altura, largura, comprimento) da embalagem pronta para envio de um produto — distintos do peso da peça usado no cálculo de custo de produção (EDI-92), pois incluem proteção/caixa.
- **Anúncio Publicado**: Representação de um produto já ativo no Mercado Livre, identificável e atualizável independentemente de uma nova publicação.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos novos anúncios publicados em categorias que exigem Marca e Modelo como texto livre saem com valores diferentes entre si (não mais idênticos ao nome do produto).
- **SC-002**: 100% dos anúncios já publicados identificados com Marca/Modelo duplicados são corrigidos sem necessidade de remover e recriar o anúncio.
- **SC-003**: Para produtos com peso/dimensões de embalagem informados, o frete cotado ao comprador reflete o tamanho/peso reais do produto (verificável comparando a cotação antes e depois da correção no mesmo anúncio).
- **SC-004**: Anúncios já publicados identificados com frete impreciso por falta de peso/dimensões são corrigidos e passam a cotar um frete mais barato e/ou mais rápido, sem necessidade de remover e recriar o anúncio.
- **SC-005**: Nenhum anúncio é publicado com peso/dimensões de embalagem inválidos (zero, negativo).

## Assumptions

- "Corrigir sem despublicar/republicar" significa atualizar os dados do anúncio já ativo via atualização direta (o Mercado Livre permite atualizar atributos e alguns dados de um item já publicado sem fechá-lo) — não uma recriação do anúncio.
- Peso e dimensões da embalagem são um dado novo, específico por produto, não coberto pelo "peso da peça" já existente na calculadora de custo de produção (EDI-92) — este último é só a peça, sem embalagem/proteção.
- A identificação de quais anúncios já publicados estão afetados (Marca/Modelo duplicados, ou sem peso/dimensões) pode ser feita consultando os anúncios existentes vinculados aos produtos já cadastrados no sistema — não depende de uma auditoria manual externa ao sistema.
- O valor genérico usado para "Marca" quando não há marca real (FR-001) segue o mesmo padrão já adotado para atributos do tipo lista fechada (algo como "Genérica"/"Não especificado"), mantendo consistência entre categorias.
- Fora de escopo: qualquer mudança na calculadora de custo/preço sugerido (EDI-92) além de reaproveitar dados quando fizer sentido; qualquer mudança na integração com a Shopee; otimizações mais amplas de logística além de peso/dimensões (ex: escolha de modalidade de envio) ficam para um refinamento futuro (EDI-94).
