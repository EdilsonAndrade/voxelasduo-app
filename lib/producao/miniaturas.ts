import { enviarMiniaturaProducao } from "@/lib/storage/blob";

/** Limite por miniatura: as capas de placa da origem têm poucas centenas de KB. */
const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024;
const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"];

/**
 * Tipo real do que foi baixado.
 *
 * O `content-type` é só a primeira pista: o S3 que serve as capas da origem
 * entrega arquivos como `binary/octet-stream`, e confiar só no cabeçalho fazia
 * a cópia desistir em silêncio de uma imagem perfeitamente válida. Os bytes
 * iniciais decidem quando o cabeçalho não ajuda.
 */
function tipoDaImagem(contentType: string, bytes: Uint8Array): string | undefined {
  if (TIPOS_ACEITOS.includes(contentType)) return contentType;

  const ehPng =
    bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (ehPng) return "image/png";

  const ehJpeg = bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (ehJpeg) return "image/jpeg";

  const ehWebp =
    bytes.length > 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (ehWebp) return "image/webp";

  return undefined;
}

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

    const cabecalho = (resposta.headers.get("content-type") ?? "").split(";")[0].trim();

    const dados = await resposta.arrayBuffer();
    if (dados.byteLength === 0 || dados.byteLength > TAMANHO_MAXIMO_BYTES) {
      console.error(`[producao] miniatura ${taskId}: tamanho fora do aceito (${dados.byteLength} bytes)`);
      return undefined;
    }

    const tipo = tipoDaImagem(cabecalho, new Uint8Array(dados));
    if (!tipo) {
      console.error(`[producao] miniatura ${taskId}: resposta não é imagem (content-type "${cabecalho}")`);
      return undefined;
    }

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
