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
export async function comprimirFoto(arquivo: Blob): Promise<Blob> {
  const { origem, largura, altura, liberar } = await carregar(arquivo);
  try {
    const escala = Math.min(1, LADO_MAXIMO / Math.max(largura, altura));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(largura * escala);
    canvas.height = Math.round(altura * escala);
    const contexto = canvas.getContext("2d");
    if (!contexto) throw new Error("Não foi possível preparar a foto.");
    contexto.drawImage(origem, 0, 0, canvas.width, canvas.height);

    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Não foi possível preparar a foto."))),
        "image/jpeg",
        QUALIDADE
      )
    );
  } finally {
    liberar();
  }
}
