// Manifest PWA de TravelKit, servido en /travelkit.webmanifest y enlazado solo
// desde las páginas de TravelKit (ver metadata.manifest en apps/travelkit/layout.tsx).
// Al guardarlo en el móvil se instala como app propia (icono de avión) que abre
// directamente las listas de viaje, sin afectar al manifest del Mundial.
export const dynamic = "force-static";

export function GET() {
  const manifest = {
    name: "TravelKit",
    short_name: "TravelKit",
    description: "Checklists para preparar tus viajes",
    start_url: "/apps/travelkit",
    scope: "/apps/travelkit",
    display: "standalone",
    background_color: "#0b1729",
    theme_color: "#0b4f8a",
    orientation: "portrait",
    icons: [
      {
        src: "/apps/travelkit/apple-icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
  return new Response(JSON.stringify(manifest), {
    headers: { "content-type": "application/manifest+json" },
  });
}
