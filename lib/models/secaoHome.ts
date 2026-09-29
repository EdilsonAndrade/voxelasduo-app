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
