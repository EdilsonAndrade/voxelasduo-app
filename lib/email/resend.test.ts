import { ObjectId } from "mongodb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Pedido } from "@/lib/models/pedido";

const { send } = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(function ResendMock() {
    return { emails: { send } };
  }),
}));

const { buscarProdutosPorIds } = vi.hoisted(() => ({ buscarProdutosPorIds: vi.fn() }));
vi.mock("@/lib/pedidos/repository", () => ({ buscarProdutosPorIds }));

const {
  enviarCodigoRecuperacao,
  enviarCodigoVerificacao,
  notificarAdminVendaExterna,
  enviarConfirmacaoPedido,
  notificarAdminNovaEncomenda,
  enviarConfirmacaoEncomenda,
} = await import("./resend");

const pedidoBase: Pedido = {
  _id: new ObjectId(),
  itens: [
    { produtoId: new ObjectId(), quantidade: 2, precoUnitario: 5000 },
    { produtoId: new ObjectId(), quantidade: 1, precoUnitario: 3000 },
  ],
  cliente: {
    nome: "Venda originada em canal externo",
    email: "vendas-externas@voxelasduo.local",
    endereco: { logradouro: "-", numero: "-", bairro: "-", cidade: "-", estado: "-", cep: "-" },
  },
  status: "pago",
  canalOrigem: "mercado_livre",
  valorTotal: 13000,
  pagamento: { tentativas: [] },
  criadoEm: new Date(),
  atualizadoEm: new Date(),
};

describe("enviarCodigoRecuperacao", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "re_teste";
    process.env.EMAIL_FROM = "naoresponda@voxelasduo.com";
  });

  it("envia o código para o e-mail informado", async () => {
    send.mockResolvedValue({ data: { id: "1" }, error: null });

    await enviarCodigoRecuperacao("cliente@exemplo.com", "123456");

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "cliente@exemplo.com",
        subject: expect.stringContaining("senha"),
        text: expect.stringContaining("123456"),
        html: expect.stringContaining("123456"),
      })
    );
  });

  it("não lança quando o envio falha", async () => {
    send.mockRejectedValue(new Error("falha de rede"));
    await expect(enviarCodigoRecuperacao("cliente@exemplo.com", "123456")).resolves.toBeUndefined();
  });
});

describe("enviarCodigoVerificacao", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "re_teste";
    process.env.EMAIL_FROM = "naoresponda@voxelasduo.com";
  });

  it("envia o código de verificação para o e-mail informado", async () => {
    send.mockResolvedValue({ data: { id: "1" }, error: null });

    await enviarCodigoVerificacao("cliente@exemplo.com", "654321");

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "cliente@exemplo.com",
        subject: expect.stringContaining("e-mail"),
        text: expect.stringContaining("654321"),
        html: expect.stringContaining("654321"),
      })
    );
  });

  it("não lança quando o envio falha", async () => {
    send.mockRejectedValue(new Error("falha de rede"));
    await expect(enviarCodigoVerificacao("cliente@exemplo.com", "654321")).resolves.toBeUndefined();
  });
});

describe("notificarAdminVendaExterna", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "re_teste";
    process.env.EMAIL_FROM = "naoresponda@voxelasduo.com";
    process.env.ADMIN_NOTIFICACAO_EMAIL = "admin@voxelasduo.com";
  });

  afterEach(() => {
    delete process.env.ADMIN_NOTIFICACAO_EMAIL;
  });

  it("envia a notificação para o e-mail do admin com canal e valor total", async () => {
    send.mockResolvedValue({ data: { id: "1" }, error: null });

    await notificarAdminVendaExterna(pedidoBase);

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "admin@voxelasduo.com",
        subject: expect.stringContaining("Mercado Livre"),
        text: expect.stringContaining("130,00"),
        html: expect.stringContaining("130,00"),
      })
    );
  });

  it("não envia (nem lança) quando ADMIN_NOTIFICACAO_EMAIL não está configurada", async () => {
    delete process.env.ADMIN_NOTIFICACAO_EMAIL;
    await expect(notificarAdminVendaExterna(pedidoBase)).resolves.toBeUndefined();
    expect(send).not.toHaveBeenCalled();
  });

  it("não lança quando o envio falha", async () => {
    send.mockRejectedValue(new Error("falha de rede"));
    await expect(notificarAdminVendaExterna(pedidoBase)).resolves.toBeUndefined();
  });
});

