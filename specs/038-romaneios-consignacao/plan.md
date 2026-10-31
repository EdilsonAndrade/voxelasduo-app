# Implementation Plan: Romaneios de consignação

**Branch**: `038-romaneios-consignacao` (sem issue no Linear) | **Date**: 2026-10-31 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/038-romaneios-consignacao/spec.md`

## Summary

Novo menu admin **Romaneios**: uma saída com vários lugares; cada lugar tem itens (cópia de nome e preço vindos de Produto, plano avulso do Tempo de Impressão ou digitados), acerto de consignação (vendida/devolvida), pagamentos, "Pago na hora" e status próprio. Repasse de peças entre lugares, modos "Por lugar" / "Tudo junto" e página de impressão (inteiro ou um lugar) para salvar em PDF pelo navegador.

## Technical Context

**Language/Version**: TypeScript 5, Node 24
**Primary Dependencies**: Next.js 16 (App Router), React 19, MongoDB driver — nenhuma dependência nova
**Storage**: MongoDB, coleção nova `romaneios` (lugares, itens e pagamentos embutidos)
**Testing**: Vitest — funções puras (cálculo, repasse, pago na hora, agrupamento, opções de busca, validação) e rotas com repositório mockado
**Target Platform**: Vercel, admin web
**Project Type**: web (Next.js monolito)
**Performance Goals**: totais recalculados no cliente a cada mudança (< 1 s)
**Constraints**: erros com status real na aba Network; sem subir servidor; sem commit
**Scale/Scope**: 1 admin; dezenas de romaneios, até 20 lugares e 100 itens por lugar

## Constitution Check

`.specify/memory/constitution.md` ainda é o template, sem gates formais. Regras do `CLAUDE.md`: erros visíveis na Network, textos pt-BR inline (padrão atual do admin, sem lib de i18n), invocar `frontend-design` na implementação, sem subir servidor, sem commit. ✅ Reavaliado após o design: sem violações.

## Project Structure

### Documentation (this feature)

```text
specs/038-romaneios-consignacao/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/api.md
└── tasks.md
```

### Source Code (repository root)

```text
lib/models/romaneio.ts                          # coleção, tipos Romaneio / Lugar / ItemRomaneio / Pagamento, limites
lib/romaneios/calculo.ts (+ .test.ts)           # resumos, status, repasse, pago na hora, adicionar/mesclar, tudo junto
lib/romaneios/opcoes.ts (+ .test.ts)            # opções da busca (produtos + planos avulsos, preço sugerido)
lib/romaneios/validation.ts (+ .test.ts)        # validarRomaneio (corpo do POST/PUT)
lib/romaneios/repository.ts                     # CRUD + listagem com resumo
app/api/admin/romaneios/route.ts (+ test)       # GET, POST
app/api/admin/romaneios/[id]/route.ts           # GET, PUT, DELETE
app/admin/(painel)/layout.tsx                   # link "Romaneios"
app/admin/(painel)/romaneios/page.tsx           # lista
app/admin/(painel)/romaneios/[id]/page.tsx      # editor ("novo" = romaneio novo)
app/admin/(painel)/romaneios/[id]/imprimir/page.tsx # impressão (?lugar=)
components/admin/romaneios/ListaRomaneios.tsx
components/admin/romaneios/EditorRomaneio.tsx
components/admin/romaneios/BuscaItem.tsx
components/admin/romaneios/FichaRomaneio.tsx
components/admin/romaneios/romaneios.module.css
```

**Structure Decision**: mesmo padrão das specs anteriores — lógica pura em `lib/`, rotas finas em `app/api/`, componentes client em `components/admin/`.

## Complexity Tracking

Sem violações.
