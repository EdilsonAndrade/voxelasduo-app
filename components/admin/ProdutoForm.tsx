"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ConfirmModal from "./ConfirmModal";
import Toast from "./Toast";
import styles from "./admin.module.css";

export interface ProdutoFormValores {
  id?: string;
  nome: string;
  descricao: string;
  precoReais: string;
  estoque: string;
  categoria: string;
  fotos: string[];
  /** ID do anúncio correspondente no Mercado Livre — vazio = sem anúncio nesse canal (Tarefa 5). */
  mercadoLivreId?: string;
  /** URL pública do anúncio, devolvida pela API do Mercado Livre na publicação — não reconstruir manualmente. */
  mercadoLivrePermalink?: string;
  /** ID do anúncio correspondente na Shopee — vazio = sem anúncio nesse canal (Tarefa 5). */
  shopeeItemId?: string;
}

const VAZIO: ProdutoFormValores = {
  nome: "",
  descricao: "",
  precoReais: "",
  estoque: "",
  categoria: "",
  fotos: [],
  mercadoLivreId: "",
  mercadoLivrePermalink: "",
  shopeeItemId: "",
};

export default function ProdutoForm({
  valoresIniciais = VAZIO,
}: {
  valoresIniciais?: ProdutoFormValores;
}) {
  const router = useRouter();
  const [valores, setValores] = useState(valoresIniciais);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [publicandoMercadoLivre, setPublicandoMercadoLivre] = useState(false);
  const [despublicandoMercadoLivre, setDespublicandoMercadoLivre] = useState(false);
  const [camposErro, setCamposErro] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [erroPublicacao, setErroPublicacao] = useState<string | null>(null);
  const [confirmandoDespublicar, setConfirmandoDespublicar] = useState(false);
  const [toastMensagem, setToastMensagem] = useState<string | null>(null);

  const editando = Boolean(valoresIniciais.id);

  function atualizarCampo<K extends keyof ProdutoFormValores>(campo: K, valor: ProdutoFormValores[K]) {
    setValores((atual) => ({ ...atual, [campo]: valor }));
  }

  async function handleUpload(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivos = evento.target.files;
    if (!arquivos || arquivos.length === 0) return;

    setEnviandoFoto(true);
    setErroGeral(null);
    try {
      for (const arquivo of Array.from(arquivos)) {
        const formData = new FormData();
        formData.append("arquivo", arquivo);
        const resposta = await fetch("/api/produtos/upload", { method: "POST", body: formData });
        const dados = await resposta.json();
        if (!resposta.ok) {
          setErroGeral(dados.erro ?? "Não foi possível enviar a foto.");
          continue;
        }
        setValores((atual) => ({ ...atual, fotos: [...atual.fotos, dados.url as string] }));
      }
    } finally {
      setEnviandoFoto(false);
      evento.target.value = "";
    }
  }

  function removerFoto(url: string) {
    setValores((atual) => ({ ...atual, fotos: atual.fotos.filter((f) => f !== url) }));
  }

  async function handleSubmit(evento: React.FormEvent) {
    evento.preventDefault();
    setSalvando(true);
    setErroGeral(null);
    setCamposErro({});

    const preco = Math.round(parseFloat(valores.precoReais.replace(",", ".")) * 100);
    const payload = {
      nome: valores.nome,
      descricao: valores.descricao,
      preco: Number.isFinite(preco) ? preco : 0,
      estoque: parseInt(valores.estoque, 10),
      categoria: valores.categoria,
      fotos: valores.fotos,
      integracoes: {
        mercadoLivreId: valores.mercadoLivreId?.trim() || undefined,
        mercadoLivrePermalink: valores.mercadoLivrePermalink?.trim() || undefined,
        shopeeItemId: valores.shopeeItemId?.trim() || undefined,
      },
    };

    try {
      const url = editando ? `/api/produtos/${valoresIniciais.id}` : "/api/produtos";
      const metodo = editando ? "PATCH" : "POST";
      const resposta = await fetch(url, {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const dados = await resposta.json();

      if (!resposta.ok) {
        setErroGeral(dados.erro ?? "Não foi possível salvar o produto.");
        setCamposErro(dados.campos ?? {});
        return;
      }

      router.push("/admin/produtos");
      router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  async function handlePublicarMercadoLivre() {
    if (!valoresIniciais.id) return;

    setPublicandoMercadoLivre(true);
    setErroPublicacao(null);
    try {
      const resposta = await fetch(`/api/produtos/${valoresIniciais.id}/mercado-livre/publicar`, {
        method: "POST",
      });
      const dados = await resposta.json();

      if (!resposta.ok) {
        setErroPublicacao(dados.erro ?? "Não foi possível publicar no Mercado Livre.");
        return;
      }

      atualizarCampo("mercadoLivreId", dados.mercadoLivreId as string);
      atualizarCampo("mercadoLivrePermalink", dados.mercadoLivrePermalink as string);
      setToastMensagem("Produto publicado no Mercado Livre.");
      router.refresh();
    } finally {
      setPublicandoMercadoLivre(false);
    }
  }

  async function confirmarDespublicarMercadoLivre() {
    setConfirmandoDespublicar(false);
    if (!valoresIniciais.id) return;

    setDespublicandoMercadoLivre(true);
    setErroPublicacao(null);
    try {
      const resposta = await fetch(`/api/produtos/${valoresIniciais.id}/mercado-livre/publicar`, {
        method: "DELETE",
      });
      const dados = await resposta.json();

      if (!resposta.ok) {
        setErroPublicacao(dados.erro ?? "Não foi possível despublicar do Mercado Livre.");
        return;
      }

      atualizarCampo("mercadoLivreId", "");
      atualizarCampo("mercadoLivrePermalink", "");
      setToastMensagem("Anúncio despublicado do Mercado Livre.");
      router.refresh();
    } finally {
      setDespublicandoMercadoLivre(false);
    }
  }

  async function handleExcluir() {
    if (!valoresIniciais.id) return;
    if (!window.confirm("Remover este produto? Essa ação não pode ser desfeita.")) return;

    setExcluindo(true);
    try {
      const resposta = await fetch(`/api/produtos/${valoresIniciais.id}`, { method: "DELETE" });
      if (resposta.ok || resposta.status === 404) {
        router.push("/admin/produtos");
        router.refresh();
      } else {
        setErroGeral("Não foi possível remover o produto.");
      }
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <>
      <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label htmlFor="nome">Nome</label>
        <input
          id="nome"
          value={valores.nome}
          onChange={(e) => atualizarCampo("nome", e.target.value)}
          required
        />
        {camposErro.nome && <span className={styles.fieldError}>{camposErro.nome}</span>}
      </div>

      <div className={styles.field}>
        <label htmlFor="descricao">Descrição</label>
        <textarea
          id="descricao"
          value={valores.descricao}
          onChange={(e) => atualizarCampo("descricao", e.target.value)}
          required
        />
        {camposErro.descricao && <span className={styles.fieldError}>{camposErro.descricao}</span>}
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="preco">Preço (R$)</label>
          <input
            id="preco"
            inputMode="decimal"
            placeholder="49.90"
            value={valores.precoReais}
            onChange={(e) => atualizarCampo("precoReais", e.target.value)}
            required
          />
          {camposErro.preco && <span className={styles.fieldError}>{camposErro.preco}</span>}
        </div>
        <div className={styles.field}>
          <label htmlFor="estoque">Estoque</label>
          <input
            id="estoque"
            inputMode="numeric"
            value={valores.estoque}
            onChange={(e) => atualizarCampo("estoque", e.target.value)}
            required
          />
          {camposErro.estoque && <span className={styles.fieldError}>{camposErro.estoque}</span>}
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="categoria">Categoria</label>
        <input
          id="categoria"
          value={valores.categoria}
          onChange={(e) => atualizarCampo("categoria", e.target.value)}
          required
        />
        {camposErro.categoria && <span className={styles.fieldError}>{camposErro.categoria}</span>}
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="mercadoLivreId">ID do anúncio no Mercado Livre (opcional)</label>
          <input
            id="mercadoLivreId"
            placeholder="Ex: MLB1234567890"
            value={valores.mercadoLivreId ?? ""}
            onChange={(e) => atualizarCampo("mercadoLivreId", e.target.value)}
          />
          {editando && !valores.mercadoLivreId?.trim() && (
            <button
              type="button"
              className={styles.btnGhost}
              onClick={handlePublicarMercadoLivre}
              disabled={publicandoMercadoLivre}
            >
              {publicandoMercadoLivre ? "Publicando…" : "Publicar no Mercado Livre"}
            </button>
          )}
          {editando && valores.mercadoLivreId?.trim() && (
            <button
              type="button"
              className={styles.btnGhost}
              onClick={() => setConfirmandoDespublicar(true)}
              disabled={despublicandoMercadoLivre}
            >
              {despublicandoMercadoLivre ? "Despublicando…" : "Despublicar do Mercado Livre"}
            </button>
          )}
          {editando && valores.mercadoLivreId?.trim() && (
            <div className={styles.mlLinkBox}>
              {valores.mercadoLivrePermalink?.trim() && (
                <a
                  href={valores.mercadoLivrePermalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.mlLink}
                >
                  Ver anúncio na loja ↗
                </a>
              )}
              <span className={styles.mlLinkAviso}>
                Pode levar de 5 a 10 minutos para aparecer na loja depois da publicação.
              </span>
            </div>
          )}
          {erroPublicacao && <span className={styles.fieldError}>{erroPublicacao}</span>}
        </div>
        <div className={styles.field}>
          <label htmlFor="shopeeItemId">ID do anúncio na Shopee (opcional)</label>
          <input
            id="shopeeItemId"
            placeholder="Ex: 123456789"
            value={valores.shopeeItemId ?? ""}
            onChange={(e) => atualizarCampo("shopeeItemId", e.target.value)}
          />
        </div>
      </div>
      {camposErro.integracoes && <p className={styles.formError}>{camposErro.integracoes}</p>}

      <div className={styles.field}>
        <label htmlFor="fotos">Fotos</label>
        <input id="fotos" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleUpload} disabled={enviandoFoto} />
        {camposErro.fotos && <span className={styles.fieldError}>{camposErro.fotos}</span>}
        <div className={styles.fotos}>
          {valores.fotos.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <div className={styles.foto} key={url}>
              <img src={url} alt="" />
              <button type="button" className={styles.fotoRemover} onClick={() => removerFoto(url)}>
                remover
              </button>
            </div>
          ))}
        </div>
      </div>

      {erroGeral && <p className={styles.formError}>{erroGeral}</p>}

      <div className={styles.actions}>
        <button type="submit" className={styles.btnPrimary} disabled={salvando || enviandoFoto}>
          {salvando ? "Salvando…" : "Salvar produto"}
        </button>
        {editando && (
          <button type="button" className={styles.btnDanger} onClick={handleExcluir} disabled={excluindo}>
            {excluindo ? "Removendo…" : "Remover produto"}
          </button>
        )}
      </div>
      </form>
      <ConfirmModal
        aberto={confirmandoDespublicar}
        titulo="Despublicar anúncio?"
        mensagem="O anúncio será fechado no Mercado Livre e o produto ficará livre para ser publicado de novo."
        textoConfirmar="Despublicar"
        variante="perigo"
        onConfirmar={confirmarDespublicarMercadoLivre}
        onCancelar={() => setConfirmandoDespublicar(false)}
      />
      <Toast mensagem={toastMensagem} aoFechar={() => setToastMensagem(null)} />
    </>
  );
}
