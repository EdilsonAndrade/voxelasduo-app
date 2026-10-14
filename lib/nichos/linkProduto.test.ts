import { describe, expect, it } from "vitest";
import { nomeDoLink, origemDoLink } from "./linkProduto";

describe("origemDoLink", () => {
  it("reconhece Shopee e Mercado Livre", () => {
    expect(origemDoLink("https://shopee.com.br/Porta-Caneta-i.1.2")).toBe("shopee");
    expect(origemDoLink("https://produto.mercadolivre.com.br/MLB-1-x-_JM")).toBe("mercado_livre");
    expect(origemDoLink("https://www.mercadolivre.com.br/x/p/MLB1")).toBe("mercado_livre");
    expect(origemDoLink("https://amazon.com.br/x")).toBeNull();
    expect(origemDoLink("porta caneta")).toBeNull();
  });
});

describe("nomeDoLink", () => {
  it("Shopee: nome antes do -i.<loja>.<item>", () => {
    expect(nomeDoLink("https://shopee.com.br/Porta-Caneta-Organizador-de-Mesa-i.123456.7891011?sp_atk=abc")).toBe(
      "Porta Caneta Organizador de Mesa"
    );
  });

  it("Shopee: acentos codificados no endereço", () => {
    expect(nomeDoLink("https://shopee.com.br/Lumin%C3%A1ria-Lua-3D-i.1.2")).toBe("Luminária Lua 3D");
  });

  it("Shopee sem nome no link", () => {
    expect(nomeDoLink("https://shopee.com.br/product/123/456")).toBeNull();
  });

  it("ML: anúncio, catálogo e lista", () => {
    expect(nomeDoLink("https://produto.mercadolivre.com.br/MLB-4002919471-suporte-headset-gamer-mesa-_JM#position=1")).toBe(
      "suporte headset gamer mesa"
    );
    expect(nomeDoLink("https://www.mercadolivre.com.br/organizador-de-gaveta-modular/p/MLB22490553")).toBe(
      "organizador de gaveta modular"
    );
    expect(nomeDoLink("https://www.mercadolivre.com.br/suporte-de-controle/up/MLBU123")).toBe("suporte de controle");
    expect(nomeDoLink("https://lista.mercadolivre.com.br/vaso-decorativo-3d_OrderId_PRICE")).toBe("vaso decorativo 3d");
  });

  it("link que não é de loja", () => {
    expect(nomeDoLink("https://amazon.com.br/porta-caneta")).toBeNull();
    expect(nomeDoLink("texto qualquer")).toBeNull();
  });
});
