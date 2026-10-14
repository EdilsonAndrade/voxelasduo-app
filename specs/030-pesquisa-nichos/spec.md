# Feature Specification: Pesquisa de nichos para impressão em escala

**Feature Branch**: `030-pesquisa-nichos`
**Created**: 2026-10-14
**Status**: Draft
**Input**: Pedido do usuário (sem card no Linear, dispensado pelo usuário) — "pesquisar nichos de itens mais vendidos na Shopee e Mercado Livre, definindo antes que seja só uma cor para imprimir rápido e vender em escala; buscar o modelo no MakerWorld com o tempo de impressão estimado (confirmo abrindo o fatiador); trazer só potencial de venda médio a alto, concorrência baixa/média/alta e o que vale a pena que as pessoas estão procurando."

## Fontes de dados (validadas ao vivo em 2026-10-14)

- **Mercado Livre** (conta já conectada da loja): o que as pessoas mais buscam por categoria, os mais vendidos da categoria e a quantidade de produtos de catálogo para um termo. **Não** há acesso a busca de anúncios, preço nem quantidade vendida de concorrentes (bloqueio do próprio ML, já documentado em `specs/020-ml-descoberta-tendencias/research.md`).
- **MakerWorld** (acesso não oficial, sem login — o usuário aceita o risco de parar de funcionar se o site mudar): busca de modelos por texto em português, filtrada por licença, e para cada modelo os perfis de impressão com tempo estimado, gramas, quantidade de cores/filamentos, uso de AMS, quantidade de mesas, impressora do perfil, downloads e impressões.
- **Shopee**: não oferece dados de mercado. O usuário pesquisa manualmente na Shopee e cola o link do anúncio; o sistema não abre a página da Shopee, apenas guarda o link e aproveita o nome do produto que vem no próprio endereço.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Descobrir oportunidades por categoria (Priority: P1)

O avaliador abre "Pesquisa de nichos" no admin, escolhe uma ou mais categorias de interesse (ex: Decoração, Organização, Escritório), deixa marcado "só 1 cor" e "compatível com A1" e pesquisa. O sistema pega os termos mais buscados dessas categorias no Mercado Livre, procura para cada termo modelos imprimíveis no MakerWorld que respeitem os filtros e mostra só as oportunidades com potencial de venda médio ou alto, cada uma com a concorrência (baixa, média ou alta) e os melhores modelos encontrados.

**Why this priority**: É o coração do pedido — transformar "o que as pessoas procuram" em "o que eu consigo imprimir rápido e vender".

**Independent Test**: Escolher a categoria Decoração, pesquisar e conferir que cada oportunidade tem termo, potencial (médio/alto), concorrência e ao menos um modelo de 1 cor com tempo e gramas.

**Acceptance Scenarios**:

1. **Given** o avaliador no admin com "só 1 cor" marcado, **When** pesquisa a categoria Decoração, **Then** vê uma lista de oportunidades em que todos os modelos mostrados usam um único filamento e não exigem AMS.
2. **Given** um termo em alta para o qual não existe nenhum modelo imprimível que respeite os filtros, **When** a pesquisa termina, **Then** esse termo não aparece como oportunidade.
3. **Given** uma oportunidade com potencial baixo, **When** a lista é exibida, **Then** ela fica oculta (há um contador "X oportunidades de potencial baixo ocultas").
4. **Given** um modelo com licença que não permite venda (não comercial ou licença padrão do MakerWorld), **When** a pesquisa roda, **Then** ele nunca aparece.
5. **Given** cada oportunidade, **When** exibida, **Then** mostra: termo buscado, potencial (médio/alto) com o motivo ("12º mais buscado em Decoração"), concorrência (baixa/média/alta) com o número que a sustenta, e até 2 modelos com capa, nome, licença, tempo estimado, gramas, quantidade de mesas e downloads.

---

### User Story 2 - Conferir no fatiador e levar para a calculadora (Priority: P1)

Num modelo que interessou, o avaliador clica em "Abrir no MakerWorld", que abre a página do modelo já no perfil de impressão escolhido; lá ele usa o botão do próprio site para abrir no Bambu Studio e confirmar o tempo. Depois clica em "Levar para a calculadora": o sistema cria um cálculo salvo com o nome, o link do modelo, o tempo de impressão e as gramas, e abre a calculadora de preço já com esse cálculo.

**Why this priority**: Sem isso a pesquisa vira só uma lista; ligar à calculadora é o que diz se o preço fecha com a margem.

