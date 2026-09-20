import { afterEach, describe, expect, it } from "vitest";
import { renderEmailLayout } from "./templates";

describe("renderEmailLayout", () => {
  afterEach(() => {
    delete process.env.SITE_URL;
    delete process.env.VERCEL_URL;
    delete process.env.EMAIL_FROM;
  });

  it("usa a logo leve no domínio de SITE_URL quando definida", () => {
    process.env.SITE_URL = "https://voxelasduo.com";
    const html = renderEmailLayout({ titulo: "Título", corpoHtml: "<p>corpo</p>" });
    expect(html).toContain('src="https://voxelasduo.com/images/logo-email.png"');
  });

  it("usa o domínio de produção (e ignora VERCEL_URL, protegido por login) quando SITE_URL não está definida", () => {
    process.env.VERCEL_URL = "meu-app.vercel.app";
    const html = renderEmailLayout({ titulo: "Título", corpoHtml: "<p>corpo</p>" });
    expect(html).toContain('src="https://www.voxelasduo.com.br/images/logo-email.png"');
    expect(html).not.toContain("vercel.app");
  });

  it("inclui o aviso de spam/lixo eletrônico com o remetente", () => {
    process.env.EMAIL_FROM = "Voxelas Duo <naoresponda@voxelasduo.com.br>";
    const html = renderEmailLayout({ titulo: "Título", corpoHtml: "<p>corpo</p>" });
    expect(html).toContain("Spam ou no Lixo eletrônico");
    expect(html).toContain("<strong>naoresponda@voxelasduo.com.br</strong>");
  });

  it("troca o rodapé \"não responda\" quando permiteResposta está ativo", () => {
    const padrao = renderEmailLayout({ titulo: "T", corpoHtml: "<p>c</p>" });
    const comResposta = renderEmailLayout({ titulo: "T", corpoHtml: "<p>c</p>", permiteResposta: true });
    expect(padrao).toContain("não responda");
    expect(comResposta).not.toContain("não responda");
    expect(comResposta).toContain("Responda este e-mail");
  });

  it("inclui título e corpo informados", () => {
    const html = renderEmailLayout({ titulo: "Pedido confirmado", corpoHtml: "<p>Itens comprados</p>" });
    expect(html).toContain("Pedido confirmado");
    expect(html).toContain("Itens comprados");
  });
});
