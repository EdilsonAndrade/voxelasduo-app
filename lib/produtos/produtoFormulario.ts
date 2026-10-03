import type { ProdutoFormValores } from "@/components/admin/ProdutoForm";
import type { Produto } from "@/lib/models/produto";
import { custoProducaoParaFormulario } from "./custoProducaoFormulario";
import { embalagemEnvioParaFormulario } from "./embalagemEnvioFormulario";
import { fichaTecnicaParaFormulario } from "./fichaTecnicaFormulario";
import { taxasCanaisParaFormulario } from "./taxasCanaisFormulario";
import { precosCanaisParaFormulario } from "./precosCanaisFormulario";

/** Produto salvo → valores do formulário de edição. */
export function produtoParaFormulario(produto: Produto, id: string): ProdutoFormValores {
  return {
    id,
    nome: produto.nome,
    descricao: produto.descricao,
    precoReais: (produto.preco / 100).toFixed(2),
    estoque: String(produto.estoque),
    categoria: produto.categoria,
    fotos: produto.fotos,
    mercadoLivreId: produto.integracoes?.mercadoLivreId ?? "",
    mercadoLivrePermalink: produto.integracoes?.mercadoLivrePermalink ?? "",
    mercadoLivrePausado: produto.integracoes?.mercadoLivrePausado ?? false,
    mercadoLivreCategoriaId: produto.integracoes?.mercadoLivreCategoriaId ?? "",
    mercadoLivreCategoriaCaminho: produto.integracoes?.mercadoLivreCategoriaCaminho ?? "",
    mercadoLivreTipoAnuncio: produto.integracoes?.mercadoLivreTipoAnuncio ?? "gold_special",
    shopeeItemId: produto.integracoes?.shopeeItemId ?? "",
    custoProducao: custoProducaoParaFormulario(produto.custoProducao),
    taxasCanais: taxasCanaisParaFormulario(produto.taxasCanais),
    precosCanais: precosCanaisParaFormulario(produto.precosCanais),
    embalagemEnvio: embalagemEnvioParaFormulario(produto.embalagemEnvio),
    fichaTecnica: fichaTecnicaParaFormulario(produto.fichaTecnica),
    metaPublicar: produto.metaCatalogo?.publicar ?? false,
    metaTitulo: produto.metaCatalogo?.titulo ?? "",
    metaDescricao: produto.metaCatalogo?.descricao ?? "",
    linkModelo3d: produto.linkModelo3d ?? "",
  };
}

/**
 * Produto salvo → formulário de "Novo produto" pré-preenchido, para cadastrar
 * o mesmo produto em outra cor. Copia preços, custos, taxas, embalagem, ficha
 * técnica e a configuração de categoria/tipo de anúncio do Mercado Livre;
 * descarta o que é do anúncio original (IDs, permalink, pausado, publicação
 * no Facebook), as fotos e zera o estoque. O nome ganha " (cópia)" porque o slug (categoria + nome) é único.
 */
export function produtoParaDuplicar(produto: Produto): ProdutoFormValores {
  return {
    ...produtoParaFormulario(produto, ""),
    id: undefined,
    nome: `${produto.nome} (cópia)`,
    estoque: "0",
    fotos: [],
    mercadoLivreId: "",
    mercadoLivrePermalink: "",
    mercadoLivrePausado: false,
    shopeeItemId: "",
    // A cópia nasce sem fotos: o vendedor decide publicar no Facebook depois (EDI-109).
    metaPublicar: false,
  };
}
