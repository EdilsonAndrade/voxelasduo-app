# Data Model: Romaneios de consignação

## Coleção `romaneios` (nova)

```ts
type OrigemItem = "produto" | "tempoImpressao" | "livre";
type FormaPagamento = "pix" | "dinheiro" | "cartao" | "transferencia" | "outro";
type StatusLugar = "aberto" | "acertado";

interface ItemRomaneio {
  id: string;                 // estável (uuid do cliente)
  origem: OrigemItem;
  origemId?: string;          // produtoId ou id do plano; ausente em "livre"
  nome: string;               // cópia
  precoCentavos: number;      // cópia, editável, inteiro ≥ 0
  levada: number;             // inteiro ≥ 1
  vendida: number;            // inteiro ≥ 0
  devolvida: number;          // inteiro ≥ 0; vendida + devolvida ≤ levada
}

interface Pagamento {
  id: string;
  valorCentavos: number;      // inteiro > 0
  data: string;               // "YYYY-MM-DD"
  forma: FormaPagamento;
  observacao?: string;
}

interface Lugar {
  id: string;
  nome: string;               // obrigatório
  contato?: string;
  levadoPor?: string;
  status: StatusLugar;
  acertadoEm?: string;        // "YYYY-MM-DD", só quando acertado
  itens: ItemRomaneio[];
  pagamentos: Pagamento[];
}

interface Romaneio {
  _id?: ObjectId;
  nome: string;               // obrigatório, até 120
  dataSaida: string;          // "YYYY-MM-DD"
  observacao?: string;        // até 500
  lugares: Lugar[];           // 1..20
  criadoEm: Date;
  atualizadoEm: Date;
}
```

## Derivados (não gravados)

- `noLugar = levada − vendida − devolvida`
- Lugar: `pecas = Σ levada`, `valorCentavos = Σ levada × preço`, `vendidoCentavos = Σ vendida × preço`, `pagoCentavos = Σ pagamentos`, `aReceberCentavos = max(0, vendido − pago)`, `pagoAMaisCentavos = max(0, pago − vendido)`, `pecasNoLugar = Σ noLugar`, `temAcerto = alguma vendida/devolvida > 0 ou pagamento`.
- Romaneio: somas dos lugares; `status = acertado` se todos os lugares acertados.

## Validação

- Romaneio: nome, data válida, 1–20 lugares, ao menos 1 item no total.
- Lugar: nome (até 80), ids únicos, até 100 itens e 50 pagamentos.
- Item: nome (até 120), preço inteiro ≥ 0, levada inteiro 1–9999, vendida/devolvida inteiros ≥ 0 com soma ≤ levada; `origemId` obrigatório (ObjectId) quando origem ≠ livre.
- Pagamento: valor inteiro > 0, data válida, forma da lista.
- Lugar acertado sem `acertadoEm` recebe a data de hoje; aberto perde `acertadoEm`.

## Transições

`aberto → acertado` (fechar acerto ou Pago na hora) · `acertado → aberto` (reabrir).
