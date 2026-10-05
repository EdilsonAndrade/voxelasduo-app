# Feature Specification: Controle de produção com o histórico de impressões da Bambu Lab

**Feature Branch**: `edilsonaandrade/edi-127-controle-de-producao-historico-de-impressoes-da-bambu-lab-a1`
**Created**: 2026-10-05
**Status**: Draft
**Linear**: EDI-127

**Input**: Trazer o histórico de impressão da Bambu Lab A1 para o admin, somar gramas/horas/falhas por produto e apurar o custo real por peça, confrontando com o custo estimado que hoje é preenchido à mão a partir do slice do Bambu Studio. Fase 1 sem hardware local e sem acompanhamento em tempo real.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver o histórico de produção no admin (Priority: P1)

O vendedor conecta a conta da impressora ao admin e passa a ver, numa única tela, todas as impressões já feitas: o que foi impresso, quando, quanto tempo levou de verdade, quantos gramas consumiu, em qual material/cor e se terminou ou falhou. Hoje essa informação só existe no aplicativo da impressora, uma impressão por vez, sem soma e sem relação com o catálogo.

**Why this priority**: é a base de tudo — sem os dados importados não há custo apurado, nem indicador de perda. Já entrega valor sozinha: substitui a conferência manual no aplicativo.

**Independent Test**: conectar a conta, rodar a importação e conferir que a lista do admin bate com o histórico mostrado no aplicativo da impressora (mesma quantidade de impressões, mesmos pesos e horários).

**Acceptance Scenarios**:

1. **Given** a conta da impressora ainda não conectada, **When** o vendedor informa as credenciais e confirma o código de verificação em duas etapas, **Then** o admin guarda o acesso e informa que a conexão está ativa.
2. **Given** a conta conectada e nenhuma impressão importada, **When** o vendedor dispara a importação, **Then** todas as impressões disponíveis no histórico da conta aparecem na tela de produção, da mais recente para a mais antiga.
3. **Given** impressões já importadas, **When** a importação roda novamente, **Then** nenhuma impressão é duplicada e somente as novas são acrescentadas.
4. **Given** uma impressão que falhou ou foi cancelada, **When** ela é exibida na lista, **Then** aparece marcada como falha, com o tempo que efetivamente rodou até ser interrompida.
5. **Given** o acesso à conta expirado ou recusado, **When** a importação roda, **Then** a tela mostra o erro real retornado pelo serviço e orienta a reconectar, sem apagar o que já foi importado.

---

### User Story 2 - Dizer de que produto (e de que parte) é cada impressão (Priority: P1)

O serviço da impressora só informa o nome do arquivo impresso (ex: `vaso_base_v2`). O vendedor declara, uma única vez por nome de arquivo, a que produto do catálogo aquilo pertence, **que parte do produto é** (peça única, base, tampa…), quantas unidades daquela parte saem por placa e quantas delas entram em um produto acabado. A partir daí, toda impressão com o mesmo nome é reconhecida sozinha, inclusive as já importadas.

**Why this priority**: sem esse vínculo o custo por unidade sai errado por um múltiplo — uma placa com 6 chaveiros de 60 g não é um chaveiro de 60 g, e um produto montado com base + tampa impressas em placas separadas só tem custo correto quando as duas partes são somadas.

**Independent Test**: importar o histórico, mapear os nomes de arquivo de um produto de duas partes e de um produto de peça única, e verificar que todas as impressões daqueles nomes — antigas e novas — passam a aparecer vinculadas ao produto e à parte certa, sem precisar mapear de novo.

**Acceptance Scenarios**:

