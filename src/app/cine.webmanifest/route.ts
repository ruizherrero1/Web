// Manifest PWA de Cine, servido en /cine.webmanifest y enlazado solo desde las
// paginas de Cine (metadata.manifest en apps/cine/layout.tsx). Instala Cine como
// app propia (icono claqueta) sin afectar a las otras apps del sitio.
export const dynamic = "force-static";

export function GET() {
  const manifest = {
    name: "Cine RR & LB",
    short_name: "Cine",
    description: "PWA privada para elegir, guardar y valorar peliculas y series entre RR y LB.",
    start_url: "/apps/cine",
    scope: "/apps/cine",
    display: "standalone",
    background_color: "#050404",
    theme_color: "#050404",
    orientation: "portrait",
    icons: [
      { src: "/apps/cine/apple-icon", sizes: "512x512", type: "image/png", purpose: "any maskable" },
    ],
  };
  return new Response(JSON.stringify(manifest), {
    headers: { "content-type": "application/manifest+json" },
  });
}
