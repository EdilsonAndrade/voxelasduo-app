import { ObjectId } from "mongodb";
import getMongoClient, { DB_NAME } from "@/lib/db/mongodb";
import { slugCategoriaValido } from "@/lib/categorias/repository";
import { sincronizarAnuncioProduto } from "@/lib/estoque/sincronizacao";
import { SLUG_CATEGORIA_PADRAO } from "@/lib/models/categoria";
import { KITS_COLLECTION, type ItemKit, type Kit, type ReferenciaPreco, type ValoresComponente } from "@/lib/models/kit";
import { PLANOS_IMPRESSAO_COLLECTION, type PlanoImpressao } from "@/lib/models/planoImpressao";
import { PRODUTOS_COLLECTION, type Produto } from "@/lib/models/produto";
import { totalMinutos } from "@/lib/producao/planosImpressao";
import {
  atualizarProduto,
  criarProduto,
  listarProdutosPorIds,
  slugLivreNaCategoria,
} from "@/lib/produtos/repository";
import { gerarSlug } from "@/lib/produtos/slug";
import { custoProducaoItemNovo, valoresDoComponente } from "./componentes";
import { compararReferencia, type Desatualizacao, type ItemAtual } from "./desatualizacao";
import { calcularTotaisKit, type TotaisKit } from "./precificacaoKit";
import { custoProducaoDoKit, descricaoInicialDoKit, itensInclusosDoKit } from "./produtoDoKit";
import type { KitEntrada } from "./validation";

/** Erro com status HTTP — a rota devolve exatamente esse status (nada de 200 com erro). */
export class ErroKit extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly extra: Record<string, unknown> = {}
  ) {
    super(message);
  }
}

async function colecaoKits() {
  const client = await getMongoClient();
  return client.db(DB_NAME).collection<Kit>(KITS_COLLECTION);
}

function normalizarNome(nome: string): string {
  return nome.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR").trim();
}

/** Produtos e minutos do Tempo de Impressão de uma lista de ids, numa ida ao banco cada. */
async function carregarComponentes(ids: string[]) {
  const validos = [...new Set(ids)].filter((id) => ObjectId.isValid(id));
  const produtos = await listarProdutosPorIds(validos.map((id) => new ObjectId(id)));
  const client = await getMongoClient();
  const planos =
    validos.length > 0
      ? await client
          .db(DB_NAME)
          .collection<PlanoImpressao>(PLANOS_IMPRESSAO_COLLECTION)
          .find({ produtoId: { $in: validos } }, { projection: { produtoId: 1, itens: 1 } })
          .toArray()
      : [];
  const minutos = new Map(planos.map((p) => [p.produtoId!, totalMinutos(p.itens)]));
  const porId = new Map(produtos.map((p) => [p._id!.toString(), p]));
  return {
    produto: (id: string) => porId.get(id),
    valores: (produto: Produto) => valoresDoComponente(produto, minutos.get(produto._id!.toString())),
  };
}

export interface ItemDetalhe {
  produtoId: string;
  quantidade: number;
  margemPercentual?: number;
  atual: ValoresComponente;
  removido: boolean;
}

export interface KitDetalhe {
  id: string;
  nome: string;
  embalagemCentavos: number;
  faixasDesconto: number[];
  precoCentavos: number | null;
  produtoId?: string;
  itens: ItemDetalhe[];
  totais: TotaisKit;
  desatualizacao: Desatualizacao[];
}

export interface KitResumo {
  id: string;
  nome: string;
  itens: number;
  precoCentavos: number | null;
  somaAvulsaCentavos: number;
  desatualizado: boolean;
  produtoId?: string;
}