1. **Given** impressões importadas com nomes de arquivo nunca vistos, **When** o vendedor abre a tela de produção, **Then** esses nomes aparecem numa lista de pendentes, cada um com a quantidade de impressões e o total de gramas acumulado.
2. **Given** um nome de arquivo pendente de um produto que sai inteiro numa placa, **When** o vendedor o vincula ao produto como peça única informando quantas saem por placa, **Then** o vínculo é salvo e as impressões daquele nome passam a contar como unidades daquele produto.
3. **Given** um produto formado por várias partes impressas separadamente, **When** o vendedor vincula cada nome de arquivo ao mesmo produto indicando a parte, o rendimento por placa e quantas entram no produto acabado, **Then** o admin passa a tratar aquelas impressões como partes do mesmo produto.
4. **Given** um vínculo já salvo, **When** uma nova impressão com o mesmo nome de arquivo é importada, **Then** ela é vinculada automaticamente, sem passar pela lista de pendentes.
5. **Given** um vínculo salvo com rendimento errado, **When** o vendedor corrige quantas peças saem por placa, **Then** os números de produção e de custo do produto são recalculados com o valor novo.
6. **Given** uma impressão sem vínculo, **When** os totais de custo do produto são calculados, **Then** ela é ignorada no custo, mas continua visível na lista e contada no total geral de filamento consumido.

---

### User Story 3 - Comparar o custo apurado com o custo cadastrado (Priority: P2)

Para cada produto com produção mapeada, o admin mostra lado a lado o custo cadastrado (digitado a partir do slice, que segue valendo para a venda) e o custo apurado nas impressões reais: gramas por peça, horas por peça e o valor em reais resultante — somando todas as partes, quando o produto tem mais de uma. O vendedor vê onde o cadastro está otimista ou pessimista e, se quiser, aplica os valores apurados ao cadastro com uma ação explícita.

**Why this priority**: é o objetivo final da feature, mas depende das duas primeiras histórias.

**Independent Test**: com um produto de peça única e um produto de duas partes, ambos com impressões mapeadas, conferir que a tela mostra gramas/horas por peça apuradas e o custo em reais, que o produto de duas partes soma as duas, e que o custo cadastrado só muda quando o vendedor aplica.

**Acceptance Scenarios**:

1. **Given** um produto com impressões mapeadas, **When** o vendedor abre a visão por produto, **Then** vê unidades produzidas, gramas por peça, horas por peça, custo apurado por peça e o custo cadastrado, com a diferença entre eles.
2. **Given** um produto de várias partes com todas as partes já impressas, **When** o custo apurado é calculado, **Then** ele é a soma do custo de cada parte, respeitando quantas unidades de cada parte entram no produto acabado.
3. **Given** um produto de várias partes em que alguma parte nunca foi impressa, **When** o vendedor abre a visão por produto, **Then** a tela mostra o custo parcial identificando quais partes ainda não têm produção, em vez de apresentar um custo por peça incompleto como se fosse o total.
4. **Given** a diferença entre apurado e cadastrado, **When** o vendedor escolhe aplicar o valor apurado, **Then** o cadastro do produto é atualizado e a tela passa a mostrar os dois valores iguais.
5. **Given** um produto sem nenhuma impressão mapeada, **When** o vendedor abre a visão por produto, **Then** a tela indica que não há dados de produção, sem exibir número apurado nem zero enganoso, e o produto continua à venda normalmente com o custo cadastrado.
6. **Given** impressões em mais de um material ou cor para a mesma parte, **When** o custo apurado é calculado, **Then** cada impressão usa o valor do filamento correspondente ao seu material e o resultado é a média ponderada pelas peças produzidas.
7. **Given** que nada é aplicado automaticamente, **When** a importação roda, **Then** nenhum custo cadastrado de produto é alterado sem ação do vendedor.

---

### User Story 4 - Lançar no estoque as peças realmente prontas (Priority: P2)

Quando uma impressão termina, ela aparece com a quantidade que rendeu e uma ação para dar entrada no estoque do produto. O vendedor confirma quando a peça está de fato pronta para vender — já removida da placa, com acabamento feito e sem defeito — e pode ajustar a quantidade para menos se alguma peça quebrou. Depois de lançada, a mesma impressão não pode ser contada outra vez. Em produtos de várias partes, só são oferecidos conjuntos completos.

