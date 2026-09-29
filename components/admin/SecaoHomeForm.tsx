"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import SecaoHomePreview from "@/components/admin/SecaoHomePreview";
import Toast from "@/components/admin/Toast";
import type { DadosSecaoHome, ErrosSecaoHome } from "@/lib/home/validation";
import {
  LIMITES_SECAO_HOME,
  ROTULOS_TIPO_SECAO,
  TIPOS_SECAO_HOME,
  type AlinhamentoHorizontal,
  type AlinhamentoVertical,
  type TipoSecaoHome,
} from "@/lib/models/secaoHome";
import adminStyles from "./admin.module.css";
import styles from "./secoesHome.module.css";

interface Props {
  /** Ausente = criação. */
  id?: string;
  inicial?: DadosSecaoHome;
  /** Ex.: "Seção criada." logo após o redirecionamento da criação. */
  mensagemInicial?: string;
}

const VAZIO: DadosSecaoHome = {
  tipo: "bannerHero",
  ativa: false,
  alinhamentoHorizontal: "esquerda",
  alinhamentoVertical: "base",
  limite: LIMITES_SECAO_HOME.carrosselPadrao,
};

function Contador({ valor, maximo }: { valor?: string; maximo: number }) {
  const tamanho = valor?.length ?? 0;
  return (
    <span className={tamanho > maximo ? adminStyles.charCounterExcedido : adminStyles.charCounter}>
      {tamanho}/{maximo}
    </span>
  );
}

function ErroCampo({ mensagem }: { mensagem?: string }) {
  return mensagem ? <span className={adminStyles.fieldError}>{mensagem}</span> : null;
}

