# Contrato — API de produção (EDI-127)

Todas as rotas sob `/api/producao/*` ficam atrás do painel autenticado, exceto `importar`, que usa `CRON_SECRET`. O matcher de `proxy.ts` precisa incluir `/api/producao/:path*`.

Erros sempre devolvem `{ "erro": "<mensagem com o status real da origem>" }` com o status HTTP correspondente — nada é mascarado (FR-004, regra 3 do CLAUDE.md).

---

## `GET /api/producao/conexao`

Estado da conexão com a nuvem do fabricante. **Nunca** devolve o token (FR-033).

```json
{ "estado": "ativa", "expiraEm": "2027-01-03T12:00:00.000Z", "ativadoEm": "2026-10-05T12:00:00.000Z" }
```

`estado`: `"ausente" | "ativa" | "expirada"`.

---

## `POST /api/producao/conexao`

Conecta a conta. Três formas, discriminadas por `modo`:

```json
{ "modo": "senha", "email": "...", "senha": "..." }
{ "modo": "codigo", "email": "...", "codigo": "123456" }
{ "modo": "token", "accessToken": "..." }
```

- `200` `{ "estado": "ativa", "expiraEm": "..." }` — conectado.
- `202` `{ "precisaCodigo": true, "metodo": "email" | "totp" }` — a conta exige verificação; o admin pede o código e repete com `modo: "codigo"`.
- `401` `{ "erro": "Bambu Lab recusou as credenciais (HTTP 401)." }`
- `502` `{ "erro": "Bambu Lab respondeu HTTP 500." }` — falha do lado do fabricante.

`POST /api/producao/conexao/codigo` com `{ "email": "..." }` solicita o reenvio do código (`200` vazio ou o erro real).

---

## `DELETE /api/producao/conexao`

Remove a credencial guardada. `200` `{ "estado": "ausente" }`. Não apaga impressões já importadas.

---

## `GET /api/producao/importar`  ·  `POST /api/producao/importar`

Importação pelo cron. `Authorization: Bearer ${CRON_SECRET}` obrigatório.

```json
{ "novas": 3, "ignoradas": 47, "paginas": 2 }
```

- `401` sem o segredo.
- `409` `{ "erro": "Conexão com a Bambu Lab ausente ou expirada." }` — sem credencial válida.
- `502` com a mensagem e o status real quando a origem falha; o que já foi gravado permanece (FR-008).

Agendado em `vercel.ts`: `{ path: "/api/producao/importar", schedule: "0 5 * * *" }`.

---

## `POST /api/producao/importar-agora`

Disparo manual pelo painel (sessão do admin, sem `CRON_SECRET`). Mesma resposta de `importar` (FR-009).

---

## `GET /api/producao/impressoes`

Lista paginada para a tela. Filtros (FR-031): `de`, `ate` (ISO), `produtoId`, `impressoraId`, `resultado` (`concluida|interrompida`), `vinculo` (`comVinculo|semVinculo`), `pagina`, `porPagina` (padrão 50).

```json
{
  "total": 128,
  "impressoes": [
    {
      "id": "...",
      "taskId": "...",
      "nomeArquivo": "vaso_base_v2",
      "coverUrl": "https://...",
      "resultado": "concluida",
      "inicio": "2026-10-04T18:02:11.000Z",
      "fim": "2026-10-04T22:31:40.000Z",
      "duracaoSegundos": 16169,
      "gramas": 182,
      "material": "PLA",
      "cores": ["#0A0A0A"],
      "impressoraNome": "A1",
      "historico": false,
      "quantidadeLancada": 0,
      "saldoLancavel": 6,
      "vinculo": { "produtoId": "...", "produtoNome": "Vaso Espiral 15cm", "parte": "Base", "rendimentoPorPlaca": 6, "unidadesPorProduto": 1 }
    }
  ]
}
```

`vinculo` ausente = impressão pendente de mapeamento. `saldoLancavel` é `0` para impressão histórica, interrompida ou já lançada.

---

## `GET /api/producao/pendentes`

Nomes de arquivo sem vínculo, agrupados (FR-012).

