// Manifest PWA del Real Madrid, servido en /madrid.webmanifest y enlazado solo
// desde /apps/madrid (ver metadata.manifest en apps/madrid/page.tsx), para que
// guardar esta pagina en el movil instale la app del Madrid y no otra.
export const dynamic = "force-static";

export function GET() {
  const manifest = {
    name: "Real Madrid",
    short_name: "Madrid",
    description:
      "Calendario, resultados, clasificación, plantilla y goleadores del Real Madrid",
    start_url: "/apps/madrid",
    scope: "/apps/madrid",
    display: "standalone",
    background_color: "#0a0f1c",
    theme_color: "#0a0f1c",
    orientation: "portrait",
    icons: [{ src: "/apps/madrid/apple-icon", sizes: "192x192", type: "image/png" }],
  };
  return new Response(JSON.stringify(manifest), {
    headers: { "content-type": "application/manifest+json" },
  });
}
