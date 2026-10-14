import { describe, expect, it, vi } from "vitest";
import { criarClienteMakerWorld, ErroMakerWorld } from "./makerworld";

function resposta(status: number, corpo: string) {
  return new Response(corpo, { status });
}

describe("criarClienteMakerWorld", () => {
  it("busca só nas licenças que permitem venda e devolve os hits", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(resposta(200, JSON.stringify({ total: 1, hits: [{ id: 1, title: "x", slug: "x" }] })));
    const cliente = criarClienteMakerWorld({ fetchImpl, intervaloMs: 0 });

    const hits = await cliente.buscarModelos("porta caneta");

    expect(hits).toEqual([{ id: 1, title: "x", slug: "x" }]);
    const url = new URL(fetchImpl.mock.calls[0][0] as string);
    expect(url.origin + url.pathname).toBe("https://api.bambulab.com/v1/search-service/select/design2");
    expect(url.searchParams.get("keyword")).toBe("porta caneta");
    expect(url.searchParams.get("licenses")).toBe("CC0,BY,BY-SA");
  });

  it("preserva o status real quando o MakerWorld falha", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(resposta(429, "too many requests"));
    const cliente = criarClienteMakerWorld({ fetchImpl, intervaloMs: 0 });

    const erro = await cliente.buscarDesign(5).catch((e) => e);

    expect(erro).toBeInstanceOf(ErroMakerWorld);
    expect(erro.status).toBe(429);
    expect(erro.message).toContain("HTTP 429");
  });

  it("trata 200 com HTML (bloqueio) como falha", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(resposta(200, "<!DOCTYPE html><title>Just a moment...</title>"));
    const erro = await criarClienteMakerWorld({ fetchImpl, intervaloMs: 0 }).buscarModelos("x").catch((e) => e);
    expect(erro).toBeInstanceOf(ErroMakerWorld);
    expect(erro.status).toBe(429);
  });

  it("falha de rede vira 503", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("ECONNRESET"));
    const erro = await criarClienteMakerWorld({ fetchImpl, intervaloMs: 0 }).buscarModelos("x").catch((e) => e);
    expect(erro.status).toBe(503);
  });
});

describe("proteção contra bloqueio", () => {
  it("desafio do Cloudflare vira erro de bloqueio com o status real", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(resposta(403, "<html><title>Just a moment...</title></html>"));
    const erro = await criarClienteMakerWorld({ fetchImpl, intervaloMs: 0 }).buscarModelos("x").catch((e) => e);
    expect(erro.status).toBe(403);
    expect(erro.message).toContain("bloqueou");
  });

  it("faz uma chamada por vez, mesmo disparadas juntas", async () => {
    let emAndamento = 0;
    let maximo = 0;
    const fetchImpl = vi.fn(async () => {
      emAndamento++;
      maximo = Math.max(maximo, emAndamento);
      await new Promise((r) => setTimeout(r, 5));
      emAndamento--;
      return resposta(200, JSON.stringify({ hits: [] }));
    });
    const cliente = criarClienteMakerWorld({ fetchImpl, intervaloMs: 0 });

    await Promise.all([cliente.buscarModelos("a"), cliente.buscarModelos("b"), cliente.buscarModelos("c")]);

    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(maximo).toBe(1);
  });
});

describe("relevanciaDoHit", () => {
  it("lê a nota do começo de ext.rk", async () => {
    const { relevanciaDoHit } = await import("./makerworld");
    expect(relevanciaDoHit({ id: 1, title: "", slug: "", ext: JSON.stringify({ rk: "100.2|0|0" }) })).toBe(100.2);
    expect(relevanciaDoHit({ id: 1, title: "", slug: "", ext: JSON.stringify({ rk: "10.15|0|0" }) })).toBe(10.15);
  });

  it("null quando ext falta ou não tem rk", async () => {
    const { relevanciaDoHit } = await import("./makerworld");
    expect(relevanciaDoHit({ id: 1, title: "", slug: "" })).toBeNull();
    expect(relevanciaDoHit({ id: 1, title: "", slug: "", ext: "{}" })).toBeNull();
    expect(relevanciaDoHit({ id: 1, title: "", slug: "", ext: "não é json" })).toBeNull();
  });
});
