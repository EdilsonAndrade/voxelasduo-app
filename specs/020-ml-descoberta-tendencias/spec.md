# Feature Specification: Descoberta de tendências via Mercado Livre

**Feature Branch**: `edilsonaandrade/edi-107-descoberta-de-tendencias-via-mercado-livre-o-que-ja-vende`  
**Created**: 2026-09-21  
**Status**: Draft (escopo ajustado após investigação da API — ver Assumptions)  
**Input**: Linear EDI-107 — "Descoberta de tendências via Mercado Livre (o que já vende antes de imprimir)"

## ⚠️ Ajuste de escopo (validado em 2026-09-21)

A proposta original previa preço praticado e quantidade vendida por resultado de busca. Testado ao vivo com o token OAuth do app (`lib/estoque/canais/mercadoLivre/auth.ts`) contra a API real do Mercado Livre:

- `GET /sites/MLB/search` retorna **403 forbidden com token, em toda combinação testada** (`q=`, `seller_id=`, `category=` sozinho) — não é falta de escopo, é bloqueio deliberado do Mercado Livre a apps comuns (antiscraping).
- A página pública de busca (`lista.mercadolivre.com.br`) redireciona para verificação antibot em requisição simples — sem CAPTCHA não é lida, e contorná-la está fora do que este projeto faz.
- `GET /highlights/MLB/category/{id}` (mais vendido por categoria) e `GET /trends/MLB` (tendências gerais do site) funcionam com o token do app, mas **sem preço**.
- `GET /products/{id}` (produto de catálogo) funciona e devolve o nome, mas `buy_box_winner` (que traria o preço/anúncio vencedor) vem sempre `null` para os domínios testados.
- `/highlights` pode devolver também itens do tipo `ITEM` (anúncio real, não só `PRODUCT` de catálogo). Mesmo com um `ITEM_ID` real de terceiro obtido diretamente do `/highlights` (não por busca nem scraping), `GET /items/{id}`, `/items/{id}/sale_price` e `/items/{id}/prices` devolvem **403 access_denied** — o app não tem permissão de ler dados de anúncio de terceiro, ponto final.

**Decisão**: entregar o que a API permite — ranking de mais vendido por categoria (posição, sem R$) e lista geral de tendências — documentado como limitação da API, não do produto. Preço e link de anúncio ficam fora desta versão.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver o ranking de mais vendido de um nicho (Priority: P1)

No painel administrativo, o vendedor digita uma palavra-chave (ex.: "chaveiro personalizado") e o sistema resolve a categoria correspondente no Mercado Livre e mostra o ranking de produtos mais vendidos dessa categoria (posição + nome do produto), para apoiar a decisão do que modelar e imprimir.

**Why this priority**: É o núcleo do ticket que a API do Mercado Livre efetivamente permite: um sinal real de popularidade por nicho, sem inventar dado que a API não fornece.

**Independent Test**: Pesquisar um termo no admin e conferir que a lista traz, em ordem, a posição e o nome dos produtos mais vendidos da categoria resolvida para o termo.

**Acceptance Scenarios**:

1. **Given** o vendedor autenticado no admin, **When** digita "chaveiro personalizado" e pesquisa, **Then** vê a categoria do Mercado Livre encontrada para o termo e a lista de produtos mais vendidos dessa categoria, com posição (1º, 2º, ...) e nome.
2. **Given** um termo para o qual o Mercado Livre não consegue sugerir nenhuma categoria, **When** o vendedor pesquisa, **Then** vê uma mensagem explicando que não foi possível identificar uma categoria para o termo, e não um erro genérico.
3. **Given** uma categoria resolvida sem produtos em destaque disponíveis, **When** o vendedor pesquisa, **Then** vê uma mensagem de "nenhum destaque disponível para esta categoria" e não um erro.
4. **Given** o campo vazio ou só com espaços, **When** o vendedor tenta pesquisar, **Then** a busca não é feita e um aviso de preenchimento é exibido.
5. **Given** um resultado do ranking, **When** o vendedor quer conferir o anúncio, **Then** o sistema informa que não há link direto disponível (limitação da API) e sugere pesquisar o nome do produto manualmente no Mercado Livre.

