import { ObjectId } from "mongodb";
import getMongoClient, { DB_NAME } from "@/lib/db/mongodb";
import { criarGarantiaDeIndices } from "@/lib/db/indices";
import {
  LINKS_PAGAMENTO_COLLECTION,
  type ItemLinkPagamento,
  type LinkPagamento,
} from "@/lib/models/linkPagamento";
import type { StatusPedido } from "@/lib/models/pedido";
import { buscarProdutosPorIds, colecaoPedidos } from "@/lib/pedidos/repository";
import { buscarVariacao, fotoDaVariacao, nomeComVariacao, temVariacoes } from "@/lib/produtos/variacoes";
import { gerarCodigoLink, type LinkEntrada } from "./regras";

const garantirIndices = criarGarantiaDeIndices();

async function colecaoLinks() {
  const client = await getMongoClient();
  const colecao = client.db(DB_NAME).collection<LinkPagamento>(LINKS_PAGAMENTO_COLLECTION);
  await garantirIndices(() =>
    Promise.all([colecao.createIndex({ codigo: 1 }, { unique: true }), colecao.createIndex({ criadoEm: -1 })])
  );
  return colecao;
}

/** Erro de item que não existe mais ou precisa de variação — vira 400 com `campos`. */
export class ErroLinkPagamento extends Error {
  constructor(public campos: Record<string, string>) {
    super("Itens inválidos no link de pagamento.");
  }
}

/** Confere os produtos/variações e monta os itens gravados no link (nome, foto e preço do site de hoje). */
async function montarItens(entrada: LinkEntrada): Promise<ItemLinkPagamento[]> {
  const produtos = await buscarProdutosPorIds(entrada.itens.map((i) => i.produtoId));
  const campos: Record<string, string> = {};
  const itens: ItemLinkPagamento[] = [];

  entrada.itens.forEach((item, indice) => {
    const produto = produtos.get(item.produtoId);
    if (!produto) {
      campos[`itens[${indice}].produtoId`] = "Produto não encontrado.";
      return;
    }
    const variacao = buscarVariacao(produto, item.variacaoId);
    if (temVariacoes(produto) && !variacao) {
      campos[`itens[${indice}].variacaoId`] = "Escolha o kit deste produto.";
      return;
    }
    if (item.variacaoId && !variacao) {
      campos[`itens[${indice}].variacaoId`] = "Variação não encontrada.";
      return;
    }
    const foto = variacao ? fotoDaVariacao(variacao, produto.fotos) : produto.fotos?.[0];
    itens.push({
      produtoId: produto._id!,
      ...(variacao ? { variacaoId: variacao.id } : {}),
      nome: nomeComVariacao(produto.nome, variacao?.nome),
      ...(foto ? { foto } : {}),
      quantidade: item.quantidade,
      precoOriginalCentavos: variacao?.preco ?? produto.preco,
      precoCentavos: item.precoCentavos,
    });
  });

  if (Object.keys(campos).length > 0) throw new ErroLinkPagamento(campos);
  return itens;
}

function validadeAPartirDeHoje(agora: Date, dias: number): Date {
  return new Date(agora.getTime() + dias * 24 * 60 * 60 * 1000);
}

export async function criarLinkPagamento(entrada: LinkEntrada): Promise<LinkPagamento> {
  const itens = await montarItens(entrada);
  const agora = new Date();
  const colecao = await colecaoLinks();
  // Colisão de código é improvável (31^10); tenta de novo algumas vezes por segurança.
  for (let tentativa = 0; tentativa < 5; tentativa += 1) {
    const link: Omit<LinkPagamento, "_id"> = {
      codigo: gerarCodigoLink(),
      ...(entrada.clienteNome ? { clienteNome: entrada.clienteNome } : {}),
      ...(entrada.observacao ? { observacao: entrada.observacao } : {}),
      itens,
      freteGratis: entrada.freteGratis,
      validoAte: validadeAPartirDeHoje(agora, entrada.validadeDias),
      criadoEm: agora,
      atualizadoEm: agora,
    };
    try {
      const resultado = await colecao.insertOne(link as LinkPagamento);
      return { ...link, _id: resultado.insertedId };
    } catch (erro) {
      if ((erro as { code?: number }).code !== 11000) throw erro;
    }
  }
  throw new Error("Não foi possível gerar um código único para o link.");
}

/** Erro de edição de link que já gerou pedido ou foi cancelado — vira 409. */
export class ErroLinkTravado extends Error {}

/**
 * Edita o link mantendo o mesmo código (a URL já enviada continua valendo).
 * Só enquanto não gerou pedido e não foi cancelado. A validade conta a partir de hoje.
 * `null` = link não encontrado.
 */
