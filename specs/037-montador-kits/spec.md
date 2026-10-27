# Feature Specification: Montador de kits

**Feature Branch**: `037-montador-kits`  
**Created**: 2026-10-27  
**Status**: Draft  
**Input**: User description: "Montador de kits (ex.: kits de Natal) no admin. O admin monta um kit com itens que já são produtos ou com itens novos. (1) Combo pesquisável de produtos: ao adicionar um produto existente ao kit, traz peso, preço isolado e tempo de impressão (se houver). (2) Item novo: o admin digita o que é, peso e tempo de impressão; o sistema calcula o preço e a margem individuais com base nas taxas dos canais já configuradas; esse item também vira um PRODUTO RASCUNHO (se ainda não existir), com preço individual, para que possa ser vendido sozinho, receber fotos e ser levado para a calculadora. (3) Totalizador que atualiza a cada item adicionado: valor, peso e tempo de impressão somados. (4) Ao lado do totalizador, sugestão de preço do kit como desconto sobre a soma dos preços avulsos (faixas, ex.: 10%, 15%, 20%), mostrando a margem de cada faixa e bloqueando as que ficam abaixo da margem mínima; o kit deve sair mais em conta que os itens avulsos. (5) Vínculo com os produtos componentes: se preço, peso ou tempo de um produto mudar depois, o kit recalcula os totais e avisa que o preço do kit está desatualizado. (6) Transformar o kit em produto (com fotos, como já existe na área de produtos) para publicar facilmente. (7) Levar o kit para a calculadora existente para precificar nos marketplaces usando a técnica já existente de margem maior com desconto de cupom. Projeto multi-língua (seguir I18N existente). Sem ticket no Linear."

## Contexto

O lojista quer vender kits sazonais (ex.: Natal) formados por peças impressas que já vende avulsas e por peças novas. Hoje ele precisa somar à mão preço, peso e tempo de impressão de cada peça e chutar um desconto. A regra do negócio: o kit precisa **sair mais em conta que comprar as peças avulsas** e, ao mesmo tempo, manter a margem **acima do piso de lucro** (padrão 25% do preço, já configurado), porque o que fica acima do piso é a verba para cupons e promoções.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Montar um kit com produtos existentes e ver o totalizador (Priority: P1)

No admin, o lojista cria um kit com nome, pesquisa produtos num campo de busca com sugestões e os adiciona. Cada item adicionado mostra peso da peça, preço avulso e tempo de impressão (quando houver). Um totalizador soma valor avulso, peso e tempo de impressão e atualiza a cada item adicionado, removido ou com a quantidade alterada.

**Why this priority**: É o núcleo da funcionalidade e já elimina a soma manual.

**Independent Test**: Criar o kit "Kit Natal Mesa", adicionar 2 produtos existentes (um com quantidade 2) e conferir que o totalizador mostra a soma correta de preço, peso e tempo; salvar e reabrir o kit com os mesmos itens.

**Acceptance Scenarios**:

1. **Given** produtos cadastrados "Árvore 10 cm" (R$ 30,00, 40 g, 2 h) e "Estrela" (R$ 15,00, 10 g, 0,5 h), **When** o lojista adiciona a árvore e a estrela com quantidade 2, **Then** o totalizador mostra R$ 60,00, 60 g e 3 h.
2. **Given** um kit com itens, **When** o lojista remove um item ou altera sua quantidade, **Then** o totalizador é recalculado na hora.
3. **Given** um produto sem tempo de impressão cadastrado, **When** ele é adicionado, **Then** o item mostra o tempo como "não informado" e o totalizador indica que o tempo total está incompleto.
4. **Given** o campo de busca, **When** o lojista digita parte do nome, **Then** vê as sugestões de produtos (incluindo rascunhos) com nome e preço, e o produto já adicionado ao kit é sinalizado.

---

### User Story 2 - Sugestão de preço do kit com desconto sobre a soma (Priority: P1)

Ao lado do totalizador, o lojista vê faixas de desconto sobre a soma dos preços avulsos (padrão 10%, 15% e 20%). Para cada faixa, vê o preço do kit, a economia para o cliente em R$ e a margem resultante (% do preço) em cada canal de venda. Faixas que deixam a margem abaixo do piso de lucro aparecem bloqueadas, com o motivo. O lojista escolhe uma faixa ou digita um preço próprio, e esse valor vira o preço do kit.

**Why this priority**: É a resposta direta à dúvida do lojista ("quanto posso dar de desconto no kit e ainda ganhar?").

**Independent Test**: Num kit com soma avulsa de R$ 100,00, conferir que as faixas mostram R$ 90,00, R$ 85,00 e R$ 80,00 com a margem de cada canal, e que uma faixa abaixo do piso não pode ser escolhida.

