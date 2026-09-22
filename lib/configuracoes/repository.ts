import getMongoClient, { DB_NAME } from "@/lib/db/mongodb";
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

/** Padrão global de taxas dos canais — devolve os valores padrão enquanto nada foi salvo (EDI-106). */
export async function buscarTaxasCanais(): Promise<TaxasCanaisConfig> {
  const colecao = await colecaoConfiguracoes();
  const documento = await colecao.findOne({ _id: TAXAS_CANAIS_ID });
  if (!documento) return { ...TAXAS_CANAIS_PADRAO };

  return {
    shopeeTaxaPercentual: documento.shopeeTaxaPercentual,
    siteTaxaPercentual: documento.siteTaxaPercentual,
    siteTaxaFixaCentavos: documento.siteTaxaFixaCentavos,
    // Documentos salvos antes do EDI-108 não têm este campo — cai no padrão.
    margemMinimaPercentual:
      documento.margemMinimaPercentual ?? TAXAS_CANAIS_PADRAO.margemMinimaPercentual,
  };
}

export async function salvarTaxasCanais(taxas: TaxasCanaisConfig): Promise<TaxasCanaisConfig> {
  const colecao = await colecaoConfiguracoes();
  const dados: TaxasCanaisConfig = {
    shopeeTaxaPercentual: taxas.shopeeTaxaPercentual,
    siteTaxaPercentual: taxas.siteTaxaPercentual,
    siteTaxaFixaCentavos: taxas.siteTaxaFixaCentavos,
    margemMinimaPercentual: taxas.margemMinimaPercentual,
  };
  await colecao.updateOne(
    { _id: TAXAS_CANAIS_ID },
    { $set: { ...dados, atualizadoEm: new Date() } },
    { upsert: true }
  );
  return dados;
}
