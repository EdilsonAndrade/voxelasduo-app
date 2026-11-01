# Research: Frete no checkout

## 1. Fonte do preço do frete
- **Decision**: valor fixo por serviço, configurado no admin (PAC R$ 19,90, SEDEX R$ 25,50 como padrão).
- **Rationale**: não há contrato com os Correios (a API CWS exige credenciais de contrato) e o usuário recusou o Melhor Envio por enquanto.
- **Alternatives considered**: API dos Correios (exige contrato), Melhor Envio (adiado), tabela por faixa de peso/UF (o usuário preferiu fixo por ora).

## 2. Preparação para cálculo futuro
- **Decision**: `calcularOpcoesFrete({ config, cep, pacotes, calculadora? })`. `calculadora` é uma interface opcional `CalculadoraFrete` que devolve centavos ou `null`. Só é chamada quando todos os itens têm `embalagemEnvio`; se devolver `null` ou lançar erro, o serviço usa o valor fixo. A origem fica registrada (`fixo` | `calculado` | `gratis`).
- **Rationale**: um único ponto de troca; a rota de opções e a criação do pedido usam a mesma função, então o valor exibido e o cobrado não divergem.
- **Alternatives considered**: duplicar o cálculo no cliente (rejeitado: o preço não pode vir do navegador).

## 3. Integridade do valor (cliente não altera o preço)
- **Decision**: o checkout envia `frete: { servico, valorCentavos }`. O servidor recalcula; se `valorCentavos` divergir do vigente, responde 409 `{ codigo: "frete_divergente", opcoes }` e não cria o pedido. Se bater, grava o valor do servidor.
- **Rationale**: atende FR-005/FR-006: nunca cobra diferente do exibido e nunca aceita preço do navegador.
- **Alternatives considered**: ignorar o valor do cliente e cobrar o vigente (poderia cobrar diferente do que o cliente viu).

## 4. Armazenamento da configuração
- **Decision**: novo documento `_id: "frete"` na coleção `configuracoes`, com `pacCentavos`, `sedexCentavos` e `atualizadoEm`. Na ausência do documento valem os valores de `FRETE_PADRAO`.
- **Rationale**: segue o padrão de `taxasCanais`, sem migração.

## 5. Total do pedido
- **Decision**: `valorTotal = subtotal + frete.valorCentavos`; o subtotal é derivado dos itens.
- **Rationale**: `app/api/pagamentos/route.ts` e o `PagamentoBrick` já cobram `valorTotal`, então nada muda no pagamento. Pedidos antigos sem `frete` continuam válidos.

## 6. Textos / I18N
- **Decision**: rótulos pt-BR em constantes (`ROTULO_SERVICO_FRETE`), no padrão atual do projeto (`LABEL_STATUS`, `LABEL_CANAL`).
- **Rationale**: o projeto não usa biblioteca de i18n; os textos ficam centralizados para uma tradução futura.

## 7. Rota pública de opções
- **Decision**: `POST /api/frete` recebe `{ cep, itens }` e devolve as opções. Fica fora do matcher do `proxy.ts`, logo é pública como o checkout.
- **Rationale**: o corpo já leva CEP e itens, que a calculadora futura vai precisar.
