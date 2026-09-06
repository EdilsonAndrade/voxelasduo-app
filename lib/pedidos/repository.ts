import { MongoServerError, ObjectId, type Filter } from "mongodb";
import getMongoClient, { DB_NAME } from "@/lib/db/mongodb";
import {
  PEDIDOS_COLLECTION,
  type CanalOrigem,
  type ClientePedido,
  type Pedido,
  type StatusPedido,
} from "@/lib/models/pedido";
import { PRODUTOS_COLLECTION, type Produto } from "@/lib/models/produto";
import { ErroEstoque, validarEstoque } from "./estoque";

export const PEDIDOS_POR_PAGINA = 20;

let indicesGarantidos: Promise<void> | undefined;

export async function colecaoPedidos() {
  const client = await getMongoClient();
  const colecao = client.db(DB_NAME).collection<Pedido>(PEDIDOS_COLLECTION);

  // Garante os índices uma única vez por instância (idempotente no MongoDB).
  if (!indicesGarantidos) {
    indicesGarantidos = Promise.all([
      // Anti-duplicação de checkout: só indexa documentos com o campo.
      colecao.createIndex({ idempotencia: 1 }, { unique: true, sparse: true }),
      colecao.createIndex({ criadoEm: -1 }),
      // Anti-duplicação de pedido nascido em canal externo (Tarefa 7/EDI-80, data-model.md #4).
      colecao.createIndex(
        { "origemExterna.pedidoExternoId": 1 },
        { unique: true, sparse: true }
      ),
    ]).then(() => undefined);
  }
  await indicesGarantidos;

  return colecao;
}

export async function buscarPedidoPorId(id: string) {
  const colecao = await colecaoPedidos();
  return colecao.findOne({ _id: new ObjectId(id) });
}

export async function buscarPedidoPorIdempotencia(idempotencia: string) {
  const colecao = await colecaoPedidos();
  return colecao.findOne({ idempotencia });
}

export interface FiltroPedidos {
  canal?: CanalOrigem;
  status?: StatusPedido;
  pagina?: number;
}

export interface PedidosPaginados {
  pedidos: Pedido[];
  total: number;
}

/**
 * Lista pedidos para o painel administrativo (Tarefa 8/EDI-81), mais recentes primeiro.
 * `canal: "shopee"` sempre retorna vazio sem consultar o banco — a Shopee ainda não
 * tem integração real (aprovação pendente na Shopee Open Platform), só a opção de
 * filtro já preparada na UI (research.md #3).
 */
export async function listarPedidos(filtro: FiltroPedidos = {}): Promise<PedidosPaginados> {
  if (filtro.canal === "shopee") {
    return { pedidos: [], total: 0 };
  }

  const colecao = await colecaoPedidos();
  const query: Filter<Pedido> = {};
  if (filtro.canal) query.canalOrigem = filtro.canal;
  if (filtro.status) query.status = filtro.status;

  const pagina = filtro.pagina && filtro.pagina > 0 ? filtro.pagina : 1;
  const [pedidos, total] = await Promise.all([
    colecao
      .find(query)
      .sort({ criadoEm: -1 })
      .skip((pagina - 1) * PEDIDOS_POR_PAGINA)
      .limit(PEDIDOS_POR_PAGINA)
      .toArray(),
    colecao.countDocuments(query),
  ]);

  return { pedidos, total };
}

export async function buscarProdutosPorIds(ids: string[]): Promise<Map<string, Produto>> {
  const client = await getMongoClient();
  const colecao = client.db(DB_NAME).collection<Produto>(PRODUTOS_COLLECTION);

  const objectIds: ObjectId[] = [];
  for (const id of ids) {
    if (ObjectId.isValid(id)) {
      objectIds.push(new ObjectId(id));
    }
  }

  if (objectIds.length === 0) {
    return new Map();
  }

  const produtos = await colecao.find({ _id: { $in: objectIds } }).toArray();
  return new Map(produtos.map((produto) => [produto._id!.toString(), produto]));
}

export interface CriarPedidoInput {
  idempotencia: string;
  cliente: ClientePedido;
  itens: { produtoId: string; quantidade: number }[];
}

export interface ItemPedidoDetalhado {
  produtoId: string;
  nome: string;
  quantidade: number;
  precoUnitario: number;
}

export interface PedidoCriado {
  pedido: Pedido;
  /** Verdadeiro quando a mesma idempotencia já tinha gerado um pedido antes. */
  duplicado: boolean;
  itensDetalhados: ItemPedidoDetalhado[];
}

/**
 * Cria um pedido "pendente" a partir do checkout.
 * Preços e total são calculados exclusivamente com os dados do banco
 * (o cliente só envia produtoId e quantidade). Idempotência por `idempotencia`.
 */
export async function criarPedido(input: CriarPedidoInput): Promise<PedidoCriado> {
  const existente = await buscarPedidoPorIdempotencia(input.idempotencia);
  if (existente) {
    return { pedido: existente, duplicado: true, itensDetalhados: [] };
  }

  // Agrupa quantidades por produto (itens duplicados somam).
  const quantidadePorProduto = new Map<string, number>();
  for (const item of input.itens) {
    quantidadePorProduto.set(
      item.produtoId,
      (quantidadePorProduto.get(item.produtoId) ?? 0) + item.quantidade
    );
  }

  const produtos = await buscarProdutosPorIds([...quantidadePorProduto.keys()]);

  const problemas = validarEstoque(quantidadePorProduto, produtos);
  if (problemas.length > 0) {
    throw new ErroEstoque(problemas);
  }

  const itensDetalhados: ItemPedidoDetalhado[] = [];
  for (const [produtoId, quantidade] of quantidadePorProduto) {
    const produto = produtos.get(produtoId);
    if (!produto) {
      throw new Error(`Produto não encontrado: ${produtoId}`);
    }
    itensDetalhados.push({
      produtoId,
      nome: produto.nome,
      quantidade,
      precoUnitario: produto.preco,
    });
  }

  const valorTotal = itensDetalhados.reduce(
    (acc, item) => acc + item.precoUnitario * item.quantidade,
    0
  );

  const agora = new Date();
  const pedido: Omit<Pedido, "_id"> = {
    itens: itensDetalhados.map((item) => ({
      produtoId: new ObjectId(item.produtoId),
      quantidade: item.quantidade,
      precoUnitario: item.precoUnitario,
    })),
    cliente: input.cliente,
    status: "pendente",
    canalOrigem: "site",
    valorTotal,
    pagamento: { tentativas: [] },
    idempotencia: input.idempotencia,
    criadoEm: agora,
    atualizadoEm: agora,
  };

  const colecao = await colecaoPedidos();
  try {
    const resultado = await colecao.insertOne(pedido as Pedido);
    return { pedido: { ...pedido, _id: resultado.insertedId }, duplicado: false, itensDetalhados };
  } catch (erro) {
    // Corrida: outra requisição com a mesma idempotencia inseriu primeiro.
    if (erro instanceof MongoServerError && erro.code === 11000) {
      const duplicado = await buscarPedidoPorIdempotencia(input.idempotencia);
      if (duplicado) {
        return { pedido: duplicado, duplicado: true, itensDetalhados: [] };
      }
    }
    throw erro;
  }
}
