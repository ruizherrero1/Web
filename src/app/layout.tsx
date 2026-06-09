import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppChrome } from "@/components/AppChrome";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  metadataBase: new URL("https://ramonruizherrero.com"),
  title: "Ramón Ruiz Herrero - Portfolio, aplicaciones y proyectos",
  description:
    "Web personal de Ramón Ruiz Herrero: CEO y Partner de Stratos Consulting, consultoría tecno-financiera, producto, automatización, portfolio y aplicaciones personales.",
  openGraph: {
    title: "Ramón Ruiz Herrero - Portfolio, aplicaciones y proyectos",
    description:
      "CEO y Partner de Stratos Consulting. Consultoría tecno-financiera, producto, automatización y aplicaciones personales.",
    url: "https://ramonruizherrero.com",
    siteName: "Ramón Ruiz Herrero",
    locale: "es_ES",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={inter.variable}>
      <body>
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
