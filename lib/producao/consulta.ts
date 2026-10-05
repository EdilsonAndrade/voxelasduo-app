import { ObjectId } from "mongodb";
import { textoDeMaterial } from "./material";
import { listarProdutosPorIds } from "@/lib/produtos/repository";
import { apurarProduto, saldoLancavel, type ApuracaoProduto } from "./apuracao";
import {
  listarImpressoes,
  listarImpressoesPorNomes,
  listarVinculos,
  type FiltroImpressoes,
} from "./repository";
import type { Impressao, ResultadoImpressao, VinculoArquivoProduto } from "@/lib/models/producao";

export interface ImpressaoComVinculo {
  id: string;
  taskId: string;
  nomeArquivo: string;
  coverUrl?: string;
  resultado: ResultadoImpressao;
  inicio: Date;
  fim?: Date;
  duracaoSegundos?: number;
  gramas?: number;
  material?: string;
  cores: string[];
  impressoraId?: string;
  impressoraNome?: string;
  historico: boolean;
  quantidadeLancada: number;
  quantidadePerdida: number;
  saldoLancavel: number;
  vinculo:
    | {
        produtoId: string;
        produtoNome: string;
        parte: string;
        rendimentoPorPlaca: number;
        unidadesPorProduto: number;
      }
    | null;
}

export interface FiltroConsulta extends Omit<FiltroImpressoes, "nomeArquivo"> {
  produtoId?: string;
  /** `comVinculo` | `semVinculo` — filtro de mapeamento (FR-031). */
  vinculo?: "comVinculo" | "semVinculo";
}

/**
 * Lista as impressões com o vínculo resolvido na leitura (nunca copiado para
 * o documento), para que criar ou corrigir um vínculo valha retroativamente
 * sem reescrever impressão nenhuma (FR-016).
 */
export async function listarImpressoesComVinculo(
  filtro: FiltroConsulta = {}
): Promise<{ total: number; impressoes: ImpressaoComVinculo[] }> {
  const vinculos = await listarVinculos();
  const porNome = new Map(vinculos.map((v) => [v.nomeArquivo, v]));

  let nomeArquivo: string[] | undefined;
  if (filtro.produtoId && ObjectId.isValid(filtro.produtoId)) {
    const id = filtro.produtoId;
    nomeArquivo = vinculos.filter((v) => v.produtoId.toString() === id).map((v) => v.nomeArquivo);
    // Produto sem nenhum vínculo: nada a listar, e um `$in: []` devolveria tudo.
    if (nomeArquivo.length === 0) return { total: 0, impressoes: [] };
  } else if (filtro.vinculo === "comVinculo") {
    nomeArquivo = vinculos.map((v) => v.nomeArquivo);
    if (nomeArquivo.length === 0) return { total: 0, impressoes: [] };
  }

  const { total, impressoes } = await listarImpressoes({ ...filtro, nomeArquivo });

  const nomesProdutos = await nomesDeProdutos(vinculos);
  const lista = impressoes
    .filter((impressao) =>
      filtro.vinculo === "semVinculo" ? !porNome.has(impressao.nomeArquivo) : true
    )
    .map((impressao) => montar(impressao, porNome.get(impressao.nomeArquivo) ?? null, nomesProdutos));

  return { total, impressoes: lista };
}

async function nomesDeProdutos(
  vinculos: VinculoArquivoProduto[]
): Promise<Map<string, string>> {
  const ids = [...new Set(vinculos.map((v) => v.produtoId.toString()))].map(
    (id) => new ObjectId(id)
  );
  if (ids.length === 0) return new Map();

  const produtos = await listarProdutosPorIds(ids);
  return new Map(produtos.map((p) => [p._id!.toString(), p.nome]));
}

