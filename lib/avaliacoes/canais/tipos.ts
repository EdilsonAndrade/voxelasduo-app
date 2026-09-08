/** Formato comum de uma avaliação vinda de qualquer canal externo, antes do upsert (data-model.md). */
export interface AvaliacaoImportada {
  avaliacaoIdCanal: string;
  nota: number;
  comentario?: string;
  dataAvaliacao: Date;
}

/** Interface comum a qualquer client de avaliações por canal — mesma ideia de `CanalEstoqueClient` (Tarefa 5). */
export interface ClienteAvaliacoesCanal {
  buscarAvaliacoes(anuncioId: string): Promise<AvaliacaoImportada[]>;
}
