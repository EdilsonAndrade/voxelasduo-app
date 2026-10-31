# Feature Specification: Romaneios de consignação

**Feature Branch**: `038-romaneios-consignacao`  
**Created**: 2026-10-31  
**Status**: Draft  
**Input**: User description: "Romaneios de consignação (sem issue no Linear). Novo menu admin "Romaneios", ao lado de "Controle de vendas", para registrar o que o lojista leva para casas/lojas/pontos de venda (consignação) e imprimir em PDF. Busca única em Produtos e Tempo de impressão (sem duplicar planos ligados a produto; plano avulso vai inteiro com preço somado das partes), item livre, snapshot de nome e preço editável. Por item: levada, preço, subtotal; vendida e devolvida no acerto; a receber = vendidos × preço − pagamentos. Atalho "Pago na hora", pagamentos parciais (valor, data, forma), fechar acerto. Imprimir/PDF com cabeçalho, tabela, totais, assinatura e, se houver acerto, vendido/devolvido/a receber." + complemento: "quero agrupar por cada lugar que vai: levo para a casa de um amigo, meu irmão pega e leva para a minha sogra; quero destrinchar facilmente o que foi para cada lugar na tela do que levei em um lugar só."

## Contexto

O lojista leva peças para casas, lojas e pontos de venda de terceiros, em geral em consignação: as peças ficam no local e, num acerto posterior, ele vê o que vendeu, recolhe o que sobrou e recebe pelo vendido. Alguns lugares pagam na hora. Muitas vezes uma saída se espalha: ele deixa tudo num lugar (ex.: casa de um amigo) e outra pessoa (ex.: o irmão) pega parte e leva para outro lugar (ex.: casa da sogra). Ele quer **um romaneio por saída**, com a possibilidade de **ver tudo junto ou separado por lugar**, sabendo quem levou o quê para onde, e imprimir a lista (PDF) para conferir e assinar.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Montar o romaneio e imprimir (Priority: P1)

No menu **Romaneios**, o lojista cria um romaneio com um nome (ex.: "Saída 31/10"), a data de saída, uma observação e o **primeiro lugar** (nome do local ou pessoa, contato opcional, quem levou). Num campo de busca único, procura peças que vêm ao mesmo tempo dos Produtos do catálogo e do Tempo de impressão, cada uma com uma etiqueta de origem. Também pode digitar um item livre. Informa a quantidade levada e confere o preço unitário (vem sugerido e pode ser alterado). Vê o subtotal por linha, o total de peças e o valor total. Salva e clica em **Imprimir/PDF**.

**Why this priority**: É o pedido principal: registrar o que está saindo e ter a lista impressa.

**Independent Test**: Criar um romaneio com o lugar "Casa do amigo" e 2 produtos, 1 item do Tempo de impressão e 1 item livre; conferir os totais; imprimir e conferir que o PDF traz lugar, data, tabela, totais e linhas de assinatura.

**Acceptance Scenarios**:

1. **Given** o produto "Vaso Geométrico" (R$ 40,00), **When** o lojista o adiciona com quantidade 3, **Then** a linha mostra preço R$ 40,00 e subtotal R$ 120,00, e os totais somam 3 peças e R$ 120,00.
2. **Given** a busca por "vaso", **When** existem um produto e um plano avulso do Tempo de impressão com esse nome, **Then** ambos aparecem, cada um com sua etiqueta de origem.
3. **Given** um plano do Tempo de impressão ligado a um produto, **When** o lojista busca pelo nome, **Then** aparece só o Produto, sem duplicata.
4. **Given** um plano avulso com várias partes que têm peso e margem, **When** é adicionado, **Then** vira uma linha só, com preço igual à soma do valor de venda direta de cada parte.
5. **Given** um plano avulso sem peso ou margem em alguma parte, **When** é adicionado, **Then** a linha fica com preço vazio e o romaneio só pode ser salvo depois que o preço for preenchido.
6. **Given** um item já no romaneio, **When** o preço do produto de origem muda depois, **Then** o romaneio mantém o preço que foi gravado.
7. **Given** um romaneio salvo, **When** o lojista clica em Imprimir/PDF, **Then** abre uma página pronta para impressão com lugar, contato, quem levou, data, observação, tabela item / qtd / preço / subtotal, totais e linhas de assinatura de quem entrega e de quem recebe.

