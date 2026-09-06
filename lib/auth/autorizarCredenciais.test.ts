import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Usuario } from "@/lib/models/usuario";

const { findOne } = vi.hoisted(() => ({ findOne: vi.fn() }));

vi.mock("@/lib/db/mongodb", () => ({
  default: vi.fn().mockResolvedValue({
    db: () => ({ collection: () => ({ findOne }) }),
  }),
  DB_NAME: "voxelasduo",
}));

const { autorizarCredenciais } = await import("./autorizarCredenciais");

const usuarioBase: Usuario = {
  _id: new ObjectId(),
  email: "admin@voxelasduo.com.br",
  senhaHash: bcrypt.hashSync("senha-correta", 10),
  nome: "Edilson",
  criadoEm: new Date(),
  atualizadoEm: new Date(),
};

describe("autorizarCredenciais", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna o usuário quando e-mail e senha estão corretos", async () => {
    findOne.mockResolvedValue(usuarioBase);

    const resultado = await autorizarCredenciais({
      email: "admin@voxelasduo.com.br",
      senha: "senha-correta",
    });

    expect(resultado).toEqual({
      id: usuarioBase._id!.toString(),
      email: usuarioBase.email,
      name: usuarioBase.nome,
    });
  });

  it("normaliza o e-mail (case-insensitive) antes de buscar", async () => {
    findOne.mockResolvedValue(usuarioBase);

    await autorizarCredenciais({ email: "ADMIN@Voxelasduo.com.br", senha: "senha-correta" });

    expect(findOne).toHaveBeenCalledWith({ email: "admin@voxelasduo.com.br" });
  });

  it("retorna null quando a senha está incorreta", async () => {
    findOne.mockResolvedValue(usuarioBase);

    const resultado = await autorizarCredenciais({
      email: "admin@voxelasduo.com.br",
      senha: "senha-errada",
    });

    expect(resultado).toBeNull();
  });

  it("retorna null quando o e-mail não existe", async () => {
    findOne.mockResolvedValue(null);

    const resultado = await autorizarCredenciais({
      email: "ninguem@voxelasduo.com.br",
      senha: "qualquer-coisa",
    });

    expect(resultado).toBeNull();
  });

  it("retorna null quando e-mail ou senha estão ausentes", async () => {
    expect(await autorizarCredenciais({ email: "admin@voxelasduo.com.br" })).toBeNull();
    expect(await autorizarCredenciais({ senha: "senha-correta" })).toBeNull();
    expect(await autorizarCredenciais(undefined)).toBeNull();
    expect(findOne).not.toHaveBeenCalled();
  });
});
