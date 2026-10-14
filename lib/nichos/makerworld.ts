/**
 * Cliente do MakerWorld (specs/030) — API **não oficial** em `api.bambulab.com`,
 * sem login (`makerworld.com/api` fica atrás do desafio do Cloudflare). Pode
 * mudar sem aviso: todo erro vira `ErroMakerWorld` com o status HTTP real,
 * para a tela mostrar exatamente o que falhou (regra 3 do CLAUDE.md).
 */

const BASE_API = "https://api.bambulab.com";

/** A busca já filtra pelas licenças que permitem venda (conferido em research.md #3). */
const LICENCAS_BUSCA = "CC0,BY,BY-SA";

export class ErroMakerWorld extends Error {
  constructor(
    readonly status: number,
    mensagem: string,
    /** Bloqueio por excesso de acessos — vale para as próximas chamadas também. */
    readonly bloqueado = false
  ) {
    super(mensagem);
    this.name = "ErroMakerWorld";
  }
}

export type FetchImpl = typeof fetch;

/** Um modelo como vem da busca — sem perfis de impressão. */
export interface HitMakerWorld {
  id: number;
  title: string;
  slug: string;
  cover?: string;
  license?: string;
  downloadCount?: number;
  printCount?: number;
  /** Diagnóstico da busca em JSON — `rk` começa pela nota de relevância (research.md #3). */
  ext?: string;
}

/**
 * Nota de relevância que a própria busca dá ao hit (`ext.rk`, ex: "100.2|0|0").
 * Casamento forte (título/tags no idioma do termo) fica perto de 100; casamento
 * fraco, só pela imagem ou por uma palavra solta, fica perto de 10 ou abaixo.
 * `null` quando o campo não vem — a API não é oficial e pode deixar de mandar.
 */
export function relevanciaDoHit(hit: HitMakerWorld): number | null {
  if (!hit.ext) return null;
  try {
    const rk = (JSON.parse(hit.ext) as { rk?: unknown }).rk;
    const nota = typeof rk === "string" ? Number(rk.split("|")[0]) : NaN;
    return Number.isFinite(nota) ? nota : null;
  } catch {
    return null;
  }
}

interface CompatibilidadeBruta {
  devModelName?: string;
}

/** Fatiamento do mesmo perfil para outra impressora (ex: perfil de P1S refeito para A1). */
export interface OutraCompatibilidadeBruta {
  devModelName?: string;
  prediction?: number;
  weight?: number;
  modelInfo?: { plates?: unknown[] | null };
}

/** Perfil de impressão (`instance`) no detalhe do modelo. */
export interface PerfilBruto {
  id: number;
  profileId: number;
  title?: string;
  prediction?: number;
  weight?: number;
  materialColorCnt?: number;
  needAms?: boolean;
  printCount?: number;
  ratingScoreTotal?: number;
  extention?: {
    modelInfo?: {
      compatibility?: CompatibilidadeBruta;
      otherCompatibility?: CompatibilidadeBruta[] | null;
      plates?: unknown[] | null;
    };
    otherCompatibilityModelInfo?: OutraCompatibilidadeBruta[] | null;
  };
}

export interface DesignBruto {
  id: number;
  title: string;
  slug: string;
  coverUrl?: string;
  license?: string;
  downloadCount?: number;
  designCreator?: { name?: string };
  instances?: PerfilBruto[] | null;
}

/** Pausa mínima entre chamadas: rajadas fazem o Cloudflare do MakerWorld bloquear o IP (research.md #12). */
const INTERVALO_PADRAO_MS = 800;

const MENSAGEM_BLOQUEIO =
  "o MakerWorld bloqueou as consultas temporariamente (proteção contra excesso de acessos). Aguarde alguns minutos e tente de novo.";

function ehDesafioCloudflare(texto: string): boolean {
  return /just a moment|challenges\.cloudflare\.com/i.test(texto);
}

async function lerJson(resposta: Response, contexto: string): Promise<unknown> {
  const texto = await resposta.text();
  if (ehDesafioCloudflare(texto)) {
    throw new ErroMakerWorld(
      resposta.ok ? 429 : resposta.status,
      `${contexto}: ${MENSAGEM_BLOQUEIO} (HTTP ${resposta.status})`,
      true
    );
  }
  if (resposta.status === 429) {
    throw new ErroMakerWorld(429, `${contexto}: ${MENSAGEM_BLOQUEIO} (HTTP 429)`, true);
  }
  if (!resposta.ok) {
    const detalhe = texto.trim().slice(0, 200);
    throw new ErroMakerWorld(
      resposta.status,
      `${contexto}: MakerWorld respondeu HTTP ${resposta.status}${detalhe ? `: ${detalhe}` : "."}`
    );
  }
  try {
    return JSON.parse(texto);
  } catch {
    // 200 com HTML = bloqueio/página de desafio: não é um JSON vazio, é falha.
    throw new ErroMakerWorld(502, `${contexto}: MakerWorld devolveu algo que não é JSON (possível bloqueio).`);
  }
}

export function criarClienteMakerWorld(opcoes: { fetchImpl?: FetchImpl; intervaloMs?: number } = {}) {
  const fetchImpl = opcoes.fetchImpl ?? fetch;
  const intervaloMs = opcoes.intervaloMs ?? INTERVALO_PADRAO_MS;
  // Fila: uma chamada por vez, com pausa entre elas, mesmo que o chamador dispare várias juntas.
  let fila: Promise<unknown> = Promise.resolve();

  function chamar(caminho: string, contexto: string): Promise<unknown> {
    const vez = fila.then(() => chamarAgora(caminho, contexto));
    fila = vez.catch(() => undefined).then(() => new Promise((r) => setTimeout(r, intervaloMs)));
    return vez;
  }

  async function chamarAgora(caminho: string, contexto: string): Promise<unknown> {
    let resposta: Response;
    try {
      resposta = await fetchImpl(`${BASE_API}${caminho}`, { headers: { Accept: "application/json" } });
    } catch (erro) {
      throw new ErroMakerWorld(503, `${contexto}: sem conexão com o MakerWorld (${(erro as Error).message}).`);
    }
    return lerJson(resposta, contexto);
  }

  return {
    /** Busca semântica (aceita pt-BR), já limitada às licenças que permitem venda. */
    async buscarModelos(termo: string, limite = 5): Promise<HitMakerWorld[]> {
      const params = new URLSearchParams({
        keyword: termo,
        limit: String(limite),
        offset: "0",
        licenses: LICENCAS_BUSCA,
      });
      const corpo = (await chamar(
        `/v1/search-service/select/design2?${params}`,
        "Falha ao buscar modelos no MakerWorld"
      )) as { hits?: HitMakerWorld[] | null };
      return corpo.hits ?? [];
    },

    /** Detalhe do modelo, com os perfis de impressão (tempo, gramas, cores, impressora). */
    async buscarDesign(id: number): Promise<DesignBruto> {
      return (await chamar(
        `/v1/design-service/design/${encodeURIComponent(String(id))}`,
        "Falha ao ler o modelo no MakerWorld"
      )) as DesignBruto;
    },
  };
}

export type ClienteMakerWorld = ReturnType<typeof criarClienteMakerWorld>;
