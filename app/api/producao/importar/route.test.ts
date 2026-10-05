import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErroBambu } from "@/lib/producao/bambu/cliente";
import { ConexaoIndisponivel } from "@/lib/producao/servico";

const { executarImportacao } = vi.hoisted(() => ({ executarImportacao: vi.fn() }));

vi.mock("@/lib/producao/servico", async () => {
  const real = await vi.importActual<typeof import("@/lib/producao/servico")>(
    "@/lib/producao/servico"
  );
  return { ...real, executarImportacao };
});

const { GET, POST } = await import("./route");

const SEGREDO = "segredo-do-cron";

function requisicao(autorizacao?: string): Request {
  return new Request("http://localhost/api/producao/importar", {
    headers: autorizacao ? { authorization: autorizacao } : {},
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = SEGREDO;
  executarImportacao.mockResolvedValue({ novas: 3, ignoradas: 47, paginas: 2 });
});

describe("autorização", () => {
  it("recusa sem o segredo do cron", async () => {
    const resposta = await GET(requisicao());

    expect(resposta.status).toBe(401);
    expect(executarImportacao).not.toHaveBeenCalled();
  });

  it("recusa com segredo errado", async () => {
    const resposta = await GET(requisicao("Bearer outro"));
    expect(resposta.status).toBe(401);
  });

  it("aceita GET (como o Vercel Cron chama) e POST com o mesmo segredo", async () => {
    await expect((await GET(requisicao(`Bearer ${SEGREDO}`))).status).toBe(200);
    await expect((await POST(requisicao(`Bearer ${SEGREDO}`))).status).toBe(200);
  });
});

describe("resultado", () => {
  it("devolve as contagens da importação", async () => {
    const resposta = await GET(requisicao(`Bearer ${SEGREDO}`));

    await expect(resposta.json()).resolves.toEqual({ novas: 3, ignoradas: 47, paginas: 2 });
    expect(executarImportacao).toHaveBeenCalledWith("automatica");
  });

  it("devolve 409 quando a conexão está ausente ou expirada, para a tela avisar", async () => {
    executarImportacao.mockRejectedValue(new ConexaoIndisponivel());

    const resposta = await GET(requisicao(`Bearer ${SEGREDO}`));

    expect(resposta.status).toBe(409);
    await expect(resposta.json()).resolves.toMatchObject({
      erro: "Conexão com a Bambu Lab ausente ou expirada.",
    });
  });

  it("repassa 401 da origem (token vencido) com a mensagem real", async () => {
    executarImportacao.mockRejectedValue(
      new ErroBambu(401, "Bambu Lab respondeu HTTP 401: token expired")
    );

    const resposta = await GET(requisicao(`Bearer ${SEGREDO}`));

    expect(resposta.status).toBe(401);
    await expect(resposta.json()).resolves.toMatchObject({
      erro: "Bambu Lab respondeu HTTP 401: token expired",
    });
  });

  it("traduz falha da origem em 502 sem esconder a mensagem", async () => {
    executarImportacao.mockRejectedValue(new ErroBambu(503, "Bambu Lab respondeu HTTP 503."));

    const resposta = await GET(requisicao(`Bearer ${SEGREDO}`));

    expect(resposta.status).toBe(502);
    await expect(resposta.json()).resolves.toMatchObject({
      erro: "Bambu Lab respondeu HTTP 503.",
    });
  });
});
