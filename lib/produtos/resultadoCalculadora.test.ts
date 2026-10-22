import { describe, expect, it } from "vitest";
import type { CalculadoraValoresV2 } from "@/lib/models/calculoPreco";
import { valoresPadraoV2 } from "./calculadoraValores";
import { calcularResultado } from "./resultadoCalculadora";
import { montarCanal } from "./canaisCalculadora";

const SITE = { percentual: 5, fixaCentavos: 0 };

/** Custo por unidade R$ 3,55 (exemplo do curso: 41 g a R$ 80/kg, 1h30, 0,11 kWh a R$ 1,20, 2% de falha). */
function valores(): CalculadoraValoresV2 {
  const v = valoresPadraoV2();
  v.impressao = {
    ...v.impressao,
    tempoHoras: "1",
    tempoMinutos: "30",
    pesoGramas: "41",
    precoKgReais: "80",
    tarifaEnergiaReais: "1.20",
    precoImpressoraReais: "",
    embalagemReais: "",
  };
  v.canais.shopee.tipoConta = "cnpj";
  return v;
}

describe("montarCanal", () => {
  it("Shopee CPF com mais de 450 pedidos soma R$ 3 e a campanha soma ao %", () => {
    const v = valores();
    v.canais.shopee = { ...v.canais.shopee, tipoConta: "cpf", cpfAcima450Pedidos: true, campanhaDestaque: true, campanhaPercentual: "3", cupomAtivo: true, cupomReais: "2" };
    const c = montarCanal("shopee", v)!;
    expect(c.faixas[0]).toMatchObject({ percentual: 23, fixaCentavos: 750 });
    expect(c.custoVendaCentavos).toBe(200);
  });

  it("CNPJ não paga o adicional mesmo marcado", () => {
    const v = valores();
    v.canais.shopee.cpfAcima450Pedidos = true;
    expect(montarCanal("shopee", v)!.faixas[0].fixaCentavos).toBe(450);
  });

  it("venda direta: crédito 2,99% e frete grátis entra como custo do pedido", () => {
    const v = valores();
    v.vendaDireta = { ...v.vendaDireta, pagamento: "credito", frete: "gratis", custoEnvioReais: "15" };
    const c = montarCanal("direta", v)!;
    expect(c.faixas[0].percentual).toBe(2.99);
    expect(c.custoVendaCentavos).toBe(1500);
  });
});

describe("calcularResultado", () => {
  it("preço alvo R$ 16,28 na Shopee: taxas, lucro, margem e markup", () => {
    const v = valores();
    v.precificacao = { ...v.precificacao, modo: "alvo", precoAlvoReais: "16.28" };
    const r = calcularResultado(v, SITE);
    expect(r.custo!.totalCentavos).toBe(355);
    const s = r.canais.shopee!;
    expect(s.precoCentavos).toBe(1628);
    // 20% de 16,28 = 3,26 + R$ 4,50
    expect(s.totalTaxasCentavos).toBe(776);
    expect(s.venda!.lucroCentavos).toBe(1628 - 776 - 355);
    expect(s.markup).toBeCloseTo(4.59, 2);
    // e mostra também o preço que daria a margem mínima de 25%
    expect(s.precoMargemCentavos).toBe(Math.ceil((355 + 450) / 0.55));
  });

  it("margem mínima com imposto: lucro fica em 25% do preço", () => {
    const v = valores();
    v.precificacao.impostoPercentual = "6";
    const d = calcularResultado(v, SITE).canais.direta!;
    expect(d.venda!.margemPrecoPercentual).toBeGreaterThanOrEqual(25);
    expect(d.taxas.map((t) => t.rotulo)).toContain("Imposto 6%");
  });

  it("promoção mostra o preço cheio a anunciar", () => {
    const v = valores();
    v.precificacao = { ...v.precificacao, promocaoAtiva: true, promocaoPercentual: "20" };
    const d = calcularResultado(v, SITE).canais.direta!;
    expect(d.precoCheioCentavos).toBe(Math.ceil(d.precoCentavos! / 0.8));
  });

  it("modo alvo sem preço digitado não calcula o lucro", () => {
    const v = valores();
    v.precificacao.modo = "alvo";
    const s = calcularResultado(v, SITE).canais.shopee!;
    expect(s.precoCentavos).toBeNull();
    expect(s.venda).toBeNull();
  });

  it("produção vem da mesa: 20 h por dia ÷ 1h30 = 13 mesas", () => {
    const r = calcularResultado(valores(), SITE);
    expect(r.producao).toEqual({ mesasPorDia: 13, pecasPorDia: 13, pecasPorMes: 390 });
    expect(r.pecasMes).toBe(390);
  });
});

describe("repasse do canal", () => {
  it("bate com a renda do pedido real da Shopee: R$ 35 → R$ 23,50, com o anúncio fora do repasse", () => {
    const v = valores();
    v.precificacao = { ...v.precificacao, modo: "alvo", precoAlvoReais: "35" };
    v.anuncio = { modo: "embutido", roasMeta: "8", verbaMesReais: "" };
    const shopee = calcularResultado(v, SITE).canais.shopee!;
    expect(shopee.repasseCentavos).toBe(2350);
    const anuncio = shopee.taxas.find((t) => t.rotulo.startsWith("Anúncio"))!;
    expect(anuncio.foraDoPedido).toBe(true);
    expect(shopee.venda!.anuncioCentavos).toBeGreaterThan(0);
  });
});
