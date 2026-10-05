"use client";

import { useState } from "react";
import styles from "./producao.module.css";

export type EstadoConexao = "ausente" | "ativa" | "expirada";

export interface ConexaoAtual {
  estado: EstadoConexao;
  expiraEm: string | null;
  ativadoEm: string | null;
}

const TEXTO_ESTADO: Record<EstadoConexao, string> = {
  ativa: "Conexão ativa",
  expirada: "Conexão expirada",
  ausente: "Sem conexão",
};

const PONTO: Record<EstadoConexao, string> = {
  ativa: styles.pontoAtiva,
  expirada: styles.pontoExpirada,
  ausente: styles.pontoAusente,
};

function formatarData(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-BR");
}

/**
 * Conexão com a conta da Bambu Lab. Quando está ativa é só uma linha de
 * estado: ela importa quando quebra. O formulário aparece ao conectar ou
 * reconectar, e "colar token" fica como alternativa para quando o login do
 * fabricante mudar — é uma API não oficial.
 */
export default function ConexaoBambu({
  conexao,
  onAlterada,
}: {
  conexao: ConexaoAtual;
  onAlterada: () => void;
}) {
  /*
   * `null` = ninguém mexeu, então o formulário segue o estado real da conexão.
   * Guardar um booleano direto aqui congelaria a decisão tomada no primeiro
   * render — quando o estado ainda é "ausente", porque a resposta do servidor
   * não chegou — e o formulário ficaria aberto mesmo com a conexão ativa,
   * parecendo que é preciso reconectar a cada visita.
   */
  const [abertoManual, setAbertoManual] = useState<boolean | null>(null);
  const aberto = abertoManual ?? conexao.estado !== "ativa";
  const [modoToken, setModoToken] = useState(false);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [codigo, setCodigo] = useState("");
  const [token, setToken] = useState("");
  const [tfaKey, setTfaKey] = useState<string | null>(null);
  const [precisaCodigo, setPrecisaCodigo] = useState<"email" | "totp" | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(corpo: Record<string, unknown>) {
    setEnviando(true);
    setErro(null);
    setAviso(null);

    try {
      const resposta = await fetch("/api/producao/conexao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const dados = await resposta.json().catch(() => ({}) as Record<string, string>);

      if (resposta.status === 202) {
        setPrecisaCodigo(dados.metodo);
        setTfaKey(dados.tfaKey ?? null);
        setAviso(
          dados.metodo === "totp"
            ? "Digite o código do seu aplicativo autenticador."
            : "A Bambu Lab enviou um código de 6 dígitos para o seu e-mail."
        );
        return;
      }

      if (!resposta.ok) {
        // Mostra o status real da origem, sem mensagem genérica.
        setErro(dados.erro ?? `Falha ao conectar (HTTP ${resposta.status}).`);
        return;
      }

      setSenha("");
      setCodigo("");
      setToken("");
      setPrecisaCodigo(null);
      setTfaKey(null);
      setAbertoManual(false);
      onAlterada();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Falha de rede ao conectar.");
    } finally {
      setEnviando(false);
    }
  }

  async function desconectar() {
    setEnviando(true);
    try {
      await fetch("/api/producao/conexao", { method: "DELETE" });
      onAlterada();
      setAbertoManual(true);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section>
      <div className={styles.barraConexao}>
        <span className={`${styles.ponto} ${PONTO[conexao.estado]}`} aria-hidden="true" />
        <strong>{TEXTO_ESTADO[conexao.estado]}</strong>

        {conexao.estado === "ativa" && conexao.expiraEm && (
          <span className={styles.conexaoInfo}>
            o acesso vence em {formatarData(conexao.expiraEm)}
          </span>
        )}
        {conexao.estado === "expirada" && (
          <span className={styles.conexaoInfo}>
            reconecte para voltar a importar as impressões
          </span>
        )}

        <button
          type="button"
          className={styles.botaoTexto}
          onClick={() => setAbertoManual(!aberto)}
        >
          {aberto ? "Fechar" : conexao.estado === "ativa" ? "Reconectar" : "Conectar conta"}
        </button>

        {conexao.estado !== "ausente" && (
          <button
            type="button"
            className={styles.botaoTexto}
            onClick={desconectar}
            disabled={enviando}
          >
            Remover acesso
          </button>
        )}
      </div>

      {aberto && (
        <div className={styles.bloco} style={{ marginTop: "0.8rem" }}>
          {modoToken ? (
            <form
              className={styles.formConexao}
              onSubmit={(evento) => {
                evento.preventDefault();
                enviar({ modo: "token", accessToken: token });
              }}
            >
              <label className={styles.campo}>
                <span className={styles.rotulo}>Token de acesso</span>
                <input
                  className={styles.entrada}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="cole aqui o token da sua sessão em bambulab.com"
                />
              </label>
              <button className={styles.botao} disabled={enviando || !token.trim()}>
                Guardar token
              </button>
              <button
                type="button"
                className={styles.botaoTexto}
                onClick={() => setModoToken(false)}
              >
                Voltar para e-mail e senha
              </button>
            </form>
          ) : precisaCodigo ? (
            <form
              className={styles.formConexao}
              onSubmit={(evento) => {
                evento.preventDefault();
                enviar(
                  precisaCodigo === "totp"
                    ? { modo: "totp", tfaKey, codigo }
                    : { modo: "codigo", email, codigo }
                );
              }}
            >
              <label className={`${styles.campo} ${styles.campoCurto}`}>
                <span className={styles.rotulo}>Código de verificação</span>
                <input
                  className={styles.entrada}
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                />
              </label>
              <button className={styles.botao} disabled={enviando || !codigo.trim()}>
                Confirmar código
              </button>
              {precisaCodigo === "email" && (
                <button
                  type="button"
                  className={styles.botaoTexto}
                  onClick={async () => {
                    await fetch("/api/producao/conexao/codigo", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email }),
                    });
                    setAviso("Pedimos outro código para a Bambu Lab.");
                  }}
                >
                  Enviar outro código
                </button>
              )}
            </form>
          ) : (
            <form
              className={styles.formConexao}
              onSubmit={(evento) => {
                evento.preventDefault();
                enviar({ modo: "senha", email, senha });
              }}
            >
              <label className={styles.campo}>
                <span className={styles.rotulo}>E-mail da conta Bambu Lab</span>
                <input
                  className={styles.entrada}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                />
              </label>
              <label className={styles.campo}>
                <span className={styles.rotulo}>Senha</span>
                <input
                  className={styles.entrada}
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  autoComplete="current-password"
                />
              </label>
              <button className={styles.botao} disabled={enviando || !email.trim() || !senha}>
                Conectar
              </button>
              <button
                type="button"
                className={styles.botaoTexto}
                onClick={() => setModoToken(true)}
              >
                Colar token
              </button>
            </form>
          )}

          {aviso && <p className={styles.ok}>{aviso}</p>}
          {erro && <p className={styles.erro}>{erro}</p>}
        </div>
      )}
    </section>
  );
}
