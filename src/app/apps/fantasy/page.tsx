import type { Metadata } from "next";
import { ButtonLink } from "@/components/ButtonLink";
import { PageShell } from "@/components/PageShell";
import { LINKS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Fantasy",
  description:
    "Fantasy: liga privada de LaLiga con mercado, alineaciones y reglas configurables.",
};

const features = [
  "Ligas privadas por invitación",
  "Alineaciones, capitán y banquillo configurables",
  "Pujas, precio fijo, cláusulas y traspasos",
  "Clasificación, jornadas y puntuación automática",
  "Chat, notificaciones e historial administrativo",
];

const customization = [
  "Presupuesto y tamaño de plantilla",
  "Sistemas de mercado disponibles",
  "Reglas de puntuación",
  "Capitán, banquillo y sustituciones",
  "Varios temas visuales",
];

export default function FantasyPage() {
  return (
    <PageShell
      eyebrow="Aplicación en desarrollo"
      title="Fantasy"
      description="Fantasy privado de LaLiga para competir con amigos, gestionar el mercado y adaptar las reglas a vuestra liga."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-6">
          <h2 className="text-xl font-bold text-[var(--ink)]">Incluye</h2>
          <ul className="mt-5 space-y-3 text-[var(--muted)]">
            {features.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-6">
          <h2 className="text-xl font-bold text-[var(--ink)]">Personalizable</h2>
          <ul className="mt-5 space-y-3 text-[var(--muted)]">
            {customization.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>
      <div className="mt-8">
        <ButtonLink href={LINKS.fantasy} variant="primary">
          Entrar en Fantasy
        </ButtonLink>
      </div>
    </PageShell>
  );
}
