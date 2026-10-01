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

const { loginBloqueado, registrarFalhaLogin, limparFalhasLogin } = vi.hoisted(() => ({
  loginBloqueado: vi.fn(),
  registrarFalhaLogin: vi.fn(),
  limparFalhasLogin: vi.fn(),
}));

vi.mock("@/lib/auth/limiteTentativas", () => ({ loginBloqueado, registrarFalhaLogin, limparFalhasLogin }));

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
    loginBloqueado.mockResolvedValue(false);
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
      papel: "admin",
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

  it("aceita o login curto da equipe e devolve o papel", async () => {
    findOne.mockResolvedValue({ ...usuarioBase, usuario: "malu", papel: "equipe", nome: "Malu" });

    const resultado = await autorizarCredenciais({ email: " Malu ", senha: "senha-correta" });

    expect(findOne).toHaveBeenCalledWith({ usuario: "malu", papel: "equipe" });
    expect(resultado).toMatchObject({ name: "Malu", papel: "equipe" });
    expect(limparFalhasLogin).toHaveBeenCalledWith("malu");
  });

  it("registra a falha quando a senha está errada", async () => {
    findOne.mockResolvedValue(usuarioBase);

    await autorizarCredenciais({ email: "admin@voxelasduo.com.br", senha: "senha-errada" });

    expect(registrarFalhaLogin).toHaveBeenCalledWith("admin@voxelasduo.com.br");
  });

  it("recusa sem consultar o usuário quando o identificador está bloqueado", async () => {
    loginBloqueado.mockResolvedValue(true);

    expect(await autorizarCredenciais({ email: "malu", senha: "senha-correta" })).toBeNull();
    expect(findOne).not.toHaveBeenCalled();
  });
});
