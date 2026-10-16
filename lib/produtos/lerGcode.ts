import { interpretarCabecalhoGcode, interpretarSliceInfo, type MesaLida } from "./gcode";

/**
 * Leitura do G-code no navegador — o arquivo NUNCA é enviado: só as partes
 * necessárias são lidas com `Blob.slice` (cabeçalho e fim do .gcode; o
 * `slice_info.config` de dentro do .gcode.3mf, descompactado com
 * `DecompressionStream`). Erros saem como `Error` com a mensagem para a tela.
 */

const INICIO_GCODE = 256 * 1024;
const FIM_GCODE = 512 * 1024;
const SLICE_INFO = "Metadata/slice_info.config";

async function textoDe(blob: Blob): Promise<string> {
  return new TextDecoder("utf-8").decode(await blob.arrayBuffer());
}

async function lerGcodeTexto(arquivo: File): Promise<MesaLida[]> {
  const inicio = await textoDe(arquivo.slice(0, INICIO_GCODE));
  const fim = arquivo.size > INICIO_GCODE ? await textoDe(arquivo.slice(Math.max(INICIO_GCODE, arquivo.size - FIM_GCODE))) : "";
  const mesa = interpretarCabecalhoGcode(`${inicio}\n${fim}`);
  return mesa ? [mesa] : [];
}

/** Acha um arquivo dentro do ZIP pelo diretório central (fim do arquivo) e devolve o conteúdo descompactado. */
async function arquivoDoZip(zip: File, nome: string): Promise<string | null> {
  const tamanhoFim = Math.min(zip.size, 65536 + 22);
  const fim = new DataView(await zip.slice(zip.size - tamanhoFim).arrayBuffer());
  let eocd = -1;
  for (let i = fim.byteLength - 22; i >= 0; i--) {
    if (fim.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Arquivo .3mf corrompido ou não é um .3mf.");

  const tamanhoDiretorio = fim.getUint32(eocd + 12, true);
  const inicioDiretorio = fim.getUint32(eocd + 16, true);
  if (inicioDiretorio === 0xffffffff) throw new Error("Formato de compactação não suportado (ZIP64).");

  const diretorio = new DataView(await zip.slice(inicioDiretorio, inicioDiretorio + tamanhoDiretorio).arrayBuffer());
  const decodificador = new TextDecoder();
  let p = 0;
  while (p + 46 <= diretorio.byteLength && diretorio.getUint32(p, true) === 0x02014b50) {
    const metodo = diretorio.getUint16(p + 10, true);
    const tamanhoCompactado = diretorio.getUint32(p + 20, true);
    const tamanhoNome = diretorio.getUint16(p + 28, true);
    const tamanhoExtra = diretorio.getUint16(p + 30, true);
    const tamanhoComentario = diretorio.getUint16(p + 32, true);
    const inicioLocal = diretorio.getUint32(p + 42, true);
    const nomeEntrada = decodificador.decode(new Uint8Array(diretorio.buffer, p + 46, tamanhoNome));

    if (nomeEntrada === nome) {
      const local = new DataView(await zip.slice(inicioLocal, inicioLocal + 30).arrayBuffer());
      const inicioDados = inicioLocal + 30 + local.getUint16(26, true) + local.getUint16(28, true);
      const dados = zip.slice(inicioDados, inicioDados + tamanhoCompactado);
      if (metodo === 0) return textoDe(dados);
      if (metodo !== 8) throw new Error("Formato de compactação não suportado.");
      if (typeof DecompressionStream === "undefined") {
        throw new Error("Este navegador não descompacta .3mf. Use o Chrome/Edge atualizado ou envie o .gcode.");
      }
      return new Response(dados.stream().pipeThrough(new DecompressionStream("deflate-raw"))).text();
    }
    p += 46 + tamanhoNome + tamanhoExtra + tamanhoComentario;
  }
  return null;
}

export async function lerGcode(arquivo: File): Promise<MesaLida[]> {
  const nome = arquivo.name.toLowerCase();
  let mesas: MesaLida[];
  if (nome.endsWith(".3mf")) {
    const xml = await arquivoDoZip(arquivo, SLICE_INFO);
    if (xml === null) {
      throw new Error("Esse .3mf não está fatiado. No Bambu Studio, fatie e use Exportar → arquivo fatiado (.gcode.3mf).");
    }
    mesas = interpretarSliceInfo(xml);
  } else if (nome.endsWith(".gcode")) {
    mesas = await lerGcodeTexto(arquivo);
  } else {
    throw new Error("Envie um arquivo .gcode ou .gcode.3mf.");
  }
  if (mesas.length === 0) throw new Error("Não encontrei tempo e peso nesse arquivo.");
  return mesas;
}
