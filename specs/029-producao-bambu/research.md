# Phase 0 — Research: Controle de produção com o histórico da Bambu Lab

**Feature**: 029-producao-bambu · **Linear**: EDI-127

Todas as incógnitas do Technical Context foram resolvidas aqui. Nenhum `NEEDS CLARIFICATION` permanece.

---

## #1 — Autenticação na Bambu Cloud (API não oficial)

**Decisão**: fluxo de duas etapas no admin, com "colar token" como alternativa de emergência.

1. `POST https://api.bambulab.com/v1/user-service/user/login` com `{ account, password }`.
   - Resposta com `accessToken` → conta sem verificação em duas etapas, conexão concluída.
   - Resposta pedindo código (`loginType` de verificação) → o admin pede o código de 6 dígitos.
2. `POST .../v1/user-service/user/login` com `{ account, code }` → `accessToken`.
3. Contas com autenticador (TOTP) exigem CSRF: `GET https://bambulab.com/api/csrf` (204, cookie `bbl_csrf_token`) e `POST https://bambulab.com/api/sign-in/tfa` com o token no header `x-bbl-csrf-token` **e** no cookie.

**Rationale**: o caminho por código de e-mail é o mais estável e cobre a conta do solicitante. O caminho TOTP é implementado porque o fabricante pode passar a exigi-lo, mas não é o caminho principal. O campo "colar token" existe porque esta é uma API não oficial: se o login quebrar do lado do fabricante, o vendedor extrai o token do navegador e a importação continua funcionando (FR-004 pede erro real, não paralisia).

**Alternatives considered**: só e-mail/senha (quebra em conta com 2FA obrigatório); só colar token (exige o vendedor mexer no DevTools a cada 3 meses); automatizar a leitura do e-mail para pegar o código (dependência frágil e invasiva).

**Expiração**: o token vale ~3 meses e `POST /v1/user-service/user/refreshtoken` responde 401 na prática — a renovação automática **não** é implementada. A conexão guarda `expiraEm` estimado (emissão + 90 dias) e o admin mostra o aviso de reconexão (FR-003).

---

## #2 — Listagem do histórico e paginação

**Decisão**: `GET /v1/user-service/my/tasks?deviceId=&after=<id>&limit=50`, com duas estratégias:

- **Primeira carga**: pagina do mais recente para o mais antigo até a API devolver página vazia.
- **Cargas seguintes (incremental)**: para na primeira página em que todas as tasks já existem no banco, com um limite de páginas por execução para não estourar o tempo da function.

**Rationale**: a API devolve `{ total, hits[] }` ordenado do mais recente para o mais antigo, e `after` é o cursor. Parar quando a página já é conhecida mantém o cron diário barato (volume real: poucas impressões/dia).

**Alternatives considered**: `GET /v1/user-service/my/task/{id}` e `GET /v1/iot-service/api/user/task/{id}` — ambos respondem 403 mesmo para tasks do próprio usuário, portanto inutilizáveis.

**Campos usados de cada hit**: `id`, `title`, `plateName`, `cover`, `status` (2 concluída / 3 interrompida), `startTime`, `endTime`, `weight`, `length`, `costTime`, `material`, `deviceId`, `deviceName`, `amsDetailMapping[]` (`filamentType`, `targetColor`, `weight`).

**Duração efetiva** (FR-006): `endTime − startTime`, não `costTime`. Quando `endTime` estiver ausente, a impressão é gravada sem duração e fica fora dos cálculos de tempo.

---

## #3 — Onde guardar a conexão

**Decisão**: reaproveitar a coleção `credenciaisCanais`, que já segue o padrão de `_id` fixo por serviço externo. Novo tipo `CredencialBambuLab` com `_id: "bambu_lab"`.

**Rationale**: a coleção existe exatamente para isso (hoje só o Mercado Livre a usa) e já está fora de qualquer resposta ao navegador (FR-033). Não cria coleção nem padrão novo.

**Alternatives considered**: variável de ambiente (impossível — o token é renovado pelo vendedor a cada 3 meses, sem deploy); coleção `configuracoes` (é para configuração de negócio, não para segredo).

