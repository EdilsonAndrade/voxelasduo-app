---

description: "Task list for e-mail de confirmação de pedido e padronização visual dos e-mails transacionais"
---

# Tasks: E-mail de confirmação de pedido e padronização visual dos e-mails transacionais

**Input**: Design documents from `/specs/010-email-confirmacao-pedido/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/email-transacional.md, quickstart.md

**Tests**: Incluídos — o projeto já tem `.test.ts` colocado ao lado de cada módulo (`lib/email/resend.test.ts`, `lib/pagamentos/*.test.ts` etc.), mesmo padrão seguido aqui.

**Organization**: Tarefas agrupadas por user story (spec.md) para permitir implementação e teste independentes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: US1 = confirmação de compra por e-mail (P1); US2 = identidade visual consistente (P2)

## Path Conventions

Projeto único (Next.js App Router) — caminhos relativos à raiz do repo, conforme `plan.md`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar a variável de ambiente nova usada pela logo nos e-mails

- [X] T001 Adicionar `SITE_URL` em `.env.example` (URL pública do site, usada para montar o link absoluto da logo nos e-mails — comentário explicando o fallback para `VERCEL_URL`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Layout HTML de e-mail compartilhado — bloqueia as duas user stories, já que ambas dependem dele para gerar `html`

**⚠️ CRITICAL**: Nenhuma user story começa antes desta fase estar completa

- [X] T002 Criar `lib/email/templates.ts` com `renderEmailLayout({ titulo, corpoHtml, textoAlternativo }): { html: string; text: string }` — cabeçalho com logo (`${SITE_URL ?? https://${VERCEL_URL}}/images/logo.png`, omitindo a tag `<img>` se nenhuma das duas variáveis existir) + faixa na cor `--roxo` (`#7B5CF6`), área de conteúdo em cartão branco (`--surface`) com borda `--surface-line` (`#F0E4D3`) sobre fundo `--creme` (`#FFF6ED`), tabelas + estilos inline (compatibilidade Outlook/Gmail/Apple Mail — research.md #5), rodapé com aviso "não responda" e copyright
- [X] T003 [P] Criar `lib/email/templates.test.ts` — testa que `renderEmailLayout` inclui a URL da logo quando `SITE_URL` está definida, cai para `VERCEL_URL` quando só ela está definida, omite a tag `<img>` quando nenhuma está definida, e sempre inclui `titulo`/`corpoHtml`/`textoAlternativo` no resultado

**Checkpoint**: Layout de e-mail pronto — as user stories podem começar

---

## Phase 3: User Story 1 - Confirmação de compra por e-mail (Priority: P1) 🎯 MVP

**Goal**: Comprador (autenticado ou convidado) recebe e-mail de confirmação com número do pedido, itens e valor total assim que o pagamento é aprovado, sem e-mail duplicado em reprocessamento

**Independent Test**: Aprovar o pagamento de um pedido de teste (via `registrarTentativa` ou `atualizarStatusTentativa` com status "aprovado") e verificar que `enviarConfirmacaoPedido` é chamada exatamente uma vez, com os dados corretos do pedido; reprocessar a mesma aprovação e verificar que não é chamada de novo

### Tests for User Story 1 ⚠️

> **NOTE: Escrever estes testes PRIMEIRO, garantir que falham antes de implementar**

- [X] T004 [P] [US1] Escrever testes de `enviarConfirmacaoPedido` em `lib/email/resend.test.ts` (mock do client Resend, mesmo padrão já usado no arquivo): assunto contém o número do pedido, corpo (`html` e `text`) contém itens e valor total formatado em BRL, `to` é `pedido.cliente.email`, e não lança quando o envio falha
- [X] T005 [P] [US1] Criar `lib/pagamentos/repository.test.ts` (arquivo novo — hoje não existe) mockando `colecaoPedidos`, `abaterEstoquePedido` e `enviarConfirmacaoPedido`: `registrarTentativa` com uma tentativa `"aprovado"` aciona `enviarConfirmacaoPedido` exatamente uma vez; chamar `atualizarStatusTentativa` logo em seguida para o mesmo pedido/aprovação (reprocessamento do webhook) NÃO aciona `enviarConfirmacaoPedido` de novo

### Implementation for User Story 1

- [X] T006 [US1] Implementar `enviarConfirmacaoPedido(pedido: Pedido): Promise<void>` em `lib/email/resend.ts`: resolve nomes dos itens via `buscarProdutosPorIds` (de `lib/pedidos/repository.ts`), monta assunto `"Pedido confirmado — #<id>"`, usa `renderEmailLayout` (T002) para `html`/`text`, envia para `pedido.cliente.email`, `try/catch` best-effort (nunca lança — mesmo padrão de `notificarAdminVendaExterna`) (depende de T002)
- [X] T007 [US1] Em `lib/pagamentos/repository.ts`, dentro de `promoverPedidoSeAprovado`, chamar `await enviarConfirmacaoPedido(pedidoPromovido)` logo após `abaterEstoquePedido(pedidoPromovido)` (dentro do `if (pedidoPromovido)`) — reaproveita a condição idempotente do `findOneAndUpdate` (depende de T006)

**Checkpoint**: User Story 1 completa e testável de forma independente — pedidos aprovados no checkout do site já disparam a confirmação, sem duplicidade

---

## Phase 4: User Story 2 - Identidade visual consistente em todos os e-mails (Priority: P2)

**Goal**: Recuperação de senha, verificação de cadastro e notificação de venda externa ao admin passam a usar o mesmo layout de marca (logo + cores) do e-mail de confirmação de pedido

**Independent Test**: Disparar cada uma das três funções existentes e verificar que o payload enviado ao Resend inclui `html` com o layout de marca (logo, faixa `--roxo`), mantendo o mesmo destinatário/assunto/conteúdo textual já testado hoje

### Tests for User Story 2 ⚠️

- [X] T008 [P] [US2] Atualizar os testes existentes de `enviarCodigoRecuperacao`, `enviarCodigoVerificacao` e `notificarAdminVendaExterna` em `lib/email/resend.test.ts` para também verificar `html: expect.stringContaining(...)` (logo/código/dados já cobertos no `text` continuam valendo)

### Implementation for User Story 2

- [X] T009 [US2] Atualizar `enviarCodigoRecuperacao` em `lib/email/resend.ts` para montar `html` via `renderEmailLayout` (código de recuperação em destaque), mantendo assunto e `text` inalterados (depende de T002)
- [X] T010 [US2] Atualizar `enviarCodigoVerificacao` em `lib/email/resend.ts` para montar `html` via `renderEmailLayout`, mantendo assunto e `text` inalterados (depende de T002)
- [X] T011 [US2] Atualizar `notificarAdminVendaExterna` em `lib/email/resend.ts` para montar `html` via `renderEmailLayout` (canal, itens, valor total), mantendo assunto e `text` inalterados (depende de T002)

**Checkpoint**: Todos os e-mails transacionais do site (confirmação de pedido, recuperação de senha, verificação de cadastro, notificação ao admin) compartilham a mesma identidade visual

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Validação final

- [X] T012 Rodar `npx vitest run lib/email/resend.test.ts lib/email/templates.test.ts lib/pagamentos/repository.test.ts` e confirmar que tudo passa (quickstart.md)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — pode começar imediatamente
- **Foundational (Phase 2)**: Depende do Setup — BLOQUEIA as duas user stories (ambas usam `renderEmailLayout`)
- **User Story 1 (Phase 3)**: Depende do Foundational
- **User Story 2 (Phase 4)**: Depende do Foundational; edita o mesmo arquivo (`lib/email/resend.ts`) que a US1 toca em T006 — executar Phase 3 antes da Phase 4 evita conflito de edição simultânea no mesmo arquivo, embora não haja dependência funcional entre as duas
- **Polish (Phase 5)**: Depende das duas user stories completas

### Parallel Opportunities

- T002 e T003 (Foundational) podem ser feitas em paralelo (arquivos diferentes)
- T004 e T005 (testes da US1) podem ser feitos em paralelo entre si
- T009, T010, T011 (US2) são no mesmo arquivo (`lib/email/resend.ts`) — não paralelizar entre si, mas podem ser um único commit/sessão sequencial

---

## Parallel Example: Foundational

```bash
Task: "Criar lib/email/templates.ts com renderEmailLayout"
Task: "Criar lib/email/templates.test.ts"
```

## Parallel Example: User Story 1 (testes)

```bash
Task: "Escrever testes de enviarConfirmacaoPedido em lib/email/resend.test.ts"
Task: "Criar lib/pagamentos/repository.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup (T001)
2. Phase 2: Foundational (T002-T003) — CRÍTICO, bloqueia as user stories
3. Phase 3: User Story 1 (T004-T007)
4. **PARAR e VALIDAR**: confirmar que a confirmação de pedido funciona e não duplica
5. Entregar como MVP — comprador já recebe confirmação, mesmo que os outros e-mails ainda estejam em texto simples

### Incremental Delivery

1. Setup + Foundational → base pronta
2. User Story 1 → validar independentemente → MVP entregável
3. User Story 2 → validar independentemente → todos os e-mails com a mesma identidade visual
4. Polish → validação final

---

## Notes

- [P] = arquivos diferentes, sem dependência
- Rodar os testes antes de implementar (devem falhar) e depois (devem passar)
- Commitar após cada tarefa ou grupo lógico (o nome do commit deve ser passado ao usuário, nunca commitado automaticamente — CLAUDE.md regra 5)
