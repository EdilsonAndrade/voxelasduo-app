# Phase 0 Research: Ordenar fotos do produto (Mercado Livre e site)

## 1. Onde a ordem das fotos já é usada hoje

**Decisão**: Não criar um campo de ordem novo — `produto.fotos` (`string[]`, já existente em `lib/produtos/repository.ts`/`validation.ts`) já É a ordem, tanto para a galeria do produto no site quanto para o array `pictures` enviado ao Mercado Livre (`lib/estoque/canais/mercadoLivre/anuncios.ts:163`, `pictures: produto.fotos.map((source) => ({ source }))`). Hoje a única forma de mudar essa ordem é removendo e re-enviando fotos (upload sempre `push` no fim, `components/admin/ProdutoForm.tsx:205`).

**Rationale**: Confirma a decisão já tomada com o usuário na spec (ordem única compartilhada) — a estrutura de dados já é a certa, falta só dar controle de posição ao vendedor.

**Alternatives considered**: Campo separado `mercadoLivreFotosOrdem` — rejeitado no `Clarifications` da spec por duplicar dado sem necessidade.

## 2. Corte de 6 fotos para o Mercado Livre

**Decisão**: `criarAnuncio` (`anuncios.ts:163`) hoje envia `produto.fotos` inteiro, sem limite — um produto com mais de 6 fotos cadastradas quebra a publicação ou é rejeitado pelo Mercado Livre (limite documentado de 6 imagens por anúncio). Corrigir isso extraindo um helper `fotosParaAnuncio(fotos: string[]): string[]` (novo arquivo `lib/estoque/canais/mercadoLivre/fotos.ts`) que aplica `.slice(0, 6)`, usado tanto por `criarAnuncio` quanto pela UI do admin para calcular quais fotos marcar como "vai para o Mercado Livre" (FR-007) — uma única fonte de verdade para o número 6, evitando o admin e a chamada à API divergirem.

**Rationale**: Reaproveita o padrão do projeto de extrair regra testável para `lib/` e só consumir na UI (ver `custoProducao.ts`, `embalagemEnvioFormulario.ts`) — mantém a UI sem lógica de negócio duplicada e testável via Vitest sem precisar de ambiente de navegador.

**Alternatives considered**: Truncar só no backend, sem indicar na UI — rejeitado pela própria spec (FR-007, User Story 3).

## 3. Como a nova ordem chega até um anúncio já publicado

**Decisão**: Reaproveitar o fluxo já existente de "despublicar e publicar de novo" (`despublicarAnuncio` + `criarAnuncio`, botões já presentes em `ProdutoForm.tsx`) — **não** criar um endpoint novo de "atualizar fotos in-place" no anúncio.

**Rationale**: O código já documenta essa limitação para casos equivalentes: `app/api/produtos/[id]/route.ts` (comentário no `PATCH`) — *"Nome, categoria e fotos não têm um endpoint de atualização 'in place' tão direto na API do Mercado Livre — quem quiser refletir essas mudanças no anúncio precisa despublicar e publicar de novo."* — e `sincronizarAnuncioProduto` (`lib/estoque/sincronizacao.ts`) hoje só sincroniza preço/estoque/descrição via `atualizarAtributosAnuncio`, nunca `pictures`. Criar um endpoint novo de atualização de fotos in-place exigiria confirmar com testes em produção se `PUT /items/{id}` aceita reescrever `pictures` para esta conta (modelo "User Products") — escopo maior que o pedido no ticket, e a spec (Edge Cases) já foi escrita prevendo esse comportamento: *"reordenar sozinho, sem publicar/atualizar, não altera o anúncio já no ar"*.

**Alternatives considered**: Implementar `PUT /items/{id}` com `pictures` para atualização in-place — não descartado para sempre, mas fica como possível melhoria futura (ticket separado) caso o vendedor sinta falta; fora do escopo do EDI-99 para não introduzir uma chamada à API não testada nesta conta.

## 4. Mecanismo de reordenação na UI

**Decisão**: Drag-and-drop nativo do HTML5 (`draggable`, `onDragStart`/`onDragOver`/`onDrop`) nas miniaturas já renderizadas em `ProdutoForm.tsx`, complementado por botões "mover para cima"/"mover para baixo" em cada miniatura (acessibilidade/teclado, sem depender só de drag).

**Rationale**: Nenhuma biblioteca de drag-and-drop está instalada (`package.json` não tem `@dnd-kit/*`, `react-beautiful-dnd` etc.) — a API nativa do navegador cobre o caso (lista pequena, até ~10 itens) sem adicionar dependência nova, e os botões cobrem quem usa teclado/touch sem suporte a drag.

**Alternatives considered**: Instalar `@dnd-kit/core` — rejeitado por peso/complexidade desnecessários para reordenar uma lista curta de miniaturas.

## 5. Convenção de testes para esta feature

**Decisão**: `fotosParaAnuncio` (lib) ganha teste Vitest (`lib/estoque/canais/mercadoLivre/fotos.test.ts`) e o corte em `criarAnuncio` ganha um caso em `anuncios.test.ts`. A UI de reordenação em `ProdutoForm.tsx` **não** ganha teste automatizado.

**Rationale**: `vitest.config.ts` roda em `environment: "node"` (sem `jsdom`) e não existe nenhum `*.test.tsx` no projeto hoje — a convenção estabelecida é testar regra de negócio em `lib/` e verificar UI manualmente (Test Guide ao final da implementação), não introduzir um ambiente de teste de componente novo para uma feature isolada.

**Alternatives considered**: Adicionar `jsdom` + Testing Library só para esta feature — rejeitado por inconsistência com o resto do projeto e escopo maior que o necessário.
