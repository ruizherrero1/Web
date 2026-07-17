import type { Metadata, Viewport } from "next";
import { AuthGate } from "./_components/AuthGate";
import { CineApp } from "./_components/CineApp";

// The site-wide viewport declares a LIGHT theme-color, which paints the phone
// status bar (clock/wifi/battery area) white inside Cine. Override it here so
// the bar matches the app's dark chrome in both browser and installed PWA.
export const viewport: Viewport = {
  themeColor: "#0a0809",
};

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
