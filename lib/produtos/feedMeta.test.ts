import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import type { Produto } from "@/lib/models/produto";
import { formatarPrecoMeta, gerarCsvFeedMeta, montarItemFeedMeta } from "./feedMeta";

const BASE = "https://www.voxelasduo.com.br";
const ID = new ObjectId("66f1a2b3c4d5e6f708192a3b");

function produto(parcial: Partial<Produto> = {}): Produto {
  return {
    _id: ID,
    nome: "Chaveiro 3D",
    slug: "chaveiro-3d",
    descricao: "Chaveiro impresso em 3D.",
    preco: 3990,
    fotos: ["https://blob.example/a.jpg", "https://blob.example/b.jpg"],
    estoque: 5,
    categoria: "chaveiros",
    metaCatalogo: { publicar: true },
    criadoEm: new Date(),
    atualizadoEm: new Date(),
    ...parcial,
  };
}

describe("formatarPrecoMeta", () => {
  it("converte centavos para o formato da Meta", () => {
    expect(formatarPrecoMeta(3990)).toBe("39.90 BRL");
    expect(formatarPrecoMeta(4000)).toBe("40.00 BRL");
    expect(formatarPrecoMeta(5)).toBe("0.05 BRL");
  });
});

describe("montarItemFeedMeta", () => {
  it("monta todas as colunas a partir do produto", () => {
    expect(montarItemFeedMeta(produto(), BASE)).toEqual({
      id: "66f1a2b3c4d5e6f708192a3b",
      title: "Chaveiro 3D",
      description: "Chaveiro impresso em 3D.",
      availability: "in stock",
      condition: "new",
      price: "39.90 BRL",
      link: "https://www.voxelasduo.com.br/produtos/chaveiros/chaveiro-3d",
      image_link: "https://blob.example/a.jpg",
      additional_image_link: "https://blob.example/b.jpg",
      brand: "VoxelasDuo",
      product_type: "chaveiros",
    });
  });

  it("usa os textos próprios do Facebook quando preenchidos", () => {
    const item = montarItemFeedMeta(
      produto({ metaCatalogo: { publicar: true, titulo: " Chaveiro 🔥 ", descricao: "A partir de R$ 39,90" } }),
      BASE
    );
    expect(item?.title).toBe("Chaveiro 🔥");
    expect(item?.description).toBe("A partir de R$ 39,90");
  });

  it("textos próprios em branco voltam para os do site; descrição vazia usa o nome", () => {
    const item = montarItemFeedMeta(
      produto({ descricao: "  ", metaCatalogo: { publicar: true, titulo: "  ", descricao: "" } }),
      BASE
    );
    expect(item?.title).toBe("Chaveiro 3D");
    expect(item?.description).toBe("Chaveiro 3D");
  });

  it("estoque zerado vira fora de estoque, sem remover o item", () => {
    expect(montarItemFeedMeta(produto({ estoque: 0 }), BASE)?.availability).toBe("out of stock");
  });

  it("ignora produtos não marcados ou sem foto", () => {
    expect(montarItemFeedMeta(produto({ metaCatalogo: undefined }), BASE)).toBeNull();
    expect(montarItemFeedMeta(produto({ metaCatalogo: { publicar: false } }), BASE)).toBeNull();
    expect(montarItemFeedMeta(produto({ fotos: [] }), BASE)).toBeNull();
  });

  it("gera links absolutos e codifica categoria/slug", () => {
    const item = montarItemFeedMeta(
      produto({ categoria: "decoração", slug: "vaso", fotos: ["/images/a.jpg"] }),
      BASE
    );
    expect(item?.link).toBe("https://www.voxelasduo.com.br/produtos/decora%C3%A7%C3%A3o/vaso");
    expect(item?.image_link).toBe("https://www.voxelasduo.com.br/images/a.jpg");
    expect(item?.additional_image_link).toBe("");
  });

  it("limita a 20 fotos adicionais", () => {
    const fotos = Array.from({ length: 25 }, (_, i) => `https://blob.example/${i}.jpg`);
    const item = montarItemFeedMeta(produto({ fotos }), BASE);
    expect(item?.additional_image_link.split(",")).toHaveLength(20);
  });

  it("trunca título do site acima de 200 caracteres sem partir emoji", () => {
    const item = montarItemFeedMeta(produto({ nome: `${"a".repeat(199)}🔥🔥` }), BASE);
    expect(Array.from(item!.title)).toHaveLength(200);
    expect(item!.title.endsWith("🔥")).toBe(true);
  });
});

describe("gerarCsvFeedMeta", () => {
  const CABECALHO =
    "id,title,description,availability,condition,price,link,image_link,additional_image_link,brand,product_type";

  it("sem produtos marcados, retorna só o cabeçalho", () => {
    expect(gerarCsvFeedMeta([produto({ metaCatalogo: undefined })], BASE)).toBe(`${CABECALHO}\r\n`);
  });

  it("escapa vírgulas, aspas e quebras de linha", () => {
    const csv = gerarCsvFeedMeta(
      [produto({ descricao: 'Linha 1, "top"\nLinha 2', fotos: ["https://blob.example/a.jpg"] })],
      BASE
    );
    const [cabecalho, linha] = csv.split("\r\n");
    expect(cabecalho).toBe(CABECALHO);
    expect(linha).toBe(
      '66f1a2b3c4d5e6f708192a3b,Chaveiro 3D,"Linha 1, ""top""\nLinha 2",in stock,new,39.90 BRL,' +
        "https://www.voxelasduo.com.br/produtos/chaveiros/chaveiro-3d,https://blob.example/a.jpg,,VoxelasDuo,chaveiros"
    );
  });

  it("coloca várias fotos adicionais entre aspas", () => {
    const csv = gerarCsvFeedMeta(
      [produto({ fotos: ["https://x/a.jpg", "https://x/b.jpg", "https://x/c.jpg"] })],
      BASE
    );
    expect(csv).toContain('"https://x/b.jpg,https://x/c.jpg"');
  });
});
