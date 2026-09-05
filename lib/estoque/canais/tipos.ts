import type { Canal } from "@/lib/models/estoqueSincronizacao";

export type { Canal };

/** Interface comum a qualquer canal externo — permite trocar um client (ex: stub → real) sem tocar em `sincronizacao.ts`. */
export interface CanalEstoqueClient {
  /** Atualiza quantidade e preço do anúncio (Tarefa 7/EDI-80 — antes só quantidade). */
  atualizarAnuncio(anuncioId: string, dados: { quantidade: number; preco: number }): Promise<void>;
}
