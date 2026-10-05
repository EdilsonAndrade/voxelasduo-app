import { beforeEach, describe, expect, it, vi } from "vitest";

const { enviarMiniaturaProducao } = vi.hoisted(() => ({
  enviarMiniaturaProducao: vi.fn(),
}));

vi.mock("@/lib/storage/blob", () => ({ enviarMiniaturaProducao }));

const { copiarMiniatura } = await import("./miniaturas");

function imagem(tipo = "image/png", bytes = 1024): Response {
  return new Response(new Uint8Array(bytes), {
    status: 200,
    headers: { "content-type": tipo },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  enviarMiniaturaProducao.mockResolvedValue("https://blob.local/producao/123.png");
});

describe("copiarMiniatura", () => {
  it("copia a imagem para o nosso storage e devolve a URL que não expira", async () => {
    const buscar = vi.fn().mockResolvedValue(imagem());

    const url = await copiarMiniatura("https://cdn.bambu/capa.png", "123", buscar);

    expect(url).toBe("https://blob.local/producao/123.png");
    expect(buscar).toHaveBeenCalledWith("https://cdn.bambu/capa.png");
    const [arquivo, nome] = enviarMiniaturaProducao.mock.calls[0];
    expect(nome).toBe("123.png");
    expect((arquivo as File).type).toBe("image/png");
  });

  it("usa extensão jpg para JPEG", async () => {
    const buscar = vi.fn().mockResolvedValue(imagem("image/jpeg"));

    await copiarMiniatura("https://cdn.bambu/capa.jpg", "77", buscar);

    expect(enviarMiniaturaProducao.mock.calls[0][1]).toBe("77.jpg");
  });

  it("desiste sem erro quando a URL da origem já expirou", async () => {
    const buscar = vi.fn().mockResolvedValue(new Response("denied", { status: 403 }));

    await expect(copiarMiniatura("https://cdn.bambu/capa.png", "123", buscar)).resolves.toBeUndefined();
    expect(enviarMiniaturaProducao).not.toHaveBeenCalled();
  });

  it("desiste quando a resposta não é imagem", async () => {
    const buscar = vi.fn().mockResolvedValue(
      new Response("<html>login</html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      })
    );

    await expect(copiarMiniatura("https://cdn.bambu/capa.png", "1", buscar)).resolves.toBeUndefined();
  });

  it("desiste em arquivo vazio ou grande demais", async () => {
    const vazio = vi.fn().mockResolvedValue(imagem("image/png", 0));
    const enorme = vi.fn().mockResolvedValue(imagem("image/png", 6 * 1024 * 1024));

    await expect(copiarMiniatura("https://cdn/a.png", "1", vazio)).resolves.toBeUndefined();
    await expect(copiarMiniatura("https://cdn/b.png", "2", enorme)).resolves.toBeUndefined();
  });

  it("não propaga falha de rede nem de storage", async () => {
    const quebrado = vi.fn().mockRejectedValue(new Error("ECONNRESET"));
    await expect(copiarMiniatura("https://cdn/a.png", "1", quebrado)).resolves.toBeUndefined();

    enviarMiniaturaProducao.mockRejectedValue(new Error("blob fora do ar"));
    const ok = vi.fn().mockResolvedValue(imagem());
    await expect(copiarMiniatura("https://cdn/a.png", "1", ok)).resolves.toBeUndefined();
  });
});
