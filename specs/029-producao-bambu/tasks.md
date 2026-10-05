# Tasks: Controle de produção com o histórico de impressões da Bambu Lab

**Input**: Design documents from `/specs/029-producao-bambu/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/producao-api.md, quickstart.md
**Linear**: EDI-127

**Tests**: incluídos. O projeto já usa Vitest e a API integrada é não oficial — a lógica pura e o cliente HTTP precisam ser testáveis sem rede e sem banco (research #10).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: a qual história pertence (US1…US6)

## Path Conventions

Projeto único Next.js na raiz: `lib/`, `app/`, `components/`. Caminhos conforme a seção Project Structure do plan.md.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: deixar as rotas novas acessíveis e o cron agendado antes de qualquer tela existir.

- [X] T001 Adicionar `"/api/producao/:path*"` ao `matcher` em `proxy.ts`
- [X] T002 Registrar `/api/producao` como rota protegida do painel em `lib/auth/rotaProtegida.ts`, **exceto** `/api/producao/importar` (validada por `CRON_SECRET`, não por sessão)
- [X] T003 [P] Adicionar o cron `{ path: "/api/producao/importar", schedule: "0 5 * * *" }` em `vercel.ts`, com comentário explicando a escolha do horário (não concorrer com 03:00 e 04:00)
- [X] T004 [P] Adicionar o link "Produção" ao menu em `app/admin/(painel)/layout.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: modelos, credencial e repositório — nada de US funciona sem isto.

- [X] T005 Criar `lib/models/producao.ts` com `PRODUCAO_*_COLLECTION`, `Impressao`, `VinculoArquivoProduto`, `LancamentoProducao` e `ImportacaoProducao`, conforme data-model.md, com comentários no padrão do projeto (por que `gramas` é da placa e não da peça; por que o vínculo não é copiado para a impressão)
- [X] T006 Estender `lib/models/credenciaisCanal.ts` com `CredencialBambuLab` (`_id: "bambu_lab"`, `accessToken`, `userId?`, `expiraEm`, `ativadoEm`, `atualizadoEm`), mantendo o tipo do Mercado Livre intacto
- [X] T007 Criar `lib/producao/credencial.ts`: ler, gravar (preservando `ativadoEm` na reconexão), remover e derivar o estado `ausente | ativa | expirada`
- [X] T008 Criar `lib/producao/repository.ts` com acesso às quatro coleções e criação dos índices do data-model.md (`taskId` único, `nomeArquivo` único em vínculos, demais índices de consulta)

**Checkpoint**: modelos e persistência prontos; nenhuma rota exposta ainda.

---

## Phase 3: User Story 1 — Ver o histórico de produção no admin (P1)

**Goal**: conectar a conta e importar o histórico, com erro real visível e sem duplicidade.

**Independent Test**: conectar, importar e conferir que a lista do admin bate com o histórico do Bambu Handy; reimportar e obter `novas: 0`.

