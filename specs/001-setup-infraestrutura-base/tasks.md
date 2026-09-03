# Tasks: Setup do Projeto e Infraestrutura Base

**Input**: Design documents from `specs/001-setup-infraestrutura-base/` (spec.md, plan.md, research.md, data-model.md, contracts/, quickstart.md)
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Não solicitados explicitamente na spec — nenhuma tarefa de teste automatizado gerada. Verificação é manual, via `quickstart.md`.

**Organização**: Tarefas agrupadas por user story (US1 = deploy contínuo, US2 = fonte única de dados, US3 = estrutura de API Routes), conforme spec.md.

**Restrição de execução**: Nenhuma tarefa aqui inicia servidor de desenvolvimento, container ou instância de runtime. Verificações que exigem app rodando (curl em `/api/health`, `/api/produtos`, etc.) ou vínculo de conta (Vercel, MongoDB Atlas) são manuais — ver `quickstart.md`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência entre si)
- **[Story]**: US1, US2 ou US3, conforme spec.md
- Caminhos de arquivo exatos, relativos à raiz do repositório

## Path Conventions

Projeto único Next.js (App Router) na raiz do repositório: `app/`, `lib/`, conforme `plan.md`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Inicialização do projeto Next.js e configuração básica

- [x] T001 Inicializar projeto Next.js (App Router, TypeScript) na raiz do repositório: `package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
- [x] T002 [P] Configurar scripts `dev`, `build`, `lint` em `package.json`
- [x] T003 [P] Criar `.env.example` documentando a variável `MONGODB_URI` (sem valor real)
- [x] T004 [P] Atualizar `.gitignore` garantindo que `.env.local`, `node_modules/` e `.next/` não sejam versionados
- [x] T005 [P] Instalar dependência `mongodb` (driver oficial Node.js) via `npm install mongodb`

**Nota (fora do escopo automatizável)**: Vincular o repositório a um projeto na Vercel e criar o cluster MongoDB Atlas (M0) são ações que exigem login nas respectivas contas — ver `quickstart.md` passos 1 e 5. Não fazem parte das tarefas T0xx.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestrutura de dados que todas as user stories dependem

**⚠️ CRITICAL**: Nenhuma user story pode ser implementada antes desta fase estar completa

- [x] T006 Implementar cliente MongoDB singleton (reutilizável entre invocações serverless) em `lib/db/mongodb.ts`, lendo `MONGODB_URI` do ambiente e lançando erro claro se a variável estiver ausente
- [x] T007 [P] Definir tipos da coleção `produtos` em `lib/models/produto.ts`, conforme `data-model.md`
- [x] T008 [P] Definir tipos da coleção `pedidos` em `lib/models/pedido.ts`, conforme `data-model.md`

**Checkpoint**: Cliente de banco e tipos das entidades prontos — user stories podem começar

---

## Phase 3: User Story 1 - Aplicação publicada automaticamente (Priority: P1) 🎯 MVP

**Goal**: Garantir que o projeto compila e está pronto para deploy contínuo na Vercel a cada alteração

**Independent Test**: `npm run build` conclui sem erros; após vínculo manual com a Vercel (quickstart.md passo 5), um push gera deploy automático acessível publicamente

### Implementation for User Story 1

- [x] T009 [US1] Garantir que `app/page.tsx` renderize uma página inicial simples e válida (placeholder do e-commerce), sem dependências quebradas
- [x] T010 [US1] Validar que `npm run build` (Next.js) executa sem erros a partir da estrutura criada nas Fases 1-2

**Checkpoint**: Código pronto para deploy contínuo — vínculo do repositório à Vercel e o primeiro deploy em si são passos manuais (quickstart.md passo 5)

---

## Phase 4: User Story 2 - Fonte única de dados para produtos e pedidos (Priority: P2)

**Goal**: Expor uma forma de verificar que a aplicação está conectada ao MongoDB Atlas e consegue gravar/ler produtos e pedidos

**Independent Test**: `GET /api/health` retorna `{"status":"ok","db":"connected"}` com `MONGODB_URI` válido configurado (quickstart.md passo 3)

### Implementation for User Story 2

- [x] T011 [US2] Implementar `GET /api/health` em `app/api/health/route.ts`: faz `ping` no MongoDB via `lib/db/mongodb.ts` e retorna 200/503 conforme `contracts/health.md`

**Checkpoint**: Conectividade com o banco verificável; gravação/leitura de produto e pedido de teste é validada manualmente (quickstart.md passo 3) após a Fase 5 expor as rotas

---

## Phase 5: User Story 3 - Estrutura previsível para as rotas de API (Priority: P3)

**Goal**: Rotas-esqueleto de produtos, pedidos e webhooks, prontas para as tarefas seguintes do épico implementarem a lógica de negócio

**Independent Test**: `GET /api/produtos`, `GET /api/pedidos` e `POST /api/webhooks` respondem conforme `contracts/api-skeleton.md` (quickstart.md passo 4)

### Implementation for User Story 3

- [x] T012 [P] [US3] Implementar esqueleto `GET /api/produtos` em `app/api/produtos/route.ts`: consulta a coleção `produtos` via `lib/db/mongodb.ts` e retorna `{ "produtos": [] }` (lista vazia é resposta válida)
- [x] T013 [P] [US3] Implementar esqueleto `GET /api/pedidos` em `app/api/pedidos/route.ts`: consulta a coleção `pedidos` via `lib/db/mongodb.ts` e retorna `{ "pedidos": [] }`
- [x] T014 [P] [US3] Implementar esqueleto `POST /api/webhooks` em `app/api/webhooks/route.ts`: retorna `{ "received": true }`, sem processar payload (placeholder para Tarefas 4, 6 e 7 do épico)

**Checkpoint**: Todas as user stories da EDI-74 completas — estrutura pronta para a Tarefa 2 (EDI-75, catálogo)

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Fechamento da tarefa

- [x] T015 [P] Criar/atualizar `README.md` com instruções de setup local (variáveis de ambiente, `npm install`, `npm run dev`) referenciando `quickstart.md`
- [x] T016 Rodar `npx tsc --noEmit` e corrigir eventuais erros de tipo em todo o projeto

**Verificação manual final (usuário, não automatizada)**: seguir `quickstart.md` passos 1-6 ponta a ponta (rodar localmente, testar `/api/health`, `/api/produtos`, `/api/pedidos`, `/api/webhooks`, deploy na Vercel, e confirmar que nenhuma credencial foi versionada).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — pode começar imediatamente
- **Foundational (Phase 2)**: Depende da conclusão do Setup — BLOQUEIA todas as user stories
- **User Stories (Phase 3-5)**: Todas dependem da Fase 2 completa
  - US1 (deploy) não depende de US2/US3 no código, mas faz mais sentido validar a build depois que Foundational existe
  - US2 (`/api/health`) e US3 (rotas-esqueleto) podem ser feitas em paralelo entre si — ambas só dependem de `lib/db/mongodb.ts` (T006)
- **Polish (Phase 6)**: Depende de todas as user stories completas

### Parallel Opportunities

- T002, T003, T004, T005 (Setup) podem rodar em paralelo entre si
- T007, T008 (Foundational) podem rodar em paralelo entre si (após T006)
- T012, T013, T014 (US3) podem rodar em paralelo entre si (arquivos diferentes)
- US2 (T011) e US3 (T012-T014) podem ser feitas em paralelo, ambas após T006

---

## Parallel Example: Foundational + US3

```bash
# Após T006 (cliente MongoDB) estar pronto:
Task: "Definir tipos da coleção produtos em lib/models/produto.ts"
Task: "Definir tipos da coleção pedidos em lib/models/pedido.ts"

