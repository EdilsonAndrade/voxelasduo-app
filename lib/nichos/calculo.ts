import type { CalculadoraValores } from "@/lib/models/calculoPreco";
import type { ModeloSugerido } from "@/lib/models/nicho";
import { valoresPadrao } from "@/lib/produtos/calculadoraPadrao";

export interface CalculoDoModelo {
  nome: string;
  linkModelo3d: string;
  linkShopee?: string;
  linkMercadoLivre?: string;
  valores: CalculadoraValores;
}

/**
 * Corpo do `POST /api/admin/calculos-preco` para um modelo da pesquisa de
 * nichos (specs/030, US2): valores padrão da calculadora com tempo e gramas
 * do perfil. Perfil de uma mesa também preenche a produção (1 peça por mesa,
 * para o usuário ajustar); com várias mesas a produção fica em branco e o
 * nome avisa para conferir, porque não dá para saber quantas peças saem.
 */
export function montarCalculoDoModelo(entrada: {
  termo: string;
  modelo: ModeloSugerido;
  linkShopee?: string;
  linkMercadoLivre?: string;
}): CalculoDoModelo {
  const { termo, modelo, linkShopee, linkMercadoLivre } = entrada;
  const { segundos, gramas, mesas } = modelo.perfil;
  const horas = String(Math.round(segundos / 36) / 100);

  const padrao = valoresPadrao();
  const valores: CalculadoraValores = {
    ...padrao,
    custo: { ...padrao.custo, tempoImpressaoHoras: horas, pesoPecaGramas: String(Math.round(gramas)) },
    producao: mesas === 1 ? { ...padrao.producao, pecasPorMesa: "1", horasMesaCheia: horas } : padrao.producao,
  };

  const titulo = termo.trim().charAt(0).toUpperCase() + termo.trim().slice(1);
  return {
    nome: mesas > 1 ? `${titulo} (perfil com ${mesas} mesas — confira o tempo por peça)` : titulo,
    linkModelo3d: modelo.url,
    linkShopee: linkShopee?.trim() || undefined,
    linkMercadoLivre: linkMercadoLivre?.trim() || undefined,
    valores,
  };
}