**Why this priority**: elimina o ajuste manual de estoque, que hoje é feito de cabeça, sem deixar a importação inflar o estoque e os anúncios com peça que não existe para vender.

**Independent Test**: concluir uma impressão mapeada, lançar no estoque uma quantidade menor que o rendimento e verificar que o estoque do produto subiu exatamente o confirmado, que a impressão ficou marcada como lançada e que uma nova importação não altera o estoque de novo.

**Acceptance Scenarios**:

1. **Given** uma impressão concluída, mapeada e ainda não lançada, **When** o vendedor abre a lista de produção, **Then** vê a ação de lançar no estoque com a quantidade sugerida igual ao rendimento declarado.
2. **Given** a ação de lançar, **When** o vendedor confirma a quantidade, **Then** o estoque do produto é acrescido exatamente dessa quantidade e a impressão fica marcada como lançada, com quanto foi lançado e quando.
3. **Given** uma peça que quebrou na remoção da placa, **When** o vendedor lança uma quantidade menor que o rendimento, **Then** o estoque sobe só o confirmado e a diferença fica registrada como perda daquela impressão.
4. **Given** uma impressão já lançada, **When** o vendedor tenta lançar novamente ou a importação roda de novo, **Then** o sistema impede o lançamento em duplicidade.
5. **Given** um produto de várias partes com 10 unidades de uma parte e 4 de outra, **When** o vendedor abre o lançamento, **Then** o sistema oferece 4 conjuntos completos e mantém o excedente como parte em estoque intermediário, não como produto pronto.
6. **Given** uma impressão feita para atender uma encomenda já vendida, **When** o vendedor não a lança, **Then** nada muda no estoque e a impressão continua contando para custo e produção.
7. **Given** o lançamento confirmado, **When** o estoque muda, **Then** a atualização segue o mesmo caminho das demais alterações de estoque, propagando aos canais de venda como qualquer outra entrada.

---

### User Story 5 - Enxergar perda e falha medidas, não chutadas (Priority: P3)

O vendedor vê, por produto e no total, a taxa de falha realmente observada (impressões interrompidas sobre o total) e o quanto o consumo real de filamento excede o peso líquido cadastrado — a perda de purga e troca de cor. Esses dois percentuais são exatamente os que hoje ele preenche no cadastro por estimativa.

**Why this priority**: refina a precisão do custo e mostra dinheiro perdido, mas o custo já é útil sem isso.

**Independent Test**: com histórico contendo impressões concluídas e interrompidas, conferir que a taxa de falha exibida corresponde à contagem manual e que o percentual de perda corresponde à diferença entre gramas consumidos e peso líquido cadastrado.

**Acceptance Scenarios**:

1. **Given** impressões concluídas e interrompidas de um produto, **When** o vendedor abre os indicadores, **Then** vê a taxa de falha observada e em quantas impressões ela se baseia.
2. **Given** uma taxa de falha observada, **When** o número de impressões é pequeno demais para ser representativo, **Then** a tela avisa que a amostra é pequena em vez de apresentar o percentual como conclusão.
3. **Given** os indicadores do período, **When** o vendedor consulta o resumo, **Then** vê quantos gramas e quantos reais foram consumidos por impressões que falharam.

---

### User Story 6 - Importação automática diária (Priority: P3)

A importação roda sozinha uma vez por dia, para que a tela esteja sempre atualizada sem o vendedor precisar lembrar de clicar. Quando o acesso à conta da impressora expira, o admin avisa de forma visível que precisa reconectar.

**Why this priority**: conveniência; tudo funciona com a importação manual.

**Independent Test**: verificar que, sem nenhuma ação manual, impressões feitas no dia anterior aparecem na tela; e que, com o acesso expirado, o aviso de reconexão aparece.

**Acceptance Scenarios**:

