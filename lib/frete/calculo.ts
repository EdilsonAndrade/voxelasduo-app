import {
  ROTULO_SERVICO_FRETE,
  SERVICOS_FRETE,
  type FreteConfig,
  type FretePedido,
  type OpcaoFrete,
  type ServicoFrete,
} from "@/lib/models/frete";
import type { EmbalagemEnvio } from "@/lib/models/produto";

/** Serviços com valor (os que uma calculadora por CEP/peso pode cotar). */
export type ServicoFretePago = Exclude<ServicoFrete, "combinar">;

/**
 * Gancho para o cálculo futuro por CEP/peso (ex.: API de frete). Devolve o
 * valor em centavos ou `null` quando não consegue calcular — nesse caso vale
 * o valor fixo configurado.
 */
export type CalculadoraFrete = (entrada: {
  servico: ServicoFretePago;
  cep: string;
  pacotes: EmbalagemEnvio[];
}) => Promise<number | null>;

export interface EntradaCalculoFrete {
  config: FreteConfig;
  cep?: string;
  /** Embalagem de cada unidade do carrinho — `undefined` = produto sem peso/medidas. */
  pacotes?: (EmbalagemEnvio | undefined)[];
  calculadora?: CalculadoraFrete | null;
}

function valorFixo(config: FreteConfig, servico: ServicoFretePago): number {
  return servico === "pac" ? config.pacCentavos : config.sedexCentavos;
}

async function tentarCalcular(
  entrada: EntradaCalculoFrete,
  servico: ServicoFretePago
): Promise<number | null> {
  const { calculadora, cep, pacotes } = entrada;
  const digitos = (cep ?? "").replace(/\D/g, "");
  if (!calculadora || digitos.length !== 8 || !pacotes || pacotes.length === 0) return null;
  // Só calcula quando todos os itens têm peso e medidas de embalagem.
  if (pacotes.some((pacote) => !pacote || !(pacote.pesoGramas > 0))) return null;

  try {
    const valor = await calculadora({ servico, cep: digitos, pacotes: pacotes as EmbalagemEnvio[] });
    return typeof valor === "number" && Number.isInteger(valor) && valor >= 0 ? valor : null;
  } catch {
    return null;
  }
}

/**
 * Ponto único do cálculo do frete do site (spec 039) — usado pela rota de
 * opções e pela criação do pedido, para o valor exibido e o cobrado serem
 * sempre os mesmos. Hoje sem calculadora: PAC/SEDEX usam o valor fixo.
 */
export async function calcularOpcoesFrete(entrada: EntradaCalculoFrete): Promise<OpcaoFrete[]> {
  const opcoes: OpcaoFrete[] = [];
  for (const servico of SERVICOS_FRETE) {
    if (servico === "combinar") {
      opcoes.push({ servico, rotulo: ROTULO_SERVICO_FRETE[servico], valorCentavos: 0, origem: "gratis" });
      continue;
    }
    const calculado = await tentarCalcular(entrada, servico);
    opcoes.push({
      servico,
      rotulo: ROTULO_SERVICO_FRETE[servico],
      valorCentavos: calculado ?? valorFixo(entrada.config, servico),
      origem: calculado !== null ? "calculado" : "fixo",
    });
  }
  return opcoes;
}

/** Frete a gravar no pedido para o serviço escolhido — `null` se o serviço não está entre as opções. */
export function resolverFretePedido(servico: ServicoFrete, opcoes: OpcaoFrete[]): FretePedido | null {
  const opcao = opcoes.find((item) => item.servico === servico);
  if (!opcao) return null;
  return { servico: opcao.servico, valorCentavos: opcao.valorCentavos, origem: opcao.origem };
}
