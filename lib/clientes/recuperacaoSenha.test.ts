import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Cliente } from "@/lib/models/cliente";

const { definirCodigoRecuperacao, redefinirSenhaCliente } = vi.hoisted(() => ({
  definirCodigoRecuperacao: vi.fn().mockResolvedValue(undefined),
  redefinirSenhaCliente: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./repository", () => ({ definirCodigoRecuperacao, redefinirSenhaCliente }));

const { gerarCodigoRecuperacao, validarCodigoRecuperacao, definirNovaSenha } = await import(
  "./recuperacaoSenha"
);

const clienteBase: Cliente = {
  _id: new ObjectId(),
  nome: "Maria",
  email: "maria@exemplo.com",
  senhaHash: "hash-antigo",
  emailVerificado: true,
  criadoEm: new Date(),
  atualizadoEm: new Date(),
};

describe("gerarCodigoRecuperacao", () => {
  beforeEach(() => vi.clearAllMocks());

  it("gera um código de 6 dígitos e grava o hash com expiração futura", async () => {
    const codigo = await gerarCodigoRecuperacao(clienteBase);

    expect(codigo).toMatch(/^\d{6}$/);
    expect(definirCodigoRecuperacao).toHaveBeenCalledWith(
      clienteBase._id,
      expect.objectContaining({ codigoHash: expect.any(String), expiraEm: expect.any(Date) })
    );
    const [, recuperacao] = definirCodigoRecuperacao.mock.calls[0];
    expect(recuperacao.expiraEm.getTime()).toBeGreaterThan(Date.now());
    expect(await bcrypt.compare(codigo, recuperacao.codigoHash)).toBe(true);
  });
});

describe("validarCodigoRecuperacao", () => {
  it("retorna false quando não há código de recuperação", async () => {
    expect(await validarCodigoRecuperacao(clienteBase, "123456")).toBe(false);
  });

  it("retorna false quando o código expirou", async () => {
    const cliente: Cliente = {
      ...clienteBase,
      recuperacaoSenha: {
        codigoHash: bcrypt.hashSync("123456", 10),
        expiraEm: new Date(Date.now() - 1000),
      },
    };
    expect(await validarCodigoRecuperacao(cliente, "123456")).toBe(false);
  });

  it("retorna false quando o código está incorreto", async () => {
    const cliente: Cliente = {
      ...clienteBase,
      recuperacaoSenha: {
        codigoHash: bcrypt.hashSync("123456", 10),
        expiraEm: new Date(Date.now() + 60_000),
      },
    };
    expect(await validarCodigoRecuperacao(cliente, "000000")).toBe(false);
  });

  it("retorna true quando o código está correto e não expirou", async () => {
    const cliente: Cliente = {
      ...clienteBase,
      recuperacaoSenha: {
        codigoHash: bcrypt.hashSync("123456", 10),
        expiraEm: new Date(Date.now() + 60_000),
      },
    };
    expect(await validarCodigoRecuperacao(cliente, "123456")).toBe(true);
  });
});

describe("definirNovaSenha", () => {
  beforeEach(() => vi.clearAllMocks());

  it("grava o hash da nova senha via redefinirSenhaCliente", async () => {
    await definirNovaSenha(clienteBase, "senha-nova-forte");

    expect(redefinirSenhaCliente).toHaveBeenCalledWith(clienteBase._id, expect.any(String));
    const [, senhaHash] = redefinirSenhaCliente.mock.calls[0];
    expect(await bcrypt.compare("senha-nova-forte", senhaHash)).toBe(true);
  });
});
