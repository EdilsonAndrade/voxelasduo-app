# Implementation Plan: Duplicar cálculo e imprimir orçamentos

**Branch**: `031-calculadora-duplicar-imprimir` | **Date**: 2026-10-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/031-calculadora-duplicar-imprimir/spec.md`

## Summary

Na calculadora de preço: (1) campo opcional "Altura da peça" (cm) guardado nos valores do cálculo; (2) "Duplicar com outro nome" que faz `POST /api/admin/calculos-preco` (rota existente) com os valores da tela e abre a cópia; (3) seleção na lista "Cálculos salvos" e página `/admin/produtos/calculadora/imprimir?ids=` com tabela A4 deitada (Avulso + Kit por produto), canal e kit escolhidos na página. As contas da impressão saem de uma função pura nova (`lib/produtos/orcamento.ts`) que reaproveita `calculadoraRapida.ts` e a mesma escolha de faixas do canal usada pela calculadora.

## Technical Context

**Language/Version**: TypeScript 5, Node 24
**Primary Dependencies**: Next.js 16 (App Router), React 19, MongoDB driver 6.12 — nenhuma dependência nova
**Storage**: MongoDB `calculosPreco` (existente) — só ganha `valores.alturaCm` opcional
**Testing**: Vitest (funções puras)
**Target Platform**: Vercel, admin web; impressão pelo navegador (`window.print`, `@page A4 landscape`)
**Project Type**: web (Next.js monolito)
**Constraints**: textos pt-BR inline; erros com status real; sem subir servidor (Test Guide)
**Scale/Scope**: 1 usuário admin; dezenas de cálculos

## Constitution Check

`.specify/memory/constitution.md` é o template sem princípios — sem gates. Regras do `CLAUDE.md` aplicadas: skill `frontend-design` antes da UI, erros visíveis, sem commit.

## Project Structure

```text
specs/031-calculadora-duplicar-imprimir/  plan.md research.md data-model.md quickstart.md contracts/impressao.md tasks.md

lib/models/calculoPreco.ts                 # + alturaCm?: string em CalculadoraValores
lib/produtos/orcamento.ts (+ .test.ts)     # faixasDoCanal, montarLinhasOrcamento, idsDaQuery
lib/produtos/calculosPreco.ts              # + buscarCalculosPreco(ids)
components/admin/CalculadoraRapida.tsx     # campo altura, duplicar, usa faixasDoCanal da lib
components/admin/CalculosSalvos.tsx        # altura na lista, seleção, "Imprimir selecionados"
components/admin/OrcamentoImpressao.tsx    # client: canal/kit, tabela, botão imprimir
components/admin/orcamentoImpressao.module.css
components/admin/calculadoraRapida.module.css  # estilos de duplicar e seleção
app/admin/(painel)/produtos/calculadora/imprimir/page.tsx
app/admin/(painel)/produtos/calculadora/page.tsx  # passa alturaCm para a lista
```

**Structure Decision**: mesmo padrão da calculadora (lógica pura em `lib/produtos`, página server buscando no repositório, componente client).

## Complexity Tracking

Sem violações.
