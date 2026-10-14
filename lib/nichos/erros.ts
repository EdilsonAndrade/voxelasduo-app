import { ErroMakerWorld } from "./makerworld";

export interface ErroNichos {
  status: number;
  corpo: { erro: string; mensagem: string; statusOrigem?: number };
}

/** Mesmas mensagens que `auth.ts` lança — mesmo critério da rota de tendências (EDI-107). */
function ehErroDeToken(erro: unknown): boolean {
  return (
    erro instanceof Error &&
    (erro.message.includes("renovar token") || erro.message.includes("credencial do Mercado Livre"))
  );
}

/** `erroMercadoLivre` põe o status na mensagem: "... (HTTP 403): ...". */
function statusNaMensagem(mensagem: string): number | undefined {
  const achado = mensagem.match(/\(HTTP (\d{3})\)/);
  return achado ? Number(achado[1]) : undefined;
}

/**
 * Converte uma falha da pesquisa em resposta HTTP — nunca 200 — dizendo qual
 * fonte falhou e com o status real da origem e a mensagem dela (regra 3 do
 * CLAUDE.md, FR-014).
 */
export function respostaDeErroNichos(erro: unknown): ErroNichos {
  if (erro instanceof ErroMakerWorld) {
    return {
      status: erro.bloqueado ? 429 : 502,
      corpo: {
        erro: erro.bloqueado ? "makerworld_bloqueado" : "falha_makerworld",
        mensagem: erro.message,
        statusOrigem: erro.status,
      },
    };
  }

  if (ehErroDeToken(erro)) {
    return {
      status: 401,
      corpo: { erro: "token_invalido", mensagem: "Reconecte a conta do Mercado Livre para continuar." },
    };
  }

  const mensagem = erro instanceof Error ? erro.message : String(erro);
  return {
    status: 502,
    corpo: { erro: "falha_mercado_livre", mensagem, statusOrigem: statusNaMensagem(mensagem) },
  };
}
