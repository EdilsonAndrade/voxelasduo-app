"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./admin.module.css";
import css from "./pesquisaNichos.module.css";
import { CATEGORIAS_NICHO } from "@/lib/nichos/categorias";
import { montarCalculoDoModelo } from "@/lib/nichos/calculo";
import { nomeDoLink } from "@/lib/nichos/linkProduto";
import type { Concorrencia, ModeloSugerido, Oportunidade, Potencial } from "@/lib/models/nicho";

/** Cada categoria faz dezenas de consultas ao MakerWorld — mais que isso arrisca o bloqueio deles. */
const MAX_CATEGORIAS = 3;

interface ResultadoCategoria {
  categoriaId: string;
  categoriaNome: string;
  oportunidades: Oportunidade[];
  ocultas: number;
  descartados: number;
  origem: "novo" | "cache";
  obtidoEm: string;
  avisoDesatualizado: boolean;
}

interface ResultadoTermo {
  termo: string;
  oportunidade: Oportunidade;
  origem: "novo" | "cache";
  obtidoEm: string;
  avisoDesatualizado: boolean;
}

type Estado<T> = { estado: "carregando" } | { estado: "ok"; dados: T } | { estado: "erro"; mensagem: string };

/** A mensagem da rota já diz qual fonte falhou e o status real; o status vai junto para não sumir. */
async function erroDaResposta(resposta: Response): Promise<string> {
  const corpo = await resposta.json().catch(() => ({}));
  return `${corpo.mensagem ?? "Falha na pesquisa."} (HTTP ${resposta.status})`;
}

function formatarTempo(segundos: number): string {
  const minutos = Math.round(segundos / 60);
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return h === 0 ? `${m}min` : m === 0 ? `${h}h` : `${h}h ${String(m).padStart(2, "0")}min`;
}

const milhar = (n: number) => n.toLocaleString("pt-BR");

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

const IMPRESSORA: Record<string, string> = { N2S: "A1", N1: "A1 mini" };

const ROTULO_POTENCIAL: Record<Potencial["nivel"], string> = {
  alto: "Potencial alto",
  medio: "Potencial médio",
  baixo: "Potencial baixo",
  nao_avaliado: "Potencial não avaliado",
};

const ROTULO_CONCORRENCIA: Record<Concorrencia["nivel"], string> = {
  baixa: "Concorrência baixa",
  media: "Concorrência média",
  alta: "Concorrência alta",
  indisponivel: "Concorrência indisponível",
};

const BARRAS_CONCORRENCIA: Record<Concorrencia["nivel"], number> = { baixa: 1, media: 2, alta: 3, indisponivel: 0 };

function Concorrencia({ concorrencia }: { concorrencia: Concorrencia }) {
  const { nivel, produtosCatalogo } = concorrencia;
  const barras = BARRAS_CONCORRENCIA[nivel];
  const detalhe =
    produtosCatalogo === null
      ? "o ML não respondeu a contagem"
      : `${produtosCatalogo >= 10000 ? "10.000+" : milhar(produtosCatalogo)} produtos no catálogo do ML`;

  return (
    <span className={css.concorrencia} data-nivel={nivel} title={detalhe}>
      <span className={css.barras} aria-hidden="true">
        {[1, 2, 3].map((b) => (
          <i key={b} className={b <= barras ? css.barraCheia : undefined} />
        ))}
      </span>
      {ROTULO_CONCORRENCIA[nivel]}
      <small>{detalhe}</small>
    </span>
  );
}

