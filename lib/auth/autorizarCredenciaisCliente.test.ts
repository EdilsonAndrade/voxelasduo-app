import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Cliente } from "@/lib/models/cliente";

const { buscarClientePorEmail } = vi.hoisted(() => ({ buscarClientePorEmail: vi.fn() }));

vi.mock("@/lib/clientes/repository", () => ({ buscarClientePorEmail }));

const { autorizarCredenciaisCliente, ContaNaoVerificadaError } = await import(
  "./autorizarCredenciaisCliente"
);

const clienteBase: Cliente = {
  _id: new ObjectId(),
  nome: "Maria",
  email: "maria@exemplo.com",
  senhaHash: bcrypt.hashSync("senha-correta", 10),
  emailVerificado: true,
  criadoEm: new Date(),
  atualizadoEm: new Date(),
};

describe("autorizarCredenciaisCliente", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna o cliente quando e-mail e senha estão corretos", async () => {
    buscarClientePorEmail.mockResolvedValue(clienteBase);

    const resultado = await autorizarCredenciaisCliente({
      email: "maria@exemplo.com",
      senha: "senha-correta",
    });

    expect(resultado).toEqual({
      id: clienteBase._id!.toString(),
      email: clienteBase.email,
      name: clienteBase.nome,
    });
  });

  it("normaliza o e-mail (case-insensitive) antes de buscar", async () => {
    buscarClientePorEmail.mockResolvedValue(clienteBase);
    await autorizarCredenciaisCliente({ email: "MARIA@Exemplo.com", senha: "senha-correta" });
    expect(buscarClientePorEmail).toHaveBeenCalledWith("maria@exemplo.com");
  });

  it("retorna null quando a senha está incorreta", async () => {
    buscarClientePorEmail.mockResolvedValue(clienteBase);
    const resultado = await autorizarCredenciaisCliente({
      email: "maria@exemplo.com",
      senha: "senha-errada",
    });
    expect(resultado).toBeNull();
  });

  it("retorna null quando o cliente não existe", async () => {
    buscarClientePorEmail.mockResolvedValue(null);
    const resultado = await autorizarCredenciaisCliente({
      email: "ninguem@exemplo.com",
      senha: "qualquer-coisa",
    });
    expect(resultado).toBeNull();
  });

  it("retorna null quando o cliente só tem login por Google (sem senhaHash)", async () => {
    buscarClientePorEmail.mockResolvedValue({ ...clienteBase, senhaHash: undefined, googleId: "g-1" });
    const resultado = await autorizarCredenciaisCliente({
      email: "maria@exemplo.com",
      senha: "qualquer-coisa",
    });
    expect(resultado).toBeNull();
  });

  it("lança ContaNaoVerificadaError quando a senha está correta mas o e-mail não foi verificado", async () => {
    buscarClientePorEmail.mockResolvedValue({ ...clienteBase, emailVerificado: false });

    await expect(
      autorizarCredenciaisCliente({ email: "maria@exemplo.com", senha: "senha-correta" })
    ).rejects.toThrow(ContaNaoVerificadaError);
  });

  it("retorna null quando e-mail ou senha estão ausentes", async () => {
    expect(await autorizarCredenciaisCliente({ email: "maria@exemplo.com" })).toBeNull();
    expect(await autorizarCredenciaisCliente({ senha: "senha-correta" })).toBeNull();
    expect(await autorizarCredenciaisCliente(undefined)).toBeNull();
    expect(buscarClientePorEmail).not.toHaveBeenCalled();
  });
});
