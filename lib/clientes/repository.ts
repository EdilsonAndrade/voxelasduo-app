import { ObjectId } from "mongodb";
import getMongoClient, { DB_NAME } from "@/lib/db/mongodb";
import {
  CLIENTES_COLLECTION,
  type Cliente,
  type EnderecoCliente,
  type RecuperacaoSenha,
  type VerificacaoEmail,
} from "@/lib/models/cliente";

let indicesGarantidos: Promise<void> | undefined;

export async function colecaoClientes() {
  const client = await getMongoClient();
  const colecao = client.db(DB_NAME).collection<Cliente>(CLIENTES_COLLECTION);

  // Chave de unificação entre e-mail/senha e Google (research.md #2) — garante
  // uma única vez por instância (idempotente no MongoDB).
  if (!indicesGarantidos) {
    indicesGarantidos = colecao.createIndex({ email: 1 }, { unique: true }).then(() => undefined);
  }
  await indicesGarantidos;

  return colecao;
}

function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function buscarClientePorEmail(email: string): Promise<Cliente | null> {
  const colecao = await colecaoClientes();
  return colecao.findOne({ email: normalizarEmail(email) });
}

export async function buscarClientePorId(id: string): Promise<Cliente | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }
  const colecao = await colecaoClientes();
  return colecao.findOne({ _id: new ObjectId(id) });
}

/** Lançado quando já existe um cliente com login por e-mail/senha para o e-mail informado (US1 AC3). */
export class ErroClienteJaCadastrado extends Error {
  constructor() {
    super("E-mail já cadastrado.");
    this.name = "ErroClienteJaCadastrado";
  }
}

export interface CriarClienteCredenciaisInput {
  nome: string;
  email: string;
  senhaHash: string;
}

/**
 * Cria um cliente por e-mail/senha ou, se já existir uma conta criada via
 * Google com o mesmo e-mail, unifica adicionando `senhaHash` a ela em vez de
 * criar um segundo documento (research.md #2, spec.md US1 AC5). Só lança
 * `ErroClienteJaCadastrado` quando o e-mail já tem `senhaHash` — ou seja,
 * quando de fato já existe uma conta de e-mail/senha.
 */
export async function criarClienteCredenciais(input: CriarClienteCredenciaisInput): Promise<Cliente> {
  const email = normalizarEmail(input.email);
  const colecao = await colecaoClientes();
  const existente = await colecao.findOne({ email });
  const agora = new Date();

  if (existente) {
    if (existente.senhaHash) {
      throw new ErroClienteJaCadastrado();
    }

    // Existe só por Google — unifica adicionando a senha à mesma conta.
    await colecao.updateOne(
      { _id: existente._id },
      { $set: { senhaHash: input.senhaHash, nome: input.nome, atualizadoEm: agora } }
    );
    return { ...existente, senhaHash: input.senhaHash, nome: input.nome, atualizadoEm: agora };
  }

  const cliente: Omit<Cliente, "_id"> = {
    nome: input.nome,
    email,
    senhaHash: input.senhaHash,
    emailVerificado: false,
    criadoEm: agora,
    atualizadoEm: agora,
  };
  const resultado = await colecao.insertOne(cliente as Cliente);
  return { ...cliente, _id: resultado.insertedId };
}

/** Grava o código de verificação de e-mail (hash + expiração), sobrescrevendo qualquer código anterior. */
export async function definirCodigoVerificacao(
  clienteId: ObjectId,
  verificacaoEmail: VerificacaoEmail
): Promise<void> {
  const colecao = await colecaoClientes();
  await colecao.updateOne(
    { _id: clienteId },
    { $set: { verificacaoEmail, atualizadoEm: new Date() } }
  );
}

/** Confirma a posse do e-mail e invalida o código de verificação usado. */
export async function marcarEmailVerificado(clienteId: ObjectId): Promise<void> {
  const colecao = await colecaoClientes();
  await colecao.updateOne(
    { _id: clienteId },
    { $set: { emailVerificado: true, atualizadoEm: new Date() }, $unset: { verificacaoEmail: "" } }
  );
}

/** Grava o código de recuperação (hash + expiração), sobrescrevendo qualquer código anterior. */
export async function definirCodigoRecuperacao(
  clienteId: ObjectId,
  recuperacaoSenha: RecuperacaoSenha
): Promise<void> {
  const colecao = await colecaoClientes();
  await colecao.updateOne(
    { _id: clienteId },
    { $set: { recuperacaoSenha, atualizadoEm: new Date() } }
  );
}

/** Define a nova senha e invalida o código de recuperação usado. */
export async function redefinirSenhaCliente(clienteId: ObjectId, senhaHash: string): Promise<void> {
  const colecao = await colecaoClientes();
  await colecao.updateOne(
    { _id: clienteId },
    { $set: { senhaHash, atualizadoEm: new Date() }, $unset: { recuperacaoSenha: "" } }
  );
}

export interface AtualizarDadosClienteInput {
  telefone?: string;
  endereco?: EnderecoCliente;
}

/** Atualiza somente os campos de cadastro enviados (Tarefa 10/EDI-84, US5). */
export async function atualizarDadosCliente(
  clienteId: ObjectId,
  dados: AtualizarDadosClienteInput
): Promise<Cliente | null> {
  const colecao = await colecaoClientes();
  const set: Record<string, unknown> = { atualizadoEm: new Date() };
  if (dados.telefone !== undefined) set.telefone = dados.telefone;
  if (dados.endereco !== undefined) set.endereco = dados.endereco;

  return colecao.findOneAndUpdate({ _id: clienteId }, { $set: set }, { returnDocument: "after" });
}

export interface CriarOuUnificarClienteGoogleInput {
  nome: string;
  email: string;
  googleId: string;
}

/**
 * Autentica via Google: unifica com um cliente já existente pelo mesmo
 * e-mail (criado por e-mail/senha ou por um login Google anterior) ou cria
 * um novo cliente só com `googleId` (research.md #2, spec.md US1 AC5).
 */
export async function criarOuUnificarClienteGoogle(
  input: CriarOuUnificarClienteGoogleInput
): Promise<Cliente> {
  const email = normalizarEmail(input.email);
  const colecao = await colecaoClientes();
  const existente = await colecao.findOne({ email });
  const agora = new Date();

  if (existente) {
    if (existente.googleId === input.googleId && existente.emailVerificado) {
      return existente;
    }
    // Login via Google prova a posse do e-mail — unifica e já marca verificado,
    // mesmo que a conta tenha sido criada antes por e-mail/senha sem confirmar.
    await colecao.updateOne(
      { _id: existente._id },
      { $set: { googleId: input.googleId, emailVerificado: true, atualizadoEm: agora } }
    );
    return { ...existente, googleId: input.googleId, emailVerificado: true, atualizadoEm: agora };
  }

  const cliente: Omit<Cliente, "_id"> = {
    nome: input.nome,
    email,
    googleId: input.googleId,
    emailVerificado: true,
    criadoEm: agora,
    atualizadoEm: agora,
  };
  const resultado = await colecao.insertOne(cliente as Cliente);
  return { ...cliente, _id: resultado.insertedId };
}
