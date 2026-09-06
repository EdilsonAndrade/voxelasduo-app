/**
 * Cadastra ou atualiza um administrador do painel (Tarefa 9/EDI-86). Não
 * sobe nenhum servidor — só insere/atualiza direto no MongoDB Atlas já
 * configurado em .env.local. Rode com:
 *
 *   npm run seed:admin -- "email@exemplo.com" "senha-forte" "Nome de exibição"
 *
 * Rodar de novo com o mesmo e-mail atualiza a senha/nome existentes (upsert).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import bcrypt from "bcryptjs";
import getMongoClient, { DB_NAME } from "../lib/db/mongodb";
import { USUARIOS_COLLECTION, type Usuario } from "../lib/models/usuario";

async function main() {
  const [email, senha, nome] = process.argv.slice(2);

  if (!email || !senha || !nome) {
    console.error(
      'Uso: npm run seed:admin -- "email@exemplo.com" "senha-forte" "Nome de exibição"'
    );
    process.exit(1);
  }

  if (senha.length < 8) {
    console.error("A senha deve ter pelo menos 8 caracteres.");
    process.exit(1);
  }

  const client = await getMongoClient();
  const colecao = client.db(DB_NAME).collection<Usuario>(USUARIOS_COLLECTION);

  await colecao.createIndex({ email: 1 }, { unique: true });

  const emailNormalizado = email.trim().toLowerCase();
  const senhaHash = await bcrypt.hash(senha, 10);
  const agora = new Date();

  const resultado = await colecao.updateOne(
    { email: emailNormalizado },
    {
      $set: { senhaHash, nome, atualizadoEm: agora },
      $setOnInsert: { email: emailNormalizado, criadoEm: agora },
    },
    { upsert: true }
  );

  if (resultado.upsertedCount > 0) {
    console.log(`+ administrador criado: ${emailNormalizado}`);
  } else {
    console.log(`~ administrador atualizado: ${emailNormalizado}`);
  }

  process.exit(0);
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
