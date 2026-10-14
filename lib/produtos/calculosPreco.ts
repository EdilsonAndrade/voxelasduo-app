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
  linkShopee?: string;
  linkMercadoLivre?: string;
  valores: CalculadoraValores;
  produtoId?: string;
}

const CAMPOS_LINK = ["linkModelo3d", "linkShopee", "linkMercadoLivre"] as const;
type CampoLink = (typeof CAMPOS_LINK)[number];
const ROTULO_LINK: Record<CampoLink, string> = {
  linkModelo3d: "Link do modelo",
  linkShopee: "Link da Shopee",
  linkMercadoLivre: "Link do Mercado Livre",
};

function textoValido(valor: unknown): valor is string {
  return typeof valor === "string" && valor.trim() !== "";
}

/** Valida o corpo de criação/edição: nome obrigatório, link http(s) opcional e os valores como objeto. */
export function validarCalculoPreco(payload: unknown): { dados?: DadosCalculoPreco; erro?: string } {
  if (typeof payload !== "object" || payload === null) return { erro: "Payload inválido." };
  const corpo = payload as Record<string, unknown>;

  if (!textoValido(corpo.nome)) return { erro: "Informe o nome do produto." };

  const links: Record<CampoLink, string> = { linkModelo3d: "", linkShopee: "", linkMercadoLivre: "" };
  for (const campo of CAMPOS_LINK) {
    const link = typeof corpo[campo] === "string" ? (corpo[campo] as string).trim() : "";
    if (link !== "" && !/^https?:\/\/\S+$/.test(link)) {
      return { erro: `${ROTULO_LINK[campo]}: informe um link começando com http:// ou https://.` };
    }
    links[campo] = link;
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
      linkModelo3d: links.linkModelo3d || undefined,
      linkShopee: links.linkShopee || undefined,
      linkMercadoLivre: links.linkMercadoLivre || undefined,
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
  // Links e produto vazios ficam fora do documento (não viram `null` no banco).
  const preenchidos = Object.fromEntries(Object.entries(dados).filter(([, valor]) => valor !== undefined));
  const calculo = { ...preenchidos, criadoEm: agora, atualizadoEm: agora } as CalculoPreco;
  const { insertedId } = await colecao.insertOne(calculo);
  return { ...calculo, _id: insertedId };
}

export async function atualizarCalculoPreco(id: string, dados: DadosCalculoPreco): Promise<CalculoPreco | null> {
  if (!ObjectId.isValid(id)) return null;
  const colecao = await colecaoCalculos();
  const { linkModelo3d, linkShopee, linkMercadoLivre, produtoId, ...resto } = dados;
  const links = { linkModelo3d, linkShopee, linkMercadoLivre };
  // Link apagado na tela some do documento; preenchido entra no $set.
  const preenchidos: Partial<Record<CampoLink, string>> = {};
  const desdefinir: Partial<Record<CampoLink, "">> = {};
  for (const campo of CAMPOS_LINK) {
    if (links[campo]) preenchidos[campo] = links[campo];
    else desdefinir[campo] = "";
  }
  return colecao.findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...resto,
        ...preenchidos,
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
