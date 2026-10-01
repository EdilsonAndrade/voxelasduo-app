import { describe, expect, it } from "vitest";
import {
  normalizarNomeEvento,
  normalizarPedidoEvento,
  urlFotoEventoValida,
  uuidValido,
  validarPedidoEvento,
} from "./validacao";
import type { PedidoEventoPayload } from "@/lib/models/pedidoEvento";

const ITEM_ID = "3f2b8c1e-6a4d-4e2f-9b7a-1c2d3e4f5a6b";

const valido: PedidoEventoPayload = {
  evento: "Feira de Sábado",
  cliente: { nome: "Ana", telefone: "(19) 98342-3586" },
  itens: [{ id: ITEM_ID, descricao: "Chaveiro gato", quantidade: 2, fotos: [] }],
  valorCentavos: null,
  observacao: "",
  status: "anotado",
  criadoEm: "2026-10-04T13:20:00.000Z",
};

describe("validarPedidoEvento", () => {
  it("aceita um pedido válido", () => {
    expect(validarPedidoEvento(valido)).toEqual({});
  });

  it("exige evento, nome e WhatsApp", () => {
    const erros = validarPedidoEvento({ ...valido, evento: " ", cliente: { nome: "", telefone: "" } });
    expect(erros.evento).toBeDefined();
    expect(erros["cliente.nome"]).toBe("Escreva o nome do cliente.");
    expect(erros["cliente.telefone"]).toBe("Falta o WhatsApp do cliente.");
  });

  it("recusa WhatsApp incompleto", () => {
    const erros = validarPedidoEvento({ ...valido, cliente: { nome: "Ana", telefone: "98342-3586" } });
    expect(erros["cliente.telefone"]).toMatch(/incompleto/);
  });

  it("exige pelo menos um item", () => {
    expect(validarPedidoEvento({ ...valido, itens: [] }).itens).toBeDefined();
  });

  it("item precisa de foto ou descrição", () => {
    const semNada = validarPedidoEvento({ ...valido, itens: [{ id: ITEM_ID, descricao: "", quantidade: 1, fotos: [] }] });
    expect(semNada["itens.0"]).toBe("Coloque uma foto ou escreva o que é.");

    const soFoto = validarPedidoEvento({
      ...valido,
      itens: [{ id: ITEM_ID, descricao: "", quantidade: 1, fotos: ["local:1"] }],
    });
    expect(soFoto).toEqual({});
  });

  it("limita fotos por item a 3", () => {
    const erros = validarPedidoEvento({
      ...valido,
      itens: [{ id: ITEM_ID, descricao: "x", quantidade: 1, fotos: ["a", "b", "c", "d"] }],
    });
    expect(erros["itens.0"]).toMatch(/3 fotos/);
  });

  it.each([0, -1, 1000, 1.5])("recusa quantidade %s", (quantidade) => {
    const erros = validarPedidoEvento({ ...valido, itens: [{ ...valido.itens[0], quantidade }] });
    expect(erros["itens.0.quantidade"]).toBeDefined();
  });

  it("recusa status e valor inválidos", () => {
    const erros = validarPedidoEvento({ ...valido, status: "pago", valorCentavos: -5 });
    expect(erros.status).toBeDefined();
    expect(erros.valorCentavos).toBeDefined();
  });

  it("recusa id de item que não é UUID", () => {
    expect(validarPedidoEvento({ ...valido, itens: [{ ...valido.itens[0], id: "1" }] })["itens.0"]).toBeDefined();
  });

  it("não quebra com corpo inválido", () => {
    expect(Object.keys(validarPedidoEvento(null)).length).toBeGreaterThan(0);
  });
});

describe("normalização", () => {
  it("normaliza telefone, espaços e padrões", () => {
    const n = normalizarPedidoEvento({ ...valido, cliente: { nome: "  Ana   Maria ", telefone: "(19) 98342-3586" } });
    expect(n.cliente).toEqual({ nome: "Ana Maria", telefone: "19983423586" });
  });

  it("normaliza nome do evento", () => {
    expect(normalizarNomeEvento("  Féira   de SÁBADO ")).toBe("feira de sabado");
  });

  it("valida URL de foto do Blob", () => {
    expect(urlFotoEventoValida("https://abc.public.blob.vercel-storage.com/eventos/x.jpg")).toBe(true);
    expect(urlFotoEventoValida("https://evil.com/x.jpg")).toBe(false);
    expect(urlFotoEventoValida("local:1")).toBe(false);
  });

  it("valida UUID", () => {
    expect(uuidValido(ITEM_ID)).toBe(true);
    expect(uuidValido("abc")).toBe(false);
  });
});
