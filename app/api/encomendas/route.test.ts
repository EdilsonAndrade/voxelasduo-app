import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { criarEncomenda, notificarAdminNovaEncomenda, enviarConfirmacaoEncomenda, enviarImagemEncomenda, removerFotoProduto } = vi.hoisted(() => ({
  criarEncomenda: vi.fn(),
  enviarImagemEncomenda: vi.fn(),
  removerFotoProduto: vi.fn().mockResolvedValue(undefined),
  notificarAdminNovaEncomenda: vi.fn().mockResolvedValue(undefined),
  enviarConfirmacaoEncomenda: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/encomendas/repository", () => ({ criarEncomenda }));
vi.mock("@/lib/email/resend", () => ({ notificarAdminNovaEncomenda, enviarConfirmacaoEncomenda }));
vi.mock("@/lib/storage/blob", () => ({ enviarImagemEncomenda, removerFotoProduto }));

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

function requisicaoMultipart(campos: Record<string, string>, imagens: File[]) {
  const dados = new FormData();
  Object.entries(campos).forEach(([campo, valor]) => dados.append(campo, valor));
  imagens.forEach((arquivo) => dados.append("imagens", arquivo));
  return new Request("http://localhost/api/encomendas", { method: "POST", body: dados });
}

function imagem(nome: string, tipo = "image/png", tamanho = 10) {
  return new File([new Uint8Array(tamanho)], nome, { type: tipo });
}

describe("POST /api/encomendas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    criarEncomenda.mockImplementation(async (dados) => ({
      ...dados,
      _id: new ObjectId(),
      criadoEm: new Date(),
    }));
    enviarImagemEncomenda.mockImplementation(async (arquivo: File) => `https://blob.example/encomendas/${arquivo.name}`);
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

  describe("com imagens (multipart)", () => {
    it("envia as imagens ao Blob e grava as URLs na encomenda", async () => {
      const resposta = await POST(requisicaoMultipart(payloadValido, [imagem("a.png"), imagem("b.jpg", "image/jpeg")]));

      expect(resposta.status).toBe(201);
      expect(enviarImagemEncomenda).toHaveBeenCalledTimes(2);
      expect(criarEncomenda).toHaveBeenCalledWith({
        ...payloadValido,
        imagens: ["https://blob.example/encomendas/a.png", "https://blob.example/encomendas/b.jpg"],
      });
    });

    it("aceita multipart sem imagens", async () => {
      const resposta = await POST(requisicaoMultipart(payloadValido, []));

      expect(resposta.status).toBe(201);
      expect(criarEncomenda).toHaveBeenCalledWith(payloadValido);
    });

    it("responde 400 com mais de 3 imagens e não envia nada", async () => {
      const arquivos = ["1", "2", "3", "4"].map((n) => imagem(`${n}.png`));
      const resposta = await POST(requisicaoMultipart(payloadValido, arquivos));

      expect(resposta.status).toBe(400);
      expect((await resposta.json()).erros.imagens).toBeDefined();
      expect(enviarImagemEncomenda).not.toHaveBeenCalled();
      expect(criarEncomenda).not.toHaveBeenCalled();
    });

    it("responde 400 para formato não aceito", async () => {
      const resposta = await POST(requisicaoMultipart(payloadValido, [imagem("doc.pdf", "application/pdf")]));

      expect(resposta.status).toBe(400);
      expect((await resposta.json()).erros.imagens).toBeDefined();
    });

    it("responde 400 para imagem acima de 5MB", async () => {
      const resposta = await POST(requisicaoMultipart(payloadValido, [imagem("grande.png", "image/png", 5 * 1024 * 1024 + 1)]));

      expect(resposta.status).toBe(400);
      expect((await resposta.json()).erros.imagens).toBeDefined();
    });

    it("responde 502 quando o Blob falha e não grava a encomenda", async () => {
      enviarImagemEncomenda.mockRejectedValue(new Error("blob fora"));
      const resposta = await POST(requisicaoMultipart(payloadValido, [imagem("a.png")]));

      expect(resposta.status).toBe(502);
      expect(criarEncomenda).not.toHaveBeenCalled();
    });

    it("remove as imagens do Blob quando a gravação falha", async () => {
      criarEncomenda.mockRejectedValue(new Error("mongo fora"));

      await expect(POST(requisicaoMultipart(payloadValido, [imagem("a.png")]))).rejects.toThrow("mongo fora");
      expect(removerFotoProduto).toHaveBeenCalledWith("https://blob.example/encomendas/a.png");
    });
  });
});
