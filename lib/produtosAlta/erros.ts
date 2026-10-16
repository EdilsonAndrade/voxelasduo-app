import { ErroNaoEncontrado } from "@/lib/tendencias/cache";

export interface ErroProdutosAlta {
  status: number;
  corpo: { erro: string; mensagem: string; statusOrigem?: number };
}

/** Categoria fora das 16 do 3D (e não descendente delas) — vira 400, não falha do ML. */
export class ErroCategoriaInvalida extends ErroNaoEncontrado {
  constructor() {
    super("Escolha uma das categorias da lista ou uma subcategoria delas.");
  }
}

/** Mesmas mensagens que `auth.ts` lança — mesmo critério de `lib/nichos/erros.ts`. */
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
 * Falha do buscador em resposta HTTP — nunca 200 — com o status real e a
 * mensagem do ML, para aparecer na aba Network (regra 3 do CLAUDE.md).
 */
export function respostaDeErroProdutosAlta(erro: unknown): ErroProdutosAlta {
  if (erro instanceof ErroCategoriaInvalida) {
    return { status: 400, corpo: { erro: "categoria_invalida", mensagem: erro.message } };
  }

  if (ehErroDeToken(erro)) {
    return {
      status: 401,
      corpo: { erro: "token_invalido", mensagem: "Reconecte a conta do Mercado Livre para continuar." },
    };
  }

  const mensagem = erro instanceof Error ? erro.message : String(erro);
  const statusOrigem = statusNaMensagem(mensagem);

  if (statusOrigem === 429) {
    return {
      status: 429,
      corpo: {
        erro: "limite_mercado_livre",
        mensagem: "Muitas consultas ao Mercado Livre, aguarde alguns minutos.",
        statusOrigem,
      },
    };
  }

  return { status: 502, corpo: { erro: "falha_mercado_livre", mensagem, statusOrigem } };
}