1. **Given** a conta conectada, **When** o dia virar, **Then** as impressões novas aparecem na tela sem ação do vendedor.
2. **Given** o acesso expirado, **When** a importação automática tentar rodar, **Then** o admin registra a falha e mostra um aviso de reconexão na tela de produção.
3. **Given** uma importação automática que falhou, **When** o vendedor dispara a importação manualmente, **Then** a importação ocorre normalmente e o aviso desaparece.

---

### Edge Cases

- **Produto nunca impresso**: permanece cadastrado, à venda e com o custo digitado do slice. A tela de produção apenas informa que não há produção apurada — a feature nunca bloqueia a venda nem exige histórico.
- **Histórico anterior à ativação**: as impressões trazidas na primeira importação entram marcadas como histórico. Contam para custo, gramas, horas e falhas, mas nunca oferecem lançamento de estoque — o estoque atual já reflete o que foi produzido antes.
- **Lançamento parcial**: o vendedor pode lançar menos que o rendimento e depois lançar o saldo da mesma impressão (a peça que ficou para acabamento), até o limite do rendimento declarado; a diferença não lançada fica registrada como perda.
- **Peça impressa para encomenda já vendida**: simplesmente não é lançada no estoque; continua contando para custo e produção.
- **Falha ao propagar o estoque para um canal de venda**: o lançamento no estoque do site permanece válido e a propagação segue o mesmo tratamento de pendência já usado hoje, sem exigir novo lançamento.
- **Partes impressas em quantidades desiguais**: imprimir 10 bases e 4 tampas não produz 10 produtos acabados. As unidades acabadas são limitadas pela parte mais escassa; o excedente das outras partes aparece como produção adiantada, não como produto pronto.
- **Parte nunca impressa num produto de várias partes**: o custo apurado é marcado como parcial, com as partes faltantes identificadas.
- **Placa com produtos diferentes**: nesta fase um nome de arquivo pertence a um único produto. Uma placa que mistura produtos distintos não é representável; o vendedor deixa o nome sem vínculo (fica fora do custo) ou aceita a imprecisão de mapeá-la a um só produto.
- **Mesma peça em placas separadas**: dez unidades que a impressora dividiu em várias placas/jobs do mesmo arquivo somam normalmente, pois a contagem é por rendimento declarado × número de impressões concluídas.
- **Impressão interrompida no começo**: o consumo informado é o estimado para a placa inteira, não o que realmente rodou. Impressões que falharam não contam como peças produzidas e não entram no custo por unidade, apenas no indicador de perda.
- **Peso informado como zero ou ausente**: a impressão é guardada, mas não entra em cálculo de custo nem de perda, e aparece sinalizada na lista.
- **Mesmo nome de arquivo reaproveitado para outro produto ou outra parte**: ao alterar um vínculo existente, o vendedor é avisado de que isso reclassifica todas as impressões passadas daquele nome.
- **Produto excluído do catálogo** com vínculos existentes: as impressões permanecem, o vínculo fica órfão e o nome volta para a lista de pendentes.
- **Histórico muito grande na primeira importação**: a importação percorre o histórico em partes e pode ser retomada, sem perder o que já gravou se interromper no meio.
- **Duas impressoras na mesma conta**: cada impressão identifica a máquina de origem; os totais por produto somam as duas.
- **Fuso horário**: datas e horas são exibidas no horário local do vendedor, não no horário do serviço da impressora.

## Requirements *(mandatory)*

### Functional Requirements

**Conexão com a conta da impressora**

- **FR-001**: O admin MUST permitir conectar a conta do fabricante da impressora informando as credenciais e o código de verificação em duas etapas enviado pelo fabricante.
- **FR-002**: O sistema MUST guardar o acesso obtido de forma reutilizável entre execuções, sem exigir nova confirmação a cada importação.
- **FR-003**: O admin MUST mostrar o estado da conexão (ativa, expirada ou nunca conectada) e permitir reconectar a qualquer momento.
- **FR-004**: O sistema MUST exibir o erro real devolvido pelo serviço do fabricante quando a conexão ou a importação falhar, sem mascarar a causa.

