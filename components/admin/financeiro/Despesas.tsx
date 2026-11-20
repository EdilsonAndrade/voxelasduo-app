"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { centavosParaCampo, reaisParaCentavos } from "@/lib/controleVendas/formato";
import {
  CATEGORIAS_DESPESA,
  ehInsumo,
  ROTULO_CATEGORIA_DESPESA,
  type CategoriaDespesa,
  type DespesaJson,
} from "@/lib/models/financeiro";
import { formatarPreco } from "@/lib/produtos/formato";
import styles from "./financeiro.module.css";

interface Rascunho {
  id?: string;
  data: string;
  categoria: CategoriaDespesa | "";
  descricao: string;
  valor: string;
  observacao: string;
}

const hoje = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
const vazio = (): Rascunho => ({ data: hoje(), categoria: "", descricao: "", valor: "", observacao: "" });
const dataBr = (dia: string) => dia.split("-").reverse().join("/");

export default function Despesas({ despesas }: { despesas: DespesaJson[] }) {
  const router = useRouter();
  const [rascunho, setRascunho] = useState<Rascunho>(vazio);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState("");
  const [salvando, setSalvando] = useState(false);

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
      rascunho.id ? `/api/admin/financeiro/despesas/${rascunho.id}` : "/api/admin/financeiro/despesas",
      rascunho.id ? "PUT" : "POST",
      {
        data: rascunho.data,
        categoria: rascunho.categoria,
        descricao: rascunho.descricao,
        valorCentavos: reaisParaCentavos(rascunho.valor),
        observacao: rascunho.observacao,
      }
    );
    setSalvando(false);
    if (ok) setRascunho(vazio());
  }

  async function excluir(d: DespesaJson) {
    if (!window.confirm(`Excluir o gasto "${d.descricao}"?`)) return;
    await enviar(`/api/admin/financeiro/despesas/${d.id}`, "DELETE");
  }

  const insumo = rascunho.categoria !== "" && ehInsumo(rascunho.categoria);

  return (
    <>
      <form className={`${styles.cartao} ${styles.form}`} onSubmit={salvar} noValidate>
        <h2 className={styles.graficoTitulo}>{rascunho.id ? "Editar gasto" : "Lançar gasto"}</h2>
        <p className={styles.dicaCampo}>
          Comprou filamento, embalagem ou outro insumo? Lance na aba <Link href="/admin/financeiro/insumos">Insumos</Link> — lá
          o gasto entra aqui sozinho e o custo por unidade fica pronto para a calculadora.
        </p>
        <div className={styles.linhaCampos}>
          <label className={styles.campo}>
            Data
            <input type="date" value={rascunho.data} onChange={(e) => setRascunho({ ...rascunho, data: e.target.value })} />
            {erros.data && <span className={styles.erroCampo}>{erros.data}</span>}
          </label>
          <label className={styles.campo}>
            Categoria
            <select
              value={rascunho.categoria}
              onChange={(e) => setRascunho({ ...rascunho, categoria: e.target.value as CategoriaDespesa })}
            >
              <option value="">Escolha…</option>
              <optgroup label="Insumos (já estão no custo da peça)">
                {CATEGORIAS_DESPESA.filter(ehInsumo).map((c) => (
                  <option key={c} value={c}>
                    {ROTULO_CATEGORIA_DESPESA[c]}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Despesas do negócio (descontam do lucro)">
                {CATEGORIAS_DESPESA.filter((c) => !ehInsumo(c)).map((c) => (
                  <option key={c} value={c}>
                    {ROTULO_CATEGORIA_DESPESA[c]}
                  </option>
                ))}
              </optgroup>
            </select>
            {rascunho.categoria !== "" && (
              <span className={styles.dicaCampo}>
                {insumo
                  ? "Só entra no “quanto já gastamos” — o lucro já desconta o insumo peça a peça."
                  : "Desconta do lucro do mês e do retorno das impressoras."}
              </span>
            )}
            {erros.categoria && <span className={styles.erroCampo}>{erros.categoria}</span>}
          </label>
          <label className={styles.campo}>
            O que foi
            <input
              value={rascunho.descricao}
              onChange={(e) => setRascunho({ ...rascunho, descricao: e.target.value })}
              placeholder={insumo ? "Ex.: 10 kg PLA Bambu" : "Ex.: DAS de novembro"}
              maxLength={200}
            />
            {erros.descricao && <span className={styles.erroCampo}>{erros.descricao}</span>}
          </label>
          <label className={styles.campo}>
            Valor (R$)
            <input
              inputMode="decimal"
              value={rascunho.valor}
              onChange={(e) => setRascunho({ ...rascunho, valor: e.target.value })}
              placeholder="0,00"
            />
            <span className={styles.dicaCampo}>Com frete da compra, se tiver.</span>
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
            <button type="button" className={styles.botao} onClick={() => setRascunho(vazio())}>
              Cancelar edição
            </button>
          )}
          <button type="submit" className={styles.botaoPrimario} disabled={salvando}>
            {salvando ? "Salvando…" : rascunho.id ? "Salvar alterações" : "Lançar gasto"}
          </button>
        </div>
      </form>

      {despesas.length === 0 ? (
        <p className={`${styles.cartao} ${styles.vazio}`}>Nenhum gasto lançado. Comece pelo filamento e pelas embalagens já compradas.</p>
      ) : (
        <div className={`${styles.cartao} ${styles.rolagem}`}>
          <table className={styles.tabela}>
            <thead>
              <tr>
                <th>Data</th>
                <th>Gasto</th>
                <th>Categoria</th>
                <th className={styles.num}>Valor</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {despesas.map((d) => (
                <tr key={d.id}>
                  <td>{dataBr(d.data)}</td>
                  <td>
                    <strong>{d.descricao}</strong>
                    {d.observacao && <div className={styles.dicaCampo}>{d.observacao}</div>}
                  </td>
                  <td>
                    <span className={styles.selo}>{ROTULO_CATEGORIA_DESPESA[d.categoria]}</span>
                    <div className={styles.dicaCampo}>
                      {d.insumoId ? "compra de insumo do catálogo" : ehInsumo(d.categoria) ? "insumo" : "desconta do lucro"}
                    </div>
                  </td>
                  <td className={styles.num}>{formatarPreco(d.valorCentavos)}</td>
                  <td>
                    <div className={styles.acoesLinha}>
                      {d.insumoId ? (
                        <Link href="/admin/financeiro/insumos" className={styles.botao}>
                          Ver no catálogo
                        </Link>
                      ) : (
                      <button
                        type="button"
                        className={styles.botao}
                        onClick={() => {
                          setErros({});
                          setRascunho({
                            id: d.id,
                            data: d.data,
                            categoria: d.categoria,
                            descricao: d.descricao,
                            valor: centavosParaCampo(d.valorCentavos),
                            observacao: d.observacao ?? "",
                          });
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        Editar
                      </button>
                      )}
                      <button type="button" className={styles.botaoPerigo} onClick={() => excluir(d)}>
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
