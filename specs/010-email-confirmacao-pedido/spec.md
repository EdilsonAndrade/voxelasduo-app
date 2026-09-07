# Feature Specification: E-mail de confirmação de pedido e padronização visual dos e-mails transacionais

**Feature Branch**: `edilsonaandrade/edi-87-tarefa-12-e-mail-de-confirmacao-de-pedido-para-compra-no`
**Created**: 2026-09-06
**Status**: Draft
**Input**: User description: "Tarefa 12 (EDI-87): E-mail de confirmação de pedido para compra no site (autenticado ou convidado). Enviar e-mail de confirmação de pedido ao comprador assim que a compra é finalizada (pagamento aprovado) no checkout do site, incluindo número do pedido, itens comprados e valor total, para o e-mail de contato informado no checkout (funciona também para convidado, sem exigir conta). Reaproveitar o mesmo provedor de e-mail transacional (Resend) já configurado na Tarefa 10/EDI-84. Realizar um design bonito e padrão com as cores do site, com o design alinhado à marca. Ajustar também os e-mails já existentes (recuperação de senha, verificação de e-mail, notificação de venda externa ao admin) para seguir o mesmo padrão visual, incluindo sempre o logo da Voxelas Duo."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Confirmação de compra por e-mail (Priority: P1)

Uma pessoa finaliza uma compra no site da Voxelas Duo — autenticada ou como convidada — e, assim que o pagamento é aprovado, recebe um e-mail confirmando o pedido, com o número do pedido, os itens comprados e o valor total pago.

**Why this priority**: É o core da tarefa (EDI-87) e resolve uma lacuna de confiança já identificada: hoje quem compra no site não recebe nenhuma confirmação por e-mail, só vê a tela de "pagamento aprovado" no navegador.

**Independent Test**: Finalizar uma compra de teste no checkout do site (com cartão aprovado) como convidado (sem conta) e verificar que o e-mail informado no checkout recebe a confirmação com os dados corretos do pedido.

**Acceptance Scenarios**:

1. **Given** uma pessoa convidada (sem conta) preenche o checkout com um e-mail de contato e paga com um método aprovado de imediato, **When** o pagamento é confirmado, **Then** ela recebe um e-mail de confirmação com número do pedido, itens e valor total, no e-mail informado no checkout.
2. **Given** uma pessoa autenticada finaliza uma compra, **When** o pagamento é aprovado, **Then** ela recebe o mesmo e-mail de confirmação, no e-mail associado à sua conta.
3. **Given** um pedido pago via Pix, cuja aprovação chega de forma assíncrona (confirmação do pagamento chega minutos depois, fora da tela de checkout), **When** essa aprovação assíncrona é processada, **Then** o e-mail de confirmação ainda assim é enviado.
4. **Given** um pedido cujo pagamento não foi aprovado (pendente, recusado ou expirado), **When** o checkout é concluído sem aprovação, **Then** nenhum e-mail de confirmação de compra é enviado para esse pedido.

---

### User Story 2 - Identidade visual consistente em todos os e-mails (Priority: P2)

Uma pessoa que recebe qualquer e-mail da Voxelas Duo (confirmação de compra, recuperação de senha, verificação de cadastro) reconhece imediatamente a marca pelo logo e pelas cores usadas no e-mail, do mesmo jeito que reconhece o site.

**Why this priority**: A tarefa pede explicitamente que o design "bonito e padrão com as cores do site" valha para a confirmação de pedido e também para os e-mails já existentes — sem isso, a experiência fica inconsistente entre um e-mail novo bem cuidado e os demais ainda em texto simples.

**Independent Test**: Disparar cada um dos e-mails transacionais existentes (recuperação de senha, verificação de e-mail, notificação de venda externa ao admin) e o novo e-mail de confirmação de pedido, e comparar visualmente que todos usam o mesmo cabeçalho com logo, a mesma paleta de cores e a mesma estrutura.

**Acceptance Scenarios**:

1. **Given** qualquer um dos e-mails transacionais do site (confirmação de pedido, recuperação de senha, verificação de cadastro, notificação de venda externa), **When** a pessoa o abre em um cliente de e-mail comum (Gmail, Outlook, Apple Mail), **Then** o logo da Voxelas Duo aparece no topo e as cores usadas são as da identidade visual do site.
2. **Given** os e-mails antes desta tarefa (texto simples, sem identidade visual), **When** esta tarefa é concluída, **Then** todos passam a usar a mesma estrutura visual do e-mail novo de confirmação de pedido.

