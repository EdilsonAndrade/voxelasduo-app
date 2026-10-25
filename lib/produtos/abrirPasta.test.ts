import { describe, expect, it } from "vitest";
import { limparCaminhoArquivo, urlAbrirPasta } from "./abrirPasta";

describe("abrir pasta do arquivo .3mf", () => {
  it("tira as aspas do 'Copiar como caminho' do Windows", () => {
    expect(limparCaminhoArquivo(' "D:\\3D\\chaveiro.3mf" ')).toBe("D:\\3D\\chaveiro.3mf");
    expect(limparCaminhoArquivo("D:\\3D\\chaveiro.3mf")).toBe("D:\\3D\\chaveiro.3mf");
  });

  it("monta o endereço voxelas:// com o caminho codificado", () => {
    expect(urlAbrirPasta('"G:\\Meu Drive\\3D\\Dragão #2.3mf"')).toBe(
      "voxelas://abrir-pasta?caminho=G%3A%5CMeu%20Drive%5C3D%5CDrag%C3%A3o%20%232.3mf"
    );
  });
});
