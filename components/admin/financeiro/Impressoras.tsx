"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { centavosParaCampo, reaisParaCentavos } from "@/lib/controleVendas/formato";
import type { ImpressoraJson } from "@/lib/models/financeiro";
import { formatarPreco } from "@/lib/produtos/formato";
import styles from "./financeiro.module.css";

interface Rascunho {
  id?: string;
  nome: string;
  dataCompra: string;
  valor: string;
  observacao: string;
}

const vazio: Rascunho = { nome: "", dataCompra: "", valor: "", observacao: "" };
const dataBr = (dia: string) => dia.split("-").reverse().join("/");

export default function Impressoras({ impressoras }: { impressoras: ImpressoraJson[] }) {
  const router = useRouter();
  const [rascunho, setRascunho] = useState<Rascunho>(vazio);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState("");
  const [salvando, setSalvando] = useState(false);
  const total = impressoras.reduce((s, i) => s + i.valorCentavos, 0);

  async function enviar(url: string, method: string, body?: unknown): Promise<boolean> {
    setErroGeral("");
    try {
      const resposta = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!resposta.ok) {
        const corpo = (await resposta.json().catch(() => ({}))) as { erro?: string; campos?: Record<string, string> };
        setErros(corpo.campos ?? {});
        setErroGeral(`${corpo.erro ?? "Não foi possível salvar."} (erro ${resposta.status})`);
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setErroGeral("Sem conexão com o servidor. Tente de novo.");
      return false;
    }
  }

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault();
    setErros({});
    setSalvando(true);
    const ok = await enviar(
      rascunho.id ? `/api/admin/financeiro/impressoras/${rascunho.id}` : "/api/admin/financeiro/impressoras",
      rascunho.id ? "PUT" : "POST",
      {
        nome: rascunho.nome,
        dataCompra: rascunho.dataCompra,
        valorCentavos: reaisParaCentavos(rascunho.valor),
        observacao: rascunho.observacao,
      }
    );
    setSalvando(false);
    if (ok) setRascunho(vazio);
  }

  async function excluir(imp: ImpressoraJson) {
    if (!window.confirm(`Excluir a impressora "${imp.nome}"?`)) return;
    await enviar(`/api/admin/financeiro/impressoras/${imp.id}`, "DELETE");
  }

  return (
    <>
      <form className={`${styles.cartao} ${styles.form}`} onSubmit={salvar} noValidate>
        <h2 className={styles.graficoTitulo}>{rascunho.id ? `Editar ${rascunho.nome || "impressora"}` : "Cadastrar impressora"}</h2>
        <div className={styles.linhaCampos}>
          <label className={styles.campo}>
            Nome
            <input
              value={rascunho.nome}
              onChange={(e) => setRascunho({ ...rascunho, nome: e.target.value })}
              placeholder="Ex.: Bambu A1"
              maxLength={80}
            />
            {erros.nome && <span className={styles.erroCampo}>{erros.nome}</span>}
          </label>
          <label className={styles.campo}>
            Data da compra
            <input type="date" value={rascunho.dataCompra} onChange={(e) => setRascunho({ ...rascunho, dataCompra: e.target.value })} />
            {erros.dataCompra && <span className={styles.erroCampo}>{erros.dataCompra}</span>}
          </label>
          <label className={styles.campo}>
            Quanto custou (R$)
            <input
              inputMode="decimal"
              value={rascunho.valor}
              onChange={(e) => setRascunho({ ...rascunho, valor: e.target.value })}
              placeholder="0,00"
            />
            <span className={styles.dicaCampo}>Com frete e acessórios da compra, se quiser.</span>
            {erros.valorCentavos && <span className={styles.erroCampo}>{erros.valorCentavos}</span>}
          </label>
          <label className={styles.campo}>
            Observação <span className={styles.dicaCampo}>opcional</span>
            <input
              value={rascunho.observacao}
              onChange={(e) => setRascunho({ ...rascunho, observacao: e.target.value })}
              maxLength={300}
            />
          </label>
        </div>
        {erroGeral && (
          <p className={styles.erroGeral} role="alert">
            {erroGeral}
          </p>
        )}
        <div className={styles.acoesForm}>
          {rascunho.id && (
            <button type="button" className={styles.botao} onClick={() => setRascunho(vazio)}>
              Cancelar edição
            </button>
          )}
          <button type="submit" className={styles.botaoPrimario} disabled={salvando}>
            {salvando ? "Salvando…" : rascunho.id ? "Salvar alterações" : "Cadastrar impressora"}
          </button>
        </div>
      </form>

      {impressoras.length === 0 ? (
        <p className={`${styles.cartao} ${styles.vazio}`}>Nenhuma impressora cadastrada.</p>
      ) : (
        <div className={`${styles.cartao} ${styles.rolagem}`}>
          <table className={styles.tabela}>
            <thead>
              <tr>
                <th>Impressora</th>
                <th>Compra</th>
                <th className={styles.num}>Valor</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {impressoras.map((imp) => (
                <tr key={imp.id}>
                  <td>
                    <strong>{imp.nome}</strong>
                    {imp.observacao && <div className={styles.dicaCampo}>{imp.observacao}</div>}
                  </td>
                  <td>{dataBr(imp.dataCompra)}</td>
                  <td className={styles.num}>{formatarPreco(imp.valorCentavos)}</td>
                  <td>
                    <div className={styles.acoesLinha}>
                      <button
                        type="button"
                        className={styles.botao}
                        onClick={() =>
                          setRascunho({
                            id: imp.id,
                            nome: imp.nome,
                            dataCompra: imp.dataCompra,
                            valor: centavosParaCampo(imp.valorCentavos),
                            observacao: imp.observacao ?? "",
                          })
                        }
                      >
                        Editar
                      </button>
                      <button type="button" className={styles.botaoPerigo} onClick={() => excluir(imp)}>
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={2}>
                  <strong>Total investido</strong>
                </td>
                <td className={styles.num}>
                  <strong>{formatarPreco(total)}</strong>
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
