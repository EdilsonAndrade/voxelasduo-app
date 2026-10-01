import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PedidoEventoPayload } from "@/lib/models/pedidoEvento";

const pedidos = vi.hoisted(() => ({
  createIndex: vi.fn().mockResolvedValue("ok"),
  updateOne: vi.fn(),
  findOne: vi.fn(),
  find: vi.fn(),
}));

const eventos = vi.hoisted(() => ({
  createIndex: vi.fn().mockResolvedValue("ok"),
  findOneAndUpdate: vi.fn(),
  find: vi.fn(),
}));

vi.mock("@/lib/db/mongodb", () => ({
  DB_NAME: "teste",
  default: vi.fn().mockResolvedValue({
    db: () => ({ collection: (nome: string) => (nome === "eventos" ? eventos : pedidos) }),
  }),
}));

const { listarPedidosEvento, salvarPedidoEvento, serializarPedidoEvento } = await import("./repository");

const ID = "0b8f3c2a-1d4e-4f6a-8b9c-0d1e2f3a4b5c";
const eventoId = new ObjectId();
const autor = { id: "u1", nome: "Malu" };
const agora = new Date("2026-10-04T15:00:00Z");

const payload: PedidoEventoPayload = {
  evento: "Feira de Sábado",
  cliente: { nome: "Ana", telefone: "19983423586" },
  itens: [{ id: "3f2b8c1e-6a4d-4e2f-9b7a-1c2d3e4f5a6b", descricao: "Chaveiro", quantidade: 2, fotos: [] }],
  valorCentavos: null,
  observacao: "",
  status: "anotado",
  criadoEm: "2026-10-04T14:00:00.000Z",
};

function cursor(resultado: unknown[]) {
  const c = { sort: vi.fn(), limit: vi.fn(), toArray: vi.fn().mockResolvedValue(resultado) };
  c.sort.mockReturnValue(c);
  c.limit.mockReturnValue(c);
  return c;
}

describe("salvarPedidoEvento", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eventos.findOneAndUpdate.mockResolvedValue({ _id: eventoId, nome: "Feira de Sábado" });
    pedidos.findOne.mockResolvedValue({ _id: ID });
  });

  it("faz upsert pelo UUID, com autor e data de criação só na inserção", async () => {
    pedidos.updateOne.mockResolvedValue({ upsertedCount: 1 });

    const { criado } = await salvarPedidoEvento(ID, payload, autor, agora);

    expect(criado).toBe(true);
    const [filtro, atualizacao, opcoes] = pedidos.updateOne.mock.calls[0];
    expect(filtro).toEqual({ _id: ID });
    expect(opcoes).toEqual({ upsert: true });
    expect(atualizacao.$set).toMatchObject({ eventoId, evento: "Feira de Sábado", atualizadoPor: autor });
    expect(atualizacao.$setOnInsert).toEqual({
      criadoPor: autor,
      criadoEm: new Date("2026-10-04T14:00:00.000Z"),
      recebidoEm: agora,
    });
  });

  it("reenvio do mesmo id atualiza (não cria)", async () => {
    pedidos.updateOne.mockResolvedValue({ upsertedCount: 0 });
    const { criado } = await salvarPedidoEvento(ID, payload, autor, agora);
    expect(criado).toBe(false);
  });

  it("não aceita data de criação no futuro", async () => {
    pedidos.updateOne.mockResolvedValue({ upsertedCount: 1 });
    await salvarPedidoEvento(ID, { ...payload, criadoEm: "2030-01-01T00:00:00Z" }, autor, agora);
    expect(pedidos.updateOne.mock.calls[0][1].$setOnInsert.criadoEm).toEqual(agora);
  });

  it("acha o evento pelo nome normalizado", async () => {
    pedidos.updateOne.mockResolvedValue({ upsertedCount: 1 });
    await salvarPedidoEvento(ID, { ...payload, evento: " feira de sabado " }, autor, agora);
    expect(eventos.findOneAndUpdate.mock.calls[0][0]).toEqual({ nomeNormalizado: "feira de sabado" });
  });
});

describe("listarPedidosEvento", () => {
  beforeEach(() => vi.clearAllMocks());

  it("busca por nome e por dígitos do telefone", async () => {
    pedidos.find.mockReturnValue(cursor([]));
    await listarPedidosEvento({ busca: "(19) 98" });
    expect(pedidos.find.mock.calls[0][0]).toEqual({
      $or: [
        { "cliente.nome": { $regex: "\\(19\\) 98", $options: "i" } },
        { "cliente.telefone": { $regex: "1998" } },
      ],
    });
  });

  it("busca só por nome quando não há dígitos", async () => {
    pedidos.find.mockReturnValue(cursor([]));
    await listarPedidosEvento({ busca: "ana" });
    expect(pedidos.find.mock.calls[0][0]).toEqual({ $or: [{ "cliente.nome": { $regex: "ana", $options: "i" } }] });
  });

  it("filtra por evento e ignora id inválido", async () => {
    pedidos.find.mockReturnValue(cursor([]));
    await listarPedidosEvento({ eventoId: eventoId.toString() });
    expect(pedidos.find.mock.calls[0][0]).toEqual({ eventoId });
    expect(await listarPedidosEvento({ eventoId: "x" })).toEqual([]);
  });
});

describe("serializarPedidoEvento", () => {
  it("converte ids e datas", () => {
    const json = serializarPedidoEvento({
      _id: ID,
      eventoId,
      evento: "Feira",
      cliente: { nome: "Ana", telefone: "19983423586" },
      itens: [],
      valorCentavos: null,
      observacao: "",
      status: "anotado",
      criadoPor: autor,
      atualizadoPor: autor,
      criadoEm: agora,
      atualizadoEm: agora,
      recebidoEm: agora,
    });
    expect(json.eventoId).toBe(eventoId.toString());
    expect(json.criadoEm).toBe(agora.toISOString());
    expect("recebidoEm" in json).toBe(false);
  });
});
