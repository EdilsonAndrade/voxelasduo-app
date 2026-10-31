import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FichaRomaneio from "@/components/admin/romaneios/FichaRomaneio";
import { buscarRomaneio } from "@/lib/romaneios/repository";

export const metadata: Metadata = {
  title: "Imprimir romaneio · painel Voxelas Duo",
};

export const dynamic = "force-dynamic";

/** Ficha para imprimir / salvar PDF (specs/038): romaneio inteiro ou `?lugar=<id>`. */
export default async function ImprimirRomaneioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lugar?: string }>;
}) {
  const [{ id }, { lugar }] = await Promise.all([params, searchParams]);
  const romaneio = await buscarRomaneio(id);
  if (!romaneio) notFound();
  const lugarId = lugar && romaneio.lugares.some((l) => l.id === lugar) ? lugar : undefined;
  return <FichaRomaneio romaneio={romaneio} lugarId={lugarId} />;
}
