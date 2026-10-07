import type { PedidoEventoJson, PedidoEventoPayload } from "@/lib/models/pedidoEvento";
import { apagarDb, gravarDb, lerDb, listarDb } from "./db";

/**
 * Fila offline dos pedidos de evento (EDI-125). Todo pedido salvo entra
 * primeiro aqui (no aparelho) e é enviado em segundo plano: fotos primeiro
 * (cada URL recebida fica gravada, então retentativas não reenviam a foto)
 * e depois o pedido, por PUT idempotente pelo UUID — reenviar não duplica.
 */

export interface FotoFila {
  blob?: Blob;
  url?: string;
}

export interface EntradaFila {
  id: string;
  /** Payload com `itens[].fotos` contendo chaves de `fotos`. */
  pedido: PedidoEventoPayload;
  fotos: Record<string, FotoFila>;
  estado: "pendente" | "erro";
  erro?: string;
  /** Quem anotou (só para exibir enquanto não chega ao servidor). */
  autor: string;
  enfileiradoEm: string;
}

export interface EstadoFila {
  pendentes: number;
  comErro: number;
  enviando: boolean;
  semInternet: boolean;
  /** Sessão expirou: o envio só volta depois de entrar de novo. */
  precisaEntrar: boolean;
}

type Ouvinte = (estado: EstadoFila) => void;

const ouvintes = new Set<Ouvinte>();
let enviando = false;
let semInternet = false;
let precisaEntrar = false;

export function assinarFila(ouvinte: Ouvinte): () => void {
  ouvintes.add(ouvinte);
  void notificar();
  return () => ouvintes.delete(ouvinte);
}

async function notificar() {
  const entradas = await listarFila().catch(() => [] as EntradaFila[]);
  const estado: EstadoFila = {
    pendentes: entradas.filter((e) => e.estado === "pendente").length,
    comErro: entradas.filter((e) => e.estado === "erro").length,
    enviando,
    semInternet,
    precisaEntrar,
  };
  ouvintes.forEach((ouvinte) => ouvinte(estado));
}

export async function listarFila(): Promise<EntradaFila[]> {
  const entradas = await listarDb<EntradaFila>("fila");
  return entradas.sort((a, b) => a.enfileiradoEm.localeCompare(b.enfileiradoEm));
}

/** Grava no aparelho (pode lançar erro de armazenamento cheio) e dispara o envio. */
export async function enfileirarPedido(entrada: Omit<EntradaFila, "estado" | "enfileiradoEm">): Promise<void> {
  const existente = await lerDb<EntradaFila>("fila", entrada.id);
  await gravarDb("fila", {
    ...entrada,
    estado: "pendente",
    enfileiradoEm: existente?.enfileiradoEm ?? new Date().toISOString(),
  } satisfies EntradaFila);
  await notificar();
  void sincronizarFila();
}

/** Volta os pedidos com erro para "pendente" e tenta de novo. */
export async function tentarDeNovo(): Promise<void> {
  const entradas = await listarFila();
  await Promise.all(
    entradas.filter((e) => e.estado === "erro").map((e) => gravarDb("fila", { ...e, estado: "pendente", erro: undefined }))
  );
  precisaEntrar = false;
  await notificar();
  await sincronizarFila();
}

class SemConexaoError extends Error {}
class SessaoExpiradaError extends Error {}

async function requisitar(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, { ...init, credentials: "same-origin", cache: "no-store" });
  } catch {
    // fetch só rejeita por falha de rede — sem internet (ou servidor inalcançável).
    throw new SemConexaoError();
  }
}

async function mensagemDeErro(resposta: Response): Promise<string> {
  const corpo = (await resposta.json().catch(() => null)) as { erro?: string; erros?: Record<string, string> } | null;
  const primeiroCampo = corpo?.erros ? Object.values(corpo.erros)[0] : undefined;
  return [corpo?.erro, primeiroCampo].filter(Boolean).join(" ") || `Erro ${resposta.status} ao enviar.`;
}

