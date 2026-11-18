"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import SelectBusca from "@/components/admin/SelectBusca";
import { centavosParaCampo, reaisParaCentavos } from "@/lib/controleVendas/formato";
import type { OpcaoVenda } from "@/lib/financeiro/catalogo";
import { diaDe } from "@/lib/financeiro/datas";
import {
  MEIOS_PAGAMENTO,
  ROTULO_MEIO_PAGAMENTO,
  type LancamentoVendaJson,
  type MeioPagamento,
} from "@/lib/models/financeiro";
import { formatarPreco } from "@/lib/produtos/formato";
import styles from "./financeiro.module.css";

type OrigemLinha = "catalogo" | "avulso";

interface Linha {
  uid: string;
  origem: OrigemLinha;
  /** Valor do catálogo escolhido (vazio = ainda não escolheu). */
  valor: string;
  /** Item salvo que não está mais no catálogo (ex.: cálculo ainda incompleto). */
  salvo?: { origem: "produto" | "calculo"; produtoId?: string; variacaoId?: string; calculoId?: string };
  nome: string;
  quantidade: string;
  preco: string;
  custo: string;
  levarParaCalculadora: boolean;
}

let contador = 0;
const novoUid = () => `l${(contador += 1)}`;

function linhaVazia(): Linha {
  return { uid: novoUid(), origem: "catalogo", valor: "", nome: "", quantidade: "1", preco: "", custo: "", levarParaCalculadora: false };
}

function linhasDe(inicial: LancamentoVendaJson | undefined, catalogo: Map<string, OpcaoVenda>): Linha[] {
  if (!inicial) return [linhaVazia()];
  return inicial.itens.map((item) => {
    const valor =
      item.origem === "produto"
        ? `produto:${item.produtoId}:${item.variacaoId ?? ""}`
        : item.origem === "calculo"
          ? `calculo:${item.calculoId}`
          : "";
    const base = {
      uid: novoUid(),
      nome: item.nome,
      quantidade: String(item.quantidade),
      preco: centavosParaCampo(item.precoUnitarioCentavos),
      custo: centavosParaCampo(item.custoUnitarioCentavos),
      levarParaCalculadora: false,
    };
    if (item.origem === "avulso") return { ...base, origem: "avulso", valor: "" };
    return {
      ...base,
      origem: "catalogo",
      valor,
      ...(catalogo.has(valor)
        ? {}
        : { salvo: { origem: item.origem, produtoId: item.produtoId, variacaoId: item.variacaoId, calculoId: item.calculoId } }),
    };
  });
}

/** Taxa sugerida para o meio: só o link avulso tem taxa conhecida (a do Mercado Pago cadastrada). */
function taxaSugerida(meio: MeioPagamento, totalCentavos: number, taxaSite: { percentual: number; fixaCentavos: number }): number {
  if (meio !== "link" || totalCentavos === 0) return 0;
  return Math.round((totalCentavos * taxaSite.percentual) / 100) + taxaSite.fixaCentavos;
}