---

### User Story 2 - Vários lugares e repasse entre eles (Priority: P1)

No mesmo romaneio, o lojista cadastra outros lugares (nome, contato opcional, quem levou — ex.: "Casa da sogra", levado por "irmão"). Pode adicionar peças direto num lugar ou **repassar** parte das peças de um lugar para outro: escolhe a linha, a quantidade e o lugar de destino; a quantidade sai do lugar de origem e entra no novo. A tela tem dois modos: **Por lugar** (uma seção por lugar, com subtotal de peças e valor) e **Tudo junto** (cada peça uma vez só, com a soma de todos os lugares e quanto está em cada um).

**Why this priority**: É como as saídas acontecem na prática; sem isso o lojista não sabe o que está em cada lugar.

**Independent Test**: Num romaneio com 5 vasos na "Casa do amigo", criar o lugar "Casa da sogra" (levado por "irmão"), repassar 2 vasos e conferir: amigo 3, sogra 2, "Tudo junto" mostra 5; imprimir só a "Casa da sogra" e conferir que saem 2 vasos.

**Acceptance Scenarios**:

1. **Given** 5 vasos na "Casa do amigo", **When** o lojista repassa 2 para a "Casa da sogra", **Then** a "Casa do amigo" fica com 3, a "Casa da sogra" com 2 (mesmo nome e preço gravados) e o total do romaneio continua 5.
2. **Given** a tentativa de repassar mais peças do que as que ainda estão no lugar (levadas − vendidas − devolvidas), **When** confirma, **Then** recebe um erro com o limite.
3. **Given** o modo "Por lugar", **When** o lojista olha a tela, **Then** cada lugar aparece em sua seção com quem levou, itens, total de peças e valor.
4. **Given** o modo "Tudo junto", **When** o lojista olha a tela, **Then** cada peça aparece uma vez, com a soma das quantidades e a divisão por lugar (ex.: "amigo 3 · sogra 2").
5. **Given** um romaneio com vários lugares, **When** o lojista imprime, **Then** pode imprimir o romaneio inteiro (uma seção por lugar e total geral) ou só um lugar.
6. **Given** um lugar com peças, **When** o lojista tenta excluí-lo, **Then** o sistema pede para repassar ou remover as peças antes.
7. **Given** o lojista adiciona uma peça que já existe no mesmo lugar, **When** confirma, **Then** a quantidade é somada à linha existente.

---

### User Story 3 - Acertar a consignação por lugar (Priority: P1)

Ao voltar a um lugar, o lojista informa, por item daquele lugar, quantas peças foram vendidas e quantas foram devolvidas. O sistema mostra quantas ainda ficam no lugar, o valor vendido, os pagamentos recebidos daquele lugar e o valor a receber. Pode registrar pagamentos parciais (valor, data e forma) e **fechar o acerto do lugar**. O romaneio fica "acertado" quando todos os lugares estão acertados. O resumo geral soma todos os lugares.

**Why this priority**: É o motivo da consignação: saber quanto cobrar de cada lugar e o que ainda está fora.

**Independent Test**: No lugar "Casa da sogra" com 2 vasos a R$ 40,00, informar 1 vendido e 1 devolvido, registrar um pagamento de R$ 20,00 e conferir: 0 no lugar, vendido R$ 40,00, a receber R$ 20,00; o resumo geral inclui esses valores.

**Acceptance Scenarios**:

1. **Given** um item com 3 levadas num lugar, **When** o lojista informa 2 vendidas e 1 devolvida, **Then** o item mostra 0 no lugar.
2. **Given** vendidas + devolvidas maior que a quantidade levada, **When** o lojista tenta salvar, **Then** recebe um erro indicando o item, o lugar e o limite.
3. **Given** vendido R$ 80,00 e um pagamento de R$ 50,00 num lugar, **When** o lojista vê o resumo do lugar, **Then** o valor a receber é R$ 30,00, e o resumo geral soma os valores de todos os lugares.
4. **Given** um lugar aberto, **When** o lojista fecha o acerto, **Then** o lugar passa a "acertado"; se ainda houver peças no lugar ou valor a receber, o sistema avisa antes de confirmar.
5. **Given** todos os lugares acertados, **When** a lista é exibida, **Then** o romaneio aparece como "acertado"; se algum lugar estiver aberto, aparece como "aberto".
6. **Given** um lugar acertado, **When** o lojista precisa corrigir algo, **Then** pode reabri-lo.

