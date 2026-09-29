# Quickstart / Test Guide — EDI-109

1. Rode os testes: `npm test`.
2. Acesse `/admin/produtos`, abra **editar** de um produto com foto.
3. Em **Canais de venda → Facebook/Instagram**, ligue **Publicar no Facebook/Instagram**, preencha (opcional) o título e a descrição chamativos e salve.
4. Volte para `/admin/produtos` e confira o selo **Facebook** nesse produto.
5. Abra `/api/feeds/meta` no navegador (ou `curl -i https://www.voxelasduo.com.br/api/feeds/meta`): deve vir `200`, `text/csv`, com o produto e os textos próprios (ou nome/descrição do site, se em branco), preço `NN.NN BRL`, link e fotos absolutos.
6. Desligue a opção, salve e confira que o produto sumiu do feed e o selo sumiu da listagem.
7. Após o deploy em produção, na Meta: Gerenciador de Comércio → catálogo **VoxelasDuo** → **Fontes de dados** → **Adicionar itens** → **Feed de dados** → **Feed programado** → URL `https://www.voxelasduo.com.br/api/feeds/meta`, frequência diária, moeda BRL.
8. Confira em **Catálogo → Produtos** que os itens entraram sem erros e, então, conclua a configuração da loja (Gerenciador de Comércio → Adicionar conta → página VoxelasDuo 1308054112394915 + @voxelasduo → catálogo 1247757684199959 → Concluir).
