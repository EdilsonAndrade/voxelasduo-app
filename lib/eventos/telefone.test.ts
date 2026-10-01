import { describe, expect, it } from "vitest";
import { linkWhatsappCliente, mascararTelefone, somenteDigitos, telefoneValido } from "./telefone";

describe("telefone de evento", () => {
  it("extrai só os dígitos", () => {
    expect(somenteDigitos("(19) 98342-3586")).toBe("19983423586");
  });

  it("aceita 10 ou 11 dígitos", () => {
    expect(telefoneValido("(19) 3422-1234")).toBe(true);
    expect(telefoneValido("19983423586")).toBe(true);
    expect(telefoneValido("9834-2358")).toBe(false);
    expect(telefoneValido("199834235861")).toBe(false);
  });

  it.each([
    ["", ""],
    ["1", "(1"],
    ["19", "(19"],
    ["1998", "(19) 98"],
    ["193422", "(19) 3422"],
    ["1934221234", "(19) 3422-1234"],
    ["19983423586", "(19) 98342-3586"],
    ["199834235869999", "(19) 98342-3586"],
  ])("mascara %s como %s", (entrada, esperado) => {
    expect(mascararTelefone(entrada)).toBe(esperado);
  });

  it("monta o link do WhatsApp com a mensagem pronta", () => {
    const link = linkWhatsappCliente("(19) 98342-3586", "Ana", "Feira de Sábado");
    expect(link.startsWith("https://wa.me/5519983423586?text=")).toBe(true);
    expect(decodeURIComponent(link.split("text=")[1])).toBe(
      "Oi, Ana! Aqui é da Voxelas Duo, sobre o seu pedido na Feira de Sábado."
    );
  });
});
