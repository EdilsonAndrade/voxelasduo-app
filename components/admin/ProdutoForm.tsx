"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import ConfirmModal from "./ConfirmModal";
import Toast from "./Toast";
import SimuladorPrecificacao from "./SimuladorPrecificacao";
import styles from "./admin.module.css";
import { calcularCustoProducao } from "@/lib/produtos/custoProducao";
import {
  camposCustoProducaoFaltando,
  montarCustoProducao,
  VAZIO_CUSTO_PRODUCAO,
  type CustoProducaoFormValores,
} from "@/lib/produtos/custoProducaoFormulario";
import {
  camposEmbalagemFaltando,
  montarEmbalagemEnvio,
  VAZIO_EMBALAGEM_ENVIO,
  type EmbalagemEnvioFormValores,
} from "@/lib/produtos/embalagemEnvioFormulario";

export type { CustoProducaoFormValores, EmbalagemEnvioFormValores };

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
  /** Custo de produção (COGS) — opcional, ausência não bloqueia o cadastro (EDI-92). */
  custoProducao: CustoProducaoFormValores;
  /** Peso/dimensões da embalagem para envio — opcional, ausência não bloqueia a publicação (EDI-96). */
  embalagemEnvio: EmbalagemEnvioFormValores;
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
  custoProducao: VAZIO_CUSTO_PRODUCAO,
  embalagemEnvio: VAZIO_EMBALAGEM_ENVIO,
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
  const [corrigindoAtributos, setCorrigindoAtributos] = useState(false);
  const [erroCorrecaoAtributos, setErroCorrecaoAtributos] = useState<string | null>(null);
  const [camposErro, setCamposErro] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [erroPublicacao, setErroPublicacao] = useState<string | null>(null);
  const [confirmandoDespublicar, setConfirmandoDespublicar] = useState(false);
  const [confirmandoExcluir, setConfirmandoExcluir] = useState(false);
  const [toastMensagem, setToastMensagem] = useState<string | null>(null);

  const editando = Boolean(valoresIniciais.id);

  function atualizarCampo<K extends keyof ProdutoFormValores>(campo: K, valor: ProdutoFormValores[K]) {
    setValores((atual) => ({ ...atual, [campo]: valor }));
  }

  function atualizarCampoCustoProducao<K extends keyof CustoProducaoFormValores>(
    campo: K,
    valor: string
  ) {
    setValores((atual) => ({
      ...atual,
      custoProducao: { ...atual.custoProducao, [campo]: valor },
    }));
  }

  function atualizarCampoEmbalagem<K extends keyof EmbalagemEnvioFormValores>(
    campo: K,
    valor: string
  ) {
    setValores((atual) => ({
      ...atual,
      embalagemEnvio: { ...atual.embalagemEnvio, [campo]: valor },
    }));
  }

  const camposCustoFaltando = useMemo(
    () => camposCustoProducaoFaltando(valores.custoProducao),
    [valores.custoProducao]
  );
  const custoProducaoCalculado = useMemo(
    () => montarCustoProducao(valores.custoProducao),
    [valores.custoProducao]
  );
  const resultadoCogs = useMemo(
    () => (custoProducaoCalculado ? calcularCustoProducao(custoProducaoCalculado) : null),
    [custoProducaoCalculado]
  );

  const camposEmbalagemNaoPreenchidos = useMemo(
    () => camposEmbalagemFaltando(valores.embalagemEnvio),
    [valores.embalagemEnvio]
  );
  const embalagemEnvioCalculada = useMemo(
    () => montarEmbalagemEnvio(valores.embalagemEnvio),
    [valores.embalagemEnvio]
  );

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
      custoProducao: custoProducaoCalculado ?? undefined,
      embalagemEnvio: embalagemEnvioCalculada ?? undefined,
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

  /** Reaplica Marca/Modelo e embalagem corrigidos num anúncio já publicado, sem despublicar/republicar (EDI-95/EDI-96). */
  async function handleCorrigirAtributos() {
    if (!valoresIniciais.id) return;

    setCorrigindoAtributos(true);
    setErroCorrecaoAtributos(null);
    try {
      const resposta = await fetch(
        `/api/produtos/${valoresIniciais.id}/mercado-livre/corrigir-atributos`,
        { method: "POST" }
      );
      const dados = await resposta.json();

      if (!resposta.ok) {
        setErroCorrecaoAtributos(dados.erro ?? "Não foi possível corrigir os atributos.");
        return;
      }

      setToastMensagem("Atributos corrigidos no Mercado Livre.");
    } finally {
      setCorrigindoAtributos(false);
    }
  }

  async function confirmarExcluir() {
    setConfirmandoExcluir(false);
    if (!valoresIniciais.id) return;

    setExcluindo(true);
    try {
      const resposta = await fetch(`/api/produtos/${valoresIniciais.id}`, { method: "DELETE" });
      const ok = resposta.ok || resposta.status === 404;
      if (ok) {
        router.push("/admin/produtos");
        router.refresh();
      } else {
        const dados = await resposta.json().catch(() => null);
        setErroGeral(dados?.erro ?? "Não foi possível remover o produto.");
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

      <fieldset className={styles.field}>
        <legend>Custo de produção (opcional)</legend>
        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="custoPesoPeca">Peso da peça (g)</label>
            <input
              id="custoPesoPeca"
              inputMode="decimal"
              placeholder="120"
              value={valores.custoProducao.pesoPecaGramas}
              onChange={(e) => atualizarCampoCustoProducao("pesoPecaGramas", e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="custoTempoImpressao">Tempo de impressão (h)</label>
            <input
              id="custoTempoImpressao"
              inputMode="decimal"
              placeholder="4.5"
              value={valores.custoProducao.tempoImpressaoHoras}
              onChange={(e) => atualizarCampoCustoProducao("tempoImpressaoHoras", e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="custoTempoMaoDeObra">Tempo de mão de obra (h)</label>
            <input
              id="custoTempoMaoDeObra"
              inputMode="decimal"
              placeholder="0.25"
              value={valores.custoProducao.tempoMaoDeObraHoras}
              onChange={(e) => atualizarCampoCustoProducao("tempoMaoDeObraHoras", e.target.value)}
            />
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="custoPrecoCarretel">Preço do carretel de filamento (R$)</label>
            <input
              id="custoPrecoCarretel"
              inputMode="decimal"
              placeholder="100.00"
              value={valores.custoProducao.precoCarreteReais}
              onChange={(e) => atualizarCampoCustoProducao("precoCarreteReais", e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="custoPesoCarretel">Peso do carretel (g)</label>
            <input
              id="custoPesoCarretel"
              inputMode="decimal"
              placeholder="1000"
              value={valores.custoProducao.pesoCarreteGramas}
              onChange={(e) => atualizarCampoCustoProducao("pesoCarreteGramas", e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="custoMargemPerda">Margem de perda/purga (%)</label>
            <input
              id="custoMargemPerda"
              inputMode="decimal"
              placeholder="10"
              value={valores.custoProducao.margemPerdaPercentual}
              onChange={(e) => atualizarCampoCustoProducao("margemPerdaPercentual", e.target.value)}
            />
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="custoPrecoImpressora">Preço da impressora (R$)</label>
            <input
              id="custoPrecoImpressora"
              inputMode="decimal"
              placeholder="4570.00"
              value={valores.custoProducao.precoImpressoraReais}
              onChange={(e) => atualizarCampoCustoProducao("precoImpressoraReais", e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="custoVidaUtilImpressora">Vida útil da impressora (h)</label>
            <input
              id="custoVidaUtilImpressora"
              inputMode="decimal"
              placeholder="4000"
              value={valores.custoProducao.vidaUtilImpressoraHoras}
              onChange={(e) =>
                atualizarCampoCustoProducao("vidaUtilImpressoraHoras", e.target.value)
              }
            />
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="custoConsumoEletrico">Consumo elétrico médio (kWh)</label>
            <input
              id="custoConsumoEletrico"
              inputMode="decimal"
              placeholder="0.15"
              value={valores.custoProducao.consumoEletricoKwh}
              onChange={(e) => atualizarCampoCustoProducao("consumoEletricoKwh", e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="custoTarifaEnergia">Tarifa de energia (R$/kWh)</label>
            <input
              id="custoTarifaEnergia"
              inputMode="decimal"
              placeholder="0.90"
              value={valores.custoProducao.tarifaEnergiaReais}
              onChange={(e) => atualizarCampoCustoProducao("tarifaEnergiaReais", e.target.value)}
            />
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="custoValorHoraTrabalho">Valor da hora de trabalho (R$)</label>
            <input
              id="custoValorHoraTrabalho"
              inputMode="decimal"
              placeholder="30.00"
              value={valores.custoProducao.valorHoraTrabalhoReais}
              onChange={(e) =>
                atualizarCampoCustoProducao("valorHoraTrabalhoReais", e.target.value)
              }
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="custoEmbalagem">Custo de embalagem/envio (R$)</label>
            <input
              id="custoEmbalagem"
              inputMode="decimal"
              placeholder="3.50"
              value={valores.custoProducao.custoEmbalagemReais}
              onChange={(e) => atualizarCampoCustoProducao("custoEmbalagemReais", e.target.value)}
            />
          </div>
        </div>

        {camposErro.custoProducao && (
          <span className={styles.fieldError}>{camposErro.custoProducao}</span>
        )}

        {resultadoCogs ? (
          <div className={styles.mlLinkBox}>
            <strong>Custo de produção (COGS): R$ {(resultadoCogs.totalCentavos / 100).toFixed(2)}</strong>
            <span className={styles.mlLinkAviso}>
              Filamento: R$ {(resultadoCogs.custoFilamentoCentavos / 100).toFixed(2)} · Energia: R${" "}
              {(resultadoCogs.custoEnergiaCentavos / 100).toFixed(2)} · Depreciação da impressora: R${" "}
              {(resultadoCogs.custoDepreciacaoCentavos / 100).toFixed(2)} · Mão de obra: R${" "}
              {(resultadoCogs.custoMaoDeObraCentavos / 100).toFixed(2)} · Embalagem: R${" "}
              {(resultadoCogs.custoEmbalagemCentavos / 100).toFixed(2)}
            </span>
          </div>
        ) : (
          camposCustoFaltando.length > 0 && (
            <span className={styles.mlLinkAviso}>
              Preencha também {camposCustoFaltando.join(", ")} para calcular o custo de produção.
            </span>
          )
        )}
      </fieldset>

      <fieldset className={styles.field}>
        <legend>Dados de embalagem para envio (opcional)</legend>
        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="embalagemPeso">Peso da embalagem (g)</label>
            <input
              id="embalagemPeso"
              inputMode="decimal"
              placeholder="250"
              value={valores.embalagemEnvio.pesoGramas}
              onChange={(e) => atualizarCampoEmbalagem("pesoGramas", e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="embalagemAltura">Altura (cm)</label>
            <input
              id="embalagemAltura"
              inputMode="decimal"
              placeholder="10"
              value={valores.embalagemEnvio.alturaCm}
              onChange={(e) => atualizarCampoEmbalagem("alturaCm", e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="embalagemLargura">Largura (cm)</label>
            <input
              id="embalagemLargura"
              inputMode="decimal"
              placeholder="15"
              value={valores.embalagemEnvio.larguraCm}
              onChange={(e) => atualizarCampoEmbalagem("larguraCm", e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="embalagemComprimento">Comprimento (cm)</label>
            <input
              id="embalagemComprimento"
              inputMode="decimal"
              placeholder="20"
              value={valores.embalagemEnvio.comprimentoCm}
              onChange={(e) => atualizarCampoEmbalagem("comprimentoCm", e.target.value)}
            />
          </div>
        </div>

        {camposErro.embalagemEnvio && (
          <span className={styles.fieldError}>{camposErro.embalagemEnvio}</span>
        )}

        {!embalagemEnvioCalculada && camposEmbalagemNaoPreenchidos.length > 0 && (
          <span className={styles.mlLinkAviso}>
            Sem {camposEmbalagemNaoPreenchidos.join(", ")}, o Mercado Livre pode calcular um frete
            impreciso para o comprador (mais caro e/ou mais lento que o necessário).
          </span>
        )}
      </fieldset>

      <SimuladorPrecificacao
        nome={valores.nome}
        categoria={valores.categoria}
        precoVendaReais={valores.precoReais}
        cogsCentavos={resultadoCogs?.totalCentavos ?? null}
        onAplicarPrecoSugerido={(preco) => atualizarCampo("precoReais", preco)}
      />

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
              <span className={styles.mlLinkAviso}>
                Preço, estoque e descrição são atualizados automaticamente no anúncio ao salvar o
                produto. Nome, categoria e fotos não são atualizados sozinhos — para refletir essas
                mudanças, despublique e publique de novo.
              </span>
              <button
                type="button"
                className={styles.btnGhost}
                onClick={handleCorrigirAtributos}
                disabled={corrigindoAtributos}
              >
                {corrigindoAtributos ? "Corrigindo…" : "Corrigir atributos no Mercado Livre"}
              </button>
              <span className={styles.mlLinkAviso}>
                Reaplica Marca/Modelo e peso/dimensões de embalagem corrigidos no anúncio já
                publicado, sem precisar despublicar e publicar de novo.
              </span>
              {erroCorrecaoAtributos && (
                <span className={styles.fieldError}>{erroCorrecaoAtributos}</span>
              )}
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
          <button
            type="button"
            className={styles.btnDanger}
            onClick={() => setConfirmandoExcluir(true)}
            disabled={excluindo}
          >
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
      <ConfirmModal
        aberto={confirmandoExcluir}
        titulo="Remover produto?"
        mensagem={
          valores.mercadoLivreId?.trim()
            ? "Essa ação não pode ser desfeita. Como o produto está publicado no Mercado Livre, o anúncio também será despublicado (fechado) na loja."
            : "Essa ação não pode ser desfeita."
        }
        textoConfirmar="Remover"
        variante="perigo"
        onConfirmar={confirmarExcluir}
        onCancelar={() => setConfirmandoExcluir(false)}
      />
      <Toast mensagem={toastMensagem} aoFechar={() => setToastMensagem(null)} />
    </>
  );
}
