import type { Metadata } from "next";
import { ButtonLink } from "@/components/ButtonLink";
import { PageShell } from "@/components/PageShell";

const cineUrl = process.env.NEXT_PUBLIC_CINE_APP_URL ?? "https://cine.ramonruizherrero.com";

export const metadata: Metadata = {
  title: "Cine",
  description:
    "Acceso privado a la PWA Cine para elegir, guardar y valorar peliculas y series.",
};

export default function CineAccessPage() {
  return (
    <PageShell
      eyebrow="App privada"
      title="Cine"
      description="PWA privada para RR y LB: pendientes, notas separadas, filtros por plataformas y catalogo de peliculas y series."
    >
      <div className="max-w-2xl rounded-lg border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm">
        <p className="text-sm leading-6 text-[var(--muted)]">
          El acceso se gestiona desde la app Cine con login privado. La URL final se puede configurar con{" "}
          <code className="rounded bg-[var(--surface-strong)] px-1.5 py-0.5">
            NEXT_PUBLIC_CINE_APP_URL
          </code>{" "}
          cuando la PWA este desplegada.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href={cineUrl} variant="primary">
            Abrir Cine
          </ButtonLink>
          <ButtonLink href="/apps" variant="secondary">
            Volver a apps
          </ButtonLink>
        </div>
      </div>
    </PageShell>
  );
}
