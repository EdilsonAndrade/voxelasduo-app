import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { assinaturaWebhookValida } from "./webhook";

const SECRET = "segredo-de-teste";

function assinar(dataId: string, requestId: string, ts: string, secret = SECRET): string {
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const hash = createHmac("sha256", secret).update(manifest).digest("hex");
  return `ts=${ts},v1=${hash}`;
}

describe("assinaturaWebhookValida", () => {
  it("aceita uma assinatura corretamente calculada", () => {
    const ts = "1700000000";
    const xSignature = assinar("123456", "req-1", ts);

    expect(
      assinaturaWebhookValida({
        xSignature,
        xRequestId: "req-1",
        dataId: "123456",
        secret: SECRET,
      })
    ).toBe(true);
  });

  it("rejeita quando o secret usado para assinar é diferente", () => {
    const ts = "1700000000";
    const xSignature = assinar("123456", "req-1", ts, "outro-segredo");

    expect(
      assinaturaWebhookValida({
        xSignature,
        xRequestId: "req-1",
        dataId: "123456",
        secret: SECRET,
      })
    ).toBe(false);
  });

  it("rejeita quando o dataId usado na validação não é o mesmo assinado", () => {
    const ts = "1700000000";
    const xSignature = assinar("123456", "req-1", ts);

    expect(
      assinaturaWebhookValida({
        xSignature,
        xRequestId: "req-1",
        dataId: "999999",
        secret: SECRET,
      })
    ).toBe(false);
  });

  it("rejeita quando o header x-signature está ausente", () => {
    expect(
      assinaturaWebhookValida({
        xSignature: undefined,
        xRequestId: "req-1",
        dataId: "123456",
        secret: SECRET,
      })
    ).toBe(false);
  });

  it("rejeita um header malformado", () => {
    expect(
      assinaturaWebhookValida({
        xSignature: "isso-nao-e-uma-assinatura-valida",
        xRequestId: "req-1",
        dataId: "123456",
        secret: SECRET,
      })
    ).toBe(false);
  });
});