# Depois, rotas-esqueleto de US3 em paralelo:
Task: "Esqueleto GET /api/produtos em app/api/produtos/route.ts"
Task: "Esqueleto GET /api/pedidos em app/api/pedidos/route.ts"
Task: "Esqueleto POST /api/webhooks em app/api/webhooks/route.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Completar Fase 1 (Setup) e Fase 2 (Foundational)
2. Completar Fase 3 (US1) — build validado
3. **Parar e validar**: `npm run build` sem erros
4. Vincular repositório à Vercel manualmente (fora do escopo do assistente) e confirmar primeiro deploy

### Incremental Delivery

1. Setup + Foundational → base pronta
2. US1 → build validado → deploy manual (MVP de infraestrutura)
3. US2 → `/api/health` implementado → validado manualmente
4. US3 → rotas-esqueleto implementadas → validadas manualmente
5. Polish → documentação e checagem de tipos

---

## Notes

- [P] = arquivos diferentes, sem dependência entre si
- Nenhuma tarefa aqui inicia `npm run dev`, container ou instância — apenas código, `build` e `tsc --noEmit`
- Verificações que exigem app rodando ou contas externas (Vercel, MongoDB Atlas) ficam documentadas em `quickstart.md` para o usuário executar
- Commit fica a critério do usuário ao final da implementação (fora do escopo destas tarefas)
