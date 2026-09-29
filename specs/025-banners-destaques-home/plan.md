# Implementation Plan: Banners e destaques da home gerenciados pelo painel

**Branch**: `edilsonaandrade/edi-114-banners-e-destaques-da-home-gerenciados-pelo-painel` | **Date**: 2026-09-29 | **Spec**: [spec.md](./spec.md) | **Linear**: EDI-114

## Summary
Nova coleção `secoesHome` (união discriminada por `tipo`: `bannerHero`, `bannerIntermediario`, `textoDestaque`, `carrossel`) com `ordem` e `ativa`. O carrossel guarda a lista **ordenada** de `produtoIds`: é a fonte da verdade da marcação, e a lista de produtos do admin apenas liga e desliga o produto nessa lista. `/` deixa de redirecionar sempre: renderiza as seções ativas e só redireciona para `/produtos` quando não há nenhuma. As mutações no admin chamam `revalidatePath("/")`. Admin novo em `/admin/banners`, com formulário, pré-visualização desktop/mobile e reordenação por setas.

## Technical Context
- **Stack**: TypeScript, Next.js 16.3 (App Router), React 19, CSS Modules, MongoDB (driver 6.12), Vercel Blob, NextAuth v5 (admin). **Sem dependência nova.**
- **Carrossel**: CSS `scroll-snap` + botões de seta (client component). Arraste nativo no mobile.
- **Imagens**: `<picture>` com `<source media="(max-width: 767px)">` para a versão mobile; upload via `lib/storage/blob.ts` com prefixo `banners/`.
- **Cache**: `/` pré-renderizada e revalidada sob demanda (`revalidatePath("/")` em toda mutação), mais `revalidate = 60` como rede de segurança (SC-003).
- **i18n**: apenas pt-BR, inline, no padrão atual (decisão do usuário).
- **Testes**: Vitest para validação e repositório/rotas (padrão `*.test.ts`); UI com Test Guide manual.
- **Auth**: `/api/admin/*` e `/admin/*` já estão protegidos por `proxy.ts`/`rotaProtegida.ts`. Nada a alterar.

## Constitution Check
`constitution.md` ainda é o template, sem princípios ratificados. Aplicamos as regras do CLAUDE.md:
- Erros de API retornam status HTTP real (400/404/500), visíveis na aba Network. Nada é engolido.
- Não commitar: apenas sugerir a mensagem de commit.
- Design: invocar as skills `frontend-design` e `site-architecture` antes de implementar a UI.
✅ Sem violações.

## Project Structure
```text
lib/models/secaoHome.ts                          # tipos + coleção (novo)
lib/home/validation.ts (+ .test.ts)              # validação pura dos payloads (novo)
lib/home/repository.ts (+ .test.ts)              # CRUD, ordem, marcação de produtos (novo)
lib/home/secoesPublicas.ts                       # monta seções ativas + produtos p/ a home (novo)
lib/storage/blob.ts                              # + enviarImagemBanner (alterado)
lib/produtos/repository.ts                       # removerProduto → $pull dos carrosséis (alterado)

app/api/admin/home/secoes/route.ts               # GET lista, POST cria (novo)
app/api/admin/home/secoes/[id]/route.ts          # GET, PUT, DELETE (novo)
app/api/admin/home/secoes/ordem/route.ts         # PUT reordena (novo)
app/api/admin/home/secoes/[id]/produtos/route.ts # PUT define lista/ordem de produtos (novo)
app/api/admin/home/secoes/[id]/produtos/[produtoId]/route.ts  # POST marca, DELETE desmarca (novo)
app/api/admin/home/upload/route.ts               # upload de imagem de banner (novo)

app/page.tsx                                     # renderiza seções ou redirect (alterado)
app/admin/(painel)/layout.tsx                    # + link "Banners" (alterado)
app/admin/(painel)/banners/page.tsx              # lista + reordenação (novo)
app/admin/(painel)/banners/nova/page.tsx         # criar (novo)
app/admin/(painel)/banners/[id]/editar/page.tsx  # editar (+ produtos do carrossel) (novo)
app/admin/(painel)/produtos/page.tsx             # coluna "Destaques" + filtro ?carrossel= (alterado)

components/home/  BannerSecao.tsx · TextoDestaqueSecao.tsx · CarrosselProdutos.tsx (client) · home.module.css   # novos
components/admin/ SecaoHomeForm.tsx · SecaoHomePreview.tsx · SecoesHomeLista.tsx · MarcarCarrosselProduto.tsx · ProdutosCarrosselOrdem.tsx   # novos
```

## Phases
- **Phase 0**: [research.md](./research.md)
- **Phase 1**: [data-model.md](./data-model.md) · [contracts/home-secoes-api.md](./contracts/home-secoes-api.md) · [quickstart.md](./quickstart.md)

## Post-design Constitution Check
✅ Mantido: sem dependência nova, erros expostos com status HTTP, rotas cobertas pela proteção existente.
