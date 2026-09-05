import type { VercelConfig } from "@vercel/config/v1";

/**
 * Reprocessa a fila de sincronização de estoque (Tarefa 5/EDI-78,
 * research.md #5). A cadência (15 min) pode precisar de ajuste conforme o
 * plano Vercel vigente — o comportamento de retry com backoff não muda, só
 * a frequência da varredura.
 */
export const config: VercelConfig = {
  crons: [{ path: "/api/estoque/sincronizar", schedule: "*/15 * * * *" }],
};
