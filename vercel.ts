import type { VercelConfig } from "@vercel/config/v1";

/**
 * Reprocessa a fila de sincronização de estoque (Tarefa 5/EDI-78,
 * research.md #5). Plano Hobby da Vercel só permite cron diário — roda
 * 1x/dia às 03:00 UTC. O comportamento de retry com backoff não muda, só a
 * frequência da varredura; itens elegíveis continuam sendo tentados
 * novamente na próxima execução caso o horário passe do backoff calculado.
 */
export const config: VercelConfig = {
  crons: [{ path: "/api/estoque/sincronizar", schedule: "0 3 * * *" }],
};
