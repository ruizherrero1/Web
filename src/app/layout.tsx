import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { CONTACT, LINKS, SITE } from "@/lib/constants";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  metadataBase: new URL(`https://${SITE.domain}`),
  title: {
    default: "Ramón Ruiz Herrero - Portfolio, aplicaciones y proyectos",
    template: `%s · ${SITE.name}`,
  },
  description:
    "Web personal de Ramón Ruiz Herrero: CEO y Partner de Stratos Consulting, consultoría tecno-financiera, producto, automatización, portfolio y aplicaciones personales.",
  openGraph: {
    title: "Ramón Ruiz Herrero - Portfolio, aplicaciones y proyectos",
    description:
      "CEO y Partner de Stratos Consulting. Consultoría tecno-financiera, producto, automatización y aplicaciones personales.",
    url: `https://${SITE.domain}`,
    siteName: SITE.name,
    locale: "es_ES",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1322" },
  ],
};

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: SITE.name,
  url: `https://${SITE.domain}`,
  email: `mailto:${CONTACT.primaryEmail}`,
  jobTitle: "CEO y Partner",
  worksFor: {
    "@type": "Organization",
    name: "Stratos Consulting",
  },
  sameAs: [LINKS.linkedin],
  knowsAbout: [
    "Mercados financieros",
    "Integraciones front-to-back",
    "Murex",
    "Calypso",
    "Producto digital",
    "Automatización e IA",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
