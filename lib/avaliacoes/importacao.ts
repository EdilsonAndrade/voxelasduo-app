import type { Canal } from "@/lib/models/estoqueSincronizacao";
import type { Produto } from "@/lib/models/produto";
import type { ClienteAvaliacoesCanal } from "./canais/tipos";
import { mercadoLivreAvaliacoesClient } from "./canais/mercadoLivre";
import { shopeeAvaliacoesClient } from "./canais/shopee";
import { upsertAvaliacao } from "./repository";
import { registrarFalhaImportacao } from "./falhas";

interface ConfiguracaoCanal {
  canal: Canal;
  anuncioId: (produto: Produto) => string | undefined;
  credencialConfigurada: () => boolean;
  client: ClienteAvaliacoesCanal;
}

const CANAIS: ConfiguracaoCanal[] = [
  {
    canal: "mercado_livre",
    anuncioId: (produto) => produto.integracoes?.mercadoLivreId,
    credencialConfigurada: () =>
      Boolean(process.env.MERCADOLIVRE_CLIENT_ID && process.env.MERCADOLIVRE_CLIENT_SECRET),
    client: mercadoLivreAvaliacoesClient,
  },
  {
    canal: "shopee",
    anuncioId: (produto) => produto.integracoes?.shopeeItemId,
    credencialConfigurada: () =>
      Boolean(process.env.SHOPEE_PARTNER_ID && process.env.SHOPEE_PARTNER_KEY),
    client: shopeeAvaliacoesClient,
  },
];

function mensagemErro(erro: unknown): string {
  return erro instanceof Error ? erro.message : "Erro desconhecido";
}

export interface ResultadoImportacaoProduto {
  importadas: number;
  atualizadas: number;
  /** Número de canais em que a busca de avaliações falhou para este produto (cada falha já foi registrada em `avaliacoesImportacaoFalhas`). */
  falhas: number;
}

/**
 * Importa as avaliações de um produto em todos os canais externos
 * configurados (FR-001). Para cada canal sem credencial de ambiente ou sem
 * anúncio mapeado no produto, é ignorado silenciosamente (FR-005). Nunca
 * lança exceção para quem chamou — falha ao consultar um canal vira registro
 * em `avaliacoesImportacaoFalhas` (FR-006) e não impede os demais canais
 * (FR-007).
 */
export async function importarAvaliacoesProduto(
  produto: Produto
): Promise<ResultadoImportacaoProduto> {
  let importadas = 0;
  let atualizadas = 0;
  let falhas = 0;

  for (const config of CANAIS) {
    const anuncioId = config.anuncioId(produto);
    if (!anuncioId || !config.credencialConfigurada()) {
      continue;
    }

    try {
      const avaliacoes = await config.client.buscarAvaliacoes(anuncioId);
      for (const avaliacao of avaliacoes) {
        const { criada, atualizada } = await upsertAvaliacao({
          produtoId: produto._id!,
          canal: config.canal,
          avaliacaoIdCanal: avaliacao.avaliacaoIdCanal,
          nota: avaliacao.nota,
          comentario: avaliacao.comentario,
          dataAvaliacao: avaliacao.dataAvaliacao,
        });
        if (criada) {
          importadas++;
        } else if (atualizada) {
          atualizadas++;
        }
      }
    } catch (erro) {
      falhas++;
      await registrarFalhaImportacao(config.canal, mensagemErro(erro), produto._id);
    }
  }

  return { importadas, atualizadas, falhas };
}
