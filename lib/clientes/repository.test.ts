import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Cliente } from "@/lib/models/cliente";

const { findOne, updateOne, insertOne, createIndex } = vi.hoisted(() => ({
  findOne: vi.fn(),
  updateOne: vi.fn().mockResolvedValue({}),
  insertOne: vi.fn(),
  createIndex: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/db/mongodb", () => ({
  default: vi.fn().mockResolvedValue({
    db: () => ({ collection: () => ({ findOne, updateOne, insertOne, createIndex }) }),
  }),
  DB_NAME: "voxelasduo",
}));

const {
  buscarClientePorEmail,
  criarClienteCredenciais,
  criarOuUnificarClienteGoogle,
  ErroClienteJaCadastrado,
} = await import("./repository");

const clienteBase: Cliente = {
  _id: new ObjectId(),
  nome: "Maria",
  email: "maria@exemplo.com",
  emailVerificado: false,
  criadoEm: new Date("2026-01-01"),
  atualizadoEm: new Date("2026-01-01"),
};

describe("buscarClientePorEmail", () => {
  beforeEach(() => vi.clearAllMocks());

  it("normaliza o e-mail (case-insensitive) antes de buscar", async () => {
    findOne.mockResolvedValue(clienteBase);
    await buscarClientePorEmail("MARIA@Exemplo.com");
    expect(findOne).toHaveBeenCalledWith({ email: "maria@exemplo.com" });
  });
});

describe("criarClienteCredenciais", () => {
  beforeEach(() => vi.clearAllMocks());

  it("cria um cliente novo quando o e-mail ainda não existe", async () => {
    findOne.mockResolvedValue(null);
    insertOne.mockResolvedValue({ insertedId: new ObjectId() });

    const cliente = await criarClienteCredenciais({
      nome: "Maria",
      email: "maria@exemplo.com",
      senhaHash: "hash-123",
    });

    expect(cliente.email).toBe("maria@exemplo.com");
    expect(cliente.senhaHash).toBe("hash-123");
    expect(cliente.googleId).toBeUndefined();
  });

  it("lança ErroClienteJaCadastrado quando já existe conta com senha para o e-mail", async () => {
    findOne.mockResolvedValue({ ...clienteBase, senhaHash: "hash-existente" });

    await expect(
      criarClienteCredenciais({ nome: "Maria", email: "maria@exemplo.com", senhaHash: "hash-novo" })
    ).rejects.toThrow(ErroClienteJaCadastrado);
    expect(insertOne).not.toHaveBeenCalled();
  });

  it("unifica com uma conta existente criada só por Google (sem senhaHash)", async () => {
    findOne.mockResolvedValue({ ...clienteBase, googleId: "google-123" });

    const cliente = await criarClienteCredenciais({
      nome: "Maria",
      email: "maria@exemplo.com",
      senhaHash: "hash-novo",
    });

    expect(updateOne).toHaveBeenCalledWith(
      { _id: clienteBase._id },
      expect.objectContaining({ $set: expect.objectContaining({ senhaHash: "hash-novo" }) })
    );
    expect(cliente.googleId).toBe("google-123");
    expect(cliente.senhaHash).toBe("hash-novo");
    expect(insertOne).not.toHaveBeenCalled();
  });
});

describe("criarOuUnificarClienteGoogle", () => {
  beforeEach(() => vi.clearAllMocks());

  it("cria um cliente novo (só com googleId) quando o e-mail ainda não existe", async () => {
    findOne.mockResolvedValue(null);
    insertOne.mockResolvedValue({ insertedId: new ObjectId() });

    const cliente = await criarOuUnificarClienteGoogle({
      nome: "Maria",
      email: "maria@exemplo.com",
      googleId: "google-123",
    });

    expect(cliente.googleId).toBe("google-123");
    expect(cliente.senhaHash).toBeUndefined();
  });

  it("unifica com uma conta existente criada por e-mail/senha (sem googleId) e marca e-mail verificado", async () => {
    findOne.mockResolvedValue({ ...clienteBase, senhaHash: "hash-existente" });

    const cliente = await criarOuUnificarClienteGoogle({
      nome: "Maria",
      email: "maria@exemplo.com",
      googleId: "google-123",
    });

    expect(updateOne).toHaveBeenCalledWith(
      { _id: clienteBase._id },
      expect.objectContaining({
        $set: expect.objectContaining({ googleId: "google-123", emailVerificado: true }),
      })
    );
    expect(cliente.senhaHash).toBe("hash-existente");
    expect(cliente.googleId).toBe("google-123");
    expect(cliente.emailVerificado).toBe(true);
    expect(insertOne).not.toHaveBeenCalled();
  });

  it("não regrava quando o mesmo googleId já está associado e o e-mail já está verificado", async () => {
    findOne.mockResolvedValue({ ...clienteBase, googleId: "google-123", emailVerificado: true });

    await criarOuUnificarClienteGoogle({
      nome: "Maria",
      email: "maria@exemplo.com",
      googleId: "google-123",
    });

    expect(updateOne).not.toHaveBeenCalled();
  });
});
