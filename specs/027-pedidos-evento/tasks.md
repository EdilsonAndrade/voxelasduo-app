# Tasks: Pedidos de evento

**Input**: specs/027-pedidos-evento/ (plan.md, spec.md, research.md, data-model.md, contracts/evento-api.md)
**Tests**: Vitest para a lógica pura, o repositório, as rotas e a autorização (padrão do projeto). UI e offline cobertos pelo Test Guide.

## Phase 1: Setup

- [X] T001 Criar tipos e constantes (coleções, status, limites, tipos do payload) em lib/models/pedidoEvento.ts
- [X] T002 [P] Adicionar `papel` e `usuario` em lib/models/usuario.ts

## Phase 2: Foundational

- [X] T003 [P] Telefone (dígitos, máscara, validação de 10/11 dígitos, link wa.me com mensagem) + testes em lib/eventos/telefone.ts e lib/eventos/telefone.test.ts
- [X] T004 [P] Validação do pedido (compartilhada cliente/servidor) + testes em lib/eventos/validacao.ts e lib/eventos/validacao.test.ts
- [X] T005 [P] Rotas permitidas por papel + testes em lib/auth/papeis.ts e lib/auth/papeis.test.ts
- [X] T006 [P] Limite de tentativas de login (Mongo) + testes em lib/auth/limiteTentativas.ts e lib/auth/limiteTentativas.test.ts

## Phase 3: US3 — Entrar com o próprio usuário (P1)

**Independent test**: entrar como "isadora", cair em /admin/evento e ser redirecionada ao tentar /admin/produtos.

- [X] T007 [US3] Login por usuário curto, papel no retorno e limite de tentativas em lib/auth/autorizarCredenciais.ts (+ atualizar lib/auth/autorizarCredenciais.test.ts)
- [X] T008 [US3] Propagar `papel` no JWT/sessão em lib/auth/config.ts e lib/auth/next-auth.d.ts
- [X] T009 [US3] /admin/evento/entrar público e login próprio da área em lib/auth/rotaProtegida.ts (+ teste)
- [X] T010 [US3] Aplicar a restrição por papel e o login da área em proxy.ts
- [X] T011 [P] [US3] Script `npm run seed:equipe -- "<senha>"` em scripts/seed-equipe.ts e package.json
- [X] T012 [US3] Página e formulário de login simples em app/admin/evento/entrar/page.tsx e components/evento/LoginEquipe.tsx

## Phase 4: US1 — Anotar um pedido (P1)

**Independent test**: anotar um pedido com 2 itens (foto + texto) e vê-lo gravado com "anotado por".

- [X] T013 [US1] Repositório (upsert idempotente, eventos, listar/buscar) + testes em lib/eventos/repository.ts e lib/eventos/repository.test.ts
- [X] T014 [P] [US1] `enviarFotoEvento` em lib/storage/blob.ts
- [X] T015 [US1] PUT upsert em app/api/admin/evento/pedidos/[id]/route.ts (+ route.test.ts)
- [X] T016 [P] [US1] POST foto em app/api/admin/evento/fotos/route.ts
- [X] T017 [P] [US1] GET eventos em app/api/admin/evento/eventos/route.ts
- [X] T018 [US1] Ocultar cabeçalho/rodapé na área em components/ChromeDoSite.tsx e app/layout.tsx
- [X] T019 [US1] Layout de app e página em app/admin/evento/layout.tsx e app/admin/evento/page.tsx
- [X] T020 [US1] Formulário (evento, cliente, itens com câmera, −/+, Mais detalhes, erros no campo, rascunho, confirmação de remoção, aviso de cliente repetido) em components/evento/FormularioPedido.tsx e components/evento/ItemPedido.tsx
- [X] T021 [US1] Estilos mobile-first em components/evento/evento.module.css

## Phase 5: US2 — Funcionar sem internet (P1)

**Independent test**: modo avião → 2 pedidos pendentes → reconectar → enviados uma vez.

- [X] T022 [P] [US2] Wrapper IndexedDB em components/evento/offline/db.ts
- [X] T023 [P] [US2] Compressão de foto em components/evento/offline/foto.ts
- [X] T024 [US2] Fila e sincronizador (fotos → pedido, retentativa, estados) em components/evento/offline/fila.ts
- [X] T025 [US2] Barra de status da fila e aviso ao sair em components/evento/BarraSincronizacao.tsx
- [X] T026 [US2] Service worker em public/sw-evento.js e registro em components/evento/AppEvento.tsx

## Phase 6: US4 — Ver, buscar e editar (P2)

- [X] T027 [US4] GET lista/busca em app/api/admin/evento/pedidos/route.ts (+ route.test.ts)
- [X] T028 [US4] Lista com busca, filtro por evento, pendentes, status e edição em components/evento/ListaPedidos.tsx

## Phase 7: US5 — Chamar no WhatsApp (P3)

- [X] T029 [US5] Botão "Chamar no WhatsApp" com mensagem pronta em components/evento/ListaPedidos.tsx

## Phase 8: Polish

- [X] T030 Link "Pedidos de evento" em app/admin/(painel)/layout.tsx
- [X] T031 Rodar `npx tsc --noEmit` e `npm test`

## Dependencies
Setup → Foundational → US3 (acesso) → US1 → US2 → US4 → US5 → Polish. US2 depende do formulário (US1), e US4 reaproveita o formulário.

## Implementation strategy
MVP = US3 + US1 + US2, que é o necessário para o evento de sábado. US4/US5 entram na mesma entrega.
