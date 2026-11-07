import { canaisDoKit } from "@/lib/kits/precificacaoKit";
import type { TaxasCanaisConfig } from "@/lib/models/configuracao";
import type { TaxasCanaisProduto } from "@/lib/models/produto";
import { resolverTaxasCanais } from "./canais";
import type { ConfigSugestaoVariacao } from "./sugestaoVariacao";

/** Taxas da loja (com as do produto por cima) para o preço sugerido das variações de kit. */
export function configSugestaoVariacao(
  taxasGlobais: TaxasCanaisConfig,
  taxasProduto?: TaxasCanaisProduto
): ConfigSugestaoVariacao {
  const efetivas = resolverTaxasCanais(taxasGlobais, taxasProduto);
  const mercadoLivre = canaisDoKit(taxasGlobais).find((c) => c.canal === "mercadoLivre")!.taxa;
  return {
    site: efetivas.siteProprio,
    shopee: efetivas.shopee,
    mercadoLivre,
    margemDesejadaPercentual: taxasGlobais.margemDesejadaPercentual,
    margemMinimaPercentual: taxasGlobais.margemMinimaPercentual,
    cupomLoja:
      taxasGlobais.cupomLojaPercentual > 0
        ? { percentual: taxasGlobais.cupomLojaPercentual, tetoCentavos: taxasGlobais.cupomLojaTetoCentavos }
        : null,
  };
}
