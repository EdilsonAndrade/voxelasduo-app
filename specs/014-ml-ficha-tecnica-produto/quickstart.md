# Quickstart: Ficha técnica opcional do produto

## Cadastrar/editar um produto com ficha técnica

1. Acesse o admin → Produtos → editar um produto existente (ou criar um novo).
2. Na seção "Ficha técnica" (nova, dentro de `ProdutoForm.tsx`), preencha os campos desejados — todos opcionais:
   - Altura, largura, comprimento (cm)
   - Peso do produto (g)
   - Material (texto livre, ex: "PLA")
   - Itens inclusos (um por linha)
3. Salve o produto sem preencher nenhum campo da ficha técnica — confirme que salva normalmente (FR-002).
4. Tente informar um valor inválido (ex: peso `0` ou `-5`) — confirme que o formulário mostra erro só nesse campo, sem impedir salvar os demais (FR-003).

## Publicar com ficha técnica

1. Preencha a ficha técnica de um produto numa categoria que aceite `MATERIAL`/`HEIGHT`/`WIDTH`/`LENGTH`/`WEIGHT` (ex: decoração/vasos) — inclua também "itens inclusos".
2. Publique o produto no Mercado Livre.
3. Consulte o item publicado (`npx tsx scripts/inspecionar-item-mercado-livre.ts <MLB_ID>`, estendido para também mostrar `MATERIAL`/`HEIGHT`/`WIDTH`/`LENGTH`/`WEIGHT`) e confirme que os valores preenchidos aparecem como atributos.
4. Confirme que "itens inclusos" aparece na descrição do anúncio, ao final, após um marcador "Ficha técnica:".

## Correção retroativa (anúncio já publicado sem ficha técnica)

1. Escolha um produto já publicado sem ficha técnica preenchida.
2. Preencha a ficha técnica no cadastro e salve.
3. Clique em "Corrigir atributos no Mercado Livre" (botão já existente, `ProdutoForm.tsx`).
4. Consulte o item publicado novamente e confirme que os atributos/descrição refletem a ficha técnica, sem que o anúncio tenha sido despublicado/republicado.
5. Clique em "Corrigir atributos no Mercado Livre" uma segunda vez, sem mudar nada — confirme que a descrição não duplica o bloco "Ficha técnica:".
