# Phase 0 Research: Ficha técnica opcional do produto para anúncios do Mercado Livre

## 1. Quais atributos do Mercado Livre correspondem à ficha técnica do produto

**Decisão**: Mapear os campos da ficha técnica para os seguintes atributos de categoria, quando existirem:

| Campo da ficha técnica | Atributo do Mercado Livre | Tipo |
| -- | -- | -- |
| Altura do produto | `HEIGHT` | `number_unit` |
| Largura do produto | `WIDTH` | `number_unit` |
| Comprimento do produto | `LENGTH` | `number_unit` |
| Peso do produto | `WEIGHT` | `number_unit` |
| Material | `MATERIAL` | `string` (com lista de sugestões, texto livre aceito) |
| Itens inclusos | *(nenhum atributo padrão)* | — sempre vai para a descrição |

**Rationale**: Testado com o token real da conta contra `GET /categories/{id}/attributes` em 5 categorias reais do site (`MLB271708` "Decoração", `MLB270294` "Vaso Geométrico decoração", `MLB439316` "Chaveiro Personalizado", `MLB271427` "Porta Copos", `MLB271146` "Suporte Celular"):

- `HEIGHT`/`WIDTH`/`LENGTH`/`WEIGHT`/`MATERIAL` existem em algumas categorias e não em outras — nenhuma categoria testada tinha todos os cinco (ex: "Suporte Celular" só tem `MATERIAL`; "Chaveiro Personalizado" não tem `WEIGHT`/`LENGTH`). Confirma a necessidade de checar a existência de cada atributo por categoria antes de enviar (FR-004), igual ao padrão já usado por `buscarAtributosObrigatorios`, mas sem o filtro `tags.required` (esses atributos são opcionais: `tags: {}` nos 5 casos testados).
- Não existe um atributo padrão para "itens inclusos" em nenhuma categoria testada — esse campo sempre vai para a descrição complementar (FR-005).
- **`PACKAGE_HEIGHT`/`PACKAGE_WIDTH`/`PACKAGE_LENGTH`/`PACKAGE_WEIGHT`** também existem nessas categorias, mas com `tags: { hidden: true, read_only: true }` — não podem ser definidos por `POST`/`PUT /items`, são gerenciados pelo próprio Mercado Livre. **Não confundir com `SELLER_PACKAGE_*`** (usado em `atributosEmbalagem()`, EDI-96): são atributos diferentes, com nomes parecidos, para o mesmo conceito de "embalagem de envio" — mas `PACKAGE_*` (sem `SELLER_`) é somente leitura, e `SELLER_PACKAGE_*` é o que a conta consegue de fato preencher.

**Alternatives considered**: Mapear "quaisquer atributos opcionais aceitos pela categoria" dinamicamente (sem lista fixa) — mais completo, mas exigiria um editor de atributos genérico na UI (nome + tipo variável por categoria); rejeitado por escopo (ver spec.md, Assumptions) — os 5 campos fixos cobrem o que o ticket original (EDI-90) pede.

## 2. Formato de valor aceito pelos atributos `number_unit` (HEIGHT/WIDTH/LENGTH/WEIGHT)

**Decisão**: Enviar sempre como `value_name: "<número> <unidade>"` (ex: `"20 cm"`, `"500 g"`), nunca só o número — mesmo formato já usado por `atributosEmbalagem()` (EDI-96).

**Rationale**: Testado via `POST /items/validate` (dry-run, não persiste) na categoria `MLB270294`: enviar `WIDTH` sem unidade (`"15"`) retorna o aviso `item.attributes.omitted` — *"Attribute WIDTH with value 15 was omitted. The provided unit is not valid."* — e o atributo é descartado silenciosamente do restante da validação. Os mesmos atributos enviados com unidade (`"20 cm"`, `"500 g"`, `"10 cm"`) não geraram nenhum aviso. Confirma que a lição já aprendida em EDI-96 para `SELLER_PACKAGE_*` vale igualmente aqui.

**Alternatives considered**: Nenhuma — já é o padrão estabelecido no projeto para atributos `number_unit`.

## 3. Formato de valor aceito por `MATERIAL`

**Decisão**: Enviar sempre como `value_name` (texto livre), nunca `value_id` — mesmo quando o valor não constar na lista de sugestões da categoria.

