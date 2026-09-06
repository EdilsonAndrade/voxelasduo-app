import type { Canal } from "@/lib/models/estoqueSincronizacao";

export type { Canal };

/** Interface comum a qualquer canal externo — permite trocar um client (ex: stub → real) sem tocar em `sincronizacao.ts`. */
export interface CanalEstoqueClient {
  /**
   * Atualiza quantidade e preço do anúncio (Tarefa 7/EDI-80 — antes só quantidade).
   * `descricao` só é enviado quando o chamador pede a sincronização de descrição
   * (edição feita no admin) — omitido nos ciclos de baixa de estoque por venda,
   * que não mudam a descrição.
   */
  atualizarAnuncio(
    anuncioId: string,
    dados: { quantidade: number; preco: number; descricao?: string }
  ): Promise<void>;
}
