import { describe, expect, it } from "vitest";
import { linkValido, validarSecaoHome, type DadosSecaoHome } from "./validation";

const IMAGEM = "https://blob.vercel-storage.com/banners/a.webp";

describe("linkValido", () => {
  it.each(["/produtos", "/produtos/chaveiros", "https://instagram.com/voxelasduo"])(
    "aceita %s",
    (link) => expect(linkValido(link)).toBe(true)
  );

  it.each(["javascript:alert(1)", "http://site.com", "//evil.com", "produtos", "https://"])(
    "rejeita %s",
    (link) => expect(linkValido(link)).toBe(false)
  );
});

describe("validarSecaoHome", () => {
  it("rejeita tipo desconhecido", () => {
    const r = validarSecaoHome({ tipo: "popup" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erros.tipo).toBeDefined();
  });

  it("normaliza um banner válido com padrões de alinhamento e sem campos vazios", () => {
    const r = validarSecaoHome({
      tipo: "bannerHero",
      imagemDesktop: IMAGEM,
      titulo: "  Peças que marcam presença  ",
      subtitulo: "",
      botao: { texto: "Compre agora", link: "/produtos" },
    });
    expect(r).toEqual({
      ok: true,
      dados: {
        tipo: "bannerHero",
        ativa: false,
        titulo: "Peças que marcam presença",
        imagemDesktop: IMAGEM,
        botao: { texto: "Compre agora", link: "/produtos" },
        alinhamentoHorizontal: "esquerda",
        alinhamentoVertical: "base",
      },
    });
  });

  it("exige imagem desktop no banner", () => {
    const r = validarSecaoHome({ tipo: "bannerIntermediario", ativa: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erros.imagemDesktop).toBeDefined();
  });

  it("rejeita botão incompleto e link perigoso", () => {
    const incompleto = validarSecaoHome({ tipo: "bannerHero", imagemDesktop: IMAGEM, botao: { texto: "Ver" } });
    const perigoso = validarSecaoHome({
      tipo: "bannerHero",
      imagemDesktop: IMAGEM,
      botao: { texto: "Ver", link: "javascript:alert(1)" },
    });
    expect(incompleto.ok || perigoso.ok).toBe(false);
    if (!incompleto.ok) expect(incompleto.erros.botao).toMatch(/texto e o link/);
    if (!perigoso.ok) expect(perigoso.erros.botao).toMatch(/começar com/);
  });

  it("limita o tamanho do título", () => {
    const r = validarSecaoHome({ tipo: "textoDestaque", titulo: "x".repeat(81) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erros.titulo).toBeDefined();
  });

  it("carrossel exige título e limite entre 4 e 24, com padrão 12", () => {
    expect(validarSecaoHome({ tipo: "carrossel" }).ok).toBe(false);
    const foraDaFaixa = validarSecaoHome({ tipo: "carrossel", titulo: "Favoritos", limite: 30 });
    expect(foraDaFaixa.ok).toBe(false);
    const padrao = validarSecaoHome({ tipo: "carrossel", titulo: "Favoritos" });
    expect(padrao.ok && padrao.dados.limite).toBe(12);
  });

  it("na edição mescla sobre os dados atuais e não deixa trocar o tipo", () => {
    const atual: DadosSecaoHome = {
      tipo: "bannerHero",
      ativa: false,
      imagemDesktop: IMAGEM,
      alinhamentoHorizontal: "centro",
      alinhamentoVertical: "meio",
    };
    const r = validarSecaoHome({ ativa: true, tipo: "carrossel" }, atual);
    expect(r.ok && r.dados).toMatchObject({ tipo: "bannerHero", ativa: true, alinhamentoHorizontal: "centro" });
  });

  it("na edição, ativar banner cuja imagem foi removida falha", () => {
    const atual: DadosSecaoHome = { tipo: "bannerHero", ativa: false, imagemDesktop: IMAGEM };
    const r = validarSecaoHome({ ativa: true, imagemDesktop: "" }, atual);
    expect(r.ok).toBe(false);
  });
});

describe("cores do texto do banner", () => {
  it("salva as cores escolhidas da paleta", () => {
    const r = validarSecaoHome({
      tipo: "bannerIntermediario",
      imagemDesktop: IMAGEM,
      corSubtitulo: "rosa",
      corTitulo: "preto",
      corTexto: "roxo",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.dados).toMatchObject({ corSubtitulo: "rosa", corTitulo: "preto", corTexto: "roxo" });
    }
  });

  it("não grava cor quando nenhuma foi escolhida (usa a padrão)", () => {
    const r = validarSecaoHome({ tipo: "bannerHero", imagemDesktop: IMAGEM, corTitulo: "" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.dados.corTitulo).toBeUndefined();
      expect(r.dados.corSubtitulo).toBeUndefined();
    }
  });

  it("rejeita cor fora da paleta", () => {
    const r = validarSecaoHome({ tipo: "bannerHero", imagemDesktop: IMAGEM, corTitulo: "#00ff00" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erros.corTitulo).toBeDefined();
  });

  it("ignora cores em seções que não são banner", () => {
    const r = validarSecaoHome({ tipo: "textoDestaque", titulo: "Olá", corTitulo: "preto" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.dados.corTitulo).toBeUndefined();
  });
});
