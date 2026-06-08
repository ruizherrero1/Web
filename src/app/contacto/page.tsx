import { ButtonLink } from "@/components/ButtonLink";
import { PageShell } from "@/components/PageShell";
import { CONTACT, LINKS } from "@/lib/constants";

export default function ContactPage() {
  return (
    <PageShell
      eyebrow="Contacto"
      title="Contacto"
      description="Puedes contactar conmigo para proyectos, colaboraciones o consultas profesionales."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <a
          className="focus-ring rounded-lg border border-[var(--line)] bg-white p-5 transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
          href={LINKS.email}
        >
          <p className="text-sm font-semibold text-[var(--accent-dark)]">Email principal</p>
          <p className="mt-2 font-bold text-[var(--ink)]">{CONTACT.primaryEmail}</p>
        </a>
        <a
          className="focus-ring rounded-lg border border-[var(--line)] bg-white p-5 transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
          href={LINKS.secondaryEmail}
        >
          <p className="text-sm font-semibold text-[var(--accent-dark)]">Email alternativo</p>
          <p className="mt-2 font-bold text-[var(--ink)]">{CONTACT.secondaryEmail}</p>
        </a>
        <a
          className="focus-ring rounded-lg border border-[var(--line)] bg-white p-5 transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
          href={LINKS.phone}
        >
          <p className="text-sm font-semibold text-[var(--accent-dark)]">Teléfono</p>
          <p className="mt-2 font-bold text-[var(--ink)]">{CONTACT.phoneDisplay}</p>
        </a>
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href={LINKS.linkedin} variant="primary">
          LinkedIn
        </ButtonLink>
        <ButtonLink href={LINKS.email}>Escribir email</ButtonLink>
      </div>
    </PageShell>
  );
}
