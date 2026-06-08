import { ButtonLink } from "@/components/ButtonLink";
import { PageShell } from "@/components/PageShell";
import { LINKS } from "@/lib/constants";

const areas = [
  "Mercados financieros",
  "Integraciones front-to-back y ESB",
  "Análisis funcional",
  "Gestión de proyectos y PMO",
  "Automatización e IA",
  "Diseño de herramientas internas y producto",
];

const tools = [
  "Murex",
  "Calypso",
  "FpML",
  "SQL",
  "Bloomberg",
  "Looker Studio",
  "Office / Drive",
  "Next.js y aplicaciones web",
];

const experience = [
  {
    role: "CEO y Partner",
    company: "Stratos Consulting",
    period: "Jul 2025 - Actualidad",
    text: "Liderazgo, gestión de empresa, desarrollo de negocio, gestión de equipos y consultoría estructural.",
  },
  {
    role: "Experienced Senior Consultant",
    company: "NFQ",
    period: "Ago 2021 - Jun 2025",
    text: "Estrategia, PMO, mercados financieros, Murex, Calypso y ESB en proyectos para BBVA.",
  },
  {
    role: "Consultant / Senior Consultant",
    company: "BBVA",
    period: "Abr 2017 - Ago 2021",
    text: "Proyectos Murex, OTC Calypso, FpML, MiFID e integración funcional de productos financieros.",
  },
  {
    role: "Global Finance / Asset Management",
    company: "Banco Santander",
    period: "Feb 2018 - May 2018",
    text: "Control de resultados, consolidación financiera, facturación y revisión de instrumentos financieros.",
  },
];

export default function CvPage() {
  return (
    <PageShell
      eyebrow="CV resumido"
      title="Ramón Ruiz Herrero"
      description="CEO y Partner de Stratos Consulting. Consultor tecno-financiero especializado en mercados financieros, integraciones, análisis funcional, producto, procesos y automatización."
    >
      <section className="rounded-lg border border-[var(--line)] bg-[var(--navy)] p-6 text-white">
        <p className="max-w-4xl text-lg leading-8 text-white">
          Perfil híbrido entre negocio, tecnología y producto, con experiencia
          en mercados financieros, Murex, Calypso, ESB, gestión de equipos,
          dirección de proyectos y creación de herramientas digitales.
        </p>
      </section>
      <section className="mt-6 rounded-lg border border-[var(--line)] bg-white p-6">
        <h2 className="text-xl font-bold text-[var(--ink)]">Experiencia</h2>
        <div className="mt-5 grid gap-4">
          {experience.map((item) => (
            <article
              className="border-l-2 border-[var(--accent)] pl-4"
              key={`${item.company}-${item.role}`}
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <h3 className="font-bold text-[var(--ink)]">
                  {item.role} · {item.company}
                </h3>
                <p className="text-sm font-semibold text-[var(--accent-dark)]">
                  {item.period}
                </p>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {item.text}
              </p>
            </article>
          ))}
        </div>
      </section>
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="mt-6 rounded-lg border border-[var(--line)] bg-white p-6 lg:mt-6">
          <h2 className="text-xl font-bold text-[var(--ink)]">
            Áreas de especialidad
          </h2>
          <ul className="mt-5 space-y-3 text-[var(--muted)]">
            {areas.map((area) => (
              <li key={area}>{area}</li>
            ))}
          </ul>
        </section>
        <section className="mt-6 rounded-lg border border-[var(--line)] bg-white p-6 lg:mt-6">
          <h2 className="text-xl font-bold text-[var(--ink)]">
            Tecnologías y herramientas
          </h2>
          <ul className="mt-5 space-y-3 text-[var(--muted)]">
            {tools.map((tool) => (
              <li key={tool}>{tool}</li>
            ))}
          </ul>
        </section>
      </div>
      <section className="mt-6 rounded-lg border border-[var(--line)] bg-white p-6">
        <h2 className="text-xl font-bold text-[var(--ink)]">Proyectos</h2>
        <p className="mt-4 max-w-3xl text-[var(--muted)]">
          Portal personal, GymLog, Recetario, TravelKit y FinanceLab como base
          para ordenar información, herramientas y futuras aplicaciones privadas.
        </p>
      </section>
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href={LINKS.linkedin} variant="primary">
          LinkedIn
        </ButtonLink>
        <ButtonLink href={LINKS.cvPdf}>Descargar CV</ButtonLink>
        <ButtonLink href="/contacto" variant="ghost">
          Contacto
        </ButtonLink>
      </div>
    </PageShell>
  );
}
