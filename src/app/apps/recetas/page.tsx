import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";

export const metadata: Metadata = {
  title: "Recetario",
  description:
    "Recetario: aplicación para guardar recetas personales con ingredientes, pasos, variantes y etiquetas.",
};

const goals = [
  "Centralizar recetas probadas",
  "Permitir búsqueda rápida",
  "Guardar variantes",
  "Crear listas de compra",
  "Compartir recetas con familia o amigos",
];

const future = [
  "Importar JSON de recetas",
  "Favoritos",
  "Etiquetas",
  "Modo cocina",
  "Lista de la compra",
  "Recetas compartidas",
  "Recetas privadas",
];

export default function RecipesPage() {
  return (
    <PageShell
      eyebrow="Aplicación en desarrollo"
      title="Recetario"
      description="Aplicación para guardar recetas personales en formato estructurado, con ingredientes, pasos, variantes y etiquetas."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-6">
          <h2 className="text-xl font-bold text-[var(--ink)]">Objetivo</h2>
          <ul className="mt-5 space-y-3 text-[var(--muted)]">
            {goals.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-6">
          <h2 className="text-xl font-bold text-[var(--ink)]">
            Futuras funcionalidades
          </h2>
          <ul className="mt-5 space-y-3 text-[var(--muted)]">
            {future.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>
    </PageShell>
  );
}