**Acceptance Scenarios**:

1. **Given** um kit com soma avulsa de R$ 100,00, **When** o lojista abre a sugestão, **Then** vê as faixas 10%, 15% e 20% com preço R$ 90,00, R$ 85,00 e R$ 80,00, economia para o cliente e margem por canal.
2. **Given** uma faixa cuja margem num canal fica abaixo do piso de lucro, **When** a sugestão é exibida, **Then** essa faixa aparece bloqueada naquele canal com a mensagem "abaixo do piso de lucro".
3. **Given** o lojista digitando um preço próprio igual ou maior que a soma avulsa, **When** confirma, **Then** recebe um aviso de que o kit não está mais em conta que os itens avulsos (o preço pode ser salvo mesmo assim).
4. **Given** o lojista digitando um preço próprio abaixo do piso, **When** tenta salvar, **Then** recebe um alerta claro com a margem resultante e precisa confirmar explicitamente.
5. **Given** o lojista alterando as faixas de desconto (ex.: 5%, 12%, 25%), **When** salva o kit, **Then** as faixas escolhidas ficam guardadas para aquele kit.

---

### User Story 3 - Adicionar item novo que ainda não é produto (Priority: P2)

O lojista adiciona ao kit uma peça que ainda não existe como produto, informando o que é (nome), peso da peça e tempo de impressão. O sistema calcula, usando as configurações de custo de produção e as taxas dos canais já definidas, o custo, o preço sugerido individual e a margem dessa peça. Ao salvar, essa peça vira um **produto rascunho** com esse preço individual, que pode receber fotos, ser publicado sozinho e ser levado para a calculadora.

**Why this priority**: Kits sazonais quase sempre têm peças novas; sem isso o lojista precisa sair do fluxo para cadastrar cada peça.

**Independent Test**: Adicionar o item novo "Rena 8 cm", 25 g, 1,5 h; conferir preço e margem sugeridos; salvar o kit e encontrar "Rena 8 cm" como produto rascunho na lista de produtos, com o mesmo preço e vinculado ao kit.

**Acceptance Scenarios**:

1. **Given** as configurações de custo e as taxas dos canais definidas, **When** o lojista informa nome, peso e tempo de um item novo, **Then** vê custo, preço sugerido e margem por canal desse item antes de adicioná-lo.
2. **Given** um item novo adicionado, **When** o kit é salvo, **Then** é criado um produto rascunho com nome, peso, tempo de impressão e preço sugerido (ou o preço que o lojista ajustou), e o item do kit passa a apontar para esse produto.
3. **Given** um nome de item novo igual ao de um produto já existente, **When** o lojista tenta adicioná-lo, **Then** o sistema avisa e oferece usar o produto existente em vez de criar outro.
4. **Given** o produto rascunho criado, **When** o lojista o abre na área de produtos, **Then** pode adicionar fotos, publicar e levá-lo para a calculadora como qualquer outro produto.

---

### User Story 4 - Transformar o kit em produto e publicar (Priority: P2)

Com o kit montado e o preço escolhido, o lojista clica em "Criar produto do kit". O sistema cria um produto (rascunho) com o nome, o preço do kit, o peso total e a lista de itens inclusos na descrição, e leva o lojista à tela de edição desse produto, onde ele adiciona fotos e publica como já faz hoje.

**Why this priority**: Fecha o ciclo de venda do kit, reaproveitando a área de produtos existente.

**Independent Test**: Criar produto de um kit, conferir que a tela de edição abre com nome, preço, peso e itens inclusos preenchidos, adicionar uma foto e publicar.

**Acceptance Scenarios**:

1. **Given** um kit salvo com preço definido, **When** o lojista clica em "Criar produto do kit", **Then** um produto rascunho é criado com nome, preço, peso total e itens inclusos, e a tela de edição do produto é aberta.
2. **Given** um kit que já tem produto gerado, **When** o lojista abre o kit, **Then** vê o link para o produto e o botão passa a ser "Atualizar produto do kit" (atualiza preço, peso e itens inclusos, sem mexer em fotos e textos editados à mão).
3. **Given** um kit com algum item novo ainda não salvo como produto, **When** o lojista cria o produto do kit, **Then** os itens novos são salvos como rascunhos antes.

---

### User Story 5 - Kit acompanha mudanças dos produtos componentes (Priority: P3)

Se o preço, o peso ou o tempo de impressão de um produto usado no kit mudar depois, ao abrir o kit (ou a lista de kits) o lojista vê os totais recalculados e um aviso de que o preço do kit está desatualizado, com o que mudou.

**Why this priority**: Evita vender o kit com margem errada depois de reajustes, mas o kit já entrega valor sem isso.

