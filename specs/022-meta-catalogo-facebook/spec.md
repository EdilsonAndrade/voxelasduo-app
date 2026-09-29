# Feature Specification: Publicar produtos no Facebook e Instagram Shop via catálogo da Meta

**Feature Branch**: `edilsonaandrade/edi-109-publicar-produtos-no-facebook-e-instagram-shop-via-catalogo`
**Created**: 2026-09-28
**Status**: Draft
**Input**: Linear EDI-109 — "Publicar produtos no Facebook e Instagram Shop via catálogo da Meta"

## Contexto

A VoxelasDuo quer vender os produtos 3D também na loja do Facebook e do Instagram, **sem checkout na Meta**: o cliente navega pela loja no Facebook/Instagram e, ao querer comprar, é levado para a página do produto no site VoxelasDuo ("finalização da compra em outro site").

Já configurado na Meta (fora deste sistema): portfólio empresarial "Voxelas Duo", página do Facebook VoxelasDuo, Instagram @voxelasduo e o catálogo "VoxelasDuo" (ID `1247757684199959`), ainda vazio. A loja foi configurada até a prévia, aguardando produtos no catálogo para ser enviada à análise.

A integração consiste em o site disponibilizar um **feed de produtos** que o catálogo da Meta lê automaticamente em horário programado — o vendedor não cadastra produtos à mão na Meta.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Disponibilizar os produtos marcados num feed que a Meta importa sozinha (Priority: P1)

O vendedor cadastra, uma única vez no catálogo da Meta, o endereço do feed de produtos do site como "feed programado". A partir daí, a Meta busca o feed periodicamente e o catálogo passa a conter exatamente os produtos que o vendedor marcou para o Facebook/Instagram, com título, descrição, preço, fotos, link para a página do produto no site, disponibilidade, marca e categoria.

**Why this priority**: Sem o feed, o catálogo fica vazio e a loja do Facebook/Instagram não pode sequer ser enviada para análise. É o núcleo da integração.

**Independent Test**: Marcar ao menos um produto para o Facebook, abrir o endereço do feed no navegador e conferir que ele traz esse produto com todos os campos obrigatórios; cadastrar o endereço no catálogo e ver o produto aparecer lá sem erros.

**Acceptance Scenarios**:

1. **Given** três produtos marcados para o Facebook e dois não marcados, **When** o feed é acessado, **Then** ele contém exatamente os três produtos marcados.
2. **Given** um produto marcado, **When** o feed é acessado, **Then** o item traz: identificador estável, título, descrição, preço em reais, foto principal (e fotos adicionais, se houver), link para a página pública do produto no site, disponibilidade, marca "VoxelasDuo" e condição "novo".
3. **Given** um produto marcado com estoque zerado, **When** o feed é acessado, **Then** o item aparece como "fora de estoque" (não é removido), para que a Meta o esconda da loja sem perder o histórico.
4. **Given** o vendedor altera preço, fotos ou descrição de um produto marcado, **When** a Meta faz a próxima leitura programada do feed, **Then** o catálogo reflete a alteração sem nenhum passo manual na Meta.
5. **Given** o vendedor desmarca um produto, **When** a Meta faz a próxima leitura, **Then** o produto deixa de constar no feed e sai do catálogo.

---

### User Story 2 - Escolher no admin quais produtos vão para o Facebook/Instagram (Priority: P1)

Na edição de um produto já existente, na seção "Canais de venda", o vendedor encontra a opção "Publicar no Facebook/Instagram". Ao ligar e salvar, o produto passa a constar no feed; ao desligar e salvar, deixa de constar.

**Why this priority**: O vendedor precisa controlar o que vai para a Meta — nem todo produto deve ser anunciado lá. Sem isso, o feed não tem como saber quais produtos incluir.

**Independent Test**: Ligar a opção num produto, salvar, e conferir que ele passa a aparecer no feed; desligar, salvar, e conferir que some.

**Acceptance Scenarios**:

