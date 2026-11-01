import { ROTULO_SERVICO_FRETE, type FretePedido } from "@/lib/models/frete";
import { formatarPreco } from "@/lib/produtos/formato";

/** "SEDEX — R$ 25,50" / "Combinar com a loja — Grátis" (spec 039). */
export function descreverFrete(frete: FretePedido): string {
  const valor = frete.valorCentavos === 0 ? "Grátis" : formatarPreco(frete.valorCentavos);
  return `${ROTULO_SERVICO_FRETE[frete.servico]} — ${valor}`;
}
