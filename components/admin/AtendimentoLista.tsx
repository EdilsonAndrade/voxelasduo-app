"use client";

import { useState } from "react";
import type { ItemAtendimento } from "@/lib/atendimento/apresentacao";
import Toast from "./Toast";
import styles from "./admin.module.css";

type Secao = "perguntas" | "reclamacoes" | "mensagens";

function formatarData(data: Date | string): string {
  return new Date(data).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SecaoAtendimento({
  secao,
  titulo,
  itensIniciais,
  linkLabel,
  mensagemVazia,
  mensagemSucesso,
}: {
  secao: Secao;
  titulo: string;
  itensIniciais: ItemAtendimento[];
  linkLabel: string;
  mensagemVazia: string;
  mensagemSucesso: (texto: string) => string;
}) {
  const [itens, setItens] = useState(itensIniciais);
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const [rascunhos, setRascunhos] = useState<Record<string, string>>({});
  const [enviandoId, setEnviandoId] = useState<string | null>(null);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [toastMensagem, setToastMensagem] = useState<string | null>(null);

  function alternarResposta(id: string) {
    setAbertos((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) {
        proximo.delete(id);
      } else {
        proximo.add(id);
      }
      return proximo;
    });
  }

  async function enviarResposta(id: string) {
    const texto = (rascunhos[id] ?? "").trim();
    if (!texto) return;

    setEnviandoId(id);
    setErros((atual) => ({ ...atual, [id]: "" }));

    try {
      const resposta = await fetch(`/api/admin/atendimento/${secao}/${id}/responder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      });
      const corpo = await resposta.json();

      if (!resposta.ok) {
        setErros((atual) => ({ ...atual, [id]: corpo.erro ?? "Falha ao enviar a resposta." }));
        return;
      }

      setToastMensagem(mensagemSucesso(texto));
      setRascunhos((atual) => ({ ...atual, [id]: "" }));
      setAbertos((atual) => {
        const proximo = new Set(atual);
        proximo.delete(id);
        return proximo;
      });

      if (corpo.resolvido) {
        setItens((atual) => atual.filter((item) => item.id !== id));
      }
    } finally {
      setEnviandoId(null);
    }
  }

  return (
    <section className={styles.secaoAtendimento}>
      <div className={styles.secaoAtendimentoTitulo}>
        <h2>{titulo}</h2>
        {itens.length > 0 && (
          <span className={styles.secaoAtendimentoContagem}>{itens.length} pendente(s)</span>
        )}
      </div>

      {itens.length === 0 ? (
        <p className={styles.empty}>{mensagemVazia}</p>
      ) : (
        <div className={styles.listaAtendimento}>
          {itens.map((item) => (
            <div key={item.id} className={styles.cardAtendimento}>
              <div className={styles.cardAtendimentoTopo}>
                <div>
                  <p className={styles.cardAtendimentoTexto}>{item.texto}</p>
                  {item.referencia && (
                    <p className={styles.cardAtendimentoReferencia}>
                      {item.referencia} · {formatarData(item.criadoEm)}
                    </p>
                  )}
                </div>
                <div className={styles.cardAtendimentoAcoes}>
                  <a
                    className={styles.btnGhost}
                    href={item.linkOrigem}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {linkLabel}
                  </a>
                  <button type="button" className={styles.btnGhost} onClick={() => alternarResposta(item.id)}>
                    {abertos.has(item.id) ? "cancelar" : "responder"}
                  </button>
                </div>
              </div>

              {abertos.has(item.id) && (
                <div className={styles.cardAtendimentoResposta}>
                  <div className={styles.field}>
                    <textarea
                      value={rascunhos[item.id] ?? ""}
                      onChange={(evento) =>
                        setRascunhos((atual) => ({ ...atual, [item.id]: evento.target.value }))
                      }
                      placeholder="Escreva sua resposta..."
                      maxLength={2000}
                    />
                  </div>
                  {erros[item.id] && <p className={styles.fieldError}>{erros[item.id]}</p>}
                  <div className={styles.cardAtendimentoRespostaAcoes}>
                    <button
                      type="button"
                      className={styles.btnPrimary}
                      disabled={enviandoId === item.id || !(rascunhos[item.id] ?? "").trim()}
                      onClick={() => enviarResposta(item.id)}
                    >
                      {enviandoId === item.id ? "enviando..." : "enviar resposta"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Toast mensagem={toastMensagem} aoFechar={() => setToastMensagem(null)} />
    </section>
  );
}

export default function AtendimentoLista({
  perguntas,
  reclamacoes,
  mensagens,
}: {
  perguntas: ItemAtendimento[];
  reclamacoes: ItemAtendimento[];
  mensagens: ItemAtendimento[];
}) {
  return (
    <>
      <SecaoAtendimento
        secao="perguntas"
        titulo="Perguntas pendentes"
        itensIniciais={perguntas}
        linkLabel="abrir anúncio ↗"
        mensagemVazia="Nenhuma pergunta pendente."
        mensagemSucesso={() => "Resposta publicada no anúncio do Mercado Livre."}
      />
      <SecaoAtendimento
        secao="reclamacoes"
        titulo="Reclamações pendentes"
        itensIniciais={reclamacoes}
        linkLabel="abrir venda ↗"
        mensagemVazia="Nenhuma reclamação pendente."
        mensagemSucesso={() =>
          "Comentário publicado na reclamação — acompanhe o encerramento pelo Mercado Livre."
        }
      />
      <SecaoAtendimento
        secao="mensagens"
        titulo="Mensagens pendentes"
        itensIniciais={mensagens}
        linkLabel="abrir venda ↗"
        mensagemVazia="Nenhuma mensagem pendente."
        mensagemSucesso={() => "Resposta publicada na conversa do Mercado Livre."}
      />
    </>
  );
}
