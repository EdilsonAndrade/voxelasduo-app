"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./admin.module.css";
import css from "./produtosAlta.module.css";
import { CATEGORIAS_NICHO } from "@/lib/nichos/categorias";
import { mesclarListas } from "@/lib/produtosAlta/mesclar";
import type { CategoriaNavegavel, CategoriaResumo, ItemEmAlta, OrdemLista } from "@/lib/models/produtosAlta";

/** Mesma concorrência da Pesquisa de nichos: no "Todas" as 16 categorias vão de 4 em 4. */
const CONCORRENCIA_TODAS = 4;
const IDS_NICHO = new Set(CATEGORIAS_NICHO.map((c) => c.id));
const GRUPOS = Array.from(new Set(CATEGORIAS_NICHO.map((c) => c.grupo)));

interface RespostaLista {
  itens: ItemEmAlta[];
  origem: "novo" | "cache";
  obtidoEm: string;
  avisoDesatualizado: boolean;
}

type Resultado =
  | { estado: "carregando"; itens: ItemEmAlta[]; pendentes: number }
  | {
      estado: "ok";
      itens: ItemEmAlta[];
      obtidoEm?: string;
      avisoDesatualizado: boolean;
      falhas: string[];
    }
  | { estado: "erro"; mensagem: string };

/** A rota já diz o que falhou e o status real do ML; o status HTTP vai junto para não sumir. */
async function erroDaResposta(resposta: Response): Promise<string> {
  const corpo = await resposta.json().catch(() => ({}));
  return `${corpo.mensagem ?? "Falha ao consultar o Mercado Livre."} (HTTP ${resposta.status})`;
}

async function buscarJson<T>(url: string): Promise<T> {
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error(await erroDaResposta(resposta));
  return (await resposta.json()) as T;
}

function formatarHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

const ROTULO_POSICAO: Record<ItemEmAlta["origem"], string> = {
  vendido: "mais vendido",
  procurado: "mais buscado",
  busca: "",
};

function Card({ item, mostrarCategoria }: { item: ItemEmAlta; mostrarCategoria: boolean }) {
  const titulo = item.termo ?? item.nome;
  const semNome = "O Mercado Livre não libera o nome deste anúncio";

  return (
    <li className={css.card} data-origem={item.origem}>
      <div className={css.foto}>
        {item.foto ? (
          // Foto do CDN do ML; sem otimização do Next para não depender de domínio configurado.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.foto} alt="" loading="lazy" />
        ) : (
          <span className={css.semFoto} aria-hidden="true">
            ?
          </span>
        )}
        {item.posicao !== null && (
          <span className={css.posicao} data-topo={item.posicao <= 3 ? "sim" : undefined}>
            <b>{item.posicao}º</b>
            <small>{ROTULO_POSICAO[item.origem]}</small>
          </span>
        )}
      </div>

      <div className={css.corpo}>
        <strong className={css.titulo} title={titulo}>
          {titulo ?? <span className={css.tituloVazio}>{semNome}</span>}
        </strong>
        {item.termo && item.nome && <span className={css.exemplo}>ex.: {item.nome}</span>}
        {mostrarCategoria && item.categoriaNome && <span className={css.categoriaCard}>{item.categoriaNome}</span>}
      </div>

      <div className={css.links}>
        <a
          className={css.link}
          href={item.links.mercadoLivre}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Ver no Mercado Livre${titulo ? `: ${titulo}` : ""}`}
        >
          Mercado Livre
        </a>
        {(["shopee", "makerworld"] as const).map((loja) => {
          const href = item.links[loja];
          const nomeLoja = loja === "shopee" ? "Shopee" : "MakerWorld";
          return href ? (
            <a
              key={loja}
              className={css.link}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Buscar na ${nomeLoja}${titulo ? `: ${titulo}` : ""}`}
            >
              {nomeLoja}
            </a>
          ) : (
            <span key={loja} className={css.link} aria-disabled="true" title={`Sem nome para buscar na ${nomeLoja}`}>
              {nomeLoja}
            </span>
          );
        })}
      </div>
    </li>
  );
}

/** Do nível das 16 categorias para baixo — "Casa, Móveis e Decoração" não é escolha da tela. */
function caminhoVisivel(categoria: CategoriaNavegavel): CategoriaResumo[] {
  const inicio = categoria.caminho.findIndex((c) => IDS_NICHO.has(c.id));
  return inicio >= 0 ? categoria.caminho.slice(inicio) : [{ id: categoria.id, nome: categoria.nome }];
}

