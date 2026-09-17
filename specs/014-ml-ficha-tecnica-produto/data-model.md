# Phase 1 Data Model: Ficha técnica opcional do produto

## Entidade: `FichaTecnicaProduto`

Novo campo opcional em `Produto` (`lib/models/produto.ts`), paralelo a `CustoProducao` e `EmbalagemEnvio` — nenhuma sobreposição com eles (research.md, Assumptions do spec.md).

```ts
export interface FichaTecnicaProduto {
  /** Altura do produto em si (não da embalagem de envio), em centímetros. */
  alturaCm?: number;
  /** Largura do produto em si, em centímetros. */
  larguraCm?: number;
  /** Comprimento do produto em si, em centímetros. */
  comprimentoCm?: number;
  /** Peso do produto em si, em gramas. */
  pesoGramas?: number;
  /** Material predominante do produto (texto livre, ex: "PLA", "Madeira"). */
  material?: string;
  /** O que acompanha o produto na embalagem (texto livre, uma linha por item). */
  itensInclusos?: string[];
}
```

Adicionado a `Produto`:

```ts
/** Ficha técnica opcional do produto (dimensões, peso, material, itens inclusos) — ausente = não preenchida (EDI-90). */
fichaTecnica?: FichaTecnicaProduto;
```

Todos os campos são **individualmente opcionais** — diferente de `EmbalagemEnvio`, onde os 4 campos são exigidos em bloco quando o objeto está presente. Aqui o vendedor pode preencher só o material, por exemplo (FR-002).

### Validação (`lib/produtos/validation.ts`)

Segue o padrão já usado por `validarEmbalagemEnvio`, mas validando cada campo numérico **individualmente quando presente**, sem exigir os demais:

- `alturaCm`, `larguraCm`, `comprimentoCm`, `pesoGramas`: quando presentes, devem ser número finito `> 0`.
- `material`: quando presente, string não vazia (mesmo padrão de `textoValido`).
- `itensInclusos`: quando presente, array de strings não vazias (mesmo padrão de `fotos`).
- Objeto `fichaTecnica` ausente ou `{}` é válido (nada preenchido).

## Mapeamento para atributos do Mercado Livre

Nova função `atributosFichaTecnica(fichaTecnica, atributosCategoria)` em `atributos.ts`, que recebe a ficha técnica do produto **e** a lista de atributos da categoria já resolvida (research.md #1), retornando dois grupos:

```ts
export interface ResultadoFichaTecnica {
  /** Atributos a enviar no item — só os campos preenchidos cuja categoria expõe o atributo correspondente. */
  attributes: AtributoItem[];
  /** Campos preenchidos sem atributo correspondente na categoria — vão para a descrição complementar. */
  paraDescricao: Array<{ rotulo: string; valor: string }>;
}
```

| Campo | ID do atributo | Formato do `value_name` (quando a categoria tem o atributo) |
| -- | -- | -- |
| `alturaCm` | `HEIGHT` | `"${alturaCm} cm"` |
| `larguraCm` | `WIDTH` | `"${larguraCm} cm"` |
| `comprimentoCm` | `LENGTH` | `"${comprimentoCm} cm"` |
| `pesoGramas` | `WEIGHT` | `"${pesoGramas} g"` |
| `material` | `MATERIAL` | `material` (texto livre) |
| `itensInclusos` | *(nenhum)* | sempre vai para `paraDescricao` |

"A categoria tem o atributo" é decidido consultando `GET /categories/{id}/attributes` (já buscado por `buscarAtributosObrigatorios`, mas sem filtrar só os obrigatórios) e checando se o `id` correspondente está presente na lista retornada.

## Descrição complementar

Nova função `aplicarFichaTecnicaNaDescricao(descricaoAtual: string, paraDescricao: Array<{rotulo: string; valor: string}>): string` em `anuncios.ts` (ou módulo próprio):

1. Localiza o marcador `"\n\n---\nFicha técnica:\n"` em `descricaoAtual`.
2. Se encontrado, corta tudo a partir dele — o texto antes do marcador é o "texto original" preservado.
3. Se `paraDescricao` estiver vazio, retorna só o texto original (sem o marcador) — permite "limpar" a ficha técnica se o vendedor apagar os campos.
4. Caso contrário, monta o bloco (`"- ${rotulo}: ${valor}"` por linha) e concatena: `` `${textoOriginal}\n\n---\nFicha técnica:\n${linhas.join("\n")}` ``.

Idempotente: aplicar duas vezes com os mesmos dados produz o mesmo resultado (FR-007).

## Fluxo de publicação e atualização

- `montarAtributos()` (em `anuncios.ts`) passa a também receber a ficha técnica do produto, calcular `atributosFichaTecnica()`, e:
  - concatenar `resultado.attributes` ao array de atributos existente (igual a `atributosEmbalagem`);
  - devolver também `resultado.paraDescricao`, para quem chama decidir o que fazer com a descrição (criação vs. atualização têm fluxos distintos de descrição).
- `criarAnuncio()`: monta a descrição final (`descricao do produto` + bloco de ficha técnica, se houver `paraDescricao`) numa única chamada `POST /items/{id}/description` (não precisa ler descrição existente — item é novo).
- `atualizarAtributosAnuncio()` (ou nova função irmã, ex: `atualizarFichaTecnicaAnuncio`): além do `PUT /items/{id}` de atributos já existente, quando houver `paraDescricao`, busca a descrição atual (`GET /items/{id}/description`), aplica `aplicarFichaTecnicaNaDescricao()`, e atualiza via `PUT /items/{id}/description`.

## Sem sobreposição com entidades existentes

| Entidade | Mede | Usado para |
| -- | -- | -- |
| `CustoProducao.pesoPecaGramas` | Peso da peça impressa, sem embalagem | Cálculo de custo/margem (EDI-92) — nunca vai para o anúncio |
| `EmbalagemEnvio` | Peso/dimensões da caixa pronta para envio | Cálculo de frete via `SELLER_PACKAGE_*` (EDI-96) |
| `FichaTecnicaProduto` (novo) | Peso/dimensões do produto em si, material, itens inclusos | Informação ao comprador via `HEIGHT`/`WIDTH`/`LENGTH`/`WEIGHT`/`MATERIAL` e/ou descrição (EDI-90) |