**Independent Test**: Clicar em "Levar para a calculadora" num modelo e conferir que a calculadora abre com nome, link MakerWorld, tempo (h) e gramas preenchidos, e que o cálculo aparece em "Cálculos salvos".

**Acceptance Scenarios**:

1. **Given** um modelo na lista, **When** o avaliador clica em "Abrir no MakerWorld", **Then** a página do modelo abre em nova aba no perfil de impressão mostrado.
2. **Given** um modelo na lista, **When** clica em "Levar para a calculadora", **Then** é criado um cálculo salvo e a calculadora abre com tempo, gramas, nome e link já preenchidos; os demais custos usam os valores padrão da calculadora.
3. **Given** um perfil com várias mesas, **When** é levado para a calculadora, **Then** o tempo e as gramas são o total do perfil e a quantidade de mesas aparece no nome/observação para o usuário ajustar a produção.

---

### User Story 3 - Pesquisar a partir de um link (Shopee ou Mercado Livre) (Priority: P2)

O avaliador viu um produto no Mercado Livre, procurou o mesmo na Shopee e cola o(s) link(s). O sistema tira o nome do produto do endereço, busca modelos no MakerWorld com os mesmos filtros, mostra a concorrência do termo no Mercado Livre e guarda os links para irem junto ao cálculo quando ele for levado para a calculadora.

**Why this priority**: Cobre o fluxo manual que o usuário já faz com a Shopee, mas depende da mesma busca de modelos da US1.

**Independent Test**: Colar um link da Shopee de um porta-caneta e conferir que aparecem modelos de porta-caneta de 1 cor e que, ao levar para a calculadora, o link da Shopee vem preenchido.

**Acceptance Scenarios**:

1. **Given** um link de anúncio da Shopee, **When** o avaliador pesquisa, **Then** o nome extraído do link é mostrado (editável) e usado na busca de modelos.
2. **Given** um link de onde não dá para tirar um nome (ex: link encurtado), **When** pesquisa, **Then** o sistema pede para digitar o nome do produto, sem erro genérico.
3. **Given** links da Shopee e do Mercado Livre informados, **When** um modelo é levado para a calculadora, **Then** o cálculo salvo já tem esses links nos campos correspondentes.
4. **Given** o avaliador digita só um nome (sem link), **When** pesquisa, **Then** a busca funciona igual.

---

### Edge Cases

- Mercado Livre desconectado ou token inválido → mensagem "reconecte a conta do Mercado Livre", com o status real da resposta.
- MakerWorld fora do ar ou mudou o formato → mensagem dizendo que a busca no MakerWorld falhou, com o status real; a parte do Mercado Livre continua visível.
- Mesmo termo pesquisado de novo dentro de 24h → resultado reaproveitado, com a data/hora em que foi obtido e opção de atualizar.
- Falha na atualização com resultado antigo disponível → mostra o antigo com aviso de desatualizado.
- Termos em alta genéricos ou não imprimíveis ("cama solteiro", "promoção relâmpago") → somem naturalmente por não terem modelo que atenda aos filtros.
- Perfil sem tempo ou sem gramas informados → modelo não entra (não dá para calcular).
- Modelo sem perfil para A1 com o filtro A1 marcado → modelo não entra.
- Concorrência no teto de contagem do Mercado Livre (10.000+) → mostrada como "alta (10.000+)".

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O admin MUST ter uma tela "Pesquisa de nichos" acessível só para administradores, ligada ao menu do painel.
- **FR-002**: Antes de pesquisar, o usuário MUST poder escolher: categorias de interesse (uma ou mais, de uma lista fixa de categorias do Mercado Livre relevantes para impressão 3D), "só 1 cor" (padrão marcado) e "compatível com A1" (padrão marcado).
- **FR-003**: O sistema MUST obter os termos mais buscados de cada categoria escolhida no Mercado Livre, guardando a posição de cada termo.
- **FR-004**: Para cada termo, o sistema MUST buscar modelos no MakerWorld aceitando apenas licenças que permitem venda (CC0, CC BY, CC BY-SA).
- **FR-005**: Com "só 1 cor", MUST manter apenas perfis com um único filamento e sem necessidade de AMS; com "compatível com A1", apenas perfis feitos para A1 ou A1 mini.
- **FR-006**: Para cada modelo mantido, MUST escolher o melhor perfil que passa nos filtros (o mais impresso/bem avaliado) e mostrar tempo estimado, gramas, quantidade de mesas, licença, downloads e capa.
- **FR-007**: O sistema MUST classificar o potencial de venda em baixo, médio ou alto a partir da posição do termo entre os mais buscados da categoria e da popularidade dos modelos no MakerWorld, mostrando o motivo da classificação.
- **FR-008**: O sistema MUST classificar a concorrência em baixa, média ou alta a partir da quantidade de produtos de catálogo do Mercado Livre para o termo, mostrando o número usado.
- **FR-009**: Oportunidades de potencial baixo MUST ficar ocultas, com contador do que foi ocultado; termos sem nenhum modelo que passe nos filtros MUST ser descartados.
- **FR-010**: O usuário MUST poder pesquisar também por nome livre ou por link de anúncio da Shopee ou do Mercado Livre; o sistema MUST extrair o nome do produto do endereço sem abrir a página e permitir editá-lo.
- **FR-011**: Cada modelo MUST ter "Abrir no MakerWorld" (abre em nova aba no perfil escolhido) e "Levar para a calculadora".
- **FR-012**: "Levar para a calculadora" MUST criar um cálculo salvo com nome, link do modelo, tempo de impressão, gramas e, quando informados, os links da Shopee e do Mercado Livre, e abrir a calculadora de preço nesse cálculo.
- **FR-013**: Resultados MUST ser reaproveitados por 24h por combinação de pesquisa, mostrando quando foram obtidos e permitindo forçar atualização; em falha, MUST mostrar o resultado anterior com aviso, se houver.
- **FR-014**: Erros MUST indicar a origem (Mercado Livre ou MakerWorld) e preservar o status HTTP real na resposta, sem convertê-los em sucesso.
- **FR-015**: A pesquisa MUST limitar a quantidade de consultas externas por execução (até 20 termos por categoria, 2 modelos por termo, até 3 categorias por pesquisa, consultas ao MakerWorld espaçadas para não serem bloqueadas) para responder em tempo razoável.
- **FR-016**: Textos em pt-BR, no padrão inline do admin.

