"use client";

import calc from "../calculadoraRapida.module.css";
import type { PrecificacaoCalculadora } from "@/lib/models/calculoPreco";
import { Campo, Interruptor, Opcoes } from "./campos";
import Secao from "./Secao";
import { numero, reais } from "./formato";

export default function SecaoPrecificacao({
  precificacao,
  alterar,
  margem,
  setMargem,
  precoConcorrenteReais,
  resumo,
}: {
  precificacao: PrecificacaoCalculadora;
  alterar: (parcial: Partial<PrecificacaoCalculadora>) => void;
  margem: string;
  setMargem: (valor: string) => void;
  precoConcorrenteReais: string;
  resumo?: string;
}) {
  const concorrente = numero(precoConcorrenteReais);
  const alvo = precificacao.modo === "alvo";

  return (
    <Secao icone="preco" titulo="Precificação" resumo={resumo} aberta>
      <Opcoes
        rotulo="Como prefere precificar?"
        valor={precificacao.modo}
        onChange={(modo) => alterar({ modo })}
        opcoes={[
          { valor: "margem", titulo: "Quero uma margem mínima", apoio: "Digo quanto quero ganhar e recebo o preço" },
          { valor: "alvo", titulo: "Tenho um preço alvo", apoio: "Digo por quanto vou vender e vejo quanto ganho" },
        ]}
      />

      <div className={calc.campos3}>
        {alvo && (
          <Campo
            id="precoAlvo"
            rotulo="Preço de venda"
            prefixo="R$"
            valor={precificacao.precoAlvoReais}
            onChange={(v) => alterar({ precoAlvoReais: v })}
            placeholder="Ex: 49,90"
            dica={
              concorrente > 0 ? (
                <button type="button" className={calc.linkAcao} onClick={() => alterar({ precoAlvoReais: precoConcorrenteReais })}>
                  Usar o preço do concorrente ({reais(Math.round(concorrente * 100))})
                </button>
              ) : (
                "O que o comprador paga. Vale para todos os canais."
              )
            }
          />
        )}
        <Campo
          id="margem"
          rotulo={alvo ? "Margem mínima de referência" : "Quero ganhar"}
          unidade="% do preço"
          valor={margem}
          onChange={setMargem}
          dica={
            alvo
              ? "Usada para mostrar o preço que daria essa margem, o teto de anúncio e os kits."
              : "O que sobra de cada venda, já pagos custo, taxas, imposto e anúncio."
          }
        />
        <Campo
          id="imposto"
          rotulo="Imposto"
          unidade="%"
          valor={precificacao.impostoPercentual}
          onChange={(v) => alterar({ impostoPercentual: v })}
          dica="Sobre o preço de venda. Venda no CPF = 0. Simples Nacional: 6–12%."
        />
      </div>

      <Interruptor
        id="promocao"
        titulo="Calcular com promoção?"
        apoio="Mostra o preço cheio a anunciar para, com o desconto, o comprador pagar o preço calculado."
        ligado={precificacao.promocaoAtiva}
        onChange={(promocaoAtiva) => alterar({ promocaoAtiva })}
      >
        <div className={calc.campos3}>
          <Campo id="promocaoPercentual" rotulo="Desconto da promoção" unidade="%" valor={precificacao.promocaoPercentual} onChange={(v) => alterar({ promocaoPercentual: v })} />
        </div>
      </Interruptor>
    </Secao>
  );
}
