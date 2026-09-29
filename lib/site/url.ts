/** Domínio público de produção — VERCEL_URL não serve: aponta para o deploy (protegido por login). */
const SITE_URL_PADRAO = "https://www.voxelasduo.com.br";

/** URL base pública do site, sem barra final (ex: "https://www.voxelasduo.com.br"). */
export function urlBaseSite(): string {
  return (process.env.SITE_URL || SITE_URL_PADRAO).replace(/\/+$/, "");
}

/** Mantém URLs absolutas (`http(s)://`) e prefixa a base do site em caminhos relativos. */
export function urlAbsoluta(caminhoOuUrl: string, base: string = urlBaseSite()): string {
  if (/^https?:\/\//i.test(caminhoOuUrl)) return caminhoOuUrl;
  const caminho = caminhoOuUrl.startsWith("/") ? caminhoOuUrl : `/${caminhoOuUrl}`;
  return `${base.replace(/\/+$/, "")}${caminho}`;
}
