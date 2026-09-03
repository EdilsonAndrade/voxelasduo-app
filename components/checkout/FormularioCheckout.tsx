"use client";

import { useRef, useState } from "react";
import { useCarrinho } from "@/components/carrinho/carrinho-context";
import styles from "./checkout.module.css";

interface ItemSemEstoque {
  produtoId: string;
  nome: string;
  quantidadeDisponivel: number;
}

interface RespostaErro {
  erro?: string;
  campos?: Record<string, string>;
  itens?: ItemSemEstoque[];
}

interface FormularioCheckoutProps {
  aoConcluir: (pedidoId: string) => void;
}

export default function FormularioCheckout({ aoConcluir }: FormularioCheckoutProps) {
  const { itens, limpar } = useCarrinho();
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroEstoque, setErroEstoque] = useState<ItemSemEstoque[] | null>(null);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const idempotencia = useRef<string>(
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now())
  );

  const [formulario, setFormulario] = useState({
    nome: "",
    email: "",
    telefone: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
    cep: "",
  });

  function atualizar(campo: keyof typeof formulario, valor: string) {
    setFormulario((atual) => ({ ...atual, [campo]: valor }));
  }

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) {
      return;
    }
    setEnviando(true);
    setErroGeral(null);
    setErroEstoque(null);
    setErros({});

    const resposta = await fetch("/api/pedidos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idempotencia: idempotencia.current,
        cliente: {
          nome: formulario.nome,
          email: formulario.email,
          telefone: formulario.telefone,
          endereco: {
            logradouro: formulario.logradouro,
            numero: formulario.numero,
            complemento: formulario.complemento,
            bairro: formulario.bairro,
            cidade: formulario.cidade,
            estado: formulario.estado.toUpperCase(),
            cep: formulario.cep,
          },
        },
        itens: itens.map((item) => ({
          produtoId: item.produtoId,
          quantidade: item.quantidade,
        })),
      }),
    });

    const dados = (await resposta.json()) as RespostaErro & {
      pedido?: { id: string };
    };

    if (resposta.status === 400) {
      setErros(dados.campos ?? {});
      setEnviando(false);
      return;
    }

    if (resposta.status === 409) {
      setErroEstoque(dados.itens ?? []);
      setEnviando(false);
      return;
    }

    if (!resposta.ok || !dados.pedido) {
      setErroGeral(
        "Não conseguimos criar seu pedido agora. Verifique sua conexão e tente novamente — seu carrinho foi preservado."
      );
      setEnviando(false);
      return;
    }

    limpar();
    aoConcluir(dados.pedido.id);
  }

  function erroDe(campo: string): string | undefined {
    return erros[campo];
  }

  return (
    <form className={styles.formulario} onSubmit={enviar} noValidate>
      {erroGeral && (
        <div className={styles.erroGeral} role="alert">
          {erroGeral}
        </div>
      )}
      {erroEstoque && erroEstoque.length > 0 && (
        <div className={styles.erroGeral} role="alert">
          Alguns itens não estão mais disponíveis:
          <ul>
            {erroEstoque.map((item) => {
              const nome =
                itens.find((carrinho) => carrinho.produtoId === item.produtoId)?.nome ??
                item.nome;
              return (
                <li key={item.produtoId}>
                  {nome} — apenas {item.quantidadeDisponivel} un. disponível
                  {item.quantidadeDisponivel === 0 ? " (esgotado)" : ""}
                </li>
              );
            })}
          </ul>
          Ajuste seu carrinho para continuar.
        </div>
      )}

      <section className={styles.secao}>
        <p className={`${styles.secaoTitulo} ${styles.secaoTituloRosa}`}>seus dados</p>
        <div className={styles.campos}>
          <div className={styles.campo}>
            <label className={styles.rotulo} htmlFor="nome">
              nome <span>*</span>
            </label>
            <input
              id="nome"
              className={styles.input}
              value={formulario.nome}
              onChange={(e) => atualizar("nome", e.target.value)}
              autoComplete="name"
            />
            {erroDe("cliente.nome") && <p className={styles.erroCampo}>{erroDe("cliente.nome")}</p>}
          </div>
          <div className={styles.campo}>
            <label className={styles.rotulo} htmlFor="email">
              e-mail <span>*</span>
            </label>
            <input
              id="email"
              type="email"
              className={styles.input}
              value={formulario.email}
              onChange={(e) => atualizar("email", e.target.value)}
              autoComplete="email"
            />
            {erroDe("cliente.email") && (
              <p className={styles.erroCampo}>{erroDe("cliente.email")}</p>
            )}
          </div>
          <div className={styles.campo}>
            <label className={styles.rotulo} htmlFor="telefone">
              telefone
            </label>
            <input
              id="telefone"
              type="tel"
              className={styles.input}
              value={formulario.telefone}
              onChange={(e) => atualizar("telefone", e.target.value)}
              autoComplete="tel"
              placeholder="(11) 99999-8888"
            />
            {erroDe("cliente.telefone") && (
              <p className={styles.erroCampo}>{erroDe("cliente.telefone")}</p>
            )}
          </div>
        </div>
      </section>

      <section className={styles.secao}>
        <p className={styles.secaoTitulo}>sua casa</p>
        <div className={styles.campos}>
          <div className={`${styles.campo} ${styles.campoLargo}`}>
            <label className={styles.rotulo} htmlFor="logradouro">
              rua <span>*</span>
            </label>
            <input
              id="logradouro"
              className={styles.input}
              value={formulario.logradouro}
              onChange={(e) => atualizar("logradouro", e.target.value)}
              autoComplete="address-line1"
            />
            {erroDe("cliente.endereco.logradouro") && (
              <p className={styles.erroCampo}>{erroDe("cliente.endereco.logradouro")}</p>
            )}
          </div>
          <div className={styles.campo}>
            <label className={styles.rotulo} htmlFor="numero">
              número <span>*</span>
            </label>
            <input
              id="numero"
              className={styles.input}
              value={formulario.numero}
              onChange={(e) => atualizar("numero", e.target.value)}
            />
            {erroDe("cliente.endereco.numero") && (
              <p className={styles.erroCampo}>{erroDe("cliente.endereco.numero")}</p>
            )}
          </div>
          <div className={styles.campo}>
            <label className={styles.rotulo} htmlFor="complemento">
              complemento
            </label>
            <input
              id="complemento"
              className={styles.input}
              value={formulario.complemento}
              onChange={(e) => atualizar("complemento", e.target.value)}
            />
          </div>
          <div className={styles.campo}>
            <label className={styles.rotulo} htmlFor="bairro">
              bairro <span>*</span>
            </label>
            <input
              id="bairro"
              className={styles.input}
              value={formulario.bairro}
              onChange={(e) => atualizar("bairro", e.target.value)}
            />
            {erroDe("cliente.endereco.bairro") && (
              <p className={styles.erroCampo}>{erroDe("cliente.endereco.bairro")}</p>
            )}
          </div>
          <div className={styles.campo}>
            <label className={styles.rotulo} htmlFor="cidade">
              cidade <span>*</span>
            </label>
            <input
              id="cidade"
              className={styles.input}
              value={formulario.cidade}
              onChange={(e) => atualizar("cidade", e.target.value)}
              autoComplete="address-level2"
            />
            {erroDe("cliente.endereco.cidade") && (
              <p className={styles.erroCampo}>{erroDe("cliente.endereco.cidade")}</p>
            )}
          </div>
          <div className={styles.campo}>
            <label className={styles.rotulo} htmlFor="estado">
              estado <span>*</span>
            </label>
            <input
              id="estado"
              className={styles.input}
              value={formulario.estado}
              onChange={(e) => atualizar("estado", e.target.value.toUpperCase())}
              maxLength={2}
              placeholder="SP"
              autoComplete="address-level1"
            />
            {erroDe("cliente.endereco.estado") && (
              <p className={styles.erroCampo}>{erroDe("cliente.endereco.estado")}</p>
            )}
          </div>
          <div className={styles.campo}>
            <label className={styles.rotulo} htmlFor="cep">
              CEP <span>*</span>
            </label>
            <input
              id="cep"
              className={styles.input}
              value={formulario.cep}
              onChange={(e) => atualizar("cep", e.target.value)}
              autoComplete="postal-code"
              placeholder="01001-000"
            />
            {erroDe("cliente.endereco.cep") && (
              <p className={styles.erroCampo}>{erroDe("cliente.endereco.cep")}</p>
            )}
          </div>
        </div>
      </section>

      <button type="submit" className={styles.submit} disabled={enviando}>
        {enviando ? "confirmando…" : "Confirmar pedido"}
      </button>
    </form>
  );
}
