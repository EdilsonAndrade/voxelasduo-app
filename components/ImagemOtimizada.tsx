import type { ImgHTMLAttributes } from "react";
import { getImageProps } from "next/image";

/** Fotos guardadas no Vercel Blob — as únicas que passam pelo otimizador (next.config.ts). */
const HOST_BLOB = ".public.blob.vercel-storage.com";

export function otimizavel(src: string | undefined | null): src is string {
  if (!src) return false;
  try {
    return new URL(src).hostname.endsWith(HOST_BLOB);
  } catch {
    return false;
  }
}

/**
 * `src`/`srcSet` otimizados de uma foto do Blob: a Vercel entrega a foto já
 * redimensionada para a tela e em WebP, guardada na CDN — o Blob só é lido
 * na primeira vez. Foto de fora do Blob (data:, blob:, outro site) passa igual.
 */
export function propsImagem(src: string, sizes: string): { src: string; srcSet?: string; sizes?: string } {
  if (!otimizavel(src)) return { src };
  const { props } = getImageProps({ src, alt: "", width: 1600, height: 1600, sizes, quality: 75 });
  return { src: props.src, srcSet: props.srcSet, sizes: props.sizes };
}

/**
 * `<img>` comum (o CSS de cada tela continua valendo) com a foto otimizada.
 * `sizes` diz quanto da tela a foto ocupa — ex.: "(max-width: 600px) 50vw, 300px".
 */
export default function ImagemOtimizada({
  src,
  alt,
  sizes,
  loading = "lazy",
  ...resto
}: Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet" | "sizes"> & { src: string; alt: string; sizes: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...propsImagem(src, sizes)} alt={alt} loading={loading} decoding="async" {...resto} />;
}
