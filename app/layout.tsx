import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voxelas Duo",
  description: "E-commerce de produtos impressos em 3D",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