**Importação do histórico**

- **FR-005**: O sistema MUST importar o histórico de impressões da conta conectada, registrando por impressão: identificador de origem, nome do arquivo, data/hora de início e de fim, resultado (concluída ou interrompida), consumo de filamento em gramas, material e cor usados, impressora de origem e imagem de pré-visualização quando houver.
- **FR-006**: O sistema MUST calcular a duração efetiva de cada impressão pelo intervalo entre início e fim, e não pela estimativa do fatiador.
- **FR-007**: O sistema MUST evitar duplicidade, identificando cada impressão pelo identificador de origem.
- **FR-008**: O sistema MUST percorrer o histórico em partes e retomar de onde parou, preservando o que já foi gravado se a importação for interrompida.
- **FR-009**: Usuários MUST poder disparar a importação manualmente a qualquer momento.
- **FR-010**: O sistema MUST executar a importação automaticamente uma vez por dia.
- **FR-011**: O sistema MUST registrar o resultado de cada importação (quantas impressões novas, quantas ignoradas, erro quando houver) e exibir o resultado da última execução.

**Vínculo com o produto e composição por partes**

- **FR-012**: O sistema MUST listar os nomes de arquivo ainda não vinculados, com a quantidade de impressões e o total de gramas de cada um.
- **FR-013**: Usuários MUST poder vincular um nome de arquivo a um produto do catálogo informando: a parte do produto que aquele arquivo produz, quantas unidades daquela parte saem por placa e quantas unidades daquela parte compõem um produto acabado.
- **FR-014**: O sistema MUST aceitar o caso de peça única (produto que sai inteiro numa placa) como uma composição de uma só parte, sem exigir que o vendedor descreva partes quando não há mais de uma.
- **FR-015**: O sistema MUST aceitar vários nomes de arquivo apontando para o mesmo produto, cada um como uma parte distinta.
- **FR-016**: O sistema MUST aplicar o vínculo a todas as impressões do mesmo nome de arquivo, inclusive as importadas antes de o vínculo existir, e automaticamente às futuras.
- **FR-017**: Usuários MUST poder alterar ou remover um vínculo, com aviso de que isso reclassifica as impressões passadas.
- **FR-018**: O sistema MUST manter impressões sem vínculo visíveis e fora de qualquer cálculo de custo por produto.

**Apuração de custo e indicadores**

- **FR-019**: O sistema MUST apresentar, por produto com produção mapeada: unidades acabadas produzidas, gramas por peça, horas por peça, custo apurado por peça, custo cadastrado e a diferença entre os dois.
- **FR-020**: O sistema MUST calcular o custo apurado por peça de um produto como a soma do custo apurado de cada parte, multiplicado pelas unidades de cada parte que compõem o produto acabado.
- **FR-021**: O sistema MUST calcular o custo apurado de cada parte usando o consumo e a duração reais das impressões daquela parte, divididos pelo rendimento declarado por placa, com o valor do filamento do material correspondente e os mesmos componentes de custo já usados no cadastro (filamento, depreciação da impressora, energia, mão de obra, embalagem e acessórios).
- **FR-022**: O sistema MUST contar como peças produzidas apenas as impressões concluídas, e as unidades acabadas de um produto de várias partes MUST ser limitadas pela parte com menor produção.
- **FR-023**: O sistema MUST identificar o custo apurado como parcial quando alguma parte mapeada do produto não tiver nenhuma impressão concluída, nomeando as partes sem dados.
- **FR-024**: O sistema MUST apresentar a taxa de falha observada por produto e no total, informando em quantas impressões ela se baseia e avisando quando a amostra for pequena.
- **FR-025**: O sistema MUST apresentar a perda observada de filamento — quanto o consumo real excede o peso líquido cadastrado — por produto e no total.
- **FR-026**: O sistema MUST apresentar, para o período consultado, o filamento e o valor em reais consumidos por impressões que falharam.
- **FR-027**: Usuários MUST poder aplicar ao cadastro do produto os valores apurados (gramas, horas, taxa de falha, perda) por ação explícita.
- **FR-028**: O sistema MUST NOT alterar nenhum dado cadastrado de produto como efeito da importação.
- **FR-029**: O sistema MUST manter o custo cadastrado como a fonte usada nos preços e nas demais telas do admin; o custo apurado MUST ser apenas informativo até ser aplicado.
- **FR-030**: Produtos sem nenhuma produção importada MUST continuar cadastráveis, publicáveis e vendáveis exatamente como hoje.
- **FR-031**: O sistema MUST permitir filtrar a visão de produção por período, produto, impressora e resultado.

