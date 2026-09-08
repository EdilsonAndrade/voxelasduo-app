import type { VercelConfig } from "@vercel/config/v1";

/**
 * Reprocessa a fila de sincronização de estoque (Tarefa 5/EDI-78,
 * research.md #5) e importa avaliações dos canais externos (Tarefa
 * 11/EDI-85, research.md #5 da mesma tarefa). Plano Hobby da Vercel só
 * permite cron diário — cada job roda 1x/dia, em horários diferentes para
 * não concorrer pela mesma janela. O comportamento de retry com backoff do
 * cron de estoque não muda, só a frequência da varredura; itens elegíveis
 * continuam sendo tentados novamente na próxima execução caso o horário
 * passe do backoff calculado.
 */
export const config: VercelConfig = {
  crons: [
    { path: "/api/estoque/sincronizar", schedule: "0 3 * * *" },
    { path: "/api/avaliacoes/importar", schedule: "0 4 * * *" },
  ],
};