1. **Given** um produto existente sem a opção ligada, **When** o vendedor liga "Publicar no Facebook/Instagram" e salva, **Then** a opção fica salva e o produto passa a constar no feed.
2. **Given** um produto com a opção ligada, **When** o vendedor a desliga e salva, **Then** o produto deixa de constar no feed.
3. **Given** um produto sem foto, **When** o vendedor tenta ligar a opção e salvar, **Then** o sistema impede o salvamento com uma mensagem clara de que a Meta exige ao menos uma foto.
4. **Given** um produto novo sendo cadastrado, **When** o vendedor o salva sem mexer na opção, **Then** ele não vai para o Facebook/Instagram (a opção vem desligada por padrão).

---

### User Story 3 - Texto chamativo próprio para o Facebook/Instagram (Priority: P2)

Para cada produto, o vendedor pode escrever um título e uma descrição próprios para o Facebook/Instagram — mais chamativos que os do site, destacando por exemplo o preço baixo ("A partir de R$ 39,90", "Menos de R$ 40!"). Se deixar em branco, o feed usa o nome e a descrição do produto no site.

**Why this priority**: Aumenta a conversão na Meta, mas a integração já funciona sem isso (usando o texto do site).

**Independent Test**: Preencher título e descrição próprios num produto marcado e conferir que o feed usa esses textos; apagá-los e conferir que o feed volta a usar os do site.

**Acceptance Scenarios**:

1. **Given** um produto marcado com título próprio para o Facebook preenchido, **When** o feed é acessado, **Then** o título do item é o título próprio, não o nome do produto no site.
2. **Given** um produto marcado com os textos próprios em branco, **When** o feed é acessado, **Then** o item usa o nome e a descrição do produto no site.
3. **Given** o vendedor digita um título próprio acima do limite aceito pela Meta, **When** tenta salvar, **Then** o sistema avisa o limite e impede o salvamento (ou mostra o contador de caracteres antes).
4. **Given** um texto próprio preenchido, **When** o vendedor altera o preço do produto, **Then** o preço enviado no feed é sempre o preço real atual — o texto é livre e é responsabilidade do vendedor mantê-lo coerente com o preço.

---

### User Story 4 - Ver na listagem de produtos quais estão no Facebook/Instagram (Priority: P3)

Na listagem de produtos do admin, ao lado dos selos de Mercado Livre e Shopee, aparece um selo "Facebook" nos produtos marcados para o Facebook/Instagram.

**Why this priority**: Conveniência visual; não bloqueia a venda.

**Independent Test**: Marcar um produto e conferir o selo na listagem; desmarcar e conferir que o selo some.

**Acceptance Scenarios**:

1. **Given** um produto marcado para o Facebook/Instagram, **When** o vendedor abre a listagem de produtos, **Then** o selo "Facebook" aparece nesse produto, no mesmo estilo dos selos dos outros canais.
2. **Given** um produto não marcado, **When** o vendedor abre a listagem, **Then** o selo "Facebook" não aparece (ou aparece em estilo "inativo", seguindo o padrão já usado para canais sem anúncio).

---

### Edge Cases

