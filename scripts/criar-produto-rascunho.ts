/**
 * Cria produtos como rascunho (`publicado: false`) a partir de um arquivo JSON
 * — eles ficam visíveis só no admin, para revisão, e vão à loja quando alguém
 * marcar "Publicado no site". É o caminho usado pela skill `produtos-makerworld`
 * para gravar o que foi garimpado em sites de modelos 3D.
 *
 *   npx tsx scripts/criar-produto-rascunho.ts caminho/para/produtos.json
 *
 * O JSON é um objeto ou uma lista de objetos:
 *
 *   {
 *     "nome": "Dragão Articulado Flexível",
 *     "descricao": "...",
 *     "preco": 2990,            // centavos
 *     "estoque": 0,
 *     "categoria": "presentes", // slug de uma categoria cadastrada
 *     "fotos": [],              // rascunho pode nascer sem foto
 *     "linkModelo3d": "https://makerworld.com/...",
 *     "custoProducao": { ... }  // opcional
 *   }
 *
 * Idempotente pelo nome: um produto cujo nome já exista na mesma categoria é
 * pulado, para que rodar o script duas vezes não duplique o catálogo.
 */
import { readFileSync } from "node:fs";
import { config } from "dotenv";
config({ path: ".env.local" });

import { slugCategoriaValido } from "../lib/categorias/repository";
import { SLUG_CATEGORIA_PADRAO } from "../lib/models/categoria";
import type { Produto } from "../lib/models/produto";
import { criarProduto, listarProdutos, slugLivreNaCategoria } from "../lib/produtos/repository";
import { gerarSlug } from "../lib/produtos/slug";
import { validarProduto, type ProdutoPayload } from "../lib/produtos/validation";

type Entrada = ProdutoPayload & { nome?: string; categoria?: string };

async function criarUm(entrada: Entrada, existentes: Produto[]): Promise<string> {
  const erros = validarProduto(entrada);
  if (Object.keys(erros).length > 0) {
    throw new Error(`payload inválido: ${JSON.stringify(erros)}`);
  }

  const nome = entrada.nome as string;
  const categoria = (typeof entrada.categoria === "string" && entrada.categoria.trim()) || SLUG_CATEGORIA_PADRAO;

  if (!(await slugCategoriaValido(categoria))) {
    throw new Error(`categoria "${categoria}" não está cadastrada`);
  }

  const jaExiste = existentes.some(
    (p) => p.categoria === categoria && p.nome.trim().toLowerCase() === nome.trim().toLowerCase()
  );
  if (jaExiste) {
    return `· pulado (já existe em ${categoria}): ${nome}`;
  }

  const slug = await slugLivreNaCategoria(categoria, gerarSlug(nome));
  const produto = await criarProduto({
    nome,
    slug,
    descricao: entrada.descricao as string,
    preco: entrada.preco as number,
    estoque: (entrada.estoque as number) ?? 0,
    categoria,
    fotos: (entrada.fotos as string[]) ?? [],
    custoProducao: entrada.custoProducao as Produto["custoProducao"],
    taxasCanais: entrada.taxasCanais as Produto["taxasCanais"],
    fichaTecnica: entrada.fichaTecnica as Produto["fichaTecnica"],
    embalagemEnvio: entrada.embalagemEnvio as Produto["embalagemEnvio"],
    linkModelo3d: (entrada.linkModelo3d as string | undefined)?.trim() || undefined,
    // O ponto do script: nasce fora da loja, para ser revisado antes de publicar.
    publicado: false,
  });

  return `✓ rascunho criado: ${produto.nome} → /admin/produtos/${produto._id!.toString()}/editar`;
}

async function main() {
  const caminho = process.argv[2];
  if (!caminho) {
    console.error("uso: npx tsx scripts/criar-produto-rascunho.ts <arquivo.json>");
    process.exit(1);
  }

  const conteudo = JSON.parse(readFileSync(caminho, "utf8")) as Entrada | Entrada[];
  const entradas = Array.isArray(conteudo) ? conteudo : [conteudo];
  const existentes = await listarProdutos();

  let falhas = 0;
  for (const entrada of entradas) {
    try {
      console.log(await criarUm(entrada, existentes));
    } catch (erro) {
      falhas += 1;
      console.error(`✗ ${entrada.nome ?? "(sem nome)"}: ${(erro as Error).message}`);
    }
  }

  console.log(`\n${entradas.length - falhas}/${entradas.length} processados.`);
  process.exit(falhas > 0 ? 1 : 0);
}

void main();
