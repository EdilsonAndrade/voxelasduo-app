"use client";

import type { AnuncioCalculadoraValores, ModoAnuncio } from "@/lib/models/calculoPreco";
import type { ProducaoMensal } from "@/lib/produtos/calculadoraRapida";
import calc from "../calculadoraRapida.module.css";
import { Campo, Opcoes } from "./campos";
import Secao from "./Secao";
import { formatarAcos, formatarRoas, numero, reais } from "./formato";

const MODOS_ANUNCIO: Array<{ valor: ModoAnuncio; titulo: string; apoio: string }> = [
  { valor: "sem", titulo: "Sem anúncio", apoio: "Preço só com custo, taxas e o seu lucro" },
  { valor: "embutido", titulo: "Embutido no preço", apoio: "O preço sobe para pagar o anúncio" },
  { valor: "bolso", titulo: "Do meu bolso", apoio: "Verba à parte; mostra se ela volta com lucro" },
];

export function SecaoAds({
  anuncio,
  alterar,
}: {
  anuncio: AnuncioCalculadoraValores;
  alterar: (parcial: Partial<AnuncioCalculadoraValores>) => void;
}) {
  const roas = numero(anuncio.roasMeta);
  const roasValido = Number.isFinite(roas) && roas > 0;
  return (
    <Secao icone="ads" titulo="Ads / Tráfego pago" resumo={MODOS_ANUNCIO.find((m) => m.valor === anuncio.modo)?.titulo}>
      <Opcoes rotulo="Como vai pagar o anúncio?" valor={anuncio.modo} onChange={(modo) => alterar({ modo })} opcoes={MODOS_ANUNCIO} />
      <div className={calc.campos3}>
        <Campo
          id="roasMeta"
          rotulo="Meta de ROAS"
          unidade="x"
          valor={anuncio.roasMeta}
          onChange={(roasMeta) => alterar({ roasMeta })}
          dica={
            roasValido
              ? `R$ ${formatarRoas(roas)} vendidos a cada R$ 1 de anúncio (${formatarAcos(roas)} da venda; ACOS no Mercado Livre).`
              : "Ex: 8"
          }
        />
        {anuncio.modo === "bolso" && (
          <Campo
            id="verbaMes"
            rotulo="Verba do bolso por mês"
            prefixo="R$"
            valor={anuncio.verbaMesReais}
            onChange={(verbaMesReais) => alterar({ verbaMesReais })}
            dica="Dinheiro separado para anúncio, fora do preço."
          />
        )}
      </div>
      <span className={calc.textoApoio}>A meta de ROAS também é usada no comparativo com o concorrente e nos orçamentos impressos.</span>
    </Secao>
  );
}

export function SecaoConcorrente({
  preco,
  oferta,
  vendas,
  setPreco,
  setOferta,
  setVendas,
}: {
  preco: string;
  oferta: string;
  vendas: string;
  setPreco: (v: string) => void;
  setOferta: (v: string) => void;
  setVendas: (v: string) => void;
}) {
  const precoNumero = numero(preco);
  const vendasNumero = Number(vendas);
  const faturamento = vendasNumero > 0 && precoNumero > 0 ? Math.round(precoNumero * 100) * vendasNumero : 0;
  return (
    <Secao icone="concorrente" titulo="Concorrente" resumo={precoNumero > 0 ? reais(Math.round(precoNumero * 100)) : "opcional"}>
      <div className={calc.campos3}>
        <Campo id="precoConcorrente" rotulo="Preço normal dele" prefixo="R$" valor={preco} onChange={setPreco} dica="1 unidade do mesmo produto, fora de promoção." />
        <Campo id="precoOferta" rotulo="Preço na oferta relâmpago" prefixo="R$" valor={oferta} onChange={setOferta} dica="Se ele faz oferta relâmpago." />
        <Campo
          id="vendasConcorrente"
          rotulo="Vendas dele no mês"
          unidade="un"
          valor={vendas}
          onChange={(v) => setVendas(v.replace(/\D/g, ""))}
          dica={faturamento > 0 ? `Ele fatura ~${reais(faturamento)} por mês com esse produto.` : "Como aparece no anúncio dele."}
        />
      </div>
    </Secao>
  );
}

export function SecaoProducao({
  horasPorDia,
  diasPorMes,
  pecasMes,
  setHorasPorDia,
  setDiasPorMes,
  setPecasMes,
  producao,
}: {
  horasPorDia: string;
  diasPorMes: string;
  pecasMes: string;
  setHorasPorDia: (v: string) => void;
  setDiasPorMes: (v: string) => void;
  setPecasMes: (v: string) => void;
  producao: ProducaoMensal | null;
}) {
  return (
    <Secao icone="producao" titulo="Produção no mês" resumo={pecasMes ? `${pecasMes} peças` : undefined}>
      <div className={calc.campos3}>
        <Campo id="horasDia" rotulo="Horas imprimindo por dia" unidade="h" valor={horasPorDia} onChange={setHorasPorDia} />
        <Campo id="diasMes" rotulo="Dias no mês" unidade="dias" valor={diasPorMes} onChange={setDiasPorMes} />
        <Campo
          id="pecasMes"
          rotulo="Peças no mês"
          unidade="un"
          valor={pecasMes}
          onChange={setPecasMes}
          dica={
            producao
              ? `Automático: ${producao.mesasPorDia} mesas/dia = ${producao.pecasPorDia} peças/dia. Pode alterar.`
              : "Calculado pela mesa (Impressão), ou digite."
          }
        />
      </div>
    </Secao>
  );
}
