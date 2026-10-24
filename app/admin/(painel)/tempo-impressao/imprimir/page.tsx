import type { Metadata } from "next";
import FichaTempoImpressao from "@/components/admin/tempoImpressao/FichaTempoImpressao";
import { ordenarPorInicio } from "@/lib/producao/planosImpressao";
import { listarPlanos } from "@/lib/producao/planosImpressaoRepository";

export const metadata: Metadata = {
  title: "Ficha de tempo de impressão · painel Voxelas Duo",
};

export const dynamic = "force-dynamic";

/** Ficha em lista para imprimir / salvar PDF (specs/035), por horário de início. */
export default async function ImprimirTempoImpressaoPage() {
  const planos = await listarPlanos();

  return (
    <FichaTempoImpressao
      geradaEm={new Date().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "America/Sao_Paulo",
      })}
      planos={ordenarPorInicio(
        planos.map((plano) => ({ chave: plano.id, id: plano.id, produtoId: plano.produtoId, produtoNome: plano.produtoNome, itens: plano.itens }))
      )}
    />
  );
}
