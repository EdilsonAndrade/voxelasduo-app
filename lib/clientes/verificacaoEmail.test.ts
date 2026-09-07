import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Cliente } from "@/lib/models/cliente";

const { definirCodigoVerificacao, marcarEmailVerificado } = vi.hoisted(() => ({
  definirCodigoVerificacao: vi.fn().mockResolvedValue(undefined),
  marcarEmailVerificado: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./repository", () => ({ definirCodigoVerificacao, marcarEmailVerificado }));

const { gerarCodigoVerificacao, validarCodigoVerificacao, confirmarVerificacaoEmail } = await import(
  "./verificacaoEmail"
);

const clienteBase: Cliente = {
  _id: new ObjectId(),
  nome: "Maria",
  email: "maria@exemplo.com",
  senhaHash: "hash",
  emailVerificado: false,
  criadoEm: new Date(),
  atualizadoEm: new Date(),
};

describe("gerarCodigoVerificacao", () => {
  beforeEach(() => vi.clearAllMocks());

  it("gera um código de 6 dígitos e grava o hash com expiração futura (~10min)", async () => {
    const codigo = await gerarCodigoVerificacao(clienteBase);

    expect(codigo).toMatch(/^\d{6}$/);
    const [, verificacao] = definirCodigoVerificacao.mock.calls[0];
    expect(await bcrypt.compare(codigo, verificacao.codigoHash)).toBe(true);
    const minutosRestantes = (verificacao.expiraEm.getTime() - Date.now()) / 60_000;
    expect(minutosRestantes).toBeGreaterThan(9);
    expect(minutosRestantes).toBeLessThanOrEqual(10);
  });
});

describe("validarCodigoVerificacao", () => {
  it("retorna false quando não há código pendente", async () => {
    expect(await validarCodigoVerificacao(clienteBase, "123456")).toBe(false);
  });

  it("retorna false quando o código expirou", async () => {
    const cliente: Cliente = {
      ...clienteBase,
      verificacaoEmail: { codigoHash: bcrypt.hashSync("123456", 10), expiraEm: new Date(Date.now() - 1000) },
    };
    expect(await validarCodigoVerificacao(cliente, "123456")).toBe(false);
  });

  it("retorna true quando o código está correto e não expirou", async () => {
    const cliente: Cliente = {
      ...clienteBase,
      verificacaoEmail: {
        codigoHash: bcrypt.hashSync("123456", 10),
        expiraEm: new Date(Date.now() + 60_000),
      },
    };
    expect(await validarCodigoVerificacao(cliente, "123456")).toBe(true);
  });
});

describe("confirmarVerificacaoEmail", () => {
  beforeEach(() => vi.clearAllMocks());

  it("chama marcarEmailVerificado com o id do cliente", async () => {
    await confirmarVerificacaoEmail(clienteBase);
    expect(marcarEmailVerificado).toHaveBeenCalledWith(clienteBase._id);
  });
});
