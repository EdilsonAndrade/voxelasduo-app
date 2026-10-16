"use client";

import { useRef, useState } from "react";
import styles from "../admin.module.css";
import calc from "../calculadoraRapida.module.css";
import type { FilamentoCalculadora, ImpressaoCalculadora, ImpressoraReferencia } from "@/lib/models/calculoPreco";
import { separarHoras } from "@/lib/produtos/calculadoraValores";
import type { MesaLida } from "@/lib/produtos/gcode";
import { IMPRESSORAS, impressoraPorId } from "@/lib/produtos/impressoras";
import { lerGcode } from "@/lib/produtos/lerGcode";
import { Campo, Divisor } from "./campos";
import Secao from "./Secao";
import { soNumero } from "./formato";

type Alterar = (parcial: Partial<ImpressaoCalculadora>) => void;

function duracao(segundos: number): string {
  const h = Math.floor(segundos / 3600);
  const m = Math.round((segundos % 3600) / 60);
  return h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m} min`;
}

function gramas(n: number): string {
  return `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} g`;
}

const COR_HEX = /^#[0-9a-f]{6}$/i;

export default function SecaoImpressao({
  impressao,
  alterar,
  resumo,
}: {
  impressao: ImpressaoCalculadora;
  alterar: Alterar;
  resumo?: string;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [lendo, setLendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [lido, setLido] = useState<{ arquivo: string; mesas: MesaLida[]; escolhida: number } | null>(null);
  const [arrastando, setArrastando] = useState(false);

  const usaLista = impressao.filamentos.length > 0;
  const campo = (chave: keyof ImpressaoCalculadora) => (valor: string) => alterar({ [chave]: valor });

  function aplicarMesa(mesa: MesaLida) {
    const parcial: Partial<ImpressaoCalculadora> = { ...separarHoras(mesa.segundos / 3600) };
    if (mesa.objetos !== null) parcial.pecasPorMesa = String(mesa.objetos);
    if (mesa.filamentos.length > 1) {
      parcial.filamentos = mesa.filamentos.map((f) => ({
        nome: f.tipo,
        cor: f.cor,
        pesoGramas: String(f.pesoGramas),
        precoKgReais: impressao.precoKgReais,
      }));
    } else {
      parcial.filamentos = [];
      parcial.pesoGramas = String(mesa.filamentos[0]?.pesoGramas ?? mesa.pesoGramas);
    }
    alterar(parcial);
  }

  async function carregar(arquivo: File | undefined) {
    if (!arquivo) return;
    setLendo(true);
    setErro(null);
    try {
      const mesas = await lerGcode(arquivo);
      setLido({ arquivo: arquivo.name, mesas, escolhida: 0 });
      aplicarMesa(mesas[0]);
    } catch (e) {
      setLido(null);
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setLendo(false);
      if (entrada.current) entrada.current.value = "";
    }
  }

  function alterarFilamento(indice: number, chave: keyof FilamentoCalculadora, valor: string) {
    alterar({ filamentos: impressao.filamentos.map((f, i) => (i === indice ? { ...f, [chave]: valor } : f)) });
  }

  function adicionarFilamento() {
    // A primeira linha herda o que estava no campo simples, para não perder o que foi digitado.
    const primeira = impressao.filamentos.length === 0 && impressao.pesoGramas.trim() !== "";
    const novas: FilamentoCalculadora[] = primeira
      ? [
          { nome: "", cor: "", pesoGramas: impressao.pesoGramas, precoKgReais: impressao.precoKgReais },
          { nome: "", cor: "", pesoGramas: "", precoKgReais: impressao.precoKgReais },
        ]
      : [{ nome: "", cor: "", pesoGramas: "", precoKgReais: impressao.precoKgReais }];
    alterar({ filamentos: [...impressao.filamentos, ...novas] });
  }

  const mesaAtual = lido ? lido.mesas[lido.escolhida] : null;

  return (
    <Secao icone="impressao" titulo="Impressão" resumo={resumo} aberta>
      <Divisor>Preencha com o G-code</Divisor>
      <div
        className={`${calc.dropzone} ${arrastando ? calc.dropzoneAtiva : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          carregar(e.dataTransfer.files[0]);
        }}
      >
        <div>
          <strong>{lendo ? "Lendo o arquivo…" : "Carregue o G-code para preencher tempo e peso"}</strong>
          <span>Arraste aqui ou escolha · .gcode ou .gcode.3mf do Bambu Studio · o arquivo não sai do seu computador</span>
        </div>
        <button type="button" className={styles.btnGhost} disabled={lendo} onClick={() => entrada.current?.click()}>
          Escolher arquivo
        </button>
        <input
          ref={entrada}
          type="file"
          accept=".gcode,.3mf"
          hidden
          onChange={(e) => carregar(e.target.files?.[0])}
        />
      </div>
      {erro && <span className={styles.fieldError}>{erro}</span>}
      {lido && mesaAtual && (
        <div className={calc.gcodeLido}>
          <span>
            <strong>{lido.arquivo}</strong>: {duracao(mesaAtual.segundos)} · {gramas(mesaAtual.pesoGramas)}
            {mesaAtual.objetos !== null && ` · ${mesaAtual.objetos} ${mesaAtual.objetos === 1 ? "peça" : "peças"} na mesa`}
            {mesaAtual.filamentos.length > 1 && ` · ${mesaAtual.filamentos.length} filamentos`}
          </span>
          {lido.mesas.length > 1 && (
            <label>
              Mesa{" "}
              <select
                value={lido.escolhida}
                onChange={(e) => {
                  const escolhida = Number(e.target.value);
                  setLido({ ...lido, escolhida });
                  aplicarMesa(lido.mesas[escolhida]);
                }}
              >
                {lido.mesas.map((m, i) => (
                  <option key={m.indice} value={i}>
                    {m.indice} — {duracao(m.segundos)}, {gramas(m.pesoGramas)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      <Divisor>Impressora</Divisor>
      <div className={calc.campos3}>
        <div className={styles.field}>
          <label htmlFor="impressora">Modelo da impressora</label>
          <select
            id="impressora"
            value={impressao.impressora}
            onChange={(e) => {
              const id = e.target.value as ImpressoraReferencia;
              const consumo = impressoraPorId(id).consumoKwh;
              alterar({ impressora: id, ...(consumo ? { consumoKwh: consumo } : {}) });
            }}
          >
            {IMPRESSORAS.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
          </select>
        </div>
        <Campo
          id="consumo"
          rotulo="Consumo"
          unidade="kWh/h"
          valor={impressao.consumoKwh}
          onChange={campo("consumoKwh")}
          dica={impressao.impressora !== "outra" ? `Referência da ${impressoraPorId(impressao.impressora).nome}. Edite se souber o real.` : undefined}
        />
        <Campo id="energia" rotulo="Energia" prefixo="R$" unidade="/kWh" valor={impressao.tarifaEnergiaReais} onChange={campo("tarifaEnergiaReais")} />
        <Campo
          id="precoImpressora"
          rotulo="Preço da impressora"
          prefixo="R$"
          valor={impressao.precoImpressoraReais}
          onChange={campo("precoImpressoraReais")}
          dica="Para o desgaste da máquina. Vazio = sem desgaste."
        />
        <Campo id="vidaUtil" rotulo="Vida útil" unidade="h" valor={impressao.vidaUtilHoras} onChange={campo("vidaUtilHoras")} />
      </div>

      <Divisor>Mesa</Divisor>
      <div className={calc.campos3}>
        <Campo
          id="pecasMesa"
          rotulo="Peças por mesa"
          unidade="un"
          valor={impressao.pecasPorMesa}
          onChange={(v) => alterar({ pecasPorMesa: v.replace(/\D/g, "") })}
          dica="Material, energia e desgaste da mesa são divididos por elas."
        />
        <div className={styles.field}>
          <label htmlFor="tempoHoras">Tempo da mesa</label>
          <div className={calc.tempo}>
            <div className={calc.campoUnidade}>
              <input id="tempoHoras" aria-label="Horas" size={1} inputMode="numeric" placeholder="Horas" value={impressao.tempoHoras} onChange={(e) => alterar({ tempoHoras: e.target.value.replace(/\D/g, "") })} />
              <span>h</span>
            </div>
            <div className={calc.campoUnidade}>
              <input aria-label="Minutos" size={1} inputMode="numeric" placeholder="Min" value={impressao.tempoMinutos} onChange={(e) => alterar({ tempoMinutos: e.target.value.replace(/\D/g, "") })} />
              <span>min</span>
            </div>
          </div>
        </div>
        <Campo
          id="falha"
          rotulo="Taxa de falha"
          unidade="%"
          valor={impressao.taxaFalhaPercentual}
          onChange={campo("taxaFalhaPercentual")}
          dica="Reserva para impressões que dão errado."
        />
      </div>

      <Divisor>Filamento</Divisor>
      <div className={calc.campos3}>
        <Campo id="peso" rotulo="Peso da mesa" unidade="g" valor={impressao.pesoGramas} onChange={campo("pesoGramas")} desabilitado={usaLista} />
        <Campo id="precoKg" rotulo="Preço do filamento" prefixo="R$" unidade="/kg" valor={impressao.precoKgReais} onChange={campo("precoKgReais")} desabilitado={usaLista} />
        <Campo id="perda" rotulo="Perda" unidade="%" valor={impressao.perdaPercentual} onChange={campo("perdaPercentual")} dica="Purga, suportes, testes." />
      </div>
      {usaLista && <span className={styles.mlLinkAviso}>Com a lista abaixo, vale a soma dos filamentos da lista.</span>}

      {usaLista && (
        <div className={calc.lista}>
          <div className={`${calc.listaLinha} ${calc.listaCabecalho} ${calc.listaFilamento}`} aria-hidden="true">
            <span>Filamento</span>
            <span>Cor</span>
            <span>Peso (g)</span>
            <span>R$/kg</span>
            <span />
          </div>
          {impressao.filamentos.map((f, i) => (
            <div key={i} className={`${calc.listaLinha} ${calc.listaFilamento}`}>
              <input aria-label={`Filamento ${i + 1}`} placeholder="Nome/marca" value={f.nome} onChange={(e) => alterarFilamento(i, "nome", e.target.value)} />
              <div className={calc.corCampo}>
                {COR_HEX.test(f.cor) && <span className={calc.amostraCor} style={{ background: f.cor }} />}
                <input aria-label={`Cor do filamento ${i + 1}`} placeholder="Cor" value={f.cor} onChange={(e) => alterarFilamento(i, "cor", e.target.value)} />
              </div>
              <input aria-label={`Peso do filamento ${i + 1}`} inputMode="decimal" value={f.pesoGramas} onChange={(e) => alterarFilamento(i, "pesoGramas", soNumero(e.target.value))} />
              <input aria-label={`Preço por kg do filamento ${i + 1}`} inputMode="decimal" value={f.precoKgReais} onChange={(e) => alterarFilamento(i, "precoKgReais", soNumero(e.target.value))} />
              <button
                type="button"
                className={calc.remover}
                aria-label={`Remover filamento ${i + 1}`}
                onClick={() => alterar({ filamentos: impressao.filamentos.filter((_, j) => j !== i) })}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <button type="button" className={calc.adicionar} onClick={adicionarFilamento}>
        + {usaLista ? "Adicionar filamento" : "Peça com mais de uma cor/material? Adicionar filamentos"}
      </button>
    </Secao>
  );
}
