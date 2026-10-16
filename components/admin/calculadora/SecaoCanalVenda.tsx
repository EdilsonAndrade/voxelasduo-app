"use client";

import styles from "../admin.module.css";
import calc from "../calculadoraRapida.module.css";
import type { CalculadoraValoresV2, CanalCalculadoraValores, VendaDiretaCalculadora } from "@/lib/models/calculoPreco";
import { FAIXAS_SHOPEE_2026 } from "@/lib/produtos/calculadoraRapida";
import { NOME_CANAL, type CanalVenda } from "@/lib/produtos/canaisCalculadora";
import { CANAIS_VENDA } from "@/lib/produtos/resultadoCalculadora";
import { Campo, Divisor, Interruptor, Opcoes } from "./campos";
import Secao from "./Secao";
import { reais } from "./formato";

/** Subsídios do programa da Shopee por faixa — só informativos, não entram no cálculo. */
const SUBSIDIOS_SHOPEE = [
  { frete: 2000, pix: "—" },
  { frete: 3000, pix: "5%" },
  { frete: 3000, pix: "5%" },
  { frete: 4000, pix: "5% (8% acima de R$ 500)" },
];

function rotuloFaixa(i: number): string {
  const faixa = FAIXAS_SHOPEE_2026[i];
  const anterior = i > 0 ? FAIXAS_SHOPEE_2026[i - 1].ateCentavos! + 1 : null;
  if (anterior === null) return `Até ${reais(faixa.ateCentavos!)}`;
  if (faixa.ateCentavos === null) return `A partir de ${reais(anterior)}`;
  return `${reais(anterior)} – ${reais(faixa.ateCentavos)}`;
}