- Produto marcado cuja categoria ou slug muda: o link no feed passa a apontar para a nova URL pública do produto (sempre gerada a partir dos dados atuais), e o identificador do item continua o mesmo para a Meta não duplicá-lo.
- Produto marcado que é excluído: deixa de constar no feed.
- Nenhum produto marcado: o feed é válido, porém vazio (apenas cabeçalho), sem erro.
- Textos com caracteres especiais (acentos, aspas, vírgulas, quebras de linha, emojis): o feed permanece válido e os textos chegam intactos à Meta.
- Descrição do produto vazia e sem descrição própria: o feed usa o nome do produto como descrição, porque a Meta exige descrição.
- Fotos com endereço relativo: o feed sempre envia endereços completos (absolutos) das fotos e do link do produto.
- Preço próprio de outros canais (Mercado Livre/Shopee): não influencia o feed — o Facebook usa o preço do site, porque a compra é finalizada no site.
- Falha ao gerar o feed (ex.: banco indisponível): o endereço responde com erro (não com um feed vazio), para que a Meta mantenha o catálogo anterior em vez de apagar todos os produtos.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST disponibilizar um endereço público e estável de feed de produtos, em formato aceito pelo catálogo da Meta, acessível sem login (a Meta o busca de forma automática).
- **FR-002**: O feed MUST conter somente os produtos marcados para o Facebook/Instagram.
- **FR-003**: Cada item do feed MUST conter: identificador estável (o mesmo enquanto o produto existir), título, descrição, disponibilidade ("em estoque" se estoque > 0, "fora de estoque" caso contrário), condição "novo", preço em reais (BRL) igual ao preço do produto no site, link absoluto para a página pública do produto, link absoluto da foto principal e marca "VoxelasDuo".
- **FR-004**: Cada item do feed SHOULD conter as fotos adicionais do produto (até o limite aceito pela Meta) e a categoria do produto.
- **FR-005**: O título do item MUST ser o título próprio do Facebook quando preenchido; caso contrário, o nome do produto. A descrição MUST seguir a mesma regra (descrição própria → descrição do site → nome do produto).
- **FR-006**: O sistema MUST respeitar os limites de tamanho de título e descrição da Meta, impedindo o salvamento de textos próprios acima do limite e, para textos do site acima do limite, truncando-os no feed.
- **FR-007**: O admin MUST oferecer, na edição e no cadastro de produto, dentro da seção "Canais de venda", a opção "Publicar no Facebook/Instagram" (desligada por padrão), além dos campos opcionais de título e descrição próprios do Facebook.
- **FR-008**: O sistema MUST impedir marcar para o Facebook/Instagram um produto sem nenhuma foto, com mensagem clara.
- **FR-009**: A listagem de produtos do admin MUST exibir o selo "Facebook" nos produtos marcados, no mesmo padrão visual dos selos de Mercado Livre e Shopee.
- **FR-010**: Em caso de falha ao montar o feed, o endereço MUST responder com erro (visível nas ferramentas de rede), nunca com um feed vazio.
- **FR-011**: Todos os textos novos da interface MUST seguir o padrão de internacionalização (i18n) já existente no projeto.
- **FR-012**: Alterações feitas no produto (preço, fotos, textos, estoque, marcação) MUST refletir no feed já na próxima requisição, sem ação manual.

### Key Entities

- **Produto** (existente): ganha a informação "publicar no Facebook/Instagram" (sim/não) e os textos próprios opcionais do Facebook (título e descrição). Continua sendo a fonte de preço, fotos, estoque, categoria e link.
- **Item do feed da Meta**: representação de um produto marcado no formato do catálogo — identificador, título, descrição, disponibilidade, condição, preço, link, fotos, marca e categoria. Não é armazenado; é gerado a cada leitura.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Depois de cadastrar o feed programado no catálogo, 100% dos produtos marcados aparecem no catálogo da Meta sem erros de campos obrigatórios no diagnóstico do catálogo.
- **SC-002**: O vendedor consegue colocar um produto existente no Facebook/Instagram em menos de 1 minuto (abrir o produto, ligar a opção, salvar).
- **SC-003**: Uma alteração de preço feita no admin aparece no catálogo da Meta até a próxima leitura programada, sem nenhum passo manual na Meta.
- **SC-004**: O catálogo passa a ter produtos suficientes para a loja do Facebook/Instagram ser enviada para análise.
- **SC-005**: O feed com todos os produtos do catálogo atual é gerado em poucos segundos, sem expirar a leitura da Meta.

## Assumptions

- Não há checkout na Meta: o método escolhido é "finalização da compra em outro site", e o link de cada item leva à página pública do produto no site VoxelasDuo.
- O preço enviado à Meta é o preço do produto no site (sem preço próprio de canal), porque a venda é concluída no site, sem comissão da Meta. O "a partir de R$ 40" fica apenas no texto chamativo.
- A leitura periódica do feed (frequência, horário) é configurada pelo vendedor no próprio catálogo da Meta; o sistema só precisa servir o feed atualizado.
- O feed é público, pois contém apenas informações já públicas no site (nome, preço, fotos, link).
- A marca de todos os itens é "VoxelasDuo" e a condição é sempre "novo".
- Produtos já existentes começam desmarcados; o vendedor escolhe um a um quais publicar.
- Fora de escopo: pixel da Meta/rastreamento de eventos, envio em tempo real pela API da Meta, botão/contato por WhatsApp (ainda sem número), Marketplace (classificados) do Facebook e OLX.
- A conclusão da configuração da loja e o envio para análise na Meta são feitos pelo vendedor, fora do sistema, depois que o catálogo tiver produtos.
