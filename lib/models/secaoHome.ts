import type { ObjectId } from "mongodb";

export const SECOES_HOME_COLLECTION = "secoesHome";

/** Tipos de bloco que o admin pode montar na home (EDI-114). */
export const TIPOS_SECAO_HOME = [
  "bannerHero",
  "bannerIntermediario",
  "textoDestaque",
  "carrossel",
] as const;
export type TipoSecaoHome = (typeof TIPOS_SECAO_HOME)[number];

export const ALINHAMENTOS_HORIZONTAIS = ["esquerda", "centro", "direita"] as const;
export type AlinhamentoHorizontal = (typeof ALINHAMENTOS_HORIZONTAIS)[number];

export const ALINHAMENTOS_VERTICAIS = ["topo", "meio", "base"] as const;
export type AlinhamentoVertical = (typeof ALINHAMENTOS_VERTICAIS)[number];

/**
 * Paleta da marca para o texto dos banners — a cor fica salva pelo nome, e o
 * hex é fixo (não muda com o tema), porque o texto fica sobre a foto.
 */
export const CORES_TEXTO_BANNER = ["branco", "preto", "amarelo", "laranja", "rosa", "roxo", "turquesa"] as const;
export type CorTextoBanner = (typeof CORES_TEXTO_BANNER)[number];

export const HEX_COR_TEXTO_BANNER: Record<CorTextoBanner, string> = {
  branco: "#ffffff",
  preto: "#111111",
  amarelo: "#ffd24d",
  laranja: "#ff7a00",
  rosa: "#ff5bae",
  roxo: "#7b5cf6",
  turquesa: "#31d0c6",
};

export const ROTULOS_COR_TEXTO_BANNER: Record<CorTextoBanner, string> = {
  branco: "Branco",
  preto: "Preto",
  amarelo: "Amarelo",
  laranja: "Laranja",
  rosa: "Rosa",
  roxo: "Roxo",
  turquesa: "Turquesa",
};

/** Cores escuras pedem véu claro atrás do texto (em vez do véu escuro padrão). */
export const CORES_TEXTO_ESCURAS: readonly CorTextoBanner[] = ["preto", "roxo"];

/** Cor usada quando o banner não tem cor salva — mantém o visual dos banners antigos. */
export const COR_TEXTO_BANNER_PADRAO = {
  corSubtitulo: "amarelo",
  corTitulo: "branco",
  corTexto: "branco",
} as const satisfies Record<string, CorTextoBanner>;

/** Limites de texto — protegem o layout do texto sobreposto à imagem. */
export const LIMITES_SECAO_HOME = {
  titulo: 80,
  subtitulo: 160,
  texto: 300,
  textoBotao: 30,
  carrosselMin: 4,
  carrosselMax: 24,
  carrosselPadrao: 12,
} as const;

export const ROTULOS_TIPO_SECAO: Record<TipoSecaoHome, string> = {
  bannerHero: "Banner principal",
  bannerIntermediario: "Banner intermediário",
  textoDestaque: "Texto de destaque",
  carrossel: "Carrossel de produtos",
};

export interface BotaoSecao {
  texto: string;
  /** Caminho interno ("/produtos/...") ou URL externa https. */
  link: string;
}

interface SecaoHomeBase {
  _id?: ObjectId;
  tipo: TipoSecaoHome;
  ativa: boolean;
  /** Posição na home — ordenação crescente. */
  ordem: number;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface SecaoBanner extends SecaoHomeBase {
  tipo: "bannerHero" | "bannerIntermediario";
  imagemDesktop: string;
  /** Ausente = usa `imagemDesktop` também no celular. */
  imagemMobile?: string;
  titulo?: string;
  subtitulo?: string;
  texto?: string;
  botao?: BotaoSecao;
  alinhamentoHorizontal: AlinhamentoHorizontal;
  alinhamentoVertical: AlinhamentoVertical;
  /** Ausentes = `COR_TEXTO_BANNER_PADRAO`. */
  corSubtitulo?: CorTextoBanner;
  corTitulo?: CorTextoBanner;
  corTexto?: CorTextoBanner;
}

export interface SecaoTextoDestaque extends SecaoHomeBase {
  tipo: "textoDestaque";
  titulo: string;
  texto?: string;
  botao?: BotaoSecao;
}

export interface SecaoCarrossel extends SecaoHomeBase {
  tipo: "carrossel";
  titulo: string;
  linkVerTudo?: string;
  /** Quantos produtos a home exibe — o restante fica no "Ver tudo". */
  limite: number;
  /** Produtos marcados, na ordem de exibição — fonte da verdade da marcação. */
  produtoIds: ObjectId[];
}

export type SecaoHome = SecaoBanner | SecaoTextoDestaque | SecaoCarrossel;

export function ehBanner(secao: SecaoHome): secao is SecaoBanner {
  return secao.tipo === "bannerHero" || secao.tipo === "bannerIntermediario";
}