**Lançamento no estoque**

- **FR-032**: O sistema MUST oferecer, para cada impressão concluída e mapeada, uma ação explícita de dar entrada no estoque do produto, com quantidade sugerida igual ao rendimento declarado.
- **FR-033**: Usuários MUST poder confirmar uma quantidade menor que a sugerida, registrando a diferença como perda daquela impressão.
- **FR-034**: O sistema MUST registrar quanto já foi lançado por impressão e MUST impedir que a mesma impressão gere entrada de estoque além do seu rendimento.
- **FR-035**: O sistema MUST permitir lançar o saldo remanescente de uma impressão em um momento posterior.
- **FR-036**: Para produtos de várias partes, o sistema MUST oferecer apenas conjuntos completos, consumindo o saldo das partes correspondentes, e MUST manter o excedente de partes como produção intermediária, fora do estoque do produto.
- **FR-037**: O sistema MUST NOT alterar o estoque de nenhum produto sem confirmação explícita do vendedor.
- **FR-038**: As impressões trazidas na primeira importação (anteriores à ativação da feature) MUST ser marcadas como histórico e MUST NOT oferecer lançamento de estoque.
- **FR-039**: O lançamento confirmado MUST usar o mesmo mecanismo de alteração de estoque já existente, propagando aos canais de venda como qualquer outra entrada, inclusive no tratamento de falha de propagação.

**Acesso**

- **FR-040**: Todas as telas e ações desta feature MUST estar restritas ao painel administrativo autenticado, no mesmo nível de acesso das demais telas de produto.
- **FR-041**: O sistema MUST NOT expor as credenciais nem o acesso guardado em nenhuma resposta destinada ao navegador.

### Key Entities

