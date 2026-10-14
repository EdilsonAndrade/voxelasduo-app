import { ObjectId } from "mongodb";
import getMongoClient, { DB_NAME } from "@/lib/db/mongodb";
import {
  CALCULOS_PRECO_COLLECTION,
  type CalculadoraValores,
  type CalculoPreco,
} from "@/lib/models/calculoPreco";

async function colecaoCalculos() {
  const client = await getMongoClient();
  return client.db(DB_NAME).collection<CalculoPreco>(CALCULOS_PRECO_COLLECTION);
}

export interface DadosCalculoPreco {
  nome: string;
  linkModelo3d?: string;
  valores: CalculadoraValores;
  produtoId?: string;
}

function textoValido(valor: unknown): valor is string {
  return typeof valor === "string" && valor.trim() !== "";
}

/** Valida o corpo de criação/edição: nome obrigatório, link http(s) opcional e os valores como objeto. */
export function validarCalculoPreco(payload: unknown): { dados?: DadosCalculoPreco; erro?: string } {
  if (typeof payload !== "object" || payload === null) return { erro: "Payload inválido." };
  const corpo = payload as Record<string, unknown>;

  if (!textoValido(corpo.nome)) return { erro: "Informe o nome do produto." };

  const link = typeof corpo.linkModelo3d === "string" ? corpo.linkModelo3d.trim() : "";
  if (link !== "" && !/^https?:\/\/\S+$/.test(link)) {
    return { erro: "Informe um link começando com http:// ou https://." };
  }

  const valores = corpo.valores as Record<string, unknown> | undefined;
  if (
    typeof valores !== "object" ||
    valores === null ||
    typeof valores.custo !== "object" ||
    typeof valores.canais !== "object" ||
    typeof valores.producao !== "object"
  ) {
    return { erro: "Valores da calculadora inválidos." };
  }

  return {
    dados: {
      nome: corpo.nome.trim(),
      linkModelo3d: link || undefined,
      valores: valores as unknown as CalculadoraValores,
      produtoId: textoValido(corpo.produtoId) ? corpo.produtoId : undefined,
    },
  };
}

export async function listarCalculosPreco(): Promise<CalculoPreco[]> {
  const colecao = await colecaoCalculos();
  return colecao.find().sort({ atualizadoEm: -1 }).toArray();
}

export async function buscarCalculoPreco(id: string): Promise<CalculoPreco | null> {
  if (!ObjectId.isValid(id)) return null;
  const colecao = await colecaoCalculos();
  return colecao.findOne({ _id: new ObjectId(id) });
}

export async function criarCalculoPreco(dados: DadosCalculoPreco): Promise<CalculoPreco> {
  const colecao = await colecaoCalculos();
  const agora = new Date();
  const calculo: CalculoPreco = { ...dados, criadoEm: agora, atualizadoEm: agora };
  const { insertedId } = await colecao.insertOne(calculo);
  return { ...calculo, _id: insertedId };
}

export async function atualizarCalculoPreco(id: string, dados: DadosCalculoPreco): Promise<CalculoPreco | null> {
  if (!ObjectId.isValid(id)) return null;
  const colecao = await colecaoCalculos();
  const { linkModelo3d, produtoId, ...resto } = dados;
  const desdefinir: Record<string, ""> = {};
  if (!linkModelo3d) desdefinir.linkModelo3d = "";
  return colecao.findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...resto,
        ...(linkModelo3d ? { linkModelo3d } : {}),
        ...(produtoId ? { produtoId } : {}),
        atualizadoEm: new Date(),
      },
      ...(Object.keys(desdefinir).length > 0 ? { $unset: desdefinir } : {}),
    },
    { returnDocument: "after" }
  );
}

export async function excluirCalculoPreco(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const colecao = await colecaoCalculos();
  const { deletedCount } = await colecao.deleteOne({ _id: new ObjectId(id) });
  return deletedCount === 1;
}
