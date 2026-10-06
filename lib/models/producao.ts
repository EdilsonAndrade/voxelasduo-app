import type { ObjectId } from "mongodb";

export const IMPRESSOES_COLLECTION = "impressoes";
export const VINCULOS_PRODUCAO_COLLECTION = "vinculosProducao";
export const LANCAMENTOS_PRODUCAO_COLLECTION = "lancamentosProducao";
export const IMPORTACOES_PRODUCAO_COLLECTION = "importacoesProducao";

/**
 * Resultado de um trabalho de impressão (EDI-127). A origem usa `status` 2
 * para concluída e 3 para interrompida; qualquer outro valor é trabalho ainda
 * em curso — que **não** é falha e não pode ser contado como tal.
 */
export type ResultadoImpressao = "concluida" | "interrompida" | "em_andamento";

/** Consumo relatado por slot do AMS — guardado para a futura fase de consumo por carretel. */
export interface ConsumoSlot {
  material?: string;
  cor?: string;
  gramas?: number;
}

/**
 * Um trabalho de impressão importado da nuvem da Bambu Lab (EDI-127).
 *
 * `gramas` é o consumo da **placa inteira** relatado pelo fatiador, não o de
 * uma peça: dividir pelo rendimento declarado no vínculo é o que separa um
 * custo correto de um custo N vezes errado.
 *
 * O vínculo com o produto **não** é copiado para cá: é resolvido por
 * `nomeArquivo` a cada leitura, para que criar ou corrigir um vínculo valha
 * retroativamente sem reescrever impressão nenhuma (FR-016).
 */
export interface Impressao {
  _id?: ObjectId;
  /** Identificador na origem — índice único, é o que evita duplicidade (FR-007). */
  taskId: string;
  /**
   * Chave do vínculo com o produto. Placa do MakerWorld: `mw:<designId>:<profileId>:<plateIndex>`
   * — o `title` dali é o nome do perfil e se repete entre modelos diferentes.
   * Arquivo próprio: o `title` (nome do projeto). Ver `chaveDaTask`.
   */
  nomeArquivo: string;
  /** Nome legível para a tela: o do modelo no MakerWorld, ou o do projeto. */
  titulo?: string;
  /** Nome do perfil de impressão (MakerWorld), ex.: "0.2mm layer, 2 walls, 15% infill". */
  nomePerfil?: string;
  nomePlaca?: string;
  /** Modelo no MakerWorld — permite o link para a página dele. */
  designId?: string;
  /** Versão da regra de `nomeArquivo` que gerou este registro; ver `VERSAO_CHAVE`. */
  versaoChave?: number;
  /** Miniatura no CDN do fabricante. A URL é assinada e **expira**: serve só como origem da cópia. */
  coverUrl?: string;
  /** Cópia da miniatura no nosso storage — é esta que a tela usa, porque não expira. */
  miniaturaUrl?: string;
  resultado: ResultadoImpressao;
  inicio: Date;
  /** Ausente em registro incompleto da origem; sem ele não há duração nem custo de tempo. */
  fim?: Date;
  /** `fim − inicio`: a duração real, nunca a estimativa do fatiador (FR-006). */
  duracaoSegundos?: number;
  /** Consumo da placa inteira, em gramas. Ausente ou 0 = fora de todo cálculo. */
  gramas?: number;
  comprimentoMm?: number;
  /** `costTime` da origem — guardado só para comparar o estimado com o real. */
  estimativaSegundos?: number;
  material?: string;
  cores: string[];
  gramasPorSlot: ConsumoSlot[];
  impressoraId?: string;
  impressoraNome?: string;
  /**
   * `true` quando a impressão terminou antes de a conta ser conectada
   * (`CredencialBambuLab.ativadoEm`). Conta para custo, gramas, horas e
   * falhas, mas nunca oferece lançamento de estoque — o estoque atual já a
   * reflete (FR-038).
   */
  historico: boolean;
  /** Quanto do rendimento desta impressão já virou estoque (FR-034/FR-036). */
  quantidadeLancada: number;
  /** Quanto o vendedor declarou como perda (peça quebrada na remoção, FR-033). */
  quantidadePerdida: number;
  importadoEm: Date;
}

/**
 * A ponte declarada pelo vendedor entre um nome de arquivo e uma **parte** de
 * um produto (EDI-127). Produto de peça única é o caso particular de um só
 * vínculo; produto multipartes tem um vínculo por parte, todos apontando para
 * o mesmo `produtoId`.
 */
export interface VinculoArquivoProduto {
  _id?: ObjectId;
  /** Chave do vínculo — índice único. */
  nomeArquivo: string;
  produtoId: ObjectId;
  /** Rótulo livre da parte: "Peça única", "Base", "Tampa". */
  parte: string;
  /** Unidades da parte que saem de uma placa — inteiro >= 1. */
  rendimentoPorPlaca: number;
  /** Unidades desta parte que compõem um produto acabado — inteiro >= 1. */
  unidadesPorProduto: number;
  criadoEm: Date;
  atualizadoEm: Date;
}

/** O que foi consumido de cada impressão num lançamento (FIFO por parte). */
export interface ConsumoLancamento {
  impressaoId: ObjectId;
  parte: string;
  unidades: number;
}

/** Rastro de uma entrada de estoque originada da produção (FR-032 a FR-039). */
export interface LancamentoProducao {
  _id?: ObjectId;
  produtoId: ObjectId;
  /** Unidades acabadas que entraram no estoque. */
  quantidade: number;
  /** Declaradas como perda no mesmo lançamento — não entram no estoque. */
  quantidadePerdida: number;
  consumo: ConsumoLancamento[];
  usuarioEmail?: string;
  criadoEm: Date;
}

export type OrigemImportacao = "manual" | "automatica";

/** Resultado de uma execução da importação, para exibir a última (FR-011). */
export interface ImportacaoProducao {
  _id?: ObjectId;
  origem: OrigemImportacao;
  iniciadoEm: Date;
  terminadoEm?: Date;
  novas: number;
  ignoradas: number;
  paginas: number;
  /** Quantas impressões a origem diz ter no histórico — ver ResultadoImportacao. */
  totalNaOrigem?: number;
  /** Capas copiadas para o nosso storage nesta execução — ver `miniaturas.ts`. */
  miniaturasCopiadas?: number;
  /** Mensagem com o status HTTP real da origem — nada é mascarado (FR-004). */
  erro?: string;
}

export const PARTE_PECA_UNICA = "Peça única";
