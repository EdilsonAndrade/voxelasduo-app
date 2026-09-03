"use client";

import { createContext, useContext } from "react";
import type { ItemCarrinho } from "@/lib/carrinho/carrinho";

export interface CarrinhoEstado {
  itens: ItemCarrinho[];
}

export type CarrinhoAcao =
  | { tipo: "adicionar"; item: Omit<ItemCarrinho, "quantidade"> & { quantidade: number } }
  | { tipo: "alterar"; produtoId: string; quantidade: number }
  | { tipo: "remover"; produtoId: string }
  | { tipo: "limpar" };

export interface CarrinhoContexto extends CarrinhoEstado {
  /** Verdadeiro após a hidratação do localStorage no cliente. */
  pronto: boolean;
  adicionar: (item: Omit<ItemCarrinho, "quantidade"> & { quantidade: number }) => void;
  alterar: (produtoId: string, quantidade: number) => void;
  remover: (produtoId: string) => void;
  limpar: () => void;
}

export const CarrinhoReactContext = createContext<CarrinhoContexto | null>(null);

export function useCarrinho(): CarrinhoContexto {
  const contexto = useContext(CarrinhoReactContext);
  if (!contexto) {
    throw new Error("useCarrinho deve ser usado dentro de <CarrinhoProvider>.");
  }
  return contexto;
}
