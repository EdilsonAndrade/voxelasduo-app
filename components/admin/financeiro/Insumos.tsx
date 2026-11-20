"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { centavosParaCampo, hojeIso, reaisParaCentavos } from "@/lib/controleVendas/formato";
import {
  custoUnitarioCentavos,
  equivalenciaMil,
  formatarCustoUnitario,
  rotuloCompra,
  rotuloCustoUnitario,
} from "@/lib/financeiro/insumos";
import { ROTULO_CATEGORIA_DESPESA } from "@/lib/models/financeiro";
import {
  CATEGORIAS_INSUMO_CADASTRO,
  LIMITES_INSUMO,
  ROTULO_UNIDADE,
  UNIDADES_INSUMO,
  type CategoriaInsumo,
  type InsumoJson,
  type UnidadeInsumo,
} from "@/lib/models/insumo";
import { formatarPreco } from "@/lib/produtos/formato";
import styles from "./financeiro.module.css";

interface Rascunho {
  id?: string;
  /** "compra" = recompra de um insumo que já existe (só quantidade, valor e data). */
  modo: "cadastro" | "compra";
  nome: string;
  marca: string;
  categoria: CategoriaInsumo | "";
  unidade: UnidadeInsumo;
  quantidade: string;
  valor: string;
  data: string;
  observacao: string;
}

const vazio = (): Rascunho => ({
  modo: "cadastro",
  nome: "",
  marca: "",
  categoria: "",
  unidade: "unidade",
  quantidade: "",
  valor: "",
  data: hojeIso(),
  observacao: "",
});

const dataBr = (dia: string) => dia.split("-").reverse().join("/");

/** Só dígitos e uma vírgula decimal — o ponto digitado vira vírgula. */
function soQuantidade(valor: string): string {
  const trocado = valor.replace(/\./g, ",").replace(/[^\d,]/g, "");
  const [inteiro, ...resto] = trocado.split(",");
  return resto.length > 0 ? `${inteiro},${resto.join("").slice(0, 3)}` : inteiro;
}

function paraQuantidade(valor: string): number | null {
  if (valor.trim() === "") return null;
  const numero = Number(valor.replace(",", "."));
  return Number.isFinite(numero) && numero > 0 ? numero : null;
}

