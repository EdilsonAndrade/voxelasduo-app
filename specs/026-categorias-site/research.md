# Research: Cadastro de categorias do site (EDI-123)

## 1. O que `produto.categoria` passa a guardar
- **Decision**: `produto.categoria` continua sendo `string`, mas passa a guardar o **slug** da categoria cadastrada (ex.: `acessorios`), e não mais o texto digitado. O nome de exibição vem da coleção `categorias`.
- **Rationale**: todos os pontos que montam o link (`ProdutoCard`, `secoesPublicas`, `feedMeta`, carrinho, página do produto) já usam `/produtos/${produto.categoria}/${produto.slug}`, então continuam funcionando sem mudança. O índice único `{categoria, slug}` continua válido. Os carrinhos antigos guardam o texto antigo, e isso é resolvido pelo redirecionamento (#4).
- **Alternatives**: guardar `categoriaId: ObjectId` exigiria mexer em todos os geradores de link e em um lookup extra em cada listagem. Descartado.

## 2. Slug da categoria é imutável
- **Decision**: o slug é gerado por `gerarSlug(nome)` na criação e **não muda** ao renomear. Renomear altera só `nome`.
- **Rationale**: renomear não quebra URL, e evita reescrever os produtos e criar redirecionamentos em cascata.
- **Alternatives**: slug editável, com redirecionamento. Seria mais complexo sem ganho real para o catálogo atual.

## 3. Equivalência de nomes
- **Decision**: dois nomes são equivalentes quando `gerarSlug(a) === gerarSlug(b)`, o que ignora acentos, maiúsculas, espaços e pontuação. O índice único é em `slug`.
- **Rationale**: é o mesmo critério da URL. "acessorios", "Acessórios" e " acessórios " colidem.

## 4. Redirecionamentos
- **Decision**:
  - **Produto**: nova coleção `redirecionamentosProdutos` `{categoria, slug, produtoId}`, com índice único em `{categoria, slug}`. É gravada sempre que a categoria ou o slug de um produto muda (migração, troca na listagem ou na edição, mudança de nome, remoção de categoria). Na página do produto, quando não há produto em `(categoria, slug)`, consulta o redirecionamento, busca o produto **atual** pelo `produtoId` e faz `permanentRedirect` para a URL atual. Assim há sempre um único salto, mesmo após várias trocas.
  - **Categoria**: o documento da categoria tem `aliases: string[]` com os segmentos antigos (ex.: `acessórios`). Na página `/produtos/[categoria]`, se o segmento não é um slug existente, procura o alias e faz `permanentRedirect`. Se o segmento normalizado (`gerarSlug`) bate com um slug, redireciona também. Categoria removida: os aliases e o slug dela passam para "Diversos".
  - A resolução é feita nas páginas (Server Components). O `proxy.ts` não é usado, para não adicionar consulta ao banco em toda requisição.
- **Rationale**: é o menor custo. Só consulta quando a rota daria 404.
- **Alternatives**: `redirects()` no `next.config`, que é estático e não atende dados dinâmicos. Redirecionamento no proxy, que teria custo em todas as rotas.

## 5. Conflito de slug ao trocar de categoria
- **Decision**: ao mover um produto para uma categoria onde o slug já existe, aplica o mesmo sufixo usado hoje (`${slug}-${Date.now().toString(36)}`) e grava o redirecionamento do endereço antigo. Na migração, o sufixo é determinístico (`-2`, `-3`…) para o relatório ficar legível.
- **Observação**: o PATCH atual não trata troca de categoria sem troca de nome, o que estouraria o índice único com erro 500. A correção entra junto com esta feature.

## 6. Mercado Livre e demais canais
- **Decision**: não há mudança no fluxo do ML. `resolverCategoriaMercadoLivre`/`montarConsultaPrevisor` continuam recebendo `produto.categoria`. As chaves de `QUALIFICADOR_CATEGORIA` já estão em formato slug (`decoracao`), então passam a casar com o novo valor.
- **Impacto conhecido**: produtos de "decoração" **sem** categoria do ML escolhida manualmente passam a receber o qualificador "decoração" na consulta ao previsor, como o código já previa. Anúncios já publicados não são afetados.
- **Feed Meta**: `product_type` passa a enviar o **nome** da categoria (ex.: "Acessórios"), e não o slug.

## 7. Migração
- **Decision**: script `scripts/migrar-categorias.ts` (`npm run migrar:categorias`), no padrão de `seed.ts` (dotenv + `.env.local`). Ele:
  1. faz upsert das categorias iniciais;
  2. para cada valor distinto de `produto.categoria` que não é slug cadastrado, calcula `gerarSlug(valor)`, associa à categoria com esse slug ou vai para `diversos`, e adiciona o valor antigo em `aliases`;
  3. atualiza os produtos (tratando conflito de slug) e grava os redirecionamentos;
  4. imprime o relatório (`valor antigo → categoria : N produtos`).
  Pode ser executado várias vezes com o mesmo resultado (idempotente) e aceita `--dry-run`, que só mostra o relatório.
- **Runtime**: `garantirCategoriaPadrao()` faz upsert de "Diversos" no primeiro acesso, para que ela sempre exista mesmo sem o script.

## 8. Seletor com busca
- **Decision**: componente client novo `SelectBusca` (combobox acessível: `role="combobox"`, `aria-expanded`, `listbox`, navegação por setas, Enter e Esc), usado no formulário e na listagem. Não adiciona dependência nova.
- **Alternatives**: reaproveitar `CategoriaMercadoLivreSelect`, que é acoplado à árvore de categorias do ML. Descartado.

## 9. i18n
- **Decision**: o projeto não tem biblioteca de i18n. Os textos seguem o padrão existente: pt-BR inline, como nas features 024 e 025.

## 10. Cache
- **Decision**: as mutações de categoria e as trocas de categoria de produto chamam `revalidatePath("/")` e `revalidatePath("/produtos", "layout")`. As páginas de produto e de categoria já são dinâmicas ou têm `searchParams`.