---

### User Story 2 - Ver tendências gerais do Mercado Livre (Priority: P2)

Na mesma tela, o vendedor vê uma lista com os termos em alta no Mercado Livre no momento (não filtrada pelo termo pesquisado), como fonte de inspiração adicional para nichos a explorar.

**Why this priority**: É um sinal de tendência real disponível na API, complementar ao ranking por categoria, mas não é o fluxo principal do ticket (que parte de um termo específico).

**Independent Test**: Abrir a tela e conferir que a lista de tendências gerais aparece independentemente de qualquer busca ter sido feita.

**Acceptance Scenarios**:

1. **Given** o vendedor abre a tela de descoberta de tendências, **When** a página carrega, **Then** vê a lista de termos em alta no Mercado Livre no momento, sem precisar pesquisar nada.
2. **Given** a lista de tendências gerais, **When** o vendedor clica em um termo, **Then** o termo é usado como busca (User Story 1), mostrando o ranking da categoria correspondente.

---

### User Story 3 - Reaproveitar buscas recentes (cache de 24h) (Priority: P2)

Quando o mesmo termo já foi pesquisado nas últimas 24 horas, o sistema devolve o resultado guardado anteriormente (categoria + ranking), sem consultar novamente o Mercado Livre. A tela indica que se trata de resultado guardado e quando foi obtido, com opção de atualizar.

**Why this priority**: Evita estourar o limite de requisições do Mercado Livre e deixa a repetição de buscas instantânea; a funcionalidade central (US1) já entrega valor sem isso.

**Independent Test**: Pesquisar o mesmo termo duas vezes seguidas e verificar que a segunda resposta vem marcada como guardada, com a data/hora da obtenção, sem nova chamada externa.

**Acceptance Scenarios**:

1. **Given** um termo pesquisado há menos de 24h, **When** o vendedor pesquisa o mesmo termo (ignorando maiúsculas/minúsculas e espaços nas pontas), **Then** o resultado vem do armazenamento local, sem consultar o Mercado Livre, e a tela informa a data/hora da obtenção.
2. **Given** um termo pesquisado há mais de 24h, **When** o vendedor pesquisa novamente, **Then** uma nova consulta é feita e o resultado guardado é substituído.
3. **Given** um resultado guardado exibido, **When** o vendedor aciona "Atualizar", **Then** o sistema consulta o Mercado Livre imediatamente, independentemente do prazo.

---

### User Story 4 - Continuar funcionando quando o Mercado Livre falha (Priority: P2)

Se a consulta ao Mercado Livre falhar, for recusada ou exceder o limite de requisições, a tela mostra o resultado guardado anteriormente para o termo (mesmo vencido), com aviso claro, em vez de quebrar. Sem resultado guardado, mostra mensagem de erro compreensível. O erro real continua visível na aba Network do navegador, sem ser mascarado.

**Why this priority**: Garante resiliência e transparência, mas depende da existência da busca (US1) e do cache (US3).

**Independent Test**: Simular falha do Mercado Livre para um termo com resultado guardado e outro sem, e conferir o aviso com dados antigos no primeiro e a mensagem de erro no segundo, com o status de erro real visível na aba Network.

**Acceptance Scenarios**:

