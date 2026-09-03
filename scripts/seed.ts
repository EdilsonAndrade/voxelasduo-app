/**
 * Popula o catálogo com produtos de demonstração para visualização do site.
 * Não sobe nenhum servidor — só insere documentos direto no MongoDB Atlas
 * já configurado em .env.local. Rode com `npm run seed`.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import getMongoClient, { DB_NAME } from "../lib/db/mongodb";
import { PRODUTOS_COLLECTION, type Produto } from "../lib/models/produto";
import { gerarSlug } from "../lib/produtos/slug";

function fotoMock(cor: string, forma: "voxel" | "coracao" | "estrela"): string {
  const formas: Record<typeof forma, string> = {
    voxel:
      '<path d="M100 30 L165 65 L165 135 L100 170 L35 135 L35 65 Z" fill="none" stroke="#11111122" stroke-width="2"/>' +
      `<path d="M100 30 L165 65 L100 100 L35 65 Z" fill="${cor}"/>` +
      `<path d="M35 65 L100 100 L100 170 L35 135 Z" fill="${cor}" opacity="0.75"/>` +
      `<path d="M165 65 L165 135 L100 170 L100 100 Z" fill="${cor}" opacity="0.55"/>`,
    coracao:
      `<path d="M100 165 L40 110 C15 85 25 45 60 45 C80 45 95 55 100 70 C105 55 120 45 140 45 C175 45 185 85 160 110 Z" fill="${cor}"/>`,
    estrela:
      `<path d="M100 20 L118 75 L178 75 L130 110 L148 168 L100 132 L52 168 L70 110 L22 75 L82 75 Z" fill="${cor}"/>`,
  };

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="#FFF6ED"/>${formas[forma]}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const PRODUTOS_MOCK: Array<Omit<Produto, "_id" | "slug" | "criadoEm" | "atualizadoEm">> = [
  {
    nome: "Vasinho Suculenta Ondulado",
    descricao: "Vasinho ondulado pra suculenta ou cacto, impresso em camada única. Alegra qualquer cantinho da mesa.",
    preco: 3490,
    fotos: [fotoMock("#7B5CF6", "voxel")],
    estoque: 12,
    categoria: "decoracao",
  },
  {
    nome: "Porta-Trecos Coração Pixel",
    descricao: "Organizador em forma de coração pixelado — perfeito pra clipes, elásticos e miudezas da mesa.",
    preco: 2990,
    fotos: [fotoMock("#FF5BAE", "coracao")],
    estoque: 8,
    categoria: "organizacao",
  },
  {
    nome: "Chaveiro Coração 3D",
    descricao: "Chaveiro fofo em formato de coração, nas cores da nossa marca. Dá pra personalizar a cor!",
    preco: 1590,
    fotos: [fotoMock("#FF7A00", "coracao")],
    estoque: 25,
    categoria: "personalizados",
  },
  {
    nome: "Luminária Cubo Pixel",
    descricao: "Luminária de mesa em formato de voxel, luz suave e quentinha pra deixar o quarto com mais vida.",
    preco: 7990,
    fotos: [fotoMock("#31D0C6", "voxel")],
    estoque: 5,
    categoria: "decoracao",
  },
  {
    nome: "Porta-Caneta Ondulado",
    descricao: "Porta-caneta com paredes onduladas, cabe direitinho na mesa de estudos.",
    preco: 2490,
    fotos: [fotoMock("#FFD24D", "voxel")],
    estoque: 15,
    categoria: "organizacao",
  },
  {
    nome: "Estrela Decorativa Suspensa",
    descricao: "Estrelinha decorativa pra pendurar na parede ou no varal de fotos do quarto.",
    preco: 1990,
    fotos: [fotoMock("#7B5CF6", "estrela")],
    estoque: 0,
    categoria: "decoracao",
  },
];

async function main() {
  const client = await getMongoClient();
  const colecao = client.db(DB_NAME).collection<Produto>(PRODUTOS_COLLECTION);

  for (const dados of PRODUTOS_MOCK) {
    const slug = gerarSlug(dados.nome);
    const existente = await colecao.findOne({ categoria: dados.categoria, slug });
    if (existente) {
      console.log(`- já existe, pulando: ${dados.nome}`);
      continue;
    }
    const agora = new Date();
    await colecao.insertOne({ ...dados, slug, criadoEm: agora, atualizadoEm: agora });
    console.log(`+ inserido: ${dados.nome}`);
  }

  console.log("Seed concluído.");
  process.exit(0);
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