### Key Entities

- **Oportunidade**: termo buscado, categoria de origem, posição entre os mais buscados, potencial (baixo/médio/alto) e motivo, concorrência (baixa/média/alta) e número de produtos, lista de modelos.
- **Modelo sugerido**: id e endereço do modelo no MakerWorld, nome, capa, licença, autor, downloads/impressões, perfil escolhido (id, nome, tempo em segundos, gramas, mesas, filamentos, impressora).
- **Resultado de pesquisa em cache**: chave da pesquisa (categorias + filtros, ou termo + filtros), data de obtenção e oportunidades — validade de 24h.
- **Cálculo salvo** (existente): recebe nome, links e tempo/gramas a partir do modelo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O avaliador sai de "escolher categoria" até ver a lista de oportunidades em menos de 1 minuto, sem abrir outro site.
- **SC-002**: 100% dos modelos mostrados com "só 1 cor" usam um único filamento e 100% têm licença que permite venda.
- **SC-003**: Do clique em "Levar para a calculadora" até ver o preço sugerido, menos de 10 segundos e nenhuma digitação de tempo ou gramas.
- **SC-004**: Uma pesquisa repetida no mesmo dia responde de imediato (reaproveitada) e indica a data de obtenção.
- **SC-005**: Quando uma fonte falha, o usuário vê qual delas falhou e o motivo, nunca uma lista vazia sem explicação.

## Assumptions

- Não há card no Linear (dispensado pelo usuário); branch `030-pesquisa-nichos`.
- "Mais vendidos da Shopee" não é obtido automaticamente — a Shopee entra via link colado pelo usuário (escolha "c" do usuário).
- O Mercado Livre funciona como termômetro de demanda também para a Shopee.
- A concorrência é aproximada (produtos de catálogo do ML, não número de anúncios), pois a contagem de anúncios é bloqueada pelo ML; a tela deixa isso claro.
- Busca por imagem não entra nesta versão: a busca do MakerWorld é por texto (aceita português e entende sinônimos), alimentada pelo termo em alta ou pelo nome tirado do link.
- O tempo do MakerWorld é estimativa do autor; a confirmação é feita pelo usuário no Bambu Studio a partir da página do modelo — o sistema não abre o fatiador diretamente.
- Os custos que não vêm do modelo (filamento R$/kg, luz, embalagem etc.) usam os padrões já existentes da calculadora.
- Categorias iniciais: subcategorias de Casa, Móveis e Decoração (Enfeites e Decoração, Organização para Casa, Cozinha, Banheiros, Iluminação), Escritório/Papelaria, Brinquedos/Hobbies, Games (acessórios) e Presentes — ids definidos no plano.
