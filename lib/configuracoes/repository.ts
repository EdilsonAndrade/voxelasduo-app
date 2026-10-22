import getMongoClient, { DB_NAME } from "@/lib/db/mongodb";
import { PRODUTOS_COLLECTION, type Produto } from "@/lib/models/produto";
import { migrarMargensParaPreco } from "./migracaoMargens";
import {
  CONFIGURACOES_COLLECTION,
  TAXAS_CANAIS_ID,
  TAXAS_CANAIS_PADRAO,
  type TaxasCanaisConfig,
  type TaxasCanaisDocumento,
} from "@/lib/models/configuracao";

async function colecaoConfiguracoes() {
  const client = await getMongoClient();
  return client.db(DB_NAME).collection<TaxasCanaisDocumento>(CONFIGURACOES_COLLECTION);
}

/**
 * Padrão global de taxas dos canais (EDI-106). Na primeira leitura depois da
 * régua do preço (spec 034), migra as margens antigas antes de responder.
 */
export async function buscarTaxasCanais(): Promise<TaxasCanaisConfig> {
  const colecao = await colecaoConfiguracoes();
  let documento = await colecao.findOne({ _id: TAXAS_CANAIS_ID });
  if (documento?.reguaMargem !== "preco") {
    const client = await getMongoClient();
    await migrarMargensParaPreco({
      configuracoes: colecao,
      produtos: client.db(DB_NAME).collection<Produto>(PRODUTOS_COLLECTION),
    });
    documento = await colecao.findOne({ _id: TAXAS_CANAIS_ID });
  }
  if (!documento) return { ...TAXAS_CANAIS_PADRAO };

  return {
    shopeeTaxaPercentual: documento.shopeeTaxaPercentual,
    siteTaxaPercentual: documento.siteTaxaPercentual,
    siteTaxaFixaCentavos: documento.siteTaxaFixaCentavos,
    // Documentos salvos antes do EDI-108 não têm estes campos — cai no padrão.
    margemMinimaPercentual:
      documento.margemMinimaPercentual ?? TAXAS_CANAIS_PADRAO.margemMinimaPercentual,
    margemDesejadaPercentual:
      documento.margemDesejadaPercentual ?? TAXAS_CANAIS_PADRAO.margemDesejadaPercentual,
    // Documentos salvos antes do cupom de loja não têm estes campos.
    cupomLojaPercentual: documento.cupomLojaPercentual ?? TAXAS_CANAIS_PADRAO.cupomLojaPercentual,
    cupomLojaTetoCentavos: documento.cupomLojaTetoCentavos ?? TAXAS_CANAIS_PADRAO.cupomLojaTetoCentavos,
    cupomLojaCestaMinimaCentavos:
      documento.cupomLojaCestaMinimaCentavos ?? TAXAS_CANAIS_PADRAO.cupomLojaCestaMinimaCentavos,
  };
}

export async function salvarTaxasCanais(taxas: TaxasCanaisConfig): Promise<TaxasCanaisConfig> {
  const colecao = await colecaoConfiguracoes();
  const dados: TaxasCanaisConfig = {
    shopeeTaxaPercentual: taxas.shopeeTaxaPercentual,
    siteTaxaPercentual: taxas.siteTaxaPercentual,
    siteTaxaFixaCentavos: taxas.siteTaxaFixaCentavos,
    margemMinimaPercentual: taxas.margemMinimaPercentual,
    margemDesejadaPercentual: taxas.margemDesejadaPercentual,
    cupomLojaPercentual: taxas.cupomLojaPercentual,
    cupomLojaTetoCentavos: taxas.cupomLojaTetoCentavos,
    cupomLojaCestaMinimaCentavos: taxas.cupomLojaCestaMinimaCentavos,
  };
  await colecao.updateOne(
    { _id: TAXAS_CANAIS_ID },
    { $set: { ...dados, reguaMargem: "preco", atualizadoEm: new Date() } },
    { upsert: true }
  );
  return dados;
}
