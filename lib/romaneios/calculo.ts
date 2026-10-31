import type {
  FormaPagamento,
  ItemRomaneio,
  LugarRomaneio,
  OrigemItemRomaneio,
  StatusLugar,
} from "@/lib/models/romaneio";

export interface ResumoRomaneio {
  /** Peças que saíram (Σ levada). */
  pecas: number;
  /** Valor de tudo que saiu (Σ levada × preço). */
  valorCentavos: number;
  /** Peças que ainda estão fora (Σ levada − vendida − devolvida). */
  pecasNoLugar: number;
  vendidas: number;
  devolvidas: number;
  vendidoCentavos: number;
  pagoCentavos: number;
  aReceberCentavos: number;
  pagoAMaisCentavos: number;
  /** Já há venda, devolução ou pagamento registrado. */
  temAcerto: boolean;
}

export function noLugar(item: Pick<ItemRomaneio, "levada" | "vendida" | "devolvida">): number {
  return Math.max(0, item.levada - item.vendida - item.devolvida);
}

export function resumoDoLugar(lugar: Pick<LugarRomaneio, "itens" | "pagamentos">): ResumoRomaneio {
  let pecas = 0;
  let valorCentavos = 0;
  let pecasNoLugar = 0;
  let vendidas = 0;
  let devolvidas = 0;
  let vendidoCentavos = 0;
  for (const item of lugar.itens) {
    pecas += item.levada;
    valorCentavos += item.levada * item.precoCentavos;
    pecasNoLugar += noLugar(item);
    vendidas += item.vendida;
    devolvidas += item.devolvida;
    vendidoCentavos += item.vendida * item.precoCentavos;
  }
  const pagoCentavos = lugar.pagamentos.reduce((soma, p) => soma + p.valorCentavos, 0);
  return {
    pecas,
    valorCentavos,
    pecasNoLugar,
    vendidas,
    devolvidas,
    vendidoCentavos,
    pagoCentavos,
    aReceberCentavos: Math.max(0, vendidoCentavos - pagoCentavos),
    pagoAMaisCentavos: Math.max(0, pagoCentavos - vendidoCentavos),
    temAcerto: vendidas > 0 || devolvidas > 0 || lugar.pagamentos.length > 0,
  };
}

/** Soma dos lugares; a receber e pago a mais são somados por lugar (um não compensa o outro). */
export function resumoDoRomaneio(lugares: Pick<LugarRomaneio, "itens" | "pagamentos">[]): ResumoRomaneio {
  const total: ResumoRomaneio = {
    pecas: 0,
    valorCentavos: 0,
    pecasNoLugar: 0,
    vendidas: 0,
    devolvidas: 0,
    vendidoCentavos: 0,
    pagoCentavos: 0,
    aReceberCentavos: 0,
    pagoAMaisCentavos: 0,
    temAcerto: false,
  };
  for (const lugar of lugares) {
    const r = resumoDoLugar(lugar);
    total.pecas += r.pecas;
    total.valorCentavos += r.valorCentavos;
    total.pecasNoLugar += r.pecasNoLugar;
    total.vendidas += r.vendidas;
    total.devolvidas += r.devolvidas;
    total.vendidoCentavos += r.vendidoCentavos;
    total.pagoCentavos += r.pagoCentavos;
    total.aReceberCentavos += r.aReceberCentavos;
    total.pagoAMaisCentavos += r.pagoAMaisCentavos;
    total.temAcerto ||= r.temAcerto;
  }
  return total;
}

/** Acertado só quando todos os lugares estão acertados. */
export function statusDoRomaneio(lugares: Pick<LugarRomaneio, "status">[]): StatusLugar {
  return lugares.length > 0 && lugares.every((l) => l.status === "acertado") ? "acertado" : "aberto";
}

/** Mesma peça = mesma origem, mesmo preço e (origem) mesmo id ou (item livre) mesmo nome. */
function mesmaPeca(
  a: Pick<ItemRomaneio, "origem" | "origemId" | "nome" | "precoCentavos">,
  b: Pick<ItemRomaneio, "origem" | "origemId" | "nome" | "precoCentavos">
): boolean {
  if (a.origem !== b.origem || a.precoCentavos !== b.precoCentavos) return false;
  if (a.origem === "livre") return a.nome.trim().toLocaleLowerCase("pt-BR") === b.nome.trim().toLocaleLowerCase("pt-BR");
  return a.origemId === b.origemId;
}

export interface NovaPeca {
  origem: OrigemItemRomaneio;
  origemId?: string;
  nome: string;
  precoCentavos: number;
  quantidade: number;
}

/**
 * Inclui a peça no lugar: se já houver uma linha da mesma peça (mesmo preço),
 * soma a quantidade nela; senão cria uma linha nova com `novoId`.
 */
