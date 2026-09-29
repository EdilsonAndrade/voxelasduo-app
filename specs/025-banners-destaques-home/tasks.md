# Tasks: Banners e destaques da home gerenciados pelo painel

**Input**: specs/025-banners-destaques-home/ (plan.md, spec.md, data-model.md, contracts/home-secoes-api.md, research.md, quickstart.md)
**Linear**: EDI-114
**Tests**: testes unitários Vitest para validação e repositório, no padrão do projeto (`*.test.ts`). UI validada pelo Test Guide (quickstart.md).

## Phase 1: Setup

- [X] T001 Invocar as skills `frontend-design` e `site-architecture` (regra do CLAUDE.md) e registrar a direção visual da home (tipografia do título sobre a imagem, espaçamento entre seções, estilo das setas do carrossel) como comentário no topo de components/home/home.module.css

## Phase 2: Foundational (bloqueia todas as histórias)

- [X] T002 Criar os tipos `SecaoHome` (união discriminada), `BotaoSecao`, os alinhamentos, os limites de texto e `SECOES_HOME_COLLECTION = "secoesHome"` em lib/models/secaoHome.ts, conforme data-model.md
- [X] T003 [P] Implementar a validação pura `validarSecaoHome(payload, { criando, tipoAtual })` em lib/home/validation.ts: tamanhos, botão com texto e link juntos, link `^/(?!/)` ou `^https://`, `limite` de 4 a 24, e banner ativo exigindo `imagemDesktop`
- [X] T004 [P] Testes da validação em lib/home/validation.test.ts (link `javascript:`/`http:`/`//x` rejeitados, botão incompleto, textos longos, ativação sem imagem, limite fora da faixa)
- [X] T005 Implementar lib/home/repository.ts: `listarSecoes`, `buscarSecao`, `criarSecao` (ordem = max+1, `ativa: false`), `atualizarSecao`, `removerSecao`, `reordenarSecoes(ids)`, `definirProdutosCarrossel`, `marcarProduto` (`$addToSet`), `desmarcarProduto` (`$pull`), `removerProdutoDeTodosCarrosseis`, e índices `{ordem:1}` / `{tipo:1, produtoIds:1}` via `criarGarantiaDeIndices` de lib/db/indices.ts
- [X] T006 [P] Testes do repositório em lib/home/repository.test.ts, seguindo o padrão de mock do Mongo usado em lib/pagamentos/repository.test.ts
- [X] T007 Implementar `secoesPublicas()` em lib/home/secoesPublicas.ts: seções ativas por `ordem`; nos carrosséis, carrega produtos com `$in`, reordena por `produtoIds`, descarta inexistentes, corta em `limite` e omite carrossel vazio
- [X] T008 Adicionar `enviarImagemBanner(arquivo)` em lib/storage/blob.ts, reaproveitando as mesmas validações de tipo e tamanho, com prefixo `banners/`
- [X] T009 Criar as rotas `GET`/`POST` em app/api/admin/home/secoes/route.ts e `GET`/`PUT`/`DELETE` em app/api/admin/home/secoes/[id]/route.ts, com erros 400/404 conforme o contrato e `revalidatePath("/")` nas escritas
- [X] T010 [P] Criar a rota de upload em app/api/admin/home/upload/route.ts (espelha app/api/produtos/upload/route.ts, usando `enviarImagemBanner`)
- [X] T011 Adicionar o link "Banners" ao menu do painel em app/admin/(painel)/layout.tsx

## Phase 3: User Story 1 - Admin publica um banner na home (P1) 🎯 MVP

**Goal**: cadastrar e ativar um banner hero ou intermediário e vê-lo na home.
**Independent Test**: quickstart.md, passos 1 a 3 e 8 a 9.

- [X] T012 [P] [US1] Criar components/home/BannerSecao.tsx: `<picture>` com fonte mobile, texto sobreposto na posição configurada, gradiente de legibilidade e botão opcional. Estilos em components/home/home.module.css
- [X] T013 [US1] Reescrever app/page.tsx: `secoesPublicas()`, `redirect("/produtos")` quando vazio, renderização por `tipo` e `export const revalidate = 60`
- [X] T014 [P] [US1] Criar components/admin/SecaoHomePreview.tsx (pré-visualização com alternância desktop/mobile, reaproveitando BannerSecao)
- [X] T015 [US1] Criar components/admin/SecaoHomeForm.tsx (client): seletor de tipo na criação, upload das imagens desktop/mobile via /api/admin/home/upload, campos de texto com contador, botão, alinhamentos, preview, exibição dos erros `campos` da API e Toast de sucesso
- [X] T016 [US1] Criar app/admin/(painel)/banners/page.tsx com components/admin/SecoesHomeLista.tsx (client): tipo, título, badge ativa/inativa, alternar ativação (PUT), editar e excluir com ConfirmModal
- [X] T017 [US1] Criar app/admin/(painel)/banners/nova/page.tsx e app/admin/(painel)/banners/[id]/editar/page.tsx (`force-dynamic`, `notFound()` para id inexistente)

