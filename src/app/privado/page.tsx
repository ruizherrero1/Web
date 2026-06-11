import type { Metadata } from "next";
import { ButtonLink } from "@/components/ButtonLink";
import { PageShell } from "@/components/PageShell";

export const metadata: Metadata = {
  title: "Acceso privado",
  robots: { index: false, follow: false },
};

export default function PrivatePage() {
  return (
    <PageShell
      eyebrow="Próximamente"
      title="Acceso privado"
      description="Esta zona estará disponible próximamente para usuarios invitados. Permitirá acceder a aplicaciones privadas, datos personales sincronizados y herramientas compartidas."
    >
      <ButtonLink href="/apps" variant="primary">
        Volver a apps
      </ButtonLink>
    </PageShell>
  );
}
