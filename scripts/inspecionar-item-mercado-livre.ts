/**
 * Consulta um item no Mercado Livre e mostra os campos relevantes de
 * atributos (Marca/Modelo/embalagem/ficha técnica) e de frete
 * (`shipping`), além da descrição, para diagnosticar anúncios com problema
 * (EDI-95/EDI-96/EDI-90) sem precisar abrir o painel do vendedor. Não sobe
 * nenhum servidor. Rode com:
 *
 *   npx tsx scripts/inspecionar-item-mercado-livre.ts MLB1234567890
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { obterAccessTokenValido } from "../lib/estoque/canais/mercadoLivre/auth";

async function main() {
  const itemId = process.argv[2];
  if (!itemId) {
    console.error("Uso: npx tsx scripts/inspecionar-item-mercado-livre.ts MLB1234567890");
    process.exit(1);
  }

  const token = await obterAccessTokenValido();
  const resposta = await fetch(`https://api.mercadolibre.com/items/${itemId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!resposta.ok) {
    console.error(`HTTP ${resposta.status}`, await resposta.text());
    process.exit(1);
  }

  const item = await resposta.json();

  console.log("status/sub_status:", item.status, item.sub_status);
  console.log(
    "pictures:",
    JSON.stringify(
      item.pictures?.map((p: { id: string; url: string; size?: string; max_size?: string }) => ({
        id: p.id,
        url: p.url,
        size: p.size,
        max_size: p.max_size,
      })),
      null,
      2
    )
  );
  console.log("shipping:", JSON.stringify(item.shipping, null, 2));
  console.log(
    "attributes (BRAND/MODEL/SELLER_PACKAGE_*/ficha técnica):",
    JSON.stringify(
      item.attributes.filter((a: { id: string }) =>
        [
          "BRAND",
          "MODEL",
          "SELLER_PACKAGE_WEIGHT",
          "SELLER_PACKAGE_HEIGHT",
          "SELLER_PACKAGE_WIDTH",
          "SELLER_PACKAGE_LENGTH",
          "HEIGHT",
          "WIDTH",
          "LENGTH",
          "WEIGHT",
          "MATERIAL",
        ].includes(a.id)
      ),
      null,
      2
    )
  );

  const respostaDescricao = await fetch(
    `https://api.mercadolibre.com/items/${itemId}/description`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (respostaDescricao.ok) {
    const descricao = await respostaDescricao.json();
    console.log("descrição (plain_text):", descricao.plain_text);
  }

  process.exit(0);
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
