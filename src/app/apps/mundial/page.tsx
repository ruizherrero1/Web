import type { Metadata, Viewport } from "next";
import { getTournamentData } from "@/lib/mundial-data";
import { MundialApp } from "./MundialApp";

// SSR por peticion: los datos iniciales llegan ya renderizados (sin flash de
// carga en cliente) y el cache compartido de getTournamentData limita las
// llamadas a las fuentes externas.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mundial 2026 - Calendario, grupos y resultados",
  description:
    "App para seguir el calendario del Mundial 2026, horarios en España, resultados y clasificaciones de grupos.",
  appleWebApp: {
    capable: true,
    title: "Mundial 2026",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function MundialPage() {
  const initialData = await getTournamentData().catch(() => null);
  return <MundialApp initialData={initialData} />;
}