## Phase 4: User Story 2 - Carrosséis de produtos marcados na lista de produtos (P1)

**Goal**: criar carrosséis, marcar produtos direto na lista do admin e exibi-los na home.
**Independent Test**: quickstart.md, passos 4 a 6 e 10.

- [X] T018 [P] [US2] Criar as rotas app/api/admin/home/secoes/[id]/produtos/route.ts (PUT lista ordenada) e app/api/admin/home/secoes/[id]/produtos/[produtoId]/route.ts (POST marca, DELETE desmarca; 400 se não for carrossel, 404 se produto ou seção não existir)
- [X] T019 [P] [US2] Criar components/home/CarrosselProdutos.tsx (client): scroll-snap, setas `scrollBy` ocultas no mobile, título, link "Ver tudo" e cards com foto, nome, preço e etiqueta "Esgotado" (reaproveitar `formatarPreco` e o estilo de components/produtos/ProdutoCard.tsx)
- [X] T020 [US2] Renderizar o tipo `carrossel` em app/page.tsx
- [X] T021 [US2] Adicionar os campos do carrossel (título, link "Ver tudo", limite) em components/admin/SecaoHomeForm.tsx
- [X] T022 [US2] Criar components/admin/MarcarCarrosselProduto.tsx (client, popover com checkboxes de cada carrossel → POST/DELETE) e adicionar a coluna "Destaques" e o filtro `?carrossel=<id>` (select) em app/admin/(painel)/produtos/page.tsx
- [X] T023 [US2] Criar components/admin/ProdutosCarrosselOrdem.tsx (lista dos produtos marcados com setas ↑↓ e remover → PUT /produtos) e exibir na edição do carrossel em app/admin/(painel)/banners/[id]/editar/page.tsx
- [X] T024 [US2] Chamar `removerProdutoDeTodosCarrosseis` em `removerProduto` de lib/produtos/repository.ts e `revalidatePath("/")` na rota DELETE de app/api/produtos/[id]/route.ts

## Phase 5: User Story 3 - Ordenar as seções da home (P2)

**Goal**: mudar a ordem das seções e refletir na home.
**Independent Test**: quickstart.md, passo 7.

- [X] T025 [US3] Criar app/api/admin/home/secoes/ordem/route.ts (PUT `{ids}`, com validação de ids completos e sem repetição)
- [X] T026 [US3] Adicionar os botões ↑↓ em components/admin/SecoesHomeLista.tsx, com atualização otimista e rollback + Toast em erro

## Phase 6: User Story 4 - Texto de destaque (P3)

**Goal**: faixa só com texto na home.
**Independent Test**: quickstart.md, passo 7.

- [X] T027 [P] [US4] Criar components/home/TextoDestaqueSecao.tsx (título em destaque, texto e botão opcional) e renderizar em app/page.tsx
- [X] T028 [US4] Adicionar os campos do texto de destaque em components/admin/SecaoHomeForm.tsx e o suporte no SecaoHomePreview

## Phase 7: Polish

- [X] T029 Revisar responsividade de 360px a 1920px e acessibilidade (alt das imagens com fallback no título, `aria-label` nas setas, foco visível) em components/home/*
- [X] T030 Rodar (`npm run lint` indisponível — projeto sem eslint.config.*) `npx tsc --noEmit` e `npm test` e corrigir o que falhar
- [X] T031 Atualizar o Test Guide final (quickstart.md) com qualquer mudança feita na implementação

## Dependencies
- Phase 2 bloqueia tudo. T002 → T003, T005 → T007, T009.
- US1 (Phase 3) é o MVP e cria o form e a lista usados por US2, US3 e US4.
- US2, US3 e US4 dependem de US1 (form e lista), mas são independentes entre si.

## Parallel Examples
- Phase 2: T003 + T004 + T006 + T008 + T010 em paralelo, depois de T002.
- US1: T012 + T014 em paralelo; T013 depois de T012.
- US2: T018 + T019 em paralelo.

## Implementation Strategy
MVP = Phases 1 a 3 (banners). Depois US2 (carrosséis, mesmo peso P1), US3 (ordem), US4 (texto de destaque) e Polish.
