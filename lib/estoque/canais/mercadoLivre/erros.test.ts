import { describe, expect, it } from "vitest";
import { erroMercadoLivre } from "./erros";

describe("erroMercadoLivre", () => {
  it("inclui o corpo da resposta na mensagem quando disponível", async () => {
    const resposta = {
      status: 400,
      text: async () => '{"message":"category_id not exists"}',
    } as Response;

    const erro = await erroMercadoLivre(resposta, "Falha ao criar anúncio no Mercado Livre");

    expect(erro.message).toBe(
      'Falha ao criar anúncio no Mercado Livre (HTTP 400): {"message":"category_id not exists"}'
    );
  });

  it("cai para mensagem só com o status quando não há corpo ou `.text()` falha", async () => {
    const resposta = { status: 500 } as Response;

    const erro = await erroMercadoLivre(resposta, "Falha ao consultar pedido no Mercado Livre");

    expect(erro.message).toBe("Falha ao consultar pedido no Mercado Livre (HTTP 500).");
  });
});
