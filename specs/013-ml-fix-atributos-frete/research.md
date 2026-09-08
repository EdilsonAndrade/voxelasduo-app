# Phase 0 Research: Correções urgentes de atributos e frete nos anúncios do Mercado Livre

## 1. Correção do valor padrão de "Marca"

**Decisão**: Em `valorPadraoAtributo()` (`lib/estoque/canais/mercadoLivre/atributos.ts`), quando o atributo é de texto livre (não `list`) **e** seu `id` é `"BRAND"`, retornar um valor genérico fixo (`"Genérica"`) em vez de `produto.nome`. Para qualquer outro atributo de texto livre (incluindo `"MODEL"`), manter o comportamento atual (usa `produto.nome`).

**Rationale**: A causa raiz do bug observado ("Marca" e "Modelo" idênticos) é que ambos caem no mesmo `return` genérico da função, que sempre usa `produto.nome`. Diferenciar apenas `BRAND` resolve a duplicação com a menor mudança possível, e é semanticamente correto: "Marca" realmente não tem valor conhecido quando o produto é de fabricação própria, enquanto "Modelo" ainda faz algum sentido receber o nome do produto (mais informativo para o comprador do que um genérico).

**Alternatives considered**:
- Usar `"Genérica"` também para `MODEL` — rejeitado porque tornaria o atributo "Modelo" menos informativo do que já é hoje (nome do produto), sem necessidade, já que o bug é especificamente a duplicação, não o valor de Modelo em si.
- Tornar os atributos obrigatórios em algo que force preenchimento manual pelo vendedor — mais correto a longo prazo, mas adiciona fricção ao cadastro e não resolve os anúncios já publicados sem ação adicional; mantido fora de escopo desta correção urgente (o vendedor já pode informar uma marca real quando souber, ver FR-003, sem que isso seja obrigatório).

## 2. Envio de peso/dimensões da embalagem na publicação

**Decisão**: Adicionar um novo campo opcional `embalagemEnvio` ao modelo `Produto` (peso em gramas, altura/largura/comprimento em cm). Criar uma função `atributosEmbalagem(embalagem: EmbalagemEnvio): AtributoItem[]` em `atributos.ts` que retorna os atributos `SELLER_PACKAGE_WEIGHT`, `SELLER_PACKAGE_HEIGHT`, `SELLER_PACKAGE_LENGTH`, `SELLER_PACKAGE_WIDTH` no formato `{ id, value_name: "<numero> <unidade>" }` (ex: `{ id: "SELLER_PACKAGE_WEIGHT", value_name: "250 g" }`), com base no exemplo de item já publicado consultado na documentação do Mercado Livre (`GET /items/{id}`), que mostra esses atributos nesse formato. Em `criarAnuncio()`, concatenar esses atributos ao array `attributes` **independentemente** de a categoria marcá-los como obrigatórios (hoje só os obrigatórios são incluídos).

**Rationale**: A API de custos (`/sites/MLB/listing_prices`, usada na EDI-92/EDI-94) já deixa claro que o frete depende de dados de logística/peso — mas o problema aqui é mais direto: o **anúncio em si** nunca informa peso/dimensões ao Mercado Livre, então o cálculo de frete do comprador não tem como ser preciso. Enviar esses atributos, mesmo quando não obrigatórios pela categoria, é a correção mínima necessária.

**Alternatives considered**:
- Enviar como valor estruturado (`{ number, unit }`) em vez de `value_name` textual — a documentação de "Descrição de produtos"/exemplos de item mostra o campo de resposta com `value_name: "250 g"` e `values[0].struct: { number, unit }`, mas não há exemplo direto de o que enviar na criação. Optou-se por `value_name` com número+unidade por ser o formato já usado com sucesso pelo restante do código (`valorPadraoAtributo` usa `value_name` para texto livre) e mais simples de montar. **Precisa ser validado empiricamente publicando um item de teste** (mesmo padrão de descoberta usado em decisões anteriores deste projeto, documentado nos comentários do código) — se o Mercado Livre rejeitar o formato, ajustar para o formato estruturado.
- Tornar peso/dimensões obrigatórios no cadastro de produto — rejeitado por FR-007 (deve orientar mas não bloquear a publicação), para não travar publicações urgentes por falta desse dado ainda não preenchido em produtos já cadastrados.

