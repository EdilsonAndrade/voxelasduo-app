import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Cliente } from "@/lib/models/cliente";
import type { Pedido } from "@/lib/models/pedido";

const { find, sort, toArray, colecaoPedidos } = vi.hoisted(() => {
  const toArray = vi.fn();
  const sort = vi.fn(() => ({ toArray }));
  const find = vi.fn((_filtro: unknown) => ({ sort }));
  return { find, sort, toArray, colecaoPedidos: vi.fn().mockResolvedValue({ find }) };
});

vi.mock("@/lib/pedidos/repository", () => ({ colecaoPedidos }));

const { buscarPedidosDoCliente, pedidoPertenceAoCliente, derivarHistoricoEnderecos } = await import(
  "./pedidosAssociados"
);

const clienteBase: Cliente = {
  _id: new ObjectId(),
  nome: "Maria",
  email: "maria@exemplo.com",
  emailVerificado: true,
  criadoEm: new Date(),
  atualizadoEm: new Date(),
};

describe("buscarPedidosDoCliente", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    toArray.mockResolvedValue([]);
  });

  it("busca por clienteId OU (sem clienteId + e-mail correspondente, case-insensitive)", async () => {
    await buscarPedidosDoCliente(clienteBase);

    expect(find).toHaveBeenCalledWith({
      $or: [
        { clienteId: clienteBase._id },
        {
          clienteId: { $exists: false },
          "cliente.email": { $regex: "^maria@exemplo\\.com$", $options: "i" },
        },
      ],
    });
    expect(sort).toHaveBeenCalledWith({ criadoEm: -1 });
  });

  it("escapa caracteres especiais de regex no e-mail", async () => {
    await buscarPedidosDoCliente({ ...clienteBase, email: "a.b+c@exemplo.com" });

    const filtro = find.mock.calls[0][0] as {
      $or: [unknown, { "cliente.email": { $regex: string } }];
    };
    expect(filtro.$or[1]["cliente.email"].$regex).toBe("^a\\.b\\+c@exemplo\\.com$");
  });

  it("retorna a lista resolvida pelo cursor", async () => {
    const pedidosFake = [{ _id: new ObjectId() }];
    toArray.mockResolvedValue(pedidosFake);

    const resultado = await buscarPedidosDoCliente(clienteBase);

    expect(resultado).toBe(pedidosFake);
  });
});

describe("pedidoPertenceAoCliente", () => {
  function pedidoBase(overrides: Partial<Pedido> = {}): Pedido {
    return {
      _id: new ObjectId(),
      itens: [],
      cliente: { nome: "Ana", email: "outra@exemplo.com", endereco: {} as Pedido["cliente"]["endereco"] },
      status: "pago",
      canalOrigem: "site",
      valorTotal: 1000,
      pagamento: { tentativas: [] },
      criadoEm: new Date(),
      atualizadoEm: new Date(),
      ...overrides,
    };
  }

  it("pertence quando clienteId bate", () => {
    const pedido = pedidoBase({ clienteId: clienteBase._id });
    expect(pedidoPertenceAoCliente(pedido, clienteBase)).toBe(true);
  });

  it("não pertence quando clienteId é de outro cliente", () => {
    const pedido = pedidoBase({ clienteId: new ObjectId() });
    expect(pedidoPertenceAoCliente(pedido, clienteBase)).toBe(false);
  });

  it("pertence por e-mail quando não há clienteId", () => {
    const pedido = pedidoBase({
      cliente: { nome: "Ana", email: "MARIA@Exemplo.com", endereco: {} as Pedido["cliente"]["endereco"] },
    });
    expect(pedidoPertenceAoCliente(pedido, clienteBase)).toBe(true);
  });

  it("não pertence por e-mail diferente quando não há clienteId", () => {
    const pedido = pedidoBase();
    expect(pedidoPertenceAoCliente(pedido, clienteBase)).toBe(false);
  });
});

describe("derivarHistoricoEnderecos", () => {
  const enderecoA = {
    logradouro: "Rua A",
    numero: "10",
    bairro: "Centro",
    cidade: "São Paulo",
    estado: "SP",
    cep: "01001000",
  };
  const enderecoB = {
    logradouro: "Rua B",
    numero: "20",
    bairro: "Vila",
    cidade: "Campinas",
    estado: "SP",
    cep: "13000000",
  };

  function pedidoComEndereco(endereco: typeof enderecoA): Pedido {
    return {
      _id: new ObjectId(),
      itens: [],
      cliente: { nome: "Ana", email: "ana@exemplo.com", endereco },
      status: "pago",
      canalOrigem: "site",
      valorTotal: 1000,
      pagamento: { tentativas: [] },
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    };
  }

  it("inclui o endereço atual do cadastro e os endereços distintos dos pedidos", () => {
    const cliente = { ...clienteBase, endereco: enderecoA };
    const resultado = derivarHistoricoEnderecos(cliente, [pedidoComEndereco(enderecoB)]);

    expect(resultado).toHaveLength(2);
    expect(resultado).toContainEqual(enderecoA);
    expect(resultado).toContainEqual(enderecoB);
  });

  it("não duplica endereços repetidos (mesmos dados, comparação case-insensitive)", () => {
    const cliente = { ...clienteBase, endereco: enderecoA };
    const enderecoRepetido = { ...enderecoA, cidade: "SÃO PAULO" };
    const resultado = derivarHistoricoEnderecos(cliente, [pedidoComEndereco(enderecoRepetido)]);

    expect(resultado).toHaveLength(1);
  });

  it("funciona sem endereço atual no cadastro", () => {
    const resultado = derivarHistoricoEnderecos(clienteBase, [pedidoComEndereco(enderecoA)]);
    expect(resultado).toEqual([enderecoA]);
  });
});