---

### Edge Cases

- Pedido pago pela segunda vez (reprocessamento da mesma confirmação de pagamento, ex.: notificação duplicada) não deve gerar um segundo e-mail de confirmação para o mesmo pedido.
- Falha no envio do e-mail (provedor fora do ar, endereço inválido) não pode impedir, atrasar ou reverter a confirmação da compra para quem está no checkout — o pedido já está pago independentemente do e-mail sair ou não.
- Pedido de canal externo (Mercado Livre, Shopee), sincronizado automaticamente, não é uma "compra no site" e não deve gerar este e-mail de confirmação — esse fluxo já tem sua própria notificação (ao admin).
- Cliente de e-mail que bloqueia imagens por padrão ainda deve deixar claro, só pelo texto, que a mensagem é da Voxelas Duo e quais foram os itens/valor do pedido.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE enviar um e-mail de confirmação de pedido ao comprador assim que o pagamento de um pedido feito no checkout do site for aprovado.
- **FR-002**: O e-mail de confirmação DEVE ser enviado para o e-mail de contato informado no checkout, funcionando tanto para compra autenticada quanto para compra como convidado, sem exigir conta.
- **FR-003**: O e-mail de confirmação DEVE conter o número do pedido, a lista de itens comprados (nome e quantidade) e o valor total pago.
- **FR-004**: O sistema DEVE evitar o envio de mais de um e-mail de confirmação para o mesmo pedido, mesmo que a aprovação do pagamento seja processada mais de uma vez.
- **FR-005**: Uma falha ao enviar o e-mail de confirmação NÃO DEVE impedir, atrasar ou reverter a confirmação da compra para o comprador.
- **FR-006**: Pedidos cujo pagamento não foi aprovado (pendente, recusado, expirado) NÃO DEVEM gerar o e-mail de confirmação de compra.
- **FR-007**: Pedidos originados de canais de venda externos (fora do checkout do site) NÃO DEVEM gerar este e-mail de confirmação de compra ao comprador.
- **FR-008**: O e-mail de confirmação de pedido DEVE seguir uma identidade visual reconhecível da Voxelas Duo, incluindo o logo da marca e a paleta de cores já usada no site.
- **FR-009**: Os e-mails transacionais já existentes no site (recuperação de senha, verificação de cadastro, notificação de venda externa ao admin) DEVEM ser atualizados para usar a mesma identidade visual (logo e paleta de cores) do novo e-mail de confirmação de pedido.

### Key Entities

- **Pedido**: compra feita no checkout do site; para este e-mail, importa o número do pedido, os itens comprados (com quantidade), o valor total e o e-mail de contato do comprador (autenticado ou convidado).
- **E-mail transacional**: mensagem automática enviada pelo site em resposta a um evento (pedido confirmado, código de recuperação de senha, código de verificação de cadastro, venda externa sincronizada); todas compartilham a mesma identidade visual de marca.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos pedidos com pagamento aprovado no checkout do site geram uma tentativa de envio do e-mail de confirmação, com número do pedido, itens e valor corretos.
- **SC-002**: Nenhum pedido recebe mais de um e-mail de confirmação de compra, mesmo em reprocessamentos.
- **SC-003**: Uma falha no envio do e-mail nunca impede a finalização de uma compra nem aparece como erro para quem está comprando.
- **SC-004**: Uma pessoa que recebe qualquer e-mail transacional do site consegue identificar a Voxelas Duo pelo logo e pelas cores em menos de 3 segundos de leitura, sem precisar ler o corpo do texto.

## Assumptions

- "Compra finalizada no checkout" significa pagamento aprovado (não apenas o pedido criado/pendente) — mesmo critério já usado pelo site para considerar um pedido "pago".
- Reaproveita o mesmo provedor de e-mail transacional (Resend) já configurado na Tarefa 10/EDI-84, sem introduzir um novo provedor.
- Pedidos de canais externos (Mercado Livre, Shopee) ficam fora do escopo deste e-mail de confirmação — já têm notificação própria ao admin (Tarefa 10/EDI-84), que não é alterada em conteúdo, só em identidade visual (FR-009).
- Reenvio manual do e-mail de confirmação (ex.: pelo admin, a pedido do cliente) fica fora do escopo desta tarefa.
- Segue o mesmo padrão já estabelecido no projeto de textos diretos em PT-BR, sem biblioteca de i18n (mesma decisão já registrada nas Tarefas 3/4/10).