**Correção pós-implementação (validado em produção)**: depois de aplicar a correção num anúncio real (`MLB5203603089`) e o vendedor confirmar que o frete cotado ao comprador **não mudou**, uma inspeção direta do item via API (`GET /items/{id}`) mostrou que os atributos `SELLER_PACKAGE_*` foram gravados corretamente, mas `shipping.dimensions` permaneceu `null`. A FAQ oficial "Itens — Atributos de envio e dimensões" (developers.mercadolivre.com.br) confirma duas coisas que a decisão original não previa:
1. Os atributos `SELLER_PACKAGE_WEIGHT/HEIGHT/WIDTH/LENGTH` são **informativos** (exibidos em "Características do produto") — não são o campo que o motor de frete do Mercado Livre usa para calcular o custo/prazo cotado ao comprador.
2. O campo que efetivamente alimenta o cálculo de frete é `shipping.dimensions` (string no formato `"AxBxC,peso"`, dimensões em cm e peso em gramas) — nunca enviado na decisão original.
3. Além disso, o valor dos atributos `SELLER_PACKAGE_*` deveria ser número puro sem unidade (`"65"`, não `"65 g"`) para evitar o erro `item.attribute.invalid.seller.package.dimensions` documentado pela mesma FAQ — o formato com unidade usado inicialmente funcionou nessa categoria específica, mas não é o formato correto/garantido.

**Correção aplicada**: `atributosEmbalagem()` passou a enviar valores numéricos puros; nova função `dimensoesEnvioParaFrete(embalagem): string` monta o `"AxBxC,peso"`; `criarAnuncio()` passou a incluir `shipping: { dimensions }` no corpo da requisição (via novo helper `corpoEnvio()`), além dos atributos. A ordem dos eixos (comprimento x largura x altura) segue a convenção mais comum entre integradores — a FAQ não especifica a ordem exata; **ainda precisa ser validada empiricamente** publicando um item novo e conferindo se o frete cotado corresponde ao esperado.

**Segunda correção pós-implementação (descoberta ao testar em produção)**: ao tentar aplicar `shipping.dimensions` também em `atualizarAtributosAnuncio()` (para corrigir o anúncio `MLB5203603089` já publicado), a API do Mercado Livre rejeitou a requisição inteira com `HTTP 400` / `field_not_updatable`: `"shipping.dimensions is not modifiable"`. Isso confirma o que a FAQ já insinuava ("Ao atualizar um item com ME2 aparecem warnings e as dimensões não mudam... certas dimensões são gerenciadas pela operação logística"): **`shipping.dimensions` só pode ser definido na criação do item — não pode ser alterado depois que o anúncio está ativo**, mesmo em logística `drop_off` (não só `fulfillment`, como a FAQ sugeria).

**Terceira rodada (medição direta em produção — conclusão final)**: o anúncio foi despublicado e republicado (`MLB5203603089` → `MLB5205046421`) para que `criarAnuncio()` pudesse enviar `shipping.dimensions` desde a criação. Inspecionando o item novo:

- `shipping.dimensions` continuou `null` — **o Mercado Livre ignora esse campo silenciosamente também na criação**, nesta conta/modelo (User Products + ME2 `drop_off`). Não gera erro, simplesmente não persiste.
- Os atributos `SELLER_PACKAGE_*` **sumiram por completo** do item novo, enquanto o item antigo os tinha. A diferença entre os dois: o antigo foi gravado com o formato original `"65 g"` / `"16 cm"`, e o novo com o formato "número puro" (`"35"`) adotado na rodada anterior seguindo a FAQ. Conclusão: esses atributos são do tipo `number_unit` e **exigem a unidade junto do valor** — sem ela, o Mercado Livre descarta o atributo sem qualquer erro. A recomendação da FAQ não vale para este caso.

**Medição do impacto real do frete** (`GET /users/{seller_id}/shipping_options?zip_code=...&item_price=...&dimensions=...`), mesma origem/destino do teste do vendedor:

| Dimensões simuladas | Frete ao comprador |
|---|---|
| 35 g, 15x10x10 (real do produto) | R$ 14,00 |
| 2 kg, 30x30x30 (pacote grande) | R$ 21,70 |

