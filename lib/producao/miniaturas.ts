import { enviarMiniaturaProducao } from "@/lib/storage/blob";

/** Limite por miniatura: as capas de placa da origem têm poucas centenas de KB. */
const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024;
const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"];

/**
 * Copia a miniatura da placa para o nosso storage.
 *
 * Existe porque a URL devolvida pela origem é assinada e expira: depois de
 * algumas horas ela responde "não autorizado" e a imagem some da tela.
 * Como é a miniatura que permite reconhecer a peça quando o título vem do
 * perfil de fatiamento ("0.2mm layer, 2 walls..."), ela é dado de trabalho,
 * não enfeite.
 *
 * Devolve `undefined` em qualquer falha: perder a miniatura não pode
 * interromper a importação nem esconder as impressões.
 */
export async function copiarMiniatura(
  coverUrl: string,
  taskId: string,
  buscar: typeof fetch = fetch
): Promise<string | undefined> {
  try {
    const resposta = await buscar(coverUrl);
    if (!resposta.ok) {
      // A URL assinada da origem vale ~30 min: depois disso é 403 e a cópia
      // nunca mais acontece. Aparece no log para não virar sumiço silencioso.
      console.error(`[producao] miniatura ${taskId}: origem respondeu ${resposta.status}`);
      return undefined;
    }

    const tipo = (resposta.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!TIPOS_ACEITOS.includes(tipo)) return undefined;

    const dados = await resposta.arrayBuffer();
    if (dados.byteLength === 0 || dados.byteLength > TAMANHO_MAXIMO_BYTES) return undefined;

    const extensao = tipo === "image/jpeg" ? "jpg" : tipo.split("/")[1];
    const arquivo = new File([dados], `${taskId}.${extensao}`, { type: tipo });

    return await enviarMiniaturaProducao(arquivo, `${taskId}.${extensao}`);
  } catch (erro) {
    // CDN fora do ar, URL já expirada, storage sem token — segue sem foto, mas
    // o motivo vai para o log: sem isso, "some a miniatura" não tem diagnóstico.
    console.error(`[producao] miniatura ${taskId} não copiada:`, erro);
    return undefined;
  }
}
