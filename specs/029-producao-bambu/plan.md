# Implementation Plan: Controle de produção com o histórico da Bambu Lab

**Branch**: `edilsonaandrade/edi-127-controle-de-producao-historico-de-impressoes-da-bambu-lab-a1` | **Date**: 2026-10-05 | **Spec**: [spec.md](./spec.md) | **Linear**: EDI-127

## Summary

O admin ganha a área `/admin/producao`, que importa o histórico de impressão da nuvem da Bambu Lab (API não oficial) e o transforma em três coisas: lista de produção, apuração de custo por produto e entrada de estoque confirmada.

A importação é um cliente HTTP puro (`fetch` injetado, testável sem rede) que lê `GET /v1/user-service/my/tasks` paginado por `after` e grava na coleção `impressoes`, com dedupe por `taskId` (índice único). A credencial fica em `credenciaisCanais` com `_id: "bambu_lab"` — a mesma coleção que já guarda o Mercado Livre.

O vínculo entre impressão e catálogo é declarado pelo vendedor por **nome de arquivo → parte do produto** (`vinculosProducao`), com rendimento por placa e quantas unidades da parte compõem um produto acabado. Peça única é o caso de uma parte só. Como o vínculo é resolvido por `nomeArquivo` na leitura (nunca copiado para a impressão), criar ou corrigir um vínculo vale retroativamente sem reescrever nada.