**Campo `ativadoEm`**: gravado na primeira conexão. Serve para marcar o histórico (ver #6).

---

## #4 — Custo apurado: o que é por parte e o que é por produto

**Decisão**: a apuração separa os componentes que escalam com a impressão dos que são por unidade acabada.

| Componente | Origem na apuração |
|---|---|
| Filamento | por parte — gramas da placa ÷ rendimento × valor por grama do cadastro |
| Depreciação da impressora | por parte — duração real ÷ rendimento × (preço ÷ vida útil) |
| Energia | por parte — duração real ÷ rendimento × consumo × tarifa |
| Mão de obra | **uma vez por produto**, do cadastro |
| Embalagem | **uma vez por produto**, do cadastro |
| Acessórios | **uma vez por produto**, do cadastro |

Custo apurado do produto = Σ (componentes de cada parte × unidades da parte por produto) + mão de obra + embalagem + acessórios.

**Rationale**: somar embalagem e mão de obra por parte inflaria o custo de um produto de 3 partes em 3 embalagens — erro grosseiro. Filamento, energia e depreciação, ao contrário, são proporcionais ao que a máquina de fato fez.

**Reuso**: `calcularCustoProducao` (`lib/produtos/custoProducao.ts`) continua a única fórmula de custo. A apuração monta um `CustoProducao` com `pesoPecaGramas` e `tempoImpressaoHoras` apurados e zera mão de obra/embalagem/acessórios nas partes não-principais, somando-os uma única vez. Nenhuma regra de custo é duplicada.

**Taxa de falha**: não entra no custo apurado por peça (o apurado já é o custo do que realmente saiu); ela é exibida como indicador (FR-024) e pode ser aplicada ao cadastro pelo vendedor (FR-027).

---

## #5 — Valor do filamento por material

**Decisão**: usar `precoCarreteCentavos` / `pesoCarreteGramas` do cadastro do produto, independentemente do material relatado pela impressora.

**Rationale**: o projeto não tem cadastro de carretéis/filamentos por material — o valor do filamento é um campo do produto. Criar um cadastro de insumos é escopo próprio e maior que esta feature. O material e a cor relatados são **gravados e exibidos** (serve para auditoria e para a futura fase de consumo por carretel), mas não escolhem preço.

**Impacto na spec**: FR-021 fala em "valor do filamento do material correspondente"; na prática o correspondente disponível é o do cadastro do produto. A média ponderada por peças produzidas (FR-021) continua valendo quando o mesmo produto foi impresso em jobs diferentes.

**Alternatives considered**: tabela de preço por material nas configurações globais (adia a decisão de onde deve morar o cadastro de insumos e cria dois lugares com preço de filamento).

---

## #6 — Como marcar o histórico anterior à ativação

**Decisão**: `historico = (fim da impressão) < (conexao.ativadoEm)`. Determinístico, idempotente e independente de qual importação trouxe o registro.

**Rationale**: a alternativa óbvia ("tudo que veio na primeira importação") quebra se a primeira importação for interrompida e retomada, ou se o vendedor reconectar a conta. Comparar a data resolve nos dois casos.

**Consequência** (FR-040): impressão histórica conta para custo, gramas, horas e falhas, e nunca oferece lançamento de estoque.

---

## #7 — Lançamento de estoque idempotente

**Decisão**: a impressão guarda `quantidadeLancada`. O lançamento é um `findOneAndUpdate` atômico com filtro `quantidadeLancada: { $lte: rendimento − quantidade }`, seguido de `$inc` no estoque do produto e de `sincronizarAnuncioProduto`.

**Rationale**: mesmo padrão já provado em `abaterEstoqueAtomico` (`lib/produtos/repository.ts:273`) — a condição vai no filtro, resolvendo concorrência sem transação multi-documento. Como `rendimento` e `quantidade` são conhecidos antes da query, o filtro é um comparativo simples e exato.

**Multipartes**: lançar N conjuntos consome o saldo das partes por ordem de impressão (mais antiga primeiro), uma atualização atômica por impressão, e grava um documento em `lancamentosProducao` com o que foi consumido de cada parte. Não há transação entre as partes: se uma etapa falhar, o documento de lançamento registra o que já foi consumido e a tela mostra o erro real. Aceitável no volume esperado (poucas impressões/dia) e preferível a uma transação multi-documento por causa do custo operacional no Atlas compartilhado.

**Propagação aos canais** (FR-039/FR-041): o lançamento chama `sincronizarAnuncioProduto` exatamente como o abatimento por venda, herdando a fila de pendências e o retry com backoff já existentes. Nenhuma lógica de canal é duplicada.

---

## #8 — Importação automática

**Decisão**: `GET|POST /api/producao/importar` protegida por `Bearer ${CRON_SECRET}`, e entrada em `vercel.ts` com `schedule: "0 5 * * *"`.

**Rationale**: copia o padrão de `app/api/estoque/sincronizar/route.ts` (GET para o cron, POST para disparo manual, mesma autenticação). O plano Hobby da Vercel só permite cron diário, e 05:00 UTC não concorre com os jobs de 03:00 e 04:00 já existentes.

**Disparo manual pelo admin** (FR-009) é uma rota separada, `POST /api/producao/importar-agora`, protegida pela sessão do painel (`proxy.ts`), para não expor o `CRON_SECRET` ao navegador.

---

## #9 — Imagem de pré-visualização

**Decisão (revista em campo)**: copiar a miniatura para o nosso Blob na importação, em `producao/<taskId>.<ext>`, e exibir a cópia. A URL da origem fica guardada só como fonte da cópia.

**Decisão original, e por que estava errada**: a primeira versão exibia direto a URL de `cover`, no raciocínio de que a miniatura era conveniência visual e não valia o custo de armazenamento. Duas coisas derrubaram isso no uso real:

1. A URL do CDN é **assinada e expira** — poucas horas depois as imagens passaram a responder "não autorizado" e sumiram da tela.
2. A miniatura virou **dado de trabalho**, não enfeite: boa parte dos títulos vem do perfil de fatiamento ("0.2mm layer, 2 walls, 15% infill") e não identifica a peça. Sem a foto, não há como mapear o arquivo ao produto.

**Implementação**: `copiarMiniatura` (`lib/producao/miniaturas.ts`) roda ao fim de cada importação, em lotes de 40, sobre as impressões que ainda não têm cópia. Valida tipo e tamanho e devolve `undefined` em qualquer falha — perder uma miniatura nunca interrompe a importação nem esconde a impressão.

**Limite conhecido**: miniatura cuja URL já expirou antes da primeira cópia é irrecuperável; aquela impressão fica sem foto.

---

## #10 — Testes sem a API real

**Decisão**: Vitest com `fetch` injetado por parâmetro no cliente da Bambu, e fixtures de resposta real (uma página de tasks concluída, uma interrompida, uma com `amsDetailMapping` multicolor, um 401 de token expirado).

**Rationale**: o projeto já usa Vitest sem biblioteca de mock de rede. Receber o `fetch` como dependência mantém o cliente testável sem rede e sem credencial, o que importa porque a API é não oficial e não pode ser chamada em CI.

**Lógica pura testada sem banco**: conversão de hit em impressão, cálculo de duração, apuração de custo por parte e por produto, unidades acabadas limitadas pela parte mais escassa, perda e taxa de falha, saldo lançável.
