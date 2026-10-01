# Implementation Plan: Lista de preços para evento e edição rápida de preços

**Branch**: `edilsonaandrade/edi-126-lista-de-precos-para-evento-pdf-e-edicao-rapida-de-precos` | **Date**: 2026-10-01 | **Spec**: [spec.md](./spec.md) | **Linear**: EDI-126

## Summary
A lista de produtos do admin (`/admin/produtos`) passa a ser um componente client (`ListaProdutosAdmin`) que recebe os produtos já preparados pelo servidor. Ela ganha:

- uma coluna de **seleção** (com "marcar todos") e uma barra fixa com **"Gerar lista de preços (N)"**, que abre `/admin/produtos/lista-precos?ids=a,b,c` em nova aba;
- campos de **preço do site** e **preço no Mercado Livre** por linha, com **Salvar** por linha (PATCH já existente em `/api/produtos/[id]`, que sincroniza o anúncio do ML);
- a coluna **Custo** (custo total por peça, `calcularCustoProducao().totalCentavos`, calculado no servidor).

A página `lista-precos` é server component: busca os produtos por id, ordena com `localeCompare("pt-BR", { sensitivity: "base" })` e mostra nome + preço do site. CSS de impressão esconde cabeçalho/rodapé do site e a barra do admin; o PDF vem do "Salvar como PDF" do navegador.

## Technical Context
- **Stack**: TypeScript, Next.js 16.3 (App Router), React 19, CSS Modules, MongoDB. **Sem dependência nova.**
- **API**: reaproveita `PATCH /api/produtos/[id]`. Nenhuma rota nova.
- **Cuidado**: o repositório faz `$set` do objeto `precosCanais` inteiro. O PATCH da linha envia `{ preco, precosCanais: { ...shopeeAtual, mercadoLivre? } }` para não apagar o preço da Shopee.
- **Parse de preço**: helper puro `lib/produtos/precoLista.ts` (texto → centavos, vírgula ou ponto, validação). Testado com Vitest.
- **Ordenação**: helper puro `ordenarPorNome` no mesmo módulo, testado.
- **Mobile**: no ≤768px a tabela vira cartões (uma linha = um cartão com nome, custo, dois campos e Salvar). Sem rolagem horizontal.
- **Impressão**: `@media print` em CSS Module próprio + classe global `nao-imprimir` (`display: contents` na tela) aplicada pelo `ChromeDoSite`; `.topoAdmin` escondido na impressão. Força fundo branco/texto preto (o admin pode estar no tema escuro).
- **i18n**: não há biblioteca. Textos em pt-BR inline, no padrão existente.
- **Design**: skill `frontend-design` invocada antes da implementação (regra do CLAUDE.md).

## Constitution Check
`constitution.md` ainda é o template. Aplicamos as regras do CLAUDE.md:
- Erros da API mostrados na linha com o status real; nada é escondido na aba Network.
- Não commitar: só sugerir a mensagem.
- Textos novos em pt-BR, no padrão existente.

✅ Sem violações.

## Project Structure
```text
lib/produtos/precoLista.ts (+ .test.ts)                # textoParaCentavos, centavosParaTexto, ordenarPorNome (novo)
components/admin/ListaProdutosAdmin.tsx                # tabela client: seleção, preços editáveis, custo (novo)
components/admin/LinhaPrecoProduto.tsx                 # campos + Salvar de uma linha (novo)
components/admin/listaProdutos.module.css              # tabela/cartões mobile, barra de seleção (novo)
app/admin/(painel)/produtos/page.tsx                   # prepara dados e usa ListaProdutosAdmin (alterado)
app/admin/(painel)/produtos/lista-precos/page.tsx      # lista de preços para impressão (novo)
app/admin/(painel)/produtos/lista-precos/listaPrecos.module.css  # tela + @media print (novo)
components/admin/ImprimirButton.tsx                    # window.print() (novo)
components/ChromeDoSite.tsx                            # envolve em .nao-imprimir (alterado)
app/globals.css                                        # .nao-imprimir (alterado)
components/admin/admin.module.css                      # .topoAdmin some na impressão (alterado)
```

## Phases
- **Phase 0**: [research.md](./research.md)
- **Phase 1**: [data-model.md](./data-model.md) · [contracts/lista-precos.md](./contracts/lista-precos.md) · [quickstart.md](./quickstart.md)

## Riscos
- **Widget de atendimento externo** (script de terceiros no layout) pode aparecer na impressão; mitigado escondendo seletores conhecidos no `@media print`, conferir no Test Guide.
- **URL longa** com muitos ids (~25 caracteres por id): 200 produtos ≈ 5 KB, dentro do limite prático.

## Post-design Constitution Check
✅ Mantido: sem dependência nova, sem rota nova, erros com status HTTP real.
