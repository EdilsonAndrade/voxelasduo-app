# Research: Banners e destaques da home

## 1. Onde guardar a marcação "produto ↔ carrossel"
- **Decision**: array ordenado `produtoIds` dentro da seção carrossel.
- **Rationale**: a ordem dos produtos no carrossel (FR-011) sai direto da ordem do array, e a leitura da home é uma consulta por seção. Para saber os carrosséis de um produto na lista do admin, basta uma consulta `{ tipo: "carrossel" }` já carregada na página.
- **Alternatives**: campo `carrosselIds` no produto. Descartado porque a ordem dentro do carrossel exigiria outro campo por par, e o modelo de produto já é grande.

## 2. Coleção única com união discriminada
- **Decision**: uma coleção `secoesHome`, com `tipo` discriminando os campos.
- **Rationale**: a ordenação global (FR-006) é um único campo `ordem` na mesma coleção, e a listagem do admin sai de uma query só.
- **Alternatives**: coleções por tipo. Descartado porque a ordem cruzada entre coleções fica frágil.

## 3. Atualização da home (SC-003 ≤ 1 min)
- **Decision**: página `/` estática, com `revalidatePath("/")` em toda mutação da API de seções e `export const revalidate = 60`.
- **Rationale**: a home é a página mais acessada. Estática com revalidação sob demanda deixa ela rápida (SC-004) e atualizada. O revalidate de 60s cobre mudanças indiretas, como estoque e preço de produto.
- **Alternatives**: `force-dynamic`, o padrão do admin. Descartado para a home pública por causa do custo e da latência.

## 4. Home vazia
- **Decision**: sem seções ativas com conteúdo renderizável → `redirect("/produtos")` (comportamento atual).

## 5. Carrossel sem biblioteca
- **Decision**: `overflow-x: auto` + `scroll-snap-type: x mandatory`, com setas que chamam `scrollBy` no client e ficam ocultas no mobile.
- **Rationale**: tem arraste nativo no touch, é acessível e não precisa de dependência nova.

## 6. Imagem mobile
- **Decision**: `<picture><source media="(max-width: 767px)" srcSet={mobile}/><img src={desktop}/></picture>`. Sem mobile, o `<img>` sozinho.
- **Rationale**: o navegador baixa só a imagem adequada. Sem `next/image`, porque o projeto já usa `<img>` com URLs do Blob.

## 7. Legibilidade do texto sobre a imagem (FR-014)
- **Decision**: gradiente escuro sutil do lado da posição do texto, com texto branco. A posição vem de `alinhamentoHorizontal` (esquerda, centro, direita) e `alinhamentoVertical` (topo, meio, base).

## 8. Validação de links
- **Decision**: aceitar caminho interno iniciado por `/` (sem `//`) ou URL `https://`. Rejeitar `javascript:`, `http:` e texto livre.

## 9. Limites de texto
- **Decision**: título 80, subtítulo 160, texto 300, texto do botão 30, limite do carrossel de 4 a 24 (padrão 12).

## 10. Exclusão de produto
- **Decision**: `removerProduto` faz `$pull` do id em todos os carrosséis. A home também filtra ids inexistentes na montagem (defesa em profundidade).
