import { afterEach, describe, expect, it, vi } from "vitest";
import { urlAbsoluta, urlBaseSite } from "./url";

describe("urlBaseSite", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("usa o domínio público de produção quando SITE_URL não está definido", () => {
    vi.stubEnv("SITE_URL", "");
    expect(urlBaseSite()).toBe("https://www.voxelasduo.com.br");
  });

  it("usa SITE_URL sem a barra final", () => {
    vi.stubEnv("SITE_URL", "https://exemplo.com.br/");
    expect(urlBaseSite()).toBe("https://exemplo.com.br");
  });
});

describe("urlAbsoluta", () => {
  it("mantém URLs já absolutas", () => {
    expect(urlAbsoluta("https://blob.vercel-storage.com/a.jpg", "https://site.com")).toBe(
      "https://blob.vercel-storage.com/a.jpg"
    );
  });

  it("prefixa a base em caminhos relativos, com ou sem barra inicial", () => {
    expect(urlAbsoluta("/images/a.jpg", "https://site.com/")).toBe("https://site.com/images/a.jpg");
    expect(urlAbsoluta("images/a.jpg", "https://site.com")).toBe("https://site.com/images/a.jpg");
  });
});
