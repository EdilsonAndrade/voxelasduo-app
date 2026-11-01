import getMongoClient, { DB_NAME } from "@/lib/db/mongodb";
import { CONFIGURACOES_COLLECTION } from "@/lib/models/configuracao";
import {
  FRETE_CONFIG_ID,
  FRETE_PADRAO,
  type FreteConfig,
  type FreteConfigDocumento,
  type OpcaoFrete,
} from "@/lib/models/frete";
import { calcularOpcoesFrete } from "./calculo";

async function colecaoConfiguracoes() {
  const client = await getMongoClient();
  return client.db(DB_NAME).collection<FreteConfigDocumento>(CONFIGURACOES_COLLECTION);
}

/** Valores fixos do frete — padrão PAC R$ 19,90 / SEDEX R$ 25,50 enquanto nada foi salvo. */
export async function buscarConfigFrete(): Promise<FreteConfig> {
  const colecao = await colecaoConfiguracoes();
  const documento = await colecao.findOne({ _id: FRETE_CONFIG_ID });
  if (!documento) return { ...FRETE_PADRAO };
  return {
    pacCentavos: documento.pacCentavos ?? FRETE_PADRAO.pacCentavos,
    sedexCentavos: documento.sedexCentavos ?? FRETE_PADRAO.sedexCentavos,
  };
}

export async function salvarConfigFrete(config: FreteConfig): Promise<FreteConfig> {
  const colecao = await colecaoConfiguracoes();
  const dados: FreteConfig = { pacCentavos: config.pacCentavos, sedexCentavos: config.sedexCentavos };
  await colecao.updateOne(
    { _id: FRETE_CONFIG_ID },
    { $set: { ...dados, atualizadoEm: new Date() } },
    { upsert: true }
  );
  return dados;
}

/**
 * Opções de frete vigentes para o checkout — mesma função na rota de opções e
 * na criação do pedido. Quando houver calculadora por CEP/peso, é aqui que
 * entram as embalagens dos produtos e a calculadora (hoje: só valor fixo).
 */
export async function opcoesFreteVigentes(entrada: { cep?: string } = {}): Promise<OpcaoFrete[]> {
  const config = await buscarConfigFrete();
  return calcularOpcoesFrete({ config, cep: entrada.cep });
}
