import { AppCard } from "@/components/AppCard";
import { Hero } from "@/components/Hero";
import { SectionTitle } from "@/components/SectionTitle";
import { apps } from "@/data/apps";

const areas = [
  "CEO y Partner en Stratos",
  "Mercados financieros",
  "Integraciones FO-BO",
  "Producto y procesos",
  "Automatización e IA",
  "Apps personales",
];

export default function Home() {
  return (
    <>
      <Hero />
      <section className="border-y border-[var(--line)] bg-white/72 py-14">
        <div className="container-shell">
          <SectionTitle
            eyebrow="Perfil"
            title="Dirección, mercados financieros y producto digital"
            description="Trabajo en el cruce entre negocio, tecnología y producto, con experiencia en consultoría, equipos, mercados financieros, integraciones, datos y procesos operativos."
          />
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {areas.map((area) => (
              <div
                className="rounded-lg border border-[var(--line)] bg-white p-4 text-sm font-semibold text-[var(--ink)] shadow-sm"
                key={area}
              >
                {area}
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="container-shell py-14">
        <SectionTitle
          eyebrow="Apps"
          title="Aplicaciones destacadas"
          description="Un catálogo inicial para ordenar herramientas personales y preparar su evolución hacia productos privados multiusuario."
        />
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {apps.map((app) => (
            <AppCard key={app.slug} {...app} />
          ))}
        </div>
      </section>
      <section className="bg-[var(--ink)] py-14 text-white">
        <div className="container-shell grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <h2 className="text-3xl font-bold">
            Un portal para centralizar herramientas útiles
          </h2>
          <p className="text-lg leading-8 text-white">
            La idea es que cada aplicación pueda evolucionar de herramienta
            personal a producto privado multiusuario, con acceso controlado y
            datos separados por usuario.
          </p>
        </div>
      </section>
    </>
  );
}
