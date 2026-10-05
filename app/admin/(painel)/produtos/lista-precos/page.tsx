import Link from "next/link";
import { ObjectId } from "mongodb";
import ImprimirButton from "@/components/admin/ImprimirButton";
import { listarProdutosPorIds } from "@/lib/produtos/repository";
import { formatarPreco } from "@/lib/produtos/formato";
import { calcularCustoProducao } from "@/lib/produtos/custoProducao";
import { letraIndice, ordenarPorNome, parseItensLista } from "@/lib/produtos/precoLista";
import adminStyles from "@/components/admin/admin.module.css";
import styles from "./listaPrecos.module.css";

export const dynamic = "force-dynamic";

export const metadata = { title: "Lista de preços · Voxelas Duo" };

/**
 * Lista de preços para levar ao evento (EDI-126): só os produtos marcados na
 * lista do admin, em ordem alfabética, agrupados pela inicial. Cada produto
 * leva uma comanda de quadradinhos numerados — um por peça levada — para
 * riscar a venda no balcão. O PDF vem do "Salvar como PDF" da impressão.
 */
export default async function ListaPrecosPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids = "" } = await searchParams;
  // O parâmetro vem como "id:peças" — a quantidade é obrigatória na lista do admin.
  const itens = parseItensLista(ids).filter((item) => ObjectId.isValid(item.id));
  const quantidadePorId = new Map(itens.map((item) => [item.id, item.quantidade]));

  const produtos = ordenarPorNome(await listarProdutosPorIds(itens.map((item) => new ObjectId(item.id))));

  // Custo de produção por peça, igual ao da tela de edição — fica ao lado do
  // preço para a equipe saber a margem na hora de negociar no evento.
  const custoPorProduto = new Map<string, number>();
  for (const produto of produtos) {
    if (!produto.custoProducao) continue;
    const total = calcularCustoProducao(produto.custoProducao).totalCentavos;
    if (Number.isFinite(total)) custoPorProduto.set(produto._id!.toString(), total);
  }

  const grupos: { letra: string; itens: typeof produtos }[] = [];
  for (const produto of produtos) {
    const letra = letraIndice(produto.nome);
    const ultimo = grupos.at(-1);
    if (ultimo?.letra === letra) ultimo.itens.push(produto);
    else grupos.push({ letra, itens: [produto] });
  }

  const pecasTotais = produtos.reduce(
    (total, produto) => total + (quantidadePorId.get(produto._id!.toString()) ?? 0),
    0
  );

  const geradoEm = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });

  return (
    <div className={`container ${styles.pagina}`}>
      <div className={`${styles.acoes} nao-imprimir`}>
        <Link href="/admin/produtos" className={adminStyles.btnGhost}>
          ← Voltar aos produtos
        </Link>
        {produtos.length > 0 && <ImprimirButton className={adminStyles.btnPrimary} />}
      </div>

      {produtos.length > 0 && (
        <p className={`${styles.aviso} nao-imprimir`}>
          Um quadradinho por peça levada: risque um a cada venda. O custo aparece só aqui na tela — não sai na
          impressão.
        </p>
      )}

      {produtos.length === 0 ? (
        <p className={adminStyles.empty}>
          Nenhum produto selecionado. Volte à lista de produtos, marque os que vão para o evento e informe quantas
          peças de cada um vão na caixa.
        </p>
      ) : (
        <article className={styles.folha}>
          <header className={styles.cabecalho}>
            <h1 className={styles.titulo}>Tabela de preços</h1>
            <p className={styles.subtitulo}>
              Voxelas Duo · {produtos.length} {produtos.length === 1 ? "produto" : "produtos"} · {pecasTotais}{" "}
              {pecasTotais === 1 ? "peça" : "peças"} · {geradoEm}
            </p>
          </header>

          <div className={styles.colunas}>
            {grupos.map((grupo) => (
              <section key={grupo.letra} className={styles.grupo} aria-label={`Produtos com ${grupo.letra}`}>
                <h2 className={styles.letra}>{grupo.letra}</h2>
                <ul className={styles.itens}>
                  {grupo.itens.map((produto) => {
                    const id = produto._id!.toString();
                    const custo = custoPorProduto.get(id) ?? null;
                    const levadas = quantidadePorId.get(id) ?? 0;
                    return (
                      <li key={id} className={styles.item}>
                        {produto.fotos?.[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={produto.fotos[0]} alt="" className={styles.miniatura} loading="eager" />
                        ) : (
                          <span className={styles.semFoto} />
                        )}
                        <span className={styles.nome}>{produto.nome}</span>
                        <span className={styles.custo} title="Custo de produção por peça">
                          {custo === null ? "" : `custo ${formatarPreco(custo)}`}
                        </span>
                        <span className={styles.preco}>{formatarPreco(produto.preco)}</span>
                        {/* Comanda: um quadradinho por peça, em blocos de cinco para contar de relance. */}
                        <span className={styles.comanda} aria-label={`${levadas} peças levadas`}>
                          <span className={styles.levar}>levar {levadas}</span>
                          <span className={styles.quadrados}>
                            {Array.from({ length: levadas }, (_, indice) => (
                              <span key={indice} className={styles.quadrado}>
                                {indice + 1}
                              </span>
                            ))}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </article>
      )}
    </div>
  );
}
