# Quickstart: Verba de desconto

Pré-requisito: app rodando (`npm run dev`) e logado no admin.

1. **Migração** — abrir `/admin/configuracoes`. Conferir piso 25% e desejada 40% e, abaixo, "Margens para revisar" com os produtos que tinham margem própria (ex.: Calendário do Advento: antes 80% / 115% sobre o custo, sugestão ~32% / ~40% do preço na Shopee).
2. **Cupom de loja** — na mesma página: cupom 3%, teto R$ 5,00, cesta mínima R$ 10,00 → Salvar → recarregar e conferir.
3. **Verba no produto** — abrir o Calendário do Advento (custo R$ 59,57, Shopee R$ 148,93). No card Shopee: margem ~32,6%, piso 25%, verba ~7,6%, cupom de loja R$ 4,47 (3,0%), sobra ~4,6% (~R$ 6,81).
4. **Simulador** — no mesmo card, digitar 4 → sem alerta, lucro ≥ 25%; digitar 10 → alerta "passa da verba".
5. **Teto** — alterar o preço Shopee para R$ 300,00: cupom de loja = R$ 5,00 (1,7%).
6. **Calculadora** — abrir a calculadora pelo produto, aba Shopee, "Quero ganhar 25%" → verba 0% e alerta "não cabe nem o cupom de loja"; mudar para 40% → verba 15%, cupom no teto R$ 5,00 (~2,9%), sobra ~12,1%.
7. **Lista** — `/admin/produtos`: o produto com sobra ≤ 0 na Shopee aparece com o selo "Sem verba p/ cupom".
8. **Marcar revisado** — em `/admin/configuracoes`, clicar "Marcar revisado" → item sai da lista (Network: `DELETE /api/admin/produtos/{id}/margens-revisar` → 204).
9. Testes: `npm test`.
