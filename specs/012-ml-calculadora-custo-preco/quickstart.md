# Quickstart: Calculadora de custo e preço sugerido (Mercado Livre) — EDI-92

## Pré-requisitos

- Ambiente já configurado com `.env.local` (`MONGODB_URI`, credenciais do Mercado Livre) e a integração de publicação de anúncios (Tarefa 5/6) já funcionando.
- Um produto de teste cadastrado, com categoria mapeada (override em `categorias.ts` ou reconhecível pelo previsor `domain_discovery/search`).
- Token válido do Mercado Livre em `credenciaisCanais` (nenhuma autorização nova é necessária — reaproveita `obterAccessTokenValido()`).

## Verificação local (sem subir servidor — conforme regra do projeto)

1. `npm run lint`
2. `npx tsc --noEmit`
3. `npx vitest run` — testes unitários do cálculo de COGS (`lib/produtos/custoProducao.test.ts`) e da consulta de custo de venda do Mercado Livre com `fetch` mockado (`lib/estoque/canais/mercadoLivre/precos.test.ts`), além dos testes de validação atualizados (`lib/produtos/validation.test.ts`)
4. `npm run build` — garante que a nova rota (`POST /api/mercado-livre/simular-preco`) e os novos componentes compilam sem erro

## Fluxo de teste manual (a ser seguido pelo usuário, não pelo agente — conforme regra do projeto)

Ver seção "Como testar" no relatório final de implementação (Test Guide), incluindo: preencher os custos de produção de um produto novo e conferir o COGS calculado e seu detalhamento; digitar um preço de venda e conferir que a comissão exibida bate com uma consulta manual a `GET /sites/MLB/listing_prices` para a mesma categoria/preço; alterar o preço e confirmar que a comissão é atualizada automaticamente após parar de digitar; digitar um preço que resulte em prejuízo e conferir o alerta visual; digitar um preço com margem baixa (abaixo do limite configurado) e conferir o alerta correspondente; editar manualmente o valor de comissão exibido e conferir que a simulação passa a usar esse valor até o preço ser alterado de novo; testar com um produto de categoria não reconhecida pelo previsor e confirmar que aparece um aviso não bloqueante, sem impedir salvar o produto.
