# Phase 1 — Data Model: Controle de produção com o histórico da Bambu Lab

**Feature**: 029-producao-bambu · **Linear**: EDI-127

Convenções do projeto mantidas: valores monetários em **centavos**, datas em `Date`, `_id` fixo (string) para documentos de instância única, `ObjectId` para os demais.

---

## 1. `CredencialBambuLab` — coleção `credenciaisCanais` (já existente)

Novo tipo na coleção que hoje guarda só o Mercado Livre. `_id` fixo, um único documento.

| Campo | Tipo | Observações |
|---|---|---|
| `_id` | `"bambu_lab"` | chave fixa |
| `accessToken` | `string` | nunca sai em resposta ao navegador (FR-033) |
| `userId` | `string?` | identificador do usuário na nuvem do fabricante; guardado para a fase de tempo real |
| `expiraEm` | `Date` | estimado em emissão + 90 dias (não há renovação confiável) |
| `ativadoEm` | `Date` | primeira conexão; define o que é histórico (research #6) |
| `atualizadoEm` | `Date` | última reconexão |

**Estado derivado** (nunca persistido): `ausente` quando não há documento, `expirada` quando `expiraEm <= agora`, senão `ativa`.

---

## 2. `Impressao` — coleção `impressoes` (nova)

Uma por trabalho de impressão trazido da nuvem do fabricante.

| Campo | Tipo | Observações |
|---|---|---|
| `_id` | `ObjectId` | |
| `taskId` | `string` | id de origem; **índice único** (FR-007) |
| `nomeArquivo` | `string` | `title` da origem; chave do vínculo |
| `nomePlaca` | `string?` | `plateName`, quando houver |
| `coverUrl` | `string?` | miniatura servida pelo CDN do fabricante (research #9) |
| `resultado` | `"concluida" \| "interrompida"` | mapeado de `status` 2/3 |
| `inicio` | `Date` | |
| `fim` | `Date?` | ausente em registro incompleto |
| `duracaoSegundos` | `number?` | `fim − inicio` (FR-006); ausente sem `fim` |
| `gramas` | `number?` | `weight` da placa inteira, não por peça |
| `comprimentoMm` | `number?` | `length` |
| `estimativaSegundos` | `number?` | `costTime`, guardado só para comparar com o real |
| `material` | `string?` | ex: `PLA` |
| `cores` | `string[]` | cores dos slots usados, de `amsDetailMapping` |
| `gramasPorSlot` | `{ material?: string; cor?: string; gramas?: number }[]` | detalhamento por slot, para a fase de consumo por carretel |
| `impressoraId` | `string?` | `deviceId` |
| `impressoraNome` | `string?` | `deviceName` |
| `historico` | `boolean` | `fim < credencial.ativadoEm` (FR-040) |
| `quantidadeLancada` | `number` | padrão `0`; usado na idempotência do estoque (FR-034/FR-036) |
| `quantidadePerdida` | `number` | padrão `0`; diferença declarada pelo vendedor (FR-033) |
| `importadoEm` | `Date` | |

**Índices**: `{ taskId: 1 }` único; `{ nomeArquivo: 1 }`; `{ inicio: -1 }`; `{ resultado: 1, inicio: -1 }`.

**Regras**

- `gramas` ausente ou `0` → fora de todo cálculo de custo e de perda, sinalizada na lista (edge case).
- `resultado: "interrompida"` → não conta como peça produzida (FR-022); entra só nos indicadores de perda (FR-024/FR-026).
- `historico: true` → nunca oferece lançamento de estoque (FR-040).
- O vínculo **não** é copiado para cá: é resolvido por `nomeArquivo` a cada leitura, de modo que criar ou corrigir um vínculo vale retroativamente sem reescrever impressões (FR-016).

---

## 3. `VinculoArquivoProduto` — coleção `vinculosProducao` (nova)

A ponte declarada pelo vendedor. Um documento por nome de arquivo.

| Campo | Tipo | Observações |
|---|---|---|
| `_id` | `ObjectId` | |
| `nomeArquivo` | `string` | **índice único** — a chave do vínculo (FR-016) |
| `produtoId` | `ObjectId` | produto do catálogo |
| `parte` | `string` | rótulo livre: `"Peça única"`, `"Base"`, `"Tampa"` (FR-013/FR-014) |
| `rendimentoPorPlaca` | `number` | inteiro ≥ 1 — unidades da parte por placa |
| `unidadesPorProduto` | `number` | inteiro ≥ 1 — quantas da parte entram em 1 produto acabado (padrão `1`) |
| `criadoEm` / `atualizadoEm` | `Date` | |

**Índices**: `{ nomeArquivo: 1 }` único; `{ produtoId: 1 }`.

**Regras**

- Vários vínculos podem apontar para o mesmo `produtoId`, cada um com uma `parte` distinta (FR-015).
- Peça única = um único vínculo do produto, com `parte` padrão e `unidadesPorProduto: 1` (FR-014).
- `produtoId` apontando para produto removido → vínculo órfão: o nome volta à lista de pendentes (edge case).
- Alterar `produtoId`/`parte` reclassifica todas as impressões do nome, com aviso na interface (FR-017).

---

## 4. `LancamentoProducao` — coleção `lancamentosProducao` (nova)

Rastro de cada entrada de estoque originada da produção.

| Campo | Tipo | Observações |
|---|---|---|
| `_id` | `ObjectId` | |
| `produtoId` | `ObjectId` | |
| `quantidade` | `number` | unidades acabadas lançadas no estoque |
| `quantidadePerdida` | `number` | declarada como perda no mesmo lançamento |
| `consumo` | `{ impressaoId: ObjectId; parte: string; unidades: number }[]` | o que foi consumido de cada impressão (FIFO por parte) |
| `usuarioEmail` | `string?` | quem confirmou |
| `criadoEm` | `Date` | |

**Índices**: `{ produtoId: 1, criadoEm: -1 }`; `{ "consumo.impressaoId": 1 }`.

---

## 5. `ImportacaoProducao` — coleção `importacoesProducao` (nova)

Resultado de cada execução, para exibir a última (FR-011).

| Campo | Tipo | Observações |
|---|---|---|
| `_id` | `ObjectId` | |
| `origem` | `"manual" \| "automatica"` | |
| `iniciadoEm` / `terminadoEm` | `Date` | |
| `novas` / `ignoradas` / `paginas` | `number` | |
| `erro` | `string?` | mensagem com o status HTTP real (FR-004) |

**Índice**: `{ iniciadoEm: -1 }`.

---

## 6. Apuração por produto (derivada, nunca persistida)

Calculada a partir de impressões + vínculos + cadastro do produto. Vive em módulo puro, testável sem banco.

**Por parte**

- `unidadesProduzidas` = Σ (`rendimentoPorPlaca` das impressões concluídas)
- `gramasPorUnidade` = Σ `gramas` ÷ `unidadesProduzidas`
- `horasPorUnidade` = Σ `duracaoSegundos` ÷ 3600 ÷ `unidadesProduzidas`
- `custoParteCentavos` = filamento + depreciação + energia (research #4)

**Por produto**

- `unidadesAcabadas` = ⌊ min sobre as partes de (`unidadesProduzidas` ÷ `unidadesPorProduto`) ⌋ (FR-022)
- `excedentePorParte` = sobra de cada parte além das unidades acabadas
- `custoApuradoCentavos` = Σ (`custoParteCentavos` × `unidadesPorProduto`) + mão de obra + embalagem + acessórios do cadastro (FR-020)
- `parcial` = `true` quando alguma parte mapeada não tem impressão concluída; `partesSemDados: string[]` (FR-023)
- `gramasPorPeca` / `horasPorPeca` = somas ponderadas pelas `unidadesPorProduto`
- `taxaFalhaObservada` = interrompidas ÷ total; `amostra` = total; `amostraPequena` = total < 10 (FR-024)
- `perdaObservadaPercentual` = `gramasPorPeca` ÷ `pesoPecaGramas` do cadastro − 1 (FR-025)
- `saldoLancavel` por parte = `rendimentoPorPlaca − quantidadeLancada − quantidadePerdida`, somente em impressões concluídas e não históricas

**Sem produção** → a apuração devolve "sem dados" explícito, nunca zero (FR-019, edge case de produto nunca impresso).

---

## 7. O que **não** muda

- `Produto` e `CustoProducao` (`lib/models/produto.ts`) permanecem **intactos**: nenhum campo novo. O custo cadastrado continua sendo a fonte de preço (FR-029/FR-030).
- `calcularCustoProducao` / `calcularCustoCaixa` permanecem a única fórmula de custo.
- Aplicar o apurado ao cadastro (FR-027) usa o `PATCH /api/produtos/[id]` já existente, com os campos de `custoProducao` — sem rota nova e sem caminho paralelo de escrita.
- A entrada de estoque reaproveita `sincronizarAnuncioProduto`, herdando fila e retry (FR-041).