**Independent Test**: Salvar um kit, alterar o preço de um produto componente e reabrir o kit: o totalizador mostra a nova soma e aparece o aviso de preço desatualizado.

**Acceptance Scenarios**:

1. **Given** um kit salvo com preço R$ 85,00 sobre soma avulsa de R$ 100,00, **When** o preço de um componente sobe e a soma vai para R$ 110,00, **Then** ao abrir o kit o totalizador mostra R$ 110,00, a margem e o desconto real do preço atual são recalculados e aparece o aviso "preço do kit desatualizado".
2. **Given** o aviso de preço desatualizado, **When** o lojista escolhe uma nova faixa ou confirma o preço atual e salva, **Then** o aviso some.
3. **Given** um produto componente excluído, **When** o kit é aberto, **Then** o item aparece como "produto removido" com os últimos valores conhecidos e o lojista é avisado para revisar o kit.
4. **Given** a lista de kits, **When** algum kit está com preço desatualizado, **Then** ele aparece sinalizado na lista.

---

### User Story 6 - Levar o kit para a calculadora (Priority: P3)

Na tela do kit, o lojista clica em "Levar para a calculadora". A calculadora abre preenchida com os dados do kit (custo total, peso total, tempo total e preço escolhido) para precificar nos marketplaces usando a técnica já existente de margem maior com desconto de cupom.

**Why this priority**: Reaproveita a calculadora existente para os marketplaces; depende de o kit já estar montado.

**Independent Test**: Num kit salvo, clicar em "Levar para a calculadora" e conferir que custo, peso e tempo aparecem preenchidos e que a verba de desconto/cupom é calculada como para um produto.

**Acceptance Scenarios**:

1. **Given** um kit salvo, **When** o lojista clica em "Levar para a calculadora", **Then** a calculadora abre com custo, peso, tempo e nome do kit preenchidos.
2. **Given** um kit que já virou produto, **When** o lojista leva o kit para a calculadora, **Then** a calculadora abre no contexto desse produto, como já acontece hoje a partir da tela de produto.

---

### Edge Cases

- Kit sem itens: o totalizador mostra zero, a sugestão de preço não aparece e não é possível criar produto ou levar para a calculadora.
- Item com quantidade zero ou negativa: não é aceito.
- Produto componente sem preço próprio num canal: usa o preço do site naquele canal, como já é feito hoje.
- Produto componente sem custo de produção cadastrado: o item mostra "custo não informado"; a margem do kit é marcada como estimativa incompleta e a faixa não é bloqueada por falta de dado (o lojista é avisado).
- O mesmo produto adicionado duas vezes: soma na quantidade do item já existente em vez de duplicar a linha.
- O produto gerado pelo kit não pode ser adicionado como componente de outro kit nem do próprio kit (evita kit dentro de kit).
- Faixa de desconto de 0% ou maior/igual a 100%: não é aceita.
- Margem impossível num canal (taxas + piso ≥ 100% do preço): a faixa aparece bloqueada com a explicação.
- Kit com produto gerado e componente que muda de preço: o aviso de desatualizado aparece também na tela do produto do kit.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O admin MUST poder criar, listar, editar e excluir kits, cada um com nome e lista de itens.
- **FR-002**: O admin MUST poder pesquisar produtos (publicados e rascunhos) por nome num campo com sugestões e adicioná-los ao kit com uma quantidade.
- **FR-003**: Cada item do kit MUST exibir nome, quantidade, peso da peça, preço avulso (preço do site) e tempo de impressão, com indicação clara quando algum dado não estiver informado.
- **FR-004**: O sistema MUST exibir um totalizador com soma do preço avulso, peso e tempo de impressão (considerando quantidades), atualizado a cada inclusão, remoção ou alteração de quantidade, sem precisar salvar.
- **FR-005**: O sistema MUST calcular o custo do kit como a soma dos custos de produção dos itens (por quantidade), contando a embalagem uma única vez — a embalagem do kit, informada pelo lojista no próprio kit (padrão: a embalagem padrão já configurada).
- **FR-006**: O sistema MUST sugerir preços do kit por faixas de desconto sobre a soma avulsa (padrão 10%, 15%, 20%, editáveis por kit), mostrando para cada faixa o preço, a economia do cliente em R$ e % e a margem (% do preço) em cada canal de venda, usando as taxas e o piso de lucro já configurados.
- **FR-007**: O sistema MUST bloquear a escolha de faixas cuja margem fique abaixo do piso de lucro no canal, informando o motivo.
- **FR-008**: O admin MUST poder definir um preço próprio para o kit; o sistema MUST avisar quando esse preço não for menor que a soma avulsa e exigir confirmação explícita quando a margem ficar abaixo do piso.
- **FR-009**: O admin MUST poder adicionar item novo informando nome, peso da peça e tempo de impressão; o sistema MUST calcular custo, preço sugerido e margem por canal desse item com as configurações de custo e taxas existentes, e permitir ajustar o preço antes de adicionar.
- **FR-010**: Ao salvar o kit, cada item novo MUST virar um produto rascunho com nome, peso, tempo de impressão e preço individual, e o item do kit MUST passar a apontar para esse produto.
- **FR-011**: O sistema MUST avisar quando o nome de um item novo coincidir com um produto existente e oferecer usar o produto existente.
- **FR-012**: O kit MUST manter o vínculo com os produtos componentes: totais, custo e margens MUST refletir os valores atuais dos produtos sempre que o kit é aberto.
- **FR-013**: O sistema MUST guardar a soma avulsa e os valores dos componentes no momento em que o preço do kit foi definido e, quando os valores atuais diferirem, sinalizar "preço do kit desatualizado" com o que mudou, no kit, na lista de kits e no produto do kit.
- **FR-014**: O admin MUST poder criar um produto rascunho a partir do kit, com nome, preço do kit, peso total e lista de itens inclusos, sendo levado à tela de edição de produto existente para adicionar fotos e publicar.
- **FR-015**: Para um kit que já tem produto, o admin MUST poder atualizar preço, peso e itens inclusos desse produto sem sobrescrever fotos e textos editados à mão.
- **FR-016**: O admin MUST poder levar o kit para a calculadora existente com custo, peso, tempo e nome preenchidos, usando a mesma lógica de verba de desconto/cupom já existente.
- **FR-017**: O sistema MUST impedir que um produto gerado a partir de um kit seja componente de um kit.
- **FR-018**: Todos os textos novos da interface MUST seguir o padrão multi-língua existente do projeto.
- **FR-019**: Somente usuários com acesso ao admin MUST poder ver e alterar kits.
- **FR-020**: Erros ao salvar o kit, criar produtos rascunho ou gerar o produto do kit MUST ser exibidos ao lojista com mensagem clara e não podem ser ocultados (a resposta de erro deve ser visível como tal).