function montarDetalhe(kit: Kit, componentes: Awaited<ReturnType<typeof carregarComponentes>>): KitDetalhe {
  const itens: ItemAtual[] = kit.itens.map((item) => {
    const produto = componentes.produto(item.produtoId);
    return {
      produtoId: item.produtoId,
      quantidade: item.quantidade,
      ...(item.margemPercentual !== undefined ? { margemPercentual: item.margemPercentual } : {}),
      valores: produto ? componentes.valores(produto) : item.ultimo,
      removido: !produto,
    };
  });
  // Produto do kit apagado: o kit volta a oferecer "Criar produto do kit".
  const produtoDoKit = kit.produtoId ? componentes.produto(kit.produtoId) : undefined;

  return {
    id: kit._id!.toString(),
    nome: kit.nome,
    embalagemCentavos: kit.embalagemCentavos,
    faixasDesconto: kit.faixasDesconto,
    precoCentavos: kit.precoCentavos,
    ...(produtoDoKit ? { produtoId: kit.produtoId } : {}),
    itens: itens.map(({ valores, ...item }) => ({ ...item, atual: valores })),
    totais: calcularTotaisKit(itens, kit.embalagemCentavos),
    desatualizacao: kit.precoCentavos === null ? [] : compararReferencia(kit.referencia, itens),
  };
}

function idsDoKit(kit: Kit): string[] {
  return [...kit.itens.map((i) => i.produtoId), ...(kit.produtoId ? [kit.produtoId] : [])];
}

export async function listarKits(): Promise<KitResumo[]> {
  const colecao = await colecaoKits();
  const kits = await colecao.find().sort({ atualizadoEm: -1 }).toArray();
  const componentes = await carregarComponentes(kits.flatMap(idsDoKit));
  return kits.map((kit) => {
    const detalhe = montarDetalhe(kit, componentes);
    return {
      id: detalhe.id,
      nome: detalhe.nome,
      itens: detalhe.itens.length,
      precoCentavos: detalhe.precoCentavos,
      somaAvulsaCentavos: detalhe.totais.somaAvulsaCentavos,
      desatualizado: detalhe.desatualizacao.length > 0,
      ...(detalhe.produtoId ? { produtoId: detalhe.produtoId } : {}),
    };
  });
}

async function buscarKit(id: string): Promise<Kit | null> {
  if (!ObjectId.isValid(id)) return null;
  const colecao = await colecaoKits();
  return colecao.findOne({ _id: new ObjectId(id) });
}

export async function buscarKitDetalhe(id: string): Promise<KitDetalhe | null> {
  const kit = await buscarKit(id);
  if (!kit) return null;
  return montarDetalhe(kit, await carregarComponentes(idsDoKit(kit)));
}

function montarReferencia(itens: ItemKit[], totais: TotaisKit): ReferenciaPreco {
  return {
    somaAvulsaCentavos: totais.somaAvulsaCentavos,
    custoCentavos: totais.custoCentavos,
    pesoGramas: totais.pesoGramas,
    tempoMinutos: totais.tempoMinutos,
    itens: Object.fromEntries(
      itens.map((i) => [
        i.produtoId,
        {
          ...i.ultimo,
          quantidade: i.quantidade,
          ...(i.margemPercentual !== undefined ? { margemPercentual: i.margemPercentual } : {}),
        },
      ])
    ),
    definidoEm: new Date(),
  };
}

/**
 * Cria (`id` ausente) ou substitui um kit (contracts/api.md). Tudo é conferido
 * antes de gravar qualquer coisa: componentes existem e não são produto de
 * kit, itens novos não repetem o nome de um produto. Só então os itens novos
 * viram produto rascunho e o kit é gravado.
 */
