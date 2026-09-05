import type { Canal } from "@/lib/models/estoqueSincronizacao";

export type { Canal };

/** Interface comum a qualquer canal externo — permite trocar um client (ex: stub → real) sem tocar em `sincronizacao.ts`. */
export interface CanalEstoqueClient {
  atualizarQuantidade(anuncioId: string, quantidade: number): Promise<void>;
}
