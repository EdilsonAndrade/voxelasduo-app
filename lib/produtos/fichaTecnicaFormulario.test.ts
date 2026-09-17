import { describe, expect, it } from "vitest";
import {
  camposFichaTecnicaPreenchidos,
  fichaTecnicaParaFormulario,
  montarFichaTecnica,
  VAZIO_FICHA_TECNICA,
  type FichaTecnicaFormValores,
} from "./fichaTecnicaFormulario";

describe("montarFichaTecnica", () => {
  it("retorna undefined quando nada foi preenchido", () => {
    expect(montarFichaTecnica(VAZIO_FICHA_TECNICA)).toBeUndefined();
  });

  it("inclui só os campos válidos preenchidos, ignorando os demais individualmente", () => {
    const form: FichaTecnicaFormValores = {
      ...VAZIO_FICHA_TECNICA,
      material: "PLA",
    };
    expect(montarFichaTecnica(form)).toEqual({ material: "PLA" });
  });

  it("converte todos os campos preenchidos e válidos", () => {
    const form: FichaTecnicaFormValores = {
      alturaCm: "20",
      larguraCm: "15",
      comprimentoCm: "10",
      pesoGramas: "250",
      material: "PLA",
      itensInclusos: "1 vaso\n1 prato",
    };
    expect(montarFichaTecnica(form)).toEqual({
      alturaCm: 20,
      larguraCm: 15,
      comprimentoCm: 10,
      pesoGramas: 250,
      material: "PLA",
      itensInclusos: ["1 vaso", "1 prato"],
    });
  });

  it("ignora individualmente um campo numérico inválido (zero/negativo/não numérico), sem descartar os demais", () => {
    const form: FichaTecnicaFormValores = {
      ...VAZIO_FICHA_TECNICA,
      alturaCm: "0",
      larguraCm: "-5",
      comprimentoCm: "abc",
      material: "PLA",
    };
    expect(montarFichaTecnica(form)).toEqual({ material: "PLA" });
  });

  it("ignora linhas vazias de itensInclusos", () => {
    const form: FichaTecnicaFormValores = {
      ...VAZIO_FICHA_TECNICA,
      itensInclusos: "1 vaso\n\n1 prato\n",
    };
    expect(montarFichaTecnica(form)).toEqual({ itensInclusos: ["1 vaso", "1 prato"] });
  });

  it("aceita vírgula como separador decimal", () => {
    const form: FichaTecnicaFormValores = { ...VAZIO_FICHA_TECNICA, pesoGramas: "250,5" };
    expect(montarFichaTecnica(form)).toEqual({ pesoGramas: 250.5 });
  });
});

describe("camposFichaTecnicaPreenchidos", () => {
  it("retorna false para o formulário vazio", () => {
    expect(camposFichaTecnicaPreenchidos(VAZIO_FICHA_TECNICA)).toBe(false);
  });

  it("retorna true quando ao menos um campo tem texto", () => {
    expect(
      camposFichaTecnicaPreenchidos({ ...VAZIO_FICHA_TECNICA, material: "PLA" })
    ).toBe(true);
  });
});

describe("fichaTecnicaParaFormulario", () => {
  it("retorna o formulário vazio quando a ficha técnica é undefined", () => {
    expect(fichaTecnicaParaFormulario(undefined)).toEqual(VAZIO_FICHA_TECNICA);
  });

  it("converte uma ficha técnica salva de volta para o formulário em texto", () => {
    expect(
      fichaTecnicaParaFormulario({
        alturaCm: 20,
        larguraCm: 15,
        comprimentoCm: 10,
        pesoGramas: 250,
        material: "PLA",
        itensInclusos: ["1 vaso", "1 prato"],
      })
    ).toEqual({
      alturaCm: "20",
      larguraCm: "15",
      comprimentoCm: "10",
      pesoGramas: "250",
      material: "PLA",
      itensInclusos: "1 vaso\n1 prato",
    });
  });

  it("converte uma ficha técnica parcial, deixando os demais campos vazios", () => {
    expect(fichaTecnicaParaFormulario({ material: "PLA" })).toEqual({
      ...VAZIO_FICHA_TECNICA,
      material: "PLA",
    });
  });
});
