import { NextResponse } from "next/server";
import { criarClienteBambu, ErroBambu } from "@/lib/producao/bambu/cliente";
import {
  buscarCredencialBambu,
  estadoDaConexao,
  removerCredencialBambu,
  salvarCredencialBambu,
} from "@/lib/producao/credencial";

/**
 * Conexão com a nuvem da Bambu Lab (contracts/producao-api.md).
 *
 * Nenhuma resposta aqui devolve `accessToken` nem senha (FR-033) — só o
 * estado e as datas. Erros da origem saem com o status HTTP real (FR-004).
 */
export async function GET() {
  const credencial = await buscarCredencialBambu();

  return NextResponse.json({
    estado: estadoDaConexao(credencial),
    expiraEm: credencial?.expiraEm ?? null,
    ativadoEm: credencial?.ativadoEm ?? null,
  });
}

type Payload =
  | { modo: "senha"; email?: string; senha?: string }
  | { modo: "codigo"; email?: string; codigo?: string }
  | { modo: "totp"; tfaKey?: string; codigo?: string }
  | { modo: "token"; accessToken?: string };

export async function POST(request: Request) {
  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ erro: "Corpo inválido." }, { status: 400 });
  }

  const cliente = criarClienteBambu();

  try {
    if (payload.modo === "token") {
      if (!payload.accessToken?.trim()) {
        return NextResponse.json({ erro: "Informe o token de acesso." }, { status: 400 });
      }
      const credencial = await salvarCredencialBambu({ accessToken: payload.accessToken.trim() });
      return NextResponse.json({ estado: "ativa", expiraEm: credencial.expiraEm });
    }

    if (payload.modo === "senha") {
      if (!payload.email?.trim() || !payload.senha) {
        return NextResponse.json({ erro: "Informe e-mail e senha." }, { status: 400 });
      }

      const resultado = await cliente.login(payload.email.trim(), payload.senha);

      if (resultado.tipo === "precisaCodigo") {
        // Verificação por e-mail: já pedimos o código, para o vendedor só
        // precisar digitá-lo. No TOTP o código vem do autenticador dele.
        if (resultado.metodo === "email") {
          await cliente.solicitarCodigo(payload.email.trim());
        }
        return NextResponse.json(
          { precisaCodigo: true, metodo: resultado.metodo, tfaKey: resultado.tfaKey ?? null },
          { status: 202 }
        );
      }

      return NextResponse.json(await concluir(resultado.accessToken));
    }

    if (payload.modo === "codigo") {
      if (!payload.email?.trim() || !payload.codigo?.trim()) {
        return NextResponse.json({ erro: "Informe e-mail e código." }, { status: 400 });
      }
      const resultado = await cliente.loginComCodigo(payload.email.trim(), payload.codigo.trim());
      return NextResponse.json(await concluir((resultado as { accessToken: string }).accessToken));
    }

    if (payload.modo === "totp") {
      if (!payload.tfaKey || !payload.codigo?.trim()) {
        return NextResponse.json({ erro: "Informe o código do autenticador." }, { status: 400 });
      }
      const resultado = await cliente.loginComTotp(payload.tfaKey, payload.codigo.trim());
      return NextResponse.json(await concluir((resultado as { accessToken: string }).accessToken));
    }

    return NextResponse.json({ erro: "Modo de conexão desconhecido." }, { status: 400 });
  } catch (erro) {
    if (erro instanceof ErroBambu) {
      // 401/403 são do vendedor (credencial recusada); o resto é falha da origem.
      const status = erro.status === 401 || erro.status === 403 ? erro.status : 502;
      return NextResponse.json({ erro: erro.message }, { status });
    }
    const mensagem = erro instanceof Error ? erro.message : "Falha ao conectar.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}

/** Guarda o token e tenta descobrir o `userId` — a falha nisso não invalida a conexão. */
async function concluir(accessToken: string) {
  let userId: string | undefined;
  try {
    userId = await criarClienteBambu({ accessToken }).buscarUserId();
  } catch {
    // O `userId` só é necessário na fase de tempo real; não impede importar.
  }
  const credencial = await salvarCredencialBambu({ accessToken, userId });
  return { estado: "ativa" as const, expiraEm: credencial.expiraEm };
}

export async function DELETE() {
  await removerCredencialBambu();
  return NextResponse.json({ estado: "ausente" });
}
