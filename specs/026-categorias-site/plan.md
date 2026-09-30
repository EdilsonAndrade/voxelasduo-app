# Implementation Plan: Cadastro de categorias do site

**Branch**: `edilsonaandrade/edi-123-cadastro-de-categorias-do-site-no-admin-fim-da-categoria-em` | **Date**: 2026-09-30 | **Spec**: [spec.md](./spec.md) | **Linear**: EDI-123

## Summary
Nova coleção `categorias` (nome, slug imutável, ordem, `padrao`, `aliases`), gerenciada em `/admin/categorias`. `produto.categoria` continua sendo uma string, mas passa a guardar o **slug** de uma categoria cadastrada. Por isso todos os geradores de link (`/produtos/${categoria}/${slug}`) continuam funcionando sem mudança. Os endereços antigos são resolvidos só quando a rota daria 404: por `aliases` (página da categoria) e pela coleção `redirecionamentosProdutos` (página do produto), com `permanentRedirect` direto para a URL atual. Um script idempotente migra os textos livres para os slugs. O seletor com busca (`SelectBusca`) substitui o campo de texto no formulário e permite a troca rápida na listagem, via `PATCH /api/produtos/[id]`. O Mercado Livre e os demais canais não mudam.

## Technical Context
- **Stack**: TypeScript, Next.js 16.3 (App Router), React 19, CSS Modules, MongoDB (driver 6.12), NextAuth v5 (admin). **Sem dependência nova.**
- **Slug/equivalência**: `gerarSlug` (`lib/produtos/slug.ts`), já usado nos produtos.
- **Redirecionamento**: `permanentRedirect` (308) nos Server Components de `/produtos/[categoria]` e `/produtos/[categoria]/[slug]`. O `proxy.ts` não é alterado.
- **Cache**: `revalidatePath("/")` e `revalidatePath("/produtos", "layout")` nas mutações.
- **i18n**: não existe biblioteca. Os textos seguem o padrão existente (pt-BR inline).
- **Testes**: Vitest (`*.test.ts`) para validação, repositório (com mocks, no padrão atual), rotas e migração. UI coberta pelo Test Guide manual.
- **Auth**: `/api/admin/*`, `/api/produtos/*` e `/admin/*` já protegidos por `rotaProtegida.ts`.
- **Design**: invocar a skill `frontend-design` antes da UI (tela de categorias e `SelectBusca`), conforme o CLAUDE.md.

## Constitution Check
`constitution.md` ainda é o template, sem princípios ratificados. Aplicamos as regras do CLAUDE.md:
- Erros de API retornam o status HTTP real (400/403/404/409), visíveis na aba Network.
- Não commitar: apenas sugerir a mensagem de commit.
- Textos novos em pt-BR, no padrão existente.
✅ Sem violações.

## Project Structure
```text
lib/models/categoria.ts                               # tipos + coleção + seed (novo)
lib/models/redirecionamentoProduto.ts                 # tipos + coleção (novo)
lib/categorias/validation.ts (+ .test.ts)             # validação de nome/equivalência (novo)
lib/categorias/repository.ts (+ .test.ts)             # CRUD, ordem, remoção→Diversos, aliases, garantirCategoriaPadrao (novo)
lib/categorias/redirecionamentos.ts (+ .test.ts)      # registrar/resolver redirecionamentos de produto e categoria (novo)
lib/categorias/migracao.ts (+ .test.ts)               # plano de migração puro + aplicação (novo)
lib/produtos/repository.ts                            # listarCategorias → categorias com produtos; slug livre no destino; removerProduto limpa redirecionamentos (alterado)
lib/produtos/validation.ts                            # categoria opcional (vazia = diversos) (alterado)
lib/produtos/feedMeta.ts                              # product_type = nome da categoria (alterado)

scripts/migrar-categorias.ts                          # npm run migrar:categorias [--dry-run] (novo)
package.json                                          # + script migrar:categorias (alterado)

app/api/admin/categorias/route.ts                     # GET, POST (novo)
app/api/admin/categorias/[id]/route.ts                # PATCH, DELETE (novo)
app/api/admin/categorias/ordem/route.ts               # PUT (novo)
app/api/produtos/route.ts                             # POST: categoria padrão/validada (alterado)
app/api/produtos/[id]/route.ts                        # PATCH: troca de categoria, conflito de slug, redirecionamentos (alterado)

app/produtos/page.tsx                                 # filtros da tabela, exibe nome (alterado)
app/produtos/[categoria]/page.tsx                     # título = nome; alias → 308; inexistente → 404 (alterado)
app/produtos/[categoria]/[slug]/page.tsx              # nome da categoria; redirecionamento → 308 (alterado)
components/produtos/ProdutoCard.tsx                   # recebe nome da categoria (alterado)

app/admin/(painel)/layout.tsx                         # + link "Categorias" (alterado)
app/admin/(painel)/categorias/page.tsx                # lista, criar, renomear, reordenar, remover (novo)
app/admin/(painel)/produtos/page.tsx                  # coluna Categoria com TrocarCategoriaProduto (alterado)
app/admin/(painel)/produtos/novo/page.tsx, [id]/editar/page.tsx   # passam as categorias ao formulário (alterado)
components/admin/SelectBusca.tsx                      # combobox acessível com busca (novo)
components/admin/CategoriasLista.tsx                  # UI client da tela de categorias (novo)
components/admin/TrocarCategoriaProduto.tsx           # SelectBusca + PATCH + feedback (novo)
components/admin/ProdutoForm.tsx                      # input → SelectBusca (alterado)
```

## Phases
- **Phase 0**: [research.md](./research.md)
- **Phase 1**: [data-model.md](./data-model.md) · [contracts/categorias-api.md](./contracts/categorias-api.md) · [quickstart.md](./quickstart.md)

## Riscos
- **Previsor do ML**: produtos em "decoracao" sem categoria do ML escolhida passam a receber o qualificador "decoração" na consulta (research #6). Esse já era o comportamento pretendido pelo código.
- **Migração em produção**: rodar `--dry-run` antes. O script é idempotente.

## Post-design Constitution Check
✅ Mantido: sem dependência nova, erros expostos com status HTTP, rotas cobertas pela proteção existente, ML inalterado.
