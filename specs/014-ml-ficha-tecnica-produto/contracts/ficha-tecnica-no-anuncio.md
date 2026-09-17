# Contract: Ficha técnica refletida no anúncio (publicação e correção retroativa)

Esta feature **não cria nenhuma rota HTTP nova** — estende o comportamento interno de duas rotas/fluxos já existentes, reaproveitando exatamente o mesmo padrão usado por EDI-95/EDI-96 (Marca/Modelo e embalagem de envio):

## 1. Publicação de um novo anúncio

`POST /api/produtos/[id]/mercado-livre/publicar` (já existente) → chama `criarAnuncio(produto)` (`lib/estoque/canais/mercadoLivre/anuncios.ts`).

**Mudança**: `criarAnuncio()` passa a:
1. Calcular `atributosFichaTecnica(produto.fichaTecnica, atributosCategoria)` junto com os demais atributos (obrigatórios + embalagem de envio).
2. Concatenar `resultado.attributes` ao array `attributes` do corpo de `POST /items` (igual já feito com `atributosEmbalagem`).
3. Se `resultado.paraDescricao` não estiver vazio, montar a descrição final como `produto.descricao` + bloco de ficha técnica (`aplicarFichaTecnicaNaDescricao("", resultado.paraDescricao)` a partir de uma base vazia, já que o item é novo) antes do `POST /items/{id}/description`.

Nenhuma mudança de contrato HTTP — request/response da rota `publicar` continuam os mesmos.

## 2. Correção retroativa de anúncio já publicado

`POST /api/produtos/[id]/mercado-livre/corrigir-atributos` (já existente, `contracts/corrigir-atributos.md` da EDI-95/EDI-96) → chama `atualizarAtributosAnuncio(itemId, produto)`.

**Mudança**: `atualizarAtributosAnuncio()` passa a:
1. Incluir `resultado.attributes` (ficha técnica) no mesmo `PUT /items/{id}` de atributos já existente.
2. Quando `resultado.paraDescricao` não estiver vazio: `GET /items/{id}/description` → `aplicarFichaTecnicaNaDescricao(descricaoAtual.plain_text, resultado.paraDescricao)` → `PUT /items/{id}/description` com o texto resultante.

Nenhuma mudança de contrato HTTP — request/response da rota `corrigir-atributos` continuam os mesmos (`{ ok: true }` em sucesso, mesmos códigos de erro 404/409/422). O botão "Corrigir atributos no Mercado Livre" já existente em `ProdutoForm.tsx` passa a corrigir também a ficha técnica sem precisar de nenhum botão novo.

## 3. Script de correção em lote

`scripts/corrigir-atributos-mercado-livre.ts` (já existente, EDI-95/EDI-96) chama a mesma `atualizarAtributosAnuncio()` — passa a corrigir a ficha técnica de todos os anúncios já publicados automaticamente, sem nenhuma mudança no script em si.

## Falhas parciais (atributos OK, descrição falha, ou vice-versa)

Como `PUT /items/{id}` (atributos) e `PUT /items/{id}/description` são duas chamadas HTTP separadas: se a atualização de atributos suceder mas a de descrição falhar (ou vice-versa), `atualizarAtributosAnuncio()` deve propagar o erro da descrição normalmente (mesmo padrão de erro já usado — `erroMercadoLivre`), mas os atributos que já foram salvos com sucesso **permanecem salvos** (o Mercado Livre não tem transação entre as duas chamadas). O vendedor pode tentar "Corrigir atributos no Mercado Livre" novamente — a segunda tentativa é idempotente (FR-007) e reenvia os mesmos atributos sem duplicar nada.
