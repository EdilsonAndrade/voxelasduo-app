import { describe, expect, it } from "vitest";
import {
  linkBuscaMercadoLivre,
  linkItemMercadoLivre,
  linkMakerWorld,
  linkShopee,
  resumirNome,
  slugBuscaMl,
} from "./links";

describe("links dos cards", () => {
  it("monta a página do item pelo tipo", () => {
    expect(linkItemMercadoLivre("PRODUCT", "MLB19590092")).toBe("https://www.mercadolivre.com.br/p/MLB19590092");
    expect(linkItemMercadoLivre("ITEM", "MLB4266838277")).toBe("https://produto.mercadolivre.com.br/MLB-4266838277");
    expect(linkItemMercadoLivre("USER_PRODUCT", "MLBU3975710668")).toBe("https://www.mercadolivre.com.br/up/MLBU3975710668");
  });

  it("busca do ML com hifens e acentos codificados", () => {
    expect(slugBuscaMl("  Papel  Higiênico ")).toBe("papel-higiênico");
    expect(linkBuscaMercadoLivre("papel higiênico")).toBe("https://lista.mercadolivre.com.br/papel-higi%C3%AAnico");
  });

  it("Shopee e MakerWorld buscam o nome codificado", () => {
    expect(linkShopee("porta escova & creme")).toBe("https://shopee.com.br/search?keyword=porta%20escova%20%26%20creme");
    expect(linkMakerWorld("suporte papel")).toBe("https://makerworld.com/pt/search/models?keyword=suporte%20papel");
  });

  it("sem nome não há link de busca", () => {
    expect(linkShopee(undefined)).toBeUndefined();
    expect(linkMakerWorld("   ")).toBeUndefined();
  });
});

describe("resumirNome", () => {
  it("fica com as 5 primeiras palavras, sem pontuação", () => {
    expect(resumirNome("Porta Papel Higiênico Inox Adesivo 3M ViMad Parede")).toBe("Porta Papel Higiênico Inox Adesivo");
    expect(resumirNome("Kit c/ 4 - Toalhas")).toBe("Kit c 4 Toalhas");
    expect(resumirNome(undefined)).toBeUndefined();
  });
});