describe("enviarConfirmacaoPedido", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "re_teste";
    process.env.EMAIL_FROM = "naoresponda@voxelasduo.com";
  });

  it("envia a confirmação para o e-mail do comprador com número do pedido, itens e valor total", async () => {
    send.mockResolvedValue({ data: { id: "1" }, error: null });
    const [produtoId1, produtoId2] = pedidoBase.itens.map((item) => item.produtoId);
    buscarProdutosPorIds.mockResolvedValue(
      new Map([
        [produtoId1.toString(), { _id: produtoId1, nome: "Voxel Rosa P" }],
        [produtoId2.toString(), { _id: produtoId2, nome: "Voxel Azul M" }],
      ])
    );

    await enviarConfirmacaoPedido(pedidoBase);

    expect(buscarProdutosPorIds).toHaveBeenCalledWith(
      expect.arrayContaining([produtoId1.toString(), produtoId2.toString()])
    );
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: pedidoBase.cliente.email,
        subject: expect.stringContaining(pedidoBase._id!.toString()),
        html: expect.stringContaining("Voxel Rosa P"),
        text: expect.stringContaining("Voxel Rosa P"),
      })
    );
    const enviado = send.mock.calls[0][0];
    expect(enviado.text).toContain("Voxel Azul M");
    expect(enviado.text).toContain("130,00");
  });

  it("usa 'Produto' como nome de fallback quando o produto não é encontrado", async () => {
    send.mockResolvedValue({ data: { id: "1" }, error: null });
    buscarProdutosPorIds.mockResolvedValue(new Map());

    await enviarConfirmacaoPedido(pedidoBase);

    expect(send).toHaveBeenCalledWith(expect.objectContaining({ text: expect.stringContaining("Produto") }));
  });

  it("não lança quando o envio falha", async () => {
    buscarProdutosPorIds.mockResolvedValue(new Map());
    send.mockRejectedValue(new Error("falha de rede"));
    await expect(enviarConfirmacaoPedido(pedidoBase)).resolves.toBeUndefined();
  });
});

const encomendaBase = {
  _id: new ObjectId(),
  nome: "Maria <b>Silva</b>",
  email: "maria@exemplo.com",
  telefone: "19981575723",
  descricao: "Um chaveiro <script>alert(1)</script> do meu gato",
  criadoEm: new Date("2026-09-20T12:00:00.000Z"),
};

describe("notificarAdminNovaEncomenda", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "re_teste";
    process.env.EMAIL_FROM = "naoresponda@voxelasduo.com.br";
    process.env.ADMIN_NOTIFICACAO_EMAIL = "admin@voxelasduo.com";
  });

  afterEach(() => {
    delete process.env.ADMIN_NOTIFICACAO_EMAIL;
  });

  it("envia para o admin e para o e-mail da loja, com replyTo no cliente e remetente com nome", async () => {
    send.mockResolvedValue({ data: { id: "1" }, error: null });

    await notificarAdminNovaEncomenda(encomendaBase);

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Voxelas Duo <naoresponda@voxelasduo.com.br>",
        to: ["admin@voxelasduo.com", "voxelasduo@gmail.com"],
        replyTo: "maria@exemplo.com",
        text: expect.stringContaining("(19) 98157-5723"),
      })
    );
  });

  it("envia para o e-mail da loja mesmo sem ADMIN_NOTIFICACAO_EMAIL", async () => {
    delete process.env.ADMIN_NOTIFICACAO_EMAIL;
    send.mockResolvedValue({ data: { id: "1" }, error: null });

    await notificarAdminNovaEncomenda(encomendaBase);

    expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: ["voxelasduo@gmail.com"] }));
  });

  it("não duplica o destinatário quando o admin já é o e-mail da loja", async () => {
    process.env.ADMIN_NOTIFICACAO_EMAIL = "voxelasduo@gmail.com";
    send.mockResolvedValue({ data: { id: "1" }, error: null });

    await notificarAdminNovaEncomenda(encomendaBase);

    expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: ["voxelasduo@gmail.com"] }));
  });

  it("escapa HTML digitado pelo cliente", async () => {
    send.mockResolvedValue({ data: { id: "1" }, error: null });

    await notificarAdminNovaEncomenda(encomendaBase);

    const { html } = send.mock.calls[0][0] as { html: string };
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("não lança quando o envio falha", async () => {
    send.mockRejectedValue(new Error("falha de rede"));
    await expect(notificarAdminNovaEncomenda(encomendaBase)).resolves.toBeUndefined();
  });
});

describe("enviarConfirmacaoEncomenda", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "re_teste";
    process.env.EMAIL_FROM = "naoresponda@voxelasduo.com.br";
  });

  it("confirma ao cliente, com replyTo na loja e aviso de spam", async () => {
    send.mockResolvedValue({ data: { id: "1" }, error: null });

    await enviarConfirmacaoEncomenda(encomendaBase);

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "maria@exemplo.com",
        replyTo: "voxelasduo@gmail.com",
        html: expect.stringContaining("Spam ou no Lixo eletrônico"),
      })
    );
  });

  it("não lança quando o envio falha", async () => {
    send.mockRejectedValue(new Error("falha de rede"));
    await expect(enviarConfirmacaoEncomenda(encomendaBase)).resolves.toBeUndefined();
  });
});
