import { describe, expect, it, vi } from "vitest";
import { criarClienteBambu, ErroBambu } from "./cliente";

function resposta(corpo: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  return new Response(JSON.stringify(corpo), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
}

describe("login", () => {
  it("devolve o token quando a conta não exige verificação", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      resposta({ accessToken: "tok-123", refreshToken: "ref-123" })
    );
    const cliente = criarClienteBambu({ fetchImpl });

    const resultado = await cliente.login("eu@exemplo.com", "senha");

    expect(resultado).toEqual({ tipo: "token", accessToken: "tok-123", refreshToken: "ref-123" });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.bambulab.com/v1/user-service/user/login");
    expect(JSON.parse(init.body as string)).toEqual({
      account: "eu@exemplo.com",
      password: "senha",
    });
  });

  it("sinaliza verificação por e-mail quando não vem token nem tfaKey", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(resposta({ loginType: "verifyCode" }));
    const cliente = criarClienteBambu({ fetchImpl });

    expect(await cliente.login("eu@exemplo.com", "senha")).toEqual({
      tipo: "precisaCodigo",
      metodo: "email",
    });
  });

  it("sinaliza autenticador quando vem tfaKey", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(resposta({ tfaKey: "chave-tfa" }));
    const cliente = criarClienteBambu({ fetchImpl });

    expect(await cliente.login("eu@exemplo.com", "senha")).toEqual({
      tipo: "precisaCodigo",
      metodo: "totp",
      tfaKey: "chave-tfa",
    });
  });

  it("preserva o status HTTP real e a mensagem da origem no erro", async () => {
    const fetchImpl = vi
      .fn()
      .mockImplementation(async () => resposta({ message: "invalid credentials" }, { status: 401 }));
    const cliente = criarClienteBambu({ fetchImpl });

    const erro = await cliente.login("eu@exemplo.com", "errada").catch((e) => e);

    expect(erro).toBeInstanceOf(ErroBambu);
    expect(erro.status).toBe(401);
    expect(erro.message).toBe("Bambu Lab respondeu HTTP 401: invalid credentials");
  });

  it("não quebra quando a origem responde sem JSON (bloqueio, corpo vazio)", async () => {
    const fetchImpl = vi
      .fn()
      .mockImplementation(async () => new Response("<html>blocked</html>", { status: 403 }));
    const cliente = criarClienteBambu({ fetchImpl });

    const erro = await cliente.login("eu@exemplo.com", "senha").catch((e) => e);

    expect(erro.status).toBe(403);
    expect(erro.message).toBe("Bambu Lab respondeu HTTP 403.");
  });
});

describe("loginComCodigo", () => {
  it("envia o código sem a senha e devolve o token", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(resposta({ accessToken: "tok-codigo" }));
    const cliente = criarClienteBambu({ fetchImpl });

    const resultado = await cliente.loginComCodigo("eu@exemplo.com", "123456");

    expect(resultado).toEqual({ tipo: "token", accessToken: "tok-codigo", refreshToken: undefined });
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body as string)).toEqual({
      account: "eu@exemplo.com",
      code: "123456",
    });
  });

  it("erra como 401 quando a origem aceita a chamada mas não devolve token", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(resposta({ message: "success" }));
    const cliente = criarClienteBambu({ fetchImpl });

    await expect(cliente.loginComCodigo("eu@exemplo.com", "000000")).rejects.toBeInstanceOf(
      ErroBambu
    );
  });
});

describe("solicitarCodigo", () => {
  it("pede o envio do código por e-mail", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(resposta({ message: "success" }));
    const cliente = criarClienteBambu({ fetchImpl });

    await cliente.solicitarCodigo("eu@exemplo.com");

    expect(fetchImpl.mock.calls[0][0]).toBe(
      "https://api.bambulab.com/v1/user-service/user/sendemail/code"
    );
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body as string)).toEqual({
      email: "eu@exemplo.com",
      type: "codeLogin",
    });
  });
});

describe("loginComTotp", () => {
  it("busca o CSRF e o devolve no header e no cookie", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 204,
          headers: { "set-cookie": "bbl_csrf_token=csrf-abc; Path=/; HttpOnly" },
        })
      )
      .mockResolvedValueOnce(
        new Response(null, {
          status: 200,
          headers: { "set-cookie": "token=tok-totp; Path=/; HttpOnly" },
        })
      );
    const cliente = criarClienteBambu({ fetchImpl });

    const resultado = await cliente.loginComTotp("chave-tfa", "654321");

    expect(resultado).toEqual({ tipo: "token", accessToken: "tok-totp" });
    const [, init] = fetchImpl.mock.calls[1];
    expect(init.headers["x-bbl-csrf-token"]).toBe("csrf-abc");
    expect(init.headers.Cookie).toBe("bbl_csrf_token=csrf-abc");
  });

  it("falha explicitamente quando o CSRF não vem", async () => {
    const fetchImpl = vi.fn().mockImplementation(async () => new Response(null, { status: 204 }));
    const cliente = criarClienteBambu({ fetchImpl });

    const erro = await cliente.loginComTotp("chave", "123456").catch((e) => e);

    expect(erro.status).toBe(502);
    expect(erro.message).toMatch(/CSRF/);
  });
});

describe("listarTasks", () => {
  it("monta a query com cursor e limite e normaliza a resposta", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      resposta({ total: 128, hits: [{ id: 1, title: "peca", status: 2 }] })
    );
    const cliente = criarClienteBambu({ fetchImpl, accessToken: "tok" });

    const pagina = await cliente.listarTasks({ after: "900", limit: 50 });

    expect(pagina.total).toBe(128);
    expect(pagina.hits).toHaveLength(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.bambulab.com/v1/user-service/my/tasks?after=900&limit=50");
    expect(init.headers.Authorization).toBe("Bearer tok");
  });

  it("devolve página vazia quando a origem omite hits", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(resposta({}));
    const cliente = criarClienteBambu({ fetchImpl, accessToken: "tok" });

    expect(await cliente.listarTasks()).toEqual({ total: 0, hits: [] });
  });

  it("propaga o 401 de token expirado com o status real", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(resposta({ message: "token expired" }, { status: 401 }));
    const cliente = criarClienteBambu({ fetchImpl, accessToken: "velho" });

    await expect(cliente.listarTasks()).rejects.toMatchObject({ status: 401 });
  });
});
