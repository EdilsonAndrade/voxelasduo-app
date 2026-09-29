import { formatarPreco } from "./formato";

/**
 * Textos do produto para Facebook/Instagram (EDI-109): o título/descrição
 * próprios quando preenchidos, senão os do site — a mesma regra do feed do
 * catálogo e do texto copiado para o Marketplace.
 */
export interface EntradaTextosMeta {
  nome: string;
  descricao: string;
  metaTitulo?: string;
  metaDescricao?: string;
}

function textoPreenchido(valor: string | undefined): string | undefined {
  const texto = valor?.trim();
  return texto ? texto : undefined;
}

export function resolverTextosMeta(entrada: EntradaTextosMeta): { titulo: string; descricao: string } {
  const nome = entrada.nome.trim();
  return {
    titulo: textoPreenchido(entrada.metaTitulo) ?? nome,
    descricao:
      textoPreenchido(entrada.metaDescricao) ?? textoPreenchido(entrada.descricao) ?? nome,
  };
}

/** Campos prontos para colar no anúncio manual do Marketplace do Facebook (sem API). */
export interface TextoMarketplace {
  titulo: string;
  preco: string;
  descricao: string;
}

export function montarTextoMarketplace(
  entrada: EntradaTextosMeta & { precoCentavos: number }
): TextoMarketplace {
  const { titulo, descricao } = resolverTextosMeta(entrada);
  return { titulo, preco: formatarPreco(entrada.precoCentavos), descricao };
}
