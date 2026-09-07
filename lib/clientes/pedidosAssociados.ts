import type { Filter } from "mongodb";
import type { Cliente, EnderecoCliente } from "@/lib/models/cliente";
import type { Pedido } from "@/lib/models/pedido";
import { colecaoPedidos } from "@/lib/pedidos/repository";

function escaparRegex(valor: string): string {
  return valor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Pedidos de um cliente autenticado — associados diretamente (`clienteId`)
 * ou, para pedidos ainda sem dono (convidado no site, ou sincronizados de
 * canal externo), por correspondência de e-mail (data-model.md, research.md
 * #5). A comparação de e-mail é case-insensitive porque `Pedido.cliente.email`
 * não é normalizado no checkout (diferente de `Cliente.email`, que sempre é).
 */
export async function buscarPedidosDoCliente(cliente: Cliente): Promise<Pedido[]> {
  const colecao = await colecaoPedidos();

  const filtro: Filter<Pedido> = {
    $or: [
      { clienteId: cliente._id },
      {
        clienteId: { $exists: false },
        "cliente.email": { $regex: `^${escaparRegex(cliente.email)}$`, $options: "i" },
      },
    ],
  };

  return colecao.find(filtro).sort({ criadoEm: -1 }).toArray();
}

/**
 * Mesma regra de posse usada em `buscarPedidosDoCliente`, mas para checar um
 * único pedido já carregado (ex: página de detalhe) sem nova consulta.
 */
export function pedidoPertenceAoCliente(pedido: Pedido, cliente: Cliente): boolean {
  if (pedido.clienteId) {
    return pedido.clienteId.equals(cliente._id!);
  }
  return pedido.cliente.email.trim().toLowerCase() === cliente.email;
}

function chaveEndereco(endereco: EnderecoCliente): string {
  return [
    endereco.logradouro,
    endereco.numero,
    endereco.complemento ?? "",
    endereco.bairro,
    endereco.cidade,
    endereco.estado,
    endereco.cep,
  ]
    .map((campo) => campo.trim().toLowerCase())
    .join("|");
}

/**
 * Histórico de endereços do cliente (data-model.md) — endereços distintos já
 * usados em pedidos associados, mais o endereço atual do cadastro. Sem
 * coleção própria: derivado por leitura a cada chamada.
 */
export function derivarHistoricoEnderecos(cliente: Cliente, pedidos: Pedido[]): EnderecoCliente[] {
  const vistos = new Map<string, EnderecoCliente>();

  if (cliente.endereco) {
    vistos.set(chaveEndereco(cliente.endereco), cliente.endereco);
  }

  for (const pedido of pedidos) {
    const endereco = pedido.cliente.endereco;
    if (endereco) {
      const chave = chaveEndereco(endereco);
      if (!vistos.has(chave)) {
        vistos.set(chave, endereco);
      }
    }
  }

  return [...vistos.values()];
}
