import { beforeEach, describe, expect, it, vi } from "vitest";

const { removerMargensParaRevisar } = vi.hoisted(() => ({ removerMargensParaRevisar: vi.fn() }));
vi.mock("@/lib/produtos/repository", () => ({ removerMargensParaRevisar }));

import { DELETE } from "./route";

const ID = "64b7f0c2a1b2c3d4e5f60718";
const params = (id: string) => ({ params: Promise.resolve({ id }) });

describe("DELETE /api/admin/produtos/[id]/margens-revisar", () => {
  beforeEach(() => removerMargensParaRevisar.mockReset());

  it("marca como revisado e responde 204", async () => {
    removerMargensParaRevisar.mockResolvedValue(true);
    const resposta = await DELETE(new Request("http://x", { method: "DELETE" }), params(ID));
    expect(resposta.status).toBe(204);
    expect(removerMargensParaRevisar).toHaveBeenCalledWith(ID);
  });

  it("400 para id inválido", async () => {
    const resposta = await DELETE(new Request("http://x", { method: "DELETE" }), params("abc"));
    expect(resposta.status).toBe(400);
    expect(removerMargensParaRevisar).not.toHaveBeenCalled();
  });

  it("404 quando o produto não existe", async () => {
    removerMargensParaRevisar.mockResolvedValue(false);
    const resposta = await DELETE(new Request("http://x", { method: "DELETE" }), params(ID));
    expect(resposta.status).toBe(404);
    expect(await resposta.json()).toEqual({ erro: "Produto não encontrado." });
  });
});
