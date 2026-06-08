import { ButtonLink } from "@/components/ButtonLink";
import { PageShell } from "@/components/PageShell";
import { LINKS } from "@/lib/constants";

const current = [
  "Rutinas personales",
  "Registro de ejercicios",
  "Historial",
  "Progreso",
  "Pensada para evolucionar a multiusuario",
];

const nextSteps = [
  "Login",
  "Rutinas por usuario",
  "Historial por usuario",
  "Plantillas compartibles",
  "Sincronización en la nube",
];

export default function GymPage() {
  return (
    <PageShell
      eyebrow="Aplicación activa"
      title="GymLog"
      description="Aplicación personal para gestionar rutinas, sesiones, historial y progreso de entrenamiento."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-[var(--line)] bg-white p-6">
          <h2 className="text-xl font-bold text-[var(--ink)]">Estado actual</h2>
          <ul className="mt-5 space-y-3 text-[var(--muted)]">
            {current.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section className="rounded-lg border border-[var(--line)] bg-white p-6">
          <h2 className="text-xl font-bold text-[var(--ink)]">Próximos pasos</h2>
          <ul className="mt-5 space-y-3 text-[var(--muted)]">
            {nextSteps.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>
      <div className="mt-8">
        <ButtonLink href={LINKS.gymLog} variant="primary">
          Entrar en GymLog
        </ButtonLink>
      </div>
    </PageShell>
  );
}
