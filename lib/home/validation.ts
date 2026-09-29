import {
  ALINHAMENTOS_HORIZONTAIS,
  ALINHAMENTOS_VERTICAIS,
  LIMITES_SECAO_HOME,
  TIPOS_SECAO_HOME,
  type AlinhamentoHorizontal,
  type AlinhamentoVertical,
  type BotaoSecao,
  type TipoSecaoHome,
} from "@/lib/models/secaoHome";

export type ErrosSecaoHome = Partial<
  Record<
    | "tipo"
    | "ativa"
    | "titulo"
    | "subtitulo"
    | "texto"
    | "botao"
    | "imagemDesktop"
    | "imagemMobile"
    | "alinhamentoHorizontal"
    | "alinhamentoVertical"
    | "linkVerTudo"
    | "limite",
    string
  >
>;

/** Campos editáveis de uma seção — `produtoIds`, `ordem` e datas têm rotas/regras próprias. */
export interface DadosSecaoHome {
  tipo: TipoSecaoHome;
  ativa: boolean;
  titulo?: string;
  subtitulo?: string;
  texto?: string;
  botao?: BotaoSecao;
  imagemDesktop?: string;
  imagemMobile?: string;
  alinhamentoHorizontal?: AlinhamentoHorizontal;
  alinhamentoVertical?: AlinhamentoVertical;
  linkVerTudo?: string;
  limite?: number;
}

export type ResultadoValidacaoSecao =
  | { ok: true; dados: DadosSecaoHome }
  | { ok: false; erros: ErrosSecaoHome };

/** Caminho interno (sem `//`, que viraria URL de outro domínio) ou URL https. */
export function linkValido(link: string): boolean {
  return /^\/(?!\/)/.test(link) || /^https:\/\/[^\s/]+/.test(link);
}

/** String aparada; vazia/só espaços/não-string vira `undefined` (campo ausente). */
function textoOpcional(valor: unknown): string | undefined {
  if (typeof valor !== "string") return undefined;
  const aparado = valor.trim();
  return aparado.length > 0 ? aparado : undefined;
}

function urlImagemValida(url: string): boolean {
  return /^https:\/\//.test(url);
}

/**
 * Valida e normaliza o payload de uma seção da home (EDI-114). `atual` são os
 * campos já salvos (edição): o payload é mesclado sobre eles e o resultado é
 * validado por inteiro — assim um PUT só com `{ ativa: true }` ainda exige a
 * imagem do banner. O `tipo` nunca muda depois de criado.
 */