Ou seja: **as dimensões afetam o frete, mas o piso do Mercado Envios nessa rota é ~R$ 14** — os R$ 14,99 cobrados hoje já estão praticamente no mínimo. Corrigir os atributos de embalagem economiza cerca de R$ 1, não resolve a percepção de "frete caro" para um produto de R$ 27. Isso é característica da tabela do Mercado Envios (agravada por vendedor novo, sem descontos de reputação), não um defeito da integração.

**Decisões finais**:
1. `atributosEmbalagem()` volta a enviar o valor **com unidade** (`"35 g"`, `"10 cm"`) — único formato que o Mercado Livre efetivamente persiste.
2. `shipping.dimensions` **não é mais enviado** em lugar nenhum (nem em `criarAnuncio`, nem em `atualizarAtributosAnuncio`): é ignorado na criação e rejeitado na atualização (`field_not_updatable`). A função `dimensoesEnvioParaFrete` e o helper `corpoEnvio` foram removidos.
3. `atualizarAtributosAnuncio()` continua corrigindo Marca/Modelo e os atributos de embalagem num item já ativo — isso a API aceita normalmente.
4. Reduzir o frete percebido pelo comprador **não é um problema de integração** — depende de decisões comerciais/logísticas (Mercado Envios Flex, oferecer frete grátis, montar kits com preço ≥ R$ 79 onde o frete grátis é obrigatório e parcialmente subsidiado, ou Full). Registrado para tratamento em ticket próprio.

## 3. Corrigir anúncios já publicados sem despublicar/republicar

**Decisão**: Criar `atualizarAtributosAnuncio(itemId: string, produto: Produto): Promise<void>` em `lib/estoque/canais/mercadoLivre/anuncios.ts`, que resolve a categoria do item (reaproveitando `resolverCategoriaMercadoLivre`/categoria já conhecida), busca os atributos obrigatórios (`buscarAtributosObrigatorios`), monta os valores corrigidos (`valorPadraoAtributo` já corrigido) + `atributosEmbalagem()` (se `produto.embalagemEnvio` existir), e envia via `PUT /items/{itemId}` com `{ attributes: [...] }`.

**Rationale**: O restante do código já demonstra que `PUT /items/{id}` aceita atualizações parciais (`atualizarAnuncio()` em `client.ts` já faz `PUT` só com `available_quantity`/`price`; `despublicarAnuncio()` só com `status`) — o mesmo padrão deve funcionar para `attributes`, sem precisar fechar e recriar o anúncio (FR-004/FR-009).

**Alternatives considered**: Usar `PATCH` — a API do Mercado Livre para o recurso `/items/{id}` documentada neste projeto usa `PUT` para todas as atualizações parciais já implementadas; manter consistência.

## 4. Aplicar a correção nos anúncios já publicados (ação em lote)

**Decisão**: Dois caminhos complementares:
1. **Script único de manutenção** (`scripts/corrigir-atributos-mercado-livre.ts`, rodado via `tsx`, mesmo padrão de `scripts/seed.ts`): itera sobre `listarProdutosComIntegracaoExterna()` (já existe, usado pela importação de avaliações da EDI-85), filtra os que têm `integracoes.mercadoLivreId`, e chama `atualizarAtributosAnuncio()` para cada um — resolve a correção retroativa em massa numa única execução manual.
2. **Ação no admin** (botão "Corrigir atributos no Mercado Livre" em `ProdutoForm.tsx`, nova rota `POST /api/produtos/[id]/mercado-livre/corrigir-atributos`): permite corrigir um produto específico pontualmente, sem depender de rodar o script (útil ao editar um produto e notar o problema, ou depois de preencher os dados de embalagem).

**Rationale**: O script resolve a urgência imediata (corrigir todos os anúncios já publicados, incluindo o citado pelo usuário) numa execução só; a ação no admin cobre o caso contínuo (produtos editados depois, ou corrigidos individualmente). Nenhum dos dois exige infraestrutura nova (fila, cron) — volume atual de produtos publicados é pequeno o suficiente para processamento sequencial simples.

**Alternatives considered**: Sincronizar atributos automaticamente a cada `PATCH /api/produtos/[id]` (como já acontece com preço/estoque/descrição em `sincronizarAnuncioProduto`) — descartado como *único* mecanismo porque não resolve os anúncios já publicados que não serão editados tão cedo; mas nada impede adicionar isso como reforço futuro (fora do escopo desta correção urgente, que prioriza a ação em lote + botão manual).
