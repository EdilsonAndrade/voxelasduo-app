"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import ImprimirButton from "@/components/admin/ImprimirButton";
import { ROTULO_FORMA_PAGAMENTO, type LugarRomaneio, type RomaneioJson } from "@/lib/models/romaneio";
import { noLugar, resumoDoLugar, resumoDoRomaneio } from "@/lib/romaneios/calculo";
import { formatarPreco } from "@/lib/produtos/formato";
import styles from "./romaneios.module.css";

function dataCurta(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function FichaLugar({ lugar, separado }: { lugar: LugarRomaneio; separado: boolean }) {
  const resumo = resumoDoLugar(lugar);
  const comAcerto = resumo.temAcerto;
  return (
    <section className={`${styles.fichaLugar} ${separado ? styles.fichaLugarSeparado : ""}`}>
      <h2 className={styles.fichaLugarTitulo}>{lugar.nome}</h2>
      <p className={styles.fichaMeta}>
        {[lugar.levadoPor && `Levado por ${lugar.levadoPor}`, lugar.contato && `Contato: ${lugar.contato}`].filter(Boolean).join(" · ")}
        {lugar.status === "acertado" && lugar.acertadoEm ? ` · Acertado em ${dataCurta(lugar.acertadoEm)}` : ""}
      </p>
      <table className={styles.fichaTabela}>
        <thead>
          <tr>
            <th className={styles.fichaConferido}>✓</th>
            <th>Peça</th>
            <th className={styles.num}>Qtd</th>
            <th className={styles.num}>Preço</th>
            <th className={styles.num}>Subtotal</th>
            {comAcerto && (
              <>
                <th className={styles.num}>Vendidas</th>
                <th className={styles.num}>Devolvidas</th>
                <th className={styles.num}>No lugar</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {lugar.itens.map((item) => (
            <tr key={item.id}>
              <td />
              <td>{item.nome}</td>
              <td className={styles.num}>{item.levada}</td>
              <td className={styles.num}>{formatarPreco(item.precoCentavos)}</td>
              <td className={styles.num}>{formatarPreco(item.levada * item.precoCentavos)}</td>
              {comAcerto && (
                <>
                  <td className={styles.num}>{item.vendida}</td>
                  <td className={styles.num}>{item.devolvida}</td>
                  <td className={styles.num}>{noLugar(item)}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td />
            <td>Total</td>
            <td className={styles.num}>{resumo.pecas}</td>
            <td />
            <td className={styles.num}>{formatarPreco(resumo.valorCentavos)}</td>
            {comAcerto && (
              <>
                <td className={styles.num}>{resumo.vendidas}</td>
                <td className={styles.num}>{resumo.devolvidas}</td>
                <td className={styles.num}>{resumo.pecasNoLugar}</td>
              </>
            )}
          </tr>
        </tfoot>
      </table>
      {comAcerto && (
        <>
          <div className={styles.fichaResumo}>
            <span>Vendido: <strong>{formatarPreco(resumo.vendidoCentavos)}</strong></span>
            <span>Pago: <strong>{formatarPreco(resumo.pagoCentavos)}</strong></span>
            <span>A receber: <strong>{formatarPreco(resumo.aReceberCentavos)}</strong></span>
            {resumo.pagoAMaisCentavos > 0 && <span>Pago a mais: <strong>{formatarPreco(resumo.pagoAMaisCentavos)}</strong></span>}
          </div>
          {lugar.pagamentos.length > 0 && (
            <p className={styles.fichaMeta}>
              Pagamentos:{" "}
              {lugar.pagamentos
                .map((p) => `${dataCurta(p.data)} ${ROTULO_FORMA_PAGAMENTO[p.forma]} ${formatarPreco(p.valorCentavos)}${p.observacao ? ` (${p.observacao})` : ""}`)
                .join(" · ")}
            </p>
          )}
        </>
      )}
      {separado && (
        <div className={styles.assinaturas}>
          <div className={styles.assinatura}>Entregue por</div>
          <div className={styles.assinatura}>Recebido por — {lugar.nome}</div>
        </div>
      )}
    </section>
  );
}

/**
 * Ficha do romaneio para imprimir / salvar PDF (specs/038): o romaneio inteiro
 * (uma seção por lugar e o total geral) ou um lugar só, com as colunas de
 * acerto quando já houver venda, devolução ou pagamento registrado.
 */
export default function FichaRomaneio({ romaneio, lugarId }: { romaneio: RomaneioJson; lugarId?: string }) {
  const router = useRouter();
  const lugares = romaneio.lugares.filter((l) => l.itens.length > 0 && (!lugarId || l.id === lugarId));
  const umLugar = lugarId !== undefined;
  const geral = resumoDoRomaneio(lugares);

  return (
    <div className={`container ${styles.ficha}`}>
      <div className={styles.fichaControles}>
        <ImprimirButton className={styles.botaoPequenoForte} />
        <select
          aria-label="O que imprimir"
          value={lugarId ?? ""}
          onChange={(e) =>
            router.replace(`/admin/romaneios/${romaneio.id}/imprimir${e.target.value ? `?lugar=${e.target.value}` : ""}`)
          }
        >
          <option value="">Romaneio inteiro</option>
          {romaneio.lugares
            .filter((l) => l.itens.length > 0)
            .map((l) => (
              <option key={l.id} value={l.id}>
                Só {l.nome}
              </option>
            ))}
        </select>
        <Link href={`/admin/romaneios/${romaneio.id}`} className={styles.botaoTexto}>
          Voltar ao romaneio
        </Link>
      </div>

      <header className={styles.fichaCabecalho}>
        <div>
          <h1 className={styles.fichaTitulo}>Romaneio — {umLugar && lugares[0] ? lugares[0].nome : romaneio.nome}</h1>
          <p className={styles.fichaMeta}>
            {umLugar ? `${romaneio.nome} · ` : ""}Saída em {dataCurta(romaneio.dataSaida)}
            {romaneio.observacao ? ` · ${romaneio.observacao}` : ""}
          </p>
        </div>
        <p className={styles.fichaMeta}>Voxelas Duo</p>
      </header>

      {lugares.length === 0 ? (
        <p>Nenhuma peça para imprimir.</p>
      ) : (
        <>
          {lugares.map((lugar) => (
            <FichaLugar key={lugar.id} lugar={lugar} separado={umLugar} />
          ))}
          {!umLugar && (
            <>
              {lugares.length > 1 && (
                <div className={styles.fichaTotalGeral}>
                  <span>Total geral: {geral.pecas} peças</span>
                  <span>{formatarPreco(geral.valorCentavos)}</span>
                  {geral.temAcerto && <span>Vendido {formatarPreco(geral.vendidoCentavos)}</span>}
                  {geral.temAcerto && <span>A receber {formatarPreco(geral.aReceberCentavos)}</span>}
                </div>
              )}
              <div className={styles.assinaturas}>
                <div className={styles.assinatura}>Entregue por</div>
                <div className={styles.assinatura}>Recebido por</div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
