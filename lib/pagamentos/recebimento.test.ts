import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/pedidos/repository", () => ({ colecaoPedidos: vi.fn() }));
vi.mock("./mercadopago", () => ({ buscarPagamento: vi.fn() }));

import { extrairRecebimento } from "./recebimento";

describe("extrairRecebimento", () => {
  it("separa a tarifa da loja dos juros pagos pelo cliente", () => {
    const r = extrairRecebimento({
      transaction_amount: 194.49,
      installments: 3,
      fee_details: [
        { type: "mercadopago_fee", amount: 9.69, fee_payer: "collector" },
        { type: "financing_fee", amount: 21.84, fee_payer: "payer" },
      ],
      transaction_details: { net_received_amount: 184.8 },
    });
    expect(r).toMatchObject({
      valorCentavos: 19449,
      taxaCentavos: 969,
      jurosClienteCentavos: 2184,
      cupomCentavos: 0,
      liquidoCentavos: 18480,
      parcelas: 3,
    });
  });

  it("sem líquido informado, calcula valor − tarifa", () => {
    const r = extrairRecebimento({ transaction_amount: 50, fee_details: [{ amount: 2.5, fee_payer: "collector" }] });
    expect(r.liquidoCentavos).toBe(4750);
    expect(r.parcelas).toBe(1);
  });
});
