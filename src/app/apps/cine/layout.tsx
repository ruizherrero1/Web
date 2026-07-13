import type { Metadata } from "next";
import { CineServiceWorker } from "./_components/CineServiceWorker";

// Layout servidor del segmento Cine: enlaza su manifest propio y fija el
// nombre/comportamiento de app en iOS, de modo que "Anadir a pantalla de inicio"
// instale Cine (icono claqueta) y no otra app del sitio. El apple-icon.tsx de
// este segmento sustituye al icono global solo en estas paginas.
export const metadata: Metadata = {
  title: "Cine",
  manifest: "/cine.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Cine",
    statusBarStyle: "black-translucent",
  },
};

export default function CineLayout({ children }: { children: React.ReactNode }) {
  return <CineServiceWorker>{children}</CineServiceWorker>;
}
