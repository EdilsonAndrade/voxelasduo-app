import type { CalculadoraValores } from "@/lib/models/calculoPreco";
import type { ModeloSugerido } from "@/lib/models/nicho";
import { valoresPadrao } from "@/lib/produtos/calculadoraPadrao";
import { separarHoras } from "@/lib/produtos/calculadoraValores";

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
 * do perfil como uma mesa de 1 peça, para o usuário ajustar; com várias mesas
 * o nome avisa para conferir, porque não dá para saber quantas peças saem.
 */
export function montarCalculoDoModelo(entrada: {
  termo: string;
  modelo: ModeloSugerido;
  linkShopee?: string;
  linkMercadoLivre?: string;
}): CalculoDoModelo {
  const { termo, modelo, linkShopee, linkMercadoLivre } = entrada;
  const { segundos, gramas, mesas } = modelo.perfil;

  const padrao = valoresPadrao();
  // O perfil inteiro vira uma "mesa" de 1 peça: com várias mesas o nome avisa para conferir.
  const valores: CalculadoraValores = {
    ...padrao,
    impressao: {
      ...padrao.impressao,
      pecasPorMesa: "1",
      ...separarHoras(segundos / 3600),
      pesoGramas: String(Math.round(gramas)),
    },
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