function montar(
  impressao: Impressao,
  vinculo: VinculoArquivoProduto | null,
  nomesProdutos: Map<string, string>
): ImpressaoComVinculo {
  return {
    id: impressao._id!.toString(),
    taskId: impressao.taskId,
    nomeArquivo: impressao.nomeArquivo,
    // A cópia nossa não expira; a da origem é só o fallback de quem ainda não copiou.
    coverUrl: impressao.miniaturaUrl ?? impressao.coverUrl,
    resultado: impressao.resultado,
    inicio: impressao.inicio,
    fim: impressao.fim,
    duracaoSegundos: impressao.duracaoSegundos,
    gramas: impressao.gramas,
    // Registro antigo pode ter o objeto da origem aqui — só texto chega à tela.
    material: textoDeMaterial(impressao.material),
    cores: impressao.cores,
    impressoraId: impressao.impressoraId,
    impressoraNome: impressao.impressoraNome,
    historico: impressao.historico,
    quantidadeLancada: impressao.quantidadeLancada,
    quantidadePerdida: impressao.quantidadePerdida,
    saldoLancavel: saldoLancavel(impressao, vinculo),
    vinculo: vinculo
      ? {
          produtoId: vinculo.produtoId.toString(),
          // Produto removido do catálogo: o vínculo fica órfão e o nome volta
          // a aparecer como pendente na tela (data-model.md).
          produtoNome: nomesProdutos.get(vinculo.produtoId.toString()) ?? "(produto removido)",
          parte: vinculo.parte,
          rendimentoPorPlaca: vinculo.rendimentoPorPlaca,
          unidadesPorProduto: vinculo.unidadesPorProduto,
        }
      : null,
  };
}

export interface ResumoProducao {
  gramasPerdidosEmFalhas: number;
  valorPerdidoEmFalhasCentavos: number;
  impressoesSemVinculo: number;
}

/**
 * Apuração de todos os produtos com produção mapeada (FR-019). Produto sem
 * vínculo nenhum simplesmente não aparece — a tela informa "sem dados de
 * produção" em vez de exibir zero.
 */
export async function apurarTodos(
  filtro: { produtoId?: string } = {}
): Promise<{ produtos: ApuracaoProduto[]; resumo: ResumoProducao }> {
  const vinculos = await listarVinculos();

  const porProduto = new Map<string, VinculoArquivoProduto[]>();
  for (const vinculo of vinculos) {
    const id = vinculo.produtoId.toString();
    if (filtro.produtoId && filtro.produtoId !== id) continue;
    porProduto.set(id, [...(porProduto.get(id) ?? []), vinculo]);
  }

  const ids = [...porProduto.keys()];
  if (ids.length === 0) {
    return {
      produtos: [],
      resumo: {
        gramasPerdidosEmFalhas: 0,
        valorPerdidoEmFalhasCentavos: 0,
        impressoesSemVinculo: await contarSemVinculo(vinculos),
      },
    };
  }

  const [produtos, impressoes] = await Promise.all([
    listarProdutosPorIds(ids.map((id) => new ObjectId(id))),
    listarImpressoesPorNomes(vinculos.map((v) => v.nomeArquivo)),
  ]);

  const apuracoes = produtos
    .map((produto) => {
      const doProduto = porProduto.get(produto._id!.toString()) ?? [];
      const nomes = new Set(doProduto.map((v) => v.nomeArquivo));
      return apurarProduto(
        produto,
        doProduto,
        impressoes.filter((i) => nomes.has(i.nomeArquivo))
      );
    })
    .sort((a, b) => a.produtoNome.localeCompare(b.produtoNome, "pt-BR", { sensitivity: "base" }));

  return {
    produtos: apuracoes,
    resumo: {
      gramasPerdidosEmFalhas: apuracoes.reduce((t, a) => t + a.gramasPerdidosEmFalhas, 0),
      valorPerdidoEmFalhasCentavos: apuracoes.reduce(
        (t, a) => t + (a.valorPerdidoEmFalhasCentavos ?? 0),
        0
      ),
      impressoesSemVinculo: await contarSemVinculo(vinculos),
    },
  };
}

async function contarSemVinculo(vinculos: VinculoArquivoProduto[]): Promise<number> {
  const { total } = await listarImpressoes({ porPagina: 1 });
  if (vinculos.length === 0) return total;

  const { total: comVinculo } = await listarImpressoes({
    nomeArquivo: vinculos.map((v) => v.nomeArquivo),
    porPagina: 1,
  });
  return total - comVinculo;
}
