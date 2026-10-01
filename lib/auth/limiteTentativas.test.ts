import { beforeEach, describe, expect, it, vi } from "vitest";

const { findOne, updateOne, deleteOne } = vi.hoisted(() => ({
  findOne: vi.fn(),
  updateOne: vi.fn(),
  deleteOne: vi.fn(),
}));

vi.mock("@/lib/db/mongodb", () => ({
  default: vi.fn().mockResolvedValue({
    db: () => ({ collection: () => ({ findOne, updateOne, deleteOne }) }),
  }),
  DB_NAME: "voxelasduo",
}));

const { JANELA_MS, MAX_FALHAS, limparFalhasLogin, loginBloqueado, registrarFalhaLogin } = await import(
  "./limiteTentativas"
);

const agora = new Date("2026-10-04T12:00:00Z");

describe("limite de tentativas de login", () => {
  beforeEach(() => vi.clearAllMocks());

  it("não bloqueia sem registro", async () => {
    findOne.mockResolvedValue(null);
    expect(await loginBloqueado("malu", agora)).toBe(false);
  });

  it("bloqueia ao atingir o máximo dentro da janela", async () => {
    findOne.mockResolvedValue({ chave: "malu", falhas: MAX_FALHAS, janelaInicio: new Date(agora.getTime() - 1000) });
    expect(await loginBloqueado("malu", agora)).toBe(true);
  });

  it("libera depois que a janela expira", async () => {
    findOne.mockResolvedValue({
      chave: "malu",
      falhas: MAX_FALHAS,
      janelaInicio: new Date(agora.getTime() - JANELA_MS - 1),
    });
    expect(await loginBloqueado("malu", agora)).toBe(false);
  });

  it("incrementa falhas na janela ativa", async () => {
    findOne.mockResolvedValue({ chave: "malu", falhas: 2, janelaInicio: new Date(agora.getTime() - 1000) });
    await registrarFalhaLogin("malu", agora);
    expect(updateOne).toHaveBeenCalledWith({ chave: "malu" }, { $inc: { falhas: 1 } });
  });

  it("reinicia a janela quando expirada ou inexistente", async () => {
    findOne.mockResolvedValue(null);
    await registrarFalhaLogin("malu", agora);
    expect(updateOne).toHaveBeenCalledWith(
      { chave: "malu" },
      { $set: { falhas: 1, janelaInicio: agora } },
      { upsert: true }
    );
  });

  it("limpa o contador", async () => {
    await limparFalhasLogin("malu");
    expect(deleteOne).toHaveBeenCalledWith({ chave: "malu" });
  });
});
