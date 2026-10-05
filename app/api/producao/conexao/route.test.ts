import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErroBambu } from "@/lib/producao/bambu/cliente";

const { login, solicitarCodigo, loginComCodigo, loginComTotp, buscarUserId } = vi.hoisted(() => ({
  login: vi.fn(),
  solicitarCodigo: vi.fn().mockResolvedValue(undefined),
  loginComCodigo: vi.fn(),
  loginComTotp: vi.fn(),
  buscarUserId: vi.fn().mockResolvedValue("1234"),
}));
const { buscarCredencialBambu, salvarCredencialBambu, removerCredencialBambu } = vi.hoisted(() => ({
  buscarCredencialBambu: vi.fn(),
  salvarCredencialBambu: vi.fn(),
  removerCredencialBambu: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/producao/bambu/cliente", async () => {
  const real = await vi.importActual<typeof import("@/lib/producao/bambu/cliente")>(
    "@/lib/producao/bambu/cliente"
  );
  return {
    ...real,
    criarClienteBambu: () => ({
      login,
      solicitarCodigo,
      loginComCodigo,
      loginComTotp,
      buscarUserId,
      listarTasks: vi.fn(),
      listarDispositivos: vi.fn(),
    }),
  };
});
vi.mock("@/lib/producao/credencial", async () => {
  const real = await vi.importActual<typeof import("@/lib/producao/credencial")>(
    "@/lib/producao/credencial"
  );
  return {
    ...real,
    buscarCredencialBambu,
    salvarCredencialBambu,
    removerCredencialBambu,
  };
});

const { GET, POST, DELETE } = await import("./route");

const EXPIRA_EM = new Date("2027-01-03T12:00:00.000Z");
const ATIVADO_EM = new Date("2026-10-05T12:00:00.000Z");

function requisicao(body: unknown): Request {
  return new Request("http://localhost/api/producao/conexao", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  salvarCredencialBambu.mockResolvedValue({
    _id: "bambu_lab",
    accessToken: "tok",
    expiraEm: EXPIRA_EM,
    ativadoEm: ATIVADO_EM,
    atualizadoEm: ATIVADO_EM,
  });
});

describe("GET", () => {
  it("nunca devolve o token, só o estado e as datas", async () => {
    buscarCredencialBambu.mockResolvedValue({
      _id: "bambu_lab",
      accessToken: "segredo-que-nao-pode-sair",
      expiraEm: EXPIRA_EM,
      ativadoEm: ATIVADO_EM,
      atualizadoEm: ATIVADO_EM,
    });

    const corpo = await (await GET()).json();

    expect(corpo.estado).toBe("ativa");
    expect(JSON.stringify(corpo)).not.toContain("segredo-que-nao-pode-sair");
    expect(corpo.accessToken).toBeUndefined();
  });

  it("informa ausente quando nunca houve conexão", async () => {
    buscarCredencialBambu.mockResolvedValue(null);
    await expect((await GET()).json()).resolves.toMatchObject({ estado: "ausente" });
  });

  it("informa expirada quando o token venceu", async () => {
    buscarCredencialBambu.mockResolvedValue({
      _id: "bambu_lab",
      accessToken: "tok",
      expiraEm: new Date("2026-01-01T00:00:00.000Z"),
      ativadoEm: ATIVADO_EM,
      atualizadoEm: ATIVADO_EM,
    });

    await expect((await GET()).json()).resolves.toMatchObject({ estado: "expirada" });
  });
});

describe("POST modo senha", () => {
  it("conecta e guarda o token quando a conta não exige verificação", async () => {
    login.mockResolvedValue({ tipo: "token", accessToken: "tok-123" });

    const resposta = await POST(
      requisicao({ modo: "senha", email: "eu@exemplo.com", senha: "123" })
    );

    expect(resposta.status).toBe(200);
    await expect(resposta.json()).resolves.toMatchObject({ estado: "ativa" });
    expect(salvarCredencialBambu).toHaveBeenCalledWith({
      accessToken: "tok-123",
      userId: "1234",
    });
  });

  it("responde 202 pedindo o código e já solicita o envio por e-mail", async () => {
    login.mockResolvedValue({ tipo: "precisaCodigo", metodo: "email" });

    const resposta = await POST(
      requisicao({ modo: "senha", email: "eu@exemplo.com", senha: "123" })
    );

    expect(resposta.status).toBe(202);
    await expect(resposta.json()).resolves.toMatchObject({ precisaCodigo: true, metodo: "email" });
    expect(solicitarCodigo).toHaveBeenCalledWith("eu@exemplo.com");
    expect(salvarCredencialBambu).not.toHaveBeenCalled();
  });

  it("no autenticador devolve a tfaKey e não pede código por e-mail", async () => {
    login.mockResolvedValue({ tipo: "precisaCodigo", metodo: "totp", tfaKey: "chave" });

    const resposta = await POST(
      requisicao({ modo: "senha", email: "eu@exemplo.com", senha: "123" })
    );

    expect(resposta.status).toBe(202);
    await expect(resposta.json()).resolves.toMatchObject({ metodo: "totp", tfaKey: "chave" });
    expect(solicitarCodigo).not.toHaveBeenCalled();
  });

  it("repassa o status real quando a origem recusa as credenciais", async () => {
    login.mockRejectedValue(new ErroBambu(401, "Bambu Lab respondeu HTTP 401: invalid"));

    const resposta = await POST(
      requisicao({ modo: "senha", email: "eu@exemplo.com", senha: "errada" })
    );

    expect(resposta.status).toBe(401);
    await expect(resposta.json()).resolves.toMatchObject({
      erro: "Bambu Lab respondeu HTTP 401: invalid",
    });
  });

  it("traduz falha da origem (5xx) em 502, preservando a mensagem com o status", async () => {
    login.mockRejectedValue(new ErroBambu(500, "Bambu Lab respondeu HTTP 500."));

    const resposta = await POST(
      requisicao({ modo: "senha", email: "eu@exemplo.com", senha: "123" })
    );

    expect(resposta.status).toBe(502);
    await expect(resposta.json()).resolves.toMatchObject({
      erro: "Bambu Lab respondeu HTTP 500.",
    });
  });

  it("exige e-mail e senha", async () => {
    const resposta = await POST(requisicao({ modo: "senha", email: "" }));
    expect(resposta.status).toBe(400);
  });
});

describe("POST modo codigo e token", () => {
  it("conecta com o código recebido por e-mail", async () => {
    loginComCodigo.mockResolvedValue({ tipo: "token", accessToken: "tok-codigo" });

    const resposta = await POST(
      requisicao({ modo: "codigo", email: "eu@exemplo.com", codigo: "123456" })
    );

    expect(resposta.status).toBe(200);
    expect(loginComCodigo).toHaveBeenCalledWith("eu@exemplo.com", "123456");
  });

  it("aceita token colado como alternativa de emergência", async () => {
    const resposta = await POST(requisicao({ modo: "token", accessToken: "  tok-colado  " }));

    expect(resposta.status).toBe(200);
    expect(salvarCredencialBambu).toHaveBeenCalledWith({ accessToken: "tok-colado" });
    expect(login).not.toHaveBeenCalled();
  });

  it("recusa token vazio", async () => {
    const resposta = await POST(requisicao({ modo: "token", accessToken: "   " }));
    expect(resposta.status).toBe(400);
  });

  it("conecta com o código do autenticador", async () => {
    loginComTotp.mockResolvedValue({ tipo: "token", accessToken: "tok-totp" });

    const resposta = await POST(requisicao({ modo: "totp", tfaKey: "chave", codigo: "654321" }));

    expect(resposta.status).toBe(200);
    expect(loginComTotp).toHaveBeenCalledWith("chave", "654321");
  });

  it("recusa modo desconhecido", async () => {
    const resposta = await POST(requisicao({ modo: "mágico" }));
    expect(resposta.status).toBe(400);
  });
});

describe("DELETE", () => {
  it("remove a credencial sem apagar as impressões", async () => {
    const resposta = await DELETE();

    expect(resposta.status).toBe(200);
    await expect(resposta.json()).resolves.toMatchObject({ estado: "ausente" });
    expect(removerCredencialBambu).toHaveBeenCalled();
  });
});