export default function SecaoHomeForm({ id, inicial, mensagemInicial }: Props) {
  const router = useRouter();
  const [dados, setDados] = useState<DadosSecaoHome>(inicial ?? VAZIO);
  const [erros, setErros] = useState<ErrosSecaoHome>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [enviandoImagem, setEnviandoImagem] = useState<"imagemDesktop" | "imagemMobile" | null>(null);
  const [toast, setToast] = useState<string | null>(mensagemInicial ?? null);
  const fecharToast = useCallback(() => setToast(null), []);

  const editando = Boolean(id);
  const ehBanner = dados.tipo === "bannerHero" || dados.tipo === "bannerIntermediario";
  const temBotao = ehBanner || dados.tipo === "textoDestaque";

  function alterar<K extends keyof DadosSecaoHome>(campo: K, valor: DadosSecaoHome[K]) {
    setDados((atual) => ({ ...atual, [campo]: valor }));
  }

  function alterarBotao(campo: "texto" | "link", valor: string) {
    setDados((atual) => ({
      ...atual,
      botao: { texto: atual.botao?.texto ?? "", link: atual.botao?.link ?? "", [campo]: valor },
    }));
  }

  async function enviarImagem(campo: "imagemDesktop" | "imagemMobile", arquivo: File | undefined) {
    if (!arquivo) return;
    setEnviandoImagem(campo);
    setErros((atual) => ({ ...atual, [campo]: undefined }));

    const formData = new FormData();
    formData.append("arquivo", arquivo);
    const resposta = await fetch("/api/admin/home/upload", { method: "POST", body: formData });
    const corpo = await resposta.json().catch(() => ({}));
    setEnviandoImagem(null);

    if (!resposta.ok) {
      setErros((atual) => ({ ...atual, [campo]: corpo.erro ?? "Não foi possível enviar a imagem." }));
      return;
    }
    alterar(campo, corpo.url);
  }

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault();
    setSalvando(true);
    setErros({});
    setErroGeral(null);

    const resposta = await fetch(id ? `/api/admin/home/secoes/${id}` : "/api/admin/home/secoes", {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    const corpo = await resposta.json().catch(() => ({}));
    setSalvando(false);

    if (!resposta.ok) {
      setErros(corpo.campos ?? {});
      setErroGeral(corpo.erro === "Payload inválido." ? "Revise os campos destacados." : (corpo.erro ?? `Erro ${resposta.status} ao salvar.`));
      return;
    }

    if (!id) {
      router.push(`/admin/banners/${corpo.secao._id}/editar?criada=1`);
      return;
    }
    setToast("Seção salva.");
    router.refresh();
  }

  return (
    <div className={styles.layoutForm}>
      <form className={adminStyles.form} onSubmit={salvar} noValidate>
        {!editando && (
          <div className={adminStyles.field}>
            <label htmlFor="tipo">Tipo de seção</label>
            <select
              id="tipo"
              value={dados.tipo}
              onChange={(e) => setDados({ ...VAZIO, tipo: e.target.value as TipoSecaoHome })}
            >
              {TIPOS_SECAO_HOME.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {ROTULOS_TIPO_SECAO[tipo]}
                </option>
              ))}
            </select>
            <ErroCampo mensagem={erros.tipo} />
          </div>
        )}

        {ehBanner && (
          <fieldset className={styles.fieldset}>
            <legend>Imagens</legend>
            {(["imagemDesktop", "imagemMobile"] as const).map((campo) => (
              <div className={adminStyles.field} key={campo}>
                <label htmlFor={campo}>
                  {campo === "imagemDesktop" ? "Imagem para computador (obrigatória)" : "Imagem para celular (opcional)"}
                </label>
                <div className={styles.upload}>
                  {dados[campo] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={dados[campo]} alt="" className={styles.uploadMiniatura} />
                  )}
                  <input
                    id={campo}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={enviandoImagem !== null}
                    onChange={(e) => enviarImagem(campo, e.target.files?.[0])}
                  />
                  {campo === "imagemMobile" && dados.imagemMobile && (
                    <button type="button" className={adminStyles.btnGhost} onClick={() => alterar("imagemMobile", "")}>
                      remover
                    </button>
                  )}
                </div>
                {enviandoImagem === campo && <p className={styles.dica}>Enviando imagem…</p>}
                <p className={styles.dica}>
                  {campo === "imagemDesktop"
                    ? "Formato largo, ex.: 2100×900 px. JPEG, PNG ou WebP até 5MB."
                    : "Formato em pé, ex.: 1080×1350 px. Sem ela, o celular usa a imagem para computador."}
                </p>
                <ErroCampo mensagem={erros[campo]} />
              </div>
            ))}
          </fieldset>
        )}

        {ehBanner && (
          <div className={adminStyles.field}>
            <label htmlFor="subtitulo">
              Sobretítulo <Contador valor={dados.subtitulo} maximo={LIMITES_SECAO_HOME.subtitulo} />
            </label>
            <input id="subtitulo" value={dados.subtitulo ?? ""} onChange={(e) => alterar("subtitulo", e.target.value)} />
            <p className={styles.dica}>Frase curta acima do título, em letra cursiva.</p>
            <ErroCampo mensagem={erros.subtitulo} />
          </div>
        )}

        <div className={adminStyles.field}>
          <label htmlFor="titulo">
            Título{ehBanner ? "" : " (obrigatório)"} <Contador valor={dados.titulo} maximo={LIMITES_SECAO_HOME.titulo} />
          </label>
          <input
            id="titulo"
            value={dados.titulo ?? ""}
            placeholder={dados.tipo === "carrossel" ? "Ex.: Favoritos dos clientes" : ""}
            onChange={(e) => alterar("titulo", e.target.value)}
          />
          <ErroCampo mensagem={erros.titulo} />
        </div>

        {dados.tipo !== "carrossel" && (
          <div className={adminStyles.field}>
            <label htmlFor="texto">
              Texto <Contador valor={dados.texto} maximo={LIMITES_SECAO_HOME.texto} />
            </label>
            <textarea id="texto" rows={3} value={dados.texto ?? ""} onChange={(e) => alterar("texto", e.target.value)} />
            <ErroCampo mensagem={erros.texto} />
          </div>
        )}

        {temBotao && (
          <fieldset className={styles.fieldset}>
            <legend>Botão (opcional)</legend>
            <div className={adminStyles.row}>
              <div className={adminStyles.field}>
                <label htmlFor="botaoTexto">Texto do botão</label>
                <input
                  id="botaoTexto"
                  placeholder="Compre agora"
                  maxLength={LIMITES_SECAO_HOME.textoBotao}
                  value={dados.botao?.texto ?? ""}
                  onChange={(e) => alterarBotao("texto", e.target.value)}
                />
              </div>
              <div className={adminStyles.field}>
                <label htmlFor="botaoLink">Link</label>
                <input
                  id="botaoLink"
                  placeholder="/produtos/chaveiros"
                  value={dados.botao?.link ?? ""}
                  onChange={(e) => alterarBotao("link", e.target.value)}
                />
              </div>
            </div>
            <p className={styles.dica}>Use um caminho do site (começando com /) ou um endereço https://.</p>
            <ErroCampo mensagem={erros.botao} />
          </fieldset>
        )}

        {ehBanner && (
          <div className={adminStyles.row}>
            <div className={adminStyles.field}>
              <label htmlFor="alinhamentoHorizontal">Posição do texto</label>
              <select
                id="alinhamentoHorizontal"
                value={dados.alinhamentoHorizontal ?? "esquerda"}
                onChange={(e) => alterar("alinhamentoHorizontal", e.target.value as AlinhamentoHorizontal)}
              >
                <option value="esquerda">Esquerda</option>
                <option value="centro">Centro</option>
                <option value="direita">Direita</option>
              </select>
            </div>
            <div className={adminStyles.field}>
              <label htmlFor="alinhamentoVertical">Altura do texto</label>
              <select
                id="alinhamentoVertical"
                value={dados.alinhamentoVertical ?? "base"}
                onChange={(e) => alterar("alinhamentoVertical", e.target.value as AlinhamentoVertical)}
              >
                <option value="topo">Em cima</option>
                <option value="meio">No meio</option>
                <option value="base">Embaixo</option>
              </select>
            </div>
          </div>
        )}

        {dados.tipo === "carrossel" && (
          <>
            <div className={adminStyles.field}>
              <label htmlFor="linkVerTudo">Link do &quot;Ver tudo&quot; (opcional)</label>
              <input
                id="linkVerTudo"
                placeholder="/produtos"
                value={dados.linkVerTudo ?? ""}
                onChange={(e) => alterar("linkVerTudo", e.target.value)}
              />
              <ErroCampo mensagem={erros.linkVerTudo} />
            </div>
            <div className={adminStyles.field}>
              <label htmlFor="limite">Quantos produtos mostrar na home</label>
              <input
                id="limite"
                type="number"
                min={LIMITES_SECAO_HOME.carrosselMin}
                max={LIMITES_SECAO_HOME.carrosselMax}
                value={dados.limite ?? LIMITES_SECAO_HOME.carrosselPadrao}
                onChange={(e) => alterar("limite", Number(e.target.value))}
              />
              <ErroCampo mensagem={erros.limite} />
            </div>
          </>
        )}

        <label className={styles.linhaCheck}>
          <input type="checkbox" checked={dados.ativa} onChange={(e) => alterar("ativa", e.target.checked)} />
          Mostrar na home
        </label>
        <ErroCampo mensagem={erros.ativa} />

        {erroGeral && <p className={adminStyles.formError}>{erroGeral}</p>}

        <div className={adminStyles.actions}>
          <button type="submit" className={adminStyles.btnPrimary} disabled={salvando || enviandoImagem !== null}>
            {salvando ? "Salvando…" : editando ? "Salvar alterações" : "Criar seção"}
          </button>
          <button type="button" className={adminStyles.btnGhost} onClick={() => router.push("/admin/banners")}>
            Voltar
          </button>
        </div>
      </form>

      <SecaoHomePreview dados={dados} />
      <Toast mensagem={toast} aoFechar={fecharToast} />
    </div>
  );
}
