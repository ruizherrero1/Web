import type { Metadata } from "next";
import { AppCard } from "@/components/AppCard";
import { Badge } from "@/components/Badge";
import { PageShell } from "@/components/PageShell";
import { apps } from "@/data/apps";

export const metadata: Metadata = {
  title: "Apps",
  description:
    "Catálogo de aplicaciones personales: GymLog, Fantasy Stratos, Recetario, Mundial 2026 y futuras herramientas privadas.",
};

const filters = ["Todas", "Activas", "En desarrollo", "Privadas", "Públicas"];

export default function AppsPage() {
  return (
    <PageShell
      eyebrow="Hub de aplicaciones"
      title="Catálogo de herramientas personales"
      description="Un espacio para reunir apps personales, prototipos y futuras herramientas privadas con acceso controlado."
    >
      <div className="mb-8 flex flex-wrap gap-2">
        {filters.map((filter) => (
          <Badge key={filter}>{filter}</Badge>
        ))}
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {apps.map((app) => (
          <AppCard key={app.slug} {...app} />
        ))}
      </div>
    </PageShell>
  );
}