1. **Given** um termo com resultado guardado (mesmo vencido) e o Mercado Livre falhando, **When** o vendedor pesquisa, **Then** vê o resultado guardado acompanhado de aviso de que os dados podem estar desatualizados e da data/hora da obtenção.
2. **Given** um termo sem resultado guardado e o Mercado Livre falhando, **When** o vendedor pesquisa, **Then** vê uma mensagem de erro clara e nenhuma lista.
3. **Given** qualquer falha na consulta externa, **When** a resposta chega ao navegador, **Then** o status HTTP e o corpo do erro refletem a falha real (não são convertidos em sucesso) e podem ser inspecionados na aba Network.
4. **Given** que a conexão do app com o Mercado Livre não está autorizada ou expirou, **When** o vendedor pesquisa, **Then** a mensagem indica que é preciso reconectar a conta do Mercado Livre, em vez de um erro genérico.

---

### Edge Cases

- Termo muito longo ou com caracteres especiais/acentos: tratado sem erro; o cache considera o termo normalizado.
- Buscas simultâneas do mesmo termo por mais de um usuário: não devem gerar chamadas externas duplicadas desnecessárias nem resultados corrompidos.
- Categoria resolvida sem nenhum produto em destaque: tratado como lista vazia, não erro.
- Item do ranking cujo nome não pôde ser resolvido pela API (alguns tipos de item retornados pelo Mercado Livre não têm nome acessível a este app): exibido com marcador "nome não disponível", mantendo a posição, sem quebrar os demais itens da lista.
- Termo genérico que resolve para uma categoria de nível muito alto/ampla: exibido normalmente; sem curadoria adicional nesta versão.
- Buscas simultâneas do mesmo termo em contas diferentes: compartilham o mesmo cache (chave é o termo normalizado, não o usuário).
- Acesso por usuário não administrador ou não autenticado: tela e consulta recusadas (herda a proteção já existente do painel admin).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST oferecer, no painel administrativo, uma tela de descoberta de tendências com campo de busca por palavra-chave.
- **FR-002**: O sistema MUST restringir a tela e a consulta a usuários administradores autenticados (reaproveitando a proteção já existente das rotas `/admin/*` e `/api/admin/*`).
- **FR-003**: O sistema MUST resolver a categoria do Mercado Livre a partir do termo pesquisado, usando a conexão autorizada já existente do app.
- **FR-004**: O sistema MUST exibir o ranking de produtos mais vendidos (posição + nome) da categoria resolvida para o termo.
- **FR-005**: O sistema MUST exibir uma lista de termos em alta no Mercado Livre no momento, independente de busca, e permitir usá-los como novo termo de busca.
- **FR-006**: O sistema MUST informar de forma clara, na tela, que preço e link direto do anúncio não estão disponíveis (limitação da API do Mercado Livre para este tipo de acesso), sem simular ou inventar esses dados.
- **FR-007**: O sistema MUST armazenar cada resultado de busca (categoria + ranking) associado ao termo normalizado (sem diferença de maiúsculas/minúsculas e espaços nas pontas) e ao momento da obtenção.
- **FR-008**: O sistema MUST servir buscas repetidas do mesmo termo a partir do armazenamento local enquanto o resultado tiver menos de 24 horas, sem consultar o Mercado Livre.
- **FR-009**: O sistema MUST indicar visualmente quando o resultado exibido veio do armazenamento local, informando a data/hora da obtenção.
- **FR-010**: O sistema MUST oferecer ação explícita de atualizar, que ignora o prazo de 24h e consulta o Mercado Livre novamente.
- **FR-011**: Em caso de falha, indisponibilidade ou limite excedido do Mercado Livre, o sistema MUST exibir o último resultado guardado para o termo (se existir) com aviso de possível desatualização, sem quebrar a tela.
- **FR-012**: Em caso de falha sem resultado guardado, o sistema MUST exibir mensagem de erro compreensível ao vendedor.
- **FR-013**: O sistema MUST NOT ocultar erros da consulta externa: a resposta ao navegador deve refletir o status e o corpo reais do erro para inspeção na aba Network.
- **FR-014**: O sistema MUST diferenciar, na mensagem ao vendedor, falha de autorização com o Mercado Livre (reconexão necessária), falha de resolução de categoria (termo não reconhecido) e falha de disponibilidade/limite de requisições.
- **FR-015**: O sistema MUST validar a entrada, recusando termo vazio ou composto apenas por espaços.
- **FR-016**: O sistema MUST seguir o padrão existente do projeto para todos os textos da tela (rótulos, avisos, mensagens de erro e estados vazios) — pt-BR inline, como o restante do admin.

