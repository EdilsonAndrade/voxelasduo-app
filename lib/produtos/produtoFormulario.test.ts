import { describe, expect, it } from "vitest";
import type { Produto } from "@/lib/models/produto";
import { produtoParaDuplicar, produtoParaFormulario } from "./produtoFormulario";

const produto = {
  nome: "Vaso Geométrico",
  slug: "vaso-geometrico",
  descricao: "Vaso impresso em 3D",
  preco: 4990,
  estoque: 7,
  categoria: "decoracao",
  fotos: ["https://blob/foto1.jpg"],
  integracoes: {
    mercadoLivreId: "MLB123",
    mercadoLivrePermalink: "https://produto.mercadolivre.com.br/MLB123",
    mercadoLivrePausado: true,
    mercadoLivreCategoriaId: "MLB1234",
    mercadoLivreCategoriaCaminho: "Casa > Decoração",
    mercadoLivreTipoAnuncio: "gold_pro",
    shopeeItemId: "999",
  },
  precosCanais: { mercadoLivre: 5990, shopee: 5490 },
  metaCatalogo: { publicar: true, titulo: "Vaso 🔥", descricao: "A partir de R$ 49,90" },
} as unknown as Produto;

describe("produtoParaDuplicar", () => {
  const duplicado = produtoParaDuplicar(produto);

  it("não carrega id, fotos, estoque nem dados dos anúncios", () => {
    expect(duplicado.id).toBeUndefined();
    expect(duplicado.fotos).toEqual([]);
    expect(duplicado.estoque).toBe("0");
    expect(duplicado.mercadoLivreId).toBe("");
    expect(duplicado.mercadoLivrePermalink).toBe("");
    expect(duplicado.mercadoLivrePausado).toBe(false);
    expect(duplicado.shopeeItemId).toBe("");
  });

  it("mantém preços e parâmetros do produto, com nome marcado como cópia", () => {
    const original = produtoParaFormulario(produto, "abc");
    expect(duplicado.nome).toBe("Vaso Geométrico (cópia)");
    expect(duplicado.precoReais).toBe("49.90");
    expect(duplicado.precosCanais).toEqual(original.precosCanais);
    expect(duplicado.descricao).toBe(original.descricao);
    expect(duplicado.mercadoLivreCategoriaId).toBe("MLB1234");
    expect(duplicado.mercadoLivreTipoAnuncio).toBe("gold_pro");
  });
});

describe("publicação no Facebook (EDI-109)", () => {
  it("carrega a publicação e os textos próprios no formulário", () => {
    const valores = produtoParaFormulario(produto, "abc");
    expect(valores.metaPublicar).toBe(true);
    expect(valores.metaTitulo).toBe("Vaso 🔥");
    expect(valores.metaDescricao).toBe("A partir de R$ 49,90");
  });

  it("produto sem metaCatalogo vem desmarcado e com textos vazios", () => {
    const valores = produtoParaFormulario({ ...produto, metaCatalogo: undefined }, "abc");
    expect(valores.metaPublicar).toBe(false);
    expect(valores.metaTitulo).toBe("");
    expect(valores.metaDescricao).toBe("");
  });

  it("duplicar mantém os textos, mas não publica a cópia", () => {
    const duplicado = produtoParaDuplicar(produto);
    expect(duplicado.metaPublicar).toBe(false);
    expect(duplicado.metaTitulo).toBe("Vaso 🔥");
  });
});
