import { slugCategoriaValido } from "@/lib/categorias/repository";
import { SLUG_CATEGORIA_PADRAO } from "@/lib/models/categoria";
import type { CalculoPreco } from "@/lib/models/calculoPreco";
import { normalizarValores } from "@/lib/produtos/calculadoraValores";
import {
  buscarCalculosPreco,
  listarCalculosSemProduto,
  vincularProdutoAoCalculo,
} from "@/lib/produtos/calculosPreco";
import { DESCRICAO_RASCUNHO_CALCULO, rascunhoDoCalculo, type RascunhoDoCalculo } from "@/lib/produtos/produtoDoCalculo";
import { criarProduto, slugLivreNaCategoria } from "@/lib/produtos/repository";
import { calcularResultado } from "@/lib/produtos/resultadoCalculadora";
import { gerarSlug } from "@/lib/produtos/slug";
import type { LinkEntrada } from "./regras";
import { ErroLinkPagamento } from "./repository";

type TaxaSite = { percentual: number; fixaCentavos: number };

/** Cálculo que ainda não virou produto, pronto para entrar no link. */
export interface CalculoParaLink {
  calculoId: string;
  nome: string;
  precoCentavos: number;
  custoCentavos: number;
  /** Parte do custo que é desgaste da impressora. */
  depreciacaoCentavos: number;
}

type Rascunho = RascunhoDoCalculo & { custoCentavos: number; depreciacaoCentavos: number };

function rascunho(calculo: CalculoPreco, taxaSite: TaxaSite): Rascunho | null {
  const valores = normalizarValores(calculo.valores);
  const res = calcularResultado(valores, taxaSite);
  const dados = rascunhoDoCalculo(valores, res, taxaSite);
  return dados && res.custo
    ? { ...dados, custoCentavos: res.custo.totalCentavos, depreciacaoCentavos: res.custo.desgasteCentavos }
    : null;
}

/** Cálculos sem produto que já têm preço do site — os incompletos ficam de fora. */
export async function calculosParaLink(taxaSite: TaxaSite): Promise<CalculoParaLink[]> {
  const calculos = await listarCalculosSemProduto();
  return calculos.flatMap((calculo) => {
    const dados = rascunho(calculo, taxaSite);
    return dados
      ? [
          {
            calculoId: calculo._id!.toString(),
            nome: calculo.nome,
            precoCentavos: dados.preco,
            custoCentavos: dados.custoCentavos,
            depreciacaoCentavos: dados.depreciacaoCentavos,
          },
        ]
      : [];
  });
}

/**
 * Troca os itens que vêm da calculadora por produtos: cria um rascunho (fora
 * da loja) por cálculo, com estoque igual à quantidade do link, e liga o
 * produto ao cálculo — como o botão "criar produto" da calculadora.
 */
export async function resolverCalculosDoLink(entrada: LinkEntrada, taxaSite: TaxaSite): Promise<LinkEntrada> {
  const comCalculo = entrada.itens.filter((item) => item.calculoId);
  if (comCalculo.length === 0) return entrada;

  const calculos = new Map(
    (await buscarCalculosPreco(comCalculo.map((item) => item.calculoId!))).map((c) => [c._id!.toString(), c])
  );
  const campos: Record<string, string> = {};
  entrada.itens.forEach((item, indice) => {
    if (!item.calculoId) return;
    const calculo = calculos.get(item.calculoId);
    if (!calculo) campos[`itens[${indice}].produtoId`] = "Cálculo não encontrado.";
    else if (!calculo.produtoId && !rascunho(calculo, taxaSite))
      campos[`itens[${indice}].produtoId`] = "O cálculo está incompleto: abra na calculadora e preencha o custo.";
  });
  if (Object.keys(campos).length > 0) throw new ErroLinkPagamento(campos);
  if (!(await slugCategoriaValido(SLUG_CATEGORIA_PADRAO))) {
    throw new Error("A categoria padrão dos rascunhos não está cadastrada.");
  }

  const itens = [];
  for (const item of entrada.itens) {
    if (!item.calculoId) {
      itens.push(item);
      continue;
    }
    const calculo = calculos.get(item.calculoId)!;
    // Virou produto enquanto o link era montado: usa o produto que já existe.
    let produtoId = calculo.produtoId;
    if (!produtoId) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { custoCentavos, depreciacaoCentavos, ...dados } = rascunho(calculo, taxaSite)!;
      const produto = await criarProduto({
        nome: calculo.nome,
        slug: await slugLivreNaCategoria(SLUG_CATEGORIA_PADRAO, gerarSlug(calculo.nome)),
        descricao: DESCRICAO_RASCUNHO_CALCULO,
        ...dados,
        // Feito sob encomenda: o estoque cobre o pedido do link.
        estoque: item.quantidade,
        categoria: SLUG_CATEGORIA_PADRAO,
        fotos: [],
        ...(calculo.linkModelo3d ? { linkModelo3d: calculo.linkModelo3d } : {}),
        publicado: false,
      });
      produtoId = produto._id!.toString();
      await vincularProdutoAoCalculo(item.calculoId, produtoId);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { calculoId, ...resto } = item;
    itens.push({ ...resto, produtoId });
  }
  return { ...entrada, itens };
}
