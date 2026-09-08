/**
 * Diagnóstico das alavancas de frete da conta vendedora (EDI-97): reputação
 * (que define o desconto de frete), configuração de envio dos anúncios já
 * publicados e custo do frete cotado ao comprador com e sem frete grátis.
 * Somente leitura (GET) — não altera nenhum anúncio. Rode com:
 *
 *   npx tsx scripts/diagnosticar-frete-mercado-livre.ts [precoReais] [dimensoes] [cepDestino]
 *
 * Ex.: npx tsx scripts/diagnosticar-frete-mercado-livre.ts 27.47 15x10x10,35 01310000
 *
 * **Endpoints indisponíveis para esta aplicação** (respondem HTTP 403
 * `PA_UNAUTHORIZED_RESULT_FROM_POLICIES`, verificado em produção):
 * `/users/{id}/shipping_options/free` (custo do frete grátis para o
 * vendedor, com cobertura por região), `/users/{id}/shipping_preferences`
 * (modos de envio habilitados), `/sites/MLB/shipping_methods` (quais métodos
 * aceitam frete grátis `country`/`region`) e `/items/{id}/shipping_options`.
 * Enquanto essas permissões não forem liberadas no DevCenter, o custo do
 * frete grátis precisa ser estimado pelo `list_cost` de
 * `/users/{id}/shipping_options` (o que o comprador paga hoje).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { obterAccessTokenValido } from "../lib/estoque/canais/mercadoLivre/auth";

const PRECO_REAIS = process.argv[2] ?? "27.47";
const DIMENSOES = process.argv[3] ?? "15x10x10,35";
const CEP_DESTINO = process.argv[4] ?? "01310000";

/** Método de envio "Expresso" (ME2) — único retornado para esta conta/rota. */
const SHIPPING_METHOD_EXPRESSO = 182;

async function get(token: string, url: string) {
  const resposta = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const texto = await resposta.text();
  try {
    return { status: resposta.status, corpo: JSON.parse(texto) as unknown };
  } catch {
    return { status: resposta.status, corpo: texto };
  }
}

function urlOpcoesFrete(userId: number, extra = "") {
  return (
    `https://api.mercadolibre.com/users/${userId}/shipping_options` +
    `?zip_code=${CEP_DESTINO}&item_price=${PRECO_REAIS}&dimensions=${encodeURIComponent(DIMENSOES)}` +
    `&listing_type_id=gold_special&condition=new&verbose=true${extra}`
  );
}

async function main() {
  const token = await obterAccessTokenValido();

  const { corpo: usuario } = await get(token, "https://api.mercadolibre.com/users/me");
  const u = usuario as { id: number; nickname: string; seller_reputation?: unknown };

  console.log("===== Conta vendedora =====");
  console.log(
    JSON.stringify({ id: u.id, nickname: u.nickname, seller_reputation: u.seller_reputation }, null, 2)
  );

  // Anúncios ativos e a configuração de envio de cada um (mode/logistic_type/free_shipping).
  const { corpo: busca } = await get(
    token,
    `https://api.mercadolibre.com/users/${u.id}/items/search?status=active&limit=50`
  );
  const ids = (busca as { results?: string[] }).results ?? [];

  console.log(`\n===== Configuração de envio dos ${ids.length} anúncio(s) ativo(s) =====`);
  for (const id of ids) {
    const { corpo: item } = await get(token, `https://api.mercadolibre.com/items/${id}`);
    const i = item as {
      id: string;
      price: number;
      shipping?: Record<string, unknown>;
    };
    console.log(
      JSON.stringify(
        {
          id: i.id,
          price: i.price,
          mode: i.shipping?.mode,
          logistic_type: i.shipping?.logistic_type,
          free_shipping: i.shipping?.free_shipping,
          local_pick_up: i.shipping?.local_pick_up,
          dimensions: i.shipping?.dimensions,
        },
        null,
        2
      )
    );
  }

  // Frete cotado hoje (comprador paga) x frete grátis oferecido pelo vendedor.
  for (const [titulo, url] of [
    ["Frete cotado ao comprador (situação atual)", urlOpcoesFrete(u.id)],
    [
      "Frete com frete grátis oferecido pelo vendedor",
      urlOpcoesFrete(u.id, `&free_method=${SHIPPING_METHOD_EXPRESSO}`),
    ],
  ] as const) {
    const { status, corpo } = await get(token, url);
    console.log(`\n===== ${titulo} [HTTP ${status}] =====`);
    const opcoes = (corpo as { options?: Array<Record<string, unknown>> }).options;
    console.log(JSON.stringify(opcoes ?? corpo, null, 2));
  }

  process.exit(0);
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
