"use client";

import { useEffect, useReducer, useState } from "react";
import {
  adicionarItem,
  alterarQuantidade,
  carregarCarrinho,
  limparCarrinho,
  removerItem,
  salvarCarrinho,
  type ItemCarrinho,
} from "@/lib/carrinho/carrinho";
import { CarrinhoReactContext, type CarrinhoAcao, type CarrinhoEstado } from "./carrinho-context";

function reducer(estado: CarrinhoEstado, acao: CarrinhoAcao): CarrinhoEstado {
  switch (acao.tipo) {
    case "adicionar":
      return { itens: adicionarItem(estado.itens, acao.item) };
    case "alterar":
      return { itens: alterarQuantidade(estado.itens, acao.produtoId, acao.quantidade) };
    case "remover":
      return { itens: removerItem(estado.itens, acao.produtoId) };
    case "limpar":
      return { itens: limparCarrinho() };
  }
}

export default function CarrinhoProvider({ children }: { children: React.ReactNode }) {
  const [estado, dispatch] = useReducer(reducer, { itens: [] });
  const [pronto, setPronto] = useState(false);

  // Hidrata do localStorage apenas no cliente (após o primeiro render),
  // evitando mismatch de SSR e não sobrescrevendo nada antes de carregar.
  useEffect(() => {
    const itensSalvos = carregarCarrinho();
    itensSalvos.forEach((item: ItemCarrinho) =>
      dispatch({ tipo: "adicionar", item: { ...item, quantidade: item.quantidade } })
    );
    setPronto(true);
  }, []);

  useEffect(() => {
    if (pronto) {
      salvarCarrinho(estado.itens);
    }
  }, [estado.itens, pronto]);

  return (
    <CarrinhoReactContext.Provider
      value={{
        itens: estado.itens,
        pronto,
        adicionar: (item) => dispatch({ tipo: "adicionar", item }),
        alterar: (produtoId, quantidade) =>
          dispatch({ tipo: "alterar", produtoId, quantidade }),
        remover: (produtoId) => dispatch({ tipo: "remover", produtoId }),
        limpar: () => dispatch({ tipo: "limpar" }),
      }}
    >
      {children}
    </CarrinhoReactContext.Provider>
  );
}
