import type { ObjectId } from "mongodb";
import type { Canal, RegistroSincronizacaoEstoque } from "@/lib/models/estoqueSincronizacao";
import type { Produto } from "@/lib/models/produto";
import { buscarProdutoPorId } from "@/lib/produtos/repository";
import { criarPendencia, marcarFalha, marcarSincronizado } from "./fila";
import type { CanalEstoqueClient } from "./canais/tipos";
import { mercadoLivreClient } from "./canais/mercadoLivre/client";
import { shopeeClient } from "./canais/shopee";

/** Tempo máximo para a tentativa imediata não atrasar perceptivelmente quem chamou (ex: webhook). */
const TIMEOUT_TENTATIVA_IMEDIATA_MS = 8000;

interface ConfiguracaoCanal {
  canal: Canal;
  anuncioId: (produto: Produto) => string | undefined;
  credencialConfigurada: () => boolean;
  client: CanalEstoqueClient;
}

const CANAIS: ConfiguracaoCanal[] = [
  {
    canal: "mercado_livre",
    anuncioId: (produto) => produto.integracoes?.mercadoLivreId,
    credencialConfigurada: () =>
      Boolean(process.env.MERCADOLIVRE_CLIENT_ID && process.env.MERCADOLIVRE_CLIENT_SECRET),
    client: mercadoLivreClient,
  },
  {
    canal: "shopee",
    anuncioId: (produto) => produto.integracoes?.shopeeItemId,
    credencialConfigurada: () =>
      Boolean(process.env.SHOPEE_PARTNER_ID && process.env.SHOPEE_PARTNER_KEY),
    client: shopeeClient,
  },
];

function comTimeout<T>(promessa: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promessa,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms)),
  ]);
}

function mensagemErro(erro: unknown): string {
  return erro instanceof Error ? erro.message : "Erro desconhecido";
}

interface OpcoesSincronizacao {
  /** Canal que originou a venda (Tarefa 7/EDI-80) — excluído da lista a sincronizar (research.md #8): já reflete a baixa no próprio canal. */
  canalOrigem?: Canal;
}

/**
 * Função reutilizável de "atualizar estoque e preço em todos os canais"
 * (ticket EDI-78, estendida na Tarefa 7/EDI-80 para incluir preço e permitir
 * excluir o canal de origem da venda). Chamada logo após o abatimento no
 * MongoDB (tentativa imediata, best-effort). Para cada canal com credencial
 * de ambiente **e** anúncio mapeado no produto, cria um item de fila e tenta
 * sincronizar na hora; falha vira item de fila para o reprocessamento
 * (`reprocessarPendencia`), nunca uma exceção para quem chamou (FR-006).
 */
export async function sincronizarAnuncioProduto(
  produtoId: string,
  pedidoId: ObjectId | undefined,
  opcoes: OpcoesSincronizacao = {}
): Promise<void> {
  const produto = await buscarProdutoPorId(produtoId);
  if (!produto || !produto._id) return;

  for (const config of CANAIS) {
    if (config.canal === opcoes.canalOrigem) continue;

    const anuncioId = config.anuncioId(produto);
    if (!anuncioId || !config.credencialConfigurada()) {
      // Canal sem credencial configurada ou sem anúncio mapeado neste produto — ignorado (FR-007).
      continue;
    }

    const pendencia = await criarPendencia(produto._id, pedidoId, config.canal, produto.estoque);

    try {
      await comTimeout(
        config.client.atualizarAnuncio(anuncioId, {
          quantidade: produto.estoque,
          preco: produto.preco,
        }),
        TIMEOUT_TENTATIVA_IMEDIATA_MS
      );
      await marcarSincronizado(pendencia._id!);
    } catch (erro) {
      await marcarFalha(pendencia._id!, mensagemErro(erro));
    }
  }
}

/**
 * Reprocessa um item já existente na fila (`POST /api/estoque/sincronizar`).
 * Reaproveita a mesma configuração de canal usada na tentativa imediata —
 * nenhuma lógica de "como sincronizar um canal" é duplicada.
 */
export async function reprocessarPendencia(registro: RegistroSincronizacaoEstoque): Promise<boolean> {
  const config = CANAIS.find((c) => c.canal === registro.canal);
  const produto = await buscarProdutoPorId(registro.produtoId.toString());

  if (!config || !produto) {
    await marcarFalha(registro._id!, "Produto ou canal não encontrado ao reprocessar.");
    return false;
  }

  const anuncioId = config.anuncioId(produto);
  if (!anuncioId) {
    await marcarFalha(registro._id!, "Produto não tem mais anúncio mapeado para este canal.");
    return false;
  }

  try {
    await config.client.atualizarAnuncio(anuncioId, {
      quantidade: registro.quantidade,
      preco: produto.preco,
    });
    await marcarSincronizado(registro._id!);
    return true;
  } catch (erro) {
    await marcarFalha(registro._id!, mensagemErro(erro));
    return false;
  }
}
