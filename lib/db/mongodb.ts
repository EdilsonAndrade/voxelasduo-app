import { MongoClient } from "mongodb";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

// Lazy singleton: a conexão só é aberta na primeira chamada real, não no
// carregamento do módulo. Isso evita que `next build` falhe quando
// MONGODB_URI ainda não está configurada (ex.: antes do primeiro deploy).
export default function getMongoClient(): Promise<MongoClient> {
  if (global._mongoClientPromise) {
    return global._mongoClientPromise;
  }

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      "MONGODB_URI não está definida. Configure-a em .env.local (dev) ou nas variáveis de ambiente do projeto na Vercel (produção)."
    );
  }

  const clientPromise = new MongoClient(uri).connect();

  // Reutiliza a mesma conexão entre invocações de função serverless em
  // desenvolvimento (evita esgotar o limite de conexões do tier M0 do Atlas
  // a cada hot-reload). Em produção, cada instância mantém seu próprio
  // singleton em memória — comportamento equivalente por invocação.
  global._mongoClientPromise = clientPromise;

  return clientPromise;
}

export const DB_NAME = "voxelasduo";