**Rationale**: `MATERIAL` tem `value_type: "string"` (não `"list"`) em todas as categorias testadas, mas vem acompanhado de uma lista de `values` (sugestões, ex: "Alumínio", "Cerâmica", "Madeira"). Testado via `POST /items/validate`: enviar `"PLA (impressão 3D)"` — fora de qualquer lista de sugestão observada — não gerou nenhum erro/aviso relacionado a `MATERIAL` (só os já esperados de `BRAND`/`MODEL` ausentes, que não fazem parte deste teste). Isso é coerente com `valorPadraoAtributo()` já existente, que só trata como lista fechada (`value_id` obrigatório) quando `value_type === "list"`.

**Alternatives considered**: Restringir a UI às sugestões da categoria (like um `<select>`) — rejeitado: a lista de sugestões varia por categoria e o material real de uma peça impressa em 3D (ex: PLA, PETG, resina) normalmente não está nela; texto livre é mais fiel ao produto real e ao que a API aceita.

## 4. Onde persistir "itens inclusos" e os campos sem atributo de categoria correspondente

**Decisão**: Concatenar um bloco de texto complementar ao final da `description` do anúncio, delimitado por um marcador fixo reconhecível (`"\n\n---\nFicha técnica:\n"`), contendo os campos de ficha técnica preenchidos que não tiverem atributo de categoria correspondente (sempre "itens inclusos"; mais os demais campos apenas quando a categoria não expuser o atributo, ex: `MATERIAL` ausente na categoria).

Para atualizar sem duplicar (FR-007, idempotência): antes de montar a nova descrição, buscar a descrição atual (`GET /items/{id}/description`), localizar o marcador `"\n\n---\nFicha técnica:\n"` — se existir, cortar tudo a partir dele (preservando o texto original do vendedor antes do marcador); se não existir, usar a descrição inteira como texto original. Concatenar o texto original preservado com o bloco novo gerado a partir dos valores atuais.

**Rationale**: A descrição é um recurso separado do item (`GET/POST /items/{id}/description`, já usado em `criarAnuncio()` só para `POST` na criação) — não existe hoje nenhuma leitura ou atualização desse recurso no projeto. Testado com `GET /items/MLB5205046421/description`: retorna `{ text, plain_text, last_updated, ... }`, confirmando que dá para ler o texto atual antes de decidir o que sobrescrever. Um marcador fixo e sempre no final é a forma mais simples de tornar a operação idempotente sem precisar guardar separadamente "o texto original do vendedor" em outro lugar do banco.

**Alternatives considered**:
- Guardar o texto original do vendedor num campo separado no produto (`descricao`) e sempre remontar a descrição do zero a partir dele + bloco de ficha técnica — mais robusto (não depende de parsing de marcador), mas o campo `descricao` do produto já existe e é a fonte da verdade local; o parsing por marcador evita duplicar esse dado e ainda funciona corretamente mesmo que o vendedor edite a descrição direto no Mercado Livre entre uma atualização e outra (o texto antes do marcador sempre reflete o que está lá agora).
- Não persistir "itens inclusos" em lugar nenhum quando a categoria não tiver atributo — rejeitado, violaria FR-005 (não pode se perder).

## 5. Atualização retroativa de anúncio já publicado (attributes + description)

**Decisão**: Estender `atualizarAtributosAnuncio()` (ou criar uma função irmã) para, além do `PUT /items/{id}` com `attributes` já existente, também atualizar a `description` (via `PUT /items/{id}/description`, já que o item já tem uma descrição criada) quando houver campos de ficha técnica sem atributo correspondente na categoria.

**Rationale**: Mesmo padrão já validado em EDI-95/EDI-96 (`PUT /items/{id}` parcial funciona para atributos; aqui, `PUT` no sub-recurso de descrição, não no item). Reaproveita a resolução de categoria já existente (`resolverCategoriaOuFalhar`) e a montagem de atributos (`montarAtributos`), apenas estendendo-as com os novos campos de ficha técnica.

**Alternatives considered**: Nenhuma — segue o padrão já estabelecido no código para "corrigir sem republicar".

## 6. Validação de valores inválidos (zero/negativo/não numérico)

**Decisão**: Reaproveitar o mesmo padrão de validação já usado para `EmbalagemEnvio` (peso/dimensões da embalagem de envio, EDI-96) para os novos campos numéricos da ficha técnica (altura, largura, comprimento, peso do produto): rejeitar no cadastro valores `<= 0` ou não numéricos, sem impedir salvar os demais campos.

**Rationale**: Consistência com a validação já existente em `lib/produtos/validation.ts` (a confirmar estrutura exata na Fase 1); mesma motivação (FR-008 do EDI-96) se aplica aqui (FR-003 deste ticket).

**Alternatives considered**: Nenhuma — segue o padrão já estabelecido.
