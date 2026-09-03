import { MongoServerError, ObjectId } from "mongodb";
import getMongoClient, { DB_NAME } from "@/lib/db/mongodb";
import { PEDIDOS_COLLECTION, type ClientePedido, type Pedido } from "@/lib/models/pedido";
import { PRODUTOS_COLLECTION, type Produto } from "@/lib/models/produto";
import { ErroEstoque, validarEstoque } from "./estoque";

let indicesGarantidos: Promise<void> | undefined;

async function colecaoPedidos() {
  const client = await getMongoClient();
  const colecao = client.db(DB_NAME).collection<Pedido>(PEDIDOS_COLLECTION);

  // Garante os índices uma única vez por instância (idempotente no MongoDB).
  if (!indicesGarantidos) {
    indicesGarantidos = Promise.all([
      // Anti-duplicação de checkout: só indexa documentos com o campo.
      colecao.createIndex({ idempotencia: 1 }, { unique: true, sparse: true }),
      colecao.createIndex({ criadoEm: -1 }),
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
    pagamento: {},
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
