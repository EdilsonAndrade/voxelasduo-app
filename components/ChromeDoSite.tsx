"use client";

import { usePathname } from "next/navigation";
import { AREA_EVENTO } from "@/lib/auth/papeis";

/**
 * Cabeçalho/rodapé do site ficam fora da área de pedidos de evento (EDI-125),
 * que funciona como um app de celular com barra e abas próprias, e nunca saem
 * na impressão (EDI-126, lista de preços).
 */
export default function ChromeDoSite({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === AREA_EVENTO || pathname.startsWith(`${AREA_EVENTO}/`)) return null;
  return <div className="nao-imprimir">{children}</div>;
}
