import type { Metadata, Viewport } from "next";
import { getMadridData } from "@/lib/madrid-data";
import { MadridApp } from "./MadridApp";

// SSR por peticion: los partidos iniciales llegan ya renderizados y el cache
// compartido de getMadridData limita las llamadas a las fuentes externas.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Real Madrid - Calendario, resultados y clasificación",
  description:
    "Sigue al Real Madrid en todas las competiciones: calendario con horarios en España, resultados en directo, clasificación de LaLiga, plantilla y goleadores.",
  manifest: "/madrid.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Madrid",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0f1c",
};

export default async function MadridPage() {
  const initialData = await getMadridData().catch(() => null);
  return <MadridApp initialData={initialData} />;
}
