# Implementation Plan: Montador de kits

**Branch**: `037-montador-kits` (sem issue no Linear) | **Date**: 2026-10-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/037-montador-kits/spec.md`

## Summary

Novo menu admin **Kits**: o lojista monta kits com produtos do catálogo (combobox com busca) e itens novos (nome, peso, tempo → custo, preço sugerido e margem pelo padrão da loja; viram produto rascunho ao salvar). Totalizador de preço avulso, custo, peso e tempo; ao lado, faixas de desconto sobre a soma avulsa com a margem de Site, Shopee e Mercado Livre (bloqueadas abaixo do piso). O kit mantém vínculo com os componentes e avisa quando o preço fica desatualizado. O kit vira produto (custo agregado exato) e vai para a calculadora existente.

## Technical Context

**Language/Version**: TypeScript 5, Node 24
**Primary Dependencies**: Next.js 16 (App Router), React 19, MongoDB driver — nenhuma dependência nova
**Storage**: MongoDB, coleção nova `kits`; campo novo `Produto.kitId`
**Testing**: Vitest — funções puras (componentes, totais, faixas, desatualização, custo agregado, validação) e rotas com módulos mockados
**Target Platform**: Vercel, admin web
**Project Type**: web (Next.js monolito)
**Performance Goals**: totalizador e faixas recalculados no cliente a cada mudança (< 1 s)
**Constraints**: erros com status real na aba Network; sem subir servidor; sem commit
**Scale/Scope**: 1 admin; dezenas de kits, até 30 itens por kit

## Constitution Check

`.specify/memory/constitution.md` ainda é o template, sem gates formais. Regras do `CLAUDE.md`: erros visíveis na Network, textos pt-BR inline (sem lib de i18n, research #8), invocar skills de design na implementação (research #9), sem subir servidor, sem commit. ✅ Reavaliado após o design: sem violações.

## Project Structure

### Documentation (this feature)

```text
specs/037-montador-kits/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/api.md
└── tasks.md
```

### Source Code (repository root)

```text
lib/models/kit.ts                               # coleção, tipos Kit / ItemKit / ReferenciaPreco
lib/models/produto.ts                           # + kitId
lib/kits/componentes.ts (+ .test.ts)            # valoresDoProduto → ValoresComponente, custoItemNovo, precoSugeridoItemNovo
lib/kits/precificacaoKit.ts (+ .test.ts)        # totais, taxas dos canais, sugestão por faixa, avaliar preço próprio
lib/kits/desatualizacao.ts (+ .test.ts)         # referência × atual
lib/kits/produtoDoKit.ts (+ .test.ts)           # custoProducaoDoKit, itensInclusos, dados do produto do kit
lib/kits/validation.ts (+ .test.ts)             # validarKit (corpo do POST/PUT)
lib/kits/repository.ts                          # CRUD + montar KitDetalhe com produtos atuais + criar rascunhos
app/api/admin/kits/route.ts (+ test)            # GET, POST
app/api/admin/kits/[id]/route.ts (+ test)       # GET, PUT, DELETE
app/api/admin/kits/[id]/produto/route.ts (+ test) # POST criar/atualizar produto do kit
app/admin/(painel)/layout.tsx                   # link "Kits"
app/admin/(painel)/kits/page.tsx                # lista
app/admin/(painel)/kits/[id]/page.tsx           # editor ("novo" = kit novo)
app/admin/(painel)/produtos/calculadora/page.tsx # ?kit=
app/admin/(painel)/produtos/[id]/editar/page.tsx # aviso "produto de kit" + desatualizado
lib/produtos/calculadoraDoProduto.ts            # valoresDoKit
components/admin/kits/ListaKits.tsx
components/admin/kits/EditorKit.tsx             # itens, item novo, totalizador, faixas, ações
components/admin/kits/kits.module.css
```

**Structure Decision**: mesmo padrão das specs anteriores — lógica pura em `lib/`, rotas finas em `app/api/`, componentes client em `components/admin/`.

## Complexity Tracking

Sem violações.
