# Quickstart: Buscador de produtos em alta (EDI-130)

Pré-requisito: conta do Mercado Livre conectada no admin (a mesma de Tendências/Pesquisa de nichos).

1. Admin → menu **Produtos em alta** (`/admin/tendencias`).
2. Com "Todas" + "Mais vendidos", conferir a grade das 16 categorias chegando aos poucos, cada card com foto, nome, posição e categoria.
3. Escolher **Banheiros** → descer em **Acessórios para Banhos** → **Suportes para Papel Higiênico** pelos chips de subcategoria; o ranking deve trazer suportes de papel em ordem 1º, 2º…
4. Trocar para **Mais procurados**: cards com termo, posição e foto.
5. Em um card, clicar nos três ícones: Mercado Livre (produto ou busca), Shopee (busca pelo nome) e MakerWorld (busca pelo nome), cada um em nova aba.
6. Buscar "papel higiênico" com "Todas" e depois dentro de Banheiros: os resultados mudam; buscar um termo sem sentido → mensagem de nenhum resultado.
7. Reabrir a mesma categoria: aparece "obtido às HH:MM"; **Atualizar** busca de novo.
8. Erros: com o token do ML inválido, a requisição em `/api/admin/produtos-alta/*` aparece na aba Network com 401 `token_invalido`.

Testes automatizados: `npx vitest run lib/produtosAlta app/api/admin/produtos-alta`.
