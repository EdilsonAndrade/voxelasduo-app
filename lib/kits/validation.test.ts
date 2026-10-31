import { describe, expect, it } from "vitest";
import { validarKit } from "./validation";

const id = "665f1f77bcf86cd799439011";

describe("validarKit", () => {
  it("aceita produtos e itens novos, com faixas sem repetição e ordenadas", () => {
    const { dados } = validarKit({
      nome: " Kit Natal ",
      embalagemCentavos: 500,
      faixasDesconto: [20, 10, 10],
      precoCentavos: 8500,
      itens: [
        { produtoId: id, quantidade: 2 },
        { novo: { nome: "Rena", pesoGramas: 25, tempoMinutos: 90, precoCentavos: 2290 }, quantidade: 1 },
      ],
    });
    expect(dados).toMatchObject({ nome: "Kit Natal", faixasDesconto: [10, 20], precoCentavos: 8500, reconfirmarPreco: false });
    expect(validarKit({ nome: "K", itens: [] }).dados).toMatchObject({
      faixasDesconto: [10, 15, 20],
      precoCentavos: null,
      embalagemCentavos: 0,
    });
  });

  it("recusa nome vazio, quantidade inválida, produto repetido e faixa fora de 0–100", () => {
    expect(validarKit({ nome: "", itens: [] }).erro).toBe("Informe o nome do kit.");
    expect(validarKit({ nome: "K", itens: [{ produtoId: id, quantidade: 0 }] }).erro).toMatch(/Quantidade/);
    expect(
      validarKit({
        nome: "K",
        itens: [
          { produtoId: id, quantidade: 1 },
          { produtoId: id, quantidade: 1 },
        ],
      }).erro
    ).toMatch(/duas vezes/);
    expect(validarKit({ nome: "K", itens: [], faixasDesconto: [100] }).erro).toMatch(/faixas/);
  });

  it("recusa item novo sem peso/tempo e preço sem itens", () => {
    const novo = (n: Record<string, unknown>) => ({ nome: "K", itens: [{ novo: { nome: "Rena", pesoGramas: 1, tempoMinutos: 1, precoCentavos: 1, ...n }, quantidade: 1 }] });
    expect(validarKit(novo({ pesoGramas: 0 })).erro).toMatch(/peso/);
    expect(validarKit(novo({ tempoMinutos: 1.5 })).erro).toMatch(/tempo/);
    expect(validarKit({ nome: "K", itens: [], precoCentavos: 1000 }).erro).toMatch(/Adicione itens/);
  });

  it("aceita margem por item de 0 a 1000% e recusa fora disso", () => {
    const { dados } = validarKit({ nome: "K", itens: [{ produtoId: id, quantidade: 1, margemPercentual: 80 }] });
    expect(dados?.itens[0]).toEqual({ produtoId: id, quantidade: 1, margemPercentual: 80 });
    expect(validarKit({ nome: "K", itens: [{ produtoId: id, quantidade: 1, margemPercentual: null }] }).dados?.itens[0]).toEqual({
      produtoId: id,
      quantidade: 1,
    });
    expect(validarKit({ nome: "K", itens: [{ produtoId: id, quantidade: 1, margemPercentual: -1 }] }).erro).toMatch(/Margem/);
  });
});
