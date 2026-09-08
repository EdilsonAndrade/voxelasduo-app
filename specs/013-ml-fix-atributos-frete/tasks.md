# Tasks: Correções urgentes de atributos e frete nos anúncios do Mercado Livre

**Input**: Design documents from `/specs/013-ml-fix-atributos-frete/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/corrigir-atributos.md, quickstart.md

**Tests**: Incluídos — segue o padrão já existente do projeto (Vitest, arquivos `*.test.ts` co-localizados), inclusive estendendo `atributos.test.ts` já existente.

**Organization**: 2 user stories, ambas P1/urgentes: US1 (Marca/Modelo corretos) e US2 (peso/dimensões da embalagem no frete). US2 reaproveita e estende a função de correção retroativa criada em US1.

## Format: `[ID] [P?] [Story] Description`

## Path Conventions

Mesmo projeto único Next.js (ver plan.md): `lib/`, `app/`, `components/`, `scripts/`.

---

## Phase 1: Setup

- [X] T001 Confirmar token válido do Mercado Livre em `credenciaisCanais` e ao menos um produto de teste já publicado (`integracoes.mercadoLivreId`) para validar as correções — nenhuma nova variável de ambiente ou dependência é necessária

---

## Phase 2: Foundational

**Nota**: Não há infraestrutura compartilhada bloqueante entre as duas user stories além do que a própria US1 produz (`atualizarAtributosAnuncio`) e que a US2 estende diretamente — ver Dependencies. Nenhuma tarefa foundational separada é necessária.

---

## Phase 3: User Story 1 - Atributos de marca e modelo corretos nos anúncios (Priority: P1) 🎯 MVP

**Goal**: Novos anúncios não saem mais com Marca = Modelo = nome do produto; anúncios já publicados com esse problema podem ser corrigidos sem despublicar/republicar.

**Independent Test**: Publicar um produto de teste numa categoria que exija Marca e Modelo como texto livre e conferir que os valores não saem mais idênticos; rodar a correção num anúncio já publicado com o problema e conferir no Mercado Livre que foi corrigido.

### Tests for User Story 1

- [X] T002 [P] [US1] Adicionar teste em `lib/estoque/canais/mercadoLivre/atributos.test.ts`: atributo `BRAND` de texto livre retorna um valor genérico (ex: "Genérica"), não o nome do produto; atributo `MODEL` de texto livre continua usando o nome do produto (comportamento já coberto, não deve regredir)
- [X] T003 [P] [US1] Escrever testes de `atualizarAtributosAnuncio` em `lib/estoque/canais/mercadoLivre/anuncios.test.ts`: monta `PUT /items/{id}` com `attributes` corrigidos a partir de `buscarAtributosObrigatorios` + `valorPadraoAtributo`, propaga erro de API via `erroMercadoLivre` (`fetch` mockado, mesmo padrão de `despublicarAnuncio`)

### Implementation for User Story 1

- [X] T004 [US1] Corrigir `valorPadraoAtributo` em `lib/estoque/canais/mercadoLivre/atributos.ts`: quando `atributo.id === "BRAND"` e `value_type !== "list"`, retornar `{ id: atributo.id, value_name: "Genérica" }` em vez de `produto.nome`; manter o comportamento atual para os demais atributos de texto livre (ex: `MODEL`) — depende de T002
- [X] T005 [US1] Implementar `atualizarAtributosAnuncio(itemId: string, produto: Produto): Promise<void>` em `lib/estoque/canais/mercadoLivre/anuncios.ts`: resolve a categoria do produto (mesma lógica de `criarAnuncio`), busca atributos obrigatórios (`buscarAtributosObrigatorios`), monta os valores (`valorPadraoAtributo` já corrigido) e envia via `PUT https://api.mercadolibre.com/items/{itemId}` com `{ attributes: [...] }`, propagando erro com `erroMercadoLivre` — depende de T003, T004
- [X] T006 [US1] Criar a rota `POST /api/produtos/[id]/mercado-livre/corrigir-atributos` em `app/api/produtos/[id]/mercado-livre/corrigir-atributos/route.ts` conforme `contracts/corrigir-atributos.md`: 404 se produto não existe, 400 se não tem `mercadoLivreId`, chama `atualizarAtributosAnuncio`, 502 em caso de falha — depende de T005
- [X] T007 [US1] Adicionar botão "Corrigir atributos no Mercado Livre" em `components/admin/ProdutoForm.tsx`, visível quando o produto já está publicado (`mercadoLivreId` preenchido), chamando a rota de T006 e exibindo sucesso/erro via `Toast`/mensagem de erro — depende de T006
- [X] T008 [US1] Criar `scripts/corrigir-atributos-mercado-livre.ts` (rodado via `tsx`, mesmo padrão de `scripts/seed.ts`): itera `listarProdutosComIntegracaoExterna()`, filtra os com `integracoes.mercadoLivreId`, chama `atualizarAtributosAnuncio` para cada um, registra sucesso/falha por produto no console — depende de T005
- [ ] T009 [US1] Rodar `scripts/corrigir-atributos-mercado-livre.ts` contra o ambiente real para corrigir os anúncios já publicados e ativos hoje (incluindo o citado pelo usuário, "Kit Com 8 Organizadores De Fios") — depende de T008; **ação executada pelo usuário/operador, não pelo agente**, conforme regra do projeto de não subir/operar contra produção sem supervisão direta

