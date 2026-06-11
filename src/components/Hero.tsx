import { ButtonLink } from "@/components/ButtonLink";
import { LINKS, SITE } from "@/lib/constants";

const focusLines = [
  {
    title: "Dirección y consultoría",
    text: "CEO y Partner de Stratos Consulting, con experiencia en gestión de equipos y proyectos.",
  },
  {
    title: "Mercados e integraciones",
    text: "Murex, Calypso, ESB, FpML e integraciones front-to-back en entornos financieros.",
  },
  {
    title: "Producto y automatización",
    text: "Aplicaciones propias, procesos internos, IA y herramientas para organizar información útil.",
  },
];

export function Hero() {
  return (
    <section className="container-shell flex min-h-[calc(100vh-72px)] flex-col justify-center py-14">
      <div className="grid gap-12 lg:items-center">
        <div className="max-w-2xl">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-dark)]">
            Portfolio, proyectos y herramientas personales
          </p>
          <h1 className="text-5xl font-bold leading-tight text-[var(--ink)] sm:text-7xl">
            {SITE.name}
          </h1>
          <p className="mt-6 text-xl leading-8 text-[var(--foreground)] sm:text-2xl sm:leading-9">
            {SITE.description}
          </p>
          <p className="mt-5 text-base leading-7 text-[var(--muted)]">
            Construyo herramientas para organizar mejor información, procesos,
            entrenamiento, recetas, viajes y proyectos personales.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/cv" variant="primary">
              Ver CV
            </ButtonLink>
            <ButtonLink href={LINKS.linkedin}>LinkedIn</ButtonLink>
            <ButtonLink href="/apps">Ver aplicaciones</ButtonLink>
            <ButtonLink href="/contacto" variant="ghost">
              Contacto
            </ButtonLink>
          </div>
        </div>
      </div>

      <div className="mt-12 max-w-4xl border-l border-[var(--accent)]/30 pl-5">
        <div className="grid gap-5">
          {focusLines.map((line) => (
            <div
              className="relative before:absolute before:-left-[26px] before:top-1.5 before:size-3 before:rounded-full before:bg-[var(--accent)]"
              key={line.title}
            >
              <p className="font-bold text-[var(--ink)]">{line.title}</p>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                {line.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
