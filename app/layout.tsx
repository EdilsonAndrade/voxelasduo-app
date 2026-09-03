import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import CarrinhoProvider from "@/components/carrinho/CarrinhoProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voxelas Duo",
  description: "E-commerce de produtos impressos em 3D",
  icons: {
    icon: "/images/logo.png",
    apple: "/images/logo.png",
  },
};

// Aplica o tema salvo antes da hidratação, evitando flash de tema errado.
// Padrão fixo: claro — não segue prefers-color-scheme do sistema (decisão registrada em design-tokens.md).
const themeInitScript = `
  try {
    var tema = window.localStorage.getItem("voxelas-theme");
    document.documentElement.setAttribute("data-theme", tema === "dark" ? "dark" : "light");
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "light");
  }
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" data-theme="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Nunito:wght@400;600;700;800&family=Caveat:wght@500;700&display=swap"
        />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <CarrinhoProvider>
          <SiteHeader />
          {children}
        </CarrinhoProvider>
      </body>
    </html>
  );
}
