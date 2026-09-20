import { obterAccessTokenValido } from "./auth";
import { erroMercadoLivre } from "./erros";

const API = "https://api.mercadolibre.com";
const TTL_MS = 6 * 60 * 60 * 1000;
const LIMITE_BUSCA = 8;

export interface CategoriaML {
  id: string;
  nome: string;
  /** `true` = categoria folha, a única onde o Mercado Livre aceita publicar (`POST /items`). */
  folha: boolean;
  /** Caminho da raiz até a categoria (ex: "Casa, Móveis e Decoração > Decoração > Estatuetas"); ausente na listagem de raízes. */
  caminho?: string;
}

interface CategoriaBruta {
  id: string;
  name: string;
  path_from_root?: Array<{ id: string; name: string }>;
  children_categories?: Array<{ id: string; name: string }>;
}

const cache = new Map<string, { expiraEm: number; valor: unknown }>();

async function comCache<T>(chave: string, carregar: () => Promise<T>): Promise<T> {
  const emCache = cache.get(chave);
  if (emCache && emCache.expiraEm > Date.now()) return emCache.valor as T;

  const valor = await carregar();
  cache.set(chave, { expiraEm: Date.now() + TTL_MS, valor });
  return valor;
}

async function get<T>(caminho: string, contexto: string): Promise<T> {
  const token = await obterAccessTokenValido();
  const resposta = await fetch(`${API}${caminho}`, { headers: { Authorization: `Bearer ${token}` } });

  if (!resposta.ok) {
    throw await erroMercadoLivre(resposta, contexto);
  }

  return (await resposta.json()) as T;
}

function caminhoLegivel(categoria: CategoriaBruta): string | undefined {
  return categoria.path_from_root?.map((c) => c.name).join(" > ") || undefined;
}

/** Categorias de nível 1 do Mercado Livre Brasil — o ponto de partida da navegação em árvore. */
export function listarCategoriasRaiz(): Promise<CategoriaML[]> {
  return comCache("raiz", async () => {
    const raizes = await get<Array<{ id: string; name: string }>>(
      "/sites/MLB/categories",
      "Falha ao listar as categorias do Mercado Livre"
    );
    return raizes.map((c) => ({ id: c.id, nome: c.name, folha: false }));
  });
}

/** Uma categoria (com o caminho até ela) e as suas filhas diretas — vazio em `filhas` = folha. */
export function obterCategoria(id: string): Promise<{ categoria: CategoriaML; filhas: CategoriaML[] }> {
  return comCache(`categoria:${id}`, async () => {
    const bruta = await get<CategoriaBruta>(
      `/categories/${encodeURIComponent(id)}`,
      "Falha ao consultar a categoria no Mercado Livre"
    );
    const filhas = (bruta.children_categories ?? []).map((c) => ({
      id: c.id,
      nome: c.name,
      // Não sabemos ainda se a filha é folha sem consultá-la — só se ela for aberta.
      folha: false,
    }));

    return {
      categoria: {
        id: bruta.id,
        nome: bruta.name,
        folha: filhas.length === 0,
        caminho: caminhoLegivel(bruta),
      },
      filhas,
    };
  });
}

/**
 * Busca categorias por texto usando o previsor do Mercado Livre
 * (`domain_discovery`) — devolve só folhas, já com o caminho completo, pois
 * é o que a API aceita na publicação. Falha de uma consulta de caminho não
 * derruba a busca inteira: a categoria só vem sem `caminho`.
 */
export async function buscarCategorias(termo: string): Promise<CategoriaML[]> {
  const consulta = termo.trim();
  if (consulta.length < 2) return [];

  const resultados = await comCache(`busca:${consulta.toLowerCase()}`, () =>
    get<Array<{ category_id: string; category_name: string }>>(
      `/sites/MLB/domain_discovery/search?limit=${LIMITE_BUSCA}&q=${encodeURIComponent(consulta)}`,
      "Falha ao buscar categorias no Mercado Livre"
    )
  );

  const unicos = [...new Map(resultados.map((r) => [r.category_id, r])).values()];

  return Promise.all(
    unicos.map(async (r) => {
      try {
        const { categoria } = await obterCategoria(r.category_id);
        return { ...categoria, folha: true };
      } catch {
        return { id: r.category_id, nome: r.category_name, folha: true };
      }
    })
  );
}
