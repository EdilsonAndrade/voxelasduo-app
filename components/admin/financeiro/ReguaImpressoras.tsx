import { formatarPreco } from "@/lib/produtos/formato";
import styles from "./financeiro.module.css";

export interface ReguaImpressorasProps {
  investidoCentavos: number;
  retornoCentavos: number;
  percentual: number | null;
  faltaCentavos: number;
  mesesParaQuitar: number | null;
  retornoMedioMesCentavos: number;
  impressoras: { id: string; nome: string; valorCentavos: number; pagoCentavos: number; paga: boolean }[];
}

/** "As impressoras já se pagaram?" — uma fatia por máquina, preenchida pelo retorno acumulado. */
export default function ReguaImpressoras(p: ReguaImpressorasProps) {
  const quitou = p.investidoCentavos > 0 && p.faltaCentavos === 0;
  const pagas = p.impressoras.filter((i) => i.paga).length;

  return (
    <section className={styles.cartao} aria-labelledby="regua-titulo">
      <div className={styles.reguaCabeca}>
        <div>
          <h2 id="regua-titulo" className={styles.reguaPergunta}>
            As impressoras já se pagaram?
          </h2>
          {p.investidoCentavos > 0 && (
            <p className={styles.reguaResposta}>
              {quitou ? "Sim!" : `${pagas} de ${p.impressoras.length}`}
              <small>
                {formatarPreco(Math.max(0, p.retornoCentavos))} de {formatarPreco(p.investidoCentavos)} (
                {(p.percentual ?? 0).toLocaleString("pt-BR")}%)
              </small>
            </p>
          )}
        </div>
        {p.investidoCentavos > 0 && (
          <p className={styles.anotacao}>
            {quitou
              ? `já sobram ${formatarPreco(p.retornoCentavos - p.investidoCentavos)} além das máquinas`
              : p.mesesParaQuitar !== null
                ? `faltam ${formatarPreco(p.faltaCentavos)} — uns ${p.mesesParaQuitar} ${p.mesesParaQuitar === 1 ? "mês" : "meses"} nesse ritmo`
                : `faltam ${formatarPreco(p.faltaCentavos)}`}
          </p>
        )}
      </div>

      {p.impressoras.length === 0 ? (
        <p className={styles.semImpressora}>
          Cadastre as impressoras na aba <strong>Impressoras</strong> para ver quanto do investimento já voltou.
        </p>
      ) : (
        <>
          <div className={styles.regua} role="list">
            {p.impressoras.map((imp) => {
              const fracao = imp.valorCentavos > 0 ? imp.pagoCentavos / imp.valorCentavos : 0;
              return (
                <div
                  key={imp.id}
                  role="listitem"
                  className={styles.fatia}
                  style={{ flexGrow: imp.valorCentavos, flexBasis: 0 }}
                  aria-label={`${imp.nome}: ${formatarPreco(imp.pagoCentavos)} de ${formatarPreco(imp.valorCentavos)} pagos`}
                >
                  <div className={styles.fatiaPreenchida} style={{ width: `${Math.round(fracao * 1000) / 10}%` }} />
                  <div className={`${styles.fatiaRotulo} ${fracao >= 0.55 ? styles.fatiaRotuloSobre : ""}`}>
                    <strong>
                      {imp.paga ? "✓ " : ""}
                      {imp.nome}
                    </strong>
                    <span>{imp.paga ? "paga" : `${Math.round(fracao * 100)}% · ${formatarPreco(imp.valorCentavos)}`}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className={styles.reguaLegenda}>
            <span>
              <span className={styles.marca} style={{ background: "var(--fin-positivo)" }} />
              Retorno: lucro + desgaste das máquinas já embutido no custo
            </span>
            <span>Ordem de compra — a mais antiga é paga primeiro</span>
            {p.retornoMedioMesCentavos !== 0 && <span>Ritmo recente: {formatarPreco(p.retornoMedioMesCentavos)}/mês</span>}
          </div>
        </>
      )}
    </section>
  );
}