- [X] T009 [P] [US1] Criar `lib/producao/bambu/cliente.ts`: `fetch` injetado por parâmetro, `login({account, password})`, `loginComCodigo({account, code})`, `solicitarCodigo(email)`, fluxo TOTP com CSRF (`GET bambulab.com/api/csrf` → header e cookie `x-bbl-csrf-token`), `listarTasks({after, limit, deviceId})`, `listarDispositivos()`. Todo erro vira uma exceção que carrega o **status HTTP real** e a mensagem da origem
- [X] T010 [P] [US1] Criar `lib/producao/bambu/cliente.test.ts` com fixtures: login direto, login pedindo código, código aceito, 401 de token expirado, página de tasks com `amsDetailMapping` multicolor, página vazia
- [X] T011 [P] [US1] Criar `lib/producao/bambu/mapear.ts`: hit → `Impressao` (status 2/3 → `concluida|interrompida`, `duracaoSegundos = fim − inicio`, cores e `gramasPorSlot` de `amsDetailMapping`, `historico` por comparação com `ativadoEm`)
- [X] T012 [P] [US1] Criar `lib/producao/bambu/mapear.test.ts`: impressão concluída, interrompida, sem `endTime`, com `weight` zero, multicolor, e marcação de histórico nas duas direções da data
- [X] T013 [US1] Criar `lib/producao/importacao.ts`: paginação por `after`, modo primeira carga (até página vazia) e modo incremental (para quando a página só tem `taskId` já conhecido), limite de páginas por execução, dedupe por índice único, gravação do `ImportacaoProducao` com `novas`/`ignoradas`/`paginas`/`erro`
- [X] T014 [US1] Criar `lib/producao/importacao.test.ts`: incremental para na página conhecida; primeira carga pagina até o fim; erro no meio preserva o que já entrou e registra a mensagem com status
- [X] T015 [US1] Criar `app/api/producao/conexao/route.ts`: `GET` estado (sem token), `POST` com `modo: senha | codigo | token` (202 quando precisa código), `DELETE` remove a credencial sem apagar impressões
- [X] T016 [P] [US1] Criar `app/api/producao/conexao/codigo/route.ts` (`POST` reenvia o código)
- [X] T017 [P] [US1] Criar `app/api/producao/conexao/route.test.ts`: 401 de credencial recusada com o status real, 202 pedindo código, `GET` nunca devolve `accessToken`
- [X] T018 [US1] Criar `app/api/producao/importar/route.ts` (`GET` e `POST` com `Bearer ${CRON_SECRET}`, 409 sem conexão válida, 502 com o status real da origem) seguindo o padrão de `app/api/estoque/sincronizar/route.ts`
- [X] T019 [P] [US1] Criar `app/api/producao/importar/route.test.ts`: 401 sem segredo, 409 sem credencial, resposta de sucesso com as contagens
- [X] T020 [P] [US1] Criar `app/api/producao/importar-agora/route.ts` (`POST` pelo painel, sem expor `CRON_SECRET`)
- [X] T021 [P] [US1] Criar `app/api/producao/impressoes/route.ts` (`GET` com os filtros do contrato e o `vinculo` resolvido por `nomeArquivo`)
- [X] T022 [P] [US1] Criar `app/api/producao/importacoes/route.ts` (`GET ?limite=`)
- [X] T023 [US1] Invocar a skill `frontend-design` e definir a direção visual da área de produção antes de escrever as telas (regra do CLAUDE.md)
- [X] T024 [US1] Criar `components/admin/producao/ConexaoBambu.tsx`: conectar, campo de código quando exigido, "colar token", estado da conexão, aviso de expiração e erro com o status real
- [X] T025 [US1] Criar `components/admin/producao/ListaImpressoes.tsx`: tabela com miniatura, nome do arquivo, produto vinculado, resultado, início, duração real, gramas, material/cor e impressora, com os filtros do contrato
- [X] T026 [US1] Criar `app/admin/(painel)/producao/page.tsx` (server component) compondo conexão, resultado da última importação e lista
- [X] T027 [US1] Criar `components/admin/producao/producao.module.css`: tabela no desktop, cartões no ≤768px, sem rolagem horizontal (mesma decisão da EDI-126)

**Checkpoint**: US1 entregável sozinha — histórico visível no admin, substituindo a conferência no aplicativo.

---

## Phase 4: User Story 2 — Dizer de que produto (e de que parte) é cada impressão (P1)

**Goal**: vínculo por nome de arquivo → parte do produto, com rendimento e unidades por produto, valendo retroativamente.

**Independent Test**: mapear um produto de peça única e um de duas partes; conferir que impressões antigas e novas aparecem vinculadas sem remapeamento.

- [X] T028 [P] [US2] Criar `app/api/producao/pendentes/route.ts` (`GET` agrupando nomes sem vínculo com contagem, gramas e última data)
- [X] T029 [US2] Criar `app/api/producao/vinculos/route.ts`: `GET` lista e `POST` cria/atualiza, validando `rendimentoPorPlaca` e `unidadesPorProduto` como inteiros ≥ 1, 404 para produto inexistente
- [X] T030 [US2] Criar `app/api/producao/vinculos/[nomeArquivo]/route.ts` (`DELETE`), **decodificando** o param de rota antes de consultar (percent-encoding no Next 16)
- [X] T031 [P] [US2] Criar `app/api/producao/vinculos/route.test.ts`: cria, atualiza, rejeita rendimento zero/fracionário, 404 de produto, e dois vínculos distintos apontando para o mesmo produto como partes diferentes
- [X] T032 [US2] Criar `components/admin/producao/MapearArquivo.tsx`: seleção de produto, rótulo da parte (padrão "Peça única"), rendimento por placa, unidades por produto, e aviso de reclassificação ao alterar vínculo existente
- [X] T033 [US2] Integrar a seção "Impressões sem produto" em `app/admin/(painel)/producao/page.tsx`, e exibir o produto/parte vinculados em `ListaImpressoes.tsx`

**Checkpoint**: US1 + US2 — produção já atribuída ao catálogo, pronta para virar custo.

---

## Phase 5: User Story 3 — Comparar o custo apurado com o custo cadastrado (P2)

**Goal**: custo apurado por peça somando partes, com embalagem e mão de obra contadas uma única vez, sem nunca alterar cadastro sozinho.

**Independent Test**: produto de peça única e produto de duas partes exibem apurado vs cadastrado; importação não altera `custoProducao`.

