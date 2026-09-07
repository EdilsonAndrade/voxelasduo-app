import type { ObjectId } from "mongodb";

export const CLIENTES_COLLECTION = "clientes";

export interface EnderecoCliente {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
}

export interface RecuperacaoSenha {
  /** Hash bcrypt do código de 6 dígitos — nunca armazenado em texto puro. */
  codigoHash: string;
  expiraEm: Date;
}

/** Mesmo formato de `RecuperacaoSenha`, usado para confirmar posse do e-mail no cadastro por senha. */
export interface VerificacaoEmail {
  codigoHash: string;
  expiraEm: Date;
}

/**
 * Comprador do site (Tarefa 10/EDI-84) — distinto do `Usuario` do painel
 * administrativo (Tarefa 9/EDI-86). Um cliente sempre tem ao menos um método
 * de login: `senhaHash` (e-mail/senha) e/ou `googleId` (login social),
 * unificados pelo mesmo `email` (research.md #2).
 */
export interface Cliente {
  _id?: ObjectId;
  nome: string;
  /** Identificador de login; sempre normalizado em minúsculas antes de gravar/comparar. */
  email: string;
  /** Presente somente quando o cliente tem login por e-mail/senha. */
  senhaHash?: string;
  /** Presente somente quando o cliente já autenticou via Google ao menos uma vez. */
  googleId?: string;
  telefone?: string;
  endereco?: EnderecoCliente;
  /**
   * Login por e-mail/senha exige confirmar posse do e-mail antes de liberar
   * acesso (correção pós-EDI-84). Contas via Google já nascem verificadas
   * (o Google já provou a posse do e-mail) — ver `criarOuUnificarClienteGoogle`.
   */
  emailVerificado: boolean;
  /** Presente apenas durante o cadastro, até o código de verificação ser confirmado. */
  verificacaoEmail?: VerificacaoEmail;
  /** Presente apenas durante um fluxo de recuperação de senha em andamento. */
  recuperacaoSenha?: RecuperacaoSenha;
  criadoEm: Date;
  atualizadoEm: Date;
}
