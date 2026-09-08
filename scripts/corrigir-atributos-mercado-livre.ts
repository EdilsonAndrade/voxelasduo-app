/**
 * Corrige, num anúncio já publicado no Mercado Livre, os atributos Marca/
 * Modelo (EDI-95) e/ou peso/dimensões de embalagem (EDI-96) — sem
 * despublicar/republicar. Itera sobre todos os produtos com anúncio no
 * Mercado Livre e reaplica os atributos corrigidos em cada um.
 *
 * Não sobe nenhum servidor — só chama a API do Mercado Livre direto, usando
 * as credenciais já configuradas em .env.local. Rode com:
 *
 *   npx tsx scripts/corrigir-atributos-mercado-livre.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { listarProdutosComIntegracaoExterna } from "../lib/produtos/repository";
import { atualizarAtributosAnuncio } from "../lib/estoque/canais/mercadoLivre/anuncios";

function mensagemErro(erro: unknown): string {
  return erro instanceof Error ? erro.message : "Erro desconhecido";
}

async function main() {
  const produtos = await listarProdutosComIntegracaoExterna();
  const comMercadoLivre = produtos.filter((produto) => produto.integracoes?.mercadoLivreId);

  if (comMercadoLivre.length === 0) {
    console.log("Nenhum produto com anúncio no Mercado Livre encontrado.");
    process.exit(0);
  }

  console.log(`Corrigindo atributos de ${comMercadoLivre.length} anúncio(s) no Mercado Livre...`);

  let sucesso = 0;
  let falha = 0;

  for (const produto of comMercadoLivre) {
    const mercadoLivreId = produto.integracoes!.mercadoLivreId!;
    try {
      await atualizarAtributosAnuncio(mercadoLivreId, produto);
      console.log(`✓ ${mercadoLivreId} — ${produto.nome}`);
      sucesso += 1;
    } catch (erro) {
      console.error(`✗ ${mercadoLivreId} — ${produto.nome}: ${mensagemErro(erro)}`);
      falha += 1;
    }
  }

  console.log(`\nConcluído: ${sucesso} corrigido(s), ${falha} com falha.`);
  process.exit(falha > 0 ? 1 : 0);
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
