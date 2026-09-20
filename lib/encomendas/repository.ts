import getMongoClient, { DB_NAME } from "@/lib/db/mongodb";
import { ENCOMENDAS_COLLECTION, type Encomenda } from "@/lib/models/encomenda";

export interface NovaEncomenda {
  nome: string;
  email: string;
  telefone: string;
  descricao: string;
}

/** Grava a encomenda já normalizada (e-mail em minúsculas, telefone só com dígitos). */
export async function criarEncomenda(dados: NovaEncomenda): Promise<Encomenda> {
  const client = await getMongoClient();
  const colecao = client.db(DB_NAME).collection<Encomenda>(ENCOMENDAS_COLLECTION);

  const encomenda: Encomenda = {
    nome: dados.nome.trim(),
    email: dados.email.trim().toLowerCase(),
    telefone: dados.telefone.replace(/\D/g, ""),
    descricao: dados.descricao.trim(),
    criadoEm: new Date(),
  };

  const { insertedId } = await colecao.insertOne(encomenda);
  return { ...encomenda, _id: insertedId };
}
