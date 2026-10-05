/**
 * Cliente da nuvem da Bambu Lab (EDI-127) — API **não oficial**, documentada
 * pela comunidade (research.md #1 e #2). Duas decisões moldam este módulo:
 *
 * 1. `fetchImpl` é injetado, para que todo o cliente seja testável sem rede e
 *    sem credencial — a API não pode ser chamada em CI.
 * 2. Todo erro vira `ErroBambu`, que carrega o **status HTTP real** e a
 *    mensagem da origem. Nada é mascarado: a tela mostra o status de verdade
 *    (regra 3 do CLAUDE.md, FR-004).
 */

const BASE_API = "https://api.bambulab.com";
const BASE_SITE = "https://bambulab.com";

/** Erro de comunicação com a origem, com o status HTTP preservado. */
export class ErroBambu extends Error {
  constructor(
    readonly status: number,
    mensagem: string
  ) {
    super(mensagem);
    this.name = "ErroBambu";
  }
}

export type FetchImpl = typeof fetch;

export interface OpcoesCliente {
  fetchImpl?: FetchImpl;
  accessToken?: string;
}

/** O que o login devolve: ou o acesso, ou o que falta para obtê-lo. */
export type ResultadoLogin =
  | { tipo: "token"; accessToken: string; refreshToken?: string }
  | { tipo: "precisaCodigo"; metodo: "email" | "totp"; tfaKey?: string };

export interface TaskBambu {
  id: number | string;
  title?: string;
  plateName?: string;
  cover?: string;
  status?: number;
  startTime?: string;
  endTime?: string;
  weight?: number;
  length?: number;
  costTime?: number;
  material?: string;
  deviceId?: string;
  deviceName?: string;
  amsDetailMapping?: {
    ams?: number;
    amsId?: number;
    slotId?: number;
    sourceColor?: string;
    targetColor?: string;
    filamentId?: string;
    filamentType?: string;
    targetFilamentType?: string;
    weight?: number;
  }[];
}

export interface PaginaTasks {
  total: number;
  hits: TaskBambu[];
}

export interface DispositivoBambu {
  dev_id: string;
  name?: string;
  online?: boolean;
  dev_model_name?: string;
}

async function lerErro(resposta: Response): Promise<never> {
  let detalhe = "";
  try {
    const corpo = (await resposta.json()) as { message?: string; error?: string };
    detalhe = corpo.message || corpo.error || "";
  } catch {
    // Resposta sem JSON (HTML de bloqueio, corpo vazio) — o status já informa.
  }
  const sufixo = detalhe ? `: ${detalhe}` : ".";
  throw new ErroBambu(resposta.status, `Bambu Lab respondeu HTTP ${resposta.status}${sufixo}`);
}