export default function SecaoCanalVenda({
  valores,
  aba,
  setAba,
  alterarDireta,
  alterarCanal,
}: {
  valores: CalculadoraValoresV2;
  aba: CanalVenda;
  setAba: (canal: CanalVenda) => void;
  alterarDireta: (parcial: Partial<VendaDiretaCalculadora>) => void;
  alterarCanal: (canal: "shopee" | "mercadoLivre", parcial: Partial<CanalCalculadoraValores>) => void;
}) {
  const d = valores.vendaDireta;
  const shopee = valores.canais.shopee;
  const ml = valores.canais.mercadoLivre;
  const faixaAuto = shopee.taxaPorFaixa !== false;

  return (
    <Secao icone="canal" titulo="Canal de venda" resumo={NOME_CANAL[aba]}>
      <div className={calc.abas} role="tablist" aria-label="Canal de venda">
        {CANAIS_VENDA.map((c) => (
          <button key={c} type="button" role="tab" aria-selected={aba === c} className={aba === c ? calc.abaAtiva : calc.aba} onClick={() => setAba(c)}>
            {NOME_CANAL[c]}
          </button>
        ))}
      </div>

      {aba === "direta" && (
        <>
          <Opcoes
            rotulo="Forma de pagamento"
            valor={d.pagamento}
            onChange={(pagamento) => alterarDireta({ pagamento })}
            colunas={4}
            opcoes={[
              { valor: "debito", titulo: "Débito", apoio: "1,99%" },
              { valor: "credito", titulo: "Crédito", apoio: "2,99%" },
              { valor: "pix", titulo: "Pix", apoio: "taxa editável" },
              { valor: "outra", titulo: "Outra", apoio: "digitar" },
            ]}
          />
          {(d.pagamento === "pix" || d.pagamento === "outra") && (
            <div className={calc.campos3}>
              <Campo
                id="taxaPagamento"
                rotulo={d.pagamento === "pix" ? "Taxa do Pix" : "Taxa da forma de pagamento"}
                unidade="%"
                valor={d.pagamento === "pix" ? d.taxaPixPercentual : d.taxaOutraPercentual}
                onChange={(v) => alterarDireta(d.pagamento === "pix" ? { taxaPixPercentual: v } : { taxaOutraPercentual: v })}
              />
            </div>
          )}
          <Divisor>Frete</Divisor>
          <Opcoes
            valor={d.frete}
            onChange={(frete) => alterarDireta({ frete })}
            opcoes={[
              { valor: "gratis", titulo: "Frete grátis", apoio: "Você paga o envio" },
              { valor: "cobrado", titulo: "Frete cobrado", apoio: "O comprador paga o envio" },
            ]}
          />
          {d.frete === "gratis" && (
            <div className={calc.campos3}>
              <Campo id="custoEnvio" rotulo="Custo do envio" prefixo="R$" valor={d.custoEnvioReais} onChange={(v) => alterarDireta({ custoEnvioReais: v })} placeholder="Ex: 15,00" />
            </div>
          )}
          <span className={styles.mlLinkAviso}>Em mãos, WhatsApp, Instagram ou feira. Não use este preço nos marketplaces — lá a comissão sai do seu lucro.</span>
        </>
      )}

      {aba === "shopee" && (
        <>
          <Opcoes
            rotulo="Tipo de conta"
            valor={shopee.tipoConta ?? "cpf"}
            onChange={(tipoConta) => alterarCanal("shopee", { tipoConta })}
            opcoes={[
              { valor: "cnpj", titulo: "CNPJ", apoio: "Sem taxa adicional" },
              { valor: "cpf", titulo: "CPF", apoio: "+ R$ 3,00 por item acima de 450 pedidos em 90 dias" },
            ]}
          />
          {shopee.tipoConta !== "cnpj" && (
            <Opcoes
              rotulo="Pedidos nos últimos 90 dias"
              valor={shopee.cpfAcima450Pedidos ? "mais" : "ate"}
              onChange={(v) => alterarCanal("shopee", { cpfAcima450Pedidos: v === "mais" })}
              opcoes={[
                { valor: "ate", titulo: "Até 450 pedidos", apoio: "Sem taxa adicional" },
                { valor: "mais", titulo: "Mais de 450 pedidos", apoio: "+ R$ 3,00 por item vendido" },
              ]}
            />
          )}

          <Divisor>Comissão por faixa de preço</Divisor>
          <label className={calc.checkLinha}>
            <input type="checkbox" checked={faixaAuto} onChange={(e) => alterarCanal("shopee", { taxaPorFaixa: e.target.checked })} />
            Taxa automática pela faixa de preço
          </label>
          {faixaAuto ? (
            <>
              <div className={calc.tabelaKitsRolagem}>
                <table className={calc.tabelaFaixas}>
                  <thead>
                    <tr>
                      <th scope="col">Faixa</th>
                      <th scope="col">Comissão</th>
                      <th scope="col">Taxa fixa</th>
                      <th scope="col">Subsídio frete</th>
                      <th scope="col">Subsídio Pix</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FAIXAS_SHOPEE_2026.map((f, i) => (
                      <tr key={i}>
                        <th scope="row">{rotuloFaixa(i)}</th>
                        <td>{f.percentual}%</td>
                        <td>{reais(f.fixaCentavos)}</td>
                        <td>{reais(SUBSIDIOS_SHOPEE[i].frete)}</td>
                        <td>{SUBSIDIOS_SHOPEE[i].pix}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <span className={styles.mlLinkAviso}>
                Tabela vigente desde 01/10/2026, já com frete grátis e taxa de transação. Subsídio de frete e Pix são
                informativos e não entram na conta.
              </span>
            </>
          ) : (
            <div className={calc.campos3}>
              <Campo id="taxa-shopee" rotulo="Comissão" unidade="%" valor={shopee.taxaPercentual} onChange={(v) => alterarCanal("shopee", { taxaPercentual: v })} />
              <Campo id="fixa-shopee" rotulo="Taxa fixa por venda" prefixo="R$" valor={shopee.taxaFixaReais} onChange={(v) => alterarCanal("shopee", { taxaFixaReais: v })} />
            </div>
          )}

          <Divisor>Configurações adicionais</Divisor>
          <Interruptor
            id="campanhaDestaque"
            titulo="Campanha de destaque?"
            apoio="Comissão extra durante os períodos de campanha."
            ligado={shopee.campanhaDestaque === true}
            onChange={(campanhaDestaque) => alterarCanal("shopee", { campanhaDestaque })}
          >
            <div className={calc.campos3}>
              <Campo id="campanhaPercentual" rotulo="Comissão extra" unidade="%" valor={shopee.campanhaPercentual ?? ""} onChange={(v) => alterarCanal("shopee", { campanhaPercentual: v })} />
            </div>
          </Interruptor>
          <Interruptor
            id="cupom"
            titulo="Cupom de desconto próprio?"
            apoio="Desconto bancado por você, absorvido como custo de cada pedido."
            ligado={shopee.cupomAtivo === true}
            onChange={(cupomAtivo) => alterarCanal("shopee", { cupomAtivo })}
          >
            <div className={calc.campos3}>
              <Campo id="cupomReais" rotulo="Valor do cupom" prefixo="R$" valor={shopee.cupomReais ?? ""} onChange={(v) => alterarCanal("shopee", { cupomReais: v })} />
            </div>
          </Interruptor>
        </>
      )}

      {aba === "mercadoLivre" && (
        <div className={calc.campos3}>
          <Campo id="taxa-mercadoLivre" rotulo="Comissão" unidade="%" valor={ml.taxaPercentual} onChange={(v) => alterarCanal("mercadoLivre", { taxaPercentual: v })} dica="Clássico ~14% · Premium ~19%" />
          <Campo
            id="fixa-mercadoLivre"
            rotulo="Custo fixo abaixo de R$ 79"
            prefixo="R$"
            valor={ml.taxaFixaReais}
            onChange={(v) => alterarCanal("mercadoLivre", { taxaFixaReais: v })}
            dica="Por unidade, varia com o peso."
          />
        </div>
      )}
    </Secao>
  );
}
