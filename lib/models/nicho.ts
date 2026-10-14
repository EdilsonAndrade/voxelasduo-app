/** Filtros escolhidos antes da pesquisa de nichos (specs/030, FR-002/FR-005). */
export interface FiltrosNicho {
  /** Só perfis com um único filamento e sem AMS — impressão rápida, sem troca de cor. */
  umaCor: boolean;
  /** Só perfis feitos para a A1 ou A1 mini. */
  compativelA1: boolean;
}

/** Licenças do MakerWorld que permitem vender a peça impressa. */
export type LicencaVenda = "CC0" | "BY" | "BY-SA";

/** Perfil de impressão escolhido de um modelo (o que define tempo e gramas). */
export interface PerfilSugerido {
  id: number;
  profileId: number;
  nome: string;
  segundos: number;
  gramas: number;
  mesas: number;
  cores: number;
  /** Código da impressora do fatiamento: `N2S` = A1, `N1` = A1 mini. */
  impressora: string;
  impressoes: number;
}

export interface ModeloSugerido {
  id: number;
  nome: string;
  slug: string;
  capa: string;
  autor: string;
  licenca: LicencaVenda;
  downloads: number;
  /** Página do modelo já no perfil escolhido — lá o usuário abre no Bambu Studio. */
  url: string;
  perfil: PerfilSugerido;
}

export interface Concorrencia {
  nivel: "baixa" | "media" | "alta" | "indisponivel";
  /** Produtos de catálogo do ML para o termo — 10000 é o teto que o ML devolve. */
  produtosCatalogo: number | null;
}

export interface Potencial {
  nivel: "baixo" | "medio" | "alto" | "nao_avaliado";
  motivo: string;
}

export interface Oportunidade {
  termo: string;
  /** Posição entre os mais buscados da categoria — `null` na pesquisa por nome/link. */
  posicao: number | null;
  potencial: Potencial;
  concorrencia: Concorrencia;
  modelos: ModeloSugerido[];
}

export interface ResultadoNichosCategoria {
  [campo: string]: unknown;
  tipo: "nichos_categoria";
  categoriaId: string;
  categoriaNome: string;
  /** Só potencial médio e alto, alto primeiro. */
  oportunidades: Oportunidade[];
  /** Oportunidades de potencial baixo, escondidas da lista. */
  ocultas: number;
  /** Termos sem modelo imprimível que passe nos filtros. */
  descartados: number;
}

export interface ResultadoNichosTermo {
  [campo: string]: unknown;
  tipo: "nichos_termo";
  termo: string;
  oportunidade: Oportunidade;
}