/** Envia uma entrada; devolve o pedido gravado ou `null` se ficou com erro (4xx). */
async function enviarEntrada(entrada: EntradaFila): Promise<PedidoEventoJson | null> {
  for (const [chave, foto] of Object.entries(entrada.fotos)) {
    if (foto.url || !foto.blob) continue;
    const dados = new FormData();
    dados.append("foto", foto.blob, "foto.jpg");
    const resposta = await requisitar("/api/admin/evento/fotos", { method: "POST", body: dados });
    if (resposta.status === 401) throw new SessaoExpiradaError();
    if (!resposta.ok) {
      const erro = await mensagemDeErro(resposta);
      if (resposta.status >= 500) throw new Error(erro);
      await gravarDb("fila", { ...entrada, estado: "erro", erro } satisfies EntradaFila);
      return null;
    }
    const { url } = (await resposta.json()) as { url: string };
    entrada.fotos[chave] = { url };
    await gravarDb("fila", entrada);
  }

  const pedido: PedidoEventoPayload = {
    ...entrada.pedido,
    itens: entrada.pedido.itens.map((item) => ({
      ...item,
      fotos: item.fotos.map((chave) => entrada.fotos[chave]?.url).filter((url): url is string => !!url),
    })),
  };

  const resposta = await requisitar(`/api/admin/evento/pedidos/${entrada.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(pedido),
  });
  if (resposta.status === 401) throw new SessaoExpiradaError();
  if (!resposta.ok) {
    const erro = await mensagemDeErro(resposta);
    if (resposta.status >= 500) throw new Error(erro);
    await gravarDb("fila", { ...entrada, estado: "erro", erro } satisfies EntradaFila);
    return null;
  }

  const { pedido: gravado } = (await resposta.json()) as { pedido: PedidoEventoJson };
  await apagarDb("fila", entrada.id);
  await atualizarCachePedido(gravado);
  return gravado;
}

let sincronizacao: Promise<void> | null = null;

/** Envia tudo o que estiver pendente. Chamadas simultâneas reaproveitam o mesmo envio. */
export function sincronizarFila(): Promise<void> {
  sincronizacao ??= (async () => {
    enviando = true;
    await notificar();
    try {
      for (const entrada of await listarFila()) {
        if (entrada.estado !== "pendente") continue;
        try {
          await enviarEntrada(entrada);
          semInternet = false;
          precisaEntrar = false;
        } catch (erro) {
          if (erro instanceof SemConexaoError) {
            semInternet = true;
            break;
          }
          if (erro instanceof SessaoExpiradaError) {
            precisaEntrar = true;
            break;
          }
          // 5xx: continua pendente, registra o motivo e tenta na próxima rodada.
          await gravarDb("fila", { ...entrada, erro: (erro as Error).message } satisfies EntradaFila);
        }
        await notificar();
      }
    } finally {
      enviando = false;
      sincronizacao = null;
      await notificar();
    }
  })();
  return sincronizacao;
}

// ---- cache da última lista do servidor (para ver pedidos sem internet) ----

export async function lerCachePedidos(): Promise<PedidoEventoJson[]> {
  return (await lerDb<PedidoEventoJson[]>("cache", "pedidos").catch(() => undefined)) ?? [];
}

export async function gravarCachePedidos(pedidos: PedidoEventoJson[]): Promise<void> {
  await gravarDb("cache", pedidos, "pedidos").catch(() => undefined);
}

async function atualizarCachePedido(pedido: PedidoEventoJson): Promise<void> {
  const atuais = await lerCachePedidos();
  await gravarCachePedidos([pedido, ...atuais.filter((p) => p._id !== pedido._id)]);
}

// ---- nomes dos produtos do catálogo (sugestões do item, também sem internet) ----

export async function lerCacheProdutos(): Promise<string[]> {
  return (await lerDb<string[]>("cache", "produtos").catch(() => undefined)) ?? [];
}

export async function gravarCacheProdutos(produtos: string[]): Promise<void> {
  await gravarDb("cache", produtos, "produtos").catch(() => undefined);
}

export async function lerUltimoEvento(): Promise<string> {
  return (await lerDb<string>("cache", "ultimoEvento").catch(() => undefined)) ?? "";
}

export async function gravarUltimoEvento(nome: string): Promise<void> {
  await gravarDb("cache", nome, "ultimoEvento").catch(() => undefined);
}