export function validarSecaoHome(
  payload: unknown,
  atual?: DadosSecaoHome
): ResultadoValidacaoSecao {
  const entrada = (typeof payload === "object" && payload !== null ? payload : {}) as Record<
    string,
    unknown
  >;
  const mesclado: Record<string, unknown> = { ...(atual ?? {}), ...entrada };
  const erros: ErrosSecaoHome = {};

  const tipo = atual ? atual.tipo : mesclado.tipo;
  if (!TIPOS_SECAO_HOME.includes(tipo as TipoSecaoHome)) {
    return { ok: false, erros: { tipo: "Escolha o tipo da seção." } };
  }

  if (mesclado.ativa !== undefined && typeof mesclado.ativa !== "boolean") {
    erros.ativa = "Valor inválido para ativa.";
  }

  const dados: DadosSecaoHome = {
    tipo: tipo as TipoSecaoHome,
    ativa: mesclado.ativa === true,
  };

  const titulo = textoOpcional(mesclado.titulo);
  const subtitulo = textoOpcional(mesclado.subtitulo);
  const texto = textoOpcional(mesclado.texto);

  if (titulo && titulo.length > LIMITES_SECAO_HOME.titulo) {
    erros.titulo = `O título deve ter no máximo ${LIMITES_SECAO_HOME.titulo} caracteres.`;
  }
  if (texto && texto.length > LIMITES_SECAO_HOME.texto) {
    erros.texto = `O texto deve ter no máximo ${LIMITES_SECAO_HOME.texto} caracteres.`;
  }

  const ehBanner = dados.tipo === "bannerHero" || dados.tipo === "bannerIntermediario";

  if ((dados.tipo === "textoDestaque" || dados.tipo === "carrossel") && !titulo) {
    erros.titulo = "Informe o título.";
  }

  dados.titulo = titulo;
  if (dados.tipo !== "carrossel") dados.texto = texto;

  // Botão: banners e texto de destaque. Texto e link andam juntos.
  if (ehBanner || dados.tipo === "textoDestaque") {
    const botaoBruto = (
      typeof mesclado.botao === "object" && mesclado.botao !== null ? mesclado.botao : {}
    ) as Record<string, unknown>;
    const textoBotao = textoOpcional(botaoBruto.texto);
    const linkBotao = textoOpcional(botaoBruto.link);

    if (textoBotao || linkBotao) {
      if (!textoBotao || !linkBotao) {
        erros.botao = "Preencha o texto e o link do botão, ou deixe os dois vazios.";
      } else if (!linkValido(linkBotao)) {
        erros.botao = "O link do botão deve começar com / (página do site) ou https://.";
      } else if (textoBotao.length > LIMITES_SECAO_HOME.textoBotao) {
        erros.botao = `O texto do botão deve ter no máximo ${LIMITES_SECAO_HOME.textoBotao} caracteres.`;
      } else {
        dados.botao = { texto: textoBotao, link: linkBotao };
      }
    }
  }

  if (ehBanner) {
    if (subtitulo && subtitulo.length > LIMITES_SECAO_HOME.subtitulo) {
      erros.subtitulo = `O subtítulo deve ter no máximo ${LIMITES_SECAO_HOME.subtitulo} caracteres.`;
    }
    dados.subtitulo = subtitulo;

    const imagemDesktop = textoOpcional(mesclado.imagemDesktop);
    const imagemMobile = textoOpcional(mesclado.imagemMobile);

    if (imagemDesktop && !urlImagemValida(imagemDesktop)) {
      erros.imagemDesktop = "Imagem inválida. Envie o arquivo novamente.";
    }
    if (imagemMobile && !urlImagemValida(imagemMobile)) {
      erros.imagemMobile = "Imagem inválida. Envie o arquivo novamente.";
    }
    if (!imagemDesktop) {
      erros.imagemDesktop = "Envie a imagem do banner (versão para computador).";
    }
    dados.imagemDesktop = imagemDesktop;
    dados.imagemMobile = imagemMobile;

    const horizontal = mesclado.alinhamentoHorizontal ?? "esquerda";
    const vertical = mesclado.alinhamentoVertical ?? "base";
    if (!ALINHAMENTOS_HORIZONTAIS.includes(horizontal as AlinhamentoHorizontal)) {
      erros.alinhamentoHorizontal = "Posição horizontal inválida.";
    }
    if (!ALINHAMENTOS_VERTICAIS.includes(vertical as AlinhamentoVertical)) {
      erros.alinhamentoVertical = "Posição vertical inválida.";
    }
    dados.alinhamentoHorizontal = horizontal as AlinhamentoHorizontal;
    dados.alinhamentoVertical = vertical as AlinhamentoVertical;
  }

  if (dados.tipo === "carrossel") {
    const linkVerTudo = textoOpcional(mesclado.linkVerTudo);
    if (linkVerTudo && !linkValido(linkVerTudo)) {
      erros.linkVerTudo = "O link do \"Ver tudo\" deve começar com / (página do site) ou https://.";
    }
    dados.linkVerTudo = linkVerTudo;

    const limite = mesclado.limite ?? LIMITES_SECAO_HOME.carrosselPadrao;
    if (
      typeof limite !== "number" ||
      !Number.isInteger(limite) ||
      limite < LIMITES_SECAO_HOME.carrosselMin ||
      limite > LIMITES_SECAO_HOME.carrosselMax
    ) {
      erros.limite = `Escolha entre ${LIMITES_SECAO_HOME.carrosselMin} e ${LIMITES_SECAO_HOME.carrosselMax} produtos.`;
    } else {
      dados.limite = limite;
    }
  }

  if (Object.keys(erros).length > 0) return { ok: false, erros };

  // Remove chaves undefined para não gravar campos vazios no documento.
  for (const chave of Object.keys(dados) as (keyof DadosSecaoHome)[]) {
    if (dados[chave] === undefined) delete dados[chave];
  }

  return { ok: true, dados };
}
