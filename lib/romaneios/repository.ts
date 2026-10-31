import { ObjectId, type WithId } from "mongodb";
import getMongoClient, { DB_NAME } from "@/lib/db/mongodb";
import { criarGarantiaDeIndices } from "@/lib/db/indices";
import { ROMANEIOS_COLLECTION, type Romaneio, type RomaneioJson, type StatusLugar } from "@/lib/models/romaneio";
import { resumoDoRomaneio, statusDoRomaneio } from "./calculo";
import type { RomaneioEntrada } from "./validation";

const garantirIndices = criarGarantiaDeIndices();

async function colecaoRomaneios() {
  const client = await getMongoClient();
  const colecao = client.db(DB_NAME).collection<Romaneio>(ROMANEIOS_COLLECTION);
  await garantirIndices(() => colecao.createIndex({ dataSaida: -1, criadoEm: -1 }, { name: "recentes" }));
  return colecao;
}

export interface RomaneioResumo {
  id: string;
  nome: string;
  dataSaida: string;
  lugares: string[];
  status: StatusLugar;
  pecas: number;
  pecasFora: number;
  valorCentavos: number;
  aReceberCentavos: number;
}

function paraJson(romaneio: WithId<Romaneio>): RomaneioJson {
  return {
    id: romaneio._id.toString(),
    nome: romaneio.nome,
    dataSaida: romaneio.dataSaida,
    ...(romaneio.observacao ? { observacao: romaneio.observacao } : {}),
    lugares: romaneio.lugares,
  };
}

/** Mais recentes primeiro (data de saída, depois criação). */
export async function listarRomaneios(): Promise<RomaneioResumo[]> {
  const colecao = await colecaoRomaneios();
  const romaneios = await colecao.find().sort({ dataSaida: -1, criadoEm: -1 }).toArray();
  return romaneios.map((romaneio) => {
    const resumo = resumoDoRomaneio(romaneio.lugares);
    return {
      id: romaneio._id.toString(),
      nome: romaneio.nome,
      dataSaida: romaneio.dataSaida,
      lugares: romaneio.lugares.map((l) => l.nome),
      status: statusDoRomaneio(romaneio.lugares),
      pecas: resumo.pecas,
      pecasFora: resumo.pecasNoLugar,
      valorCentavos: resumo.valorCentavos,
      aReceberCentavos: resumo.aReceberCentavos,
    };
  });
}

export async function buscarRomaneio(id: string): Promise<RomaneioJson | null> {
  if (!ObjectId.isValid(id)) return null;
  const colecao = await colecaoRomaneios();
  const romaneio = await colecao.findOne({ _id: new ObjectId(id) });
  return romaneio ? paraJson(romaneio) : null;
}

export async function criarRomaneio(dados: RomaneioEntrada): Promise<RomaneioJson> {
  const colecao = await colecaoRomaneios();
  const agora = new Date();
  const documento: Romaneio = { ...dados, criadoEm: agora, atualizadoEm: agora };
  const { insertedId } = await colecao.insertOne(documento);
  return paraJson({ ...documento, _id: insertedId });
}

/** Grava o documento inteiro; `null` se o romaneio não existe. */
export async function atualizarRomaneio(id: string, dados: RomaneioEntrada): Promise<RomaneioJson | null> {
  if (!ObjectId.isValid(id)) return null;
  const colecao = await colecaoRomaneios();
  const resultado = await colecao.findOneAndUpdate(
    { _id: new ObjectId(id) },
    // Sem observação, o campo sai do documento.
    {
      $set: { nome: dados.nome, dataSaida: dados.dataSaida, lugares: dados.lugares, atualizadoEm: new Date(), ...(dados.observacao ? { observacao: dados.observacao } : {}) },
      ...(dados.observacao ? {} : { $unset: { observacao: "" } }),
    },
    { returnDocument: "after" }
  );
  return resultado ? paraJson(resultado) : null;
}

export async function excluirRomaneio(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const colecao = await colecaoRomaneios();
  const { deletedCount } = await colecao.deleteOne({ _id: new ObjectId(id) });
  return deletedCount === 1;
}