---

### User Story 4 - Pago na hora (Priority: P2)

Para lugares que compram e pagam na hora, o lojista usa **Pago na hora** no lugar: todas as peças daquele lugar são marcadas como vendidas, um pagamento do valor total do lugar é registrado com a data de hoje e a forma escolhida, e o lugar fica acertado.

**Independent Test**: Num lugar com R$ 120,00 em peças, usar "Pago na hora" com Pix e conferir vendidas = levadas, pagamento de R$ 120,00, a receber R$ 0,00 e lugar acertado.

**Acceptance Scenarios**:

1. **Given** um lugar aberto sem acerto, **When** o lojista usa "Pago na hora" e escolhe a forma, **Then** todas as linhas do lugar ficam com vendida = levada, devolvida = 0, um pagamento do total é registrado e o lugar passa a acertado.
2. **Given** um lugar que já tem vendas, devoluções ou pagamentos, **When** o lojista usa "Pago na hora", **Then** o sistema pede confirmação antes de sobrescrever.

---

### User Story 5 - Lista de romaneios e impressão do acerto (Priority: P2)

A lista mostra todos os romaneios com nome, data, lugares, status, peças levadas, peças ainda fora e valor a receber, com filtro por status. Na impressão de um lugar (ou do romaneio inteiro) com acerto registrado, a tabela inclui vendido, devolvido e no lugar, e o resumo mostra vendido, pago e a receber.

**Acceptance Scenarios**:

1. **Given** romaneios abertos e acertados, **When** o lojista filtra por "aberto", **Then** vê só os abertos, com peças fora e valor a receber.
2. **Given** um lugar com vendas ou devoluções registradas, **When** imprime, **Then** a tabela mostra vendido, devolvido e no lugar por item e o resumo mostra vendido, pago e a receber.
3. **Given** um lugar sem acerto registrado, **When** imprime, **Then** sai só a lista de saída, sem colunas de acerto.

### Edge Cases

