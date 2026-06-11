import type { MetadataRoute } from "next";
import { SITE } from "@/lib/constants";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = `https://${SITE.domain}`;
  const lastModified = new Date();

  const routes = [
    { path: "", priority: 1 },
    { path: "/apps", priority: 0.8 },
    { path: "/apps/gym", priority: 0.6 },
    { path: "/apps/recetas", priority: 0.6 },
    { path: "/apps/mundial", priority: 0.7 },
    { path: "/cv", priority: 0.9 },
    { path: "/contacto", priority: 0.7 },
  ];

  return routes.map(({ path, priority }) => ({
    url: `${base}${path}`,
    lastModified,
    changeFrequency: "monthly",
    priority,
  }));
}