export function adicionarPeca(itens: ItemRomaneio[], peca: NovaPeca, novoId: string): { itens: ItemRomaneio[]; somou: boolean } {
  const existente = itens.find((i) => mesmaPeca(i, peca));
  if (existente) {
    return {
      itens: itens.map((i) => (i === existente ? { ...i, levada: i.levada + peca.quantidade } : i)),
      somou: true,
    };
  }
  const item: ItemRomaneio = {
    id: novoId,
    origem: peca.origem,
    ...(peca.origemId ? { origemId: peca.origemId } : {}),
    nome: peca.nome,
    precoCentavos: peca.precoCentavos,
    levada: peca.quantidade,
    vendida: 0,
    devolvida: 0,
  };
  return { itens: [...itens, item], somou: false };
}

/**
 * Passa `quantidade` peças de uma linha de um lugar para outro lugar do mesmo
 * romaneio. Só o que ainda está no lugar pode ir; vendidas e devolvidas ficam
 * na origem. A linha da origem que zera (sem acerto) some.
 */
export function repassar(
  lugares: LugarRomaneio[],
  de: { lugarId: string; itemId: string },
  paraLugarId: string,
  quantidade: number,
  novoId: string
): { lugares?: LugarRomaneio[]; erro?: string } {
  if (de.lugarId === paraLugarId) return { erro: "Escolha outro lugar para repassar." };
  const origem = lugares.find((l) => l.id === de.lugarId);
  const destino = lugares.find((l) => l.id === paraLugarId);
  const item = origem?.itens.find((i) => i.id === de.itemId);
  if (!origem || !destino || !item) return { erro: "Lugar ou item não encontrado." };
  if (!(Number.isInteger(quantidade) && quantidade > 0)) return { erro: "Informe uma quantidade inteira maior que zero." };
  const disponivel = noLugar(item);
  if (quantidade > disponivel) {
    return { erro: `Só há ${disponivel} ${disponivel === 1 ? "peça" : "peças"} de "${item.nome}" em ${origem.nome}.` };
  }

  const restante = item.levada - quantidade;
  const itensOrigem =
    restante === 0
      ? origem.itens.filter((i) => i.id !== item.id)
      : origem.itens.map((i) => (i.id === item.id ? { ...i, levada: restante } : i));
  const { itens: itensDestino } = adicionarPeca(
    destino.itens,
    { origem: item.origem, origemId: item.origemId, nome: item.nome, precoCentavos: item.precoCentavos, quantidade },
    novoId
  );

  return {
    lugares: lugares.map((l) => {
      if (l.id === origem.id) return { ...l, itens: itensOrigem };
      if (l.id === destino.id) return { ...l, itens: itensDestino };
      return l;
    }),
  };
}

export interface LinhaTudoJunto {
  chave: string;
  origem: OrigemItemRomaneio;
  nome: string;
  precoCentavos: number;
  levada: number;
  vendida: number;
  devolvida: number;
  noLugar: number;
  /** Quanto está em cada lugar (levada), na ordem dos lugares. */
  porLugar: { lugarId: string; lugar: string; levada: number }[];
}

/** Cada peça uma vez só, com a soma de todos os lugares e a divisão por lugar. */
export function agruparTudoJunto(lugares: LugarRomaneio[]): LinhaTudoJunto[] {
  const linhas: LinhaTudoJunto[] = [];
  const representante: ItemRomaneio[] = [];
  for (const lugar of lugares) {
    for (const item of lugar.itens) {
      const indice = representante.findIndex((r) => mesmaPeca(r, item));
      let linha = linhas[indice];
      if (!linha) {
        representante.push(item);
        linha = {
          chave: item.id,
          origem: item.origem,
          nome: item.nome,
          precoCentavos: item.precoCentavos,
          levada: 0,
          vendida: 0,
          devolvida: 0,
          noLugar: 0,
          porLugar: [],
        };
        linhas.push(linha);
      }
      linha.levada += item.levada;
      linha.vendida += item.vendida;
      linha.devolvida += item.devolvida;
      linha.noLugar += noLugar(item);
      const doLugar = linha.porLugar.find((p) => p.lugarId === lugar.id);
      if (doLugar) doLugar.levada += item.levada;
      else linha.porLugar.push({ lugarId: lugar.id, lugar: lugar.nome, levada: item.levada });
    }
  }
  return linhas;
}

export function fecharAcerto(lugar: LugarRomaneio, hoje: string): LugarRomaneio {
  return { ...lugar, status: "acertado", acertadoEm: hoje };
}

export function reabrirLugar(lugar: LugarRomaneio): LugarRomaneio {
  const aberto: LugarRomaneio = { ...lugar, status: "aberto" };
  delete aberto.acertadoEm;
  return aberto;
}

/**
 * Lugar que comprou e pagou na hora: tudo vendido, nada devolvido, um pagamento
 * do total (substitui os anteriores) e o lugar acertado.
 */
export function pagoNaHora(lugar: LugarRomaneio, forma: FormaPagamento, hoje: string, idPagamento: string): LugarRomaneio {
  const itens = lugar.itens.map((i) => ({ ...i, vendida: i.levada, devolvida: 0 }));
  const total = itens.reduce((soma, i) => soma + i.levada * i.precoCentavos, 0);
  return {
    ...lugar,
    itens,
    pagamentos: total > 0 ? [{ id: idPagamento, valorCentavos: total, data: hoje, forma }] : [],
    status: "acertado",
    acertadoEm: hoje,
  };
}
