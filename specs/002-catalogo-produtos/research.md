# Research: Catálogo de Produtos (CRUD)

## 1. Upload e armazenamento de fotos de produto

**Decision**: Usar `@vercel/blob` com acesso público para as fotos de produto, via uma rota de API dedicada (`/api/produtos/upload`) que recebe o arquivo, envia ao Blob e retorna a URL pública.

**Rationale**: O ticket já sugere Vercel Blob; o projeto está hospedado na Vercel (sem infraestrutura própria de storage); fotos de produto são conteúdo público por natureza (exibidas na vitrine), então acesso público é adequado — não há necessidade de URLs assinadas. Vercel Functions aceitam corpos de requisição de até 100MB, o que é mais que suficiente para upload de imagens de produto.

**Alternatives considered**:
- **Armazenar imagem como base64 no MongoDB**: rejeitado — infla documentos, degrada performance de leitura da listagem, e o tier gratuito M0 tem limite de armazenamento apertado para binários.
- **Serviço externo (Cloudinary, S3)**: viável, mas adiciona uma integração e credencial extra sem benefício claro sobre o Blob já nativo da Vercel, dado que o projeto já está 100% na Vercel.

## 2. Identificação do produto na URL pública (`slug`)

**Decision**: Adicionar campo `slug` ao modelo `Produto`, gerado a partir do nome no momento da criação (normalização: minúsculas, sem acentos, espaços viram hífen), com verificação de unicidade dentro da mesma categoria.

**Rationale**: `specs/site-architecture.md` já define a URL pública do produto como `/produtos/[categoria]/[slug]` — o `_id` do MongoDB não é adequado para URL (não é legível nem SEO-friendly). Unicidade por categoria (em vez de global) evita colisões desnecessárias sem exigir um índice global mais restritivo.

**Alternatives considered**:
- **Usar `_id` diretamente na URL**: rejeitado — já descartado pela decisão de arquitetura do site (URLs legíveis para SEO).
- **Slug editável manualmente pelo admin**: possível no futuro, mas fora do escopo mínimo desta tarefa — gerar automaticamente é suficiente para o volume pequeno de produtos esperado.

## 3. Busca e filtro por categoria

**Decision**: Implementar busca textual simples com `$regex` case-insensitive sobre `nome` e `descricao`, e filtro exato por `categoria`, combináveis na mesma query GET (`/api/produtos?q=...&categoria=...`). Sem índice de texto completo (text index) do MongoDB nesta tarefa.

**Rationale**: Catálogo pequeno (dezenas de produtos) — `$regex` sobre uma coleção pequena atende ao critério de sucesso SC-003 (resultado percebido como instantâneo) sem a complexidade extra de configurar e manter um text index. Fica documentado aqui como ponto de evolução caso o catálogo cresça.

**Alternatives considered**:
- **MongoDB Atlas Search / text index**: mais robusto para catálogos grandes, mas over-engineering para o volume atual (dezenas de itens); pode ser revisitado se o catálogo crescer significativamente.

## 4. Framework de testes

**Decision**: Introduzir **Vitest** como framework de testes unitários para a lógica de domínio nova (`lib/produtos/validation.ts`, `lib/produtos/slug.ts`), executando junto de `tsc --noEmit` e `next build` no fluxo de verificação.

**Rationale**: O projeto ainda não tem nenhum framework de testes configurado. Esta tarefa introduz a primeira lógica de negócio não trivial (validação de produto, geração de slug, montagem de filtros) que se beneficia de testes automatizados, conforme já antecipado no plano da Tarefa 1 ("testes automatizados de domínio ficam a cargo das tarefas de catálogo/checkout/pagamento"). Vitest foi escolhido por integração nativa com TypeScript/ESM e configuração mínima em projetos Next.js, sem exigir um transformador Babel separado.

**Alternatives considered**:
- **Jest**: também viável, mas exige mais configuração para ESM/TypeScript no ecossistema Next.js atual.
- **Sem testes automatizados**: rejeitado — a validação de produto (preço > 0, estoque >= 0, campos obrigatórios) é exatamente o tipo de regra que regride silenciosamente sem teste.

## 5. Internacionalização (I18N) dos textos desta tarefa

**Decision**: Não existe ainda nenhum framework ou padrão de I18N implementado no projeto (`app/layout.tsx` tem `lang="pt-BR"` fixo, sem `next-intl` ou equivalente instalado). Como a regra do projeto é "seguir o padrão já existente" e não há padrão a seguir, esta tarefa escreve todos os textos voltados ao usuário (rótulos, mensagens de validação, "produto não encontrado", "nenhum resultado encontrado") em português, centralizados em constantes por tela/componente (não strings soltas espalhadas), para que uma futura tarefa de internacionalização possa extrair esses textos para um sistema de i18n sem precisar re-escrever a lógica de UI.

**Rationale**: Implementar um sistema de I18N completo está fora do escopo do ticket EDI-75 (catálogo de produtos) e não foi mencionado no épico como parte desta tarefa. Centralizar os textos é uma preparação de baixo custo que não expande o escopo, mas evita retrabalho maior depois.

**Alternatives considered**:
- **Implementar `next-intl` agora**: rejeitado por expandir escopo além do ticket sem pedido explícito.
- **Strings soltas sem centralização**: rejeitado — dificultaria desnecessariamente uma futura extração para i18n.

## 6. Área administrativa sem autenticação (decisão de escopo)

**Decision**: A área `/admin/produtos` é implementada nesta tarefa sem nenhum mecanismo de login/autenticação, conforme decisão explícita do usuário durante a especificação (ver spec.md, FR-014 e Assumptions).

**Rationale**: A autenticação do painel administrativo é escopo formal da Tarefa 8 (EDI-81). Implementá-la aqui duplicaria trabalho ou criaria uma solução temporária que teria que ser substituída.

**Risk (carregado para o plano, não uma decisão de mitigação nesta tarefa)**: O site não deve ser exposto publicamente em produção com o catálogo administrável até EDI-81 estar concluída. Isso deve ser comunicado ao usuário no relatório final desta implementação.
