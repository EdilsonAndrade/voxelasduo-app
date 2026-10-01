import { describe, expect, it } from "vitest";
import { rotaPermitidaParaPapel } from "./papeis";

describe("rotaPermitidaParaPapel", () => {
  it("admin (ou papel ausente) acessa tudo", () => {
    expect(rotaPermitidaParaPapel("admin", "/admin/produtos")).toBe(true);
    expect(rotaPermitidaParaPapel(undefined, "/api/produtos")).toBe(true);
  });

  it.each(["/admin/evento", "/admin/evento/entrar", "/api/admin/evento/pedidos", "/api/admin/evento/pedidos/x"])(
    "equipe acessa %s",
    (rota) => {
      expect(rotaPermitidaParaPapel("equipe", rota)).toBe(true);
    }
  );

  it.each(["/admin", "/admin/produtos", "/admin/eventos-falso", "/api/produtos", "/api/admin/categorias", "/api/pedidos"])(
    "equipe não acessa %s",
    (rota) => {
      expect(rotaPermitidaParaPapel("equipe", rota)).toBe(false);
    }
  );
});
