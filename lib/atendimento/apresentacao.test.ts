import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import type { Produto } from "@/lib/models/produto";
import type { Pedido } from "@/lib/models/pedido";
import { paraItemMensagem, paraItemPergunta, paraItemReclamacao } from "./apresentacao";

describe("paraItemPergunta", () => {
  it("inclui o nome do produto quando há vínculo com o catálogo", () => {
    const pergunta = {
      _id: new ObjectId(),
      perguntaId: "1",
      itemId: "MLB1",
      texto: "Tem em azul?",
      status: "pendente" as const,
      linkOrigem: "https://produto.mercadolivre.com.br/MLB-1",
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    };
    const produto = { nome: "Vaso" } as Produto;

    const item = paraItemPergunta(pergunta, produto);

    expect(item.referencia).toBe("Vaso");
    expect(item.texto).toBe("Tem em azul?");
    expect(item.linkOrigem).toBe("https://produto.mercadolivre.com.br/MLB-1");
  });

  it("sem produto vinculado, referencia fica undefined", () => {
    const pergunta = {
      _id: new ObjectId(),
      perguntaId: "1",
      itemId: "MLB1",
      texto: "Tem em azul?",
      status: "pendente" as const,
      linkOrigem: "https://produto.mercadolivre.com.br/MLB-1",
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    };

    const item = paraItemPergunta(pergunta, null);

    expect(item.referencia).toBeUndefined();
  });
});

describe("paraItemReclamacao", () => {
  it("inclui o nome do cliente do pedido vinculado", () => {
    const reclamacao = {
      _id: new ObjectId(),
      reclamacaoId: "555",
      motivo: "product_not_as_described",
      status: "aberta" as const,
      linkOrigem: "https://www.mercadolivre.com.br/vendas/999/detalhe",
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    };
    const pedido = { cliente: { nome: "Maria" } } as Pedido;

    const item = paraItemReclamacao(reclamacao, pedido);

    expect(item.referencia).toBe("Pedido de Maria");
    expect(item.texto).toBe("product_not_as_described");
  });
});

describe("paraItemMensagem", () => {
  it("monta o item sem pedido vinculado", () => {
    const mensagem = {
      _id: new ObjectId(),
      mensagemId: "msg-1",
      texto: "Chegou quando?",
      status: "pendente" as const,
      linkOrigem: "https://www.mercadolivre.com.br/vendas/999/detalhe",
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    };

    const item = paraItemMensagem(mensagem, null);

    expect(item.referencia).toBeUndefined();
    expect(item.texto).toBe("Chegou quando?");
  });
});
