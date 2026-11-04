/** Lado maior das fotos dos itens depois de comprimidas no aparelho (research.md #6). */
const LADO_MAXIMO = 1600;
const QUALIDADE = 0.8;

async function carregar(arquivo: Blob): Promise<{ origem: CanvasImageSource; largura: number; altura: number; liberar: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
      return { origem: bitmap, largura: bitmap.width, altura: bitmap.height, liberar: () => bitmap.close() };
    } catch {
      // Alguns navegadores antigos não decodificam HEIC/opções — cai para <img>.
    }
  }

  const url = URL.createObjectURL(arquivo);
  const imagem = new Image();
  await new Promise<void>((resolve, reject) => {
    imagem.onload = () => resolve();
    imagem.onerror = () => reject(new Error("Não foi possível abrir essa foto. Tente tirar de novo."));
    imagem.src = url;
  });
  return { origem: imagem, largura: imagem.naturalWidth, altura: imagem.naturalHeight, liberar: () => URL.revokeObjectURL(url) };
}

/**
 * Reduz a foto da câmera (vários MB) para JPEG de até 1600px antes de guardar
 * na fila: cabe no aparelho e sobe rápido mesmo com internet fraca.
 */
export async function comprimirFoto(arquivo: Blob, ladoMaximo = LADO_MAXIMO, qualidade = QUALIDADE): Promise<Blob> {
  const { origem, largura, altura, liberar } = await carregar(arquivo);
  try {
    const escala = Math.min(1, ladoMaximo / Math.max(largura, altura));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(largura * escala);
    canvas.height = Math.round(altura * escala);
    const contexto = canvas.getContext("2d");
    if (!contexto) throw new Error("Não foi possível preparar a foto.");
    // PNG com fundo transparente vira JPEG com fundo branco (e não preto).
    contexto.fillStyle = "#ffffff";
    contexto.fillRect(0, 0, canvas.width, canvas.height);
    contexto.drawImage(origem, 0, 0, canvas.width, canvas.height);

    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Não foi possível preparar a foto."))),
        "image/jpeg",
        qualidade
      )
    );
  } finally {
    liberar();
  }
}

/** Fotos de produto até este tamanho sobem como estão. */
const TAMANHO_SEM_COMPRESSAO = 400 * 1024;

/**
 * Foto de produto antes do envio: lado maior de até 1600px em JPEG 85% (o
 * Mercado Livre pede no mínimo 500px e recomenda 1200px). Arquivo pequeno ou
 * que não fica menor sobe como está; se o navegador não conseguir abrir, também.
 */
export async function comprimirFotoProduto(arquivo: File): Promise<File> {
  if (arquivo.size <= TAMANHO_SEM_COMPRESSAO) return arquivo;
  try {
    const blob = await comprimirFoto(arquivo, 1600, 0.85);
    if (blob.size >= arquivo.size) return arquivo;
    const nome = arquivo.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], nome, { type: "image/jpeg" });
  } catch {
    return arquivo;
  }
}