export function criarClienteBambu(opcoes: OpcoesCliente = {}) {
  const fetchImpl = opcoes.fetchImpl ?? fetch;

  async function chamar<T>(caminho: string, init: RequestInit = {}): Promise<T> {
    const resposta = await fetchImpl(`${BASE_API}${caminho}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(opcoes.accessToken ? { Authorization: `Bearer ${opcoes.accessToken}` } : {}),
        ...init.headers,
      },
    });

    if (!resposta.ok) await lerErro(resposta);
    return (await resposta.json()) as T;
  }

  /**
   * Login com e-mail e senha. A conta pode exigir verificação em duas etapas:
   * neste caso a resposta vem sem `accessToken` e o chamador precisa pedir o
   * código ao vendedor e chamar `loginComCodigo` (ou `loginComTotp`).
   */
  async function login(account: string, password: string): Promise<ResultadoLogin> {
    const corpo = await chamar<{
      accessToken?: string;
      refreshToken?: string;
      loginType?: string;
      tfaKey?: string;
    }>("/v1/user-service/user/login", {
      method: "POST",
      body: JSON.stringify({ account, password }),
    });

    if (corpo.accessToken) {
      return { tipo: "token", accessToken: corpo.accessToken, refreshToken: corpo.refreshToken };
    }
    if (corpo.tfaKey) {
      return { tipo: "precisaCodigo", metodo: "totp", tfaKey: corpo.tfaKey };
    }
    // `loginType` costuma vir como "verifyCode" quando a verificação é por e-mail.
    return { tipo: "precisaCodigo", metodo: "email" };
  }

  /** Pede à origem o envio do código de 6 dígitos por e-mail. */
  async function solicitarCodigo(email: string): Promise<void> {
    await chamar("/v1/user-service/user/sendemail/code", {
      method: "POST",
      body: JSON.stringify({ email, type: "codeLogin" }),
    });
  }

  /** Login com o código recebido por e-mail — `password` e `code` são mutuamente exclusivos na origem. */
  async function loginComCodigo(account: string, code: string): Promise<ResultadoLogin> {
    const corpo = await chamar<{ accessToken?: string; refreshToken?: string }>(
      "/v1/user-service/user/login",
      { method: "POST", body: JSON.stringify({ account, code }) }
    );

    if (!corpo.accessToken) {
      throw new ErroBambu(401, "Bambu Lab não devolveu token para o código informado.");
    }
    return { tipo: "token", accessToken: corpo.accessToken, refreshToken: corpo.refreshToken };
  }

  /**
   * Login com código de autenticador (TOTP). Diferente dos demais, roda no
   * domínio do site e exige CSRF: buscar o token em `/api/csrf` e devolvê-lo
   * tanto no header quanto no cookie (research.md #1).
   */
  async function loginComTotp(tfaKey: string, tfaCode: string): Promise<ResultadoLogin> {
    const respostaCsrf = await fetchImpl(`${BASE_SITE}/api/csrf`, { method: "GET" });
    if (!respostaCsrf.ok) await lerErro(respostaCsrf);

    const cookies = respostaCsrf.headers.get("set-cookie") ?? "";
    const csrf = /bbl_csrf_token=([^;]+)/.exec(cookies)?.[1];
    if (!csrf) {
      throw new ErroBambu(502, "Bambu Lab não devolveu o token CSRF necessário para o 2FA.");
    }

    const resposta = await fetchImpl(`${BASE_SITE}/api/sign-in/tfa`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bbl-csrf-token": csrf,
        Cookie: `bbl_csrf_token=${csrf}`,
      },
      body: JSON.stringify({ tfaKey, tfaCode }),
    });
    if (!resposta.ok) await lerErro(resposta);

    // O token vem como cookie `token` na resposta do site, não no corpo.
    const setCookie = resposta.headers.get("set-cookie") ?? "";
    const token = /(?:^|[;,\s])token=([^;]+)/.exec(setCookie)?.[1];
    if (!token) {
      throw new ErroBambu(502, "Bambu Lab aceitou o 2FA mas não devolveu o token de acesso.");
    }
    return { tipo: "token", accessToken: token };
  }

  /**
   * Uma página do histórico de impressões, do mais recente para o mais
   * antigo. `after` é o cursor devolvido pela página anterior.
   */
  async function listarTasks(
    params: { after?: string; limit?: number; deviceId?: string } = {}
  ): Promise<PaginaTasks> {
    const query = new URLSearchParams();
    if (params.after) query.set("after", params.after);
    query.set("limit", String(params.limit ?? 50));
    if (params.deviceId) query.set("deviceId", params.deviceId);

    const corpo = await chamar<{ total?: number; hits?: TaskBambu[] }>(
      `/v1/user-service/my/tasks?${query.toString()}`
    );
    return { total: corpo.total ?? 0, hits: corpo.hits ?? [] };
  }

  /** Impressoras vinculadas à conta — usado só para popular o filtro por máquina. */
  async function listarDispositivos(): Promise<DispositivoBambu[]> {
    const corpo = await chamar<{ devices?: DispositivoBambu[] }>(
      "/v1/iot-service/api/user/bind"
    );
    return corpo.devices ?? [];
  }

  /** Identificador do usuário na nuvem — guardado para a futura fase de tempo real. */
  async function buscarUserId(): Promise<string | undefined> {
    const corpo = await chamar<{ uid?: number | string }>(
      "/v1/design-user-service/my/preference"
    );
    return corpo.uid !== undefined ? String(corpo.uid) : undefined;
  }

  return {
    login,
    solicitarCodigo,
    loginComCodigo,
    loginComTotp,
    listarTasks,
    listarDispositivos,
    buscarUserId,
  };
}

export type ClienteBambu = ReturnType<typeof criarClienteBambu>;
