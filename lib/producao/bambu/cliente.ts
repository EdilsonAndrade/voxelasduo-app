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
  /**
   * Nome do **perfil** de impressão quando a placa veio do MakerWorld (o nome
   * padrão de lá é "0.2mm layer, 2 walls, 15% infill"); nome do projeto
   * quando veio de um arquivo próprio.
   */
  title?: string;
  /** Nome do modelo no MakerWorld — ausente (ou `designId` 0) em arquivo próprio. */
  designTitle?: string;
  designId?: number | string;
  profileId?: number | string;
  plateIndex?: number;
  plateName?: string;
  cover?: string;
  status?: number;
  startTime?: string;
  endTime?: string;
  weight?: number;
  length?: number;
  costTime?: number;
  /** Em algumas respostas vem como objeto, não como texto — ver `textoDeMaterial`. */
  material?: unknown;
  deviceId?: string;
  deviceName?: string;
  amsDetailMapping?: {
    ams?: number;
    amsId?: number;
    slotId?: number;
    sourceColor?: string;
    targetColor?: string;
    filamentId?: string;
    filamentType?: unknown;
    targetFilamentType?: unknown;
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

/** Marca um corpo que veio, mas não era JSON (HTML de bloqueio, texto solto). */
const TEXTO_CRU = Symbol("textoCru");

/**
 * Lê o corpo tolerando o que esta API não oficial realmente faz: responder
 * 200 sem corpo nenhum (é o caso do envio do código por e-mail) ou devolver
 * HTML quando bloqueia a requisição. `resposta.json()` direto quebraria com
 * "Unexpected end of JSON input", escondendo o status real.
 */
async function lerCorpo(resposta: Response): Promise<Record<string, unknown>> {
  const texto = (await resposta.text()).trim();
  if (!texto) return {};

  try {
    const corpo = JSON.parse(texto) as unknown;
    return corpo && typeof corpo === "object" ? (corpo as Record<string, unknown>) : {};
  } catch {
    return { [TEXTO_CRU]: texto.slice(0, 200) } as Record<string, unknown>;
  }
}

function lancarErro(status: number, corpo: Record<string, unknown>): never {
  const detalhe =
    (corpo.message as string) ||
    (corpo.error as string) ||
    ((corpo as Record<symbol, string>)[TEXTO_CRU] ?? "");

  const sufixo = detalhe ? `: ${detalhe}` : ".";
  throw new ErroBambu(status, `Bambu Lab respondeu HTTP ${status}${sufixo}`);
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

    const corpo = await lerCorpo(resposta);
    if (!resposta.ok) lancarErro(resposta.status, corpo);

    // 2xx com corpo que não é JSON: provavelmente uma página de bloqueio
    // respondida com status 200. Falha explícita, em vez de seguir com dados
    // vazios e um erro confuso mais adiante.
    if ((corpo as Record<symbol, string>)[TEXTO_CRU]) {
      lancarErro(502, corpo);
    }

    return corpo as T;
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
    if (!respostaCsrf.ok) lancarErro(respostaCsrf.status, await lerCorpo(respostaCsrf));

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
    if (!resposta.ok) lancarErro(resposta.status, await lerCorpo(resposta));

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

  /**
   * Perfil da conta conectada. O `uid` é o mesmo número que a impressora e o
   * Bambu Studio exibem como `user_<uid>`, o que permite conferir a olho se o
   * admin está lendo a mesma conta em que a impressora está vinculada.
   */
  async function buscarPerfil(): Promise<{ uid?: string; nome?: string }> {
    const corpo = await chamar<{
      uid?: number | string;
      name?: string;
      nickName?: string;
      account?: string;
    }>("/v1/design-user-service/my/preference");

    return {
      uid: corpo.uid !== undefined ? String(corpo.uid) : undefined,
      nome: corpo.name || corpo.nickName || corpo.account || undefined,
    };
  }

  return {
    login,
    solicitarCodigo,
    loginComCodigo,
    loginComTotp,
    listarTasks,
    listarDispositivos,
    buscarPerfil,
  };
}

export type ClienteBambu = ReturnType<typeof criarClienteBambu>;
