import {
  buscarTendenciasCategoria,
  contarProdutosCatalogo,
} from "@/lib/estoque/canais/mercadoLivre/tendencias";
import { obterComCache } from "@/lib/tendencias/cache";
import { criarClienteMakerWorld, type DesignBruto } from "./makerworld";
import type { DependenciasPesquisa } from "./pesquisa";

/** Perfis de um modelo quase não mudam — guardar por 7 dias poupa consultas ao MakerWorld. */
const TTL_DESIGN_MS = 7 * 24 * 60 * 60 * 1000;

/** Só o que a pesquisa usa: o detalhe completo traz descrição em HTML e fotos, pesado para o cache. */
export function reduzirDesign(design: DesignBruto): DesignBruto {
  return {
    id: design.id,
    title: design.title,
    slug: design.slug,
    coverUrl: design.coverUrl,
    license: design.license,
    downloadCount: design.downloadCount,
    designCreator: { name: design.designCreator?.name },
    instances: (design.instances ?? []).map((p) => ({
      id: p.id,
      profileId: p.profileId,
      title: p.title,
      prediction: p.prediction,
      weight: p.weight,
      materialColorCnt: p.materialColorCnt,
      needAms: p.needAms,
      printCount: p.printCount,
      ratingScoreTotal: p.ratingScoreTotal,
      extention: {
        modelInfo: {
          compatibility: { devModelName: p.extention?.modelInfo?.compatibility?.devModelName },
          otherCompatibility: (p.extention?.modelInfo?.otherCompatibility ?? []).map((c) => ({
            devModelName: c.devModelName,
          })),
          plates: (p.extention?.modelInfo?.plates ?? []).map(() => ({})),
        },
        otherCompatibilityModelInfo: (p.extention?.otherCompatibilityModelInfo ?? []).map((o) => ({
          devModelName: o.devModelName,
          prediction: o.prediction,
          weight: o.weight,
          modelInfo: { plates: (o.modelInfo?.plates ?? []).map(() => ({})) },
        })),
      },
    })),
  };
}

/** Dependências reais da pesquisa: ML com o token do app e MakerWorld com detalhe em cache. */
export function dependenciasReais(): DependenciasPesquisa {
  const makerWorld = criarClienteMakerWorld();

  return {
    tendenciasCategoria: buscarTendenciasCategoria,
    contarProdutosCatalogo,
    makerWorld: {
      buscarModelos: makerWorld.buscarModelos,
      async buscarDesign(id) {
        const { dados } = await obterComCache<{ design: DesignBruto }>({
          chave: `mw:design:${id}`,
          ttlMs: TTL_DESIGN_MS,
          buscarNovo: async () => ({ design: reduzirDesign(await makerWorld.buscarDesign(id)) }),
        });
        return dados.design;
      },
    },
  };
}
