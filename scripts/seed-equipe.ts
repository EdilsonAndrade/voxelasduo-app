/**
 * Cadastra ou atualiza os usuários da equipe de evento (EDI-125): malu,
 * isadora, ana e edilson, com papel "equipe" (acesso só a /admin/evento).
 * A senha é passada por argumento e gravada apenas como hash bcrypt — nunca
 * fica no código. Rode com:
 *
 *   npm run seed:equipe -- "<senha>"
 *
 * Rodar de novo troca a senha de todos (upsert).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import bcrypt from "bcryptjs";
import getMongoClient, { DB_NAME } from "../lib/db/mongodb";
import { USUARIOS_COLLECTION, type Usuario } from "../lib/models/usuario";

const EQUIPE = [
  { usuario: "malu", nome: "Malu" },
  { usuario: "isadora", nome: "Isadora" },
  { usuario: "ana", nome: "Ana" },
  { usuario: "edilson", nome: "Edilson" },
];

async function main() {
  const [senha] = process.argv.slice(2);

  if (!senha || senha.length < 6) {
    console.error('Uso: npm run seed:equipe -- "<senha com pelo menos 6 caracteres>"');
    process.exit(1);
  }

  const client = await getMongoClient();
  const colecao = client.db(DB_NAME).collection<Usuario>(USUARIOS_COLLECTION);

  await colecao.createIndex({ email: 1 }, { unique: true });
  await colecao.createIndex(
    { usuario: 1 },
    { unique: true, partialFilterExpression: { usuario: { $type: "string" } } }
  );

  const senhaHash = await bcrypt.hash(senha, 10);
  const agora = new Date();

  for (const { usuario, nome } of EQUIPE) {
    // E-mail técnico só para manter o índice único de e-mail; nunca é exibido nem usado no login.
    const email = `${usuario}@equipe.voxelasduo.local`;
    const resultado = await colecao.updateOne(
      { usuario },
      {
        $set: { senhaHash, nome, papel: "equipe", atualizadoEm: agora },
        $setOnInsert: { usuario, email, criadoEm: agora },
      },
      { upsert: true }
    );
    console.log(`${resultado.upsertedCount > 0 ? "+ criado" : "~ atualizado"}: ${usuario}`);
  }

  process.exit(0);
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
