import { beforeEach, describe, expect, it, vi } from "vitest";

const { conferirPendentesRecentes } = vi.hoisted(() => ({ conferirPendentesRecentes: vi.fn() }));
vi.mock("@/lib/pagamentos/verificacao", () => ({ conferirPendentesRecentes }));

const { GET } = await import("./route");

function chamar(authorization?: string) {
  return GET(
    new Request("http://localhost/api/pagamentos/conferir-pendentes", {
      headers: authorization ? { authorization } : {},
    })
  );
}

describe("GET /api/pagamentos/conferir-pendentes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "segredo";
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("sem o segredo → 401", async () => {
    expect((await chamar()).status).toBe(401);
    expect(conferirPendentesRecentes).not.toHaveBeenCalled();
  });

  it("com o segredo → resumo da conferência", async () => {
    conferirPendentesRecentes.mockResolvedValue({ conferidos: 2, pagos: 1, falhas: 0 });
    const resposta = await chamar("Bearer segredo");
    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toEqual({ conferidos: 2, pagos: 1, falhas: 0 });
  });

  it("falha → 500", async () => {
    conferirPendentesRecentes.mockRejectedValue(new Error("db"));
    expect((await chamar("Bearer segredo")).status).toBe(500);
  });
});