**Checkpoint**: US1 completa e testável de forma independente — novos anúncios e anúncios já publicados com Marca/Modelo corrigidos.

---

## Phase 4: User Story 2 - Frete condizente com o peso/tamanho real do produto (Priority: P1)

**Goal**: Peso e dimensões da embalagem passam a ser enviados ao Mercado Livre na publicação (novos anúncios) e podem ser aplicados a anúncios já publicados, para que o frete cotado ao comprador reflita o produto real.

**Independent Test**: Cadastrar peso/dimensões de embalagem num produto, publicá-lo, e conferir no anúncio que o frete cotado mudou em relação a um produto sem esses dados; aplicar a correção num anúncio já publicado e conferir a melhora no frete.

### Tests for User Story 2

- [X] T010 [P] [US2] Adicionar testes de validação de `embalagemEnvio` em `lib/produtos/validation.test.ts`: aceita ausente; aceita completo e válido; rejeita campo ausente/zero/negativo quando o objeto está presente (mesmo padrão de `custoProducao`, EDI-92)
- [X] T011 [P] [US2] Escrever testes de `atributosEmbalagem` em `lib/estoque/canais/mercadoLivre/atributos.test.ts`: retorna os 4 atributos (`SELLER_PACKAGE_WEIGHT/HEIGHT/LENGTH/WIDTH`) no formato `{ id, value_name: "<numero> <unidade>" }` a partir de um `EmbalagemEnvio`
- [X] T012 [P] [US2] Estender os testes de `criarAnuncio` em `lib/estoque/canais/mercadoLivre/anuncios.test.ts`: quando `produto.embalagemEnvio` está presente, o corpo de `POST /items` inclui os atributos de embalagem além dos obrigatórios da categoria; quando ausente, o corpo não inclui esses atributos (publicação não é bloqueada)
- [X] T013 [P] [US2] Estender os testes de `atualizarAtributosAnuncio` (`anuncios.test.ts`, T003) para cobrir o caso de `produto.embalagemEnvio` presente: o `PUT /items/{id}` inclui também os atributos de embalagem

### Implementation for User Story 2

