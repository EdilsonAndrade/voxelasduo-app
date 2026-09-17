# Tasks: Ficha técnica opcional do produto para anúncios do Mercado Livre

**Input**: Design documents from `/specs/014-ml-ficha-tecnica-produto/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ficha-tecnica-no-anuncio.md, quickstart.md

**Tests**: Incluídos — segue o padrão já existente do projeto (Vitest, arquivos `*.test.ts` co-localizados), mesmo padrão de EDI-92/EDI-95/EDI-96.

**Organization**: 2 user stories, ambas P1: US1 (preencher a ficha técnica no cadastro) e US2 (ficha técnica refletida no anúncio publicado, incluindo correção retroativa). US2 depende do modelo/validação criados em US1.

## Format: `[ID] [P?] [Story] Description`

## Path Conventions

Mesmo projeto único Next.js (ver plan.md): `lib/`, `app/`, `components/`.

---

## Phase 1: Setup

- [X] T001 Confirmar um produto de teste já publicado no Mercado Livre (`integracoes.mercadoLivreId`) numa categoria que exponha ao menos um dos atributos `HEIGHT`/`WIDTH`/`LENGTH`/`WEIGHT`/`MATERIAL` (ex: decoração/vasos, `MLB270294`), para validar manualmente ao final — nenhuma nova variável de ambiente ou dependência é necessária

---

## Phase 2: Foundational

**Nota**: Não há infraestrutura compartilhada bloqueante além do que a própria US1 produz (modelo `FichaTecnicaProduto` + validação) e que US2 consome diretamente — ver Dependencies. Nenhuma tarefa foundational separada é necessária.

---

## Phase 3: User Story 1 - Preencher a ficha técnica ao cadastrar/editar um produto (Priority: P1) 🎯 MVP

**Goal**: O vendedor consegue preencher, de forma totalmente opcional e parcial, altura/largura/comprimento/peso/material/itens inclusos de um produto, e os valores são salvos e reaparecem ao reabrir o produto.

**Independent Test**: Cadastrar um produto preenchendo só alguns campos da ficha técnica (ex: só material) e confirmar que salva sem erro e os valores reaparecem ao editar; tentar um valor inválido (peso zero) e confirmar que só esse campo é rejeitado.

### Tests for User Story 1

- [X] T002 [P] [US1] Adicionar testes de validação de `fichaTecnica` em `lib/produtos/validation.test.ts`: aceita objeto ausente; aceita `{}` (nada preenchido); aceita preenchimento parcial (ex: só `material`); rejeita `alturaCm`/`larguraCm`/`comprimentoCm`/`pesoGramas` zero/negativo/não numérico quando presentes, sem invalidar os demais campos; aceita `itensInclusos` como array de strings não vazias
- [X] T003 [P] [US1] Escrever testes de `montarFichaTecnica`/`camposFichaTecnicaFaltando` em `lib/produtos/fichaTecnicaFormulario.test.ts` (novo arquivo, mesmo padrão de `embalagemEnvioFormulario`, mas cada campo é independente): converte strings do formulário para os tipos corretos, ignora campos vazios/inválidos individualmente (não invalida o objeto inteiro), retorna `undefined` só quando nada foi preenchido

### Implementation for User Story 1

- [X] T004 [P] [US1] Adicionar a interface `FichaTecnicaProduto` e o campo opcional `fichaTecnica?: FichaTecnicaProduto` em `Produto`, em `lib/models/produto.ts` (data-model.md) — distinto de `EmbalagemEnvio` e `CustoProducao`
- [X] T005 [US1] Adicionar `fichaTecnica?: unknown` a `ProdutoPayload` e `validarFichaTecnica` em `lib/produtos/validation.ts`: cada campo numérico (`alturaCm`/`larguraCm`/`comprimentoCm`/`pesoGramas`) validado individualmente (> 0 quando presente, sem exigir os demais); `material` como string não vazia quando presente; `itensInclusos` como array de strings não vazias quando presente — depende de T002, T004
- [X] T006 [US1] Criar `lib/produtos/fichaTecnicaFormulario.ts` (mesmo padrão de `embalagemEnvioFormulario.ts`): `FichaTecnicaFormValores` (todos os campos em texto, incluindo `itensInclusos` como uma única string multilinha), `VAZIO_FICHA_TECNICA`, `montarFichaTecnica(form): FichaTecnicaProduto | undefined` (inclui só os campos válidos preenchidos, `undefined` se nada preenchido), `fichaTecnicaParaFormulario(fichaTecnica?): FichaTecnicaFormValores` — depende de T003, T004
- [X] T007 [US1] Adicionar seção "Ficha técnica (opcional)" em `components/admin/ProdutoForm.tsx`: campos de altura/largura/comprimento (cm), peso (g), material (texto) e itens inclusos (textarea, um por linha) — mesmo padrão visual do fieldset "Dados de embalagem para envio"; sem nenhum aviso bloqueante (todos os campos são independentes) — depende de T006
- [X] T008 [US1] Repassar `payload.fichaTecnica as FichaTecnicaProduto | undefined` em `criarProduto(...)` (`app/api/produtos/route.ts`) — o `PATCH` (`app/api/produtos/[id]/route.ts`) já repassa via spread do payload, mesmo caso de `embalagemEnvio` — depende de T005
- [X] T009 [US1] Repassar `fichaTecnicaParaFormulario(produto.fichaTecnica)` como parte de `valoresIniciais` em `app/admin/(painel)/produtos/[id]/editar/page.tsx` — depende de T004, T006

**Checkpoint**: US1 completa e testável de forma independente — ficha técnica preenchível, salva e reaparece na edição, sem nenhuma integração com o Mercado Livre ainda.

---

## Phase 4: User Story 2 - Ficha técnica refletida no anúncio publicado no Mercado Livre (Priority: P1)

**Goal**: Campos de ficha técnica preenchidos viram atributos estruturados (`HEIGHT`/`WIDTH`/`LENGTH`/`WEIGHT`/`MATERIAL`) quando a categoria os aceita, ou texto complementar na descrição quando não aceita; anúncios já publicados podem ser corrigidos sem republicar.

**Independent Test**: Publicar um produto de teste com ficha técnica preenchida numa categoria que aceite os atributos e conferir no item publicado (`scripts/inspecionar-item-mercado-livre.ts`) que os valores aparecem corretamente; conferir que "itens inclusos" aparece na descrição; rodar a correção retroativa num anúncio já publicado sem ficha técnica e conferir que passa a refletir os dados, sem duplicar o bloco de descrição numa segunda execução.

### Tests for User Story 2

- [X] T010 [P] [US2] Escrever testes de `atributosFichaTecnica` em `lib/estoque/canais/mercadoLivre/atributos.test.ts`: para cada campo preenchido (altura/largura/comprimento/peso/material), inclui o atributo correspondente (`HEIGHT`/`WIDTH`/`LENGTH`/`WEIGHT`/`MATERIAL`) em `attributes` só quando esse ID está presente na lista de atributos da categoria recebida, caso contrário inclui em `paraDescricao`; `itensInclusos` sempre vai para `paraDescricao`; atributos `number_unit` usam `value_name: "<numero> <unidade>"` (cm/g); `MATERIAL` usa `value_name` (texto livre, mesmo fora da lista de sugestões da categoria)
- [X] T011 [P] [US2] Escrever testes de `aplicarFichaTecnicaNaDescricao` em `lib/estoque/canais/mercadoLivre/anuncios.test.ts` (ou arquivo próprio): sem marcador existente, concatena o bloco ao final preservando o texto original; com marcador existente, substitui só o bloco após o marcador, preservando o texto original antes dele; com `paraDescricao` vazio, remove o marcador e o bloco (mantém só o texto original); aplicar duas vezes com os mesmos dados produz o mesmo resultado (idempotência, FR-007)
- [X] T012 [P] [US2] Estender os testes de `criarAnuncio` em `lib/estoque/canais/mercadoLivre/anuncios.test.ts`: quando `produto.fichaTecnica` tem campos com atributo correspondente na categoria, o corpo de `POST /items` inclui esses atributos; quando tem campos sem atributo correspondente (ou `itensInclusos`), a descrição enviada em `POST /items/{id}/description` inclui o bloco "Ficha técnica:"; sem `fichaTecnica`, nada muda (publicação não é bloqueada)
- [X] T013 [P] [US2] Estender os testes de `atualizarAtributosAnuncio` em `lib/estoque/canais/mercadoLivre/anuncios.test.ts`: quando há campos de ficha técnica sem atributo correspondente na categoria, busca a descrição atual (`GET /items/{id}/description`) e atualiza via `PUT /items/{id}/description` com o bloco aplicado; quando todos os campos preenchidos têm atributo correspondente, não faz nenhuma chamada a `description`; erro em qualquer uma das duas chamadas propaga via `erroMercadoLivre`

### Implementation for User Story 2

- [X] T014 [US2] Implementar `atributosFichaTecnica(fichaTecnica, atributosCategoria): ResultadoFichaTecnica` em `lib/estoque/canais/mercadoLivre/atributos.ts` (data-model.md) — depende de T004, T010
- [X] T015 [US2] Adicionar uma função para buscar **todos** os atributos da categoria (não só os obrigatórios) em `lib/estoque/canais/mercadoLivre/atributos.ts` — ex: `buscarAtributosCategoria(categoryId)`, reaproveitando a mesma chamada `GET /categories/{id}/attributes` já usada por `buscarAtributosObrigatorios` (extrair a busca comum, `buscarAtributosObrigatorios` passa a filtrar o resultado desta) — depende de T014
- [X] T016 [US2] Implementar `aplicarFichaTecnicaNaDescricao(descricaoAtual, paraDescricao): string` (marcador `"\n\n---\nFicha técnica:\n"`, idempotente) em `lib/estoque/canais/mercadoLivre/anuncios.ts` — depende de T011
- [X] T017 [US2] Estender `montarAtributos()` (`anuncios.ts`) para também chamar `atributosFichaTecnica()` quando `produto.fichaTecnica` estiver definido, concatenando `resultado.attributes` aos atributos existentes e retornando também `resultado.paraDescricao` para quem chama — depende de T014, T015
- [X] T018 [US2] Em `criarAnuncio()`, montar a descrição final (`produto.descricao` + bloco de ficha técnica via `aplicarFichaTecnicaNaDescricao("", paraDescricao)`, quando não vazio) antes do `POST /items/{id}/description` — depende de T012, T016, T017
- [X] T019 [US2] Estender `atualizarAtributosAnuncio()` para, quando `paraDescricao` não estiver vazio, buscar a descrição atual (`GET /items/{id}/description`), aplicar `aplicarFichaTecnicaNaDescricao()`, e atualizar via `PUT /items/{id}/description` (contracts/ficha-tecnica-no-anuncio.md, seção "Falhas parciais") — depende de T013, T016, T017
- [X] T020 [US2] Estender `scripts/inspecionar-item-mercado-livre.ts` para também mostrar os atributos `HEIGHT`/`WIDTH`/`LENGTH`/`WEIGHT`/`MATERIAL` e a descrição do item — depende de T014

**Checkpoint**: Ambas as user stories completas — ficha técnica preenchível no cadastro e refletida em anúncios novos e já publicados, com ou sem atributo de categoria correspondente.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T021 Rodar `npx tsc --noEmit` e `npm run lint` — tsc limpo; next lint com o mesmo problema de ambiente pré-existente já identificado em EDI-92/95/96 (confirmado independente desta feature)
- [X] T022 Rodar `npx vitest run` (toda a suíte, incluindo os testes novos/estendidos) e `npm run build`, conforme quickstart.md — 315 testes passando (48 arquivos), build concluído com sucesso
- [ ] T023 Validar manualmente contra o produto de teste (T001), seguindo os 3 roteiros de `quickstart.md` (cadastro, publicação, correção retroativa) — **ação do usuário/operador**, conforme regra do projeto de não subir/operar contra produção sem solicitação direta

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências
- **Foundational (Phase 2)**: nenhuma tarefa
- **US1 (Phase 3)**: pode começar logo após o Setup
- **US2 (Phase 4)**: depende do modelo `FichaTecnicaProduto` (T004, de US1); os testes/implementação de `atributosFichaTecnica`/`aplicarFichaTecnicaNaDescricao` (T010, T011, T014, T016) só precisam de T004, podendo avançar antes do restante de US1 (UI/rotas) estar pronto
- **Polish (Phase 5)**: depende de US1 e US2 completas

### Parallel Opportunities

- T002 e T003 (testes de US1) podem rodar em paralelo
- T010, T011 (testes de US2 que só dependem de T004) podem começar em paralelo ao restante de US1
- T012 e T013 podem rodar em paralelo entre si, mas dependem de T014/T016/T017 estarem implementados para passar

---

## Parallel Example: US1 + início de US2

```bash
# US1, em paralelo:
Task: "Modelo FichaTecnicaProduto + validação + testes"     # T002, T004, T005
Task: "fichaTecnicaFormulario.ts + testes"                  # T003, T006

# Ao mesmo tempo, início de US2 (só depende do modelo, T004):
Task: "atributosFichaTecnica + testes"                      # T010, T014, T015
Task: "aplicarFichaTecnicaNaDescricao + testes"              # T011, T016
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Completar Phase 1 (Setup)
2. Completar Phase 3 (US1) — ficha técnica preenchível e salva no cadastro, sem nenhuma integração com o Mercado Livre ainda
3. **Parar e validar**: confirmar que salvar/editar um produto com ficha técnica parcial funciona sem erros

### Incremental Delivery

1. Setup → base pronta
2. US1 → ficha técnica no cadastro (modelo, validação, formulário) → validar
3. US2 → atributos/descrição na publicação e na correção retroativa → validar com o produto de teste (T001/T023)
4. Polish → typecheck/lint/testes/build

---

## Notes

- Nenhuma tarefa de commit é executada automaticamente — mensagens de commit serão sugeridas ao usuário conforme CLAUDE.md (regra 5), sem commit automático
- T023 (validação manual contra produção) é uma ação operacional — executada pelo usuário/operador, não automaticamente pelo agente