export default function FormularioVenda({
  catalogo,
  taxaSite,
  inicial,
}: {
  catalogo: OpcaoVenda[];
  taxaSite: { percentual: number; fixaCentavos: number };
  inicial?: LancamentoVendaJson;
}) {
  const router = useRouter();
  const porValor = useMemo(() => new Map(catalogo.map((o) => [o.valor, o])), [catalogo]);
  const opcoes = useMemo(
    () =>
      catalogo.map((o) => ({
        valor: o.valor,
        rotulo: `${o.nome}${o.origem === "calculo" ? " (só na calculadora)" : ""} · ${formatarPreco(o.precoCentavos)}`,
      })),
    [catalogo]
  );

  const [data, setData] = useState(inicial?.data ?? diaDe(new Date()));
  const [meio, setMeio] = useState<MeioPagamento | "">(inicial?.meio ?? "");
  const [cliente, setCliente] = useState(inicial?.cliente ?? "");
  const [observacao, setObservacao] = useState(inicial?.observacao ?? "");
  const [linhas, setLinhas] = useState<Linha[]>(() => linhasDe(inicial, porValor));
  const [taxa, setTaxa] = useState(inicial ? centavosParaCampo(inicial.taxaCentavos) : "");
  const [taxaEditada, setTaxaEditada] = useState(Boolean(inicial));
  const [taxaPercentual, setTaxaPercentual] = useState("");
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState("");
  const [salvando, setSalvando] = useState(false);

  const total = linhas.reduce((s, l) => s + (reaisParaCentavos(l.preco) ?? 0) * (Number(l.quantidade) || 0), 0);
  const custoTotal = linhas.reduce((s, l) => s + (reaisParaCentavos(l.custo) ?? 0) * (Number(l.quantidade) || 0), 0);
  const taxaCentavos = taxaEditada ? (reaisParaCentavos(taxa) ?? 0) : meio ? taxaSugerida(meio, total, taxaSite) : 0;
  const lucro = total - taxaCentavos - custoTotal;

  function mudar(uid: string, parcial: Partial<Linha>) {
    setLinhas((atual) => atual.map((l) => (l.uid === uid ? { ...l, ...parcial } : l)));
  }

  function escolher(uid: string, valor: string) {
    const opcao = porValor.get(valor);
    if (!opcao) return;
    mudar(uid, {
      valor,
      salvo: undefined,
      nome: opcao.nome,
      preco: centavosParaCampo(opcao.precoCentavos),
      custo: centavosParaCampo(opcao.custoCentavos),
    });
  }

  function trocarOrigem(uid: string, origem: OrigemLinha) {
    mudar(uid, { origem, valor: "", salvo: undefined, nome: "", preco: "", custo: "", levarParaCalculadora: false });
  }

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault();
    setErroGeral("");
    const locais: Record<string, string> = {};
    if (!meio) locais.meio = "Escolha como a venda foi paga.";
    linhas.forEach((l, i) => {
      if (l.origem === "catalogo" && !l.valor && !l.salvo) locais[`itens[${i}].nome`] = "Escolha o produto.";
      if (reaisParaCentavos(l.custo) === null && l.custo.trim() !== "") locais[`itens[${i}].custoUnitarioCentavos`] = "Custo inválido.";
    });
    if (Object.keys(locais).length > 0) {
      setErros(locais);
      return;
    }

    const itens = linhas.map((l) => {
      const comuns = {
        nome: l.nome.trim(),
        quantidade: Number(l.quantidade),
        precoUnitarioCentavos: reaisParaCentavos(l.preco) ?? 0,
        custoUnitarioCentavos: l.custo.trim() === "" ? null : reaisParaCentavos(l.custo),
      };
      if (l.origem === "avulso") return { origem: "avulso", ...comuns, levarParaCalculadora: l.levarParaCalculadora };
      const opcao = porValor.get(l.valor);
      const ref = opcao ?? l.salvo!;
      return ref.origem === "calculo"
        ? { origem: "calculo", calculoId: ref.calculoId, ...comuns }
        : { origem: "produto", produtoId: ref.produtoId, variacaoId: ref.variacaoId, ...comuns };
    });

    setSalvando(true);
    try {
      const resposta = await fetch(inicial ? `/api/admin/financeiro/vendas/${inicial.id}` : "/api/admin/financeiro/vendas", {
        method: inicial ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, meio, cliente, observacao, taxaCentavos, itens }),
      });
      const corpo = (await resposta.json().catch(() => ({}))) as { erro?: string; campos?: Record<string, string> };
      if (!resposta.ok) {
        setErros(corpo.campos ?? {});
        setErroGeral(`${corpo.erro ?? "Não foi possível salvar a venda."} (erro ${resposta.status})`);
        return;
      }
      router.push("/admin/financeiro/vendas");
      router.refresh();
    } catch {
      setErroGeral("Sem conexão com o servidor. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={salvar} noValidate>
      <div className={styles.linhaCampos}>
        <label className={styles.campo}>
          Data da venda
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
          {erros.data && <span className={styles.erroCampo}>{erros.data}</span>}
        </label>
        <label className={styles.campo}>
          Cliente <span className={styles.dicaCampo}>opcional</span>
          <input value={cliente} onChange={(e) => setCliente(e.target.value)} maxLength={200} placeholder="Para quem foi" />
        </label>
      </div>

      <fieldset className={styles.meios}>
        <legend>Como foi pago?</legend>
        {MEIOS_PAGAMENTO.map((m) => (
          <label key={m} className={styles.meio}>
            <input type="radio" name="meio" value={m} checked={meio === m} onChange={() => setMeio(m)} />
            <span>{ROTULO_MEIO_PAGAMENTO[m]}</span>
          </label>
        ))}
      </fieldset>
      {erros.meio && <span className={styles.erroCampo}>{erros.meio}</span>}
      <p className={styles.dicaCampo}>
        Pedidos do site e dos links de pagamento gerados aqui no painel já entram sozinhos no financeiro — não lance de novo.
      </p>

      {linhas.map((l, i) => {
        const opcao = porValor.get(l.valor);
        const erroNome = erros[`itens[${i}].nome`] ?? erros[`itens[${i}].produtoId`] ?? erros[`itens[${i}].calculoId`];
        return (
          <div key={l.uid} className={styles.item}>
            <div className={styles.itemCabeca}>
              <div className={styles.origemItem} role="group" aria-label="De onde vem o produto">
                <button type="button" aria-pressed={l.origem === "catalogo"} onClick={() => trocarOrigem(l.uid, "catalogo")}>
                  Produto ou calculadora
                </button>
                <button type="button" aria-pressed={l.origem === "avulso"} onClick={() => trocarOrigem(l.uid, "avulso")}>
                  Digitar outro
                </button>
              </div>
              {linhas.length > 1 && (
                <button
                  type="button"
                  className={styles.botaoPerigo}
                  onClick={() => setLinhas((atual) => atual.filter((x) => x.uid !== l.uid))}
                >
                  Remover
                </button>
              )}
            </div>

            <div className={styles.itemCampos}>
              <div className={styles.campo}>
                {l.origem === "catalogo" ? (
                  <>
                    <span>Produto</span>
                    {l.salvo ? (
                      <span>
                        {l.nome}{" "}
                        <span className={styles.selo}>{l.salvo.origem === "calculo" ? "na calculadora" : "produto removido"}</span>
                      </span>
                    ) : (
                      <SelectBusca
                        opcoes={opcoes}
                        valor={l.valor}
                        onChange={(valor) => escolher(l.uid, valor)}
                        placeholder="Escolha o produto, kit ou cálculo"
                        rotuloAcessivel="Produto"
                      />
                    )}
                    {opcao && opcao.custoCentavos === null && (
                      <span className={styles.dicaCampo}>Sem custo cadastrado — informe o custo ao lado se souber.</span>
                    )}
                  </>
                ) : (
                  <label className={styles.campo}>
                    Nome do produto
                    <input value={l.nome} onChange={(e) => mudar(l.uid, { nome: e.target.value })} maxLength={200} />
                  </label>
                )}
                {erroNome && <span className={styles.erroCampo}>{erroNome}</span>}
              </div>
              <label className={styles.campo}>
                Qtd.
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={l.quantidade}
                  onChange={(e) => mudar(l.uid, { quantidade: e.target.value })}
                />
                {erros[`itens[${i}].quantidade`] && <span className={styles.erroCampo}>{erros[`itens[${i}].quantidade`]}</span>}
              </label>
              <label className={styles.campo}>
                Preço un. (R$)
                <input inputMode="decimal" value={l.preco} onChange={(e) => mudar(l.uid, { preco: e.target.value })} placeholder="0,00" />
                {erros[`itens[${i}].precoUnitarioCentavos`] && (
                  <span className={styles.erroCampo}>{erros[`itens[${i}].precoUnitarioCentavos`]}</span>
                )}
              </label>
              <label className={styles.campo}>
                Custo un. (R$)
                <input inputMode="decimal" value={l.custo} onChange={(e) => mudar(l.uid, { custo: e.target.value })} placeholder="não sei" />
                {erros[`itens[${i}].custoUnitarioCentavos`] && (
                  <span className={styles.erroCampo}>{erros[`itens[${i}].custoUnitarioCentavos`]}</span>
                )}
              </label>
            </div>

            {l.origem === "avulso" && (
              <label className={styles.checkCalculadora}>
                <input
                  type="checkbox"
                  checked={l.levarParaCalculadora}
                  onChange={(e) => mudar(l.uid, { levarParaCalculadora: e.target.checked })}
                />
                <span>
                  Levar para a calculadora — cria um cálculo com este nome e o preço como alvo, para precificar nos outros canais e
                  decidir lá se vira produto.
                </span>
              </label>
            )}
          </div>
        );
      })}

      <div>
        <button type="button" className={styles.botao} onClick={() => setLinhas((atual) => [...atual, linhaVazia()])}>
          + Outro produto
        </button>
        {erros.itens && <span className={styles.erroCampo}> {erros.itens}</span>}
      </div>

      <div className={styles.linhaCampos}>
        <label className={styles.campo}>
          Taxa do pagamento (R$)
          <input
            inputMode="decimal"
            value={taxaEditada ? taxa : centavosParaCampo(taxaCentavos)}
            onChange={(e) => {
              setTaxaEditada(true);
              setTaxa(e.target.value);
              setTaxaPercentual("");
            }}
            placeholder="0,00"
          />
          <span className={styles.dicaCampo}>
            {meio === "link" && !taxaEditada
              ? `Sugerida pela taxa do site (${taxaSite.percentual.toLocaleString("pt-BR")}%).`
              : "O que a maquininha ou o banco descontou. Pix e dinheiro: deixe 0."}
          </span>
          {erros.taxaCentavos && <span className={styles.erroCampo}>{erros.taxaCentavos}</span>}
        </label>
        <label className={styles.campo}>
          ou em % do vendido
          <input
            inputMode="decimal"
            value={taxaPercentual !== "" ? taxaPercentual : total > 0 ? ((taxaCentavos / total) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : ""}
            onChange={(e) => {
              const texto = e.target.value;
              setTaxaPercentual(texto);
              setTaxaEditada(true);
              const pct = Number(texto.replace(",", "."));
              setTaxa(Number.isFinite(pct) ? centavosParaCampo(Math.round((total * pct) / 100)) : "");
            }}
            placeholder="0"
          />
          <span className={styles.dicaCampo}>Preenche o valor em R$ pelo total vendido.</span>
        </label>
        <label className={styles.campo}>
          Observação <span className={styles.dicaCampo}>opcional</span>
          <input value={observacao} onChange={(e) => setObservacao(e.target.value)} maxLength={500} />
        </label>
      </div>

      <div className={styles.resumoVenda}>
        <span>Vendido {formatarPreco(total)}</span>
        <span>Taxa {formatarPreco(taxaCentavos)}</span>
        <span>Custo {formatarPreco(custoTotal)}</span>
        <span>
          {lucro < 0 ? "Prejuízo" : "Lucro"} <strong className={lucro < 0 ? styles.negativo : ""}>{formatarPreco(lucro)}</strong>
        </span>
      </div>

      {erroGeral && (
        <p className={styles.erroGeral} role="alert">
          {erroGeral}
        </p>
      )}
      <div className={styles.acoesForm}>
        <Link href="/admin/financeiro/vendas" className={styles.botao}>
          Cancelar
        </Link>
        <button type="submit" className={styles.botaoPrimario} disabled={salvando}>
          {salvando ? "Salvando…" : inicial ? "Salvar alterações" : "Lançar venda"}
        </button>
      </div>
    </form>
  );
}
