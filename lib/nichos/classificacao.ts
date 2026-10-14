import type {
  Concorrencia,
  FiltrosNicho,
  LicencaVenda,
  ModeloSugerido,
  PerfilSugerido,
  Potencial,
} from "@/lib/models/nicho";
import type { DesignBruto, PerfilBruto } from "./makerworld";

/** Modelo com menos downloads que isso não indica demanda nem entre quem imprime (research.md #3). */
export const MIN_DOWNLOADS_RELEVANTE = 300;
/** Nota de relevância da busca (`ext.rk`): ~100 casamento forte, ~10 casamento fraco (research.md #3). */
export const RELEVANCIA_MINIMA = 50;
/** Modelo popular entre quem imprime — soma um ponto no potencial (research.md #5). */
export const DOWNLOADS_MODELO_POPULAR = 3000;

/** `N2S` = A1, `N1` = A1 mini — preferência nessa ordem. */
const IMPRESSORAS_A1 = ["N2S", "N1"];

const LICENCAS_VENDA: LicencaVenda[] = ["CC0", "BY", "BY-SA"];

/** Só CC0, BY e BY-SA permitem vender: NC proíbe uso comercial e a licença padrão do MakerWorld também. */
export function licencaPermiteVenda(licenca: string | undefined): licenca is LicencaVenda {
  return LICENCAS_VENDA.includes(licenca as LicencaVenda);
}

/** Faixas sobre produtos de catálogo do ML (research.md #2). */
export function nivelConcorrencia(produtosCatalogo: number | null): Concorrencia {
  if (produtosCatalogo === null) return { nivel: "indisponivel", produtosCatalogo: null };
  const nivel = produtosCatalogo < 1000 ? "baixa" : produtosCatalogo < 5000 ? "media" : "alta";
  return { nivel, produtosCatalogo };
}

const milhar = (n: number) => n.toLocaleString("pt-BR");

/**
 * Pontos: posição na busca (1–10 → 2; 11–20 → 1) + modelo popular no
 * MakerWorld (→ 1). 3 = alto, 2 = médio, até 1 = baixo (research.md #5).
 */
export function classificarPotencial(entrada: {
  posicao: number;
  categoriaNome: string;
  maxDownloads: number;
}): Potencial {
  const { posicao, categoriaNome, maxDownloads } = entrada;
  const pontosBusca = posicao <= 10 ? 2 : posicao <= 20 ? 1 : 0;
  const popular = maxDownloads >= DOWNLOADS_MODELO_POPULAR;
  const pontos = pontosBusca + (popular ? 1 : 0);
  const nivel = pontos >= 3 ? "alto" : pontos === 2 ? "medio" : "baixo";

  return {
    nivel,
    motivo: `${posicao}º mais buscado em ${categoriaNome} · modelo com ${milhar(maxDownloads)} downloads`,
  };
}

function quantidadeMesas(plates: unknown[] | null | undefined): number {
  return Array.isArray(plates) && plates.length > 0 ? plates.length : 1;
}

/** Tempo, gramas e mesas do perfil — fatiados para a A1 quando existe essa versão. */
function medidasDoPerfil(
  perfil: PerfilBruto,
  compativelA1: boolean
): Pick<PerfilSugerido, "segundos" | "gramas" | "mesas" | "impressora"> | null {
  const modelInfo = perfil.extention?.modelInfo;
  const nativa = modelInfo?.compatibility?.devModelName ?? "";
  const proprias = {
    segundos: perfil.prediction ?? 0,
    gramas: perfil.weight ?? 0,
    mesas: quantidadeMesas(modelInfo?.plates),
    impressora: nativa,
  };

  if (IMPRESSORAS_A1.includes(nativa)) return proprias;

  const outras = perfil.extention?.otherCompatibilityModelInfo ?? [];
  for (const codigo of IMPRESSORAS_A1) {
    const outra = outras.find((o) => o.devModelName === codigo && (o.prediction ?? 0) > 0);
    if (outra) {
      return {
        segundos: outra.prediction ?? 0,
        gramas: outra.weight ?? perfil.weight ?? 0,
        mesas: quantidadeMesas(outra.modelInfo?.plates ?? modelInfo?.plates),
        impressora: codigo,
      };
    }
  }

  const listaA1 = (modelInfo?.otherCompatibility ?? []).some((c) => IMPRESSORAS_A1.includes(c.devModelName ?? ""));
  if (listaA1 || !compativelA1) return proprias;
  return null;
}

function passaNosFiltros(perfil: PerfilBruto, filtros: FiltrosNicho): boolean {
  if (!filtros.umaCor) return true;
  return perfil.materialColorCnt === 1 && !perfil.needAms;
}

/**
 * Modelo com o melhor perfil que passa nos filtros (mais impresso, desempate
 * pela avaliação) — `null` quando a licença não permite venda ou nenhum perfil
 * serve (sem tempo/gramas, mais de uma cor, não roda na A1).
 */
export function escolherPerfil(design: DesignBruto, filtros: FiltrosNicho): ModeloSugerido | null {
  if (!licencaPermiteVenda(design.license)) return null;

  const candidatos: { perfil: PerfilSugerido; avaliacao: number }[] = [];
  for (const bruto of design.instances ?? []) {
    if (!passaNosFiltros(bruto, filtros)) continue;
    const medidas = medidasDoPerfil(bruto, filtros.compativelA1);
    if (!medidas || !(medidas.segundos > 0) || !(medidas.gramas > 0)) continue;
    candidatos.push({
      perfil: {
        id: bruto.id,
        profileId: bruto.profileId,
        nome: bruto.title ?? "",
        cores: bruto.materialColorCnt ?? 0,
        impressoes: bruto.printCount ?? 0,
        ...medidas,
      },
      avaliacao: bruto.ratingScoreTotal ?? 0,
    });
  }
  if (candidatos.length === 0) return null;

  candidatos.sort((a, b) => b.perfil.impressoes - a.perfil.impressoes || b.avaliacao - a.avaliacao);
  const { perfil } = candidatos[0];

  return {
    id: design.id,
    nome: design.title,
    slug: design.slug,
    capa: design.coverUrl ?? "",
    autor: design.designCreator?.name ?? "",
    licenca: design.license,
    downloads: design.downloadCount ?? 0,
    url: `https://makerworld.com/pt/models/${design.id}-${design.slug}#profileId-${perfil.profileId}`,
    perfil,
  };
}
