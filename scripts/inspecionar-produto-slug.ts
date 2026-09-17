/**
 * Diagnóstico de "produto não encontrado" no catálogo público: compara o
 * `categoria`/`slug` gravados no MongoDB, byte a byte (via `codePointAt`),
 * contra o que o card do catálogo gera na URL (`/produtos/${categoria}/${slug}`)
 * — cobre casos de espaço/caractere invisível ou normalização Unicode (NFC x
 * NFD) diferentes que parecem idênticos na tela mas falham no match exato do
 * `findOne({ categoria, slug })`. Somente leitura. Rode com:
 *
 *   npx tsx scripts/inspecionar-produto-slug.ts "termo do nome"
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import getMongoClient, { DB_NAME } from "../lib/db/mongodb";
import { PRODUTOS_COLLECTION, type Produto } from "../lib/models/produto";

function detalhar(campo: string, valor: string) {
  console.log(`  ${campo}: ${JSON.stringify(valor)} (${valor.length} chars, NFC=${
    valor === valor.normalize("NFC")
  }, NFD=${valor === valor.normalize("NFD")})`);
  console.log(`    codePoints: [${Array.from(valor).map((c) => c.codePointAt(0)).join(", ")}]`);
}

async function main() {
  const termo = process.argv[2];
  if (!termo) {
    console.error('Uso: npx tsx scripts/inspecionar-produto-slug.ts "termo do nome"');
    process.exit(1);
  }

  const client = await getMongoClient();
  const colecao = client.db(DB_NAME).collection<Produto>(PRODUTOS_COLLECTION);

  const produtos = await colecao
    .find({ nome: { $regex: termo, $options: "i" } })
    .toArray();

  if (produtos.length === 0) {
    console.log("Nenhum produto encontrado com esse termo.");
    process.exit(0);
  }

  for (const produto of produtos) {
    console.log(`\n=== ${produto.nome} (_id: ${produto._id}) ===`);
    detalhar("categoria", produto.categoria);
    detalhar("slug", produto.slug);
    console.log(`  URL esperada: /produtos/${produto.categoria}/${produto.slug}`);

    // Confere se um findOne com os MESMOS valores lidos do documento realmente bate —
    // se isso falhar, é sinal de índice/collation, não do dado em si.
    const confereMatch = await colecao.findOne({ categoria: produto.categoria, slug: produto.slug });
    console.log(`  findOne({categoria, slug}) com os próprios valores: ${confereMatch ? "OK" : "FALHOU (!)"}`);
  }

  process.exit(0);
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