export default function Insumos({ insumos }: { insumos: InsumoJson[] }) {
  const router = useRouter();
  const [rascunho, setRascunho] = useState<Rascunho>(vazio);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState("");
  const [salvando, setSalvando] = useState(false);

  const quantidade = paraQuantidade(rascunho.quantidade);
  const valorCentavos = reaisParaCentavos(rascunho.valor);
  const custo = quantidade && valorCentavos ? custoUnitarioCentavos(quantidade, valorCentavos) : null;
  const equivalencia = custo === null ? null : equivalenciaMil(rascunho.unidade, custo);
  const editando = Boolean(rascunho.id);
  const recompra = rascunho.modo === "compra";

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
    const compra = {
      data: rascunho.data,
      quantidade: quantidade ?? 0,
      valorTotalCentavos: valorCentavos ?? 0,
      observacao: rascunho.observacao,
    };
    const ok = recompra
      ? await enviar(`/api/admin/financeiro/insumos/${rascunho.id}/compras`, "POST", compra)
      : await enviar(
          rascunho.id ? `/api/admin/financeiro/insumos/${rascunho.id}` : "/api/admin/financeiro/insumos",
          rascunho.id ? "PUT" : "POST",
          {
            nome: rascunho.nome,
            marca: rascunho.marca,
            categoria: rascunho.categoria,
            unidade: rascunho.unidade,
            ...compra,
          }
        );
    setSalvando(false);
    if (ok) setRascunho(vazio());
  }

  async function excluir(insumo: InsumoJson) {
    if (!window.confirm(`Tirar "${insumo.nome}" do catálogo? As compras já lançadas continuam nas despesas.`)) return;
    const ok = await enviar(`/api/admin/financeiro/insumos/${insumo.id}`, "DELETE");
    if (ok && rascunho.id === insumo.id) setRascunho(vazio());
  }

  function abrir(insumo: InsumoJson, modo: Rascunho["modo"]) {
    setErros({});
    setErroGeral("");
    setRascunho({
      id: insumo.id,
      modo,
      nome: insumo.nome,
      marca: insumo.marca ?? "",
      categoria: insumo.categoria,
      unidade: insumo.unidade,
      quantidade: modo === "compra" ? "" : String(insumo.quantidade).replace(".", ","),
      valor: modo === "compra" ? "" : centavosParaCampo(insumo.valorTotalCentavos),
      data: modo === "compra" ? hojeIso() : insumo.ultimaCompraEm,
      observacao: modo === "compra" ? "" : (insumo.observacao ?? ""),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const unidade = ROTULO_UNIDADE[rascunho.unidade];

  return (
    <>
      <form className={`${styles.cartao} ${styles.form}`} onSubmit={salvar} noValidate>
        <h2 className={styles.graficoTitulo}>
          {recompra ? `Nova compra de ${rascunho.nome}` : editando ? `Editar ${rascunho.nome}` : "Cadastrar insumo"}
        </h2>
        <p className={styles.dicaCampo}>
          {recompra
            ? "O custo por unidade passa a ser o desta compra e o gasto entra nas despesas."
            : "Diga o que veio na compra e quanto você pagou — o custo por unidade sai daí e a compra é lançada nas despesas."}
        </p>

        {!recompra && (
          <div className={styles.linhaCampos}>
            <label className={styles.campo}>
              Insumo
              <input
                value={rascunho.nome}
                onChange={(e) => setRascunho({ ...rascunho, nome: e.target.value })}
                placeholder="Ex.: Argola de chaveiro 25 mm"
                maxLength={LIMITES_INSUMO.nomeMax}
              />
              {erros.nome && <span className={styles.erroCampo}>{erros.nome}</span>}
            </label>
            <label className={styles.campo}>
              Marca <span className={styles.dicaCampo}>opcional</span>
              <input
                value={rascunho.marca}
                onChange={(e) => setRascunho({ ...rascunho, marca: e.target.value })}
                placeholder="Ex.: Bambu Lab"
                maxLength={LIMITES_INSUMO.marcaMax}
              />
              {erros.marca && <span className={styles.erroCampo}>{erros.marca}</span>}
            </label>
            <label className={styles.campo}>
              Categoria
              <select
                value={rascunho.categoria}
                onChange={(e) => setRascunho({ ...rascunho, categoria: e.target.value as CategoriaInsumo })}
              >
                <option value="">Escolha…</option>
                {CATEGORIAS_INSUMO_CADASTRO.map((c) => (
                  <option key={c} value={c}>
                    {ROTULO_CATEGORIA_DESPESA[c]}
                  </option>
                ))}
              </select>
              <span className={styles.dicaCampo}>
                {rascunho.categoria === "filamento"
                  ? "Filamento não entra no dropdown da calculadora — lá o preço do kg é digitado."
                  : "Embalagem e outros insumos aparecem na calculadora, em Custos extras."}
              </span>
              {erros.categoria && <span className={styles.erroCampo}>{erros.categoria}</span>}
            </label>
            <label className={styles.campo}>
              Medida
              <select
                value={rascunho.unidade}
                onChange={(e) => setRascunho({ ...rascunho, unidade: e.target.value as UnidadeInsumo })}
              >
                {UNIDADES_INSUMO.map((u) => (
                  <option key={u} value={u}>
                    {ROTULO_UNIDADE[u].opcao}
                  </option>
                ))}
              </select>
              <span className={styles.dicaCampo}>O custo sai {unidade.custo}.</span>
              {erros.unidade && <span className={styles.erroCampo}>{erros.unidade}</span>}
            </label>
          </div>
        )}

        <div className={styles.linhaCampos}>
          <label className={styles.campo}>
            Data da compra
            <input type="date" value={rascunho.data} onChange={(e) => setRascunho({ ...rascunho, data: e.target.value })} />
            {erros.data && <span className={styles.erroCampo}>{erros.data}</span>}
          </label>
          <label className={styles.campo}>
            {unidade.quantidade}
            <input
              inputMode="decimal"
              value={rascunho.quantidade}
              onChange={(e) => setRascunho({ ...rascunho, quantidade: soQuantidade(e.target.value) })}
              placeholder="0"
            />
            <span className={styles.dicaCampo}>{unidade.dica}</span>
            {erros.quantidade && <span className={styles.erroCampo}>{erros.quantidade}</span>}
          </label>
          <label className={styles.campo}>
            Quanto pagou (R$)
            <input
              inputMode="decimal"
              value={rascunho.valor}
              onChange={(e) => setRascunho({ ...rascunho, valor: e.target.value })}
              placeholder="0,00"
            />
            <span className={styles.dicaCampo}>Com o frete da compra, se tiver.</span>
            {erros.valorTotalCentavos && <span className={styles.erroCampo}>{erros.valorTotalCentavos}</span>}
          </label>
          <label className={styles.campo}>
            Observação <span className={styles.dicaCampo}>opcional</span>
            <input
              value={rascunho.observacao}
              onChange={(e) => setRascunho({ ...rascunho, observacao: e.target.value })}
              maxLength={LIMITES_INSUMO.observacaoMax}
              placeholder="Ex.: comprado no Mercado Livre"
            />
            {erros.observacao && <span className={styles.erroCampo}>{erros.observacao}</span>}
          </label>
        </div>

        <div className={styles.previaCusto}>
          {custo === null ? (
            <span className={styles.dicaCampo}>Preencha a quantidade e o valor para ver o custo {unidade.custo}.</span>
          ) : (
            <>
              <strong className={styles.previaValor}>{formatarCustoUnitario(custo)}</strong>
              <span>{unidade.custo}</span>
              {equivalencia && <span className={styles.dicaCampo}>= {equivalencia}</span>}
            </>
          )}
        </div>

        {erroGeral && (
          <p className={styles.erroGeral} role="alert">
            {erroGeral}
          </p>
        )}
        <div className={styles.acoesForm}>
          {(editando || recompra) && (
            <button type="button" className={styles.botao} onClick={() => setRascunho(vazio())}>
              Cancelar
            </button>
          )}
          <button type="submit" className={styles.botaoPrimario} disabled={salvando}>
            {salvando ? "Salvando…" : recompra ? "Lançar compra" : editando ? "Salvar alterações" : "Cadastrar insumo"}
          </button>
        </div>
      </form>

      {insumos.length === 0 ? (
        <p className={`${styles.cartao} ${styles.vazio}`}>
          Nenhum insumo cadastrado. Comece pelo filamento e pelas argolas, caixas e saquinhos que já estão na prateleira.
        </p>
      ) : (
        <div className={`${styles.cartao} ${styles.rolagem}`}>
          <table className={styles.tabela}>
            <thead>
              <tr>
                <th>Insumo</th>
                <th>Categoria</th>
                <th>Última compra</th>
                <th className={styles.num}>Custo</th>
                <th className={styles.num}>Já gastamos</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {insumos.map((i) => {
                const equivale = equivalenciaMil(i.unidade, i.custoUnitarioCentavos);
                return (
                  <tr key={i.id}>
                    <td>
                      <strong>{i.nome}</strong>
                      {i.marca && <div className={styles.dicaCampo}>{i.marca}</div>}
                      {i.observacao && <div className={styles.dicaCampo}>{i.observacao}</div>}
                    </td>
                    <td>
                      <span className={styles.selo}>{ROTULO_CATEGORIA_DESPESA[i.categoria]}</span>
                      <div className={styles.dicaCampo}>
                        {i.categoria === "filamento" ? "fora da calculadora" : "aparece na calculadora"}
                      </div>
                    </td>
                    <td>
                      {dataBr(i.ultimaCompraEm)}
                      <div className={styles.dicaCampo}>{rotuloCompra(i.unidade, i.quantidade, i.valorTotalCentavos)}</div>
                    </td>
                    <td className={styles.num}>
                      <strong className={styles.custoDestaque}>{formatarCustoUnitario(i.custoUnitarioCentavos)}</strong>
                      <div className={styles.dicaCampo}>{ROTULO_UNIDADE[i.unidade].custo}</div>
                      {equivale && <div className={styles.dicaCampo}>{equivale}</div>}
                    </td>
                    <td className={styles.num}>
                      {formatarPreco(i.totalGastoCentavos)}
                      <div className={styles.dicaCampo}>
                        {i.compras} {i.compras === 1 ? "compra" : "compras"}
                      </div>
                    </td>
                    <td>
                      <div className={styles.acoesLinha}>
                        <button type="button" className={styles.botaoPrimario} onClick={() => abrir(i, "compra")}>
                          Nova compra
                        </button>
                        <button type="button" className={styles.botao} onClick={() => abrir(i, "cadastro")}>
                          Editar
                        </button>
                        <button type="button" className={styles.botaoPerigo} onClick={() => excluir(i)}>
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className={styles.dicaCampo}>
            O custo por unidade é sempre o da última compra: recomprar mais caro atualiza o preço de quem ainda não foi
            calculado. Cálculos já salvos guardam o preço do dia — a calculadora avisa quando mudou.
          </p>
        </div>
      )}
    </>
  );
}
