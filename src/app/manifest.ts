import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mundial 2026",
    short_name: "Mundial",
    description:
      "Calendario, horarios en España, resultados y clasificaciones del Mundial 2026",
    start_url: "/apps/mundial",
    scope: "/apps/mundial",
    display: "standalone",
    background_color: "#0a0e0f",
    theme_color: "#0a0e0f",
    orientation: "portrait",
    icons: [
      {
        src: "/apple-icon",
        sizes: "192x192",
        type: "image/png",
      },
    ],
  };
}