- [X] T034 [US3] Criar `lib/producao/apuracao.ts` (módulo **puro**): apuração por parte (filamento, depreciação, energia via `calcularCustoProducao`), por produto (soma das partes × `unidadesPorProduto` + mão de obra/embalagem/acessórios **uma vez**), `unidadesAcabadas` limitadas pela parte mais escassa, `excedentePorParte`, `parcial`/`partesSemDados`, média ponderada por peças quando houver materiais diferentes
- [X] T035 [US3] Criar `lib/producao/apuracao.test.ts`: peça única (6 por placa → gramas/6); duas partes com rendimentos diferentes; embalagem e mão de obra **não** duplicadas por parte; parte sem produção → `parcial` com o nome da parte; produto sem produção → "sem dados", nunca zero; impressão interrompida fora da contagem de peças; impressão com `gramas` zero ignorada
- [X] T036 [P] [US3] Criar `app/api/producao/apuracao/route.ts` (`GET` com `produtoId`, `de`, `ate`, devolvendo também o `resumo` do contrato)
- [X] T037 [US3] Criar `components/admin/producao/ApuracaoProdutos.tsx`: unidades acabadas, gramas/peça, horas/peça, apurado vs cadastrado com a diferença, aviso de parcial com as partes faltantes, e "sem dados de produção" quando não houver
- [X] T038 [US3] Implementar "Aplicar ao cadastro" em `ApuracaoProdutos.tsx` chamando o `PATCH /api/produtos/[id]` existente com os campos de `custoProducao`, exibindo o status real em caso de erro
- [X] T039 [US3] Integrar a seção de apuração em `app/admin/(painel)/producao/page.tsx`

**Checkpoint**: o objetivo central da feature está entregue.

---

## Phase 6: User Story 4 — Lançar no estoque as peças realmente prontas (P2)

**Goal**: entrada de estoque confirmada, idempotente, por conjunto completo em multipartes, sem a importação jamais mexer no estoque.

**Independent Test**: lançar 5 de 6 com 1 perda, conferir o estoque, ser recusado ao exceder o saldo e conseguir lançar o remanescente; importar e confirmar que nada mudou.

- [X] T040 [US4] Criar `lib/producao/lancamento.ts`: saldo lançável por impressão (`rendimento − lançada − perdida`, só concluída e não histórica), máximo de conjuntos completos por produto, seleção FIFO do consumo por parte, e a atualização atômica com filtro `quantidadeLancada: { $lte: rendimento − quantidade }`
- [X] T041 [US4] Criar `lib/producao/lancamento.test.ts`: saldo zero em impressão histórica e em interrompida; lançamento parcial deixa saldo; exceder o rendimento é recusado; conjuntos limitados pela parte mais escassa; FIFO consome a impressão mais antiga primeiro
- [X] T042 [US4] Criar `app/api/producao/lancamentos/route.ts` (`POST`): valida quantidade, aplica o consumo, faz `$inc` no estoque do produto, grava `LancamentoProducao`, chama `sincronizarAnuncioProduto` (best-effort, herdando a fila) e devolve o estoque resultante; 409 com a mensagem de saldo do contrato
- [X] T043 [P] [US4] Criar `app/api/producao/lancamentos/route.test.ts`: 400 de quantidade inválida; 409 de saldo insuficiente com a contagem de conjuntos; 409 de produto sem vínculo; duas chamadas iguais não lançam o dobro; perda declarada reduz o saldo sem somar ao estoque
- [X] T044 [US4] Adicionar a ação "Lançar no estoque (N un.)" em `ListaImpressoes.tsx`, com quantidade sugerida igual ao rendimento, campo de perda, ausência total da ação em impressão histórica/interrompida e exibição de `lançado X de Y`
- [X] T045 [US4] Adicionar o lançamento por conjunto completo em `ApuracaoProdutos.tsx` (máximo = conjuntos disponíveis), deixando claro o excedente de partes que não virou produto pronto

**Checkpoint**: estoque alimentado pela produção, sem risco de inflar anúncio.

---

## Phase 7: User Story 5 — Enxergar perda e falha medidas (P3)

**Goal**: taxa de falha e perda observadas, com amostra, e o custo das falhas no período.

**Independent Test**: conferir que os percentuais exibidos batem com a contagem manual sobre os mesmos dados.

