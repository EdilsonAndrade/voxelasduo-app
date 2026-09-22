# Research: Preço por canal com piso de margem e promoções elegíveis do Mercado Livre

## 1. Onde fica a margem mínima persistida

- **Decision**: Estender `TaxasCanaisConfig` (global, EDI-106) com `margemMinimaPercentual: number` e `TaxasCanaisProduto` (override por produto) com `margemMinimaPercentual?: number`.
- **Rationale**: É exatamente o mesmo padrão de herança já usado pelas taxas dos canais (`lib/models/configuracao.ts`, `lib/models/produto.ts`) — sem coleção nova, sem mecanismo novo de resolução (reaproveita `resolverTaxasCanais`).
- **Alternatives**: campo separado numa coleção nova — rejeitado, duplica o padrão de herança já existente sem necessidade.

## 2. Onde fica o preço por canal

- **Decision**: `Produto.preco` continua sendo o preço do site (sem renomear, evita migração). Novo campo opcional `Produto.precosCanais?: { mercadoLivre?: number; shopee?: number }` (centavos) — ausente num canal = usa `Produto.preco` como esse canal também.
- **Rationale**: Backward-compatible por construção (FR-008): produtos existentes continuam com um preço só, sem qualquer migração de dado. Mesmo padrão de override já usado em `taxasCanais`/`TaxasCanaisProduto`.
- **Alternatives**: renomear `preco` para `precoSite` e exigir os três preços sempre preenchidos — rejeitado, quebraria compatibilidade e obrigaria migração.

## 3. Preço mínimo / desconto máximo — fórmula

- **Decision**: `precoMinimoCentavos = (custoCentavos + taxaFixaCentavos) / (1 − taxaPercentual/100 − margemMinimaPercentual/100)`, `null` quando o denominador for `<= 0`. `descontoMaximoCentavos = precoAtualCentavos − precoMinimoCentavos` (negativo = já abaixo do mínimo hoje, tratado como "0 de desconto possível" na exibição, não escondido). `descontoMaximoPercentual = descontoMaximoCentavos / precoAtualCentavos`.
- **Rationale**: Extensão direta da fórmula de preço sugerido já existente em `lib/produtos/canais.ts` (`calcularPrecoSugeridoCanal`), invertida para achar o piso em vez do sugerido — mesma convenção de centavos, mesmo tratamento de taxa inválida (`>= 100%` vira `null`, aqui generalizado para "denominador ≤ 0" porque agora soma taxa + margem mínima).
- **Alternatives**: usar só a margem mínima sem a comissão do canal — rejeitado, já é exatamente o erro que a spec quer evitar (piso diferente por canal, por causa da comissão).

## 4. API de promoções do Mercado Livre — o que foi confirmado

- **Decision**: Implementar em duas chamadas confirmadas como alcançáveis, evitando o caminho não confirmado (`/seller-promotions/candidates`):
  1. `GET /seller-promotions/promotions?app_version=v2&seller_id={seller_id}` — lista as campanhas do vendedor. **Confirmado**: responde 200 (não 403/404) com o token do app; corpo vazio quando a loja não tem produto publicado/nenhuma campanha ativa (esperado, sem produto publicado hoje).
  2. Para cada campanha retornada, `GET /seller-promotions/promotions/{promotion_id}/items?promotion_type={tipo}&app_version=v2` — lista os itens elegíveis/candidatos daquela campanha. **Confirmado como rota reconhecida**: testar com um id de promoção inexistente devolveu `"Promotion not found"` (404 específico da promoção), diferente do 404 genérico `"Resource ... not found"` que `/seller-promotions/candidates` devolveu em toda tentativa — ou seja, o path do item 2 existe; o de `/candidates` não foi localizado para este site/app (pode ser exclusivo de outros países ou exigir formato diferente, não confirmado).
  3. O produto entra na lista de "elegível" quando seu `item_id` aparece nos itens da campanha (passo 2); o desconto exigido de cada campanha entra na comparação com o preço mínimo (research.md #3).
- **Rationale**: Usar só os dois recursos com reachability confirmada elimina a dependência do endpoint não localizado, sem perder a funcionalidade — só muda de "uma chamada direta por item" para "listar campanhas + cruzar com os itens de cada uma".
- **Risco residual**: nenhum produto está publicado no Mercado Livre hoje (nenhum `mercadoLivreId` salvo), então o formato exato de resposta de `/promotions/{id}/items` (nome do campo de desconto, se é percentual ou preço fixo) não pôde ser inspecionado com dado real — **a implementação MUST tratar campos ausentes/formato inesperado sem quebrar** (FR-012 já cobre: falha na consulta não derruba o resto da tela) e a task de implementação MUST reconfirmar o formato assim que houver um produto publicado, ajustando o parser se necessário.
- **Alternatives consideradas**: `/seller-promotions/candidates?item_id=...` (retornou 404 "resource not found" em toda combinação testada — não usar); webhook de "Public Offers/Public Candidates" (EDI-102, ainda não implementado neste projeto — ver Assumptions) como fonte push em vez de pull — fica como alternativa futura se o pull não se confirmar suficiente durante a implementação.

## 5. Sincronização de preço por canal ao salvar

- **Decision**: Alterar `sincronizarAnuncioProduto` (`lib/estoque/sincronizacao.ts`) para usar `produto.precosCanais?.mercadoLivre ?? produto.preco` (e o equivalente para Shopee) em vez de `produto.preco` direto, ao chamar `client.atualizarAnuncio`.
- **Rationale**: Mesmo gatilho e mesmo ponto único de sincronização já existente (chamado em `PATCH /api/produtos/[id]` e em `abatimento.ts`) — muda só a origem do valor, sem novo fluxo (FR-007).
- **Alternatives**: rota de sincronização separada por canal — rejeitado, adiciona um passo manual que a spec explicitamente não quer (FR-007: "sem passo manual adicional").

## 6. i18n

- **Decision**: Sem biblioteca de i18n no projeto (confirmado nos specs 019/020); textos novos em pt-BR inline, seguindo o padrão do admin.
