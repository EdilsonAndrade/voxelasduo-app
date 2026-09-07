const COR_ROXO = "#7B5CF6";
const COR_CREME = "#FFF6ED";
const COR_SURFACE = "#FFFFFF";
const COR_BORDA = "#F0E4D3";
const COR_TEXTO = "#111111";
const COR_TEXTO_MUTED = "#6B6558";

const FONTE_DISPLAY =
  "'Baloo 2', 'Segoe UI', Helvetica, Arial, sans-serif";
const FONTE_CORPO =
  "'Nunito', 'Segoe UI', Helvetica, Arial, sans-serif";

function urlAbsolutaDaLogo(): string | undefined {
  const base = process.env.SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  if (!base) return undefined;
  return `${base.replace(/\/$/, "")}/images/logo.png`;
}

/**
 * Layout HTML compartilhado por todos os e-mails transacionais do site
 * (Tarefa 12/EDI-87) — cabeçalho com a logo da Voxelas Duo, faixa na cor de
 * destaque da marca e rodapé padrão. Tabelas + estilos inline (em vez de
 * flexbox/grid ou um único bloco `<style>`) para renderizar de forma
 * consistente em Outlook desktop, Gmail e Apple Mail (research.md #5).
 */
export function renderEmailLayout(input: { titulo: string; corpoHtml: string }): string {
  const logoUrl = urlAbsolutaDaLogo();
  const ano = new Date().getFullYear();

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="Voxelas Duo" width="140" style="display:block;margin:0 auto;height:auto;max-width:140px;border:0;">`
    : `<span style="font-family:${FONTE_DISPLAY};font-size:22px;font-weight:800;color:${COR_TEXTO};">Voxelas Duo</span>`;

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${input.titulo}</title>
  </head>
  <body style="margin:0;padding:0;background-color:${COR_CREME};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COR_CREME};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:${COR_SURFACE};border:1px solid ${COR_BORDA};border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background-color:${COR_ROXO};height:6px;line-height:6px;font-size:0;">&nbsp;</td>
            </tr>
            <tr>
              <td align="center" style="padding:28px 32px 16px;">
                ${logoHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 32px;font-family:${FONTE_CORPO};color:${COR_TEXTO};">
                <h1 style="margin:0 0 16px;font-family:${FONTE_DISPLAY};font-size:22px;font-weight:800;color:${COR_TEXTO};">${input.titulo}</h1>
                <div style="font-size:15px;line-height:1.6;color:${COR_TEXTO};">
                  ${input.corpoHtml}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;border-top:1px solid ${COR_BORDA};font-family:${FONTE_CORPO};font-size:12px;line-height:1.5;color:${COR_TEXTO_MUTED};">
                Este é um e-mail automático — não responda.<br />
                &copy; ${ano} Voxelas Duo
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