export async function atualizarLinkPagamento(id: string, entrada: LinkEntrada): Promise<LinkPagamento | null> {
  if (!ObjectId.isValid(id)) return null;
  const colecao = await colecaoLinks();
  const atual = await colecao.findOne({ _id: new ObjectId(id) });
  if (!atual) return null;
  if (atual.pedidoId || atual.canceladoEm) {
    throw new ErroLinkTravado(
      atual.pedidoId
        ? "Este link já virou pedido e não pode mais ser editado. Use “Duplicar” para gerar um novo."
        : "Este link foi cancelado e não pode mais ser editado. Use “Duplicar” para gerar um novo."
    );
  }

  const itens = await montarItens(entrada);
  const agora = new Date();
  // Nome/recado apagados na tela saem do documento (Mongo recusa `$unset` vazio).
  const desdefinir: Record<string, ""> = {};
  if (!entrada.clienteNome) desdefinir.clienteNome = "";
  if (!entrada.observacao) desdefinir.observacao = "";
  const atualizado = await colecao.findOneAndUpdate(
    { _id: atual._id, pedidoId: { $exists: false }, canceladoEm: { $exists: false } },
    {
      $set: {
        itens,
        freteGratis: entrada.freteGratis,
        validoAte: validadeAPartirDeHoje(agora, entrada.validadeDias),
        atualizadoEm: agora,
        ...(entrada.clienteNome ? { clienteNome: entrada.clienteNome } : {}),
        ...(entrada.observacao ? { observacao: entrada.observacao } : {}),
      },
      ...(Object.keys(desdefinir).length > 0 ? { $unset: desdefinir } : {}),
    },
    { returnDocument: "after" }
  );
  // O cliente pagou enquanto o link era editado.
  if (!atualizado) throw new ErroLinkTravado("Este link acabou de virar pedido e não pode mais ser editado.");
  return atualizado;
}

export async function buscarLinkPorId(id: string): Promise<LinkComPedido | null> {
  if (!ObjectId.isValid(id)) return null;
  const colecao = await colecaoLinks();
  const link = await colecao.findOne({ _id: new ObjectId(id) });
  if (!link) return null;
  const [comPedido] = await anexarPedidos([link]);
  return comPedido;
}

export interface LinkComPedido {
  link: LinkPagamento;
  statusPedido: StatusPedido | null;
  numeroPedido?: number;
}

async function anexarPedidos(links: LinkPagamento[]): Promise<LinkComPedido[]> {
  const ids = links.flatMap((l) => (l.pedidoId ? [l.pedidoId] : []));
  const pedidos = ids.length
    ? await (await colecaoPedidos()).find({ _id: { $in: ids } }, { projection: { status: 1, numero: 1 } }).toArray()
    : [];
  const porId = new Map(pedidos.map((p) => [p._id!.toString(), p]));
  return links.map((link) => {
    const pedido = link.pedidoId ? porId.get(link.pedidoId.toString()) : undefined;
    return { link, statusPedido: pedido?.status ?? null, ...(pedido?.numero ? { numeroPedido: pedido.numero } : {}) };
  });
}

export async function listarLinksPagamento(limite = 100): Promise<LinkComPedido[]> {
  const colecao = await colecaoLinks();
  const links = await colecao.find({}).sort({ criadoEm: -1 }).limit(limite).toArray();
  return anexarPedidos(links);
}

export async function buscarLinkPorCodigo(codigo: string): Promise<LinkComPedido | null> {
  if (!/^[a-z0-9]{6,20}$/.test(codigo)) return null;
  const colecao = await colecaoLinks();
  const link = await colecao.findOne({ codigo });
  if (!link) return null;
  const [comPedido] = await anexarPedidos([link]);
  return comPedido;
}

/** Cancela o link — só enquanto ainda não gerou pedido. `null` = não encontrado ou já usado. */
export async function cancelarLinkPagamento(id: string): Promise<LinkPagamento | null> {
  if (!ObjectId.isValid(id)) return null;
  const colecao = await colecaoLinks();
  const agora = new Date();
  return colecao.findOneAndUpdate(
    { _id: new ObjectId(id), pedidoId: { $exists: false }, canceladoEm: { $exists: false } },
    { $set: { canceladoEm: agora, atualizadoEm: agora } },
    { returnDocument: "after" }
  );
}

/** Marca o link como usado pelo pedido (idempotente). */
export async function vincularPedidoAoLink(linkId: ObjectId, pedidoId: ObjectId): Promise<void> {
  const colecao = await colecaoLinks();
  await colecao.updateOne(
    { _id: linkId, pedidoId: { $exists: false } },
    { $set: { pedidoId, atualizadoEm: new Date() } }
  );
}
