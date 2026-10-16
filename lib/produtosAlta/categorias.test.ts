import { describe, expect, it, vi } from "vitest";
import type { CategoriaNavegavel } from "@/lib/models/produtosAlta";
import { ehDescendente, validarCategoria } from "./categorias";
import { ErroCategoriaInvalida } from "./erros";

const suportesPapel: CategoriaNavegavel = {
  id: "MLB186368",
  nome: "Suportes para Papel Higiênico",
  caminho: [
    { id: "MLB1574", nome: "Casa, Móveis e Decoração" },
    { id: "MLB1613", nome: "Banheiros" },
    { id: "MLB1616", nome: "Acessórios para Banhos" },
    { id: "MLB186368", nome: "Suportes para Papel Higiênico" },
  ],
  filhas: [],
};

describe("validarCategoria", () => {
  it("aceita uma das 16 categorias", async () => {
    const banheiros = { id: "MLB1613", nome: "Banheiros", caminho: [], filhas: [] };
    await expect(validarCategoria("MLB1613", async () => banheiros)).resolves.toBe(banheiros);
  });

  it("aceita subcategoria de uma das 16", async () => {
    await expect(validarCategoria("MLB186368", async () => suportesPapel)).resolves.toBe(suportesPapel);
  });

  it("recusa categoria fora da lista 3D", async () => {
    const roupas = { id: "MLB1430", nome: "Roupas", caminho: [{ id: "MLB1430", nome: "Roupas" }], filhas: [] };
    await expect(validarCategoria("MLB1430", async () => roupas)).rejects.toBeInstanceOf(ErroCategoriaInvalida);
  });

  it("recusa id malformado sem consultar o ML", async () => {
    const carregar = vi.fn();
    await expect(validarCategoria("abc", carregar)).rejects.toBeInstanceOf(ErroCategoriaInvalida);
    expect(carregar).not.toHaveBeenCalled();
  });

  it("404 do ML vira categoria inválida; outras falhas seguem", async () => {
    await expect(
      validarCategoria("MLB999", async () => {
        throw new Error("Falha (HTTP 404): not found");
      })
    ).rejects.toBeInstanceOf(ErroCategoriaInvalida);
    await expect(
      validarCategoria("MLB999", async () => {
        throw new Error("Falha (HTTP 500): boom");
      })
    ).rejects.toThrow("HTTP 500");
  });
});

describe("ehDescendente", () => {
  it("olha o caminho da categoria", () => {
    expect(ehDescendente(suportesPapel, "MLB1613")).toBe(true);
    expect(ehDescendente(suportesPapel, "MLB1631")).toBe(false);
  });
});
