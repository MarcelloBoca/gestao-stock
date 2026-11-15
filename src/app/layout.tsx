import type { Metadata, Viewport } from "next";
import { DM_Serif_Display, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import "./v2.css";

const serif = DM_Serif_Display({ subsets: ["latin"], weight: "400", variable: "--font-serif", display: "swap" });
const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Sola.chic", template: "%s | Sola.chic" },
  description: "Sistema de Gestão de Loja: stock, vendas e relatórios.",
  applicationName: "Sola.chic",
  appleWebApp: { capable: true, title: "Sola.chic", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#F7F2F5",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt" className={`${serif.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
