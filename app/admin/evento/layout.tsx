import type { Metadata, Viewport } from "next";
import styles from "@/components/evento/evento.module.css";

export const metadata: Metadata = {
  title: "Pedidos de evento — Voxelas Duo",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#7b5cf6",
};

/** Área de pedidos de evento (EDI-125): app de celular, sem cabeçalho/rodapé do site. */
export default function EventoLayout({ children }: { children: React.ReactNode }) {
  return <div className={styles.app}>{children}</div>;
}
