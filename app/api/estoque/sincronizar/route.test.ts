import { beforeEach, describe, expect, it, vi } from "vitest";

const { listarElegiveisParaRetry } = vi.hoisted(() => ({
  listarElegiveisParaRetry: vi.fn(),
}));
const { reprocessarPendencia } = vi.hoisted(() => ({
  reprocessarPendencia: vi.fn(),
}));

vi.mock("@/lib/estoque/fila", () => ({ listarElegiveisParaRetry }));
vi.mock("@/lib/estoque/sincronizacao", () => ({ reprocessarPendencia }));

const { GET, POST } = await import("./route");

function requisicao(auth?: string): Request {
  return new Request("http://localhost/api/estoque/sincronizar", {
    method: "GET",
    headers: auth ? { authorization: auth } : {},
  });
}

describe("GET|POST /api/estoque/sincronizar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "segredo-teste";
  });

  it("401 quando o segredo do cron está ausente ou incorreto", async () => {
    const resposta = await GET(requisicao());
    expect(resposta.status).toBe(401);
    expect(listarElegiveisParaRetry).not.toHaveBeenCalled();

    const respostaErrada = await GET(requisicao("Bearer errado"));
    expect(respostaErrada.status).toBe(401);
  });

  it("reprocessa cada item elegível e soma sincronizados/falharam", async () => {
    listarElegiveisParaRetry.mockResolvedValue([{ _id: "1" }, { _id: "2" }, { _id: "3" }]);
    reprocessarPendencia
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const resposta = await POST(requisicao("Bearer segredo-teste"));
    const corpo = await resposta.json();

    expect(resposta.status).toBe(200);
    expect(corpo).toEqual({ processados: 3, sincronizados: 2, falharam: 1 });
  });
});
