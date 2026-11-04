import { describe, expect, it } from "vitest";
import { nomeSeguro } from "./blob";

describe("nomeSeguro", () => {
  it("tira acento, espaço e símbolo do nome do arquivo", () => {
    expect(nomeSeguro("Foto #1 Ação (2).JPG")).toBe("foto-1-acao-2.jpg");
  });

  it("nome só de símbolos vira 'foto'", () => {
    expect(nomeSeguro("###")).toBe("foto");
  });
});
