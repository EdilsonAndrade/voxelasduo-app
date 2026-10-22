# Implementation Plan: Verba de desconto (cupons e promoções)

**Branch**: `034-verba-de-desconto-cupons` | **Date**: 2026-10-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/034-verba-de-desconto-cupons/spec.md`

## Summary

Margens do produto e do padrão global passam a ser **% do preço** (como a calculadora), com migração automática que redefine o padrão (piso 25% / desejada 40%) e move os overrides antigos para uma lista "Margens para revisar". Um **cupom de loja** global (%, teto, cesta mínima) entra na configuração de taxas. Uma função pura calcula a **verba de desconto** (margem − piso − cupom de loja = sobra) e simula descontos com o lucro real; ela aparece nos cards por canal do produto, no resumo da calculadora e como selo na lista de produtos.

## Technical Context

**Language/Version**: TypeScript 5, Node 24
**Primary Dependencies**: Next.js 16 (App Router), React 19, MongoDB driver — nenhuma dependência nova
**Storage**: MongoDB `configuracoes` (`taxasCanais`) e `produtos` (campos novos, ver data-model)
**Testing**: Vitest — funções puras (`verbaDesconto`, `canais`, validações, migração com coleção mockada) e rotas com módulos mockados
**Target Platform**: Vercel, admin web
**Project Type**: web (Next.js monolito)
**Performance Goals**: verba recalculada a cada tecla sem atraso perceptível (cálculo local)
**Constraints**: migração idempotente e segura com requisições concorrentes; erros com status real na aba Network
**Scale/Scope**: 1 admin; dezenas de produtos

## Constitution Check

`.specify/memory/constitution.md` ainda é o template, sem gates formais. Regras do `CLAUDE.md`: erros visíveis na Network (rotas devolvem status reais), textos pt-BR inline (sem lib de i18n, research #7), skills de design não disponíveis na sessão → avisar o usuário (research #8), sem subir servidor, sem commit. ✅ Reavaliado após o design: sem violações.

## Project Structure

### Documentation (this feature)

```text
specs/034-verba-de-desconto-cupons/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/api.md
└── tasks.md
```

### Source Code (repository root)

```text
lib/models/configuracao.ts              # campos de cupom de loja, novos padrões (25/40), reguaMargem
lib/models/produto.ts                   # margensParaRevisar; docs das margens em % do preço
lib/configuracoes/repository.ts         # lê/salva cupom; dispara a migração
lib/configuracoes/migracaoMargens.ts (+ .test.ts)   # migração idempotente (research #2) + sugestão em % do preço
lib/configuracoes/validation.ts (+ .test.ts)        # margens 0 ≤ x < 100, cupom
lib/produtos/canais.ts (+ .test.ts)     # preço sugerido/mínimo por margem do preço; margem = lucro ÷ preço; markupPercentual
lib/produtos/precificacao.ts            # preço sugerido e simulação em % do preço
lib/produtos/taxasCanaisFormulario.ts (+ .test.ts)  # margens < 100
lib/produtos/validation.ts (+ .test.ts) # margens < 100
lib/produtos/verbaDesconto.ts (+ .test.ts)          # calcularVerbaDesconto, simularDesconto, cupomLojaReal
lib/produtos/repository.ts              # listar margens para revisar; remover margensParaRevisar
app/api/admin/produtos/[id]/margens-revisar/route.ts (+ test)   # DELETE
app/api/produtos/[id]/mercado-livre/promocoes/route.ts          # sem mudança de código (semântica via canais.ts)
app/admin/(painel)/configuracoes/page.tsx  # passa a lista de margens para revisar
app/admin/(painel)/produtos/page.tsx       # calcula verbaShopee por linha
components/admin/TaxasCanaisForm.tsx    # rótulos "% do preço", campos do cupom de loja
components/admin/MargensParaRevisar.tsx # lista + "Marcar revisado"
components/admin/VerbaDesconto.tsx      # bloco verba + simulador (produto e calculadora)
components/admin/SimuladorPrecificacao.tsx  # textos "% do preço" + markup; bloco Promoções usa VerbaDesconto
components/admin/ProdutoForm.tsx        # rótulos, aviso de margens antigas, passa cupom de loja
components/admin/calculadora/Resumo.tsx # VerbaDesconto no canal da aba
components/admin/CalculadoraRapida.tsx  # passa piso/cupom globais; "Criar produto" grava margem do preço
components/admin/ListaProdutosAdmin.tsx # selo "Sem verba p/ cupom"
```

**Structure Decision**: mesmo padrão das specs anteriores — lógica pura em `lib/`, rotas finas em `app/api/`, componentes client em `components/admin/`.

## Complexity Tracking

Sem violações.
