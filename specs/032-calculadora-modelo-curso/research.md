# Research: Calculadora de preço no modelo do curso

## 1. Leitura do G-code só no navegador

- **Decision**: ler o arquivo com `File`/`Blob.slice` no cliente, sem dependência nova.
  - `.gcode` (texto, pode ter centenas de MB): lê só os primeiros 256 KB (bloco `; HEADER_BLOCK_START`) e os últimos 512 KB (bloco de configuração). Campos do Bambu Studio / Orca:
    - `; model printing time: 29m 6s; total estimated time: 35m 30s` → usa `total estimated time` (formato `1d 2h 3m 4s`).
    - `; estimated printing time (normal mode) = 1h 2m 3s` (Orca/Prusa) como alternativa.
    - `; total filament weight [g] : 7.12` → peso total.
    - `; filament used [g] = 5.10, 2.02` (quando existir) → peso por filamento.
    - `; filament_type = PLA;PETG` e `; filament_colour = #FFFFFF;#000000` → nome e cor das linhas.
  - `.gcode.3mf` (ZIP): lê o diretório central do ZIP pelo fim do arquivo, localiza `Metadata/slice_info.config` e descompacta só esse arquivo com `DecompressionStream("deflate-raw")` (nativo nos navegadores atuais). XML:
    - `<plate>` → `<metadata key="prediction" value="2130"/>` (segundos), `<metadata key="weight" value="7.12"/>`
    - `<filament id type color used_g used_m/>` → uma linha por filamento.
    - `<object ... skipped="false"/>` → quantidade de objetos = sugestão de peças por mesa.
    - Vários `<plate>`: o usuário escolhe a mesa num seletor.
  - Sem `slice_info.config` (projeto `.3mf` não fatiado): erro "exporte o arquivo fatiado (.gcode.3mf)".
- **Rationale**: nada vai para a API nem para o Blob (pedido do usuário, storage gratuito limitado); só a parte necessária do arquivo é lida, então arquivos grandes não travam a tela.
- **Alternatives**: JSZip (dependência nova, carrega o ZIP inteiro na memória) — rejeitado; upload para a API — rejeitado pelo usuário.
- **Parsers puros** (`interpretarCabecalhoGcode(texto)`, `interpretarSliceInfo(xml)`) ficam separados da leitura do arquivo, para testes em Vitest.

## 2. Tempo e peso são da mesa inteira

- **Decision**: em Impressão, "Peças por mesa", "Tempo de impressão" e os filamentos referem-se à **mesa** (o que o G-code traz). Custo de material/energia por unidade = mesa ÷ peças por mesa. Custos extras são por unidade.
- **Rationale**: é como o modelo do curso faz e é o que o G-code informa; elimina a duplicação atual (tempo por peça no custo + tempo da mesa cheia na produção).
- **Consequência**: a seção Produção no mês fica com horas/dia, dias/mês e peças no mês; peças por mesa e tempo da mesa vêm da Impressão.
- **Conversão de cálculos antigos**: se havia `producao.pecasPorMesa` e `horasMesaCheia` > 0 → peças = pecasPorMesa, tempo = horasMesaCheia, peso = pesoPeça × peças; senão peças = 1, tempo = tempo por peça, peso = peso da peça.

## 3. Modelo de custo próprio da calculadora

- **Decision**: novo módulo puro `lib/produtos/custoCalculadora.ts`; o `CustoProducao` do produto (usado pelo cadastro, produção e lista de preços) **não muda**.
  - Material = Σ filamentos (g × R$/kg ÷ 1000) × (1 + perda%) ÷ peças (ou o campo simples se a lista estiver vazia).
  - Energia = horas da mesa × kWh/h × R$/kWh ÷ peças.
  - Reserva de falha = (material + energia) × falha% (como as telas do curso: 2% de R$ 3,43 ≈ R$ 0,07).
  - Extras por categoria (Embalagem, Acabamento, Mão de obra, Outros) = Σ qtd × preço; lista vazia → campo simples de embalagem.
  - Desgaste da máquina = preço da impressora ÷ vida útil × horas da mesa ÷ peças (como o STL Seller; decisão do usuário em 2026-10-15).
- **Transformar em produto**: converte para `CustoProducao` com o mesmo total — peso total por peça, preço médio ponderado do kg, consumo/tarifa, embalagem, acabamento + outros + reserva de falha em `custoAcessorios`, mão de obra como 1 h × valor (R$ 0,01 se não houver, pois a validação exige > 0); impressora e vida útil iguais às da calculadora, tempo = horas da mesa ÷ peças.

## 4. Taxas de venda generalizadas

- **Decision**: estender as funções puras de `calculadoraRapida.ts` com `impostoPercentual` opcional (padrão 0) e manter `anuncioPercentual`; custos fixos por pedido do canal (frete grátis na venda direta, cupom próprio na Shopee) somam ao custo do pedido; percentuais do canal (comissão + campanha de destaque, ou taxa de pagamento) entram nas faixas.
- Novo módulo `lib/produtos/canaisCalculadora.ts`: monta, para cada canal (direta, shopee, mercadoLivre), `{ faixas, custoPedidoCentavos }` e o detalhamento do card "Total de taxas do canal".
- **Rationale**: as contas atuais (preço por margem, limite de anúncio, concorrente, kits, orçamento impresso) continuam as mesmas funções, só recebendo os novos termos — um lugar só para a regra.

## 5. Preço alvo e promoção

- **Decision**: um único preço alvo vale para todos os canais (é o preço que o comprador paga — normalmente o do concorrente). No modo Preço alvo, cada aba mostra o lucro nesse preço **e** o preço que daria a margem mínima ("para ganhar 25%, venda por R$ Y").
- Ads, kits, concorrente e orçamento continuam usando a margem mínima como referência; mês e potencial usam o preço praticado (alvo ou calculado).
- **Promoção**: o preço calculado/digitado é o que o comprador paga; a promoção só mostra o preço cheio a anunciar (`preço ÷ (1 − desconto)`), sem mudar o lucro.

## 6. Impressoras de referência

- **Decision**: lista fixa em `lib/produtos/impressoras.ts`: Bambu Lab A1 mini (0,08 kWh/h), A1 (0,11), P1S (0,13), X1 Carbon (0,15), Outra (digitar). Padrão: A1 (impressora da loja).

## 7. UI

- Seções recolhíveis com `<details>/<summary>` (sem JS extra, acessível); resumo em abas com `role="tablist"`. Layout: entradas à esquerda, resumo fixo (sticky) à direita no desktop; uma coluna no celular.
- `CalculadoraRapida.tsx` (1.285 linhas) é dividido em componentes por seção em `components/admin/calculadora/`; as contas saem para `lib/produtos/resultadoCalculadora.ts` (função pura testável que devolve tudo por canal).
- Textos do admin seguem inline em pt-BR (padrão atual do admin, sem i18n).
- Skill `frontend-design` invocada antes de implementar a UI (CLAUDE.md).

## 8. STL Seller (referência pedida pelo usuário)

- A calculadora do STL Seller (STLFLIX) considera energia, desgaste da máquina, taxa de falha e comissão do canal, com G-code. Desgaste incluído (FR-014). Gerador de anúncio por IA e buscador de tendências ficam fora desta feature (buscador: EDI-128).
