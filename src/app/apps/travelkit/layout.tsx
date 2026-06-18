import type { Metadata } from "next";

// Layout servidor del segmento TravelKit: enlaza el manifest propio y fija el
// nombre/comportamiento de app en iOS, de modo que "Añadir a pantalla de inicio"
// instale TravelKit (icono de avión) y no la app del Mundial. El apple-icon.tsx
// de este mismo segmento sustituye al icono global solo en estas páginas.
export const metadata: Metadata = {
  title: "TravelKit",
  manifest: "/travelkit.webmanifest",
  appleWebApp: {
    capable: true,
    title: "TravelKit",
    statusBarStyle: "default",
  },
};

export default function TravelKitLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
