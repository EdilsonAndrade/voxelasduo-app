import { beforeEach, describe, expect, it, vi } from "vitest";

const repo = vi.hoisted(() => ({
  salvarPedidoEvento: vi.fn(),
  listarPedidosEvento: vi.fn(),
  serializarPedidoEvento: vi.fn((p: unknown) => p),
}));

const auth = vi.hoisted(() => vi.fn());

vi.mock("@/lib/eventos/repository", () => repo);
vi.mock("@/lib/auth/config", () => ({ auth }));

const colecao = await import("./route");
const item = await import("./[id]/route");

const ID = "0b8f3c2a-1d4e-4f6a-8b9c-0d1e2f3a4b5c";
const FOTO = "https://abc.public.blob.vercel-storage.com/eventos/x.jpg";

const corpoValido = {
  evento: "Feira de Sábado",
  cliente: { nome: "Ana", telefone: "(19) 98342-3586" },
  itens: [{ id: "3f2b8c1e-6a4d-4e2f-9b7a-1c2d3e4f5a6b", descricao: "", quantidade: 1, fotos: [FOTO] }],
  valorCentavos: null,
  observacao: "",
  status: "anotado",
  criadoEm: "2026-10-04T14:00:00.000Z",
};

function put(corpo: unknown, id = ID) {
  return item.PUT(new Request("http://localhost", { method: "PUT", body: JSON.stringify(corpo) }), {
    params: Promise.resolve({ id }),
  });
}

describe("PUT /api/admin/evento/pedidos/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue({ user: { id: "u1", name: "Malu", papel: "equipe" } });
  });

  it("201 quando cria, com o autor da sessão e telefone só com dígitos", async () => {
    repo.salvarPedidoEvento.mockResolvedValue({ pedido: { _id: ID }, criado: true });
    const resposta = await put(corpoValido);
    expect(resposta.status).toBe(201);
    const [id, dados, autor] = repo.salvarPedidoEvento.mock.calls[0];
    expect(id).toBe(ID);
    expect(dados.cliente.telefone).toBe("19983423586");
    expect(autor).toEqual({ id: "u1", nome: "Malu" });
  });

  it("200 quando o mesmo id é reenviado", async () => {
    repo.salvarPedidoEvento.mockResolvedValue({ pedido: { _id: ID }, criado: false });
    expect((await put(corpoValido)).status).toBe(200);
  });

  it("401 sem sessão", async () => {
    auth.mockResolvedValue(null);
    expect((await put(corpoValido)).status).toBe(401);
  });

  it("400 com id que não é UUID", async () => {
    expect((await put(corpoValido, "123")).status).toBe(400);
  });

  it("400 com erros de campo", async () => {
    const resposta = await put({ ...corpoValido, cliente: { nome: "", telefone: "" } });
    expect(resposta.status).toBe(400);
    const json = await resposta.json();
    expect(json.erros["cliente.nome"]).toBeDefined();
    expect(repo.salvarPedidoEvento).not.toHaveBeenCalled();
  });

  it("400 com foto fora do Blob da loja", async () => {
    const resposta = await put({ ...corpoValido, itens: [{ ...corpoValido.itens[0], fotos: ["https://evil.com/x.jpg"] }] });
    expect(resposta.status).toBe(400);
  });
});

describe("GET /api/admin/evento/pedidos", () => {
  it("repassa busca e evento", async () => {
    repo.listarPedidosEvento.mockResolvedValue([]);
    const resposta = await colecao.GET(new Request("http://localhost/api/admin/evento/pedidos?busca=ana&evento=abc"));
    expect(resposta.status).toBe(200);
    expect(repo.listarPedidosEvento).toHaveBeenCalledWith({ busca: "ana", eventoId: "abc" });
  });
});