export default function ProdutosAlta() {
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [ordem, setOrdem] = useState<OrdemLista>("vendidos");
  const [campo, setCampo] = useState("");
  const [termo, setTermo] = useState("");
  const [atualizar, setAtualizar] = useState(0);
  const [navegacao, setNavegacao] = useState<CategoriaNavegavel | null>(null);
  const [resultado, setResultado] = useState<Resultado>({ estado: "carregando", itens: [], pendentes: 0 });
  const consulta = useRef(0);
  const forcarProxima = useRef(false);

  // Caminho e subcategorias da categoria escolhida (FR-013).
  useEffect(() => {
    if (!categoriaId) {
      setNavegacao(null);
      return;
    }
    let ativo = true;
    buscarJson<CategoriaNavegavel>(`/api/admin/produtos-alta/categoria?id=${encodeURIComponent(categoriaId)}`)
      .then((c) => ativo && setNavegacao(c))
      .catch(() => ativo && setNavegacao(null));
    return () => {
      ativo = false;
    };
  }, [categoriaId]);

  useEffect(() => {
    const id = ++consulta.current;
    const forcar = forcarProxima.current;
    forcarProxima.current = false;
    const sufixoForcar = forcar ? "&forcar=true" : "";
    const vigente = () => id === consulta.current;

    async function carregarUma(url: string) {
      setResultado({ estado: "carregando", itens: [], pendentes: 1 });
      try {
        const r = await buscarJson<RespostaLista>(url);
        if (vigente()) {
          setResultado({
            estado: "ok",
            itens: r.itens,
            obtidoEm: r.obtidoEm,
            avisoDesatualizado: r.avisoDesatualizado,
            falhas: [],
          });
        }
      } catch (erro) {
        if (vigente()) setResultado({ estado: "erro", mensagem: (erro as Error).message });
      }
    }

    // "Todas": uma requisição por categoria, mostrando cada uma ao chegar (research #7).
    async function carregarTodas() {
      const listas: ItemEmAlta[][] = [];
      const falhas: string[] = [];
      let obtidoEm: string | undefined;
      let desatualizado = false;
      let pendentes = CATEGORIAS_NICHO.length;
      let proxima = 0;
      setResultado({ estado: "carregando", itens: [], pendentes });

      async function trabalhador() {
        while (proxima < CATEGORIAS_NICHO.length) {
          const indice = proxima++;
          const c = CATEGORIAS_NICHO[indice];
          try {
            const r = await buscarJson<RespostaLista>(
              `/api/admin/produtos-alta/lista?categoria=${c.id}&ordem=${ordem}${sufixoForcar}`
            );
            listas[indice] = r.itens;
            if (!obtidoEm || r.obtidoEm < obtidoEm) obtidoEm = r.obtidoEm;
            desatualizado ||= r.avisoDesatualizado;
          } catch (erro) {
            falhas.push(`${c.nome}: ${(erro as Error).message}`);
          }
          pendentes--;
          if (vigente() && pendentes > 0) {
            setResultado({ estado: "carregando", itens: mesclarListas(listas.filter(Boolean)), pendentes });
          }
        }
      }

      await Promise.all(Array.from({ length: CONCORRENCIA_TODAS }, trabalhador));
      if (!vigente()) return;
      if (falhas.length === CATEGORIAS_NICHO.length) {
        setResultado({ estado: "erro", mensagem: falhas[0] });
        return;
      }
      setResultado({
        estado: "ok",
        itens: mesclarListas(listas.filter(Boolean)),
        obtidoEm,
        avisoDesatualizado: desatualizado,
        falhas,
      });
    }

    if (termo) {
      const params = new URLSearchParams({ termo });
      if (categoriaId) params.set("categoria", categoriaId);
      void carregarUma(`/api/admin/produtos-alta/busca?${params}${sufixoForcar}`);
    } else if (categoriaId) {
      void carregarUma(`/api/admin/produtos-alta/lista?categoria=${categoriaId}&ordem=${ordem}${sufixoForcar}`);
    } else {
      void carregarTodas();
    }
  }, [categoriaId, ordem, termo, atualizar]);

  function escolherCategoria(id: string | null) {
    setCategoriaId(id);
  }

  function pesquisar(evento: React.FormEvent) {
    evento.preventDefault();
    setTermo(campo.trim());
  }

  function limparFiltros() {
    setCampo("");
    setTermo("");
    setCategoriaId(null);
    setOrdem("vendidos");
  }

  function recarregar() {
    forcarProxima.current = true;
    setAtualizar((n) => n + 1);
  }

  const raizSelecionada = navegacao ? caminhoVisivel(navegacao)[0]?.id : categoriaId;
  const filtrosAtivos = !!termo || !!categoriaId || ordem !== "vendidos";
  const itens = resultado.estado === "erro" ? [] : resultado.itens;

  return (
    <div className={css.pagina}>
      <header className={css.cabecalho}>
        <h1>O que está em alta agora</h1>
        <p>
          Mais vendidos e mais buscados no Mercado Livre nas categorias que dá para imprimir em 3D. Abra o item na loja
          ou procure o modelo no MakerWorld.
        </p>
      </header>

      <section className={css.filtros} aria-label="Filtros">
        <form className={css.busca} onSubmit={pesquisar} role="search">
          <input
            type="search"
            value={campo}
            onChange={(e) => setCampo(e.target.value)}
            placeholder={categoriaId ? "Buscar nesta categoria…" : "Buscar em todo o Mercado Livre…"}
            aria-label="Buscar produto por nome"
          />
          <button type="submit" className={styles.btnPrimary}>
            Buscar
          </button>
        </form>

        <div className={css.ordem} role="group" aria-label="Ordenar por">
          {(
            [
              ["vendidos", "Mais vendidos"],
              ["procurados", "Mais procurados"],
            ] as const
          ).map(([valor, rotulo]) => (
            <button
              key={valor}
              type="button"
              aria-pressed={ordem === valor && !termo}
              disabled={!!termo}
              onClick={() => setOrdem(valor)}
            >
              {rotulo}
            </button>
          ))}
        </div>

        <div className={css.grupos}>
          <button
            type="button"
            className={css.chip}
            aria-pressed={categoriaId === null}
            onClick={() => escolherCategoria(null)}
          >
            Todas
          </button>
          {GRUPOS.map((grupo) => (
            <div key={grupo} className={css.grupo} role="group" aria-label={grupo}>
              <span className={css.grupoNome}>{grupo}</span>
              {CATEGORIAS_NICHO.filter((c) => c.grupo === grupo).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={css.chip}
                  aria-pressed={raizSelecionada === c.id}
                  onClick={() => escolherCategoria(c.id)}
                >
                  {c.nome}
                </button>
              ))}
            </div>
          ))}
        </div>

        {navegacao && (
          <div className={css.sub}>
            <nav aria-label="Caminho da categoria" className={css.trilha}>
              {caminhoVisivel(navegacao).map((c, i, todos) =>
                i === todos.length - 1 ? (
                  <span key={c.id} aria-current="page">
                    {c.nome}
                  </span>
                ) : (
                  <button key={c.id} type="button" className={css.trilhaLink} onClick={() => escolherCategoria(c.id)}>
                    {c.nome}
                  </button>
                )
              )}
            </nav>
            {navegacao.filhas.length > 0 && (
              <div className={css.filhas} role="group" aria-label="Subcategorias">
                {navegacao.filhas.map((f) => (
                  <button key={f.id} type="button" className={css.chipSub} onClick={() => escolherCategoria(f.id)}>
                    {f.nome}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <div className={css.status}>
        <span>
          {resultado.estado === "carregando"
            ? resultado.pendentes > 1
              ? `Consultando o Mercado Livre… faltam ${resultado.pendentes} categorias`
              : "Consultando o Mercado Livre…"
            : resultado.estado === "ok"
              ? `${itens.length} ${itens.length === 1 ? "item" : "itens"}${termo ? ` para “${termo}”` : ""}`
              : ""}
        </span>
        {resultado.estado === "ok" && resultado.obtidoEm && (
          <span>
            obtido em {formatarHora(resultado.obtidoEm)} ·{" "}
            <button type="button" className={css.linkBotao} onClick={recarregar}>
              Atualizar
            </button>
          </span>
        )}
        {filtrosAtivos && (
          <button type="button" className={css.linkBotao} onClick={limparFiltros}>
            Limpar filtros
          </button>
        )}
      </div>

      {resultado.estado === "ok" && resultado.avisoDesatualizado && (
        <p className={css.aviso}>O Mercado Livre não respondeu agora; mostrando o último resultado guardado.</p>
      )}
      {resultado.estado === "ok" && resultado.falhas.length > 0 && (
        <details className={css.aviso}>
          <summary>{resultado.falhas.length} categorias não carregaram</summary>
          <ul>
            {resultado.falhas.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </details>
      )}
      {resultado.estado === "erro" && (
        <p className={css.erro} role="alert">
          {resultado.mensagem}
        </p>
      )}

      {resultado.estado === "ok" && itens.length === 0 && (
        <p className={css.vazio}>
          {termo
            ? categoriaId
              ? "Nenhum produto encontrado para este nome nesta categoria. Tente em todas as categorias."
              : "Nenhum produto encontrado para este nome."
            : "Nenhum produto em destaque nesta categoria agora."}
          {termo && categoriaId && (
            <>
              {" "}
              <button type="button" className={css.linkBotao} onClick={() => escolherCategoria(null)}>
                Buscar em todas
              </button>
            </>
          )}
        </p>
      )}

      {itens.length > 0 && (
        <ul className={css.grade}>
          {itens.map((item) => (
            <Card key={item.chave} item={item} mostrarCategoria={!categoriaId || item.origem === "busca"} />
          ))}
        </ul>
      )}

      <p className={css.nota}>
        Preço, quantidade vendida e visitas de anúncios de outros vendedores não são liberados pelo Mercado Livre, por
        isso a ordem é pela posição no ranking.
      </p>
    </div>
  );
}