### Key Entities

- **Kit**: conjunto montado pelo lojista. Atributos: nome, itens, custo de embalagem do kit, faixas de desconto, preço escolhido, valores de referência no momento da precificação (soma avulsa, peso, tempo e valores de cada componente), produto gerado (opcional), datas de criação/atualização.
- **Item do kit**: componente do kit. Atributos: produto vinculado, quantidade, últimos valores conhecidos (nome, preço, peso, tempo) para referência e para o caso de o produto ser removido. Antes de salvar, um item novo ainda não tem produto e guarda nome, peso, tempo e preço ajustado.
- **Produto** (existente): ganha a indicação de que foi gerado a partir de um kit (e de qual kit), para bloquear kit dentro de kit e exibir o aviso de desatualizado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O lojista monta um kit de 5 itens existentes e escolhe o preço em menos de 3 minutos.
- **SC-002**: O totalizador e a sugestão de preço atualizam em menos de 1 segundo após cada inclusão, remoção ou mudança de quantidade.
- **SC-003**: Em 100% dos kits, o preço sugerido em qualquer faixa liberada fica abaixo da soma avulsa e com margem igual ou acima do piso de lucro em todos os canais onde está liberada.
- **SC-004**: Do kit montado ao produto do kit pronto para receber fotos leva no máximo 2 cliques.
- **SC-005**: Os valores de margem do kit na tela do kit e na calculadora, para o mesmo preço e canal, são idênticos.
- **SC-006**: 100% das mudanças de preço, peso ou tempo dos componentes após a precificação geram o aviso de preço desatualizado na próxima abertura do kit.

## Assumptions

- O kit é genérico (serve para Natal, Dia das Mães etc.); "Natal" é só o exemplo de uso. Não há data de validade/sazonalidade automática nesta versão.
- O preço avulso de referência de cada componente é o preço do site; a margem por canal usa o preço próprio do canal quando o produto tiver.
- As faixas são aplicadas sobre a soma avulsa do site; a margem de cada canal é calculada sobre o preço do kit com as taxas daquele canal. Preço do kit por canal diferente do site fica a cargo da calculadora/tela do produto do kit.
- Peso exibido no totalizador é o peso das peças; o peso de envio do produto do kit é a soma das peças mais a embalagem do kit, e pode ser ajustado na tela de produto.
- O cálculo de preço sugerido do item novo usa as mesmas configurações padrão de custo de produção (filamento, energia, impressora, mão de obra, falha) e a margem desejada padrão já existentes.
- O produto do kit não controla estoque dos componentes nesta versão (não baixa estoque das peças avulsas ao vender o kit).
- Um kit pode ter no máximo 30 itens distintos.
- Não há ticket no Linear; a branch segue a numeração sequencial do Spec Kit.
