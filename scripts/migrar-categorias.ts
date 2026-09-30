/**
 * Migra a categoria dos produtos de texto livre para as categorias
 * cadastradas (EDI-123). Idempotente. Rode primeiro com `--dry-run` para ver
 * o relatório sem gravar nada:
 *
 *   npx tsx scripts/migrar-categorias.ts --dry-run
 *   npm run migrar:categorias
 */
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const { aplicarMigracao } = await import("../lib/categorias/migracao");
  const { default: getMongoClient } = await import("../lib/db/mongodb");

  const relatorio = await aplicarMigracao({ dryRun });

  console.log(dryRun ? "Simulação (nada foi gravado):" : "Migração concluída:");
  if (relatorio.length === 0) {
    console.log("  Nenhum produto para migrar — todas as categorias já estão cadastradas.");
  }
  for (const linha of relatorio) {
    console.log(`  "${linha.de}" → ${linha.para}: ${linha.produtos} produto(s)`);
    for (const ajuste of linha.slugsAjustados) {
      console.log(`      slug ajustado por conflito: ${ajuste.de} → ${ajuste.para}`);
    }
  }

  await (await getMongoClient()).close();
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
