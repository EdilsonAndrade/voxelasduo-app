import type { AnuncioPago } from "@/lib/models/produto";

/** ROAS acima disso é quase certamente erro de digitação (anúncio < 1% da venda). */
export const ROAS_MAXIMO = 100;
/** ROAS sugerido ao ligar o anúncio pela primeira vez — o mesmo da calculadora. */
export const ROAS_PADRAO = 8;

export function roasValido(roas: unknown): roas is number {
  return typeof roas === "number" && Number.isFinite(roas) && roas > 0 && roas <= ROAS_MAXIMO;
}

/** % do preço que vai para o anúncio: `100 ÷ ROAS` quando ligado e válido; senão 0. */
export function percentualDoAnuncio(anuncio?: AnuncioPago | null): number {
  if (!anuncio?.ativo || !roasValido(anuncio.roasMeta)) return 0;
  return 100 / anuncio.roasMeta;
}

/** Valida o `anuncio` vindo do payload — `null` = válido; texto = mensagem do 400. */
export function validarAnuncioPago(valor: unknown): string | null {
  if (typeof valor !== "object" || valor === null || Array.isArray(valor)) {
    return "Anúncio pago: formato inválido.";
  }
  const { ativo, roasMeta } = valor as Record<string, unknown>;
  if (typeof ativo !== "boolean") return "Anúncio pago: informe se está ligado ou desligado.";
  if (!roasValido(roasMeta)) return `Anúncio pago: ROAS meta inválido (maior que 0 e até ${ROAS_MAXIMO}).`;
  return null;
}
