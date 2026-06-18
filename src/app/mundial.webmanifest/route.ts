// Manifest PWA del Mundial, servido en /mundial.webmanifest y enlazado solo
// desde las páginas del Mundial (ver metadata.manifest en apps/mundial/page.tsx).
// Antes era el manifest global (app/manifest.ts), que hacía que CUALQUIER página
// guardada en el móvil se instalara como la app del Mundial.
export const dynamic = "force-static";

export function GET() {
  const manifest = {
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
    icons: [{ src: "/apple-icon", sizes: "192x192", type: "image/png" }],
  };
  return new Response(JSON.stringify(manifest), {
    headers: { "content-type": "application/manifest+json" },
  });
}
