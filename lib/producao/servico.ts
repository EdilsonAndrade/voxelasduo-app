import { criarClienteBambu, ErroBambu } from "./bambu/cliente";
import { buscarCredencialBambu, estadoDaConexao } from "./credencial";
import { importarHistorico, type ResultadoImportacao } from "./importacao";
import { copiarMiniatura } from "./miniaturas";
import {
  contarSemMiniaturaPropria,
  definirMiniaturaPropria,
  finalizarImportacao,
  iniciarImportacao,
  inserirImpressoesNovas,
  listarImpressoes,
  listarSemMiniaturaPropria,
  taskIdsExistentes,
} from "./repository";
import type { OrigemImportacao } from "@/lib/models/producao";

/**
 * Teto de páginas do modo recuperação. A varredura não para na primeira página
 * conhecida (é justamente nela que estão as impressões a recuperar), então
 * precisa de um limite próprio para o disparo manual não virar uma varredura do
 * histórico inteiro.
 */
export const MAX_PAGINAS_RECUPERACAO = 5;

/** Erro de pré-condição do lado do site (não da origem) — a rota traduz em 409. */
export class ConexaoIndisponivel extends Error {
  constructor(mensagem = "Conexão com a Bambu Lab ausente ou expirada.") {
    super(mensagem);
    this.name = "ConexaoIndisponivel";
  }
}

/**
 * Executa uma importação completa, registrando o resultado para a tela
 * (FR-011). Compartilhada pelo cron e pelo disparo manual do painel, para que
 * só exista um caminho de importação.
 *
 * O erro é gravado no registro **e** repropagado: a rota precisa devolver o
 * status real da origem, e a tela precisa poder mostrar a última falha mesmo
 * depois de a requisição terminar (FR-004).
 */
export async function executarImportacao(
  origem: OrigemImportacao,
  deviceId?: string
): Promise<ResultadoImportacao> {
  const credencial = await buscarCredencialBambu();
  if (!credencial || estadoDaConexao(credencial) !== "ativa") {
    throw new ConexaoIndisponivel();
  }

  const cliente = criarClienteBambu({ accessToken: credencial.accessToken });
  const registroId = await iniciarImportacao(origem);

  // Banco vazio = primeira carga: percorre o histórico inteiro em vez de
  // parar na primeira página conhecida (research.md #2).
  const { total: jaImportadas } = await listarImpressoes({ porPagina: 1 });

  // Modo recuperação: a URL da capa na origem vale 30 minutos, e quem perdeu
  // essa janela só recupera a imagem relendo a task — a gravação atualiza o
  // link com uma assinatura nova. Só no disparo manual: no cron diário isso
  // custaria uma varredura a mais todo dia por uma capa que talvez nem exista
  // mais na origem.
  const recuperandoMiniaturas =
    origem === "manual" && jaImportadas > 0 && (await contarSemMiniaturaPropria()) > 0;

  try {
    const resultado = await importarHistorico({
      listarTasks: cliente.listarTasks,
      taskIdsExistentes,
      inserirImpressoesNovas,
      ativadoEm: credencial.ativadoEm,
      cargaCompleta: jaImportadas === 0 || recuperandoMiniaturas,
      maxPaginas: recuperandoMiniaturas ? MAX_PAGINAS_RECUPERACAO : undefined,
      deviceId,
    });

    const miniaturasCopiadas = await copiarMiniaturasPendentes();
    await finalizarImportacao(registroId, { ...resultado, miniaturasCopiadas });
    return resultado;
  } catch (erro) {
    const mensagem =
      erro instanceof ErroBambu
        ? erro.message
        : erro instanceof Error
          ? erro.message
          : "Falha desconhecida na importação.";
    await finalizarImportacao(registroId, {
      novas: 0,
      ignoradas: 0,
      paginas: 0,
      erro: mensagem,
    });
    throw erro;
  }
}

/**
 * Copia para o nosso storage as miniaturas que ainda vivem só no CDN da
 * origem, cuja URL expira. Roda depois de importar e nunca falha a
 * importação: miniatura é apoio ao reconhecimento da peça, não dado de custo.
 */
async function copiarMiniaturasPendentes(): Promise<number> {
  let copiadas = 0;
  try {
    const pendentes = await listarSemMiniaturaPropria();

    for (const impressao of pendentes) {
      const url = await copiarMiniatura(impressao.coverUrl!, impressao.taskId);
      if (url) {
        await definirMiniaturaPropria(impressao.taskId, url);
        copiadas++;
      }
    }
  } catch (erro) {
    // Storage indisponível não pode derrubar a importação já concluída — mas
    // precisa aparecer no log do servidor.
    console.error("[producao] cópia das miniaturas interrompida:", erro);
  }
  return copiadas;
}

/** Impressoras vinculadas à conta conectada, para o seletor de importação. */
export async function listarImpressorasDaConta() {
  const credencial = await buscarCredencialBambu();
  if (!credencial || estadoDaConexao(credencial) !== "ativa") {
    throw new ConexaoIndisponivel();
  }

  const dispositivos = await criarClienteBambu({
    accessToken: credencial.accessToken,
  }).listarDispositivos();

  return dispositivos.map((dispositivo) => ({
    id: dispositivo.dev_id,
    nome: dispositivo.name ?? dispositivo.dev_id,
    modelo: dispositivo.dev_model_name,
    online: dispositivo.online ?? false,
  }));
}

/** Status HTTP que a rota deve devolver para um erro desta feature. */
export function statusDoErro(erro: unknown): number {
  if (erro instanceof ConexaoIndisponivel) return 409;
  if (erro instanceof ErroBambu) {
    // 401/403 da origem são repassados como tal: o vendedor precisa reconectar.
    return erro.status === 401 || erro.status === 403 ? erro.status : 502;
  }
  return 500;
}

export function mensagemDoErro(erro: unknown): string {
  return erro instanceof Error ? erro.message : "Falha desconhecida.";
}
