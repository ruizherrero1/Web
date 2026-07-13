import type { Metadata } from "next";
import { AuthGate } from "./_components/AuthGate";
import { CineApp } from "./_components/CineApp";

export const metadata: Metadata = {
  title: "Cine",
  description:
    "PWA privada para elegir, guardar y valorar peliculas y series entre RR y LB.",
  manifest: "/cine.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Cine",
    statusBarStyle: "black-translucent",
  },
};

export default function CinePage() {
  return (
    <AuthGate>
      <CineApp />
    </AuthGate>
  );
}