```json
{ "pendentes": [ { "nomeArquivo": "chaveiro_gato", "impressoes": 3, "gramasTotal": 174, "ultimaEm": "2026-10-03T..." } ] }
```

---

## `GET /api/producao/vinculos`  ·  `POST /api/producao/vinculos`

`POST` cria ou atualiza o vínculo de um nome de arquivo (FR-013):

```json
{ "nomeArquivo": "vaso_base_v2", "produtoId": "...", "parte": "Base", "rendimentoPorPlaca": 6, "unidadesPorProduto": 1 }
```

- `200` com o vínculo salvo.
- `400` `{ "erro": "Rendimento por placa deve ser um inteiro maior que zero." }`
- `404` `{ "erro": "Produto não encontrado." }`

`DELETE /api/producao/vinculos/[nomeArquivo]` remove o vínculo; as impressões voltam a pendentes (FR-017). O `nomeArquivo` vai percent-encoded no caminho e **precisa ser decodificado** na rota (params de rota chegam codificados no Next 16).

---

## `GET /api/producao/apuracao`

Apuração por produto (FR-019 a FR-025). Filtro opcional `produtoId`, `de`, `ate`.

```json
{
  "produtos": [
    {
      "produtoId": "...",
      "produtoNome": "Vaso Espiral 15cm",
      "unidadesAcabadas": 4,
      "gramasPorPeca": 212.5,
      "horasPorPeca": 5.1,
      "custoApuradoCentavos": 3180,
      "custoCadastradoCentavos": 2995,
      "diferencaCentavos": 185,
      "parcial": false,
      "partesSemDados": [],
      "taxaFalhaObservada": 0.11,
      "amostra": 9,
      "amostraPequena": true,
      "perdaObservadaPercentual": 13.4,
      "partes": [
        { "parte": "Base", "unidadesProduzidas": 10, "gramasPorUnidade": 30.3, "horasPorUnidade": 0.75, "custoParteCentavos": 420, "excedente": 6 },
        { "parte": "Tampa", "unidadesProduzidas": 4, "gramasPorUnidade": 182.2, "horasPorUnidade": 4.35, "custoParteCentavos": 2340, "excedente": 0 }
      ]
    }
  ],
  "resumo": { "gramasPerdidosEmFalhas": 310, "valorPerdidoEmFalhasCentavos": 3100, "impressoesSemVinculo": 2 }
}
```

Produto sem produção não aparece na lista — a tela mostra "sem dados de produção" (FR-019).

---

## `POST /api/producao/lancamentos`

Entrada de estoque confirmada (FR-032 a FR-039).

```json
{ "produtoId": "...", "quantidade": 5, "quantidadePerdida": 1 }
```

- `200` `{ "lancamentoId": "...", "estoqueAtual": 12, "consumo": [ { "impressaoId": "...", "parte": "Base", "unidades": 5 } ] }`
- `400` `{ "erro": "Quantidade deve ser um inteiro maior que zero." }`
- `409` `{ "erro": "Saldo insuficiente: há 4 conjuntos completos disponíveis." }` — inclui o caso de a parte mais escassa limitar (FR-038) e o de tentativa de lançar além do rendimento (FR-036).
- `409` `{ "erro": "Produto não possui vínculo de produção." }`

A resposta reflete o estoque **após** o `$inc`. A propagação aos canais é best-effort com fila, igual ao abatimento por venda — uma falha de canal não falha o lançamento (FR-041).

---

## `GET /api/producao/importacoes?limite=1`

Última execução, para o aviso na tela (FR-011).

```json
{ "importacoes": [ { "origem": "automatica", "iniciadoEm": "...", "novas": 3, "ignoradas": 47, "erro": null } ] }
```

---

## O que esta feature **não** expõe

- Nenhuma rota devolve `accessToken` ou senha (FR-033).
- Nenhuma rota de produção altera cadastro de produto. Aplicar o custo apurado (FR-027) é feito pela tela chamando o `PATCH /api/produtos/[id]` já existente.
- Nenhuma rota altera estoque sem `POST /api/producao/lancamentos` (FR-037/FR-039).