A apuração é módulo **puro**: reaproveita `calcularCustoProducao` trocando peso e tempo pelos reais, somando filamento/depreciação/energia por parte e mão de obra/embalagem/acessórios uma única vez por produto (research #4). Nada é persistido e nada do cadastro é alterado pela importação — aplicar o apurado ao produto é ação explícita que usa o `PATCH /api/produtos/[id]` já existente.

O estoque só muda por `POST /api/producao/lancamentos`: atômico via filtro `quantidadeLancada: { $lte: rendimento − quantidade }` (mesmo padrão de `abaterEstoqueAtomico`), consumindo o saldo das partes em FIFO e propagando aos canais por `sincronizarAnuncioProduto`, que herda a fila de pendências e o retry. Impressão com `fim` anterior a `credencial.ativadoEm` é histórico e nunca oferece lançamento.

## Technical Context

- **Stack**: TypeScript, Next.js 16.3 (App Router), React 19, CSS Modules, MongoDB, Vitest. **Sem dependência nova** — `fetch` nativo basta.
- **Integração**: `https://api.bambulab.com` (não oficial). Login com código por e-mail, TOTP com CSRF via `bambulab.com/api/csrf`, e "colar token" como alternativa de emergência. Token ~3 meses, sem renovação confiável (research #1).
- **Fora do escopo**: MQTT/tempo real (exige processo contínuo, vai para Vercel Services em outro ticket), FTPS/`.3mf`, cadastro de insumos por material.
- **Reuso obrigatório**: `calcularCustoProducao`, `sincronizarAnuncioProduto`, `PATCH /api/produtos/[id]`, padrão de cron de `app/api/estoque/sincronizar/route.ts`, padrão de `_id` fixo de `credenciaisCanais`.
- **Cuidado 1**: `proxy.ts` precisa de `/api/producao/:path*` no matcher, **exceto** `importar`, que valida `CRON_SECRET` por conta própria — a rota do cron não pode exigir sessão.
- **Cuidado 2**: `nomeArquivo` em rota dinâmica chega percent-encoded no Next 16 — decodificar antes de consultar (mesmo tropeço já registrado em `[categoria]`/`[slug]`).
- **Cuidado 3**: `gramas` da task é da **placa inteira**, não da peça. Dividir pelo rendimento é a diferença entre custo certo e custo N× errado.
- **Cuidado 4**: embalagem e mão de obra **não** podem ser somadas por parte (inflaria o custo de um produto de 3 partes em 3 embalagens).
- **i18n**: não há biblioteca; textos em pt-BR inline, no padrão existente.
- **Design**: skill `frontend-design` invocada antes de escrever a tela (regra do CLAUDE.md).

## Constitution Check

`constitution.md` ainda é o template. Aplicamos as regras do CLAUDE.md:

- Erros da API aparecem com o status HTTP real da origem, inclusive na aba Network — nada mascarado.
- Não commitar: apenas sugerir a mensagem.
- Textos novos em pt-BR, no padrão existente.
- Não subir container nem navegador para testar: entregar Test Guide.

✅ Sem violações.

## Project Structure

```text
lib/models/credenciaisCanal.ts                          # + CredencialBambuLab (_id: "bambu_lab") (alterado)
lib/models/producao.ts                                  # Impressao, VinculoArquivoProduto, LancamentoProducao, ImportacaoProducao (novo)
lib/producao/bambu/cliente.ts (+ .test.ts)              # login/código/tasks/devices, fetch injetado, erro com status real (novo)
lib/producao/bambu/mapear.ts (+ .test.ts)               # hit da API → Impressao (duração, resultado, cores, gramas por slot) (novo)
lib/producao/credencial.ts                              # ler/gravar/remover a credencial, estado derivado (novo)
lib/producao/repository.ts                              # impressoes/vinculos/lancamentos/importacoes + índices (novo)
lib/producao/importacao.ts (+ .test.ts)                 # paginação incremental, dedupe, marcação de histórico (novo)
lib/producao/apuracao.ts (+ .test.ts)                   # módulo PURO: custo por parte e por produto, falha, perda, saldo (novo)
lib/producao/lancamento.ts (+ .test.ts)                 # saldo lançável, FIFO por parte, consumo atômico (novo)
app/api/producao/conexao/route.ts (+ test)              # GET estado · POST conectar · DELETE remover (novo)
app/api/producao/conexao/codigo/route.ts                # POST reenviar código (novo)
app/api/producao/importar/route.ts (+ test)             # GET|POST com CRON_SECRET (novo)
app/api/producao/importar-agora/route.ts                # POST pelo painel (novo)
app/api/producao/impressoes/route.ts                    # GET lista filtrada (novo)
app/api/producao/pendentes/route.ts                     # GET nomes sem vínculo agrupados (novo)
app/api/producao/vinculos/route.ts (+ test)             # GET lista · POST criar/atualizar (novo)
app/api/producao/vinculos/[nomeArquivo]/route.ts        # DELETE remover (decodificar o param!) (novo)
app/api/producao/apuracao/route.ts                      # GET apuração por produto (novo)
app/api/producao/lancamentos/route.ts (+ test)          # POST entrada de estoque idempotente (novo)
app/api/producao/importacoes/route.ts                   # GET últimas execuções (novo)
app/admin/(painel)/producao/page.tsx                    # server component: conexão, pendentes, impressões, apuração (novo)
components/admin/producao/ConexaoBambu.tsx              # conectar/código/colar token/reconectar (novo)
components/admin/producao/ListaImpressoes.tsx           # tabela + filtros + lançar no estoque (novo)
components/admin/producao/MapearArquivo.tsx             # produto, parte, rendimento, unidades por produto (novo)
components/admin/producao/ApuracaoProdutos.tsx          # apurado vs cadastrado, parcial, aplicar ao cadastro (novo)
components/admin/producao/producao.module.css           # tabela/cartões mobile (novo)
app/admin/(painel)/layout.tsx                           # + link "Produção" no menu (alterado)
lib/auth/rotaProtegida.ts                               # + /api/producao (exceto importar) (alterado)
proxy.ts                                                # + "/api/producao/:path*" no matcher (alterado)
vercel.ts                                               # + cron 05:00 UTC para /api/producao/importar (alterado)
```

## Phases

- **Phase 0**: [research.md](./research.md) — autenticação, paginação, onde guardar a credencial, o que é custo por parte vs por produto, valor do filamento, marcação de histórico, idempotência do estoque, cron, miniatura, estratégia de teste.
- **Phase 1**: [data-model.md](./data-model.md) · [contracts/producao-api.md](./contracts/producao-api.md) · [quickstart.md](./quickstart.md)

## Riscos

- **API não oficial**: pode mudar ou endurecer o login sem aviso. Mitigação: cliente isolado num módulo, "colar token" como saída, e erro sempre com o status real — a importação falha visível, nunca silenciosa, e o histórico já gravado permanece.
- **Token expira em ~3 meses** sem renovação confiável. Mitigação: estado `expirada` visível na tela e aviso após falha do cron (FR-003, US6).
- **Peso é estimativa do fatiador**, imprecisa em troca de cor. Aceito na spec; o apurado é comparativo, nunca aplicado automaticamente.
- **Lançamento multipartes não é transacional** entre as partes. Mitigação: uma atualização atômica por impressão, documento de lançamento com o consumo registrado e erro real na tela. Volume esperado é de poucas impressões por dia.
- **Primeira importação pode ser longa** (histórico inteiro). Mitigação: paginação com limite de páginas por execução e retomada pelo cursor — o que já entrou não se perde.
- **Nome de arquivo repetido entre produtos diferentes** (ex: `Plate 1`): o vínculo por nome classificaria errado. Mitigação: a tela mostra o nome com quantidade de impressões e data antes de mapear, e o aviso de reclassificação ao alterar vínculo existente.

## Post-design Constitution Check

✅ Mantido: sem dependência nova, nenhuma alteração em `Produto`/`CustoProducao`, nenhuma fórmula de custo duplicada, nenhuma escrita paralela de estoque (tudo por `sincronizarAnuncioProduto`), erros com status HTTP real.