- Romaneio sem nenhum lugar ou sem nenhum item: não pode ser salvo.
- Lugar sem itens: pode existir (ex.: criado antes de repassar), mas não sai na impressão do romaneio inteiro.
- Quantidade levada zero ou negativa, preço negativo, quantidade não inteira: erro de validação por campo.
- Repasse para o mesmo lugar: não permitido.
- Repasse de linha que tem vendidas/devolvidas: só a quantidade ainda no lugar pode ser repassada; as vendidas/devolvidas ficam no lugar de origem.
- Produto ou plano apagado depois: a linha continua com o nome e o preço gravados.
- Pagamentos acima do valor vendido: permitido, mas o resumo mostra "pago a mais" em vez de valor negativo a receber.
- Remover item que já tem vendidas/devolvidas ou excluir romaneio: pede confirmação.
- Busca sem resultados: oferece adicionar como item livre com o texto digitado.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O admin MUST ter o menu "Romaneios" ao lado de "Controle de vendas", com lista e editor.
- **FR-002**: Um romaneio MUST ter nome (obrigatório), data de saída (obrigatória, padrão hoje), observação (opcional) e um ou mais lugares.
- **FR-003**: Um lugar MUST ter nome (obrigatório), contato (opcional), quem levou (opcional) e status próprio (aberto ou acertado).
- **FR-004**: O status do romaneio MUST ser "acertado" quando todos os lugares estão acertados e "aberto" caso contrário.
- **FR-005**: O editor MUST oferecer uma busca única em Produtos do catálogo e planos do Tempo de impressão, com etiqueta de origem em cada resultado, adicionando ao lugar escolhido.
- **FR-006**: Planos do Tempo de impressão ligados a um produto MUST NOT aparecer na busca; só os planos avulsos aparecem.
- **FR-007**: Um plano avulso MUST entrar como uma linha só, com preço sugerido igual à soma do valor de venda direta das partes; se alguma parte não tiver peso ou margem, o preço vem vazio.
- **FR-008**: O lojista MUST poder adicionar um item livre com nome, quantidade e preço.
- **FR-009**: Cada linha MUST guardar uma cópia do nome e do preço no momento da inclusão, sem acompanhar mudanças posteriores da origem; o preço MUST ser editável.
- **FR-010**: Cada linha MUST mostrar quantidade levada, preço unitário e subtotal; cada lugar e o romaneio MUST mostrar total de peças e valor total.
- **FR-011**: O lojista MUST poder repassar uma quantidade de uma linha para outro lugar do mesmo romaneio, limitada às peças ainda no lugar de origem, mantendo nome, preço e origem gravados.
- **FR-012**: A tela MUST ter os modos "Por lugar" (seções com subtotais) e "Tudo junto" (peça agrupada com soma e divisão por lugar).
- **FR-013**: Por linha, o lojista MUST poder registrar quantidade vendida e devolvida; no lugar = levada − vendida − devolvida, nunca negativo.
- **FR-014**: O lojista MUST poder registrar, editar e remover pagamentos por lugar com valor, data e forma (Pix, dinheiro, cartão, transferência, outro).
- **FR-015**: O resumo de cada lugar e o resumo geral MUST mostrar valor vendido (Σ vendida × preço), total pago e valor a receber (vendido − pago); quando o pago for maior, mostra o valor pago a mais.
- **FR-016**: O atalho "Pago na hora" MUST agir sobre um lugar: marcar tudo como vendido, registrar um pagamento do total do lugar com a forma escolhida e a data de hoje e acertar o lugar, pedindo confirmação se já houver acerto registrado.
- **FR-017**: O lojista MUST poder fechar o acerto de um lugar, com aviso se ainda houver peças no lugar ou valor a receber, e reabrir um lugar acertado.
- **FR-018**: A lista MUST mostrar nome, data, lugares, status, peças levadas, peças fora e valor a receber, com filtro por status, mais recentes primeiro.
- **FR-019**: O lojista MUST poder imprimir/salvar em PDF o romaneio inteiro (uma seção por lugar com subtotal e total geral) ou um lugar só: cabeçalho com lugar, contato, quem levou, data e observação; tabela item / qtd / preço / subtotal; totais; linhas de assinatura. Quando houver acerto registrado, MUST incluir vendido, devolvido e no lugar por item e o resumo vendido / pago / a receber.
- **FR-020**: Erros de validação MUST indicar o campo e voltar com o status de erro real na resposta.
- **FR-021**: Só administradores autenticados MUST acessar romaneios.

### Key Entities

- **Romaneio**: uma saída. Nome, data de saída, observação, lugares, datas de criação e atualização; status derivado dos lugares.
- **Lugar**: onde as peças ficam. Nome, contato, quem levou, status (aberto/acertado), data de acerto, itens e pagamentos.
- **Item do lugar**: origem (produto, tempo de impressão ou livre), referência à origem quando houver, nome e preço gravados, quantidade levada, vendida e devolvida.
- **Pagamento**: valor, data, forma, observação opcional; pertence a um lugar.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O lojista monta um romaneio com 10 itens em 2 lugares e gera o PDF em menos de 5 minutos.
- **SC-002**: O valor a receber exibido, por lugar e geral, bate com a conta manual (vendidas × preço − pagamentos) em 100% dos casos testados.
- **SC-003**: Depois de um repasse, a soma das quantidades de todos os lugares é igual à quantidade total levada antes do repasse.
- **SC-004**: Nenhum item aparece duplicado na busca por existir ao mesmo tempo como produto e como plano ligado a ele.
- **SC-005**: O PDF de um lugar cabe em uma página A4 para até 25 itens e é legível em preto e branco.

## Assumptions

- O repasse é só dentro do mesmo romaneio; não há histórico detalhado de cada repasse nesta versão (a tela mostra a situação atual de cada lugar).
- O romaneio não mexe no estoque nem no Controle de vendas; é um controle separado (integração fica para depois).
- O "valor de venda direta" de cada parte do Tempo de impressão é o mesmo que a tela de Tempo de impressão já mostra.
- Sem comissão do ponto de venda nesta versão: o preço gravado é o valor que o lojista recebe por peça.
- Moeda em reais; textos em pt-BR seguindo o padrão atual do admin (sem biblioteca de i18n).
- O PDF é gerado pela impressão do navegador ("Salvar como PDF"), como nas outras telas de impressão.
