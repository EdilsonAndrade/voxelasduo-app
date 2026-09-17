# Feature Specification: Ordenar fotos do produto (Mercado Livre e site)

**Feature Branch**: `edilsonaandrade/edi-99-mercado-livre-permitir-reordenar-fotos-e-video-antes-de`
**Created**: 2026-09-17
**Status**: Draft
**Input**: User description: "EDI-99 — Mercado Livre: permitir reordenar fotos e vídeo antes de publicar o anúncio. EDI-88 já traz suporte a múltiplas fotos (até 6) e vídeo (clip) na publicação de produtos no Mercado Livre, mas não cobre a ordem em que aparecem no anúncio. Permitir que o vendedor escolha/ajuste, pelo site, a ordem das fotos (e a posição do vídeo) antes de publicar ou atualizar o anúncio no Mercado Livre."

## Clarifications

### Session 2026-09-17

- Q: Vídeo ainda não existe no modelo do produto (EDI-88, que adiciona o campo de vídeo, está "Todo"). Como tratar vídeo nesta feature? → A: Só fotos por agora — a posição do vídeo fica para quando o EDI-88 adicionar o campo de vídeo ao produto.
- Q: A ordem das fotos hoje é um único array usado tanto no anúncio do Mercado Livre quanto na galeria do produto no site. Reordenar deve valer para os dois juntos ou só para o Mercado Livre? → A: Ordem única compartilhada — reordenar no admin muda a ordem nos dois lugares ao mesmo tempo.
- Q: O Mercado Livre aceita no máximo 6 fotos por anúncio, mas o produto pode ter mais de 6 cadastradas. O que fazer? → A: Aplicar o limite de 6 — só as 6 primeiras da ordem escolhida vão para o anúncio; as demais continuam na galeria do site.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reordenar as fotos do produto (Priority: P1)

Como vendedor, ao editar um produto no admin, quero arrastar (ou mover com setas) as fotos já cadastradas para escolher em que ordem elas aparecem, e ter essa ordem salva.

**Why this priority**: É a capacidade central pedida — sem ela não existe controle nenhum sobre a ordem, hoje ela é apenas "a ordem em que a foto foi enviada".

**Independent Test**: Pode ser testado isoladamente abrindo um produto com 3+ fotos, mudando a posição de uma delas e salvando — a nova ordem deve persistir ao reabrir o produto, mesmo sem tocar em nada relacionado ao Mercado Livre.

**Acceptance Scenarios**:

1. **Given** um produto com 4 fotos cadastradas, **When** o vendedor move a 3ª foto para a 1ª posição e salva, **Then** o produto passa a ter essa foto como a primeira do array `fotos`.
2. **Given** um produto com apenas 1 foto, **When** o vendedor abre a tela de edição, **Then** os controles de reordenação ficam desabilitados ou ocultos (não há o que reordenar).
3. **Given** uma reordenação feita mas não salva, **When** o vendedor sai da tela sem salvar, **Then** a ordem anterior é mantida (nenhuma mudança é persistida).

---

### User Story 2 - Anúncio do Mercado Livre respeita a ordem escolhida (Priority: P1)

Como vendedor, quero que a ordem de fotos que eu defini no site seja a mesma ordem exibida no anúncio do Mercado Livre, tanto ao criar quanto ao atualizar o anúncio.

**Why this priority**: É o valor de negócio citado no ticket — hoje a ordem enviada ao Mercado Livre é só a ordem "acidental" de upload; sem isso, reordenar no site não teria efeito nenhum no canal de venda.

**Independent Test**: Pode ser testado publicando (ou atualizando) o anúncio de um produto logo após reordenar as fotos, e conferindo que a sequência de imagens no anúncio do Mercado Livre bate com a ordem definida no admin.

**Acceptance Scenarios**:

1. **Given** um produto ainda não publicado no Mercado Livre com fotos reordenadas, **When** o vendedor publica o anúncio, **Then** o anúncio criado exibe as fotos na mesma ordem definida no admin.
2. **Given** um produto já publicado no Mercado Livre, **When** o vendedor reordena as fotos e a integração é atualizada, **Then** o anúncio existente passa a exibir as fotos na nova ordem.

---

### User Story 3 - Indicar quais fotos vão para o Mercado Livre quando há mais de 6 (Priority: P2)

Como vendedor, quando cadastro mais de 6 fotos num produto, quero saber visualmente quais 6 (e em que ordem) serão enviadas para o anúncio do Mercado Livre, já que o canal tem esse limite.

**Why this priority**: Evita confusão/erro do vendedor ("por que essa foto não aparece no anúncio?"), mas depende da User Story 1 já existir — só faz sentido quando há mais de 6 fotos, um caso secundário.

