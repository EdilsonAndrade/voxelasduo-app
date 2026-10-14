import type {
  FiltrosNicho,
  ModeloSugerido,
  Oportunidade,
  ResultadoNichosCategoria,
  ResultadoNichosTermo,
} from "@/lib/models/nicho";
import type { CategoriaNicho } from "./categorias";
import {
  classificarPotencial,
  escolherPerfil,
  licencaPermiteVenda,
  MIN_DOWNLOADS_RELEVANTE,
  RELEVANCIA_MINIMA,
  nivelConcorrencia,
} from "./classificacao";
import { ErroMakerWorld, relevanciaDoHit, type ClienteMakerWorld } from "./makerworld";

/** Termos em alta avaliados por categoria (FR-015). */
export const TERMOS_POR_CATEGORIA = 20;
/** Modelos mostrados por oportunidade — cada um custa uma consulta de detalhe ao MakerWorld. */
export const MODELOS_POR_TERMO = 2;
/** Termos em andamento ao mesmo tempo — o cliente do MakerWorld já enfileira as chamadas dele. */
const CONCORRENCIA = 2;

export interface DependenciasPesquisa {
  tendenciasCategoria: (categoryId: string) => Promise<{ termo: string }[]>;
  contarProdutosCatalogo: (termo: string) => Promise<number>;
  makerWorld: Pick<ClienteMakerWorld, "buscarModelos" | "buscarDesign">;
}

async function mapearLimitado<T, R>(itens: T[], limite: number, fn: (item: T, indice: number) => Promise<R>): Promise<R[]> {
  const resultados = new Array<R>(itens.length);
  let proximo = 0;
  async function trabalhador() {
    while (proximo < itens.length) {
      const indice = proximo++;
      resultados[indice] = await fn(itens[indice], indice);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limite, itens.length) }, trabalhador));
  return resultados;
}

const PALAVRAS_VAZIAS = new Set(["de", "da", "do", "das", "dos", "para", "com", "e", "a", "o", "p"]);

/** "organizador de gavetas" e "organizador gaveta" são o mesmo nicho — evita repetir os mesmos modelos. */
export function chaveDoTermo(termo: string): string {
  return termo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((p) => p && !PALAVRAS_VAZIAS.has(p))
    .map((p) => (p.length > 3 && p.endsWith("s") ? p.slice(0, -1) : p))
    .sort()
    .join(" ");
}

/**
 * Melhores modelos para um termo, na ordem de relevância da própria busca
 * (reordenar por downloads trazia peças populares sem relação com o termo):
 * só os com licença de venda, casamento forte com o termo e downloads
 * suficientes; o detalhe (perfis) só é
 * lido desses. Um modelo cujo detalhe falha é pulado — a busca em si falhar,
 * ou um bloqueio por excesso de acessos, derruba a pesquisa com o status real.
 */
async function modelosDoTermo(termo: string, filtros: FiltrosNicho, deps: DependenciasPesquisa): Promise<ModeloSugerido[]> {
  const hits = await deps.makerWorld.buscarModelos(termo, 8);
  const relevantes = hits
    .filter((h) => {
      const relevancia = relevanciaDoHit(h);
      return (
        licencaPermiteVenda(h.license) &&
        (h.downloadCount ?? 0) >= MIN_DOWNLOADS_RELEVANTE &&
        // Sem a nota (API mudou), fica só o filtro de downloads.
        (relevancia === null || relevancia >= RELEVANCIA_MINIMA)
      );
    })
    .slice(0, MODELOS_POR_TERMO);

  const modelos = await Promise.all(
    relevantes.map(async (hit) => {
      try {
        return escolherPerfil(await deps.makerWorld.buscarDesign(hit.id), filtros);
      } catch (erro) {
        // Bloqueio por excesso de acessos vale para todas as chamadas seguintes: não adianta seguir.
        if (erro instanceof ErroMakerWorld && erro.bloqueado) throw erro;
        return null;
      }
    })
  );
  return modelos.filter((m): m is ModeloSugerido => m !== null);
}

/** Falha só na contagem do ML não esconde a oportunidade: concorrência fica "indisponível". */
async function concorrenciaDo(termo: string, deps: DependenciasPesquisa) {
  try {
    return nivelConcorrencia(await deps.contarProdutosCatalogo(termo));
  } catch {
    return nivelConcorrencia(null);
  }
}

const ORDEM_POTENCIAL = { alto: 0, medio: 1, baixo: 2, nao_avaliado: 3 } as const;

export async function pesquisarCategoria(
  categoria: CategoriaNicho,
  filtros: FiltrosNicho,
  deps: DependenciasPesquisa
): Promise<ResultadoNichosCategoria> {
  const tendencias = await deps.tendenciasCategoria(categoria.id);

  const vistos = new Set<string>();
  const termos: { termo: string; posicao: number }[] = [];
  tendencias.slice(0, TERMOS_POR_CATEGORIA).forEach((t, i) => {
    const chave = chaveDoTermo(t.termo);
    if (vistos.has(chave)) return;
    vistos.add(chave);
    termos.push({ termo: t.termo, posicao: i + 1 });
  });

  const avaliados = await mapearLimitado(termos, CONCORRENCIA, async ({ termo, posicao }): Promise<Oportunidade | null> => {
    const modelos = await modelosDoTermo(termo, filtros, deps);
    if (modelos.length === 0) return null;

    const potencial = classificarPotencial({
      posicao,
      categoriaNome: categoria.nome,
      maxDownloads: Math.max(...modelos.map((m) => m.downloads)),
    });
    // Potencial baixo fica oculto — não gasta a consulta de concorrência.
    const concorrencia = potencial.nivel === "baixo" ? nivelConcorrencia(null) : await concorrenciaDo(termo, deps);
    return { termo, posicao, potencial, concorrencia, modelos };
  });

  const encontradas = avaliados.filter((o): o is Oportunidade => o !== null);
  const visiveis = encontradas
    .filter((o) => o.potencial.nivel !== "baixo")
    .sort((a, b) => ORDEM_POTENCIAL[a.potencial.nivel] - ORDEM_POTENCIAL[b.potencial.nivel] || a.posicao! - b.posicao!);

  return {
    tipo: "nichos_categoria",
    categoriaId: categoria.id,
    categoriaNome: categoria.nome,
    oportunidades: visiveis,
    ocultas: encontradas.length - visiveis.length,
    descartados: termos.length - encontradas.length,
  };
}

/** Pesquisa por nome livre ou tirado de um link — sem posição na busca, potencial "não avaliado". */
export async function pesquisarTermo(
  termo: string,
  filtros: FiltrosNicho,
  deps: DependenciasPesquisa
): Promise<ResultadoNichosTermo> {
  const [modelos, concorrencia] = await Promise.all([
    modelosDoTermo(termo, filtros, deps),
    concorrenciaDo(termo, deps),
  ]);

  return {
    tipo: "nichos_termo",
    termo,
    oportunidade: {
      termo,
      posicao: null,
      potencial: { nivel: "nao_avaliado", motivo: "Pesquisa por nome: sem posição entre os mais buscados do ML." },
      concorrencia,
      modelos,
    },
  };
}
