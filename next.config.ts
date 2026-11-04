import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Fotos do Vercel Blob passam pelo otimizador (components/ImagemOtimizada.tsx):
    // redimensionadas, em WebP e guardadas na CDN — o Blob deixa de servir cada visita.
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
    formats: ["image/webp"],
    // Poucas larguras = poucas transformações (o plano Hobby tem limite mensal).
    deviceSizes: [640, 1080, 1600],
    imageSizes: [96, 256, 384],
    // O nome no Blob tem UUID e nunca muda de conteúdo: pode ficar 31 dias no cache.
    minimumCacheTTL: 2678400,
  },
};

export default nextConfig;
