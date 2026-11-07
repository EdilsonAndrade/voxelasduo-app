"use client";

import { useRef, useState } from "react";
import { useCarrinho } from "@/components/carrinho/carrinho-context";
import { buscarEnderecoPorCep } from "@/lib/cep/buscarEnderecoPorCep";
import type { OpcaoFrete, ServicoFrete } from "@/lib/models/frete";
import { formatarPreco } from "@/lib/produtos/formato";
import styles from "./checkout.module.css";

interface ItemSemEstoque {
  produtoId: string;
  variacaoId?: string;
  nome: string;
  quantidadeDisponivel: number;
}

interface RespostaErro {
  erro?: string;
  campos?: Record<string, string>;
  itens?: ItemSemEstoque[];
  /** "frete_divergente" quando o valor do frete mudou desde que a página abriu (spec 039). */
  codigo?: string;
  opcoes?: OpcaoFrete[];
}

interface FormularioCheckoutProps {
  aoConcluir: (pedidoId: string) => void;
  opcoesFrete: OpcaoFrete[];
  freteSelecionado: OpcaoFrete | null;
  erroOpcoesFrete: string | null;
  aoEscolherFrete: (servico: ServicoFrete) => void;
  aoAtualizarOpcoesFrete: (opcoes: OpcaoFrete[]) => void;
  aoRecarregarOpcoesFrete: () => void;
  /**
   * Link de pagamento: o pedido é criado em `/api/pagar/{codigo}` com os itens
   * e preços gravados no link — o carrinho não é usado.
   */
  linkPagamento?: { codigo: string; itens: { produtoId: string; variacaoId?: string; nome: string }[] };
}

export default function FormularioCheckout({
  aoConcluir,
  opcoesFrete,
  freteSelecionado,
  erroOpcoesFrete,
  aoEscolherFrete,
  aoAtualizarOpcoesFrete,
  aoRecarregarOpcoesFrete,
  linkPagamento,
}: FormularioCheckoutProps) {
  const { itens: itensCarrinho } = useCarrinho();
  const itens = linkPagamento ? linkPagamento.itens : itensCarrinho;
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

  const [buscandoCep, setBuscandoCep] = useState(false);

  function atualizar(campo: keyof typeof formulario, valor: string) {
    setFormulario((atual) => ({ ...atual, [campo]: valor }));
  }

  async function buscarCep(valor: string) {
    atualizar("cep", valor);
    const digitos = valor.replace(/\D/g, "");
    if (digitos.length !== 8) return;

    setBuscandoCep(true);
    const endereco = await buscarEnderecoPorCep(digitos);
    setBuscandoCep(false);
    if (endereco) {
      setFormulario((atual) => ({
        ...atual,
        logradouro: endereco.logradouro || atual.logradouro,
        bairro: endereco.bairro || atual.bairro,
        cidade: endereco.cidade || atual.cidade,
        estado: endereco.estado || atual.estado,
      }));
    }
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

    const resposta = await fetch(linkPagamento ? `/api/pagar/${linkPagamento.codigo}` : "/api/pedidos", {
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
        ...(linkPagamento
          ? {}
          : {
              itens: itensCarrinho.map((item) => ({
                produtoId: item.produtoId,
                quantidade: item.quantidade,
                ...(item.variacaoId ? { variacaoId: item.variacaoId } : {}),
              })),
            }),
        frete: freteSelecionado
          ? { servico: freteSelecionado.servico, valorCentavos: freteSelecionado.valorCentavos }
          : undefined,
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

    if (resposta.status === 409 && dados.codigo === "frete_divergente") {
      aoAtualizarOpcoesFrete(dados.opcoes ?? []);
      setErroGeral(dados.erro ?? "O valor do frete mudou. Confira a nova opção antes de confirmar.");
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
        `${dados.erro ?? (linkPagamento ? "Não conseguimos criar seu pedido agora. Verifique sua conexão e tente novamente." : "Não conseguimos criar seu pedido agora. Verifique sua conexão e tente novamente — seu carrinho foi preservado.")} (status ${resposta.status})`
      );
      setEnviando(false);
      return;
    }

    // O carrinho só é esvaziado depois do pagamento confirmado (página do pedido).
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
                itens.find(
                  (carrinho) => carrinho.produtoId === item.produtoId && carrinho.variacaoId === item.variacaoId
                )?.nome ?? item.nome;
              return (
                <li key={`${item.produtoId}:${item.variacaoId ?? ""}`}>
                  {nome} — apenas {item.quantidadeDisponivel} un. disponível
                  {item.quantidadeDisponivel === 0 ? " (esgotado)" : ""}
                </li>
              );
            })}
          </ul>
          {linkPagamento ? "Fale com a loja para receber um link atualizado." : "Ajuste seu carrinho para continuar."}
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
          <div className={styles.campo}>
            <label className={styles.rotulo} htmlFor="cep">
              CEP <span>*</span>
            </label>
            <input
              id="cep"
              className={styles.input}
              value={formulario.cep}
              onChange={(e) => buscarCep(e.target.value)}
              autoComplete="postal-code"
              placeholder="01001-000"
            />
            {buscandoCep && <p className={styles.statusCampo}>buscando endereço…</p>}
            {erroDe("cliente.endereco.cep") && (
              <p className={styles.erroCampo}>{erroDe("cliente.endereco.cep")}</p>
            )}
          </div>
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
        </div>
      </section>

      <section className={styles.secao}>
        <p className={styles.secaoTitulo}>entrega</p>
        {erroOpcoesFrete ? (
          <>
            <p className={styles.erroCampo} role="alert">
              {erroOpcoesFrete}
            </p>
            <button type="button" className={styles.botaoTexto} onClick={aoRecarregarOpcoesFrete}>
              tentar de novo
            </button>
          </>
        ) : opcoesFrete.length === 0 ? (
          <p className={styles.statusCampo}>carregando formas de entrega…</p>
        ) : (
          <fieldset className={styles.opcoesEntrega}>
            <legend className={styles.rotulo}>
              forma de entrega <span>*</span>
            </legend>
            {opcoesFrete.map((opcao) => (
              <label key={opcao.servico} className={styles.opcaoEntrega}>
                <input
                  type="radio"
                  name="frete"
                  value={opcao.servico}
                  checked={freteSelecionado?.servico === opcao.servico}
                  onChange={() => aoEscolherFrete(opcao.servico)}
                />
                <span className={styles.opcaoEntregaNome}>{opcao.rotulo}</span>
                <span className={styles.opcaoEntregaValor}>
                  {opcao.valorCentavos === 0 ? "grátis" : formatarPreco(opcao.valorCentavos)}
                </span>
              </label>
            ))}
          </fieldset>
        )}
        {freteSelecionado?.servico === "combinar" && (
          <p className={styles.avisoEntrega}>
            Sem custo de frete: depois da compra, a loja entra em contato para combinar a entrega ou a retirada.
          </p>
        )}
        {erroDe("frete") && <p className={styles.erroCampo}>{erroDe("frete")}</p>}
      </section>

      <button type="submit" className={styles.submit} disabled={enviando}>
        {enviando ? "confirmando…" : "Confirmar pedido"}
      </button>
    </form>
  );
}