- [X] T046 [US5] Acrescentar a `lib/producao/apuracao.ts`: `taxaFalhaObservada`, `amostra`, `amostraPequena` (< 10), `perdaObservadaPercentual` (gramas/peça ÷ peso cadastrado − 1) e o resumo de gramas e reais perdidos em falhas
- [X] T047 [US5] Acrescentar casos a `lib/producao/apuracao.test.ts`: taxa de falha com amostra pequena sinalizada; perda negativa (consumo menor que o cadastrado) exibida sem distorção; produto sem peso cadastrado não calcula perda
- [X] T048 [US5] Exibir os indicadores em `ApuracaoProdutos.tsx` (aviso explícito de amostra pequena em vez de apresentar o percentual como conclusão)
- [X] T049 [US5] Permitir aplicar `taxaFalhaPercentual` ao cadastro na ação "Aplicar ao cadastro", por confirmação explícita. **`margemPerdaPercentual` ficou de fora de propósito**: o peso apurado já embute a purga, então aplicar os dois contaria a perda duas vezes (ver `custoDaParte` em `lib/producao/apuracao.ts` e research.md #4). A perda observada continua exibida como indicador.

---

## Phase 8: User Story 6 — Importação automática diária (P3)

**Goal**: cron diário e aviso visível de reconexão quando o token expira.

**Independent Test**: impressões do dia anterior aparecem sem clique; com acesso expirado, o aviso aparece e a importação manual resolve.

- [X] T050 [US6] Registrar `origem: "automatica"` na importação disparada pelo cron e `"manual"` na disparada pelo painel, em `lib/producao/importacao.ts`
- [X] T051 [US6] Exibir em `app/admin/(painel)/producao/page.tsx` o resultado da última execução (quando, origem, novas, erro) e o aviso de reconexão quando a credencial estiver expirada ou a última execução tiver falhado por autenticação
- [X] T052 [P] [US6] Acrescentar caso a `app/api/producao/importar/route.test.ts`: credencial expirada responde 409 e registra a falha para a tela exibir

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T053 [P] Revisar todos os textos novos em pt-BR, no padrão do admin, sem termo técnico vazando para a tela
- [X] T054 [P] Conferir o responsivo da área de produção no ≤768px (cartões, sem rolagem horizontal)
- [X] T055 Rodar `npm test` e corrigir o que falhar
- [X] T056 Rodar `npm run lint` e corrigir o que falhar
- [X] T057 Conferir que nenhuma resposta de `/api/producao/*` contém `accessToken` ou senha (FR-033)
- [X] T058 Conferir o Test Guide do quickstart.md ponta a ponta e ajustar o que divergir da implementação

---

## Status da execução

Todas as 58 tarefas implementadas em 2026-10-05, na branch `edilsonaandrade/edi-127-controle-de-producao-historico-de-impressoes-da-bambu-lab-a1`.

- 120 testes novos (`npx vitest run lib/producao app/api/producao`), suíte completa em 888 testes passando.
- `npx tsc --noEmit` limpo.
- `npm run lint` **não roda neste projeto** (o script chama `next lint`, removido no Next 16, e não há `eslint.config.js`). Problema pré-existente, fora do escopo deste ticket — T056 não pôde ser executada.
- Três decisões tomadas durante a implementação, registradas no código: custo apurado não aplica `margemPerdaPercentual` (a purga já está no peso real); número por peça só existe quando **todas** as partes têm o dado (senão seria soma com zeros disfarçados de medição); miniatura usa `img` e não `next/image`, porque o projeto não declara `remotePatterns` para o CDN do fabricante.

## Dependencies

```text
Setup (T001–T004)
   └─> Foundational (T005–T008)   ← bloqueia todas as histórias
          ├─> US1 (T009–T027)     P1 · MVP
          │      └─> US2 (T028–T033)   P1 · depende da lista e das impressões importadas
          │             ├─> US3 (T034–T039)   P2 · precisa do vínculo para apurar
          │             │      └─> US5 (T046–T049)   P3 · estende a apuração
          │             └─> US4 (T040–T045)   P2 · precisa do vínculo para o rendimento
          └─> US6 (T050–T052)     P3 · só precisa da importação (US1)
```

- **US3 e US4 são independentes entre si** — ambas dependem de US2, nenhuma depende da outra.
- **US5 depende de US3** (estende o mesmo módulo de apuração).
- **US6 depende só de US1**.

## Parallel Execution Examples

**Foundational**: T005 e T006 em paralelo (arquivos de modelo distintos); T007 e T008 após T005/T006.

**US1**: T009+T010 (cliente e teste), T011+T012 (mapeamento e teste) em paralelo — módulos independentes. T016, T017, T019, T020, T021, T022 são rotas em arquivos distintos, paralelizáveis após T013/T015.

**US2**: T028 e T031 paralelos a T029/T030.

**US3**: T036 paralelo a T037 após T034.

**US4**: T043 paralelo a T044/T045 após T042.

**Polish**: T053, T054 e T057 em paralelo.

## Implementation Strategy

**MVP (entrega 1)**: Setup + Foundational + US1. Já substitui a conferência manual no Bambu Handy.

**Entrega 2**: US2 + US3 — o motivo da feature existir: custo real por peça, incluindo multipartes.

**Entrega 3**: US4 — estoque alimentado pela produção.

**Entrega 4**: US5 + US6 — refinamento dos percentuais e automação.

Cada entrega é deployável e testável isolada pelo quickstart.md.
