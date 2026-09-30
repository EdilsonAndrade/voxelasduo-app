import getMongoClient, { DB_NAME } from "@/lib/db/mongodb";
import { colecaoCategorias } from "@/lib/categorias/repository";
import { registrarRedirecionamentoProduto } from "@/lib/categorias/redirecionamentos";
import { CATEGORIAS_INICIAIS, SLUG_CATEGORIA_PADRAO } from "@/lib/models/categoria";
import { PRODUTOS_COLLECTION, type Produto } from "@/lib/models/produto";
import { atualizarProduto, slugDisponivel } from "@/lib/produtos/repository";
import { gerarSlug } from "@/lib/produtos/slug";

export interface PassoMigracao {
  /** Texto livre gravado hoje em `produto.categoria`. */
  de: string;
  /** Slug da categoria cadastrada de destino. */
  para: string;
}

/**
 * Plano puro da migração (research.md #7): cada valor distinto que ainda
 * não é slug cadastrado vai para a categoria de mesmo slug (ignora acento,
 * maiúsculas e espaços) ou, sem correspondência, para "Diversos".
 */
export function planejarMigracao(valoresDistintos: string[], slugsCadastrados: Set<string>): PassoMigracao[] {
  return valoresDistintos
    .filter((valor) => !slugsCadastrados.has(valor))
    .map((de) => {
      const slug = gerarSlug(de);
      return { de, para: slugsCadastrados.has(slug) ? slug : SLUG_CATEGORIA_PADRAO };
    });
}

export interface LinhaRelatorio extends PassoMigracao {
  produtos: number;
  slugsAjustados: Array<{ de: string; para: string }>;
}

async function slugLivreDeterministico(categoria: string, base: string, ignorarId: string): Promise<string> {
  if (await slugDisponivel(categoria, base, ignorarId)) return base;
  for (let n = 2; ; n++) {
    const candidato = `${base}-${n}`;
    if (await slugDisponivel(categoria, candidato, ignorarId)) return candidato;
  }
}

/** Cria as categorias iniciais que ainda não existem, sem mexer nas já cadastradas. */
async function garantirCategoriasIniciais(): Promise<void> {
  const colecao = await colecaoCategorias();
  const agora = new Date();
  await colecao.bulkWrite(
    CATEGORIAS_INICIAIS.map((inicial, ordem) => ({
      updateOne: {
        filter: { slug: inicial.slug },
        update: {
          $setOnInsert: {
            nome: inicial.nome,
            slug: inicial.slug,
            ordem,
            aliases: [],
            criadoEm: agora,
            atualizadoEm: agora,
            ...(inicial.padrao ? { padrao: true } : {}),
          },
        },
        upsert: true,
      },
    }))
  );
}

/**
 * Migra `produto.categoria` de texto livre para slug cadastrado: cria as
 * categorias iniciais, move os produtos (ajustando slug em conflito com
 * sufixo `-2`, `-3`…), grava o redirecionamento de cada endereço antigo e
 * guarda o texto antigo como alias da categoria. Idempotente: numa segunda
 * execução todos os valores já são slugs cadastrados. `dryRun` só calcula
 * o relatório.
 */
export async function aplicarMigracao({ dryRun = false } = {}): Promise<LinhaRelatorio[]> {
  if (!dryRun) await garantirCategoriasIniciais();

  const colecao = await colecaoCategorias();
  const cadastradas = await colecao.find({}, { projection: { slug: 1 } }).toArray();
  const slugsCadastrados = new Set([...cadastradas.map((c) => c.slug), ...CATEGORIAS_INICIAIS.map((c) => c.slug)]);

  const client = await getMongoClient();
  const produtos = client.db(DB_NAME).collection<Produto>(PRODUTOS_COLLECTION);
  const valores = (await produtos.distinct("categoria")).filter((v): v is string => typeof v === "string");

  const relatorio: LinhaRelatorio[] = [];
  for (const passo of planejarMigracao(valores, slugsCadastrados)) {
    const afetados = await produtos.find({ categoria: passo.de }).toArray();
    const linha: LinhaRelatorio = { ...passo, produtos: afetados.length, slugsAjustados: [] };

    for (const produto of afetados) {
      const id = produto._id!.toString();
      const slug = await slugLivreDeterministico(passo.para, produto.slug, id);
      if (slug !== produto.slug) linha.slugsAjustados.push({ de: produto.slug, para: slug });
      if (dryRun) continue;

      await atualizarProduto(id, { categoria: passo.para, slug });
      await registrarRedirecionamentoProduto(
        { categoria: passo.de, slug: produto.slug },
        { categoria: passo.para, slug },
        produto._id!
      );
    }

    if (!dryRun) {
      await colecao.updateOne({ slug: passo.para }, { $addToSet: { aliases: passo.de } });
    }
    relatorio.push(linha);
  }

  return relatorio;
}
