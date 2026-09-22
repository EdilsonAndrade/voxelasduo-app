# Quickstart / Test Guide: Descoberta de tendências via Mercado Livre

1. Acesse `/admin/tendencias`; confira que a lista de "tendências em alta" carrega sem precisar pesquisar nada.
2. Pesquise "chaveiro personalizado"; confira que aparece a categoria resolvida e um ranking de posições com nome (ou "nome não disponível" para alguns itens) — sem preço, com o aviso explicando a ausência de preço/link.
3. Pesquise o mesmo termo de novo; confira que a resposta vem marcada como cache ("obtido em ...") e não demora.
4. Clique em "Atualizar"; confira que uma nova consulta é feita (data/hora muda).
5. Pesquise um termo sem sentido nenhum (ex.: "asdkjaslkdjaslkd"); confira a mensagem de "categoria não encontrada", sem tela de erro genérica.
6. Abra a aba Network do navegador, force um erro (ex.: derrube a `MONGODB_URI` ou desative a credencial do Mercado Livre) e confirme que o status/erro real aparece na requisição, sem ser escondido.
7. Rode `npx vitest run lib/estoque/canais/mercadoLivre/tendencias.test.ts lib/tendencias/cache.test.ts app/api/admin/tendencias`.