export async function salvarKit(
  id: string | null,
  entrada: KitEntrada
): Promise<{ kit: KitDetalhe; produtosCriados: { id: string; nome: string }[] }> {
  const atual = id ? await buscarKit(id) : null;
  if (id && !atual) throw new ErroKit("Kit não encontrado.", 404);

  const idsExistentes = entrada.itens.flatMap((i) => ("produtoId" in i ? [i.produtoId] : []));
  const componentes = await carregarComponentes(idsExistentes);
  for (const produtoId of idsExistentes) {
    const produto = componentes.produto(produtoId);
    // Item que já estava no kit e cujo produto foi apagado continua com os últimos valores conhecidos.
    const jaEstava = atual?.itens.some((i) => i.produtoId === produtoId);
    if (!produto && !jaEstava) throw new ErroKit("Produto do kit não encontrado.", 404, { produtoId });
    if (produto?.kitId) throw new ErroKit(`"${produto.nome}" é o produto de um kit e não pode entrar em outro kit.`, 400);
  }

  const novos = entrada.itens.flatMap((i) => ("novo" in i ? [i.novo] : []));
  if (novos.length > 0) {
    const client = await getMongoClient();
    const nomes = await client
      .db(DB_NAME)
      .collection<Produto>(PRODUTOS_COLLECTION)
      .find({}, { projection: { nome: 1 } })
      .toArray();
    for (const novo of novos) {
      const existente = nomes.find((p) => normalizarNome(p.nome) === normalizarNome(novo.nome));
      if (existente) {
        throw new ErroKit(`Já existe um produto chamado "${existente.nome}".`, 409, {
          produtoExistenteId: existente._id!.toString(),
          nome: existente.nome,
        });
      }
    }
    if (!(await slugCategoriaValido(SLUG_CATEGORIA_PADRAO))) {
      throw new ErroKit("A categoria padrão dos rascunhos não está cadastrada.", 500);
    }
  }

  const produtosCriados: { id: string; nome: string }[] = [];
  const itens: ItemKit[] = [];
  for (const item of entrada.itens) {
    const margem = item.margemPercentual !== undefined ? { margemPercentual: item.margemPercentual } : {};
    if ("produtoId" in item) {
      const produto = componentes.produto(item.produtoId);
      const ultimo = produto
        ? componentes.valores(produto)
        : atual!.itens.find((i) => i.produtoId === item.produtoId)!.ultimo;
      itens.push({ produtoId: item.produtoId, quantidade: item.quantidade, ...margem, ultimo });
      continue;
    }
    const { novo } = item;
    const produto = await criarProduto({
      nome: novo.nome,
      slug: await slugLivreNaCategoria(SLUG_CATEGORIA_PADRAO, gerarSlug(novo.nome)),
      descricao: `${novo.nome} — peça do ${entrada.nome}.`,
      preco: novo.precoCentavos,
      estoque: 0,
      categoria: SLUG_CATEGORIA_PADRAO,
      fotos: [],
      custoProducao: custoProducaoItemNovo(novo.pesoGramas, novo.tempoMinutos) ?? undefined,
      publicado: false,
    });
    const produtoId = produto._id!.toString();
    produtosCriados.push({ id: produtoId, nome: produto.nome });
    itens.push({ produtoId, quantidade: item.quantidade, ...margem, ultimo: valoresDoComponente(produto) });
  }

  const totais = calcularTotaisKit(
    itens.map((i) => ({ quantidade: i.quantidade, margemPercentual: i.margemPercentual, valores: i.ultimo })),
    entrada.embalagemCentavos
  );
  const regravarReferencia =
    entrada.precoCentavos !== null &&
    (!atual?.referencia || entrada.reconfirmarPreco || atual.precoCentavos !== entrada.precoCentavos);

  const agora = new Date();
  const kit: Kit = {
    nome: entrada.nome,
    itens,
    embalagemCentavos: entrada.embalagemCentavos,
    faixasDesconto: entrada.faixasDesconto,
    precoCentavos: entrada.precoCentavos,
    ...(entrada.precoCentavos === null
      ? {}
      : { referencia: regravarReferencia ? montarReferencia(itens, totais) : atual!.referencia }),
    ...(atual?.produtoId ? { produtoId: atual.produtoId } : {}),
    criadoEm: atual?.criadoEm ?? agora,
    atualizadoEm: agora,
  };

  const colecao = await colecaoKits();
  let kitId: ObjectId;
  if (atual) {
    kitId = atual._id!;
    await colecao.replaceOne({ _id: kitId }, kit);
  } else {
    kitId = (await colecao.insertOne(kit)).insertedId;
  }

  const salvo = { ...kit, _id: kitId };
  return { kit: montarDetalhe(salvo, await carregarComponentes(idsDoKit(salvo))), produtosCriados };
}

