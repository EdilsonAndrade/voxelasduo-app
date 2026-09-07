import { afterEach, describe, expect, it } from "vitest";
import { renderEmailLayout } from "./templates";

describe("renderEmailLayout", () => {
  afterEach(() => {
    delete process.env.SITE_URL;
    delete process.env.VERCEL_URL;
  });

  it("inclui a URL da logo quando SITE_URL está definida", () => {
    process.env.SITE_URL = "https://voxelasduo.com";
    const html = renderEmailLayout({ titulo: "Título", corpoHtml: "<p>corpo</p>" });
    expect(html).toContain('src="https://voxelasduo.com/images/logo.png"');
  });

  it("cai para VERCEL_URL quando SITE_URL não está definida", () => {
    process.env.VERCEL_URL = "meu-app.vercel.app";
    const html = renderEmailLayout({ titulo: "Título", corpoHtml: "<p>corpo</p>" });
    expect(html).toContain('src="https://meu-app.vercel.app/images/logo.png"');
  });

  it("omite a tag <img> quando nenhuma variável está definida", () => {
    const html = renderEmailLayout({ titulo: "Título", corpoHtml: "<p>corpo</p>" });
    expect(html).not.toContain("<img");
    expect(html).toContain("Voxelas Duo");
  });

  it("inclui título e corpo informados", () => {
    const html = renderEmailLayout({ titulo: "Pedido confirmado", corpoHtml: "<p>Itens comprados</p>" });
    expect(html).toContain("Pedido confirmado");
    expect(html).toContain("Itens comprados");
  });
});