function Modelo({
  modelo,
  onLevar,
  levando,
  erro,
}: {
  modelo: ModeloSugerido;
  onLevar: () => void;
  levando: boolean;
  erro: string | null;
}) {
  const { perfil } = modelo;
  return (
    <li className={css.modelo}>
      {modelo.capa ? (
        // Capa vem do CDN do MakerWorld; sem otimização do Next para não depender de domínio configurado.
        // eslint-disable-next-line @next/next/no-img-element
        <img className={css.capa} src={modelo.capa} alt="" loading="lazy" />
      ) : (
        <span className={css.capa} />
      )}
      <div className={css.modeloCorpo}>
        <strong className={css.modeloNome}>{modelo.nome}</strong>
        <span className={css.modeloAutor}>
          {modelo.autor ? `${modelo.autor} · ` : ""}licença CC {modelo.licenca} · {milhar(modelo.downloads)} downloads
        </span>
        <dl className={css.ficha}>
          <div>
            <dt>Tempo</dt>
            <dd>{formatarTempo(perfil.segundos)}</dd>
          </div>
          <div>
            <dt>Filamento</dt>
            <dd>{milhar(Math.round(perfil.gramas))} g</dd>
          </div>
          <div>
            <dt>Mesas</dt>
            <dd>{perfil.mesas}</dd>
          </div>
          <div>
            <dt>Cores</dt>
            <dd>{perfil.cores}</dd>
          </div>
          <div>
            <dt>Perfil</dt>
            <dd>{IMPRESSORA[perfil.impressora] ?? perfil.impressora}</dd>
          </div>
        </dl>
        <div className={css.modeloAcoes}>
          <a className={`${styles.btn} ${styles.btnGhost}`} href={modelo.url} target="_blank" rel="noreferrer">
            Abrir no MakerWorld ↗
          </a>
          <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onLevar} disabled={levando}>
            {levando ? "Abrindo…" : "Levar para a calculadora"}
          </button>
        </div>
        {erro && <p className={css.erro}>{erro}</p>}
      </div>
    </li>
  );
}

function CartaoOportunidade({
  oportunidade,
  links,
}: {
  oportunidade: Oportunidade;
  links?: { shopee: string; mercadoLivre: string };
}) {
  const router = useRouter();
  const [levando, setLevando] = useState<number | null>(null);
  const [erros, setErros] = useState<Record<number, string>>({});

  async function levar(modelo: ModeloSugerido) {
    setLevando(modelo.id);
    setErros((atual) => ({ ...atual, [modelo.id]: "" }));
    const resposta = await fetch("/api/admin/calculos-preco", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        montarCalculoDoModelo({
          termo: oportunidade.termo,
          modelo,
          linkShopee: links?.shopee,
          linkMercadoLivre: links?.mercadoLivre,
        })
      ),
    });
    if (!resposta.ok) {
      const corpo = await resposta.json().catch(() => ({}));
      setErros((atual) => ({ ...atual, [modelo.id]: `${corpo.erro ?? "Não foi possível criar o cálculo."} (HTTP ${resposta.status})` }));
      setLevando(null);
      return;
    }
    const { calculo } = await resposta.json();
    router.push(`/admin/produtos/calculadora?id=${calculo._id}`);
  }

  const { potencial } = oportunidade;
  return (
    <article className={css.oportunidade}>
      <header className={css.oportunidadeTopo}>
        <h3>{oportunidade.termo}</h3>
        <div className={css.selos}>
          <span className={css.potencial} data-nivel={potencial.nivel}>
            {ROTULO_POTENCIAL[potencial.nivel]}
          </span>
          <Concorrencia concorrencia={oportunidade.concorrencia} />
        </div>
        <p className={css.motivo}>{potencial.motivo}</p>
      </header>
      {oportunidade.modelos.length === 0 ? (
        <p className={css.vazio}>
          Nenhum modelo com licença de venda passou nos filtros. Tente desmarcar “Só 1 cor” ou escrever o nome de outro jeito.
        </p>
      ) : (
        <ul className={css.modelos}>
          {oportunidade.modelos.map((m) => (
            <Modelo
              key={m.id}
              modelo={m}
              onLevar={() => levar(m)}
              levando={levando === m.id}
              erro={erros[m.id] || null}
            />
          ))}
        </ul>
      )}
    </article>
  );
}

function Origem({ dados, onAtualizar }: { dados: { origem: string; obtidoEm: string; avisoDesatualizado: boolean }; onAtualizar: () => void }) {
  return (
    <p className={css.origem}>
      {dados.avisoDesatualizado
        ? `Não deu para atualizar agora — mostrando a pesquisa de ${formatarData(dados.obtidoEm)}.`
        : `Pesquisado em ${formatarData(dados.obtidoEm)}${dados.origem === "cache" ? " (guardado por 24h)" : ""}.`}{" "}
      <button type="button" className={css.linkBotao} onClick={onAtualizar}>
        Pesquisar de novo
      </button>
    </p>
  );
}