/** Apaga só o kit — componentes e produto do kit ficam; o produto perde o vínculo (`kitId`). */
export async function excluirKit(id: string): Promise<boolean> {
  const kit = await buscarKit(id);
  if (!kit) return false;
  const colecao = await colecaoKits();
  await colecao.deleteOne({ _id: kit._id });
  if (kit.produtoId && ObjectId.isValid(kit.produtoId)) {
    const client = await getMongoClient();
    await client
      .db(DB_NAME)
      .collection<Produto>(PRODUTOS_COLLECTION)
      .updateOne({ _id: new ObjectId(kit.produtoId) }, { $unset: { kitId: "" } });
  }
  return true;
}

/**
 * Cria o produto rascunho do kit ou, se já existir, atualiza só preço, custo
 * de produção e itens inclusos — fotos, nome e textos editados à mão ficam.
 */
export async function gerarProdutoDoKit(id: string): Promise<{ produtoId: string; criado: boolean }> {
  const kit = await buscarKit(id);
  if (!kit) throw new ErroKit("Kit não encontrado.", 404);
  if (kit.itens.length === 0) throw new ErroKit("Adicione itens ao kit antes de criar o produto.", 400);
  if (kit.precoCentavos === null) throw new ErroKit("Defina o preço do kit antes de criar o produto.", 400);

  const componentes = await carregarComponentes(idsDoKit(kit));
  const detalhe = montarDetalhe(kit, componentes);
  const pecas = detalhe.itens.map((item) => ({
    nome: item.atual.nome,
    quantidade: item.quantidade,
    maoDeObraHoras: componentes.produto(item.produtoId)?.custoProducao?.tempoMaoDeObraHoras,
  }));
  const custoProducao = custoProducaoDoKit(detalhe.totais, pecas, kit.embalagemCentavos);
  const itensInclusos = itensInclusosDoKit(pecas);
  const existente = detalhe.produtoId ? componentes.produto(detalhe.produtoId) : undefined;

  if (existente) {
    const produtoId = existente._id!.toString();
    await atualizarProduto(produtoId, {
      preco: kit.precoCentavos,
      custoProducao,
      fichaTecnica: { ...existente.fichaTecnica, itensInclusos },
    });
    // Mesmo comportamento do PATCH do produto: o anúncio publicado acompanha o preço (best-effort).
    if (existente.integracoes?.mercadoLivreId) sincronizarAnuncioProduto(produtoId, undefined).catch(() => undefined);
    return { produtoId, criado: false };
  }

  const produto = await criarProduto({
    nome: kit.nome,
    slug: await slugLivreNaCategoria(SLUG_CATEGORIA_PADRAO, gerarSlug(kit.nome)),
    descricao: descricaoInicialDoKit(kit.nome, pecas),
    preco: kit.precoCentavos,
    estoque: 0,
    categoria: SLUG_CATEGORIA_PADRAO,
    fotos: [],
    custoProducao,
    fichaTecnica: { itensInclusos },
    kitId: id,
    publicado: false,
  });
  const produtoId = produto._id!.toString();
  const colecao = await colecaoKits();
  await colecao.updateOne({ _id: kit._id }, { $set: { produtoId, atualizadoEm: new Date() } });
  return { produtoId, criado: true };
}

/** Kit de origem de um produto, para a tela de edição do produto (aviso + link). */
export async function resumoDoKitDoProduto(kitId: string): Promise<{ id: string; nome: string; desatualizado: boolean } | null> {
  const detalhe = await buscarKitDetalhe(kitId);
  return detalhe ? { id: detalhe.id, nome: detalhe.nome, desatualizado: detalhe.desatualizacao.length > 0 } : null;
}

/** Kit com o custo agregado para a calculadora (`?kit=`). */
export async function dadosDoKitParaCalculadora(id: string) {
  const kit = await buscarKit(id);
  if (!kit) return null;
  const componentes = await carregarComponentes(idsDoKit(kit));
  const detalhe = montarDetalhe(kit, componentes);
  const pecas = detalhe.itens.map((item) => ({
    nome: item.atual.nome,
    quantidade: item.quantidade,
    maoDeObraHoras: componentes.produto(item.produtoId)?.custoProducao?.tempoMaoDeObraHoras,
  }));
  return {
    detalhe,
    custoProducao: detalhe.itens.length > 0 ? custoProducaoDoKit(detalhe.totais, pecas, kit.embalagemCentavos) : null,
  };
}