- [X] T014 [P] [US2] Adicionar a interface `EmbalagemEnvio` e o campo opcional `embalagemEnvio?: EmbalagemEnvio` em `Produto`, em `lib/models/produto.ts` (data-model.md)
- [X] T015 [US2] Adicionar `embalagemEnvio?: unknown` a `ProdutoPayload` e a validação dos subcampos (todos obrigatórios e `> 0` quando o objeto está presente) em `lib/produtos/validation.ts` (mesmo padrão de `custoProducao`) — depende de T010, T014
- [X] T016 [US2] Implementar `atributosEmbalagem(embalagem: EmbalagemEnvio): AtributoItem[]` em `lib/estoque/canais/mercadoLivre/atributos.ts` — depende de T011, T014
- [X] T017 [US2] Em `criarAnuncio()` (`anuncios.ts`), concatenar `atributosEmbalagem(produto.embalagemEnvio)` ao array `attributes` do `POST /items` quando `produto.embalagemEnvio` estiver definido, independentemente de a categoria marcar esses atributos como obrigatórios — depende de T012, T016
- [X] T018 [US2] Estender `atualizarAtributosAnuncio` (T005) para também incluir `atributosEmbalagem(produto.embalagemEnvio)` no `PUT /items/{id}` quando presente — depende de T013, T016
- [X] T019 [US2] Repassar `payload.embalagemEnvio as EmbalagemEnvio | undefined` para `criarProduto(...)` em `app/api/produtos/route.ts` (o `PATCH` em `app/api/produtos/[id]/route.ts` já repassa via spread do payload, mesmo caso de `custoProducao`) — depende de T015
- [X] T020 [US2] Adicionar campos de embalagem (peso, altura, largura, comprimento) em `components/admin/ProdutoForm.tsx`, num fieldset "Dados de embalagem para envio (opcional)", com aviso não bloqueante quando incompletos (FR-007) — depende de T015
- [X] T021 [US2] Repassar `produto.embalagemEnvio` como parte de `valoresIniciais` em `app/admin/(painel)/produtos/[id]/editar/page.tsx` — depende de T014, T020
- [ ] T022 [US2] Rodar novamente `scripts/corrigir-atributos-mercado-livre.ts` (T008/T009) após preencher `embalagemEnvio` nos produtos já publicados mais urgentes, para propagar peso/dimensões aos anúncios ativos — depende de T018, T020; **ação executada pelo usuário/operador**

**Checkpoint**: Ambas as user stories completas — novos anúncios e anúncios já publicados corrigidos tanto em Marca/Modelo quanto em peso/dimensões de embalagem.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T023 Rodar `npx tsc --noEmit` e `npm run lint` — `tsc --noEmit` limpo; `next lint` continua com o mesmo problema de ambiente pré-existente já identificado na EDI-92 (confirmado independente desta feature)
- [X] T024 Rodar `npx vitest run` (toda a suíte, incluindo os testes novos/estendidos desta feature) e `npm run build`, conforme quickstart.md — 277 testes passando (47 arquivos), `npm run build` concluído com sucesso incluindo a nova rota `/api/produtos/[id]/mercado-livre/corrigir-atributos`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências
- **Foundational (Phase 2)**: nenhuma tarefa — ver nota na fase
- **US1 (Phase 3)**: pode começar logo após o Setup
- **US2 (Phase 4)**: depende de `atualizarAtributosAnuncio` já existir (T005, de US1) para T018; os demais itens de US2 (modelo, validação, `atributosEmbalagem`, `criarAnuncio`, UI) são independentes de US1 e podem avançar em paralelo
- **Polish (Phase 5)**: depende de US1 e US2 completas

### Parallel Opportunities

- T002 e T003 (testes de US1) podem rodar em paralelo
- T010, T011, T012, T013 e T014 (testes e modelo de US2) podem começar em paralelo ao trabalho de US1, exceto T018 (que precisa de T005 pronto)
- T004 e a preparação de T014/T015/T016 podem ocorrer em paralelo (arquivos diferentes)

---

## Parallel Example: US1 + início de US2

