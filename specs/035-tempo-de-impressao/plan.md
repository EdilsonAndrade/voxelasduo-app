# Implementation Plan: Tempo de Impressão

**Branch**: `main` (sem issue; pedido do usuário) | **Date**: 2026-10-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/035-tempo-de-impressao/spec.md`

## Summary

Novo menu admin **Tempo de Impressão**: o administrador escolhe um produto existente e cadastra partes (ou o produto inteiro) com tempo de impressão e horário de início salvo; a tela mostra o término (com virada de dia) e o total do produto. A apuração da Produção ganha o botão "Levar ao Tempo de Impressão", que mescla as impressões marcadas pelo nome da parte. Uma página de impressão gera a ficha em lista (salvar como PDF pelo navegador).

## Technical Context

**Language/Version**: TypeScript 5, Node 24
**Primary Dependencies**: Next.js 16 (App Router), React 19, MongoDB driver — nenhuma dependência nova
**Storage**: MongoDB, coleção nova `planosImpressao` (ver data-model)
**Testing**: Vitest — funções puras (`terminoPrevisto`, validação, mescla, itens da apuração) e rotas com módulos mockados
**Target Platform**: Vercel, admin web
**Project Type**: web (Next.js monolito)
**Performance Goals**: término recalculado a cada tecla (cálculo local)
**Constraints**: erros com status real na aba Network; sem subir servidor; sem commit
**Scale/Scope**: 1 admin; dezenas de produtos, até ~50 partes por produto

## Constitution Check

`.specify/memory/constitution.md` ainda é o template, sem gates formais. Regras do `CLAUDE.md`: erros visíveis na Network, textos pt-BR inline (sem lib de i18n, research #7), invocar skills de design na implementação (research #8), sem subir servidor, sem commit, trabalho na main. ✅ Reavaliado após o design: sem violações.

## Project Structure

### Documentation (this feature)

```text
specs/035-tempo-de-impressao/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/api.md
└── tasks.md
```

### Source Code (repository root)

```text
lib/models/planoImpressao.ts                    # coleção, tipos PlanoImpressao / ItemImpressao
lib/producao/agenda.ts (+ .test.ts)             # terminoPrevisto(inicio, minutos)
lib/producao/planosImpressao.ts (+ .test.ts)    # validarItens, mesclarItens, itensDaApuracao (puras)
lib/producao/planosImpressaoRepository.ts       # listar (com nome do produto), criar, mesclar, substituir, excluir, excluirDoProduto
lib/produtos/repository.ts                      # removerProduto apaga o plano do produto
app/api/admin/tempo-impressao/route.ts (+ test)             # GET, POST
app/api/admin/tempo-impressao/[produtoId]/route.ts (+ test) # PUT, DELETE
app/admin/(painel)/layout.tsx                   # link "Tempo de Impressão"
app/admin/(painel)/tempo-impressao/page.tsx     # carrega planos + opções de produtos
app/admin/(painel)/tempo-impressao/imprimir/page.tsx  # ficha em lista
components/admin/tempoImpressao/PlanejamentoImpressao.tsx  # seleção de produto + lista de cards
components/admin/tempoImpressao/PlanoProdutoCard.tsx       # linhas editáveis, início/término, remover
components/admin/tempoImpressao/FichaTempoImpressao.tsx    # ficha imprimível
components/admin/tempoImpressao/tempoImpressao.module.css
components/admin/producao/ApuracaoProdutos.tsx  # botão "Levar ao Tempo de Impressão"
```

**Structure Decision**: mesmo padrão das specs anteriores — lógica pura em `lib/`, rotas finas em `app/api/`, componentes client em `components/admin/`.

## Complexity Tracking

Sem violações.
