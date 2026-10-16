# Implementation Plan: Calculadora de preço no modelo do curso

**Branch**: `main` | **Date**: 2026-10-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/032-calculadora-modelo-curso/spec.md`

## Summary

Reorganizar a calculadora em seções recolhíveis e um resumo em abas por canal (modelo do curso), com: leitura de G-code no navegador, vários filamentos, desgaste, taxa de falha, custos extras por categoria, imposto, modo preço alvo, promoção, venda direta com pagamento/frete, Shopee CPF/CNPJ + campanha + cupom. As contas saem do componente para funções puras (`custoCalculadora`, `canaisCalculadora`, `resultadoCalculadora`, `calculadoraValores`) reaproveitando `calculadoraRapida.ts`. Ads, concorrente, kits, produção, salvar/duplicar/imprimir/virar produto são mantidos. Cálculos antigos são convertidos ao abrir.

## Technical Context

**Language/Version**: TypeScript 5, Node 24
**Primary Dependencies**: Next.js 16 (App Router), React 19, MongoDB driver 6.12 — nenhuma dependência nova (ZIP lido à mão + `DecompressionStream`)
**Storage**: MongoDB `calculosPreco` — `valores` ganha `versao: 2`, `impressao`, `precificacao`, `vendaDireta` e campos da Shopee
**Testing**: Vitest (funções puras)
**Target Platform**: Vercel, admin web (desktop e celular)
**Project Type**: web (Next.js monolito)
**Constraints**: G-code nunca sai do navegador; textos pt-BR inline (padrão do admin); erros com status real visíveis; sem subir servidor (Test Guide); sem commit
**Scale/Scope**: 1–2 usuários admin; dezenas de cálculos

## Constitution Check

`.specify/memory/constitution.md` é o template sem princípios — sem gates. Regras do `CLAUDE.md`: skill `frontend-design` antes da UI, erros visíveis na Network, sem commit (só sugerir mensagem), Test Guide no final.

## Project Structure

```text
specs/032-calculadora-modelo-curso/  plan.md spec.md research.md data-model.md quickstart.md contracts/gcode.md tasks.md

lib/models/calculoPreco.ts                    # tipos v2 (Impressao, Precificacao, VendaDireta, Filamento, Extra, Shopee)
lib/produtos/impressoras.ts                   # impressoras de referência (kWh/h)
lib/produtos/calculadoraValores.ts (+test)    # normalizarValores v1→v2, valores padrão v2
lib/produtos/custoCalculadora.ts (+test)      # custo por unidade e por categoria; conversão p/ CustoProducao do produto
lib/produtos/calculadoraRapida.ts (+test)     # + impostoPercentual nas funções de preço/venda
lib/produtos/canaisCalculadora.ts (+test)     # faixas, custo por pedido e detalhamento de taxas por canal
lib/produtos/resultadoCalculadora.ts (+test)  # tudo que o resumo mostra, por canal
lib/produtos/gcode.ts (+test)                 # parsers puros do G-code / slice_info
lib/produtos/lerGcode.ts                      # leitura do File no navegador (Blob.slice, ZIP, DecompressionStream)
lib/produtos/calculadoraPadrao.ts             # valoresPadrao() v2
lib/produtos/orcamento.ts (+test)             # usa normalizar + resultado
lib/produtos/calculosPreco.ts                 # validação aceita custo OU impressao
lib/nichos/calculo.ts                         # monta cálculo v2
components/admin/CalculadoraRapida.tsx        # orquestra estado e salvar/duplicar/produto
components/admin/calculadora/*.tsx            # Secao, SecaoModelo, SecaoImpressao, SecaoCustosExtras, SecaoPrecificacao,
                                              # SecaoCanalVenda, SecaoAds, SecaoConcorrente, SecaoProducao, Resumo (abas), ...
components/admin/calculadoraRapida.module.css # estilos novos (sanfona, cartões de opção, abas, barras)
```

**Structure Decision**: mesmo padrão atual (lógica pura em `lib/produtos`, página server, componente client), dividindo o componente gigante por seção.

## Complexity Tracking

Sem violações.