export default function PesquisaNichos() {
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [umaCor, setUmaCor] = useState(true);
  const [a1, setA1] = useState(true);
  const [pesquisando, setPesquisando] = useState(false);
  const [resultados, setResultados] = useState<Record<string, Estado<ResultadoCategoria>>>({});

  const [linkShopee, setLinkShopee] = useState("");
  const [linkMercadoLivre, setLinkMercadoLivre] = useState("");
  const [nome, setNome] = useState("");
  const [nomeEditado, setNomeEditado] = useState(false);
  const [resultadoTermo, setResultadoTermo] = useState<Estado<ResultadoTermo> | null>(null);

  const filtros = `umaCor=${umaCor ? 1 : 0}&a1=${a1 ? 1 : 0}`;

  function alternarCategoria(id: string) {
    setSelecionadas((atual) =>
      atual.includes(id) ? atual.filter((c) => c !== id) : atual.length >= MAX_CATEGORIAS ? atual : [...atual, id]
    );
  }

  async function pesquisarCategoria(id: string, forcar = false) {
    setResultados((atual) => ({ ...atual, [id]: { estado: "carregando" } }));
    const resposta = await fetch(`/api/admin/nichos/categoria?id=${id}&${filtros}${forcar ? "&forcar=true" : ""}`);
    const estado: Estado<ResultadoCategoria> = resposta.ok
      ? { estado: "ok", dados: await resposta.json() }
      : { estado: "erro", mensagem: await erroDaResposta(resposta) };
    setResultados((atual) => ({ ...atual, [id]: estado }));
  }

  /** Uma categoria por vez: em paralelo as consultas somadas fazem o MakerWorld bloquear. */
  async function pesquisar() {
    setPesquisando(true);
    setResultados(Object.fromEntries(selecionadas.map((id) => [id, { estado: "carregando" } as const])));
    for (const id of selecionadas) await pesquisarCategoria(id);
    setPesquisando(false);
  }

  function alterarLink(valor: string, setLink: (v: string) => void, outro: string) {
    setLink(valor);
    if (!nomeEditado) setNome(nomeDoLink(valor) ?? nomeDoLink(outro) ?? "");
  }

  async function buscarTermo(forcar = false) {
    const termo = nome.trim();
    if (!termo) {
      setResultadoTermo({
        estado: "erro",
        mensagem: "Não deu para tirar o nome do produto desse link. Digite o nome no campo “Nome do produto”.",
      });
      return;
    }
    setResultadoTermo({ estado: "carregando" });
    const resposta = await fetch(
      `/api/admin/nichos/termo?termo=${encodeURIComponent(termo)}&${filtros}${forcar ? "&forcar=true" : ""}`
    );
    setResultadoTermo(
      resposta.ok ? { estado: "ok", dados: await resposta.json() } : { estado: "erro", mensagem: await erroDaResposta(resposta) }
    );
  }

  const limiteAtingido = selecionadas.length >= MAX_CATEGORIAS;

  return (
    <div className={css.pagina}>
      <section className={css.bloco}>
        <h2>O que as pessoas estão procurando</h2>
        <p className={css.ajuda}>
          Cruza os termos mais buscados no Mercado Livre com modelos do MakerWorld que podem ser vendidos (licença
          comercial). Só aparece o que tem potencial médio ou alto.
        </p>

        <fieldset className={css.categorias}>
          <legend>
            Categorias <small>(até {MAX_CATEGORIAS})</small>
          </legend>
          {CATEGORIAS_NICHO.map((c) => {
            const marcada = selecionadas.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                className={css.chip}
                aria-pressed={marcada}
                disabled={!marcada && limiteAtingido}
                onClick={() => alternarCategoria(c.id)}
              >
                {c.nome}
              </button>
            );
          })}
        </fieldset>

        <div className={css.filtros}>
          <label className={css.check}>
            <input type="checkbox" checked={umaCor} onChange={(e) => setUmaCor(e.target.checked)} />
            <span>
              Só 1 cor <small>sem AMS, sem troca de filamento</small>
            </span>
          </label>
          <label className={css.check}>
            <input type="checkbox" checked={a1} onChange={(e) => setA1(e.target.checked)} />
            <span>
              Compatível com A1 <small>perfil feito para A1 ou A1 mini</small>
            </span>
          </label>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={selecionadas.length === 0 || pesquisando}
            onClick={pesquisar}
          >
            {pesquisando ? "Pesquisando…" : "Pesquisar"}
          </button>
        </div>
        {pesquisando && (
          <p className={css.ajuda}>Cada categoria leva até 1 minuto na primeira vez; depois fica guardada por 24h.</p>
        )}
      </section>

      {selecionadas
        .filter((id) => resultados[id])
        .map((id) => {
          const r = resultados[id];
          const nomeCategoria = CATEGORIAS_NICHO.find((c) => c.id === id)?.nome ?? id;
          return (
            <section key={id} className={css.categoria}>
              <h2>{nomeCategoria}</h2>
              {r.estado === "carregando" && <p className={css.carregando}>Pesquisando no Mercado Livre e no MakerWorld…</p>}
              {r.estado === "erro" && (
                <p className={css.erro}>
                  {r.mensagem}{" "}
                  <button type="button" className={css.linkBotao} onClick={() => pesquisarCategoria(id, true)}>
                    Tentar de novo
                  </button>
                </p>
              )}
              {r.estado === "ok" && (
                <>
                  <Origem dados={r.dados} onAtualizar={() => pesquisarCategoria(id, true)} />
                  {r.dados.oportunidades.length === 0 ? (
                    <p className={css.vazio}>
                      Nenhuma oportunidade de potencial médio ou alto com os filtros atuais. Tente outra categoria ou
                      desmarque “Só 1 cor”.
                    </p>
                  ) : (
                    <div className={css.lista}>
                      {r.dados.oportunidades.map((o) => (
                        <CartaoOportunidade key={o.termo} oportunidade={o} />
                      ))}
                    </div>
                  )}
                  {(r.dados.ocultas > 0 || r.dados.descartados > 0) && (
                    <p className={css.rodape}>
                      {r.dados.ocultas > 0 && `${r.dados.ocultas} de potencial baixo ocultas. `}
                      {r.dados.descartados > 0 &&
                        `${r.dados.descartados} termos em alta sem modelo imprimível que passe nos filtros.`}
                    </p>
                  )}
                </>
              )}
            </section>
          );
        })}

      <section className={css.bloco}>
        <h2>Achei um produto</h2>
        <p className={css.ajuda}>
          Cole o link do anúncio que você viu. O nome do produto sai do próprio link e é usado para buscar o modelo; os
          links vão junto para a calculadora.
        </p>
        <div className={css.camposLink}>
          <div className={styles.field}>
            <label htmlFor="linkShopeeNicho">Link da Shopee</label>
            <input
              id="linkShopeeNicho"
              type="url"
              value={linkShopee}
              placeholder="https://shopee.com.br/…"
              onChange={(e) => alterarLink(e.target.value, setLinkShopee, linkMercadoLivre)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="linkMlNicho">Link do Mercado Livre</label>
            <input
              id="linkMlNicho"
              type="url"
              value={linkMercadoLivre}
              placeholder="https://produto.mercadolivre.com.br/…"
              onChange={(e) => alterarLink(e.target.value, setLinkMercadoLivre, linkShopee)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="nomeProdutoNicho">Nome do produto</label>
            <input
              id="nomeProdutoNicho"
              type="text"
              value={nome}
              placeholder="ex: porta caneta"
              onChange={(e) => {
                setNome(e.target.value);
                setNomeEditado(e.target.value.trim() !== "");
              }}
            />
          </div>
        </div>
        <div>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={resultadoTermo?.estado === "carregando"}
            onClick={() => buscarTermo()}
          >
            {resultadoTermo?.estado === "carregando" ? "Buscando…" : "Buscar modelos"}
          </button>
        </div>

        {resultadoTermo?.estado === "erro" && <p className={css.erro}>{resultadoTermo.mensagem}</p>}
        {resultadoTermo?.estado === "ok" && (
          <>
            <Origem dados={resultadoTermo.dados} onAtualizar={() => buscarTermo(true)} />
            <CartaoOportunidade
              oportunidade={resultadoTermo.dados.oportunidade}
              links={{ shopee: linkShopee, mercadoLivre: linkMercadoLivre }}
            />
          </>
        )}
      </section>
    </div>
  );
}