### Key Entities

- **Busca de tendência (resultado guardado)**: Representa uma pesquisa já realizada. Atributos: termo normalizado, categoria do Mercado Livre resolvida (id e nome, quando houver), momento da obtenção, ranking de produtos (lista ordenada) e origem (consulta nova ou guardada). Um termo tem no máximo um resultado guardado vigente, substituído a cada nova consulta.
- **Item do ranking**: Um produto em destaque (mais vendido) dentro do ranking de uma categoria. Atributos: posição, nome do produto, id do produto no Mercado Livre (sem link navegável nesta versão).
- **Tendência geral**: Um termo em alta no Mercado Livre no momento. Atributos: palavra-chave, URL pública de referência do próprio Mercado Livre (informativa, não é um anúncio específico).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O vendedor consegue pesquisar um termo e ver o ranking de mais vendido da categoria correspondente em até 5 segundos para buscas novas.
- **SC-002**: Repetições do mesmo termo dentro de 24h aparecem em até 1 segundo e sem nova consulta ao Mercado Livre (100% das repetições dentro do prazo).
- **SC-003**: Em falha do Mercado Livre com resultado guardado disponível, 100% das buscas exibem os dados guardados com aviso, sem tela de erro genérica.
- **SC-004**: Em 100% das falhas da consulta externa, o status real do erro é identificável na aba Network e a mensagem exibida diferencia falha de autorização, categoria não encontrada e indisponibilidade/limite excedido.
- **SC-005**: A tela é totalmente utilizável em celular, sem rolagem horizontal da página.
- **SC-006**: Todo vendedor que abre a tela entende, sem precisar perguntar, que os dados são de popularidade/tendência e não incluem preço (aviso visível sem precisar de explicação adicional).

## Assumptions

- Somente administradores usam a funcionalidade; não há visão pública ou para compradores.
- O escopo cobre apenas o Mercado Brasil (MLB) e o Mercado Livre como fonte.
- A conexão autorizada do app com o Mercado Livre já existe (integração 006) e será reutilizada; expiração e refresh já são tratados por ela.
- **Preço praticado e link direto do anúncio concorrente NÃO são alcançáveis com o nível de acesso deste app** (validado em 2026-09-21: `/sites/MLB/search` retorna 403 com token em qualquer combinação de parâmetros testada — busca livre, por `seller_id`, por categoria; a página pública de busca exige verificação antibot). O ranking por categoria (`/highlights`) e as tendências gerais (`/trends/MLB`) são os únicos sinais de popularidade acessíveis sem certificação/parceria adicional com o Mercado Livre.
- A categoria é resolvida automaticamente pelo previsor de categorias do Mercado Livre já usado em `precos.ts`/`categorias.ts` (mesmo mecanismo do cadastro de produto), a partir do termo pesquisado.
- O prazo de validade do resultado guardado é fixo em 24 horas, sem configuração pelo usuário nesta versão.
- O volume esperado é baixo (uso interno do vendedor), sem necessidade de paginação — exibe o ranking retornado pela API (tipicamente até 20 posições).
- Cruzamento entre popularidade e custo real (calculadora multicanal, EDI-106) é integração futura, fora desta entrega.
- Fora de escopo: sugestão automática de nicho por IA, Shopee (sem API pública de busca equivalente), monitoramento automático de preço de concorrentes (inviável sem certificação adicional do Mercado Livre, conforme investigado).
- Se no futuro o Mercado Livre conceder a este app acesso de parceiro/certificado com preço e link de concorrente, a tela pode ser estendida sem quebrar o que foi construído aqui (o ranking por categoria continua útil como sinal complementar).