**Independent Test**: Pode ser testado cadastrando 8 fotos num produto e verificando que a UI marca claramente as 6 primeiras (na ordem atual) como as que vão para o Mercado Livre, sem precisar abrir o anúncio publicado para conferir.

**Acceptance Scenarios**:

1. **Given** um produto com 8 fotos cadastradas, **When** o vendedor visualiza a lista de fotos no admin, **Then** as 6 primeiras (na ordem atual) são marcadas como as que vão para o Mercado Livre e as 2 restantes são marcadas como "não vai para o Mercado Livre".
2. **Given** um produto com 8 fotos, **When** o vendedor reordena trazendo uma foto que antes era a 7ª para a 2ª posição, **Then** a marcação de "vai para o Mercado Livre" é recalculada e passa a incluir essa foto.

### Edge Cases

- Produto com exatamente 6 fotos: todas vão para o Mercado Livre, nenhuma marcação de corte é necessária.
- Produto com mais de 6 fotos que já tem anúncio publicado no Mercado Livre com uma ordem antiga: o anúncio só reflete a nova ordem/corte na próxima criação ou atualização da integração — reordenar sozinho, sem publicar/atualizar, não altera o anúncio já no ar.
- Falha ao salvar a nova ordem (erro de rede/servidor): a ordem exibida na tela deve reverter para a última ordem salva, com uma mensagem de erro, para não sugerir uma ordem que não foi persistida.
- Produto sem nenhuma foto: fora de escopo — o cadastro de produto já exige ao menos 1 foto antes de salvar.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O admin de edição de produto MUST permitir ao vendedor reordenar as fotos já cadastradas de um produto (arrastar ou mover por setas/botões).
- **FR-002**: A ordem escolhida MUST ser persistida como a ordem canônica do array de fotos do produto.
- **FR-003**: A galeria do produto exibida no portal Voxelasduo MUST seguir a mesma ordem persistida (ordem única, compartilhada entre site e Mercado Livre).
- **FR-004**: Ao criar um anúncio no Mercado Livre, o sistema MUST enviar as fotos na ordem persistida do produto.
- **FR-005**: Ao atualizar um anúncio já existente no Mercado Livre, o sistema MUST reenviar as fotos na ordem persistida vigente no momento da atualização.
- **FR-006**: Quando o produto tiver mais de 6 fotos, o sistema MUST enviar ao Mercado Livre apenas as 6 primeiras da ordem persistida, sem falhar a criação/atualização do anúncio por causa das fotos excedentes.
- **FR-007**: Quando o produto tiver mais de 6 fotos, o admin MUST indicar visualmente quais fotos (as 6 primeiras, na ordem atual) serão enviadas ao Mercado Livre.
- **FR-008**: Reordenar fotos sem salvar MUST NOT alterar a ordem persistida nem o anúncio publicado.
- **FR-009**: Vídeo está fora de escopo desta feature — nenhuma posição/ordem de vídeo é tratada aqui; isso fica para quando o campo de vídeo (EDI-88) existir no produto.

### Key Entities

- **Produto.fotos**: lista ordenada de URLs de foto do produto; a posição no array passa a ser controlável pelo vendedor e é a mesma fonte usada pela galeria do site e pelo anúncio do Mercado Livre.
- **Anúncio Mercado Livre**: recurso remoto (`pictures`) que reflete, em cada criação/atualização, as até 6 primeiras fotos da ordem persistida do produto.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O vendedor consegue reordenar as fotos de um produto e salvar a nova ordem em menos de 1 minuto.
- **SC-002**: 100% dos anúncios criados ou atualizados no Mercado Livre após esta feature exibem as fotos exatamente na ordem escolhida pelo vendedor (respeitado o corte de 6).
- **SC-003**: Em produtos com mais de 6 fotos, o vendedor identifica quais fotos vão para o anúncio do Mercado Livre olhando só o admin do site, sem precisar abrir o anúncio publicado.
- **SC-004**: Reordenar fotos não altera a quantidade de fotos do produto nem exige reenvio/novo upload de nenhuma imagem.

## Assumptions

- A ordem de fotos é única e compartilhada entre a galeria do site e o anúncio do Mercado Livre (não existe uma ordem separada por canal).
- Vídeo (posição/ordem) fica fora de escopo até o EDI-88 introduzir o campo de vídeo no produto; esta feature não cria esse campo.
- O limite de 6 fotos por anúncio é uma regra do Mercado Livre (não se aplica à galeria do site, que pode continuar exibindo todas as fotos cadastradas).
- Produtos já publicados no Mercado Livre só recebem a nova ordem/corte na próxima atualização da integração — não há reenvio automático só por causa de uma reordenação.
