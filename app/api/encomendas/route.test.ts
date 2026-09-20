import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { criarEncomenda, notificarAdminNovaEncomenda, enviarConfirmacaoEncomenda } = vi.hoisted(() => ({
  criarEncomenda: vi.fn(),
  notificarAdminNovaEncomenda: vi.fn().mockResolvedValue(undefined),
  enviarConfirmacaoEncomenda: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/encomendas/repository", () => ({ criarEncomenda }));
vi.mock("@/lib/email/resend", () => ({ notificarAdminNovaEncomenda, enviarConfirmacaoEncomenda }));

const { POST } = await import("./route");

const payloadValido = {
  nome: "Maria Silva",
  email: "Maria@Exemplo.com",
  telefone: "(19) 98157-5723",
  descricao: "Quero um chaveiro do meu gato em 3D.",
};

function requisicao(corpo: unknown) {
  return new Request("http://localhost/api/encomendas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof corpo === "string" ? corpo : JSON.stringify(corpo),
  });
}

describe("POST /api/encomendas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    criarEncomenda.mockImplementation(async (dados) => ({
      ...dados,
      _id: new ObjectId(),
      criadoEm: new Date(),
    }));
  });

  it("grava a encomenda, avisa o admin e confirma ao cliente", async () => {
    const resposta = await POST(requisicao(payloadValido));

    expect(resposta.status).toBe(201);
    expect(criarEncomenda).toHaveBeenCalledWith(payloadValido);
    expect(notificarAdminNovaEncomenda).toHaveBeenCalledTimes(1);
    expect(enviarConfirmacaoEncomenda).toHaveBeenCalledTimes(1);
  });

  it("responde 400 com os erros por campo e não grava nada", async () => {
    const resposta = await POST(requisicao({ ...payloadValido, telefone: "", descricao: "oi" }));

    expect(resposta.status).toBe(400);
    const { erros } = await resposta.json();
    expect(erros.telefone).toBeDefined();
    expect(erros.descricao).toBeDefined();
    expect(criarEncomenda).not.toHaveBeenCalled();
    expect(enviarConfirmacaoEncomenda).not.toHaveBeenCalled();
  });

  it("responde 400 para corpo que não é JSON", async () => {
    const resposta = await POST(requisicao("não é json"));
    expect(resposta.status).toBe(400);
    expect(criarEncomenda).not.toHaveBeenCalled();
  });

  it("ignora em silêncio quando o campo-armadilha vem preenchido", async () => {
    const resposta = await POST(requisicao({ ...payloadValido, website: "http://spam.example" }));

    expect(resposta.status).toBe(201);
    expect(criarEncomenda).not.toHaveBeenCalled();
    expect(notificarAdminNovaEncomenda).not.toHaveBeenCalled();
    expect(enviarConfirmacaoEncomenda).not.toHaveBeenCalled();
  });
});
