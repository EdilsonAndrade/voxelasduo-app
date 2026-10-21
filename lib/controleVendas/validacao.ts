import {
  CANAIS_CONTROLE,
  LIMITES_CONTROLE,
  type CanalControle,
  type ProducaoControlePayload,
  type VendaControlePayload,
} from "@/lib/models/controleVendas";

export type ErrosCampos = Record<string, string>;

function inteiroEntre(valor: unknown, min: number, max: number): valor is number {
  return typeof valor === "number" && Number.isInteger(valor) && valor >= min && valor <= max;
}

function centavosOuNulo(valor: unknown): boolean {
  return valor === null || inteiroEntre(valor, 0, LIMITES_CONTROLE.valorMaxCentavos);
}

export function validarProducao(corpo: unknown): ErrosCampos {
  const erros: ErrosCampos = {};
  const p = (corpo ?? {}) as Partial<ProducaoControlePayload>;
  if (!inteiroEntre(p.produzido, 0, LIMITES_CONTROLE.quantidadeMax)) {
    erros.produzido = "Informe a quantidade produzida (número inteiro, 0 ou mais).";
  }
  if (!centavosOuNulo(p.custoUnitarioCentavos)) erros.custoUnitarioCentavos = "Custo inválido.";
  if (!centavosOuNulo(p.precoVendaCentavos)) erros.precoVendaCentavos = "Preço inválido.";
  return erros;
}

export function validarVenda(corpo: unknown): ErrosCampos {
  const erros: ErrosCampos = {};
  const v = (corpo ?? {}) as Partial<VendaControlePayload>;
  const max = LIMITES_CONTROLE.valorMaxCentavos;

  if (typeof v.data !== "string" || Number.isNaN(Date.parse(v.data))) erros.data = "Data inválida.";
  if (!inteiroEntre(v.quantidade, 1, LIMITES_CONTROLE.quantidadeMax)) {
    erros.quantidade = "A quantidade vendida deve ser 1 ou mais.";
  }
  if (typeof v.cliente !== "string" || v.cliente.trim().length > LIMITES_CONTROLE.clienteMax) {
    erros.cliente = `Use até ${LIMITES_CONTROLE.clienteMax} caracteres para o cliente.`;
  }
  if (!CANAIS_CONTROLE.includes(v.canal as CanalControle)) erros.canal = "Escolha o canal da venda.";
  if (!inteiroEntre(v.precoUnitarioCentavos, 0, max)) erros.precoUnitarioCentavos = "Preço inválido.";
  if (
    typeof v.taxaPercentual !== "number" ||
    !Number.isFinite(v.taxaPercentual) ||
    v.taxaPercentual < 0 ||
    v.taxaPercentual > LIMITES_CONTROLE.taxaMaxPercentual
  ) {
    erros.taxaPercentual = `A taxa deve ficar entre 0% e ${LIMITES_CONTROLE.taxaMaxPercentual}%.`;
  }
  if (!inteiroEntre(v.taxaFixaCentavos, 0, max)) erros.taxaFixaCentavos = "Taxa fixa inválida.";
  if (!inteiroEntre(v.extrasCentavos, 0, max)) erros.extrasCentavos = "Valor de material extra inválido.";
  if (typeof v.baixarEstoque !== "boolean") erros.baixarEstoque = "Informe se a venda baixa o estoque.";
  return erros;
}