- **Impressão**: um trabalho de impressão realizado. Identificador de origem, nome do arquivo, início, fim, duração efetiva, resultado (concluída/interrompida), gramas consumidos, material e cor, impressora, imagem de pré-visualização, o vínculo aplicado (quando houver), se é histórico anterior à ativação, e quanto do seu rendimento já foi lançado no estoque.
- **Lançamento de estoque**: a entrada confirmada pelo vendedor. Impressão (ou conjunto de partes) de origem, produto, quantidade lançada, quantidade descartada como perda, data e quem confirmou.
- **Vínculo arquivo→parte de produto**: a ponte declarada pelo vendedor. Nome do arquivo (chave), produto do catálogo, identificação da parte, rendimento por placa e quantas unidades da parte compõem um produto acabado.
- **Conexão com a conta da impressora**: o acesso guardado, o estado (ativa/expirada) e a data da última renovação.
- **Registro de importação**: quando rodou, se foi manual ou automática, quantas impressões novas entraram e o erro, se houver.
- **Apuração por produto** (derivada, não armazenada): unidades acabadas, gramas por peça, horas por peça, custo apurado por peça, partes sem dados, taxa de falha observada e perda observada.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O vendedor consegue, em menos de 5 minutos e sem ajuda, conectar a conta da impressora e ver o histórico importado na tela.
- **SC-002**: A lista importada reproduz 100% das impressões que o aplicativo do fabricante mostra para o mesmo período, com os mesmos pesos e horários.
- **SC-003**: Importações repetidas no mesmo dia não criam nenhuma impressão duplicada.
- **SC-004**: Vincular um nome de arquivo leva menos de 30 segundos e nunca precisa ser repetido para o mesmo nome.
- **SC-005**: Todo produto com pelo menos uma impressão concluída e mapeada exibe custo apurado por peça e a diferença em relação ao custo cadastrado; produtos de várias partes exibem a soma das partes ou a indicação de quais faltam.
- **SC-006**: Nenhum custo cadastrado de produto muda sem ação explícita do vendedor — verificável comparando o cadastro antes e depois de uma importação.
- **SC-007**: Cadastrar e publicar um produto novo, sem nenhuma impressão, continua possível sem nenhum passo a mais em relação a hoje.
- **SC-011**: Nenhuma importação — manual ou automática, inclusive a primeira com todo o histórico — altera o estoque de qualquer produto; verificável comparando os estoques antes e depois.
- **SC-012**: É impossível a mesma impressão gerar entrada de estoque além do seu rendimento declarado, mesmo repetindo a ação.
- **SC-013**: Dar entrada no estoque a partir de uma impressão concluída leva menos de 15 segundos e não exige abrir a tela do produto.
- **SC-008**: A taxa de falha e a perda exibidas conferem com a contagem manual sobre os mesmos dados.
- **SC-009**: Após o primeiro dia de uso, o vendedor obtém sem nenhum clique a resposta para "quantas peças deste produto já imprimi e quanto de filamento isso consumiu".
- **SC-010**: Toda falha de comunicação com o serviço do fabricante aparece na tela com a causa real, sem mensagem genérica.

## Assumptions

- **O custo digitado do slice continua soberano.** Ele é a base do preço e permite cadastrar e vender um produto que nunca foi impresso. O custo apurado nas impressões é comparativo e só entra no cadastro por ação explícita do vendedor.
- **Um nome de arquivo pertence a um único produto**, como uma de suas partes. Produtos de várias partes são suportados por vários vínculos; placas que misturam produtos diferentes não são representáveis nesta fase (ver Edge Cases).
- **Estoque nunca é alterado pela importação.** A entrada é sempre confirmada pelo vendedor, porque peça impressa não é peça vendável (acabamento, quebra na remoção, encomenda já vendida) e porque a alteração de estoque propaga para os anúncios dos canais de venda. O histórico anterior à ativação nunca oferece lançamento, já que o estoque atual já o reflete.
- **O rendimento por placa é declarado pelo vendedor**, não detectado automaticamente — o serviço do fabricante não informa quantas cópias havia na placa.
- **O consumo informado é estimativa do fatiador, não medição.** Já inclui a purga calculada pelo fatiador, mas é reconhecidamente impreciso em troca de cor. Aceito como melhor dado disponível sem hardware local; fator de calibração manual fica fora desta fase.
- **Energia continua estimada** (consumo médio × tarifa × duração), pois nenhuma via de integração expõe medição real. A melhoria é usar a duração real em vez da estimada.
- **Valores de filamento, impressora, energia e mão de obra vêm do cadastro já existente do produto**; esta feature não cria um cadastro paralelo de insumos.
- **O acesso à conta do fabricante expira periodicamente** e a renovação automática não é confiável, portanto a reconexão manual pelo vendedor é parte do fluxo normal, não uma exceção.
- **A integração é com um serviço não oficial do fabricante**, sem contrato de estabilidade: mudanças do lado dele podem interromper a importação, e o sistema deve degradar mostrando o erro, nunca perdendo o histórico já importado.
- **Volume esperado pequeno** (algumas impressões por dia, uma a duas impressoras), o que dispensa tratamento especial de escala.
- **Acompanhamento em tempo real está fora do escopo** desta fase: nada de status ao vivo, alerta de erro de impressão, consumo por carretel ou fila de produção. Fica para um segundo ticket, em serviço próprio de execução contínua.
- **Idioma**: as telas seguem o padrão de textos já adotado no admin.