```bash
# US1, em paralelo:
Task: "Corrigir valorPadraoAtributo (BRAND) + testes"          # T002, T004
Task: "Implementar atualizarAtributosAnuncio + testes"          # T003, T005

# Ao mesmo tempo, início de US2 (não depende de US1 para isto):
Task: "Adicionar EmbalagemEnvio ao modelo + validação"          # T014, T015
Task: "Implementar atributosEmbalagem + testes"                 # T011, T016
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Completar Phase 1 (Setup)
2. Completar Phase 3 (US1) — já resolve o problema mais visível (Marca/Modelo) em anúncios novos e já publicados
3. **Rodar o script de correção em lote (T009)** para já corrigir os anúncios ativos hoje
4. **Parar e validar**: conferir no Mercado Livre que o anúncio citado pelo usuário foi corrigido

### Incremental Delivery

1. Setup → base pronta
2. US1 → Marca/Modelo corrigidos (novos + já publicados) → validar → rodar correção em lote
3. US2 → peso/dimensões de embalagem no cadastro e na publicação (novos + já publicados) → validar → rodar correção em lote de novo (agora com embalagem)
4. Polish → typecheck/lint/testes/build

---

## Notes

- Nenhuma tarefa de commit é executada automaticamente — mensagens de commit serão sugeridas ao usuário conforme CLAUDE.md (regra 5), sem commit automático
- T009 e T022 (rodar o script contra o ambiente real) são ações operacionais que tocam produção — executadas pelo usuário/operador, não automaticamente pelo agente, conforme as regras do projeto sobre não subir/operar instâncias de produção sem solicitação direta

---

## Follow-up pós-implementação (validado em produção pelo usuário)

Depois de aplicar a correção em `MLB5203603089` e o usuário confirmar que o frete cotado **não mudou**, uma inspeção direta do item via API revelou a causa: os atributos `SELLER_PACKAGE_*` são só informativos — o campo que o Mercado Livre realmente usa para calcular o frete é `shipping.dimensions` (formato `"AxBxC,peso"`), nunca enviado pela implementação original (ver research.md #2, seção "Correção pós-implementação").

- [X] T025 Corrigir `atributosEmbalagem()` para enviar valores numéricos puros, sem unidade (`"65"`, não `"65 g"`), conforme a FAQ oficial do Mercado Livre sobre `item.attribute.invalid.seller.package.dimensions` — `lib/estoque/canais/mercadoLivre/atributos.ts` + `atributos.test.ts`
- [X] T026 Implementar `dimensoesEnvioParaFrete(embalagem): string` (formato `"comprimentoxlarguraxaltura,peso"`) em `lib/estoque/canais/mercadoLivre/atributos.ts` + teste
- [X] T027 Incluir `shipping: { dimensions }` (via novo helper `corpoEnvio()`) no corpo de `criarAnuncio()` em `lib/estoque/canais/mercadoLivre/anuncios.ts`, quando `produto.embalagemEnvio` estiver definido + testes estendidos em `anuncios.test.ts`
- [X] T028 Criar `scripts/inspecionar-item-mercado-livre.ts` (`npm run inspecionar:item-ml`) — ferramenta de diagnóstico para consultar atributos/frete de um item real, usada para descobrir esta causa raiz e útil para validações futuras
- [X] T029 **(revertido após teste em produção)** Tentativa de rodar a correção com `shipping.dimensions` também em `atualizarAtributosAnuncio()` contra `MLB5203603089` — API do Mercado Livre rejeitou com `HTTP 400 field_not_updatable` ("shipping.dimensions is not modifiable"), confirmando que esse campo só pode ser definido na criação do item, nunca alterado depois de ativo. `atualizarAtributosAnuncio()` foi revertida para não enviar `shipping.dimensions` (T027 continua valendo só para `criarAnuncio`) — Marca/Modelo e atributos informativos de embalagem continuam corrigíveis sem republicar; o frete de um anúncio já ativo **não pode** ser corrigido via API sem despublicar/republicar (ver research.md #2, "Segunda correção pós-implementação")
- [X] T030 Anúncio republicado pelo usuário (`MLB5203603089` → `MLB5205046421`) para permitir o envio de `shipping.dimensions` na criação — resultado: campo continuou `null` (ignorado pelo Mercado Livre) e os atributos de embalagem sumiram, revelando dois problemas (ver research.md #2, "Terceira rodada")
- [X] T031 Reverter `atributosEmbalagem()` para enviar o valor **com unidade** (`"35 g"`, `"10 cm"`) — sem a unidade o Mercado Livre descarta o atributo silenciosamente (regressão introduzida na rodada anterior ao seguir a FAQ)
- [X] T032 Remover `dimensoesEnvioParaFrete` e o helper `corpoEnvio` — `shipping.dimensions` é ignorado na criação e rejeitado na atualização, então não há caminho pela API para esse campo nesta conta/modelo
- [X] T033 Medir o impacto real das dimensões no frete via `GET /users/{seller_id}/shipping_options` — R$ 14,00 com as dimensões reais vs R$ 21,70 com um pacote grande, contra R$ 14,99 cobrados hoje: o frete já está próximo do piso do Mercado Envios nessa rota
- [ ] T034 Republicar o anúncio mais uma vez (ou usar "Corrigir atributos no Mercado Livre") após o deploy desta correção, para que os atributos de embalagem finalmente sejam gravados no formato aceito — **ação do usuário/operador**
- [ ] T035 Abrir ticket próprio para as alavancas comerciais de frete (Mercado Envios Flex, frete grátis, kits com preço ≥ R$ 79, Full) — fora do escopo desta correção técnica
